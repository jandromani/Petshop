import { describe,expect,it } from "vitest";
import { evaluateHeroExperiment } from "@/src/growth/autopilot";
import type { HeroExperimentReadout } from "@/src/db/growth";

function row(overrides:Partial<HeroExperimentReadout>):HeroExperimentReadout{
  return{
    variant:"freedom",
    exposed_visitors:100,
    referral_visitors:13,
    search_visitors:80,
    zero_result_visitors:8,
    conversion_visitors:5,
    commission_eur:55,
    ...overrides,
  };
}

const runner=()=>row({
  variant:"provocation",
  referral_visitors:10,
  zero_result_visitors:8,
  conversion_visitors:5,
  commission_eur:50,
});

describe("hero growth autopilot guardrails",()=>{
  it("will not promote a referral winner before commercial quality has enough evidence",()=>{
    const decision=evaluateHeroExperiment([
      row({conversion_visitors:2,commission_eur:0}),
      runner(),
    ]);
    expect(decision).toMatchObject({promote:false,reason:"insufficient-commercial-quality-sample"});
  });

  it("requires actual commission evidence after conversion sample exists",()=>{
    const decision=evaluateHeroExperiment([
      row({commission_eur:0}),
      runner(),
    ]);
    expect(decision).toMatchObject({promote:false,reason:"insufficient-revenue-quality-sample"});
  });

  it("blocks a referral winner that materially degrades conversion quality",()=>{
    const decision=evaluateHeroExperiment([
      row({conversion_visitors:3,commission_eur:55}),
      runner(),
    ]);
    expect(decision).toMatchObject({promote:false,reason:"conversion-quality-guardrail"});
  });

  it("blocks a referral winner that materially degrades revenue per exposure",()=>{
    const decision=evaluateHeroExperiment([
      row({conversion_visitors:5,commission_eur:30}),
      runner(),
    ]);
    expect(decision).toMatchObject({promote:false,reason:"revenue-quality-guardrail"});
  });

  it("blocks a referral winner with a material zero-result regression",()=>{
    const decision=evaluateHeroExperiment([
      row({zero_result_visitors:16}),
      runner(),
    ]);
    expect(decision).toMatchObject({promote:false,reason:"search-quality-guardrail"});
  });

  it("promotes only when referral search conversion and revenue guardrails all pass",()=>{
    const decision=evaluateHeroExperiment([row({}),runner()]);
    expect(decision.promote).toBe(true);
    if(decision.promote)expect(decision.winner.variant).toBe("freedom");
  });
});
