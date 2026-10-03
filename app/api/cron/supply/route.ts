import { runSeedAcquisitionWave } from "@/src/services/acquisition";

export const runtime = "nodejs";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === "Bearer " + secret);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });

  const waveKey = "scheduled_" + new Date().toISOString().slice(0, 13);
  const result = runSeedAcquisitionWave({
    waveKey,
    providers: ["booking","ratehawk","hbx"],
    durations: [30,60,90],
  });

  console.log(JSON.stringify({
    level:"info",
    event:"acquisition_wave_complete",
    mode:"seed",
    ...result,
    ts:new Date().toISOString(),
  }));

  return Response.json({
    mode:"seed-until-live-provider-credentials",
    ...result,
  }, { headers: { "Cache-Control":"no-store" } });
}
