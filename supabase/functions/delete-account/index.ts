import { handleDeleteAccount } from "../_shared/delete-account-handler.ts";
Deno.serve((request: Request) =>
  handleDeleteAccount(request, {
    url: Deno.env.get("SUPABASE_URL") ?? "",
    anon: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    service: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  }),
);
