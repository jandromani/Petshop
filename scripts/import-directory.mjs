import fs from "node:fs";
function args(){const out={};for(let i=2;i<process.argv.length;i++){const k=process.argv[i];if(k.startsWith("--"))out[k.slice(2)]=process.argv[++i];}return out;}
function required(v,name){if(!v)throw new Error("Missing --"+name);return v;}
function httpsOrUndefined(v){return typeof v==="string"&&v.startsWith("https://")?v:undefined;}
function normalizeRegion(v){if(["Europe","Asia","Africa","Americas"].includes(v))return v;throw new Error("Invalid/missing region: "+v);}
function fromOverpass(data,opt){
  const allowed=new Set(["hotel","resort","motel","guest_house"]);
  return (data.elements||[]).flatMap(e=>{
    const t=e.tags||{};if(!allowed.has(t.tourism)||!t.name)return[];
    const lat=Number(e.lat??e.center?.lat),lng=Number(e.lon??e.center?.lon);
    const city=t["addr:city"]||opt.city,country=t["addr:country"]||opt.country,region=opt.region;
    if(!city||!country||!region||!Number.isFinite(lat)||!Number.isFinite(lng))return[];
    return[{sourceId:String(e.type)+"/"+String(e.id),name:String(t.name),city:String(city),country:String(country),region:normalizeRegion(region),lat,lng,referenceUrl:"https://www.openstreetmap.org/"+e.type+"/"+e.id,website:httpsOrUndefined(t.website||t["contact:website"]),raw:{tourism:t.tourism,brand:t.brand||null,stars:t.stars||null}}];
  });
}
function fromNormalized(data,opt){
  const rows=Array.isArray(data)?data:Array.isArray(data.hotels)?data.hotels:[];
  return rows.map((h,i)=>({sourceId:String(h.sourceId??h.id??i),name:String(h.name),city:String(h.city??opt.city??""),country:String(h.country??opt.country??""),region:normalizeRegion(String(h.region??opt.region??"")),lat:h.lat===undefined?undefined:Number(h.lat),lng:h.lng===undefined?undefined:Number(h.lng),referenceUrl:httpsOrUndefined(h.referenceUrl),website:httpsOrUndefined(h.website),raw:h.raw&&typeof h.raw==="object"?h.raw:undefined})).filter(h=>h.name&&h.city&&h.country);
}
async function main(){
  const opt=args(),file=required(opt.file,"file"),base=required(opt["base-url"],"base-url").replace(/\/$/,""),token=required(opt.token,"token");
  const data=JSON.parse(fs.readFileSync(file,"utf8")),isOverpass=Array.isArray(data.elements),source=opt.source||(isOverpass?"openstreetmap":"manual");
  const hotels=isOverpass?fromOverpass(data,opt):fromNormalized(data,opt);if(!hotels.length)throw new Error("No importable hotel identities found.");
  let imported=0,created=0,matched=0,failed=0;
  for(let i=0;i<hotels.length;i+=100){
    const batch=hotels.slice(i,i+100);
    const res=await fetch(base+"/api/hotel-desk/directory/import",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token},body:JSON.stringify({source,hotels:batch})});
    const body=await res.json().catch(()=>({}));if(!res.ok&&res.status!==207)throw new Error("Import HTTP "+res.status+": "+JSON.stringify(body));
    imported+=batch.length;created+=Number(body.created||0);matched+=Number(body.matched||0);failed+=Number(body.failed||0);
    process.stdout.write(JSON.stringify({batch:i/100+1,imported,created,matched,failed})+"\n");
  }
}
main().catch(error=>{console.error(error);process.exit(1)});