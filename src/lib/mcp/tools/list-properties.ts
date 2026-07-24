import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, dbError } from "../_supabase";

export default defineTool({
  name: "list_properties",
  title: "List properties",
  description: "List all properties owned by the signed-in landlord.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("properties")
      .select("id, name, address, created_at")
      .order("created_at", { ascending: false });
    if (error) return dbError(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { properties: data ?? [] },
    };
  },
});
