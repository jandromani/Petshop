import { getDatabase } from "@/src/db/client";

export async function growthFunnel(days=30){
  const sql=getDatabase();if(!sql)return null;
  const bounded=Math.max(1,Math.min(365,days));
  const events=await sql<Array<{event_name:string;events:number;sessions:number;visitors:number}>>`
    select event_name,count(*)::int as events,
      count(distinct session_id)::int as sessions,count(distinct visitor_id)::int as visitors
    from growth_events
    where created_at>=now()-make_interval(days => ${bounded})
      and event_name in ('page_view','planner_loaded','hero_search','ai_search_submit','ai_filters_applied','ai_search_navigation','results_loaded','hotel_impression','hotel_card_click','map_marker_click','hotel_official_site_click','hotel_saved','hotel_unsaved','source_rate_start','source_rate_success','source_rate_error','search_this_area','route_shared','live_catalog_loaded','agent_question')
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


export type ProductFunnel={
  days:number;pageSessions:number;searchSessions:number;aiSearchSessions:number;manualOnlySearchSessions:number;
  resultSessions:number;impressionSessions:number;hotelEngagementSessions:number;cardClickSessions:number;mapClickSessions:number;officialSiteSessions:number;
  verifiedCardClickSessions:number;pendingCardClickSessions:number;savedSessions:number;sourcingStartSessions:number;sourcingSuccessSessions:number;
  referralSessions:number;conversionSessions:number;aiEngagementSessions:number;manualEngagementSessions:number;
  searchToResults:number|null;resultsToEngagement:number|null;cardCtr:number|null;mapCtr:number|null;saveRate:number|null;
  sourcingStartRate:number|null;sourcingCompletionRate:number|null;verifiedCardClickShare:number|null;aiToEngagement:number|null;manualToEngagement:number|null;
  engagementToSourcing:number|null;engagementToReferral:number|null;referralToConversion:number|null;
};

const ratio=(num:number,den:number)=>den>0?num/den:null;

export async function productFunnel(days=30):Promise<ProductFunnel|null>{
  const sql=getDatabase();if(!sql)return null;
  const bounded=Math.max(1,Math.min(365,days));
  const rows=await sql<Array<Record<string,number>>>`
    with session_flags as (
      select session_id,
        bool_or(event_name='page_view') as page_view,
        bool_or(event_name='hero_search') as manual_search,
        bool_or(event_name='ai_search_submit') as ai_search,
        bool_or(event_name='results_loaded') as results,
        bool_or(event_name='hotel_impression') as impression,
        bool_or(event_name in ('hotel_card_click','map_marker_click','hotel_official_site_click')) as engagement,
        bool_or(event_name='hotel_card_click') as card_click,
        bool_or(event_name='map_marker_click') as map_click,
        bool_or(event_name='hotel_official_site_click') as official_site,
        bool_or(event_name='hotel_card_click' and properties->>'state'='verified') as verified_card_click,
        bool_or(event_name='hotel_card_click' and properties->>'state'='pending') as pending_card_click,
        bool_or(event_name='hotel_saved') as saved,
        bool_or(event_name='source_rate_start') as sourcing_start,
        bool_or(event_name='source_rate_success') as sourcing_success
      from growth_events
      where created_at>=now()-make_interval(days => ${bounded})
        and session_id is not null
        and event_name in ('page_view','hero_search','ai_search_submit','ai_filters_applied','results_loaded','hotel_impression','hotel_card_click','map_marker_click','hotel_official_site_click','hotel_saved','source_rate_start','source_rate_success')
      group by session_id
    ),
    rollup as (
      select
        count(*) filter (where page_view)::int as page_sessions,
        count(*) filter (where manual_search or ai_search)::int as search_sessions,
        count(*) filter (where ai_search)::int as ai_search_sessions,
        count(*) filter (where manual_search and not ai_search)::int as manual_only_search_sessions,
        count(*) filter (where results)::int as result_sessions,
        count(*) filter (where impression)::int as impression_sessions,
        count(*) filter (where engagement)::int as engagement_sessions,
        count(*) filter (where card_click)::int as card_click_sessions,
        count(*) filter (where map_click)::int as map_click_sessions,
        count(*) filter (where official_site)::int as official_site_sessions,
        count(*) filter (where verified_card_click)::int as verified_card_click_sessions,
        count(*) filter (where pending_card_click)::int as pending_card_click_sessions,
        count(*) filter (where saved)::int as saved_sessions,
        count(*) filter (where sourcing_start)::int as sourcing_start_sessions,
        count(*) filter (where sourcing_success)::int as sourcing_success_sessions,
        count(*) filter (where ai_search and engagement)::int as ai_engagement_sessions,
        count(*) filter (where manual_search and not ai_search and engagement)::int as manual_engagement_sessions
      from session_flags
    ),
    referrals as (
      select count(distinct session_id)::int as referral_sessions from referral_clicks
      where created_at>=now()-make_interval(days => ${bounded}) and session_id is not null
    ),
    commercial as (
      select count(distinct r.session_id)::int as conversion_sessions
      from conversions c join referral_clicks r on r.click_id=c.click_id
      where c.received_at>=now()-make_interval(days => ${bounded}) and c.status not in ('CANCELLED','REVERSED') and r.session_id is not null
    )
    select r.*,f.referral_sessions,c.conversion_sessions from rollup r cross join referrals f cross join commercial c
  `;
  const row=rows[0]||{};
  const n=(key:string)=>Number(row[key]||0);
  const pageSessions=n("page_sessions"),searchSessions=n("search_sessions"),aiSearchSessions=n("ai_search_sessions"),manualOnlySearchSessions=n("manual_only_search_sessions");
  const resultSessions=n("result_sessions"),impressionSessions=n("impression_sessions"),hotelEngagementSessions=n("engagement_sessions");
  const cardClickSessions=n("card_click_sessions"),mapClickSessions=n("map_click_sessions"),officialSiteSessions=n("official_site_sessions");
  const verifiedCardClickSessions=n("verified_card_click_sessions"),pendingCardClickSessions=n("pending_card_click_sessions"),savedSessions=n("saved_sessions");
  const sourcingStartSessions=n("sourcing_start_sessions"),sourcingSuccessSessions=n("sourcing_success_sessions"),aiEngagementSessions=n("ai_engagement_sessions"),manualEngagementSessions=n("manual_engagement_sessions");
  const referralSessions=n("referral_sessions"),conversionSessions=n("conversion_sessions");
  return{days:bounded,pageSessions,searchSessions,aiSearchSessions,manualOnlySearchSessions,resultSessions,impressionSessions,hotelEngagementSessions,cardClickSessions,mapClickSessions,officialSiteSessions,verifiedCardClickSessions,pendingCardClickSessions,savedSessions,sourcingStartSessions,sourcingSuccessSessions,referralSessions,conversionSessions,aiEngagementSessions,manualEngagementSessions,
    searchToResults:ratio(resultSessions,searchSessions),resultsToEngagement:ratio(hotelEngagementSessions,resultSessions),cardCtr:ratio(cardClickSessions,impressionSessions),mapCtr:ratio(mapClickSessions,impressionSessions),saveRate:ratio(savedSessions,impressionSessions),
    sourcingStartRate:ratio(sourcingStartSessions,hotelEngagementSessions),sourcingCompletionRate:ratio(sourcingSuccessSessions,sourcingStartSessions),verifiedCardClickShare:ratio(verifiedCardClickSessions,cardClickSessions),
    aiToEngagement:ratio(aiEngagementSessions,aiSearchSessions),manualToEngagement:ratio(manualEngagementSessions,manualOnlySearchSessions),engagementToSourcing:ratio(sourcingSuccessSessions,hotelEngagementSessions),engagementToReferral:ratio(referralSessions,hotelEngagementSessions),referralToConversion:ratio(conversionSessions,referralSessions)};
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


export type WebVitalMetric={metric:"LCP"|"INP"|"CLS";p75:number;sample:number;target:number;good:boolean};
export async function webVitalsSnapshot(days=30):Promise<WebVitalMetric[]>{
  const sql=getDatabase();if(!sql)return[];
  const bounded=Math.max(1,Math.min(365,days));
  const rows=await sql<Array<{metric:"LCP"|"INP"|"CLS";p75:number;sample:number}>>`
    select properties->>'metric' as metric,
      percentile_disc(0.75) within group (order by (properties->>'value')::float)::float as p75,
      count(*)::int as sample
    from growth_events
    where event_name='web_vital'
      and created_at>=now()-make_interval(days => ${bounded})
      and properties->>'metric' in ('LCP','INP','CLS')
      and properties->>'value' ~ '^[0-9]+(\\.[0-9]+)?$'
    group by properties->>'metric'
  `;
  const targets={LCP:2500,INP:200,CLS:0.1} as const;
  return rows.map(row=>({metric:row.metric,p75:Number(row.p75),sample:Number(row.sample),target:targets[row.metric],good:Number(row.p75)<=targets[row.metric]}));
}


export async function paidAttributionBreakdown(days=30){
  const sql=getDatabase();if(!sql)return[];
  const bounded=Math.max(1,Math.min(365,days));
  return sql<Array<{network:string;click_id:string;referrals:number;conversions:number;booking_value:number;commission:number}>>`
    select
      case when r.gclid is not null then 'google-gclid'
           when r.gbraid is not null then 'google-gbraid'
           when r.wbraid is not null then 'google-wbraid'
           when r.msclkid is not null then 'microsoft-msclkid'
           else 'unattributed' end as network,
      coalesce(r.gclid,r.gbraid,r.wbraid,r.msclkid,'') as click_id,
      count(distinct r.click_id)::int as referrals,
      count(distinct c.provider_conversion_id) filter (where c.status not in ('CANCELLED','REVERSED'))::int as conversions,
      coalesce(sum(case when c.status not in ('CANCELLED','REVERSED') then c.booking_value else 0 end),0)::float as booking_value,
      coalesce(sum(case when c.status not in ('CANCELLED','REVERSED') then c.commission else 0 end),0)::float as commission
    from referral_clicks r
    left join conversions c on c.click_id=r.click_id
    where r.created_at>=now()-make_interval(days => ${bounded})
    group by network,click_id
    order by commission desc,conversions desc,referrals desc
    limit 200
  `;
}
