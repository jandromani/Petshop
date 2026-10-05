import { getDatabase } from "@/src/db/client";
import { resolveCanonicalHotel } from "@/src/services/identity";

export type DirectoryRegion="Europe"|"Asia"|"Africa"|"Americas";
export type DirectoryHotel={
  id:string;canonicalId:string;name:string;city:string;country:string;region:DirectoryRegion;
  lat:number|null;lng:number|null;source:string;sourceId:string;referenceUrl:string|null;website:string|null;
  address:string|null;confidence:number|null;description:string|null;photoUrls:string[];facilities:string[];
  contentProvider?:string|null;contentLicenseRef?:string|null;contentSourceUrl?:string|null;contentFetchedAt?:string|null;
};
type DirectoryRow=Omit<DirectoryHotel,"address"|"confidence"|"description"|"photoUrls"|"facilities">&{
  total:number;raw:unknown;description:string|null;photoUrls:unknown;facilities:unknown;
};

function strings(value:unknown){return Array.isArray(value)?value.filter((x):x is string=>typeof x==="string"):[];}
function rawObject(value:unknown):Record<string,any>{return value&&typeof value==="object"?value as Record<string,any>:{};}
function enrich(row:DirectoryRow):DirectoryHotel{
  const raw=rawObject(row.raw);
  const addresses=Array.isArray(raw.addresses)?raw.addresses:[];
  const first=addresses[0]&&typeof addresses[0]==="object"?addresses[0] as Record<string,any>:null;
  const address=typeof raw.address==="string"?raw.address:typeof first?.freeform==="string"?first.freeform:null;
  const confidence=Number(raw.confidence);
  const {total:_total,raw:_raw,...base}=row;
  return{...base,address,confidence:Number.isFinite(confidence)?confidence:null,photoUrls:strings(row.photoUrls),facilities:strings(row.facilities)};
}

export function fallbackDirectoryReference(hotel:Pick<DirectoryHotel,"name"|"city"|"country">){
  return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent([hotel.name,hotel.city,hotel.country].join(" "));
}

export async function listDirectoryHotels(input:{
  q?:string;region?:"All"|DirectoryRegion;limit?:number;offset?:number;maxRows?:number;
  bbox?:{west:number;south:number;east:number;north:number}|null;
}){
  const sql=getDatabase();if(!sql)return null;
  const q=input.q?.trim()?"%"+input.q.trim()+"%":null;
  const region=input.region&&input.region!=="All"?input.region:null;
  const limit=Math.max(1,Math.min(input.maxRows??5000,input.limit??24));
  const offset=Math.max(0,Math.min(10000,input.offset??0));
  const west=input.bbox?.west??null,south=input.bbox?.south??null,east=input.bbox?.east??null,north=input.bbox?.north??null;
  const rows=await sql<DirectoryRow[]>`
    select h.slug as id,h.id::text as "canonicalId",h.name,h.city,h.country,h.region,h.lat,h.lng,
      ds.source,ds.source_id as "sourceId",ds.reference_url as "referenceUrl",ds.website,ds.raw,
      hc.description,coalesce(hc.photo_urls,'[]'::jsonb) as "photoUrls",coalesce(hc.facilities,'[]'::jsonb) as facilities,
      hc.provider as "contentProvider",hc.license_ref as "contentLicenseRef",hc.source_url as "contentSourceUrl",hc.fetched_at::text as "contentFetchedAt",
      count(*) over()::int as total
    from canonical_hotels h
    join lateral (
      select source,source_id,reference_url,website,raw
      from hotel_directory_sources
      where hotel_id=h.id
      order by last_seen_at desc
      limit 1
    ) ds on true
    left join hotel_content hc on hc.hotel_id=h.id
      and hc.display_allowed=true
      and (hc.expires_at is null or hc.expires_at>now())
    where h.region in ('Europe','Asia','Africa','Americas')
      and (${region}::text is null or h.region=${region})
      and (${q}::text is null or h.name ilike ${q} or h.city ilike ${q} or h.country ilike ${q})
      and (${west}::float8 is null or (h.lng between ${west} and ${east} and h.lat between ${south} and ${north}))
    order by h.name asc,h.city asc
    limit ${limit} offset ${offset}
  `;
  return{total:rows[0]?.total??0,hotels:rows.map(enrich)};
}

export async function getDirectoryHotel(id:string):Promise<DirectoryHotel|null>{
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<DirectoryRow[]>`
    select h.slug as id,h.id::text as "canonicalId",h.name,h.city,h.country,h.region,h.lat,h.lng,
      ds.source,ds.source_id as "sourceId",ds.reference_url as "referenceUrl",ds.website,ds.raw,
      hc.description,coalesce(hc.photo_urls,'[]'::jsonb) as "photoUrls",coalesce(hc.facilities,'[]'::jsonb) as facilities,
      1::int as total
    from canonical_hotels h
    join lateral (
      select source,source_id,reference_url,website,raw
      from hotel_directory_sources
      where hotel_id=h.id
      order by last_seen_at desc
      limit 1
    ) ds on true
    left join hotel_content hc on hc.hotel_id=h.id
      and hc.display_allowed=true
      and (hc.expires_at is null or hc.expires_at>now())
    where h.slug=${id}
    limit 1
  `;
  return rows[0]?enrich(rows[0]):null;
}

export type DirectoryImportHotel={
  sourceId:string;name:string;city:string;country:string;region:DirectoryRegion;
  lat?:number;lng?:number;referenceUrl?:string;website?:string;raw?:Record<string,unknown>;
};

export async function importDirectoryHotels(source:string,hotels:DirectoryImportHotel[]){
  const sql=getDatabase();if(!sql)return null;
  let created=0,matched=0,failed=0;const errors:Array<{sourceId:string;message:string}>=[];
  for(const hotel of hotels){
    try{
      const identity=await resolveCanonicalHotel({provider:"directory-"+source,providerHotelId:hotel.sourceId,name:hotel.name,city:hotel.city,country:hotel.country,region:hotel.region,lat:hotel.lat,lng:hotel.lng});
      if(!identity.id)throw new Error("canonical-id-unavailable");
      await sql`
        insert into hotel_directory_sources (hotel_id,source,source_id,reference_url,website,raw,last_seen_at)
        values (${identity.id}::uuid,${source},${hotel.sourceId},${hotel.referenceUrl??null},${hotel.website??null},${sql.json((hotel.raw||{}) as never)},now())
        on conflict (source,source_id) do update set
          hotel_id=excluded.hotel_id,
          reference_url=coalesce(excluded.reference_url,hotel_directory_sources.reference_url),
          website=coalesce(excluded.website,hotel_directory_sources.website),
          raw=case when excluded.raw='{}'::jsonb then hotel_directory_sources.raw else excluded.raw end,
          last_seen_at=now()
      `;
      if(identity.matched)matched++;else created++;
    }catch(error){failed++;errors.push({sourceId:hotel.sourceId,message:String(error).slice(0,240)});}
  }
  return{received:hotels.length,created,matched,failed,errors};
}