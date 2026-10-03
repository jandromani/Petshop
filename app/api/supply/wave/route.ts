import { hotels } from "@/src/data/hotels";
import { evaluateSellability } from "@/src/core/truth";

export const runtime = "nodejs";

export async function GET() {
  const evaluated = hotels.map(evaluateSellability);
  const sellable = evaluated.filter(x=>x.state==="SELLABLE").length;
  const stale = evaluated.filter(x=>x.state==="STALE").length;
  const quarantined = evaluated.filter(x=>x.state==="QUARANTINED").length;

  return Response.json({
    runId: "wave_demo_" + new Date().toISOString().slice(0,10),
    state: "COMPLETE",
    providers: ["booking","ratehawk","hbx"],
    rawRecords: hotels.length * 3,
    canonicalHotels: hotels.length,
    quoteTested: hotels.length,
    sellable,
    stale,
    quarantined,
    generatedAt: new Date().toISOString()
  });
}
