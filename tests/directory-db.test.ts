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