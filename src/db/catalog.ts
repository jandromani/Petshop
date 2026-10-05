import { getDatabase } from "@/src/db/client";
import { normalizeLiveCatalogRow,type LiveCatalogOffer,type LiveCatalogRow } from "@/src/core/live-offers";
import { getSellableDirectOfferForReferral,listSellableDirectOffers } from "@/src/db/direct-supply";
import { computeSilverFit } from "@/src/core/silver-score";

type DbOfferRow={
  offer_id:string;hotel_id:string;slug:string;name:string;city:string;country:string;region:string|null;
  lat:number|null;lng:number|null;provider:string;check_in:string;check_out:string;nights:number;occupancy:number;
  board:string|null;room_type:string|null;cancellation:string|null;taxes_included:boolean|null;silver_score:number|null;
  photo_urls:unknown;facilities:unknown;description:string|null;display_price:number;currency:string;verified_at:string;expires_at:string|null;
  confidence:number;deep_link?:string|null;
};

function stringArray(value:unknown){
  return Array.isArray(value)?value.filter((x):x is string=>typeof x==="string"):[];
}

function normalizeDbRow(row:DbOfferRow):LiveCatalogOffer{
  const photos=stringArray(row.photo_urls);
  const facilities=stringArray(row.facilities);
  const silver=computeSilverFit({
    nights:Number(row.nights),board:row.board,roomType:row.room_type,cancellation:row.cancellation,
    taxesIncluded:row.taxes_included,facilities,photoUrls:photos,description:row.description,confidence:Number(row.confidence),
  });
  const base:LiveCatalogRow={
    offerId:row.offer_id,offerKind:"snapshot",hotelId:row.hotel_id,slug:row.slug,name:row.name,city:row.city,country:row.country,
    region:row.region,lat:row.lat,lng:row.lng,provider:row.provider,checkIn:String(row.check_in).slice(0,10),
    checkOut:String(row.check_out).slice(0,10),nights:Number(row.nights),occupancy:Number(row.occupancy),board:row.board,
    roomType:row.room_type,cancellation:row.cancellation,taxesIncluded:row.taxes_included,
    silverScore:silver.score,silverBreakdown:silver.breakdown,
    photoUrls:photos,facilities,description:row.description,
    displayPrice:Number(row.display_price),currency:row.currency,
    verifiedAt:new Date(row.verified_at).toISOString(),expiresAt:row.expires_at?new Date(row.expires_at).toISOString():null,
    confidence:Number(row.confidence),
  };
  return normalizeLiveCatalogRow(base);
}

export type LiveCatalogQuery={
  limit?:number;q?:string;slug?:string;minMonthly?:number;maxMonthly?:number;checkIn?:string;flexibleDays?:number;nights?:number;occupancy?:number;region?:string;board?:string;cancellation?:string;provider?:string;
};

