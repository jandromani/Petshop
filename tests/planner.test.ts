import { describe, expect, it } from "vitest";
import { hotels } from "@/src/data/hotels";
import { buildPlan, planTotals } from "@/src/core/planner";
import { evaluateSellability } from "@/src/core/truth";

describe("planner", () => {
  it("builds a bounded annual route", () => {
    const plan = buildPlan(hotels, 2000, "solo", 90, "world");
    const totals = planTotals(plan);
    expect(plan.length).toBe(4);
    expect(totals.days).toBe(360);
    expect(totals.total).toBeGreaterThan(0);
  });

  it("keeps prices deterministic", () => {
    const a = buildPlan(hotels, 1800, "solo", 60, "value");
    const b = buildPlan(hotels, 1800, "solo", 60, "value");
    expect(a.map(x=>x.hotel.id)).toEqual(b.map(x=>x.hotel.id));
  });

  it("keeps seed records explicitly non-commercial", () => {
    expect(hotels.every(h=>evaluateSellability(h).state==="DEMO")).toBe(true);
  });
});
