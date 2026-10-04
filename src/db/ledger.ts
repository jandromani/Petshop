import { getDatabase } from "@/src/db/client";
import type { ReferralClick } from "@/src/services/referral";

export type PersistResult={persisted:boolean;reason?:string};

export async function persistGrowthEvent(input:{
  visitorId?:string;
  sessionId?:string;
  name:string;
  properties:Record<string,string|number|boolean>;
  pagePath?:string;
}):Promise<PersistResult>{
  const sql=getDatabase();
  if(!sql) return{persisted:false,reason:"database-not-configured"};

  try{
    await sql`
      insert into growth_events (visitor_id,session_id,event_name,properties,page_path)
      values (
        ${input.visitorId ?? null},
        ${input.sessionId ?? null},
        ${input.name},
        ${sql.json(input.properties)},
        ${input.pagePath ?? null}
      )
    `;
    return{persisted:true};
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"db_growth_event_failed",error:String(error)}));
    return{persisted:false,reason:"database-write-failed"};
  }
}

export async function persistReferralClick(click:ReferralClick):Promise<PersistResult>{
  const sql=getDatabase();
  if(!sql) return{persisted:false,reason:"database-not-configured"};

  try{
    await sql`
      insert into referral_clicks (
        click_id,provider_tracking_id,visitor_id,session_id,hotel_id,provider,offer_snapshot_id,
        source,campaign,page_path,position,expected_commission,created_at
      ) values (
        ${click.clickId},
        ${click.providerTrackingId},
        ${click.visitorId ?? null},
        ${click.sessionId ?? null},
        ${click.canonicalHotelId ?? null}::uuid,
        ${click.provider},
        ${click.offerSnapshotId ?? null}::uuid,
        ${click.source ?? null},
        ${click.campaign ?? null},
        ${click.pagePath ?? null},
        ${click.position ?? null},
        ${click.expectedCommission ?? null},
        ${click.createdAt}
      )
      on conflict (click_id) do nothing
    `;
    return{persisted:true};
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"db_referral_click_failed",clickId:click.clickId,error:String(error)}));
    return{persisted:false,reason:"database-write-failed"};
  }
}

export async function persistConversion(input:{
  clickId:string;
  provider:string;
  providerConversionId:string;
  bookingValue?:number;
  commission?:number;
  currency?:string;
  status?:"PENDING"|"CONFIRMED"|"CANCELLED"|"SETTLED"|"REVERSED";
  occurredAt?:string;
  rawPayload?:unknown;
  settlementReference?:string;
}):Promise<PersistResult>{
  const sql=getDatabase();
  if(!sql) return{persisted:false,reason:"database-not-configured"};

  try{
    const windowDays=Math.max(1,Math.min(365,Number(process.env.ATTRIBUTION_WINDOW_DAYS||90)));
    const eventAt=input.occurredAt ?? new Date().toISOString();
    const rows=await sql<{id:string}[]>`
      insert into conversions (
        click_id,provider,provider_conversion_id,booking_value,commission,currency,status,occurred_at,raw_payload,cancelled_at,settled_at,settlement_reference,updated_at
      )
      select
        ${input.clickId},
        ${input.provider},
        ${input.providerConversionId},
        ${input.bookingValue ?? null},
        ${input.commission ?? null},
        ${input.currency ?? null},
        ${input.status ?? "PENDING"},
        ${input.occurredAt ?? null},
        ${sql.json((input.rawPayload||{}) as never)},
        ${input.status==="CANCELLED"||input.status==="REVERSED" ? eventAt : null},
        ${input.status==="SETTLED" ? eventAt : null},
        ${input.settlementReference ?? null},
        now()
      from referral_clicks referral
      where referral.click_id=${input.clickId}
        and (
          exists (
            select 1 from conversions existing
            where existing.provider=${input.provider}
              and existing.provider_conversion_id=${input.providerConversionId}
          )
          or (
            ${eventAt}::timestamptz >= referral.created_at - interval '5 minutes'
            and ${eventAt}::timestamptz <= referral.created_at + make_interval(days => ${windowDays})
          )
        )
      on conflict (provider,provider_conversion_id)
      do update set
        booking_value=coalesce(excluded.booking_value,conversions.booking_value),
        commission=coalesce(excluded.commission,conversions.commission),
        currency=coalesce(excluded.currency,conversions.currency),
        status=case
          when conversions.status in ('CANCELLED','REVERSED') then conversions.status
          when excluded.status in ('CANCELLED','REVERSED') then excluded.status
          when conversions.status='SETTLED' then 'SETTLED'
          when excluded.status='SETTLED' then 'SETTLED'
          when conversions.status='CONFIRMED' and excluded.status='PENDING' then 'CONFIRMED'
          else excluded.status
        end,
        occurred_at=coalesce(excluded.occurred_at,conversions.occurred_at),
        raw_payload=case when excluded.raw_payload='{}'::jsonb then conversions.raw_payload else excluded.raw_payload end,
        cancelled_at=coalesce(excluded.cancelled_at,conversions.cancelled_at),
        settled_at=coalesce(excluded.settled_at,conversions.settled_at),
        settlement_reference=coalesce(excluded.settlement_reference,conversions.settlement_reference),
        updated_at=now()
      returning id::text
    `;
    if(!rows[0])return{persisted:false,reason:"attribution-window-rejected"};
    return{persisted:true};
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"db_conversion_failed",clickId:input.clickId,provider:input.provider,error:String(error)}));
    return{persisted:false,reason:"database-write-failed"};
  }
}
