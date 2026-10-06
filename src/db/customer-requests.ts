import { createHash,createHmac,randomBytes } from "node:crypto";
import { getDatabase } from "@/src/db/client";
import { validSavedProfileId } from "@/src/db/consumer-memory";
import { listSellableOffers } from "@/src/db/catalog";
import type { LiveCatalogOffer } from "@/src/core/live-offers";
export const REQUEST_ACCESS_COOKIE="atlas_request_access";
const hash=(token:string)=>createHash("sha256").update(token).digest("hex");
export async function createRequestAccess(id:string,scope="receipt"){
  const sql=getDatabase();if(!sql)return null;
  const secret=process.env.OPS_ACCESS_KEY;
  const token=secret?createHmac("sha256",secret).update("customer-request:"+id+":"+scope).digest("base64url"):randomBytes(32).toString("base64url");
  await sql`insert into sourcing_access(token_hash,request_id) values(${hash(token)},${id}::uuid) on conflict(token_hash) do nothing`;
  return token;
}
export async function requestIdFromAccess(token:string|undefined){
  if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<Array<{id:string}>>`select request_id::text as id from sourcing_access where token_hash=${hash(token)} and expires_at>now() limit 1`;
  return rows[0]?.id||null;
}
export type CustomerRequest={id:string;directory_hotel_id:string;hotel_name:string;city:string;country:string;check_in:string;nights:number;occupancy:number;target_monthly_eur:number|null;status:string;language:"en"|"es";quote_offer_id:string|null;quote_sent_at:string|null;quote_accepted_at:string|null;receipt_notified_at:string|null;created_at:string;offer:LiveCatalogOffer|null};
export async function customerRequests(profileId:string|undefined,accessToken?:string){
  const sql=getDatabase();if(!sql)return[] as CustomerRequest[];
  const accessId=await requestIdFromAccess(accessToken);const profile=validSavedProfileId(profileId)?profileId:null;
  if(!profile&&!accessId)return[] as CustomerRequest[];
  const rows=await sql<Array<Omit<CustomerRequest,"offer">>>`select id::text,directory_hotel_id,hotel_name,city,country,check_in::text,nights,occupancy,target_monthly_eur::float,status,language,quote_offer_id::text,quote_sent_at::text,quote_accepted_at::text,receipt_notified_at::text,created_at::text from sourcing_requests where (${profile}::uuid is not null and consumer_profile_id=${profile}::uuid) or id=${accessId}::uuid order by created_at desc limit 50`;
  return Promise.all(rows.map(async row=>({...row,offer:row.quote_offer_id?await verifiedRequestOffer(row,row.quote_offer_id):null})));
}
function norm(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
export function offerMatchesRequest(request:{hotel_name:string;city:string;country:string;check_in:string;nights:number;occupancy:number},offer:LiveCatalogOffer){return norm(request.hotel_name)===norm(offer.name)&&norm(request.city)===norm(offer.city)&&norm(request.country)===norm(offer.country)&&String(request.check_in).slice(0,10)===offer.checkIn&&request.nights===offer.nights&&request.occupancy===offer.occupancy}
export async function verifiedRequestOffer(request:{hotel_name:string;city:string;country:string;check_in:string;nights:number;occupancy:number},offerId:string){
 const offers=await listSellableOffers({q:request.hotel_name,checkIn:String(request.check_in).slice(0,10),nights:request.nights,occupancy:request.occupancy,flexibleDays:0,limit:50}).catch(()=>[]);
 return offers.find(o=>o.offerId===offerId&&offerMatchesRequest(request,o))||null;
}
export async function attachVerifiedQuote(requestId:string,offerId:string){
 const sql=getDatabase();if(!sql)return false;
 const rows=await sql<Array<{hotel_name:string;city:string;country:string;check_in:string;nights:number;occupancy:number}>>`select hotel_name,city,country,check_in::text,nights,occupancy from sourcing_requests where id=${requestId}::uuid and status<>'CLOSED' limit 1`;
 if(!rows[0]||!await verifiedRequestOffer(rows[0],offerId))return false;
 await sql`update sourcing_requests set quote_offer_id=${offerId}::uuid,quote_sent_at=now(),quote_accepted_at=null,status='MATCHED',updated_at=now() where id=${requestId}::uuid and status<>'CLOSED'`;
 return true;
}
export async function acceptCustomerQuote(id:string,profileId:string|undefined,accessToken?:string){
  const request=(await customerRequests(profileId,accessToken)).find(x=>x.id===id);
  if(!request?.offer||!offerMatchesRequest(request,request.offer)||request.status!=="MATCHED")return null;
  const sql=getDatabase();if(!sql)return null;
  const updated=await sql`update sourcing_requests set quote_accepted_at=coalesce(quote_accepted_at,now()),updated_at=now() where id=${id}::uuid and quote_offer_id=${request.quote_offer_id}::uuid and status='MATCHED' returning id`;
  if(!updated.length)return null;
  if(request.offer.checkoutMode==="atlas_checkout")return (request.language==="es"?"/es":"")+"/checkout/"+encodeURIComponent(request.offer.offerId)+"?checkIn="+request.offer.checkIn+"&nights="+request.nights+"&occupancy="+request.occupancy;
  return "/api/referral?offer="+encodeURIComponent(request.offer.offerId)+"&from=%2Frequests";
}

export async function exportRequestData(profileId:string|undefined,accessToken?:string){
  const sql=getDatabase();if(!sql)return[];
  const accessId=await requestIdFromAccess(accessToken),profile=validSavedProfileId(profileId)?profileId:null;if(!profile&&!accessId)return[];
  return sql`select id::text,directory_hotel_id,hotel_name,city,country,check_in::text,nights,occupancy,target_monthly_eur,requester_email,contact_consent,language,acquisition,status,quote_offer_id::text,quote_sent_at::text,quote_accepted_at::text,created_at::text from sourcing_requests where (${profile}::uuid is not null and consumer_profile_id=${profile}::uuid) or id=${accessId}::uuid order by created_at desc limit 100`;
}
