import { boundedJson } from "@/src/core/hotel-partner";
import { opsAuthorized } from "@/src/security/ops-auth";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";
import { LiteApiClient,LiteApiProbeInput } from "@/src/providers/live/liteapi";

export async function POST(req:Request) {
  if(!await opsAuthorized(req))return new Response("Unauthorized",{status:401});
  const parsed=LiteApiProbeInput.safeParse(await boundedJson(req));
  if(!parsed.success)return Response.json({error:"invalid-probe"},{status:400});
  if(parsed.data.checkIn<new Date().toISOString().slice(0,10))return Response.json({error:"past-check-in"},{status:400});
  const client=new LiteApiClient();
  if(!client.status().configured)return Response.json({error:"liteapi-not-configured",status:client.status()},{status:503});
  const gate=await enforceRateLimit({key:requestFingerprint(req,"liteapi-probe"),limit:6,windowSeconds:60});
  if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});
  try{return Response.json(await client.probe(parsed.data),{headers:{"Cache-Control":"private, no-store"}});}
  catch{return Response.json({error:"liteapi-probe-failed",message:"Supplier unavailable or response rejected; no rates were published."},{status:502});}
}
