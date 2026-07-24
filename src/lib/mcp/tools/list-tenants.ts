import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, dbError } from "../_supabase";

export default defineTool({
  name: "list_tenants",
  title: "List tenants",
  description: "List tenants belonging to the signed-in landlord.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Filter by name substring"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let query = supabaseForUser(ctx)
      .from("tenants")
      .select("id, full_name, phone, house_id, created_at")
      .order("full_name");
    if (search) query = query.ilike("full_name", `%${search}%`);
    const { data, error } = await query;
    if (error) return dbError(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { tenants: data ?? [] },
    };
  },
});
