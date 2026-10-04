import { afterEach,describe,expect,it } from "vitest";
import { usageCostCents } from "@/src/db/agents";
import { filterLiveDiscovery,liveDiscoveryMode,uniqueDiscoveryNarrative } from "@/src/seo/live";
import { legalIdentity } from "@/src/system/legal";
import { hasAnalyticsConsent } from "@/src/privacy/consent";
import { runGovernedAgent } from "@/src/services/governed-agent";
import { llmTimeoutMs } from "@/src/agents/llm";
import type { LiveCatalogOffer } from "@/src/core/live-offers";
import { runRequiredJudges } from "@/src/judges/rules";
import { agentForSignal } from "@/src/agents/router";
import { computeSilverFit } from "@/src/core/silver-score";
import { adjacencyPartners,safeAdjacencyTarget } from "@/src/adjacency/registry";

const offer=(overrides:Partial<LiveCatalogOffer>={}):LiveCatalogOffer=>({
  offerId:"1",offerKind:"snapshot",hotelId:"h",slug:"s",name:"Hotel",city:"City",country:"Spain",region:"Europe",
  lat:null,lng:null,provider:"booking",checkIn:"2027-01-01",checkOut:"2027-02-01",nights:31,occupancy:1,
  board:"All inclusive",roomType:null,displayPrice:1200,currency:"EUR",verifiedAt:"2026-10-03T00:00:00Z",
  expiresAt:"2027-01-01T00:00:00Z",confidence:.99,monthlyEquivalent:1161.29,...overrides,
});

describe("R9-R11 governance contracts",()=>{
  const original={...process.env};
  afterEach(()=>{
    for(const key of ["LEGAL_OPERATOR_NAME","LEGAL_CONTACT_EMAIL","LEGAL_COUNTRY","ADJ_FLIGHT_NAME","ADJ_FLIGHT_KEY","ADJ_FLIGHT_URL","ADJ_FLIGHT_TRACKING_PARAM"]) delete process.env[key];
    Object.assign(process.env,original);
  });

  it("fails closed when the autonomous runtime is disabled",async()=>{
    process.env.AGENT_RUNTIME_ENABLED="false";
    const result=await runGovernedAgent({agent:"orchestrator",objective:"test"});
    expect(result).toMatchObject({ok:false,status:503,error:"agent-runtime-disabled"});
    delete process.env.AGENT_RUNTIME_ENABLED;
  });

  it("bounds external model timeouts",()=>{
    process.env.AGENT_LLM_TIMEOUT_MS="999999";
    expect(llmTimeoutMs()).toBe(60000);
    process.env.AGENT_LLM_TIMEOUT_MS="1";
    expect(llmTimeoutMs()).toBe(3000);
    delete process.env.AGENT_LLM_TIMEOUT_MS;
    expect(llmTimeoutMs()).toBe(20000);
  });

  it("normalizes reported model cost to cents without inventing missing cost",()=>{
    expect(usageCostCents({cost:0.0123})).toBe(1);
    expect(usageCostCents({cost:"1.23"})).toBe(123);
    expect(usageCostCents({tokens:1000})).toBe(0);
  });

  it("keeps unsupported discovery intents out of the live SEO lane",()=>{
    expect(liveDiscoveryMode("winter-sun")).toBe("unsupported");
    expect(filterLiveDiscovery("winter-sun",[offer()])).toEqual([]);
  });

  it("filters evidence-backed discovery intents deterministically",()=>{
    expect(filterLiveDiscovery("under-1500-month",[offer(),offer({offerId:"2",monthlyEquivalent:1700})])).toHaveLength(1);
    expect(filterLiveDiscovery("all-inclusive",[offer({board:"ALL-INCLUSIVE"})])).toHaveLength(1);
    expect(filterLiveDiscovery("best-value-asia",[offer({region:"Asia"})])).toHaveLength(1);
  });


  it("routes operational signals to specialist roles",()=>{
    expect(agentForSignal("supply.providers")).toBe("supply-scout");
    expect(agentForSignal("revenue.anomaly")).toBe("revenue-reconciler");
    expect(agentForSignal("security.auth")).toBe("engineering");
  });

  it("runs every declared deterministic judge and fails unknown judges closed",()=>{
    const checks=runRequiredJudges(["seo","revenue","security","reliability"],"Evidence-backed proposal only. No execution claim.");
    expect(checks.map(x=>x.judge)).toEqual(["truth","seo","revenue","security","reliability"]);
    expect(runRequiredJudges(["unknown"],"test").find(x=>x.judge==="unknown")?.verdict).toBe("REVISION");
  });

  it("evaluates narrative uniqueness instead of hardcoding it",()=>{
    expect(uniqueDiscoveryNarrative("under-1500-month")).toBe(true);
    expect(uniqueDiscoveryNarrative("not-a-page")).toBe(false);
  });

  it("computes Silver Fit from observable stay evidence",()=>{
    const rich=computeSilverFit({
      nights:90,board:"Half board",roomType:"double",cancellation:"Free cancellation",
      taxesIncluded:true,facilities:["Lift","Pool","WiFi","Restaurant","Gym","Clinic"],
      photoUrls:["https://example.com/1.jpg","https://example.com/2.jpg","https://example.com/3.jpg","https://example.com/4.jpg","https://example.com/5.jpg"],
      description:"A fully described property.",confidence:.99,
    });
    const sparse=computeSilverFit({nights:30,confidence:.7});
    expect(rich.score).toBeGreaterThan(sparse.score);
    expect(rich.breakdown.reduce((n,x)=>n+x.max,0)).toBe(100);
  });

  it("keeps adjacency partners disabled until a complete HTTPS configuration exists",()=>{
    expect(adjacencyPartners().find(x=>x.kind==="flight")?.configured).toBe(false);
    process.env.ADJ_FLIGHT_NAME="Flight Partner";
    process.env.ADJ_FLIGHT_KEY="flight-1";
    process.env.ADJ_FLIGHT_URL="https://travel.example/search";
    const flight=adjacencyPartners().find(x=>x.kind==="flight")!;
    expect(flight.configured).toBe(true);
    expect(safeAdjacencyTarget(flight)?.hostname).toBe("travel.example");
    process.env.ADJ_FLIGHT_URL="http://travel.example/search";
    expect(adjacencyPartners().find(x=>x.kind==="flight")?.configured).toBe(false);
  });

  it("requires explicit analytics consent before persistent measurement",()=>{
    expect(hasAnalyticsConsent("")).toBe(false);
    expect(hasAnalyticsConsent("rv_consent=essential")).toBe(false);
    expect(hasAnalyticsConsent("foo=1; rv_consent=analytics; bar=2")).toBe(true);
  });

  it("blocks commercial activation until operator identity is configured",()=>{
    delete process.env.LEGAL_OPERATOR_NAME;
    delete process.env.LEGAL_CONTACT_EMAIL;
    delete process.env.LEGAL_COUNTRY;
    expect(legalIdentity().configured).toBe(false);
    process.env.LEGAL_OPERATOR_NAME="Example Operator";
    process.env.LEGAL_CONTACT_EMAIL="ops@example.com";
    process.env.LEGAL_COUNTRY="Spain";
    expect(legalIdentity()).toMatchObject({configured:true,operator:"Example Operator",country:"Spain"});
  });
});
