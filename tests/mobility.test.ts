import { describe,expect,it } from "vitest";
import { hotels } from "@/src/data/hotels";
import { buildPlan } from "@/src/core/planner";

describe("mobility legs",()=>{
  it("adds explicit movement evidence between route stops",()=>{
    const plan=buildPlan(hotels,2200,"solo",90,"world");
    expect(plan[0].transportMode).toBe("start");
    expect(plan.slice(1).every(s=>s.transport>0&&s.transportDistanceKm>0)).toBe(true);
    expect(plan.slice(1).every(s=>["ground","flight"].includes(s.transportMode))).toBe(true);
  });
});
