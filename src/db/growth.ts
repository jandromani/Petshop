import { getDatabase } from "@/src/db/client";

export async function growthFunnel(days=30){
  const sql=getDatabase();if(!sql)return null;
  const bounded=Math.max(1,Math.min(365,days));
  const events=await sql<Array<{event_name:string;events:number;sessions:number;visitors:number}>>`
    select event_name,count(*)::int as events,
      count(distinct session_id)::int as sessions,count(distinct visitor_id)::int as visitors
    from growth_events
    where created_at>=now()-make_interval(days => ${bounded})
      and event_name in ('planner_loaded','hero_search','route_shared','live_catalog_loaded','agent_question')
    group by event_name
  `;
  const referrals=await sql<{clicks:number;sessions:number;visitors:number}[]>`
    select count(*)::int as clicks,count(distinct session_id)::int as sessions,count(distinct visitor_id)::int as visitors
    from referral_clicks where created_at>=now()-make_interval(days => ${bounded})
  `;
  const conversions=await sql<{conversions:number;visitors:number}[]>`
    select count(*)::int as conversions,count(distinct r.visitor_id)::int as visitors
    from conversions c join referral_clicks r on r.click_id=c.click_id
    where c.received_at>=now()-make_interval(days => ${bounded})
      and c.status not in ('CANCELLED','REVERSED')
  `;
  return{days:bounded,events,referrals:referrals[0]||{clicks:0,sessions:0,visitors:0},conversions:conversions[0]||{conversions:0,visitors:0}};
}

export async function acquisitionBreakdown(days=30){
  const sql=getDatabase();if(!sql)return[];
  const bounded=Math.max(1,Math.min(365,days));
  return sql<Array<{source:string;campaign:string|null;clicks:number;converted:number}>>`
    select coalesce(r.source,'direct') as source,r.campaign,
      count(distinct r.click_id)::int as clicks,
      count(distinct case when c.status not in ('CANCELLED','REVERSED') then c.provider_conversion_id end)::int as converted
    from referral_clicks r left join conversions c on c.click_id=r.click_id
    where r.created_at>=now()-make_interval(days => ${bounded})
    group by coalesce(r.source,'direct'),r.campaign
    order by converted desc,clicks desc
    limit 50
  `;
}

export type HeroExperimentReadout={
  variant:string;
  exposed_visitors:number;
  referral_visitors:number;
  search_visitors:number;
  zero_result_visitors:number;
  conversion_visitors:number;
  commission_eur:number;
};

export async function heroExperimentReadout(days=30):Promise<HeroExperimentReadout[]>{
  const sql=getDatabase();if(!sql)return[];
  const bounded=Math.max(1,Math.min(365,days));
  return sql<HeroExperimentReadout[]>`
    with exposure as (
      select distinct visitor_id,properties->>'hero_variant' as variant
      from growth_events
      where event_name='planner_loaded'
        and visitor_id is not null
        and properties->>'hero_variant' is not null
        and created_at>=now()-make_interval(days => ${bounded})
    ), referral as (
      select distinct visitor_id from referral_clicks
      where visitor_id is not null and created_at>=now()-make_interval(days => ${bounded})
    ), searches as (
      select visitor_id,properties->>'hero_variant' as variant,
        bool_or(
          properties ? 'matches'
          and properties->>'matches' ~ '^[0-9]+$'
          and (properties->>'matches')::int=0
        ) as had_zero_result
      from growth_events
      where event_name='hero_search'
        and visitor_id is not null
        and properties->>'hero_variant' is not null
        and created_at>=now()-make_interval(days => ${bounded})
      group by visitor_id,properties->>'hero_variant'
    ), commercial as (
      select r.visitor_id,
        count(distinct c.provider_conversion_id)::int as conversions,
        coalesce(sum(
          case when c.currency='EUR' and c.status not in ('CANCELLED','REVERSED')
            then c.commission else 0 end
        ),0)::float as commission_eur
      from conversions c
      join referral_clicks r on r.click_id=c.click_id
      where r.visitor_id is not null
        and c.received_at>=now()-make_interval(days => ${bounded})
      group by r.visitor_id
    )
    select e.variant,
      count(*)::int as exposed_visitors,
      count(r.visitor_id)::int as referral_visitors,
      count(s.visitor_id)::int as search_visitors,
      count(s.visitor_id) filter (where s.had_zero_result)::int as zero_result_visitors,
      count(c.visitor_id)::int as conversion_visitors,
      coalesce(sum(c.commission_eur),0)::float as commission_eur
    from exposure e
    left join referral r on r.visitor_id=e.visitor_id
    left join searches s on s.visitor_id=e.visitor_id and s.variant=e.variant
    left join commercial c on c.visitor_id=e.visitor_id
    group by e.variant
    order by e.variant
  `;
}


export type SearchFriction={
  days:number;
  searchEvents:number;
  searchSessions:number;
  zeroResultEvents:number;
  zeroResultSessions:number;
  trackableSessions:number;
  referralSessions:number;
  abandonedSessions:number;
  zeroResultRate:number|null;
  referralRate:number|null;
  abandonmentRate:number|null;
};

export async function searchFriction(days=30):Promise<SearchFriction|null>{
  const sql=getDatabase();if(!sql)return null;
  const bounded=Math.max(1,Math.min(365,days));
  const rows=await sql<Array<{
    search_events:number;search_sessions:number;zero_result_events:number;zero_result_sessions:number;
    trackable_sessions:number;referral_sessions:number;
  }>>`
    with searches as (
      select id,session_id,
        case
          when properties ? 'matches' and properties->>'matches' ~ '^[0-9]+$'
            then (properties->>'matches')::int
          else null
        end as matches
      from growth_events
      where event_name='hero_search'
        and created_at>=now()-make_interval(days => ${bounded})
    ),
    session_rollup as (
      select session_id
      from searches
      where session_id is not null
      group by session_id
    ),
    referral_sessions as (
      select distinct r.session_id
      from referral_clicks r
      join session_rollup s on s.session_id=r.session_id
      where r.session_id is not null
        and r.created_at>=now()-make_interval(days => ${bounded})
    )
    select
      count(*)::int as search_events,
      count(distinct coalesce(session_id,id::text))::int as search_sessions,
      count(*) filter (where matches=0)::int as zero_result_events,
      count(distinct coalesce(session_id,id::text)) filter (where matches=0)::int as zero_result_sessions,
      (select count(*)::int from session_rollup) as trackable_sessions,
      (select count(*)::int from referral_sessions) as referral_sessions
    from searches
  `;
  const row=rows[0]||{
    search_events:0,search_sessions:0,zero_result_events:0,zero_result_sessions:0,
    trackable_sessions:0,referral_sessions:0,
  };
  const searchEvents=Number(row.search_events||0);
  const searchSessions=Number(row.search_sessions||0);
  const zeroResultEvents=Number(row.zero_result_events||0);
  const zeroResultSessions=Number(row.zero_result_sessions||0);
  const trackableSessions=Number(row.trackable_sessions||0);
  const referralSessions=Number(row.referral_sessions||0);
  const abandonedSessions=Math.max(0,trackableSessions-referralSessions);
  return{
    days:bounded,searchEvents,searchSessions,zeroResultEvents,zeroResultSessions,
    trackableSessions,referralSessions,abandonedSessions,
    zeroResultRate:searchSessions?zeroResultSessions/searchSessions:null,
    referralRate:trackableSessions?referralSessions/trackableSessions:null,
    abandonmentRate:trackableSessions?abandonedSessions/trackableSessions:null,
  };
}
