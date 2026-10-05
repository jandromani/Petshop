import { describe,expect,it } from "vitest";
import { parseHbxAvailability,parseHbxCheckRate,resolveHbxPrice } from "@/src/providers/live/hbx";
import { evaluateCommercialOffer } from "@/src/core/truth";
import { stableEvidenceHash } from "@/src/services/evidence";

describe("HBX pricing and funnel",()=>{
  it("never treats an unmarked net rate as customer display price",()=>{
    const p=resolveHbxPrice({net:"100"},"net");
    expect(p.totalPrice).toBe(100);
    expect(p.displayPrice).toBeUndefined();
  });

  it("applies an explicit deterministic markup to net pricing",()=>{
    const p=resolveHbxPrice({net:"100"},"net",15);
    expect(p.displayPrice).toBe(115);
  });

  it("prefers supplied sellingRate",()=>{
    const p=resolveHbxPrice({net:"100",sellingRate:"123"},"commissionable");
    expect(p.displayPrice).toBe(123);
  });

  it("keeps RECHECK availability non-commercial",()=>{
    process.env.HBX_BOOKING_ENABLED="true";
    process.env.HBX_MTLS_READY="true";
    const hits=parseHbxAvailability({auditData:{token:"op1"},hotels:{currency:"EUR",hotels:[{code:42,rooms:[{rates:[{rateKey:"rk",rateType:"RECHECK",sellingRate:"120",net:"100"}]}]}]}},"2027-01-01T10:00:00Z");
    expect(hits[0].commercialFulfillment).toBe("none");
  });

  it("keeps checked BOOKABLE evidence non-commercial until booking transaction exists",()=>{
    process.env.HBX_BOOKING_ENABLED="true";
    process.env.HBX_MTLS_READY="true";
    const hits=parseHbxCheckRate({auditData:{token:"op2"},hotel:{code:42,rooms:[{rates:[{rateKey:"rk2",rateType:"BOOKABLE",sellingRate:"120",net:"100"}]}]}},"EUR","2027-01-01T10:00:00Z");
    const hit=hits[0];
    const truth=evaluateCommercialOffer({
      hotelId:"hbx-42",
      sourceMode:"live",
      provider:"hbx",
      providerOfferId:hit.providerOfferId,
      totalPrice:hit.displayPrice || 0,
      currency:hit.currency || "",
      checkIn:"2027-02-01",
      checkOut:"2027-02-20",
      verifiedAt:hit.verifiedAt || "2027-01-01T10:00:00Z",
      apiBookingCapable:hit.commercialFulfillment==="api",
      rawHash:stableEvidenceHash(hit.raw),
    },new Date("2027-01-01T10:01:00Z"));
    expect(hit.commercialFulfillment).toBe("none");
    expect(truth.state).toBe("QUARANTINED");
    expect(truth.reasons).toContain("missing_commercial_fulfillment_path");
    delete process.env.HBX_BOOKING_ENABLED;
    delete process.env.HBX_MTLS_READY;
  });
});
