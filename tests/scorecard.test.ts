import { describe,expect,it } from "vitest";
import { deriveWeeklyOperatingScorecard } from "@/src/system/scorecard";

describe("weekly operating scorecard",()=>{
  it("never converts missing commercial evidence into a pass",()=>{
    const score=deriveWeeklyOperatingScorecard({
      dbReachable:true,dbWithinTarget:true,liveOffers:0,
      providerWaveSuccessPct:null,agentSuccessPct:null,
      referralClicks:0,conversions:0,commissionEur:0,proofState:"UNPROVEN",
      zeroResultRate:null,abandonmentRate:null,openIncidents:0,
    });
    expect(score.dimensions.supply.state).toBe("BLOCKED");
    expect(score.dimensions.demand.state).toBe("NO_SAMPLE");
    expect(score.dimensions.money.state).toBe("NO_SAMPLE");
    expect(score.dimensions.automation.state).toBe("NO_SAMPLE");
    expect(score.priorities).toContain("Onboard verified SELLABLE supply.");
    expect(score.priorities).toContain("Close the first reconciled conversion-to-settlement loop.");
  });

  it("surfaces observed friction and incidents as priorities",()=>{
    const score=deriveWeeklyOperatingScorecard({
      dbReachable:true,dbWithinTarget:true,liveOffers:12,
      providerWaveSuccessPct:98,agentSuccessPct:100,
      referralClicks:20,conversions:2,commissionEur:140,proofState:"COMMERCIAL_EVIDENCE_OBSERVED",
      zeroResultRate:.35,abandonmentRate:.9,openIncidents:2,
    });
    expect(score.dimensions.runtime.state).toBe("PASS");
    expect(score.dimensions.supply.state).toBe("PASS");
    expect(score.dimensions.money.state).toBe("PASS");
    expect(score.dimensions.searchQuality.state).toBe("WATCH");
    expect(score.priorities).toEqual(expect.arrayContaining([
      "Reduce zero-result search demand mismatch.",
      "Investigate high search-to-referral abandonment.",
      "Resolve open operational incidents.",
    ]));
  });
});
