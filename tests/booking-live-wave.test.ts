import { describe,expect,it } from "vitest";
import { bookingWaveAnchors } from "@/src/services/booking-live-wave";
import { evaluateCommercialOffer } from "@/src/core/truth";
import { stableEvidenceHash } from "@/src/services/evidence";

describe("Booking live acquisition",()=>{
  it("deduplicates city anchors",()=>{
    const anchors=bookingWaveAnchors({regions:["Europe"],maxDestinations:20});
    const keys=anchors.map(h=>h.city+"|"+h.country);
    expect(new Set(keys).size).toBe(keys.length);
    expect(anchors.length).toBeGreaterThan(3);
  });

  it("accepts only complete redirect evidence as sellable",()=>{
    const raw={id:10004,price:{display:1200},products:[{id:"p1"}]};
    const hash=stableEvidenceHash(raw);
    const truth=evaluateCommercialOffer({
      hotelId:"booking-10004",
      sourceMode:"live",
      provider:"booking",
      providerOfferId:"p1",
      totalPrice:1200,
      currency:"EUR",
      checkIn:"2027-02-01",
      checkOut:"2027-03-01",
      verifiedAt:"2027-01-01T10:00:00Z",
      deepLink:"https://www.booking.com/example",
      rawHash:hash,
    },new Date("2027-01-01T10:01:00Z"));
    expect(truth.state).toBe("SELLABLE");
  });

  it("quarantines a search result without product identity",()=>{
    const truth=evaluateCommercialOffer({
      hotelId:"booking-10004",
      sourceMode:"live",
      provider:"booking",
      totalPrice:1200,
      currency:"EUR",
      checkIn:"2027-02-01",
      checkOut:"2027-03-01",
      verifiedAt:"2027-01-01T10:00:00Z",
      deepLink:"https://www.booking.com/example",
      rawHash:"hash",
    },new Date("2027-01-01T10:01:00Z"));
    expect(truth.state).toBe("QUARANTINED");
    expect(truth.reasons).toContain("missing_provider_offer_id");
  });
});
