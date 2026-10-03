import { getDatabase } from "@/src/db/client";
import type { AdjacencyKind } from "@/src/adjacency/registry";

export async function persistAdjacencyClick(input:{
  clickId:string;kind:AdjacencyKind;partnerKey:string;visitorId?:string;sessionId?:string;source?:string;campaign?:string;pagePath?:string;targetHost:string;
}){
  const sql=getDatabase();if(!sql)return false;
  await sql`
    insert into adjacency_referral_clicks (click_id,kind,partner_key,visitor_id,session_id,source,campaign,page_path,target_host)
    values (
      ${input.clickId}::uuid,${input.kind},${input.partnerKey},${input.visitorId??null},${input.sessionId??null},
      ${input.source??null},${input.campaign??null},${input.pagePath??null},${input.targetHost}
    )
    on conflict (click_id) do nothing
  `;
  return true;
}

export async function persistAdjacencyConversion(input:{
  clickId:string;kind:AdjacencyKind;partnerKey:string;providerConversionId:string;bookingValue?:number;commission?:number;currency?:string;status:string;rawPayload?:unknown;
}){
  const sql=getDatabase();if(!sql)return false;
  await sql`
    insert into adjacency_conversions (click_id,kind,partner_key,provider_conversion_id,booking_value,commission,currency,status,raw_payload,updated_at)
    values (
      ${input.clickId}::uuid,${input.kind},${input.partnerKey},${input.providerConversionId},${input.bookingValue??null},
      ${input.commission??null},${input.currency??null},${input.status},${sql.json((input.rawPayload||{}) as never)},now()
    )
    on conflict (partner_key,provider_conversion_id) do update set
      booking_value=excluded.booking_value,
      commission=excluded.commission,
      currency=excluded.currency,
      status=excluded.status,
      raw_payload=excluded.raw_payload,
      updated_at=now()
  `;
  return true;
}

export async function adjacencyMetrics(days=30){
  const sql=getDatabase();if(!sql)return[];
  const bounded=Math.max(1,Math.min(365,days));
  return sql<Array<{kind:string;clicks:number;conversions:number;commission:number;currency:string|null}>>`
    select c.kind,count(distinct c.click_id)::int as clicks,
      count(distinct v.provider_conversion_id)::int as conversions,
      coalesce(sum(case when v.status not in ('CANCELLED','REVERSED') then v.commission else 0 end),0)::float as commission,
      v.currency
    from adjacency_referral_clicks c
    left join adjacency_conversions v on v.click_id=c.click_id
    where c.created_at>=now()-make_interval(days => ${bounded})
    group by c.kind,v.currency
    order by c.kind,v.currency
  `;
}
