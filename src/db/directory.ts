import { getDatabase } from "@/src/db/client";
import { resolveCanonicalHotel } from "@/src/services/identity";

export type DirectoryRegion="Europe"|"Asia"|"Africa"|"Americas";
export type DirectoryHotel={
  id:string;canonicalId:string;name:string;city:string;country:string;region:DirectoryRegion;
  lat:number|null;lng:number|null;source:string;sourceId:string;referenceUrl:string|null;website:string|null;
};
type DirectoryRow=DirectoryHotel&{total:number};

export function fallbackDirectoryReference(hotel:Pick<DirectoryHotel,"name"|"city"|"country">){
  return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent([hotel.name,hotel.city,hotel.country].join(" "));
}

export async function listDirectoryHotels(input:{q?:string;region?:"All"|DirectoryRegion;limit?:number;offset?:number;maxRows?:number}){
  const sql=getDatabase();if(!sql)return null;
  const q=input.q?.trim()?"%"+input.q.trim()+"%":null;
  const region=input.region&&input.region!=="All"?input.region:null;
  const limit=Math.max(1,Math.min(input.maxRows??5000,input.limit??24));
  const offset=Math.max(0,Math.min(10000,input.offset??0));
  const rows=await sql<DirectoryRow[]>`
    select h.slug as id,h.id::text as "canonicalId",h.name,h.city,h.country,h.region,h.lat,h.lng,
      ds.source,ds.source_id as "sourceId",ds.reference_url as "referenceUrl",ds.website,
      count(*) over()::int as total
    from canonical_hotels h
    join lateral (
      select source,source_id,reference_url,website
      from hotel_directory_sources
      where hotel_id=h.id
      order by last_seen_at desc
      limit 1
    ) ds on true
    where h.region in ('Europe','Asia','Africa','Americas')
      and (${region}::text is null or h.region=${region})
      and (${q}::text is null or h.name ilike ${q} or h.city ilike ${q} or h.country ilike ${q})
    order by h.name asc,h.city asc
    limit ${limit} offset ${offset}
  `;
  return{total:rows[0]?.total??0,hotels:rows.map(({total,...h})=>h)};
}

export async function getDirectoryHotel(id:string):Promise<DirectoryHotel|null>{
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<DirectoryHotel[]>`
    select h.slug as id,h.id::text as "canonicalId",h.name,h.city,h.country,h.region,h.lat,h.lng,
      ds.source,ds.source_id as "sourceId",ds.reference_url as "referenceUrl",ds.website
    from canonical_hotels h
    join lateral (
      select source,source_id,reference_url,website
      from hotel_directory_sources
      where hotel_id=h.id
      order by last_seen_at desc
      limit 1
    ) ds on true
    where h.slug=${id}
    limit 1
  `;
  return rows[0]??null;
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