import { describe, expect, it, vi } from "vitest";
import { handleDeleteAccount } from "../supabase/functions/_shared/delete-account-handler";
const id = "00000000-0000-4000-8000-000000000001",
  file = "00000000-0000-4000-8000-000000000002.jpg";
const env = {
  url: "https://test.supabase.co",
  anon: "public",
  service: "server-only",
};
const request = (body: unknown = { confirm: "DELETE" }) =>
  new Request("https://test/functions/delete-account", {
    method: "POST",
    headers: {
      Authorization: "Bearer user-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
const ok = (value: unknown) => Response.json(value);
function sendMock(objects: unknown = []) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(ok({ id }))
    .mockResolvedValueOnce(ok([]))
    .mockResolvedValueOnce(ok([]))
    .mockResolvedValueOnce(ok([]))
    .mockResolvedValueOnce(ok(objects));
}
describe("account deletion preflight and storage ownership", () => {
  it("requires session and explicit DELETE before any destructive request", async () => {
    const send = vi.fn();
    expect(
      (await handleDeleteAccount(request({ confirm: "no" }), env, send)).status,
    ).toBe(400);
    expect(send).not.toHaveBeenCalled();
    send.mockResolvedValue(ok({ id: "../../other-user" }));
    expect((await handleDeleteAccount(request(), env, send)).status).toBe(401);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("blocks administrators before touching storage and keeps the audit trail", async () => {
    const send = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(ok({ id }))
      .mockResolvedValueOnce(ok([{ user_id: id }]));
    const result = await handleDeleteAccount(request(), env, send);
    expect(result.status).toBe(409);
    expect((await result.json()).code).toBe("operational_account_protected");
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("blocks a former operator with retained audit or editorial dependencies", async () => {
    for (const table of ["audit", "editorial"]) {
      const send = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(ok({ id }))
        .mockResolvedValueOnce(ok([]))
        .mockResolvedValueOnce(
          ok(table === "audit" ? [{ admin_user_id: id }] : []),
        )
        .mockResolvedValueOnce(ok([{ created_by: id }]));
      expect((await handleDeleteAccount(request(), env, send)).status).toBe(
        409,
      );
      expect(
        send.mock.calls.some(([, init]) => init?.method === "DELETE"),
      ).toBe(false);
    }
  });
  it("deletes only exact authenticated-folder files before Auth removal", async () => {
    const send = sendMock([{ name: file }])
      .mockResolvedValueOnce(ok([]))
      .mockResolvedValueOnce(ok({}));
    const result = await handleDeleteAccount(request(), env, send);
    expect(await result.json()).toEqual({ deleted: true });
    expect(JSON.parse(String(send.mock.calls[4]?.[1]?.body))).toMatchObject({
      prefix: `${id}/`,
    });
    expect(send.mock.calls[5]?.[0]).toBe(
      `${env.url}/storage/v1/object/core-photos`,
    );
    expect(JSON.parse(String(send.mock.calls[5]?.[1]?.body))).toEqual({
      prefixes: [`${id}/${file}`],
    });
    expect(send.mock.calls[6]?.[0]).toBe(
      `${env.url}/auth/v1/admin/users/${id}`,
    );
    expect(result.headers.get("Cache-Control")).toBe("no-store");
  });
  it("fails closed on malformed, foreign or oversized lists", async () => {
    for (const rows of [
      [{ name: "../foreign.jpg" }],
      [{ name: "folder" }],
      Array(101).fill({ name: file }),
      {},
    ]) {
      const send = sendMock(rows);
      expect((await handleDeleteAccount(request(), env, send)).status).toBe(
        409,
      );
      expect(send).toHaveBeenCalledTimes(5);
    }
  });
  it("does not delete Auth after failed cleanup and honestly reports partial failure", async () => {
    const send = sendMock([{ name: file }]).mockResolvedValueOnce(
      new Response("", { status: 500 }),
    );
    expect((await handleDeleteAccount(request(), env, send)).status).toBe(502);
    expect(send).toHaveBeenCalledTimes(6);
    const partial = sendMock([{ name: file }])
      .mockResolvedValueOnce(ok([]))
      .mockResolvedValueOnce(new Response("", { status: 500 }));
    expect(
      (await (await handleDeleteAccount(request(), env, partial)).json()).code,
    ).toBe("account_cleanup_partial");
  });
  it("skips storage deletion for an empty folder and handles timeout safely", async () => {
    const send = sendMock().mockResolvedValueOnce(ok({}));
    expect((await handleDeleteAccount(request(), env, send)).status).toBe(200);
    expect(send).toHaveBeenCalledTimes(6);
    const failed = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("timeout"));
    expect((await handleDeleteAccount(request(), env, failed)).status).toBe(
      503,
    );
    const partial = sendMock([{ name: file }])
      .mockResolvedValueOnce(ok([]))
      .mockRejectedValueOnce(new Error("timeout after cleanup"));
    expect(
      (await (await handleDeleteAccount(request(), env, partial)).json()).code,
    ).toBe("account_cleanup_partial");
  });
});
