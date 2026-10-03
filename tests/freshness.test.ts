import { describe,expect,it } from "vitest";
import { evaluateCommercialOffer } from "@/src/core/truth";

const base={
  hotelId:"h1",sourceMode:"live" as const,provider:"booking",providerOfferId:"p1",
  totalPrice:1500,currency:"EUR",checkIn:"2027-01-01",checkOut:"2027-02-01",
  deepLink:"https://www.booking.com/hotel/test",rawHash:"abc",
};

describe("provider freshness",()=>{
  it("keeps a Booking snapshot sellable before its hard TTL",()=>{
    const verifiedAt="2026-10-03T10:00:00.000Z";
    const result=evaluateCommercialOffer({...base,verifiedAt},new Date("2026-10-03T10:14:00.000Z"));
    expect(result.state).toBe("SELLABLE");
  });
  it("marks the same snapshot stale after the provider TTL",()=>{
    const verifiedAt="2026-10-03T10:00:00.000Z";
    const result=evaluateCommercialOffer({...base,verifiedAt},new Date("2026-10-03T10:16:00.000Z"));
    expect(result.state).toBe("STALE");
  });
});
