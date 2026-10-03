import { describe,expect,it } from "vitest";
import { buildRFQ } from "@/src/direct/rfq";
import { directPublicationChecks,type DirectPublishRow } from "@/src/db/direct-supply";
import { safeCommercialUrl } from "@/src/core/live-offers";

const valid:DirectPublishRow={
  id:"11111111-1111-4111-8111-111111111111",
  hotel_lead_id:"22222222-2222-4222-8222-222222222222",
  hotel_name:"Example Resort",city:"Antalya",country:"Türkiye",region:"Europe",lat:null,lng:null,
  min_nights:30,max_nights:180,max_guests:2,monthly_price:1500,currency:"EUR",
  valid_from:"2027-01-01",valid_to:"2027-12-31",cancellation:"30 days",
  booking_url:"https://hotel.example/book",contract_reference:"CTR-1",contract_verified:true,
  approved_booking_host:"hotel.example",
};

describe("direct long-stay commercial gates",()=>{
  it("prices a 90-night target deterministically",()=>{
    const rfq=buildRFQ({hotelName:"Example Resort",city:"Antalya",country:"Türkiye",checkIn:"2027-01-10",nights:90,guests:2,board:"half-board",targetMonthlyEur:1500});
    expect(rfq.commercial.targetTotalEur).toBe(4500);
  });

  it("rejects stays outside the long-stay product",()=>{
    expect(()=>buildRFQ({hotelName:"X",city:"Y",country:"Z",checkIn:"2027-01-01",nights:20,guests:1,board:"room",targetMonthlyEur:1000})).toThrow();
  });

  it("publishes only complete verified contract evidence",()=>{
    expect(directPublicationChecks(valid,new Date("2027-06-01T00:00:00Z"))).toEqual([]);
    expect(directPublicationChecks({...valid,contract_verified:false},new Date("2027-06-01T00:00:00Z"))).toContain("contract_not_verified");
    expect(directPublicationChecks({...valid,cancellation:null},new Date("2027-06-01T00:00:00Z"))).toContain("missing_cancellation_terms");
  });

  it("pins direct redirects to the server-approved host",()=>{
    expect(safeCommercialUrl("direct","https://hotel.example/book","hotel.example")?.hostname).toBe("hotel.example");
    expect(safeCommercialUrl("direct","https://evil.example/book","hotel.example")).toBeNull();
  });
});
