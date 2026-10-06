import { getDatabase } from "@/src/db/client";
import { getSourcingRequest,markSourcingNotification } from "@/src/db/sourcing";
import { createRequestAccess,verifiedRequestOffer } from "@/src/db/customer-requests";
import { sendSourcingReceipt,sendSourcingMatch,sourcingEmailStatus } from "@/src/services/sourcing-email";
import { localizedHref } from "@/src/i18n/config";
export async function queueSourcingEmail(requestId:string,kind:"receipt"|"match"){
  const sql=getDatabase();if(!sql)return false;
  const request=await getSourcingRequest(requestId);
  if(!request||!request.contact_consent||request.status==="CLOSED"||kind==="match"&&!request.quote_offer_id)return false;
  const version=kind==="match"?request.quote_offer_id!:"receipt";
  await sql`insert into sourcing_mail_queue(request_id,kind,version,language) values(${requestId}::uuid,${kind},${version},${request.language}) on conflict(request_id,kind,version) do nothing`;
  return true;
}
export async function drainSourcingEmail(limit=20){
  const sql=getDatabase();if(!sql||!sourcingEmailStatus().configured)return{configured:false,accepted:0,failed:0};
  const jobs=await sql<Array<{request_id:string;kind:"receipt"|"match";version:string;language:"en"|"es";attempts:number}>>`
    with candidates as (select request_id,kind,version from sourcing_mail_queue where (state='PENDING' or (state='SENDING' and updated_at<now()-interval '15 minutes')) and next_attempt_at<=now() and attempts<8 order by next_attempt_at limit ${Math.max(1,Math.min(50,limit))} for update skip locked)
    update sourcing_mail_queue q set state='SENDING',attempts=q.attempts+1,updated_at=now() from candidates c where q.request_id=c.request_id and q.kind=c.kind and q.version=c.version returning q.request_id::text,q.kind,q.version,q.language,q.attempts`;
  let accepted=0,failed=0;
  for(const job of jobs){
    try{
      const request=await getSourcingRequest(job.request_id);
      if(!request?.requester_email||!request.contact_consent||request.status==="CLOSED"||job.kind==="match"&&(request.quote_offer_id!==job.version||!await verifiedRequestOffer(request,job.version))){
        await sql`update sourcing_mail_queue set state='FAILED',last_error='contact-or-quote-unavailable',updated_at=now() where request_id=${job.request_id}::uuid and kind=${job.kind} and version=${job.version}`;
        failed++;continue;
      }
      const token=await createRequestAccess(request.id,job.kind+":"+job.version);
      const path=localizedHref("/requests",job.language)+(token?"#access="+token:"");
      const common={to:request.requester_email,hotelName:request.hotel_name,nights:request.nights,language:job.language,path,idempotencyKey:"atlas-request-"+request.id+"-"+job.kind+"-"+job.version};
      const result=job.kind==="receipt"?await sendSourcingReceipt({...common,city:request.city,checkIn:request.check_in,requestId:request.id}):await sendSourcingMatch(common);
      if(!result.sent)throw new Error(result.reason);
      await sql`update sourcing_mail_queue set state='SENT',provider_message_id=${result.messageId||null},accepted_at=now(),last_error=null,updated_at=now() where request_id=${request.id}::uuid and kind=${job.kind} and version=${job.version}`;
      await markSourcingNotification(request.id,job.kind);accepted++;
    }catch{failed++;await sql`update sourcing_mail_queue set state=case when attempts>=8 then 'FAILED' else 'PENDING' end,last_error='delivery-attempt-failed',next_attempt_at=now()+make_interval(mins=>least(720,15*attempts)),updated_at=now() where request_id=${job.request_id}::uuid and kind=${job.kind} and version=${job.version}`}
  }
  return{configured:true,accepted,failed};
}
