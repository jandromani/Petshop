import { createHash,randomBytes,randomUUID } from "node:crypto";
import { getDatabase } from "@/src/db/client";
import { PartnerRateInput } from "@/src/core/hotel-partner";

export const HOTEL_COOKIE="atlas_hotel";
export const portalTokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
export const validPortalToken=(token:string|undefined):token is string=>Boolean(token&&/^[A-Za-z0-9_-]{43}$/.test(token));

export async function issueHotelAccess(hotelLeadId:string) {
  const sql=getDatabase();if(!sql)return null;
  const token=randomBytes(32).toString("base64url");
  const rows=await sql<{id:string;expires_at:string}[]>`
    insert into hotel_portal_access(hotel_lead_id,token_hash,expires_at)
    select id,${portalTokenHash(token)},now()+interval '7 days' from hotel_leads where id=${hotelLeadId}::uuid
    returning id::text,expires_at::text
  `;
  return rows[0]?{id:rows[0].id,token,expiresAt:rows[0].expires_at}:null;
}

export async function hotelAccess(token:string|undefined) {
  if(!validPortalToken(token))return null;
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<{id:string;hotel_lead_id:string;hotel_name:string;city:string;country:string}[]>`
    select a.id::text,a.hotel_lead_id::text,l.hotel_name,l.city,l.country
    from hotel_portal_access a join hotel_leads l on l.id=a.hotel_lead_id
    where a.token_hash=${portalTokenHash(token)} and a.revoked_at is null and a.expires_at>now() limit 1
  `;
  return rows[0]||null;
}

export async function revokeHotelAccess(id:string) {
  const sql=getDatabase();if(!sql)return false;
  const rows=await sql`update hotel_portal_access set revoked_at=now() where id=${id}::uuid returning id`;
  return rows.length>0;
}

export async function listHotelAccess() {
  const sql=getDatabase();if(!sql)return [];
  return sql`
    select a.id::text,l.hotel_name,a.expires_at::text from hotel_portal_access a
    join hotel_leads l on l.id=a.hotel_lead_id
    where a.revoked_at is null and a.expires_at>now() order by a.created_at desc limit 100
  `;
}

export async function hotelPortalRates(token:string|undefined) {
  if(!validPortalToken(token))return [];
  const sql=getDatabase();if(!sql)return [];
  return sql`
    select r.id::text,r.rate_code,r.min_nights,r.max_nights,r.max_guests,r.board,r.monthly_price::float,r.currency,
      r.valid_from::text,r.valid_to::text,r.cancellation,r.publication_state
    from direct_rate_offers r join hotel_portal_access a on a.hotel_lead_id=r.hotel_lead_id
    where a.token_hash=${portalTokenHash(token)} and a.revoked_at is null and a.expires_at>now()
    order by r.created_at desc limit 50
  `;
}

export async function proposeHotelRate(token:string|undefined,raw:unknown) {
  const input=PartnerRateInput.parse(raw);
  if(!validPortalToken(token))return null;
  const sql=getDatabase();if(!sql)return null;
  // Append a fresh draft. Partner input cannot alter a published offer or choose another hotel.
  const rows=await sql<{id:string}[]>`
    insert into direct_rate_offers(hotel_lead_id,rate_code,min_nights,max_nights,max_guests,board,monthly_price,currency,valid_from,valid_to,cancellation,contract_verified,publication_state)
    select a.hotel_lead_id,${"PORTAL-"+randomUUID()},${input.minNights},${input.maxNights},${input.maxGuests},${input.board},
      ${input.monthlyPrice},${input.currency},${input.validFrom}::date,${input.validTo}::date,${input.cancellation},false,'DRAFT'
    from hotel_portal_access a where a.token_hash=${portalTokenHash(token)} and a.revoked_at is null and a.expires_at>now()
    returning id::text
  `;
  return rows[0]?.id||null;
}
