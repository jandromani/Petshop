const base=(process.env.DEPLOYMENT_URL||process.argv[2]||"").replace(/\/$/,"");
const expectedSha=process.env.EXPECTED_SHA||"";
if(!base)throw new Error("DEPLOYMENT_URL or URL argument is required");

async function get(path,expected=200){
  const res=await fetch(base+path,{redirect:"manual",cache:"no-store"});
  if(res.status!==expected)throw new Error(path+" returned "+res.status+" expected "+expected);
  return res;
}

const home=await get("/");
const homeText=await home.text();
for(const marker of ["Live somewhere better","MONTHLY RESOURCES","MAXIMUM AVAILABLE TO LIVE","365 days"]){
  if(!homeText.includes(marker))throw new Error("home contract missing: "+marker);
}

const system=await get("/system");
if(!(await system.text()).includes("FULL SYSTEM PROOF"))throw new Error("system proof page missing");

const health=await (await get("/api/health")).json();
if(health.softwareProof!==true)throw new Error("software proof failed");
if(health.proofKind!=="synthetic-software-circuit")throw new Error("health proof kind is not explicit");
if(expectedSha&&health?.deployment?.commitSha!==expectedSha){
  throw new Error("deployment SHA mismatch: "+String(health?.deployment?.commitSha)+" != "+expectedSha);
}


async function smokeAgent(){
  const payload={
    prompt:"Reply exactly with: Atlas concierge online.",
    livingBudget:1500,
    party:"solo",
    duration:30,
    mode:"world",
    checkIn:"2027-01-15",
    flexibleDays:7,
    query:"",
    region:"All",
  };

  let last="";
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const res=await fetch(base+"/api/agent",{
        method:"POST",
        redirect:"manual",
        cache:"no-store",
        headers:{"content-type":"application/json"},
        body:JSON.stringify(payload),
      });
      const body=await res.json().catch(()=>null);
      if(res.ok&&body?.provider==="openrouter"&&typeof body?.answer==="string"&&body.answer.trim()){
        return{provider:body.provider,catalogueMode:body.catalogueMode||null,judged:body.judged===true};
      }
      last="status="+res.status+" provider="+String(body?.provider||"none")+" answer="+String(body?.answer||body?.error||"").slice(0,160);
    }catch(error){
      last=String(error);
    }
    await new Promise(resolve=>setTimeout(resolve,2500));
  }
  throw new Error("production agent smoke failed after retries: "+last);
}

const status=await (await get("/api/system/status")).json();
if(status?.proof?.pass!==true)throw new Error("system status proof failed");

const catalog=await (await get("/api/catalog/live?limit=1&checkIn=2027-01-15&flexibleDays=7&nights=90&occupancy=1&region=All&maxMonthly=2000")).json();
if(!Array.isArray(catalog.offers))throw new Error("live catalog contract invalid");

await get("/api/ops/access",404);

const agent=health.agentConfigured?await smokeAgent():null;

console.log(JSON.stringify({
  ok:true,base,commitSha:health?.deployment?.commitSha||null,
  databaseConfigured:health.databaseConfigured,agentConfigured:health.agentConfigured,
  agentProvider:agent?.provider||null,agentJudged:agent?.judged??null,
  configuredProviders:(health.providers||[]).filter(p=>p.configured).map(p=>p.provider),
  liveOffers:catalog.offers.length,
},null,2));
