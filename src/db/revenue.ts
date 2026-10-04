import { getDatabase } from "@/src/db/client";

export async function estimateExpectedCommission(input:{provider:string;bookingValue:number;currency:string}){
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<{rule_type:string;value:number;currency:string|null}[]>`
    select rule_type,value::float,currency from commission_rules
    where provider=${input.provider}
      and active_from<=now()
      and (active_to is null or active_to>now())
      and (currency is null or currency=${input.currency})
    order by active_from desc limit 1
  `;
  const r=rows[0];if(!r)return null;
  if(r.rule_type==="PERCENT")return Math.round(input.bookingValue*Number(r.value)/100*100)/100;
  if(r.rule_type==="FIXED")return Math.round(Number(r.value)*100)/100;
  return null;
}

export async function revenueMetrics(days=30){
  const sql=getDatabase();if(!sql)return null;
  const bounded=Math.max(1,Math.min(365,days));
  const rows=await sql<Array<{currency:string|null;status:string;count:number;booking_value:number;commission:number}>>`
    select currency,status,count(*)::int,coalesce(sum(booking_value),0)::float as booking_value,coalesce(sum(commission),0)::float as commission
    from conversions where received_at>=now()-make_interval(days => ${bounded})
    group by currency,status order by currency,status
  `;
  return rows;
}

export async function revenueAnomalies(days=30){
  const sql=getDatabase();if(!sql)return[];
  const bounded=Math.max(1,Math.min(365,days));
  return sql<Array<{provider:string;provider_conversion_id:string;click_id:string;status:string;reason:string}>>`
    select provider,provider_conversion_id,click_id,status,
      case
        when currency is null then 'missing_currency'
        when status in ('CONFIRMED','SETTLED') and commission is null then 'missing_commission'
        when status='SETTLED' and settled_at is null then 'missing_settled_at'
        when status in ('CANCELLED','REVERSED') and cancelled_at is null then 'missing_cancelled_at'
        else 'unknown'
      end as reason
    from conversions
    where received_at>=now()-make_interval(days => ${bounded})
      and (currency is null
        or (status in ('CONFIRMED','SETTLED') and commission is null)
        or (status='SETTLED' and settled_at is null)
        or (status in ('CANCELLED','REVERSED') and cancelled_at is null))
    order by received_at desc limit 200
  `;
}

export async function persistReconciliation(input:{status:string;windowStart:string;windowEnd:string;conversionCount:number;metrics:unknown;anomalies:unknown[]}){
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<{id:string}[]>`
    insert into revenue_reconciliation_runs (status,window_start,window_end,conversions_count,anomalies_count,metrics,anomalies)
    values (${input.status},${input.windowStart},${input.windowEnd},${input.conversionCount},${input.anomalies.length},${sql.json(input.metrics as never)},${sql.json(input.anomalies as never)})
    returning id::text
  `;
  return rows[0]?.id??null;
}

export async function findReferralByTrackingId(providerTrackingId:string){
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<{click_id:string;provider:string}[]>`
    select click_id,provider from referral_clicks where provider_tracking_id=${providerTrackingId} limit 1
  `;
  return rows[0]??null;
}

export async function getProviderSyncCursor(provider:string,stream:string){
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<{cursor_at:string}[]>`
    select cursor_at::text from provider_sync_cursors where provider=${provider} and stream=${stream} limit 1
  `;
  return rows[0]?.cursor_at??null;
}

export async function setProviderSyncCursor(provider:string,stream:string,cursorAt:string){
  const sql=getDatabase();if(!sql)return false;
  await sql`
    insert into provider_sync_cursors (provider,stream,cursor_at,updated_at)
    values (${provider},${stream},${cursorAt},now())
    on conflict (provider,stream) do update set cursor_at=excluded.cursor_at,updated_at=now()
  `;
  return true;
}


export async function revenueCurrencyExposure(days=30){
  const sql=getDatabase();if(!sql)return[] as Array<{currency:string;status:string;count:number;bookingValue:number;commission:number}>;
  const bounded=Math.max(1,Math.min(365,days));
  try{
    const rows=await sql<Array<{currency:string;status:string;count:number;booking_value:number;commission:number}>>`
      select coalesce(currency,'UNKNOWN') as currency,status,count(*)::int,
        coalesce(sum(booking_value),0)::float as booking_value,
        coalesce(sum(commission),0)::float as commission
      from conversions
      where received_at>=now()-make_interval(days => ${bounded})
      group by coalesce(currency,'UNKNOWN'),status
      order by currency,status
    `;
    return rows.map(row=>({
      currency:row.currency,status:row.status,count:Number(row.count||0),
      bookingValue:Number(row.booking_value||0),commission:Number(row.commission||0),
    }));
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"revenue_currency_exposure_failed",error:String(error).slice(0,300)}));
    return[];
  }
}


export async function revenueEurSummary(days=30){
  const sql=getDatabase();
  if(!sql)return{
    bookingValueEur:0,commissionEur:0,settledCommissionEur:0,takeRate:null as number|null,
  };
  const bounded=Math.max(1,Math.min(365,days));
  try{
    const rows=await sql<Array<{booking_value:number;commission:number;settled_commission:number}>>`
      select
        coalesce(sum(booking_value) filter (
          where currency='EUR' and status not in ('CANCELLED','REVERSED')
        ),0)::float as booking_value,
        coalesce(sum(commission) filter (
          where currency='EUR' and status not in ('CANCELLED','REVERSED')
        ),0)::float as commission,
        coalesce(sum(commission) filter (
          where currency='EUR' and status='SETTLED'
        ),0)::float as settled_commission
      from conversions
      where received_at>=now()-make_interval(days => ${bounded})
    `;
    const bookingValueEur=Number(rows[0]?.booking_value||0);
    const commissionEur=Number(rows[0]?.commission||0);
    const settledCommissionEur=Number(rows[0]?.settled_commission||0);
    return{
      bookingValueEur,commissionEur,settledCommissionEur,
      takeRate:bookingValueEur>0?commissionEur/bookingValueEur:null,
    };
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"revenue_eur_summary_failed",error:String(error).slice(0,300)}));
    return{bookingValueEur:0,commissionEur:0,settledCommissionEur:0,takeRate:null as number|null};
  }
}
