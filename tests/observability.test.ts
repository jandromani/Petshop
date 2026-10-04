import { describe,expect,it } from "vitest";
import { computeErrorBudget,computeServiceOutcomeMetric } from "@/src/db/observability";

describe("provider error budgets",()=>{
  it("keeps no-sample evidence null",()=>{
    expect(computeErrorBudget("ratehawk",0,0,95)).toMatchObject({
      runs:0,successPct:null,observedFailurePct:null,remainingFailureBudgetPct:null,budgetConsumedPct:null,
    });
  });

  it("computes remaining and consumed failure budget",()=>{
    const healthy=computeErrorBudget("ratehawk",100,98,95);
    expect(healthy.successPct).toBe(98);
    expect(healthy.observedFailurePct).toBe(2);
    expect(healthy.remainingFailureBudgetPct).toBe(3);
    expect(healthy.budgetConsumedPct).toBe(40);

    const exhausted=computeErrorBudget("hbx",20,18,95);
    expect(exhausted.successPct).toBe(90);
    expect(exhausted.remainingFailureBudgetPct).toBe(0);
    expect(exhausted.budgetConsumedPct).toBe(100);
  });
});


describe("service outcome SLO semantics",()=>{
  it("keeps policy rejections outside reliability denominator",()=>{
    expect(computeServiceOutcomeMetric("referral.redirect",98,2,50)).toEqual({
      action:"referral.redirect",success:98,failure:2,rejected:50,denominator:100,successPct:98,
    });
  });

  it("keeps no observed operational requests as null instead of synthetic 100%",()=>{
    expect(computeServiceOutcomeMetric("conversion.ingest",0,0,12)).toMatchObject({
      denominator:0,rejected:12,successPct:null,
    });
  });
});
