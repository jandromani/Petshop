import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hotels } from "@/src/data/hotels";
import { buildPlan,planTotals } from "@/src/core/planner";
import { getSharedPlan } from "@/src/db/share";

const euro=(n:number)=>"€"+Math.round(n).toLocaleString("en-US");

export async function generateMetadata({params}:{params:Promise<{token:string}>}):Promise<Metadata>{
  const {token}=await params;
  const input=await getSharedPlan(token);
  if(!input)return{title:"Shared life plan",robots:{index:false,follow:false}};
  const plan=buildPlan(hotels,input.monthlyBudget,input.party,input.duration,input.mode);
  const totals=planTotals(plan);
  return{
    title:`A 365-day long-stay route for about ${euro(totals.averageMonthly)}/month`,
    description:"An Atlas long-stay scenario shared without exposing the owner’s income sources.",
    robots:{index:false,follow:true},
    openGraph:{title:`Could you live like this for ${euro(totals.averageMonthly)}/month?`,description:"A private, shareable long-stay route.",type:"website"},
  };
}

export default async function SharedPlanPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const input=await getSharedPlan(token);
  if(!input)notFound();
  const plan=buildPlan(hotels,input.monthlyBudget,input.party,input.duration,input.mode);
  const totals=planTotals(plan);

  return <main className="seoPage"><div className="shell">
    <a href="/" className="eyebrow">ATLAS · SHARED LIFE</a>
    <section className="seoHero" style={{marginTop:20}}>
      <div className="eyebrow">COULD YOU LIVE LIKE THIS?</div>
      <h1 style={{marginTop:20}}>{totals.days} nights.<br/>{euro(totals.averageMonthly)}/month.</h1>
      <p style={{fontSize:20,maxWidth:720}}>This shared plan contains only a monthly budget and travel preferences. Pension, rent and other income sources are never placed in the URL.</p>
      <div className="heroActions"><a className="btn" href="/">Build your own →</a></div>
    </section>
    <div className="seoGrid">
      <div className="card"><div className="eyebrow">THE ROUTE</div><div className="route" style={{marginTop:16}}>
        {plan.map((s,i)=><div className="stop" key={s.stopId}><div className="when">STOP {String(i+1).padStart(2,"0")}</div><div><b>{s.hotel.flag} {s.hotel.city}</b><small>{s.days} nights · {s.hotel.board} · effective {euro(s.effectiveMonthly)}/mo</small></div><div className="cost">{euro(s.monthlyCost)}/mo</div></div>)}
      </div></div>
      <div className="card"><div className="eyebrow">PUBLIC NUMBERS ONLY</div>
        <h2 style={{fontSize:44,letterSpacing:"-.05em",marginBottom:6}}>{euro(input.monthlyBudget)}<small style={{fontSize:13,color:"#68738b"}}>/month max budget</small></h2>
        <p>Start: <b>{input.checkIn}</b> · flexibility <b>±{input.flexibleDays} days</b></p>
        <p>Cadence: <b>{input.duration} days</b></p>
        <p>Travelling: <b>{input.party}</b></p>
        <p>Route hotel + mobility estimate: <b>{euro(totals.total)}</b></p>
      </div>
    </div>
  </div></main>;
}
