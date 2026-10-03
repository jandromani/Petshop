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

export async function heroExperimentReadout(days=30){
  const sql=getDatabase();if(!sql)return[];
  const bounded=Math.max(1,Math.min(365,days));
  return sql<Array<{variant:string;exposed_visitors:number;referral_visitors:number}>>`
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
    )
    select e.variant,count(*)::int as exposed_visitors,
      count(r.visitor_id)::int as referral_visitors
    from exposure e left join referral r on r.visitor_id=e.visitor_id
    group by e.variant order by e.variant
  `;
}
