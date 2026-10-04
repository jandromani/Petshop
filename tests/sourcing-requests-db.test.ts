import { afterAll,describe,expect,it } from "vitest";
import { getDatabase } from "@/src/db/client";
import { createSourcingRequest,listSourcingRequests } from "@/src/db/sourcing";
import { ensureHotelLead } from "@/src/db/direct-supply";

const enabled=Boolean(process.env.DATABASE_URL);
const token=crypto.randomUUID();
const hotelId="ci-hotel-"+token;
const requesterHash="ci-requester-"+token;

describe.skipIf(!enabled)("sourcing requests persistence",()=>{
  afterAll(async()=>{
    const sql=getDatabase();if(!sql)return;
    await sql`delete from sourcing_requests where requester_hash=${requesterHash}`;
  });

  it("persists and deduplicates anonymous long-stay demand without PII",async()=>{
    const first=await createSourcingRequest({
      directoryHotelId:hotelId,hotelName:"CI Real Hotel",city:"Madrid",country:"Spain",
      checkIn:"2027-02-01",nights:365,occupancy:2,targetMonthlyEur:2500,
      requesterHash,sourcePath:"/stays/"+hotelId,
    });
    expect(first?.id).toBeTruthy();

    const second=await createSourcingRequest({
      directoryHotelId:hotelId,hotelName:"CI Real Hotel",city:"Madrid",country:"Spain",
      checkIn:"2027-02-01",nights:365,occupancy:2,targetMonthlyEur:2300,
      requesterHash,sourcePath:"/stays/"+hotelId+"?duration=365",
    });
    expect(second?.id).toBe(first?.id);

    const rows=await listSourcingRequests(500);
    const row=rows.find(x=>x.id===first?.id);
    expect(row?.status).toBe("OPEN");
    expect(row?.nights).toBe(365);
    expect(row?.occupancy).toBe(2);
    expect(row?.target_monthly_eur).toBe(2300);
    expect(JSON.stringify(row)).not.toContain(requesterHash);

    const leadA=await ensureHotelLead({hotelName:"CI Real Hotel",city:"Madrid",country:"Spain",region:"Europe",source:"customer-sourcing",notes:{sourcingRequestId:first?.id}});
    const leadB=await ensureHotelLead({hotelName:"CI Real Hotel",city:"Madrid",country:"Spain",region:"Europe",source:"customer-sourcing",notes:{sourcingRequestId:second?.id}});
    expect(leadA).toBeTruthy();expect(leadB).toBe(leadA);
    const sql=getDatabase();if(sql&&leadA)await sql`delete from hotel_leads where id=${leadA}::uuid`;
  });
});
