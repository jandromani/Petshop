import { describe, expect, it } from "vitest";
import { MockProvider } from "@/src/providers/mock";
import { runSeedAcquisitionWave } from "@/src/services/acquisition";
import { AGENTS } from "@/src/agents/registry";
import { deterministicBrandJudge, deterministicTruthJudge } from "@/src/judges/rules";

describe("provider contract", () => {
  it("discovers and quotes deterministic seed inventory", async () => {
    const provider = new MockProvider();
    const hotels = await provider.discover({ city: "Antalya" });
    expect(hotels.length).toBe(1);

    const quote = await provider.quote({
      providerHotelId: hotels[0].providerHotelId,
      checkIn: "2027-01-01",
      checkOut: "2027-04-01",
      occupancy: 1,
    });

    expect(quote?.currency).toBe("EUR");
    expect(quote?.totalPrice).toBeGreaterThan(0);
    expect(quote?.rawEvidence.seed).toBe(true);
  });
});

describe("acquisition waves", () => {
  it("produces auditable counts", () => {
    const wave = runSeedAcquisitionWave({
      waveKey: "test-europe",
      regions: ["Europe"],
      providers: ["booking", "ratehawk", "hbx"],
      durations: [30, 60, 90],
    });
    expect(wave.canonicalHotels).toBeGreaterThan(0);
    expect(wave.rawRecords).toBe(wave.canonicalHotels * 3);
    expect(wave.quoteTested).toBe(wave.canonicalHotels * 3);
    expect(wave.sellable + wave.stale + wave.quarantined).toBe(wave.canonicalHotels);
  });
});

describe("agent authority", () => {
  it("never gives agents money-commit or publication authority in v1", () => {
    for (const policy of Object.values(AGENTS)) {
      expect(policy.canCommitMoney).toBe(false);
      expect(policy.canPublish).toBe(false);
      expect(policy.requiredJudges.length).toBeGreaterThan(0);
    }
  });
});

describe("external deterministic judges", () => {
  it("rejects unsupported commercial certainty", () => {
    expect(deterministicTruthJudge("Guaranteed live price €1200, book now.").verdict).not.toBe("PASS");
  });

  it("protects freedom-first brand", () => {
    expect(deterministicBrandJudge("A hotel platform for old people and elderly users.").verdict).toBe("REVISION");
  });
});
