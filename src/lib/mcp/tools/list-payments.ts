import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, dbError } from "../_supabase";

export default defineTool({
  name: "list_payments",
  title: "List recent payments",
  description:
    "List the most recent rent payments recorded for the signed-in landlord.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)"),
    tenant_id: z.string().uuid().optional().describe("Filter to one tenant"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, tenant_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let query = supabaseForUser(ctx)
      .from("payments")
      .select("id, amount, payment_date, mpesa_reference, tenant_id, house_id, source, created_at")
      .order("payment_date", { ascending: false })
      .limit(limit ?? 50);
    if (tenant_id) query = query.eq("tenant_id", tenant_id);
    const { data, error } = await query;
    if (error) return dbError(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { payments: data ?? [] },
    };
  },
});
