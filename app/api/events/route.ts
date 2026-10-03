import { cookies } from "next/headers";
import { after } from "next/server";
import { track } from "@vercel/analytics/server";
import { z } from "zod";
import { persistGrowthEvent } from "@/src/db/ledger";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";
import { ANALYTICS_CONSENT,CONSENT_COOKIE } from "@/src/privacy/consent";

export const runtime = "nodejs";

const Primitive = z.union([z.string().max(300), z.number(), z.boolean()]);
const EventInput = z.object({
  name: z.string().min(1).max(80).regex(/^[a-z0-9_.-]+$/i),
  path: z.string().max(500).optional(),
  properties: z.record(z.string().max(80), Primitive).optional(),
});

export async function POST(req: Request) {
  const jar=await cookies();
  if(jar.get(CONSENT_COOKIE)?.value!==ANALYTICS_CONSENT) return new Response(null,{status:204});
  const gate=await enforceRateLimit({key:requestFingerprint(req,"growth-events"),limit:180,windowSeconds:60});
  if(!gate.allowed) return Response.json({ok:false,error:"rate-limited"},{status:429});
  const parsed = EventInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });

  const visitorId = jar.get("rv_vid")?.value;
  const sessionId = jar.get("rv_sid")?.value;
  const source = jar.get("rv_src")?.value || jar.get("rv_ref")?.value || "direct";
  const campaign = jar.get("rv_campaign")?.value;

  const properties = {
    ...(parsed.data.properties || {}),
    source,
    ...(campaign ? { campaign } : {}),
  };

  console.log(JSON.stringify({
    level: "info",
    event: "growth_event",
    name: parsed.data.name,
    visitorId,
    sessionId,
    path: parsed.data.path,
    properties,
    ts: new Date().toISOString(),
  }));

  after(async()=>{
    await persistGrowthEvent({
      visitorId,
      sessionId,
      name:parsed.data.name,
      properties,
      pagePath:parsed.data.path,
    });
  });

  try {
    track(parsed.data.name, properties);
  } catch (error) {
    console.warn(JSON.stringify({
      level: "warning",
      event: "analytics_track_failed",
      message: String(error),
    }));
  }

  return Response.json({ ok: true }, {
    headers: { "Cache-Control": "no-store" },
  });
}
