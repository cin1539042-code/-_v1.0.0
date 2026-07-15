import { env } from "cloudflare:workers";import { ensureAdminSchema } from "../../../lib/admin-db";
export const dynamic="force-dynamic";
export async function GET(){await ensureAdminSchema();const row=await env.DB.prepare("SELECT value FROM site_settings WHERE key='version'").first<{value:string}>();return Response.json({version:row?.value||"v37"},{headers:{"cache-control":"no-store, no-cache, must-revalidate"}})}
