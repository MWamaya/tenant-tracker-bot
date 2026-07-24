import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

// Build a per-request Supabase client that forwards the caller's OAuth bearer
// token so RLS runs as that landlord. Never use the service-role key here.
export function supabaseForUser(ctx: ToolContext) {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export function notAuthenticated() {
  return {
    content: [{ type: "text" as const, text: "Not authenticated" }],
    isError: true,
  };
}

export function dbError(message: string) {
  return {
    content: [{ type: "text" as const, text: `Database error: ${message}` }],
    isError: true,
  };
}
