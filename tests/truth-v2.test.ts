import { describe,expect,it } from "vitest";
import { hotels } from "@/src/data/hotels";
import { evaluateCommercialOffer, evaluateSellability } from "@/src/core/truth";
import { stableEvidenceHash } from "@/src/services/evidence";

describe("truth v2",()=>{
  it("never treats seed hotels as commercially sellable",()=>{
    expect(hotels.every(h=>evaluateSellability(h).state==="DEMO")).toBe(true);
    expect(hotels.every(h=>evaluateSellability(h).confidence===0)).toBe(true);
  });

  it("requires complete live evidence for SELLABLE",()=>{
    const now=new Date("2027-01-01T12:00:00Z");
    const evidence={
      hotelId:"h1",
      sourceMode:"live" as const,
      provider:"ratehawk",
      providerOfferId:"rate-123",
      totalPrice:4200,
      currency:"EUR",
      checkIn:"2027-02-01",
      checkOut:"2027-05-02",
      verifiedAt:"2027-01-01T11:55:00Z",
      expiresAt:"2027-01-01T13:00:00Z",
      deepLink:"https://partner.example/offer",
      rawHash:stableEvidenceHash({rate:"rate-123",price:4200}),
    };
    expect(evaluateCommercialOffer(evidence,now).state).toBe("SELLABLE");
  });

  it("quarantines a live price without provenance",()=>{
    const result=evaluateCommercialOffer({
      hotelId:"h1",
      sourceMode:"live",
      provider:"ratehawk",
      totalPrice:4200,
      currency:"EUR",
      checkIn:"2027-02-01",
      checkOut:"2027-05-02",
      verifiedAt:"2027-01-01T11:55:00Z",
    },new Date("2027-01-01T12:00:00Z"));
    expect(result.state).toBe("QUARANTINED");
    expect(result.reasons).toContain("missing_raw_evidence_hash");
    expect(result.reasons).toContain("missing_commercial_fulfillment_path");
  });

  it("accepts B2B API booking capability instead of a deep link",()=>{
    const result=evaluateCommercialOffer({
      hotelId:"h2",
      sourceMode:"live",
      provider:"hbx",
      providerOfferId:"rate-key",
      totalPrice:3000,
      currency:"EUR",
      checkIn:"2027-02-01",
      checkOut:"2027-03-01",
      verifiedAt:"2027-01-01T11:55:00Z",
      apiBookingCapable:true,
      rawHash:"hash",
    },new Date("2027-01-01T12:00:00Z"));
    expect(result.state).toBe("SELLABLE");
  });

  it("marks expired complete evidence stale",()=>{
    const result=evaluateCommercialOffer({
      hotelId:"h1",
      sourceMode:"live",
      provider:"booking",
      providerOfferId:"x",
      totalPrice:1000,
      currency:"EUR",
      checkIn:"2027-02-01",
      checkOut:"2027-03-01",
      verifiedAt:"2027-01-01T10:00:00Z",
      expiresAt:"2027-01-01T11:00:00Z",
      deepLink:"https://partner.example",
      rawHash:"abc",
    },new Date("2027-01-01T12:00:00Z"));
    expect(result.state).toBe("STALE");
  });

  it("hashes provider evidence deterministically",()=>{
    expect(stableEvidenceHash({b:2,a:1})).toBe(stableEvidenceHash({a:1,b:2}));
  });
});
