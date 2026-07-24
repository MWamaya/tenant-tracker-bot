import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPropertiesTool from "./tools/list-properties";
import listHousesTool from "./tools/list-houses";
import listTenantsTool from "./tools/list-tenants";
import listPaymentsTool from "./tools/list-payments";


// Direct supabase.co issuer — never the .lovable.cloud proxy. Read the project
// ref from Vite's inlined env so the entry stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "kodi-pap-mcp",
  title: "KODI PAP",
  version: "0.1.0",
  instructions:
    "Read-only access to a KODI PAP landlord's properties, houses, tenants, and rent payments. All tools act as the signed-in landlord and are scoped by row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listPropertiesTool,
    listHousesTool,
    listTenantsTool,
    listPaymentsTool,
    dashboardSummaryTool,
  ],
});
