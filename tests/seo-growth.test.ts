import { describe,expect,it } from "vitest";
import { chooseVariant } from "@/src/growth/experiments";
import { seoGate } from "@/src/seo/gate";

describe("experimentation",()=>{
  it("assigns the same visitor deterministically",()=>{
    expect(chooseVariant("hero","visitor-1",["a","b"] as const)).toBe(chooseVariant("hero","visitor-1",["a","b"] as const));
  });
});

describe("SEO gate",()=>{
  it("refuses indexing without live evidence",()=>{
    const gate=seoGate({liveIndexingEnabled:true,sellableHotels:10,uniqueCountries:2,hasFreshProviderEvidence:false,uniqueNarrative:true});
    expect(gate.index).toBe(false);
  });
  it("passes a fully evidenced page",()=>{
    const gate=seoGate({liveIndexingEnabled:true,sellableHotels:10,uniqueCountries:2,hasFreshProviderEvidence:true,uniqueNarrative:true});
    expect(gate.index).toBe(true);
  });
});
