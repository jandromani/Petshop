import { describe,expect,it } from "vitest";
import { parseRateHawkResponse } from "@/src/providers/live/ratehawk";
import { evaluateCommercialOffer } from "@/src/core/truth";
import { stableEvidenceHash } from "@/src/services/evidence";

const payment={payment_options:{payment_types:[{show_amount:"990.50",show_currency_code:"EUR"}]}};

describe("RateHawk staged funnel",()=>{
  it("marks SERP rates as discovery-only candidates",()=>{
    const hits=parseRateHawkResponse({data:{hotels:[{hid:123,rates:[{...payment,search_hash:"sr-abc",meal:"breakfast"}]}]}}, "search", false, "2027-01-01T10:00:00Z");
    expect(hits[0].providerOfferId).toBe("sr-abc");
    expect(hits[0].stage).toBe("search");
    expect(hits[0].commercialFulfillment).toBe("none");
  });

  it("keeps hotelpage book hashes non-commercial before prebook",()=>{
    const hits=parseRateHawkResponse({data:{hotels:[{hid:123,rates:[{...payment,book_hash:"h-abc"}]}]}}, "availability", false);
    expect(hits[0].providerOfferId).toBe("h-abc");
    expect(hits[0].commercialFulfillment).toBe("none");
  });

  it("does not claim API fulfillment until the booking transaction is implemented",()=>{
    const hits=parseRateHawkResponse({data:{hotels:[{hid:123,rates:[{...payment,book_hash:"p-abc"}]}]}}, "prebook", true, "2027-01-01T10:00:00Z");
    const hit=hits[0];
    const rawHash=stableEvidenceHash(hit.raw);
    const truth=evaluateCommercialOffer({
      hotelId:"ratehawk-123",
      sourceMode:"live",
      provider:"ratehawk",
      providerOfferId:hit.providerOfferId,
      totalPrice:hit.displayPrice || 0,
      currency:hit.currency || "",
      checkIn:"2027-02-01",
      checkOut:"2027-02-20",
      verifiedAt:hit.verifiedAt || "2027-01-01T10:00:00Z",
      apiBookingCapable:hit.commercialFulfillment==="api",
      rawHash,
    },new Date("2027-01-01T10:01:00Z"));
    expect(hit.commercialFulfillment).toBe("none");
    expect(truth.state).toBe("QUARANTINED");
    expect(truth.reasons).toContain("missing_commercial_fulfillment_path");
  });

  it("quarantines the same prebook result when fulfillment is disabled",()=>{
    const hits=parseRateHawkResponse({data:{hotels:[{hid:123,rates:[{...payment,book_hash:"p-abc"}]}]}}, "prebook", false, "2027-01-01T10:00:00Z");
    const hit=hits[0];
    const truth=evaluateCommercialOffer({
      hotelId:"ratehawk-123",
      sourceMode:"live",
      provider:"ratehawk",
      providerOfferId:hit.providerOfferId,
      totalPrice:hit.displayPrice || 0,
      currency:hit.currency || "",
      checkIn:"2027-02-01",
      checkOut:"2027-02-20",
      verifiedAt:hit.verifiedAt || "2027-01-01T10:00:00Z",
      rawHash:stableEvidenceHash(hit.raw),
    },new Date("2027-01-01T10:01:00Z"));
    expect(truth.state).toBe("QUARANTINED");
    expect(truth.reasons).toContain("missing_commercial_fulfillment_path");
  });
});
