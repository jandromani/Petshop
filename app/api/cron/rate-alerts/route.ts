import { cronAuthorized } from "@/src/security/ops-auth";
import { listActiveRateAlerts,recordRateAlertCheck } from "@/src/db/rate-alerts";
import { listSellableOffers } from "@/src/db/catalog";

export const runtime="nodejs";
const norm=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function closeName(a:string,b:string){const x=norm(a),y=norm(b);return x===y||x.includes(y)||y.includes(x);}

export async function GET(req:Request){
  if(!cronAuthorized(req))return new Response("Unauthorized",{status:401});
  const alerts=await listActiveRateAlerts(100);
  let checked=0,triggered=0,errors=0;
  for(const alert of alerts){
    try{
      const offers=await listSellableOffers({q:alert.hotelName,checkIn:alert.checkIn,nights:alert.nights,occupancy:alert.occupancy,limit:12});
      const exact=offers.filter(o=>o.country.toLowerCase()===alert.country.toLowerCase()&&o.city.toLowerCase()===alert.city.toLowerCase()&&closeName(o.name,alert.hotelName));
      const eligible=alert.targetMonthly===null?exact:exact.filter(o=>o.monthlyEquivalent<=alert.targetMonthly!);
      const best=eligible.sort((a,b)=>a.monthlyEquivalent-b.monthlyEquivalent)[0];
      await recordRateAlertCheck({id:alert.id,offerId:best?.offerId,monthly:best?.monthlyEquivalent,triggered:Boolean(best),result:best?"verified offer matched target":"no verified rate matched target"});
      checked++;if(best)triggered++;
    }catch(error){errors++;await recordRateAlertCheck({id:alert.id,triggered:false,result:"check failed: "+String(error).slice(0,160)}).catch(()=>false);}
  }
  return Response.json({ok:true,checked,triggered,errors},{headers:{"Cache-Control":"no-store"}});
}