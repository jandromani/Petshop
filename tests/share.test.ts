import { describe,expect,it } from "vitest";
import type { CreateSharedPlan } from "@/src/core/share";

describe("share contract",()=>{
  it("contains no pension, rent or other-income fields",()=>{
    const plan:CreateSharedPlan={monthlyBudget:2050,party:"solo",duration:90,mode:"world",checkIn:"2027-01-15",flexibleDays:7};
    expect(Object.keys(plan)).not.toContain("pension");
    expect(Object.keys(plan)).not.toContain("rent");
    expect(Object.keys(plan)).not.toContain("other");
  });
});
