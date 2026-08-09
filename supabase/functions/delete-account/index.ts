const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: Record<string, unknown>, status = 200) {
  return Response.json(data, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
}

async function handler(request: Request) {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ code: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization') ?? '';
  if (!supabaseUrl || !anonKey || !serviceRole) return json({ code: 'server_not_configured' }, 503);
  if (!authorization.startsWith('Bearer ')) return json({ code: 'authentication_required' }, 401);

  let body: { confirm?: unknown };
  try { body = await request.json(); } catch { return json({ code: 'invalid_json' }, 400); }
  if (body.confirm !== 'DELETE') return json({ code: 'confirmation_required' }, 400);

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } });
  if (!userResponse.ok) return json({ code: 'invalid_session' }, 401);
  const user = await userResponse.json();
  if (typeof user?.id !== 'string') return json({ code: 'invalid_session' }, 401);

  const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
    method: 'DELETE',
    headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` },
  });
  if (!deleteResponse.ok) return json({ code: 'account_delete_failed' }, 502);
  return json({ deleted: true });
}

Deno.serve(handler);
