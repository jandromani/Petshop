import { describe, expect, it } from "vitest";
import { gateSupplyWave } from "@/workflows/supply-wave";
import { buildHumanAgenda } from "@/workflows/daily-control";

describe("durable workflow contracts", () => {
  it("passes healthy acquisition output", async () => {
    const gate = await gateSupplyWave({
      waveKey:"healthy",
      rawRecords:90,
      canonicalHotels:30,
      quoteTested:90,
      sellable:30,
      stale:0,
      quarantined:0,
      byRegion:{Europe:10,Asia:10,Africa:5,Americas:5},
    });
    expect(gate.verdict).toBe("PASS");
  });

  it("escalates empty supply", async () => {
    const gate = await gateSupplyWave({
      waveKey:"empty",
      rawRecords:0,
      canonicalHotels:0,
      quoteTested:0,
      sellable:0,
      stale:0,
      quarantined:0,
      byRegion:{},
    });
    expect(gate.verdict).toBe("REJECT");
  });

  it("builds a bounded human agenda", async () => {
    const agenda = await buildHumanAgenda([
      {key:"x",severity:"critical",message:"truth failure"},
      {key:"y",severity:"warning",message:"provider degraded"},
    ]);
    expect(agenda.targetHumanMinutes).toBe(60);
    expect(agenda.urgent).toHaveLength(1);
  });
});
