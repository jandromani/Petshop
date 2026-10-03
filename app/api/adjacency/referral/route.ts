import { cookies } from "next/headers";
import { after } from "next/server";
import { adjacencyPartner,safeAdjacencyTarget,type AdjacencyKind } from "@/src/adjacency/registry";
import { persistAdjacencyClick } from "@/src/db/adjacency";

export const runtime="nodejs";

export async function GET(req:Request){
  if(process.env.ADJACENCY_RUNTIME_ENABLED==="false")return new Response("Adjacency runtime disabled",{status:503});
  const url=new URL(req.url);
  const kind=url.searchParams.get("kind") as AdjacencyKind|null;
  const partner=kind?adjacencyPartner(kind):null;
  if(!partner||!partner.configured||!partner.partnerKey)return new Response("Partner lane not activated",{status:404,headers:{"Cache-Control":"no-store"}});
  const target=safeAdjacencyTarget(partner);
  if(!target)return new Response("Partner destination blocked",{status:409,headers:{"Cache-Control":"no-store"}});

  const clickId=crypto.randomUUID();
  if(partner.trackingParam)target.searchParams.set(partner.trackingParam,clickId);
  target.searchParams.set("utm_source","atlas-long-stay");
  target.searchParams.set("utm_medium","referral");

  const jar=await cookies();
  const payload={
    clickId,kind:partner.kind,partnerKey:partner.partnerKey,
    visitorId:jar.get("rv_vid")?.value,sessionId:jar.get("rv_sid")?.value,
    source:jar.get("rv_src")?.value||jar.get("rv_ref")?.value||"direct",
    campaign:jar.get("rv_campaign")?.value,
    pagePath:url.searchParams.get("from")||undefined,
    targetHost:target.hostname.toLowerCase(),
  };
  after(async()=>{await persistAdjacencyClick(payload);});
  return new Response(null,{status:302,headers:{Location:target.toString(),"Cache-Control":"no-store","X-Adjacency-Click":clickId}});
}
