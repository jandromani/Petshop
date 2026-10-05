import { overtureHotels } from "@/src/data/overture-hotels";
import { getDatabase } from "@/src/db/client";

export async function contentEnrichmentSnapshot(){
  const staticCoverage={
    hotels:overtureHotels.length,
    branded:overtureHotels.filter(x=>Boolean(x.brand)).length,
    officialSites:overtureHotels.filter(x=>Boolean(x.website)).length,
    categorized:overtureHotels.filter(x=>Boolean(x.category)).length,
    mapped:overtureHotels.filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng)).length,
  };
  const sql=getDatabase();
  if(!sql)return{
    staticCoverage,databaseContent:{rows:0,displayable:0,withPhotos:0,withFacilities:0,withDescription:0},
    bookingContent:{storageAllowed:process.env.BOOKING_CONTENT_STORAGE_ALLOWED==="true",displayAllowed:process.env.BOOKING_CONTENT_DISPLAY_ALLOWED==="true"&&Boolean(process.env.BOOKING_CONTENT_LICENSE_REF),licenseRefConfigured:Boolean(process.env.BOOKING_CONTENT_LICENSE_REF)},
  };
  const rows=await sql<Array<{rows:number;displayable:number;with_photos:number;with_facilities:number;with_description:number}>>`
    select count(*)::int as rows,
      count(*) filter (where display_allowed=true and (expires_at is null or expires_at>now()))::int as displayable,
      count(*) filter (where display_allowed=true and jsonb_array_length(photo_urls)>0 and (expires_at is null or expires_at>now()))::int as with_photos,
      count(*) filter (where display_allowed=true and jsonb_array_length(facilities)>0 and (expires_at is null or expires_at>now()))::int as with_facilities,
      count(*) filter (where display_allowed=true and description is not null and length(trim(description))>0 and (expires_at is null or expires_at>now()))::int as with_description
    from hotel_content
  `;
  const r=rows[0]||{rows:0,displayable:0,with_photos:0,with_facilities:0,with_description:0};
  return{
    staticCoverage,
    databaseContent:{rows:Number(r.rows),displayable:Number(r.displayable),withPhotos:Number(r.with_photos),withFacilities:Number(r.with_facilities),withDescription:Number(r.with_description)},
    bookingContent:{storageAllowed:process.env.BOOKING_CONTENT_STORAGE_ALLOWED==="true",displayAllowed:process.env.BOOKING_CONTENT_DISPLAY_ALLOWED==="true"&&Boolean(process.env.BOOKING_CONTENT_LICENSE_REF),licenseRefConfigured:Boolean(process.env.BOOKING_CONTENT_LICENSE_REF)},
  };
}
