import { describe,expect,it } from "vitest";
import { assessSchengen90In180 } from "@/src/compliance/schengen";
import { assessTaxDayScreen } from "@/src/compliance/tax-day-risk";

describe("stay compliance day-count engines",()=>{
  it("distinguishes hotel nights from Schengen presence days",()=>{
    const ok=assessSchengen90In180([],"2026-01-01",89);expect(ok.presenceDays).toBe(90);expect(ok.eligible).toBe(true);
    const breach=assessSchengen90In180([],"2026-01-01",90);expect(breach.presenceDays).toBe(91);expect(breach.eligible).toBe(false);expect(breach.allowedPresenceDays).toBe(90);
  });
  it("counts prior rolling-window presence before admitting a new stay",()=>{
    const previous=[{entry:"2026-01-01",exit:"2026-01-20"}];
    expect(assessSchengen90In180(previous,"2026-02-01",69).eligible).toBe(true);
    expect(assessSchengen90In180(previous,"2026-02-01",70).eligible).toBe(false);
  });
  it("treats 183 days as a review screen, not a tax conclusion",()=>{
    const result=assessTaxDayScreen([{entry:"2026-01-01",exit:"2026-07-02"}],2026);expect(result.days).toBe(183);expect(result.level).toBe("HIGH_DAY_COUNT");expect(result.determination).toBe(false);
  });
});