export async function listSellableOffers(input:LiveCatalogQuery={}):Promise<LiveCatalogOffer[]>{
  const sql=getDatabase();
  if(!sql) return[];
  const limit=Math.max(1,Math.min(50,input.limit??12));
  const q=input.q?.trim()?"%"+input.q.trim()+"%":null;
  const slug=input.slug?.trim()||null;
  const minMonthly=input.minMonthly&&input.minMonthly>0?input.minMonthly:null;
  const maxMonthly=input.maxMonthly&&input.maxMonthly>0?input.maxMonthly:null;
  const checkIn=input.checkIn||null;
  const flexibleDays=Math.max(0,Math.min(30,input.flexibleDays??0));
  const nights=input.nights&&input.nights>0?input.nights:null;
  const occupancy=input.occupancy&&input.occupancy>0?input.occupancy:null;
  const region=input.region&&input.region!=="All"?input.region:null;
  const board=input.board?.trim()?"%"+input.board.trim()+"%":null;
  const cancellation=input.cancellation?.trim()?"%"+input.cancellation.trim()+"%":null;
  const provider=input.provider?.trim()||null;

  const rows=await sql<DbOfferRow[]>`
    with eligible as (
      select
        o.id::text as offer_id,h.id::text as hotel_id,h.slug,h.name,h.city,h.country,h.region,h.lat,h.lng,
        o.provider,o.check_in::text,o.check_out::text,(o.check_out-o.check_in)::int as nights,o.occupancy,
        o.board,o.room_type,o.cancellation,o.taxes_included,h.silver_score,
        coalesce(hc.photo_urls,'[]'::jsonb) as photo_urls,
        coalesce(hc.facilities,'[]'::jsonb) as facilities,
        hc.description,
        coalesce(o.display_price,o.total_price)::float as display_price,o.currency,
        o.verified_at::text,o.expires_at::text,a.confidence::float,o.deep_link,
        row_number() over (
          partition by o.hotel_id
          order by coalesce(o.display_price,o.total_price) asc,o.verified_at desc
        ) as price_rank
      from offer_snapshots o
      join canonical_hotels h on h.id=o.hotel_id
      left join hotel_content hc on hc.hotel_id=h.id
      and hc.display_allowed=true
      and (hc.expires_at is null or hc.expires_at>now())
        and hc.display_allowed=true
        and (hc.expires_at is null or hc.expires_at>now())
      join lateral (
        select state,confidence,evaluated_at from sellability_audits sa
        where sa.offer_snapshot_id=o.id order by sa.evaluated_at desc limit 1
      ) a on true
      where a.state='SELLABLE'
        and o.source_mode='live'
        and o.fulfillment_type='REDIRECT'
        and o.deep_link is not null
        and coalesce(o.display_price,o.total_price)>0
        and coalesce(
          o.expires_at,
          o.verified_at + case
            when o.provider='booking' then interval '15 minutes'
            when o.provider='ratehawk' then interval '5 minutes'
            when o.provider='hbx' then interval '5 minutes'
            else interval '10 minutes'
          end
        ) > now()
        and (${q}::text is null or h.name ilike ${q} or h.city ilike ${q} or h.country ilike ${q})
        and (${slug}::text is null or h.slug=${slug})
        and (${region}::text is null or h.region=${region})
        and (${checkIn}::date is null or abs(o.check_in-${checkIn}::date)<=${flexibleDays})
        and (${nights}::int is null or (o.check_out-o.check_in)::int=${nights})
        and (${occupancy}::int is null or o.occupancy=${occupancy})
        and (
          ${maxMonthly}::float is null or
          (coalesce(o.display_price,o.total_price)::float/greatest(1,(o.check_out-o.check_in)::int)*30)<=${maxMonthly}
        )
    )
    select offer_id,hotel_id,slug,name,city,country,region,lat,lng,provider,check_in,check_out,nights,occupancy,
      board,room_type,cancellation,taxes_included,silver_score,photo_urls,facilities,description,
      display_price,currency,verified_at,expires_at,confidence,deep_link
    from eligible where price_rank=1
    order by display_price asc,confidence desc
    limit ${limit}
  `;
  const providerOffers=rows.map(normalizeDbRow);
  const directOffers=await listSellableDirectOffers(input);
  return [...providerOffers,...directOffers]
    .sort((a,b)=>a.monthlyEquivalent-b.monthlyEquivalent||b.confidence-a.confidence)
    .slice(0,limit);
}

export async function getSellableOfferForReferral(offerId:string){
  const sql=getDatabase();
  if(!sql) return null;
  const rows=await sql<DbOfferRow[]>`
    select o.id::text as offer_id,h.id::text as hotel_id,h.slug,h.name,h.city,h.country,h.region,h.lat,h.lng,
      o.provider,o.check_in::text,o.check_out::text,(o.check_out-o.check_in)::int as nights,o.occupancy,
      o.board,o.room_type,o.cancellation,o.taxes_included,h.silver_score,
      coalesce(hc.photo_urls,'[]'::jsonb) as photo_urls,
      coalesce(hc.facilities,'[]'::jsonb) as facilities,
      hc.description,
      coalesce(o.display_price,o.total_price)::float as display_price,o.currency,
      o.verified_at::text,o.expires_at::text,a.confidence::float,o.deep_link
    from offer_snapshots o
    join canonical_hotels h on h.id=o.hotel_id
    left join hotel_content hc on hc.hotel_id=h.id
    join lateral (
      select state,confidence,evaluated_at from sellability_audits sa
      where sa.offer_snapshot_id=o.id order by sa.evaluated_at desc limit 1
    ) a on true
    where o.id=${offerId}::uuid
      and a.state='SELLABLE'
      and o.source_mode='live'
      and o.fulfillment_type='REDIRECT'
      and o.deep_link is not null
      and coalesce(
        o.expires_at,
        o.verified_at + case
          when o.provider='booking' then interval '15 minutes'
          when o.provider='ratehawk' then interval '5 minutes'
          when o.provider='hbx' then interval '5 minutes'
          else interval '10 minutes'
        end
      ) > now()
    limit 1
  `;
  const row=rows[0];
  if(row?.deep_link)return{...normalizeDbRow(row),deepLink:row.deep_link,approvedHost:undefined,trackingParam:undefined};
  return getSellableDirectOfferForReferral(offerId);
}
