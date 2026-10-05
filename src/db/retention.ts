import { getDatabase } from "@/src/db/client";

function boundedDays(raw:string|undefined,fallback:number,max=3650){
  const n=Number(raw);
  return Number.isFinite(n)?Math.max(7,Math.min(max,Math.round(n))):fallback;
}

export async function runDataRetention(){
  const sql=getDatabase();
  if(!sql)return{configured:false};
  const days=boundedDays(process.env.DATA_RETENTION_DAYS,90);
  const leadDays=boundedDays(process.env.HOTEL_LEAD_RETENTION_DAYS,365);
  const consumerDays=boundedDays(process.env.CONSUMER_MEMORY_RETENTION_DAYS,365);
  const sourcingDays=boundedDays(process.env.SOURCING_CONTACT_RETENTION_DAYS,180);

  const expiredShares=await sql<{count:number}[]>`with deleted as (delete from shared_plans where expires_at<=now() returning 1) select count(*)::int from deleted`;
  const rateBuckets=await sql<{count:number}[]>`with deleted as (delete from rate_limit_buckets where updated_at<now()-interval '2 days' returning 1) select count(*)::int from deleted`;
  const growth=await sql<{count:number}[]>`with deleted as (delete from growth_events where created_at<now()-make_interval(days => ${days}) returning 1) select count(*)::int from deleted`;
  const referrals=await sql<{count:number}[]>`with scrubbed as (update referral_clicks set visitor_id=null,session_id=null,source=null,campaign=null,page_path=null where created_at<now()-make_interval(days => ${days}) and (visitor_id is not null or session_id is not null or source is not null or campaign is not null or page_path is not null) returning 1) select count(*)::int from scrubbed`;
  const conversions=await sql<{count:number}[]>`with scrubbed as (update conversions set raw_payload='{}'::jsonb,updated_at=now() where received_at<now()-make_interval(days => ${days}) and raw_payload<>'{}'::jsonb returning 1) select count(*)::int from scrubbed`;
  const agents=await sql<{count:number}[]>`with deleted as (delete from agent_runs where completed_at is not null and completed_at<now()-make_interval(days => ${days}) returning 1) select count(*)::int from deleted`;
  const abandonedLeads=await sql<{count:number}[]>`with scrubbed as (update hotel_leads set contact_name=null,contact_email=null,notes='{}'::jsonb,updated_at=now() where status<>'CONTRACTED' and updated_at<now()-make_interval(days => ${leadDays}) and (contact_name is not null or contact_email is not null or notes<>'{}'::jsonb) returning 1) select count(*)::int from scrubbed`;
  const consumerProfiles=await sql<{count:number}[]>`with deleted as (delete from consumer_profiles where last_seen_at<now()-make_interval(days => ${consumerDays}) returning 1) select count(*)::int from deleted`;
  const sourcingContacts=await sql<{count:number}[]>`with scrubbed as (update sourcing_requests set requester_email=null,contact_consent=false,updated_at=now() where requester_email is not null and updated_at<now()-make_interval(days => ${sourcingDays}) returning 1) select count(*)::int from scrubbed`;

  return{configured:true,days,leadDays,consumerDays,sourcingDays,expiredShares:Number(expiredShares[0]?.count||0),rateBuckets:Number(rateBuckets[0]?.count||0),deletedGrowthEvents:Number(growth[0]?.count||0),anonymizedReferralClicks:Number(referrals[0]?.count||0),scrubbedConversionPayloads:Number(conversions[0]?.count||0),deletedAgentRuns:Number(agents[0]?.count||0),scrubbedAbandonedLeads:Number(abandonedLeads[0]?.count||0),deletedConsumerProfiles:Number(consumerProfiles[0]?.count||0),scrubbedSourcingContacts:Number(sourcingContacts[0]?.count||0)};
}
