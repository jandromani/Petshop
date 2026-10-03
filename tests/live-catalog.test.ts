import { describe,expect,it } from "vitest";
import { monthlyEquivalent,safeCommercialUrl } from "@/src/core/live-offers";

describe("live catalog invariants",()=>{
  it("normalizes stay totals to a 30-day equivalent",()=>{
    expect(monthlyEquivalent(3000,60)).toBe(1500);
    expect(monthlyEquivalent(900,30)).toBe(900);
  });

  it("only permits https Booking destinations for current referral provider",()=>{
    expect(safeCommercialUrl("booking","https://www.booking.com/hotel/x")).not.toBeNull();
    expect(safeCommercialUrl("booking","http://www.booking.com/hotel/x")).toBeNull();
    expect(safeCommercialUrl("booking","https://evil.example/?next=booking.com")).toBeNull();
    expect(safeCommercialUrl("ratehawk","https://www.booking.com/hotel/x")).toBeNull();
  });
});
