import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, dbError } from "../_supabase";

export default defineTool({
  name: "list_houses",
  title: "List houses",
  description:
    "List houses (rental units) owned by the signed-in landlord, optionally filtered by property_id.",
  inputSchema: {
    property_id: z
      .string()
      .uuid()
      .optional()
      .describe("Filter to a single property"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ property_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let query = supabaseForUser(ctx)
      .from("houses")
      .select("id, house_number, rent_amount, deposit, property_id, created_at")
      .order("house_number");
    if (property_id) query = query.eq("property_id", property_id);
    const { data, error } = await query;
    if (error) return dbError(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { houses: data ?? [] },
    };
  },
});
