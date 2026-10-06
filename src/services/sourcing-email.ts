import { canonicalSiteUrl } from "@/src/system/site-url";
import { legalIdentity } from "@/src/system/legal";
import { copy,type Language } from "@/src/i18n/config";
type MailInput={to:string;subject:string;html:string;idempotencyKey?:string};
export function sourcingEmailStatus(){return{configured:Boolean(process.env.RESEND_API_KEY?.trim()&&process.env.ATLAS_EMAIL_FROM?.trim())}}
function esc(value:string){return value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]||c))}
async function sendMail(input:MailInput){
  const key=process.env.RESEND_API_KEY?.trim(),from=process.env.ATLAS_EMAIL_FROM?.trim();
  if(!key||!from)return{sent:false,reason:"not-configured" as const,messageId:null};
  const identity=legalIdentity();
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json",...(input.idempotencyKey?{"Idempotency-Key":input.idempotencyKey}:{})},signal:AbortSignal.timeout(10000),body:JSON.stringify({from,to:[input.to],subject:input.subject,html:input.html,...(identity.email?{reply_to:identity.email}:{})})});
  const data=await response.json().catch(()=>null);
  if(!response.ok||typeof data?.id!=="string")return{sent:false,reason:"provider-error" as const,messageId:null};
  return{sent:true,reason:"accepted" as const,messageId:data.id as string};
}
function trackingUrl(path?:string|null){return canonicalSiteUrl()+(path?.startsWith("/")&&!path.startsWith("//")?path:"/requests")}
export async function sendSourcingReceipt(input:{to:string;hotelName:string;city:string;checkIn:string;nights:number;requestId:string;language?:Language;path?:string;idempotencyKey?:string}){
  const l=input.language||"en";
  return sendMail({to:input.to,idempotencyKey:input.idempotencyKey,subject:copy(l,"Your Atlas stay request","Tu solicitud de estancia en Atlas")+" · "+input.hotelName,html:"<h1>"+copy(l,"Your request is received.","Hemos recibido tu solicitud.")+"</h1><p><b>"+esc(input.hotelName)+"</b> · "+esc(input.city)+" · "+esc(input.checkIn)+" · "+input.nights+copy(l," nights."," noches.")+"</p><p>"+copy(l,"We will check rates for your dates. Your request does not make a reservation or take a payment.","Comprobaremos tarifas para tus fechas. Esta solicitud no crea una reserva ni realiza un cobro.")+"</p><p><a href=\""+esc(trackingUrl(input.path))+"\">"+copy(l,"Follow my request","Seguir mi solicitud")+"</a></p>"});
}
export async function sendSourcingMatch(input:{to:string;hotelName:string;nights:number;path?:string|null;language?:Language;idempotencyKey?:string}){
  const l=input.language||"en";
  return sendMail({to:input.to,idempotencyKey:input.idempotencyKey,subject:copy(l,"Your Atlas quote is ready to review","Tu presupuesto de Atlas está listo")+" · "+input.hotelName,html:"<h1>"+copy(l,"Review your stay option.","Revisa tu opción de estancia.")+"</h1><p>"+esc(input.hotelName)+" · "+input.nights+copy(l," nights."," noches.")+"</p><p>"+copy(l,"Check the current price, terms and availability before continuing to booking.","Consulta el precio vigente, las condiciones y la disponibilidad antes de continuar con la reserva.")+"</p><p><a href=\""+esc(trackingUrl(input.path))+"\">"+copy(l,"Review my quote","Revisar mi presupuesto")+"</a></p>"});
}
