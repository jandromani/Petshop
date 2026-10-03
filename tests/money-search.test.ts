import { describe,expect,it } from "vitest";
import { hotels } from "@/src/data/hotels";
import { summarizeFinances,routeHeadroom } from "@/src/core/finance";
import { buildPlan,planTotals } from "@/src/core/planner";
import { filterDemoHotels } from "@/src/core/search";

describe("R0 money truth",()=>{
  it("adds every recurring income source before reserving money",()=>{
    const f=summarizeFinances({pension:1700,homeIncome:1300,otherIncome:200,reserve:1150});
    expect(f.monthlyResources).toBe(3200);
    expect(f.livingBudget).toBe(2050);
  });
  it("never lets reserve exceed resources",()=>{
    expect(summarizeFinances({pension:1000,homeIncome:0,otherIncome:0,reserve:5000}).livingBudget).toBe(0);
  });
  it("separates route headroom from total headroom",()=>{
    const f=summarizeFinances({pension:1700,homeIncome:1300,otherIncome:200,reserve:1150});
    expect(routeHeadroom(f,1143)).toEqual({withinLivingBudget:true,livingBudgetHeadroom:907,totalMonthlyHeadroom:2057});
  });
  it("builds exactly 365 days without exceeding monthly living budget",()=>{
    const budget=1500;
    for(const duration of [30,60,90,120,180] as const){
      const plan=buildPlan(hotels,budget,"solo",duration,"world");
      const totals=planTotals(plan);
      expect(totals.days).toBe(365);
      expect(totals.averageMonthly).toBeLessThanOrEqual(budget);
      expect(plan.every(s=>s.effectiveMonthly<=budget)).toBe(true);
    }
  });
  it("returns no route instead of silently overspending",()=>{
    expect(buildPlan(hotels,100,"solo",90,"world")).toEqual([]);
  });
});

describe("R1 search contract",()=>{
  it("uses the same budget filter as the search result count",()=>{
    const rows=filterDemoHotels(hotels,{query:"",region:"All",checkIn:"2027-01-15",flexibleDays:7,duration:90,party:"couple",maxMonthly:1500});
    expect(rows.every(h=>Math.round(h.monthly*h.coupleFactor)<=1500)).toBe(true);
  });
});
