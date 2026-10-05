import { describe,expect,it } from "vitest";
import { realHotels } from "@/src/data/real-hotels";
import { overtureHotels } from "@/src/data/overture-hotels";
import { publicDirectorySnapshot } from "@/src/data/public-directory";
import { curatedGeoMatchCount } from "@/src/data/curated-enrichment";
import { publicPartnerReferences } from "@/src/adjacency/reference-partners";

describe("preproduction reality layer",()=>{
  it("contains unique curated real-directory identities with no price fields",()=>{
    expect(realHotels.length).toBeGreaterThanOrEqual(100);
    expect(new Set(realHotels.map(h=>h.id)).size).toBe(realHotels.length);
    for(const h of realHotels){
      expect(h.name.length).toBeGreaterThan(2);
      expect(["Europe","Asia","Africa","Americas"]).toContain(h.region);
      expect("monthly" in h).toBe(false);
      expect("price" in h).toBe(false);
    }
  });

  it("materializes at least 2,000 mapped Overture hotel identities without commercial claims",()=>{
    expect(overtureHotels.length).toBeGreaterThanOrEqual(2000);
    expect(overtureHotels.length).toBeLessThanOrEqual(5000);
    expect(new Set(overtureHotels.map(h=>h.sourceId)).size).toBe(overtureHotels.length);
    expect(new Set(overtureHotels.map(h=>h.market)).size).toBeGreaterThanOrEqual(30);
    expect(new Set(overtureHotels.map(h=>h.country)).size).toBeGreaterThanOrEqual(15);
    for(const h of overtureHotels){
      expect(Number.isFinite(h.lat)).toBe(true);
      expect(Number.isFinite(h.lng)).toBe(true);
      expect(h.referenceUrl.startsWith("https://")).toBe(true);
      expect(h.market.length).toBeGreaterThan(1);
      if(h.website)expect(h.website.startsWith("https://")).toBe(true);
      expect("monthly" in h).toBe(false);
      expect("price" in h).toBe(false);
    }
    expect(curatedGeoMatchCount()).toBeGreaterThanOrEqual(35);
    const snapshot=publicDirectorySnapshot(24);
    expect(snapshot.total).toBeGreaterThanOrEqual(2000);
    expect(snapshot.mapped).toBeGreaterThanOrEqual(4980);
    expect(snapshot.total-snapshot.mapped).toBeLessThanOrEqual(100);
    expect(snapshot.hotels).toHaveLength(24);
    expect(snapshot.hotels[0]?.name).toBe(realHotels[0]?.name);
    const curatedNames=new Set(realHotels.map(h=>h.name));
    expect(snapshot.hotels.slice(0,12).every(h=>curatedNames.has(h.name))).toBe(true);
  });

  it("keeps service references on HTTPS",()=>{
    expect(publicPartnerReferences.length).toBe(5);
    for(const ref of publicPartnerReferences){
      expect(new URL(ref.serviceUrl).protocol).toBe("https:");
      expect(new URL(ref.partnerProgramUrl).protocol).toBe("https:");
    }
  });
});
