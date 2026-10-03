const base=(process.env.DEPLOYMENT_URL||process.argv[2]||"").replace(/\/$/,"");
if(!base)throw new Error("DEPLOYMENT_URL or URL argument is required");

async function get(path,expected=200){
  const res=await fetch(base+path,{redirect:"manual"});
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

const status=await (await get("/api/system/status")).json();
if(status?.proof?.pass!==true)throw new Error("system status proof failed");

const catalog=await (await get("/api/catalog/live?limit=1&checkIn=2027-01-15&flexibleDays=7&nights=90&occupancy=1&region=All&maxMonthly=2000")).json();
if(!Array.isArray(catalog.offers))throw new Error("live catalog contract invalid");

await get("/api/ops/access",404);

console.log(JSON.stringify({
  ok:true,base,databaseConfigured:health.databaseConfigured,agentConfigured:health.agentConfigured,
  configuredProviders:(health.providers||[]).filter(p=>p.configured).map(p=>p.provider),
  liveOffers:catalog.offers.length,
},null,2));
