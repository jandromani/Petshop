import { describe,expect,it } from "vitest";
import { computeErrorBudget } from "@/src/db/observability";

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
