import { getDatabase } from "@/src/db/client";
import { ensureSavedProfile,validSavedProfileId } from "@/src/db/consumer-memory";
import type { RateAlert } from "@/src/core/rate-alerts";

type Row={
  id:string;hotel_id:string;hotel_name:string;city:string;country:string;check_in:string;nights:number;occupancy:number;
  target_monthly:number|null;currency:string;status:"ACTIVE"|"TRIGGERED"|"PAUSED";triggered_offer_id:string|null;
  triggered_monthly:number|null;triggered_at:string|null;last_checked_at:string|null;last_result:string|null;created_at:string;updated_at:string;
};
const map=(r:Row):RateAlert=>({
  id:r.id,hotelId:r.hotel_id,hotelName:r.hotel_name,city:r.city,country:r.country,checkIn:String(r.check_in).slice(0,10),
  nights:r.nights as RateAlert["nights"],occupancy:r.occupancy as 1|2,targetMonthly:r.target_monthly===null?null:Number(r.target_monthly),
  currency:r.currency,status:r.status,triggeredOfferId:r.triggered_offer_id,triggeredMonthly:r.triggered_monthly===null?null:Number(r.triggered_monthly),
  triggeredAt:r.triggered_at?new Date(r.triggered_at).toISOString():null,lastCheckedAt:r.last_checked_at?new Date(r.last_checked_at).toISOString():null,
  lastResult:r.last_result,createdAt:new Date(r.created_at).toISOString(),updatedAt:new Date(r.updated_at).toISOString(),
});

export async function listRateAlerts(profileId:string|undefined|null){
  const sql=getDatabase();if(!sql||!validSavedProfileId(profileId))return[] as RateAlert[];
  const rows=await sql<Row[]>`
    select id::text,hotel_id,hotel_name,city,country,check_in::text,nights,occupancy,target_monthly::float,currency,status,
      triggered_offer_id,triggered_monthly::float,triggered_at::text,last_checked_at::text,last_result,created_at::text,updated_at::text
    from consumer_rate_alerts where profile_id=${profileId}::uuid order by updated_at desc limit 60
  `;
  return rows.map(map);
}

export async function upsertRateAlert(candidateProfileId:string|undefined|null,input:{
  hotelId:string;hotelName:string;city:string;country:string;checkIn:string;nights:RateAlert["nights"];occupancy:1|2;targetMonthly?:number|null;
}){
  const sql=getDatabase();if(!sql)return null;
  const profileId=await ensureSavedProfile(candidateProfileId);if(!profileId)return null;
  const rows=await sql<Row[]>`
    insert into consumer_rate_alerts(profile_id,hotel_id,hotel_name,city,country,check_in,nights,occupancy,target_monthly,status,updated_at)
    values (${profileId}::uuid,${input.hotelId},${input.hotelName},${input.city},${input.country},${input.checkIn}::date,${input.nights},${input.occupancy},${input.targetMonthly??null},'ACTIVE',now())
    on conflict (profile_id,hotel_id,check_in,nights,occupancy) do update set
      hotel_name=excluded.hotel_name,city=excluded.city,country=excluded.country,target_monthly=excluded.target_monthly,status='ACTIVE',
      triggered_offer_id=null,triggered_monthly=null,triggered_at=null,last_result=null,updated_at=now()
    returning id::text,hotel_id,hotel_name,city,country,check_in::text,nights,occupancy,target_monthly::float,currency,status,
      triggered_offer_id,triggered_monthly::float,triggered_at::text,last_checked_at::text,last_result,created_at::text,updated_at::text
  `;
  return{profileId,alert:rows[0]?map(rows[0]):null};
}

export async function deleteRateAlert(profileId:string|undefined|null,id:string){
  const sql=getDatabase();if(!sql||!validSavedProfileId(profileId))return false;
  const rows=await sql<{id:string}[]>`delete from consumer_rate_alerts where id=${id}::uuid and profile_id=${profileId}::uuid returning id::text`;
  return Boolean(rows[0]);
}

export async function listActiveRateAlerts(limit=100){
  const sql=getDatabase();if(!sql)return[] as Array<RateAlert&{profileId:string}>;
  const bounded=Math.max(1,Math.min(500,limit));
  const rows=await sql<Array<Row&{profile_id:string}>>`
    select id::text,profile_id::text,hotel_id,hotel_name,city,country,check_in::text,nights,occupancy,target_monthly::float,currency,status,
      triggered_offer_id,triggered_monthly::float,triggered_at::text,last_checked_at::text,last_result,created_at::text,updated_at::text
    from consumer_rate_alerts
    where status='ACTIVE'
      and (last_checked_at is null or last_checked_at<now()-interval '4 hours')
      and check_in>=current_date
    order by last_checked_at asc nulls first,created_at asc
    limit ${bounded}
  `;
  return rows.map(r=>({...map(r),profileId:r.profile_id}));
}

export async function recordRateAlertCheck(input:{id:string;offerId?:string;monthly?:number;triggered:boolean;result:string}){
  const sql=getDatabase();if(!sql)return false;
  await sql`
    update consumer_rate_alerts set
      last_checked_at=now(),last_result=${input.result},
      status=case when ${input.triggered} then 'TRIGGERED' else status end,
      triggered_offer_id=case when ${input.triggered} then ${input.offerId??null} else triggered_offer_id end,
      triggered_monthly=case when ${input.triggered} then ${input.monthly??null} else triggered_monthly end,
      triggered_at=case when ${input.triggered} then now() else triggered_at end,
      updated_at=now()
    where id=${input.id}::uuid
  `;
  return true;
}
