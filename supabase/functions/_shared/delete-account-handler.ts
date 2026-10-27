type Environment = { url: string; anon: string; service: string };
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const json = (code: string, status: number) =>
  Response.json(
    { code },
    { status, headers: { ...cors, "Cache-Control": "no-store" } },
  );
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function handleDeleteAccount(
  request: Request,
  env: Environment,
  send: typeof fetch = fetch,
): Promise<Response> {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json("method_not_allowed", 405);
  if (!env.url || !env.anon || !env.service)
    return json("server_not_configured", 503);
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer "))
    return json("authentication_required", 401);
  let body: { confirm?: unknown };
  try {
    body = await request.json();
  } catch {
    return json("invalid_json", 400);
  }
  if (body?.confirm !== "DELETE") return json("confirmation_required", 400);
  const adminHeaders = {
    apikey: env.service,
    Authorization: `Bearer ${env.service}`,
    "Content-Type": "application/json",
  };
  let storageTouched = false;
  try {
    const auth = await send(`${env.url}/auth/v1/user`, {
      headers: { apikey: env.anon, Authorization: authorization },
      signal: AbortSignal.timeout(10000),
    });
    if (!auth.ok) return json("invalid_session", 401);
    const user = await auth.json();
    if (typeof user?.id !== "string" || !uuid.test(user.id))
      return json("invalid_session", 401);
    // Check restrictive dependencies BEFORE removing even one owned photo.
    for (const [table, column] of [
      ["admin_access", "user_id"],
      ["admin_audit_events", "admin_user_id"],
      ["editorial_curations", "created_by"],
    ] as const) {
      const response = await send(
        `${env.url}/rest/v1/${table}?${column}=eq.${user.id}&select=${column}&limit=1`,
        { headers: adminHeaders, signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok) return json("account_preflight_failed", 502);
      const rows = await response.json();
      if (!Array.isArray(rows)) return json("account_preflight_failed", 502);
      if (rows.length) return json("operational_account_protected", 409);
    }
    const list = await send(`${env.url}/storage/v1/object/list/core-photos`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        prefix: `${user.id}/`,
        limit: 101,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!list.ok) return json("account_preflight_failed", 502);
    const objects = await list.json();
    if (
      !Array.isArray(objects) ||
      objects.length > 100 ||
      objects.some(
        (object: unknown) =>
          !object ||
          typeof object !== "object" ||
          !("name" in object) ||
          typeof object.name !== "string" ||
          !/^[0-9a-f-]{36}\.jpg$/i.test(object.name),
      )
    )
      return json("account_storage_review_required", 409);
    if (objects.length) {
      storageTouched = true;
      const cleanup = await send(`${env.url}/storage/v1/object/core-photos`, {
        method: "DELETE",
        headers: adminHeaders,
        body: JSON.stringify({
          prefixes: objects.map(
            (object: { name: string }) => `${user.id}/${object.name}`,
          ),
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!cleanup.ok) return json("account_cleanup_partial", 502);
    }
    const removed = await send(`${env.url}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE",
      headers: adminHeaders,
      signal: AbortSignal.timeout(10000),
    });
    if (!removed.ok)
      return json(
        objects.length ? "account_cleanup_partial" : "account_delete_failed",
        502,
      );
    return Response.json(
      { deleted: true },
      { headers: { ...cors, "Cache-Control": "no-store" } },
    );
  } catch {
    return json(
      storageTouched
        ? "account_cleanup_partial"
        : "account_delete_retry_required",
      503,
    );
  }
}
