import { randomUUID } from "node:crypto";
import { afterAll,describe,expect,it } from "vitest";
import { getDatabase } from "@/src/db/client";
import { createHotelLead } from "@/src/db/direct-supply";
import { hotelAccess,hotelPortalRates,issueHotelAccess,portalTokenHash,proposeHotelRate,revokeHotelAccess } from "@/src/db/hotel-portal";

const proposal={minNights:30,maxNights:90,maxGuests:2,board:"Breakfast",monthlyPrice:3000,currency:"EUR",validFrom:"2027-01-01",validTo:"2027-06-30",cancellation:"Free cancellation until 30 days before arrival"};
describe.skipIf(!process.env.DATABASE_URL)("hotel partner isolation",()=>{
  const leads:string[]=[];
  afterAll(async()=>{const sql=getDatabase();if(sql)for(const id of leads)await sql`delete from hotel_leads where id=${id}::uuid`});
  it("isolates hotel data, hashes credentials and only appends unverified drafts",async()=>{
    const sql=getDatabase();if(!sql)throw new Error("DB missing");
    const a=await createHotelLead({hotelName:"Portal A "+randomUUID(),city:"Madrid",country:"Spain"});
    const b=await createHotelLead({hotelName:"Portal B "+randomUUID(),city:"Madrid",country:"Spain"});
    if(!a||!b)throw new Error("Lead missing");leads.push(a,b);
    const accessA=await issueHotelAccess(a);const accessB=await issueHotelAccess(b);if(!accessA||!accessB)throw new Error("Access missing");
    const hashes=await sql`select token_hash from hotel_portal_access where id=${accessA.id}::uuid`;
    expect(hashes[0].token_hash).toBe(portalTokenHash(accessA.token));expect(hashes[0].token_hash).not.toBe(accessA.token);
    expect((await hotelAccess(accessA.token))?.hotel_lead_id).toBe(a);
    const id=await proposeHotelRate(accessA.token,proposal);expect(id).toBeTruthy();
    const own=await hotelPortalRates(accessA.token);expect(own).toHaveLength(1);expect(await hotelPortalRates(accessB.token)).toHaveLength(0);
    expect(own[0].publication_state).toBe("DRAFT");
    // Simulate an ops-approved prior record: subsequent partner submissions cannot overwrite it.
    await sql`update direct_rate_offers set publication_state='READY_FOR_REVIEW',contract_verified=true,contract_reference='CI-fixture' where id=${id}::uuid`;
    await proposeHotelRate(accessA.token,{...proposal,monthlyPrice:2800});
    const previous=await sql`select monthly_price::float,contract_verified,publication_state from direct_rate_offers where id=${id}::uuid`;
    expect(previous[0]).toMatchObject({monthly_price:3000,contract_verified:true,publication_state:"READY_FOR_REVIEW"});
    const drafts=await sql`select contract_verified from direct_rate_offers where hotel_lead_id=${a}::uuid and publication_state='DRAFT'`;
    expect(drafts.every(r=>!r.contract_verified)).toBe(true);
    await expect(proposeHotelRate(accessA.token,{...proposal,hotelLeadId:b})).rejects.toThrow();
    await revokeHotelAccess(accessA.id);expect(await hotelAccess(accessA.token)).toBeNull();expect(await hotelPortalRates(accessA.token)).toHaveLength(0);expect(await proposeHotelRate(accessA.token,proposal)).toBeNull();
    await sql`update hotel_portal_access set expires_at=now()-interval '1 second' where id=${accessB.id}::uuid`;
    expect(await hotelAccess(accessB.token)).toBeNull();expect(await proposeHotelRate(accessB.token,proposal)).toBeNull();
  });
});
