import { databaseConfigured } from "@/src/db/client";

export async function GET() {
  return Response.json({
    ok: true,
    service: "atlas-web",
    agentConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    databaseConfigured: databaseConfigured(),
    now: new Date().toISOString()
  });
}
