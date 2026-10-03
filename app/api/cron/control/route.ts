import { hotels } from "@/src/data/hotels";
import { evaluateSellability } from "@/src/core/truth";
import { AGENTS } from "@/src/agents/registry";

export const runtime = "nodejs";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === "Bearer " + secret);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });

  const truth = hotels.map(evaluateSellability);
  const brief = {
    date: new Date().toISOString(),
    supply: {
      canonical: hotels.length,
      sellable: truth.filter(x=>x.state==="SELLABLE").length,
      stale: truth.filter(x=>x.state==="STALE").length,
      quarantined: truth.filter(x=>x.state==="QUARANTINED").length,
    },
    agentPolicy: {
      roles: Object.keys(AGENTS).length,
      publishingAuthority: 0,
      contractAuthority: 0,
      humanAttentionTargetMinutes: 60,
    },
    mode: "bootstrap",
    humanDecisions: [
      "Attach first live accommodation provider credentials.",
      "Attach referral/affiliate partner IDs.",
      "Configure persistent database and conversion ingestion."
    ]
  };

  console.log(JSON.stringify({level:"info",event:"daily_control_brief",...brief}));
  return Response.json(brief, { headers: { "Cache-Control":"no-store" } });
}
