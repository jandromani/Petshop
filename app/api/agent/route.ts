import { z } from "zod";
import { hotels } from "@/src/data/hotels";
import { listSellableOffers } from "@/src/db/catalog";
import { databaseConfigured } from "@/src/db/client";
import { filterDemoHotels } from "@/src/core/search";
import { deterministicBrandJudge,deterministicTruthJudge } from "@/src/judges/rules";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";

export const runtime="nodejs";

const Input=z.object({
  prompt:z.string().min(1).max(1200),
  livingBudget:z.number().nonnegative().max(20000),
  party:z.enum(["solo","couple"]),
  duration:z.union([z.literal(30),z.literal(60),z.literal(90),z.literal(120),z.literal(180)]),
  mode:z.enum(["world","winter","value","slow"]),
  checkIn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  flexibleDays:z.union([z.literal(0),z.literal(7),z.literal(30)]),
  query:z.string().max(100).default(""),
  region:z.enum(["All","Europe","Asia","Africa","Americas"]).default("All"),
});

export async function POST(req:Request){
  const gate=await enforceRateLimit({key:requestFingerprint(req,"public-agent"),limit:20,windowSeconds:600});
  if(!gate.allowed)return Response.json({answer:"The concierge is receiving too many requests. Try again shortly.",error:"rate-limited"},{status:429});

  const parsed=Input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"Invalid request"},{status:400});
  const key=process.env.OPENROUTER_API_KEY;
  if(!key)return Response.json({answer:"The deterministic planner is live, but the concierge model is not configured on this deployment yet."});

  let liveOffers:Awaited<ReturnType<typeof listSellableOffers>>=[];
  if(databaseConfigured()){
    try{
      liveOffers=await listSellableOffers({
        limit:18,q:parsed.data.query,maxMonthly:parsed.data.livingBudget,checkIn:parsed.data.checkIn,
        flexibleDays:parsed.data.flexibleDays,nights:parsed.data.duration,occupancy:parsed.data.party==="couple"?2:1,region:parsed.data.region,
      });
    }catch{}
  }

  const demo=filterDemoHotels(hotels,{
    query:parsed.data.query,region:parsed.data.region,checkIn:parsed.data.checkIn,flexibleDays:parsed.data.flexibleDays,
    duration:parsed.data.duration,party:parsed.data.party,maxMonthly:parsed.data.livingBudget,
  }).slice(0,18);

  const context=liveOffers.length
    ? liveOffers.map(o=>({source:"live_verified",city:o.city,country:o.country,monthly:o.monthlyEquivalent,nights:o.nights,occupancy:o.occupancy,board:o.board,provider:o.provider,verifiedAt:o.verifiedAt,expiresAt:o.expiresAt,confidence:o.confidence}))
    : demo.map(h=>({source:"demo",city:h.city,country:h.country,monthly:h.monthly,score:h.score,board:h.board,tags:h.tags,provider:h.provider}));

  const system=[
    "You are the Atlas long-stay concierge.",
    "Recommend only catalogue entries supplied in this request and only within the supplied monthly budget.",
    "Never invent availability, price, visa rules, medical advice, commission, cancellation or execution.",
    "live_verified entries passed deterministic commercial gates. demo entries are scenarios only and must be labelled as estimates.",
    "Do not ask for or infer pension, rent, wealth or income sources. You receive only the maximum living budget needed for the task.",
    "Be concise, practical and freedom-first. If a live fact is absent, say it requires provider verification."
  ].join(" ");

  try{
    const upstream=await fetch("https://openrouter.ai/api/v1/chat/completions",{
      method:"POST",
      headers:{Authorization:"Bearer "+key,"Content-Type":"application/json","HTTP-Referer":process.env.NEXT_PUBLIC_SITE_URL||"https://vercel.app","X-Title":"Atlas Long Stay"},
      body:JSON.stringify({
        model:process.env.OPENROUTER_MODEL||"openrouter/free",
        messages:[
          {role:"system",content:system},
          {role:"user",content:JSON.stringify({search:parsed.data,catalogue:context,request:parsed.data.prompt})},
        ],
        temperature:.3,max_tokens:550,
      }),
    });
    if(!upstream.ok){
      console.error(JSON.stringify({level:"error",event:"agent_upstream_failed",status:upstream.status}));
      return Response.json({answer:"The concierge model is temporarily unavailable. The deterministic planner is unaffected."});
    }
    const data=await upstream.json();
    const answer=String(data?.choices?.[0]?.message?.content||"");
    const checks=[deterministicTruthJudge(answer),deterministicBrandJudge(answer)];
    if(checks.some(x=>x.verdict!=="PASS")){
      console.warn(JSON.stringify({level:"warning",event:"public_agent_judge_block",checks}));
      return Response.json({answer:"I can suggest destinations and explain trade-offs, but I cannot present an unsupported price or availability claim. Use the verified-offer lane for bookable facts.",catalogueMode:liveOffers.length?"live_verified":"demo",judged:true});
    }
    return Response.json({answer:answer||"No agent response.",catalogueMode:liveOffers.length?"live_verified":"demo",judged:true});
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"agent_error",error:String(error)}));
    return Response.json({answer:"The concierge model is temporarily unavailable. The deterministic planner is unaffected."});
  }
}
