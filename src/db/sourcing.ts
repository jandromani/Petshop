import { getDatabase } from "@/src/db/client";

export type SourcingRequestInput={
  directoryHotelId:string;
  hotelName:string;
  city:string;
  country:string;
  checkIn:string;
  nights:30|60|90|120|180|365;
  occupancy:1|2;
  targetMonthlyEur?:number;
  requesterHash:string;
  requesterEmail:string;
  contactConsent:boolean;
  sourcePath?:string;
  consumerProfileId?:string;
};

export async function createSourcingRequest(input:SourcingRequestInput){
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<Array<{id:string;status:string;created_at:string}>>`
    insert into sourcing_requests (
      directory_hotel_id,hotel_name,city,country,check_in,nights,occupancy,
      target_monthly_eur,requester_hash,requester_email,contact_consent,source_path,consumer_profile_id
    ) values (
      ${input.directoryHotelId},${input.hotelName},${input.city},${input.country},
      ${input.checkIn},${input.nights},${input.occupancy},
      ${input.targetMonthlyEur ?? null},${input.requesterHash},${input.requesterEmail},${input.contactConsent},${input.sourcePath ?? null},${input.consumerProfileId??null}::uuid
    )
    on conflict (requester_hash,directory_hotel_id,check_in,nights,occupancy)
    do update set
      target_monthly_eur=coalesce(excluded.target_monthly_eur,sourcing_requests.target_monthly_eur),
      requester_email=excluded.requester_email,
      contact_consent=excluded.contact_consent,
      source_path=coalesce(excluded.source_path,sourcing_requests.source_path),
      consumer_profile_id=coalesce(excluded.consumer_profile_id,sourcing_requests.consumer_profile_id),
      updated_at=now()
    returning id::text,status,created_at::text
  `;
  return rows[0]??null;
}

export async function listSourcingRequests(limit=100){
  const sql=getDatabase();if(!sql)return[];
  const bounded=Math.max(1,Math.min(500,limit));
  return sql<Array<{
    id:string;directory_hotel_id:string;hotel_name:string;city:string;country:string;
    check_in:string;nights:number;occupancy:number;target_monthly_eur:number|null;
    requester_email:string|null;contact_consent:boolean;source_path:string|null;
    receipt_notified_at:string|null;match_notified_at:string|null;
    status:string;created_at:string;updated_at:string;
  }>>`
    select id::text,directory_hotel_id,hotel_name,city,country,check_in::text,nights,occupancy,
      target_monthly_eur::float,requester_email,contact_consent,source_path,
      receipt_notified_at::text,match_notified_at::text,status,created_at::text,updated_at::text
    from sourcing_requests
    order by
      case status when 'OPEN' then 0 when 'SOURCING' then 1 when 'MATCHED' then 2 else 3 end,
      created_at desc
    limit ${bounded}
  `;
}

export async function getSourcingRequest(id:string){
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<Array<{id:string;hotel_name:string;nights:number;requester_email:string|null;source_path:string|null;receipt_notified_at:string|null;match_notified_at:string|null;status:string}>>`
    select id::text,hotel_name,nights,requester_email,source_path,receipt_notified_at::text,match_notified_at::text,status
    from sourcing_requests where id=${id}::uuid limit 1
  `;
  return rows[0]??null;
}

export async function markSourcingNotification(id:string,kind:"receipt"|"match"){
  const sql=getDatabase();if(!sql)return false;
  if(kind==="receipt")await sql`update sourcing_requests set receipt_notified_at=coalesce(receipt_notified_at,now()),updated_at=now() where id=${id}::uuid`;
  else await sql`update sourcing_requests set match_notified_at=coalesce(match_notified_at,now()),updated_at=now() where id=${id}::uuid`;
  return true;
}

export async function updateSourcingRequestStatus(id:string,status:"OPEN"|"SOURCING"|"MATCHED"|"CLOSED"){
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<Array<{id:string;status:string}>>`
    update sourcing_requests
    set status=${status},updated_at=now()
    where id=${id}::uuid
    returning id::text,status
  `;
  return rows[0]??null;
}
