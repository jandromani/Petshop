import { hotels } from "@/src/data/hotels";
import { evaluateSellability } from "@/src/core/truth";

import { opsAuthorized } from "@/src/security/ops-auth";
export const runtime = "nodejs";

export async function GET(req:Request) {
  if(!(await opsAuthorized(req))) return new Response("Not found",{status:404});
  const evaluated = hotels.map(evaluateSellability);
  const demo = evaluated.filter(x=>x.state==="DEMO").length;
  const quarantined = evaluated.filter(x=>x.state==="QUARANTINED").length;

  return Response.json({
    runId: "wave_demo_" + new Date().toISOString().slice(0,10),
    mode: "seed",
    state: "COMPLETE",
    providersModelled: ["booking","ratehawk","hbx"],
    rawRecords: hotels.length,
    canonicalHotels: hotels.length,
    quoteTested: 0,
    sellable: 0,
    demo,
    stale: 0,
    quarantined,
    publicationAllowed: false,
    generatedAt: new Date().toISOString()
  });
}
