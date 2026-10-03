import { describe,expect,it } from "vitest";
import { ES_DISCOVERY,esDiscoveryBySlug,esSlugForSource } from "@/src/seo/es-catalog";
import { parseSavedStays,toggleSavedStay,type SavedStay } from "@/src/core/saved-stays";

describe("final public product gaps",()=>{
  it("maps every Spanish SEO page to one canonical live intent",()=>{
    expect(ES_DISCOVERY.length).toBeGreaterThanOrEqual(3);
    expect(new Set(ES_DISCOVERY.map(x=>x.sourceSlug)).size).toBe(ES_DISCOVERY.length);
    expect(esDiscoveryBySlug("menos-de-1500-al-mes")?.sourceSlug).toBe("under-1500-month");
    expect(esSlugForSource("all-inclusive")).toBe("todo-incluido");
  });

  it("parses saved stays defensively and toggles by offer ID",()=>{
    const stay:SavedStay={
      offerId:"offer-1",slug:"hotel-1",name:"Hotel",city:"Madrid",country:"Spain",provider:"booking",
      savedMonthly:1200,currency:"EUR",verifiedAt:"2026-10-03T20:00:00Z",expiresAt:null,savedAt:"2026-10-03T20:01:00Z",
    };
    expect(parseSavedStays("not-json")).toEqual([]);
    expect(toggleSavedStay([],stay)).toHaveLength(1);
    expect(toggleSavedStay([stay],stay)).toEqual([]);
  });
});
