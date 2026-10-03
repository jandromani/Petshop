import { afterEach,describe,expect,it } from "vitest";
import { readinessFromStatus } from "@/src/providers/live/conformance";
import { liveProviderRegistry } from "@/src/providers/live/registry";

const keys=[
  "BOOKING_API_KEY","BOOKING_AFFILIATE_ID",
  "RATEHAWK_KEY_ID","RATEHAWK_API_KEY","RATEHAWK_BOOKING_ENABLED",
  "HBX_API_KEY","HBX_SECRET","HBX_BOOKING_ENABLED","HBX_MTLS_READY","HBX_PRICING_MODE","HBX_MARKUP_PERCENT",
];
const original=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
afterEach(()=>{
  for(const key of keys){
    const value=original[key];
    if(value===undefined) delete process.env[key]; else process.env[key]=value;
  }
});

describe("provider conformance",()=>{
  it("marks every provider disabled when credentials are absent",()=>{
    for(const key of keys) delete process.env[key];
    const providers=Object.values(liveProviderRegistry());
    for(const provider of providers){
      const report=readinessFromStatus(provider.status());
      expect(report.grade).toBe("DISABLED");
      expect(report.commercialReady).toBe(false);
    }
  });

  it("does not equate configured credentials with commercial readiness",()=>{
    const report=readinessFromStatus({
      provider:"example",
      configured:true,
      environment:"production",
      missingEnv:[],
      notes:[],
      commercialReady:false,
      blockers:["prebook not verified"],
    });
    expect(report.grade).toBe("DISCOVERY");
    expect(report.blockers).toContain("prebook not verified");
  });

  it("only emits COMMERCIAL_READY when both configured and explicitly ready",()=>{
    const report=readinessFromStatus({
      provider:"example",
      configured:true,
      environment:"production",
      missingEnv:[],
      notes:[],
      commercialReady:true,
      blockers:[],
    });
    expect(report.grade).toBe("COMMERCIAL_READY");
  });
});
