import { getDatabase } from "@/src/db/client";

export type AcquisitionRunSummary={
  id:string;
  waveKey:string;
  mode:string;
  provider:string|null;
  status:string;
  rawCount:number;
  sellableCount:number;
  quarantinedCount:number;
  errorCount:number;
  startedAt:string;
};

export type ControlSnapshot={
  canonicalHotels:number;
  sellableHotels:number;
  liveOffers:number;
  staleHotels:number;
  quarantinedHotels:number;
  clicks30d:number;
  conversions30d:number;
  bookingValue30d:number;
  commission30d:number;
  visitors30d:number;
  routes30d:number;
  agentRuns24h:number;
  agentFailures24h:number;
  judgeRejects24h:number;
  acquisitionRuns:AcquisitionRunSummary[];
};

export async function getControlSnapshot():Promise<ControlSnapshot|null>{
  const sql=getDatabase();
  if(!sql) return null;

  const [supply,revenue,growth,agents,runs]=await Promise.all([
    sql<{canonical_hotels:number;sellable_hotels:number;live_offers:number;stale_hotels:number;quarantined_hotels:number}[]>`
      select
        (select count(*)::int from canonical_hotels) canonical_hotels,
        (select count(*)::int from canonical_hotels where sellability_state='SELLABLE') sellable_hotels,
        (select count(*)::int
          from offer_snapshots o
          join lateral (
            select state from sellability_audits sa
            where sa.offer_snapshot_id=o.id
            order by evaluated_at desc limit 1
          ) a on true
          where a.state='SELLABLE' and o.source_mode='live' and (o.expires_at is null or o.expires_at>now())
        ) live_offers,
        (select count(*)::int from canonical_hotels where sellability_state='STALE') stale_hotels,
        (select count(*)::int from canonical_hotels where sellability_state='QUARANTINED') quarantined_hotels
    `,
    sql<{clicks:number;conversions:number;booking_value:number;commission:number}[]>`
      select
        (select count(*)::int from referral_clicks where created_at>=now()-interval '30 days') clicks,
        (select count(*)::int from conversions where received_at>=now()-interval '30 days') conversions,
        coalesce((select sum(booking_value) from conversions where received_at>=now()-interval '30 days'),0)::float booking_value,
        coalesce((select sum(commission) from conversions where received_at>=now()-interval '30 days'),0)::float commission
    `,
    sql<{visitors:number;routes:number}[]>`
      select
        count(distinct visitor_id) filter (where created_at>=now()-interval '30 days')::int visitors,
        count(*) filter (where created_at>=now()-interval '30 days' and event_name in ('route_strategy_selected','route_shared'))::int routes
      from growth_events
    `,
    sql<{runs:number;failures:number;rejects:number}[]>`
      select
        (select count(*)::int from agent_runs where started_at>=now()-interval '24 hours') runs,
        (select count(*)::int from agent_runs where started_at>=now()-interval '24 hours' and status='FAILED') failures,
        (select count(*)::int from judge_reviews where created_at>=now()-interval '24 hours' and verdict='REJECT') rejects
    `,
    sql<{id:string;wave_key:string;mode:string;provider:string|null;status:string;raw_count:number;sellable_count:number;quarantined_count:number;error_count:number;started_at:string}[]>`
      select id::text,wave_key,mode,provider,status,raw_count,sellable_count,quarantined_count,error_count,started_at::text
      from acquisition_runs
      order by started_at desc
      limit 8
    `,
  ]);

  const s=supply[0];
  const r=revenue[0];
  const g=growth[0];
  const a=agents[0];
  return{
    canonicalHotels:s?.canonical_hotels || 0,
    sellableHotels:s?.sellable_hotels || 0,
    liveOffers:s?.live_offers || 0,
    staleHotels:s?.stale_hotels || 0,
    quarantinedHotels:s?.quarantined_hotels || 0,
    clicks30d:r?.clicks || 0,
    conversions30d:r?.conversions || 0,
    bookingValue30d:Number(r?.booking_value || 0),
    commission30d:Number(r?.commission || 0),
    visitors30d:g?.visitors || 0,
    routes30d:g?.routes || 0,
    agentRuns24h:a?.runs || 0,
    agentFailures24h:a?.failures || 0,
    judgeRejects24h:a?.rejects || 0,
    acquisitionRuns:runs.map(row=>({
      id:row.id,
      waveKey:row.wave_key,
      mode:row.mode,
      provider:row.provider,
      status:row.status,
      rawCount:row.raw_count,
      sellableCount:row.sellable_count,
      quarantinedCount:row.quarantined_count,
      errorCount:row.error_count,
      startedAt:new Date(row.started_at).toISOString(),
    })),
  };
}
