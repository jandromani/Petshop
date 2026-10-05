import { describe,expect,it } from "vitest";
import { getDatabase } from "@/src/db/client";
import { getDirectoryHotel,importDirectoryHotels,listDirectoryHotels } from "@/src/db/directory";

const enabled=Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("directory database",()=>{
  it("creates the directory provenance schema",async()=>{
    const sql=getDatabase();expect(sql).toBeTruthy();if(!sql)throw new Error("database unavailable");
    const rows=await sql<Array<{exists:boolean}>>`select to_regclass('public.hotel_directory_sources') is not null as exists`;
    expect(rows[0].exists).toBe(true);
  });
  it("hides provider content until display rights are explicitly enabled",async()=>{
    const result=await importDirectoryHotels("manual-content-test",[{sourceId:"fixture-content-1",name:"Atlas Licensed Content Hotel",city:"Madrid",country:"Spain",region:"Europe",lat:40.42,lng:-3.69,referenceUrl:"https://example.com/content-hotel"}]);
    expect(result?.failed).toBe(0);
    const page=await listDirectoryHotels({q:"Atlas Licensed Content Hotel",region:"Europe",limit:10,offset:0});
    const hotel=page?.hotels[0];expect(hotel?.canonicalId).toBeTruthy();
    const sql=getDatabase();if(!sql||!hotel)throw new Error("database unavailable");
    await sql`
      insert into hotel_content(hotel_id,provider,description,photo_urls,facilities,display_allowed,license_ref,source_url,expires_at)
      values (${hotel.canonicalId}::uuid,'booking','Provider description',${sql.json(["https://images.example/hotel.webp"] as never)},${sql.json(["pool","gym"] as never)},false,'LIC-TEST','https://provider.example/hotel',now()+interval '1 day')
      on conflict (hotel_id) do update set description=excluded.description,photo_urls=excluded.photo_urls,facilities=excluded.facilities,display_allowed=false,license_ref=excluded.license_ref,source_url=excluded.source_url,expires_at=excluded.expires_at
    `;
    const hidden=await getDirectoryHotel(hotel.id);expect(hidden?.photoUrls).toEqual([]);expect(hidden?.facilities).toEqual([]);expect(hidden?.description).toBeNull();
    await sql`update hotel_content set display_allowed=true where hotel_id=${hotel.canonicalId}::uuid`;
    const visible=await getDirectoryHotel(hotel.id);expect(visible?.photoUrls).toEqual(["https://images.example/hotel.webp"]);expect(visible?.facilities).toEqual(["pool","gym"]);expect(visible?.description).toBe("Provider description");
  });

  it("imports, canonicalizes and reads a real-property identity",async()=>{
    const result=await importDirectoryHotels("manual-test",[{sourceId:"fixture-1",name:"Atlas Fixture Hotel",city:"Madrid",country:"Spain",region:"Europe",lat:40.41,lng:-3.70,referenceUrl:"https://example.com/hotel"}]);
    expect(result?.failed).toBe(0);
    const page=await listDirectoryHotels({q:"Atlas Fixture Hotel",region:"Europe",limit:10,offset:0});
    expect(page?.total).toBeGreaterThanOrEqual(1);
    const hotel=page?.hotels[0];expect(hotel?.id).toBeTruthy();
    const detail=hotel?await getDirectoryHotel(hotel.id):null;
    expect(detail?.source).toBe("manual-test");
  });
});