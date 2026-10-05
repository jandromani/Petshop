import { canonicalSiteUrl } from "@/src/system/site-url";
import { legalIdentity } from "@/src/system/legal";

type MailInput={to:string;subject:string;html:string};

export function sourcingEmailStatus(){
  return{configured:Boolean(process.env.RESEND_API_KEY?.trim()&&process.env.ATLAS_EMAIL_FROM?.trim())};
}

function esc(value:string){
  return value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]||c));
}

async function sendMail(input:MailInput){
  const apiKey=process.env.RESEND_API_KEY?.trim();const from=process.env.ATLAS_EMAIL_FROM?.trim();
  if(!apiKey||!from)return{sent:false,reason:"not-configured" as const};
  const identity=legalIdentity();
  const res=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({from,to:[input.to],subject:input.subject,html:input.html,...(identity.email?{reply_to:identity.email}:{})})});
  if(!res.ok)return{sent:false,reason:"provider-error" as const};
  return{sent:true,reason:"sent" as const};
}

export async function sendSourcingReceipt(input:{to:string;hotelName:string;city:string;checkIn:string;nights:number;requestId:string}){
  const site=canonicalSiteUrl();
  return sendMail({
    to:input.to,
    subject:"Atlas is sourcing "+input.nights+" days at "+input.hotelName,
    html:"<h1>Your Atlas sourcing case is active.</h1><p><b>"+esc(input.hotelName)+"</b> · "+esc(input.city)+" · "+esc(input.checkIn)+" · "+input.nights+" days.</p><p>Atlas will only return a price when it has current commercial evidence. A hotel listing by itself is not treated as supply.</p><p>Case: <code>"+esc(input.requestId)+"</code></p><p><a href=\""+site+"/saved\">Open Atlas</a></p>"
  });
}

export async function sendSourcingMatch(input:{to:string;hotelName:string;nights:number;path?:string|null}){
  const site=canonicalSiteUrl();const path=input.path&&input.path.startsWith("/")?input.path:"/saved";
  return sendMail({
    to:input.to,
    subject:"Atlas found a verified long-stay match",
    html:"<h1>A verified match is available.</h1><p>Atlas has commercial evidence matching your "+input.nights+"-day request for <b>"+esc(input.hotelName)+"</b>.</p><p>Availability can change. Open Atlas to review the current rate and booking path.</p><p><a href=\""+site+path+"\">Review the match</a></p>"
  });
}
