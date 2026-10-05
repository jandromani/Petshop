import { describe,expect,it } from "vitest";
import { chooseVariant } from "@/src/growth/experiments";
import { seoGate } from "@/src/seo/gate";
import { seoAutopilotEnabled } from "@/src/seo/live";
import { destinationSeoPages } from "@/src/seo/destinations";

describe("experimentation",()=>{
  it("assigns the same visitor deterministically",()=>{
    expect(chooseVariant("hero","visitor-1",["a","b"] as const)).toBe(chooseVariant("hero","visitor-1",["a","b"] as const));
  });
});

describe("SEO gate",()=>{
  it("refuses indexing without live evidence",()=>{
    const gate=seoGate({liveIndexingEnabled:true,customDomain:true,searchConsoleReady:true,uniqueCanonical:true,uniqueCopy:true,sellableHotels:10,uniqueCountries:2,hasFreshProviderEvidence:false,nonEmptyIntent:true,structuredDataValid:true});
    expect(gate.index).toBe(false);
  });

  it("passes a fully evidenced page",()=>{
    const gate=seoGate({liveIndexingEnabled:true,customDomain:true,searchConsoleReady:true,uniqueCanonical:true,uniqueCopy:true,sellableHotels:10,uniqueCountries:2,hasFreshProviderEvidence:true,nonEmptyIntent:true,structuredDataValid:true});
    expect(gate.index).toBe(true);
  });

  it("builds substantial programmatic destination pages from real hotel evidence",()=>{
    expect(destinationSeoPages.length).toBeGreaterThanOrEqual(30);
    expect(destinationSeoPages.filter(x=>x.indexable).length).toBeGreaterThanOrEqual(30);
    expect(destinationSeoPages.every(x=>x.hotels>0&&x.mapped>0)).toBe(true);
  });

  it("keeps auto indexing closed on temporary Vercel hosts and opens on verified custom domains",()=>{
    const oldSite=process.env.NEXT_PUBLIC_SITE_URL;
    const oldVerify=process.env.GOOGLE_SITE_VERIFICATION;
    const oldMode=process.env.SEO_LIVE_INDEXING;
    try{
      process.env.SEO_LIVE_INDEXING="auto";
      process.env.GOOGLE_SITE_VERIFICATION="token";
      process.env.NEXT_PUBLIC_SITE_URL="https://atlas-living.vercel.app";
      expect(seoAutopilotEnabled()).toBe(false);
      process.env.NEXT_PUBLIC_SITE_URL="https://atlas.example";
      expect(seoAutopilotEnabled()).toBe(true);
      delete process.env.GOOGLE_SITE_VERIFICATION;
      expect(seoAutopilotEnabled()).toBe(false);
    }finally{
      if(oldSite===undefined)delete process.env.NEXT_PUBLIC_SITE_URL;else process.env.NEXT_PUBLIC_SITE_URL=oldSite;
      if(oldVerify===undefined)delete process.env.GOOGLE_SITE_VERIFICATION;else process.env.GOOGLE_SITE_VERIFICATION=oldVerify;
      if(oldMode===undefined)delete process.env.SEO_LIVE_INDEXING;else process.env.SEO_LIVE_INDEXING=oldMode;
    }
  });
});
