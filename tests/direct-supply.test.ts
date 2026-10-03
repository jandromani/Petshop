import { describe,expect,it } from "vitest";
import { buildRFQ } from "@/src/direct/rfq";

describe("direct long-stay RFQ",()=>{
  it("prices a 90-night target deterministically",()=>{
    const rfq=buildRFQ({
      hotelName:"Example Resort",city:"Antalya",country:"Türkiye",
      checkIn:"2027-01-10",nights:90,guests:2,board:"half-board",targetMonthlyEur:1500,
    });
    expect(rfq.commercial.targetTotalEur).toBe(4500);
    expect(rfq.commercial.stay.nights).toBe(90);
    expect(rfq.proposition.length).toBeGreaterThan(2);
  });

  it("rejects stays outside the long-stay product",()=>{
    expect(()=>buildRFQ({hotelName:"X",city:"Y",country:"Z",checkIn:"2027-01-01",nights:20,guests:1,board:"room",targetMonthlyEur:1000})).toThrow();
  });
});
