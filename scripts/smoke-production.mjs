const base=(process.env.DEPLOYMENT_URL||process.argv[2]||"").replace(/\/$/,"");
if(!base) throw new Error("DEPLOYMENT_URL or URL argument is required");

async function get(path){
  const res=await fetch(base+path,{redirect:"follow"});
  if(!res.ok) throw new Error(path+" returned "+res.status);
  return res;
}

const home=await get("/");
const homeText=await home.text();
if(!homeText.includes("Not from the world")&&!homeText.includes("next 20 years")) throw new Error("home hero missing");

const system=await get("/system");
const systemText=await system.text();
if(!systemText.includes("FULL SYSTEM PROOF")) throw new Error("system proof page missing");

const health=await (await get("/api/health")).json();
if(health.softwareProof!==true) throw new Error("software proof failed");

const status=await (await get("/api/system/status")).json();
if(status?.proof?.pass!==true) throw new Error("system status proof failed");

const catalog=await (await get("/api/catalog/live?limit=1")).json();
if(!Array.isArray(catalog.offers)) throw new Error("live catalog contract invalid");

console.log(JSON.stringify({
  ok:true,
  base,
  databaseConfigured:health.databaseConfigured,
  agentConfigured:health.agentConfigured,
  configuredProviders:(health.providers||[]).filter(p=>p.configured).map(p=>p.provider),
  liveOffers:Array.isArray(catalog.offers)?catalog.offers.length:0,
},null,2));
