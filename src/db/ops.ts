import { getDatabase } from "@/src/db/client";
import { merchantCheckoutStatus } from "@/src/payments/stripe-rest";

export type OpsSnapshot = {
  available:boolean;
  liveOffers:number;
  providerLiveOffers:number;
  directLiveOffers:number;
  openIncidents:number;
  referralClicks30d:number;
  conversions30d:number;
  commission30d:number;
  acquisitionRuns:Array<{waveKey:string;provider:string|null;status:string;startedAt:string;completedAt:string|null;sellable:number;errors:number}>;
  agentRuns:Array<{agentKey:string;status:string;startedAt:string;completedAt:string|null;costCents:number|null}>;
  error?:string;
};

export async function getOpsSnapshot():Promise<OpsSnapshot>{
  const sql=getDatabase();
  if(!sql) return{available:false,liveOffers:0,providerLiveOffers:0,directLiveOffers:0,openIncidents:0,referralClicks30d:0,conversions30d:0,commission30d:0,acquisitionRuns:[],agentRuns:[]};
  try{
    const merchant=merchantCheckoutStatus();const merchantActive=merchant.enabled&&merchant.stripeConfigured&&merchant.webhookConfigured;
    const [counts]=await sql<{provider_live_offers:number;direct_live_offers:number;open_incidents:number;referral_clicks:number;conversions:number;commission:number}[]>`
      select
        (select count(*)::int from offer_snapshots o join lateral (select state from sellability_audits sa where sa.offer_snapshot_id=o.id order by sa.evaluated_at desc limit 1) a on true where a.state='SELLABLE' and o.source_mode='live' and o.fulfillment_type='REDIRECT' and o.deep_link is not null
          and coalesce(
            o.expires_at,
            o.verified_at + case
              when o.provider='booking' then interval '15 minutes'
              when o.provider='ratehawk' then interval '5 minutes'
              when o.provider='hbx' then interval '5 minutes'
              else interval '10 minutes'
            end
          )>now()) as provider_live_offers,
        (select count(*)::int from direct_rate_offers r
          where r.publication_state='LIVE'
            and r.contract_verified=true
            and r.valid_from<=current_date
            and r.valid_to>=current_date
            and (
              (r.channel_model='REFERRAL' and r.booking_url is not null and r.approved_booking_host is not null)
              or
              (${merchantActive}::boolean=true and r.channel_model in ('MERCHANT','EXCLUSIVE_MERCHANT') and r.merchant_enabled=true and r.merchant_terms_verified=true and (r.inventory_units-r.reserved_units-r.sold_units)>0)
            )) as direct_live_offers,
        (select count(*)::int from ops_incidents where status='OPEN') as open_incidents,
        (select count(*)::int from referral_clicks where created_at>=now()-interval '30 days') as referral_clicks,
        (select count(*)::int from conversions where received_at>=now()-interval '30 days') as conversions,
        coalesce((select sum(commission) from conversions where received_at>=now()-interval '30 days' and currency='EUR' and status not in ('CANCELLED','REVERSED')),0)::float as commission
    `;
    const acquisitionRuns=await sql<{wave_key:string;provider:string|null;status:string;started_at:string;completed_at:string|null;sellable_count:number;error_count:number}[]>`
      select wave_key,provider,status,started_at::text,completed_at::text,sellable_count,error_count
      from acquisition_runs order by started_at desc limit 8
    `;
    const agentRuns=await sql<{agent_key:string;status:string;started_at:string;completed_at:string|null;estimated_cost_cents:number|null}[]>`
      select agent_key,status,started_at::text,completed_at::text,estimated_cost_cents
      from agent_runs order by started_at desc limit 8
    `;
    return{
      available:true,
      providerLiveOffers:Number(counts?.provider_live_offers||0),
      directLiveOffers:Number(counts?.direct_live_offers||0),
      liveOffers:Number(counts?.provider_live_offers||0)+Number(counts?.direct_live_offers||0),
      openIncidents:Number(counts?.open_incidents||0),
      referralClicks30d:Number(counts?.referral_clicks||0),
      conversions30d:Number(counts?.conversions||0),
      commission30d:Number(counts?.commission||0),
      acquisitionRuns:acquisitionRuns.map(r=>({waveKey:r.wave_key,provider:r.provider,status:r.status,startedAt:r.started_at,completedAt:r.completed_at,sellable:Number(r.sellable_count||0),errors:Number(r.error_count||0)})),
      agentRuns:agentRuns.map(r=>({agentKey:r.agent_key,status:r.status,startedAt:r.started_at,completedAt:r.completed_at,costCents:r.estimated_cost_cents===null?null:Number(r.estimated_cost_cents)})),
    };
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"ops_snapshot_failed",error:String(error)}));
    return{available:false,liveOffers:0,providerLiveOffers:0,directLiveOffers:0,openIncidents:0,referralClicks30d:0,conversions30d:0,commission30d:0,acquisitionRuns:[],agentRuns:[],error:"query-failed"};
  }
}
