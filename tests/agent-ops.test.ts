import { describe,expect,it } from "vitest";
import { parseJudgeVerdict,usageCostCents } from "@/src/db/agent-runs";

describe("agent persistence helpers",()=>{
  it("parses independent judge verdict prefixes",()=>{
    expect(parseJudgeVerdict("PASS all gates")).toBe("PASS");
    expect(parseJudgeVerdict("REJECT fabricated price")).toBe("REJECT");
    expect(parseJudgeVerdict("Needs another pass")).toBe("REVISION");
  });
  it("normalizes provider-reported dollar cost to cents",()=>{
    expect(usageCostCents({cost:0.0123})).toBeCloseTo(1.23);
    expect(usageCostCents({cost:"0.50"})).toBe(50);
  });
});
