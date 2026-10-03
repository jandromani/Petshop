import { describe, expect, it } from "vitest";
import { BookingDemandClient } from "@/src/providers/live/booking";
import { RateHawkClient } from "@/src/providers/live/ratehawk";
import { HbxClient, hbxSignature } from "@/src/providers/live/hbx";
import { aggregateContinuousStay, splitStay } from "@/src/services/long-stay-probe";

describe("live provider safety",()=>{
  it("is disabled without credentials",()=>{
    delete process.env.BOOKING_API_KEY;
    delete process.env.BOOKING_AFFILIATE_ID;
    delete process.env.RATEHAWK_KEY_ID;
    delete process.env.RATEHAWK_API_KEY;
    delete process.env.HBX_API_KEY;
    delete process.env.HBX_SECRET;

    expect(new BookingDemandClient().status().configured).toBe(false);
    expect(new RateHawkClient().status().configured).toBe(false);
    expect(new HbxClient().status().configured).toBe(false);
  });

  it("builds stable HBX signatures",()=>{
    expect(hbxSignature("key","secret",1700000000)).toBe(hbxSignature("key","secret",1700000000));
    expect(hbxSignature("key","secret",1700000000)).not.toBe(hbxSignature("key","secret",1700000001));
  });
});

describe("long stay continuity",()=>{
  it("splits 90 nights into three 30-night provider probes",()=>{
    const segments=splitStay("2027-01-01",90,30);
    expect(segments).toHaveLength(3);
    expect(segments[0]).toEqual({index:0,checkIn:"2027-01-01",checkOut:"2027-01-31",nights:30});
    expect(segments[2].checkOut).toBe("2027-04-01");
  });

  it("aggregates only continuous same-currency segments",()=>{
    const segments=splitStay("2027-01-01",60,30);
    const result=aggregateContinuousStay([
      {segment:segments[0],totalPrice:1000,currency:"EUR"},
      {segment:segments[1],totalPrice:950,currency:"EUR"},
    ]);
    expect(result.continuous).toBe(true);
    expect(result.totalPrice).toBe(1950);
  });
});
