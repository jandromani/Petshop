import { describe,expect,it } from "vitest";
import { runSoftwareProof } from "@/src/system/proof";

describe("full system proof",()=>{
  it("passes the deterministic Truth → Referral → Judge circuit",()=>{
    const proof=runSoftwareProof(new Date("2027-01-01T10:01:00Z"));
    expect(proof.pass).toBe(true);
    expect(proof.checks.every(c=>c.pass)).toBe(true);
  });
});
