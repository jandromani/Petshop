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
  sourcePath?:string;
};

export async function createSourcingRequest(input:SourcingRequestInput){
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<Array<{id:string;status:string;created_at:string}>>`
    insert into sourcing_requests (
      directory_hotel_id,hotel_name,city,country,check_in,nights,occupancy,
      target_monthly_eur,requester_hash,source_path
    ) values (
      ${input.directoryHotelId},${input.hotelName},${input.city},${input.country},
      ${input.checkIn},${input.nights},${input.occupancy},
      ${input.targetMonthlyEur ?? null},${input.requesterHash},${input.sourcePath ?? null}
    )
    on conflict (requester_hash,directory_hotel_id,check_in,nights,occupancy)
    do update set
      target_monthly_eur=coalesce(excluded.target_monthly_eur,sourcing_requests.target_monthly_eur),
      source_path=coalesce(excluded.source_path,sourcing_requests.source_path),
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
    status:string;created_at:string;updated_at:string;
  }>>`
    select id::text,directory_hotel_id,hotel_name,city,country,check_in::text,nights,occupancy,
      target_monthly_eur::float,status,created_at::text,updated_at::text
    from sourcing_requests
    order by
      case status when 'OPEN' then 0 when 'SOURCING' then 1 when 'MATCHED' then 2 else 3 end,
      created_at desc
    limit ${bounded}
  `;
}
