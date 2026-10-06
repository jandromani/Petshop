import { afterEach,describe,expect,it,vi } from "vitest";
import { publicSearchQuery,shareSearchInput,comparisonIds } from "@/src/core/shared-search";
import { offerMatchesRequest } from "@/src/db/customer-requests";
import { campaignUrl,csvCell } from "@/src/growth/campaigns";
import { consentedAttribution } from "@/src/growth/attribution";
import { CONSENT_VERSION } from "@/src/privacy/consent";
import { informationalIndexingEnabled,localizedMetadata } from "@/src/seo/public";
import { seoAutopilotEnabled } from "@/src/seo/live";
import { boundedJson,sameOrigin } from "@/src/security/public-request";
import { localizedHref } from "@/src/i18n/config";
import { sendSourcingReceipt } from "@/src/services/sourcing-email";
import type { LiveCatalogOffer } from "@/src/core/live-offers";
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
describe("public sharing and private attribution",()=>{
 it("keeps deterministic filters and map state while removing credentials, contact and ad identifiers",()=>{
  const result=new URLSearchParams(publicSearchQuery("q=Madrid&duration=60&occupancy=2&selected=overture-1&view=map&email=a%40example.com&access=secret&gclid=paid&returnTo=https%3A%2F%2Fevil.test&utm_campaign=private"));
  expect(Object.fromEntries(result)).toEqual({q:"Madrid",duration:"60",occupancy:"2",selected:"overture-1",view:"map"});
  expect(publicSearchQuery("q=%3Cscript%3E&region=Europe")).toBe("region=Europe");
  expect(shareSearchInput.safeParse({query:"",hotelIds:["one1","two2","three3","four4"]}).success).toBe(false);
  expect(shareSearchInput.safeParse({query:"",hotelIds:["../ops"]}).success).toBe(false);
  expect(comparisonIds("hotel-1,hotel-1,../ops,hotel-2,hotel-3,hotel-4")).toEqual(["hotel-1","hotel-2","hotel-3"]);
 });
 it("records campaign and click identifiers only under the current analytics contract",()=>{
  const values:Record<string,string>={rv_consent:"analytics",rv_consent_v:CONSENT_VERSION,rv_src:"google",rv_campaign:"winter",rv_gclid:"click-123"};
  const jar={get:(key:string)=>values[key]?{name:key,value:values[key]}:undefined};
  expect(consentedAttribution(jar)).toEqual({source:"google",campaign:"winter",gclid:"click-123"});
  values.rv_consent="essential";expect(consentedAttribution(jar)).toEqual({});
  values.rv_consent="analytics";values.rv_consent_v="expired";expect(consentedAttribution(jar)).toEqual({});
 });
 it("generates destination campaign links and neutralizes spreadsheet formulas",()=>{
  vi.stubEnv("NEXT_PUBLIC_SITE_URL","https://atlas-living-ten.vercel.app");
  const url=new URL(campaignUrl({destination:"tenerife",language:"es",channel:"google",campaign:"winter budget",creative:"search"}));
  expect(url.pathname).toBe("/es/monthly-stays/tenerife");expect(url.searchParams.get("utm_medium")).toBe("cpc");expect(url.searchParams.get("utm_campaign")).toBe("winter-budget");
  expect(csvCell('=HYPERLINK("evil")')).toBe('"\'=HYPERLINK(""evil"")"');
  expect(csvCell("plain,text")).toBe('"plain,text"');
 });
});
describe("quote identity and public SEO",()=>{
 const request={hotel_name:"Hôtel Atlas",city:"Madrid",country:"Spain",check_in:"2027-02-01",nights:60,occupancy:2};
 const offer={name:"Hotel Atlas",city:"Madrid",country:"Spain",checkIn:"2027-02-01",nights:60,occupancy:2} as LiveCatalogOffer;
 it("rejects similarly named hotels and different cities, dates, durations or guests",()=>{
  expect(offerMatchesRequest(request,offer)).toBe(true);
  for(const change of [{name:"Hotel Atlas Airport"},{city:"Barcelona"},{country:"Portugal"},{checkIn:"2027-02-02"},{nights:30},{occupancy:1}])expect(offerMatchesRequest(request,{...offer,...change})).toBe(false);
 });
 it("indexes approved information without opening unverified commercial SEO or previews",()=>{
  vi.stubEnv("NEXT_PUBLIC_SITE_URL","https://atlas-living-ten.vercel.app");vi.stubEnv("SEO_PUBLIC_INDEXING","true");vi.stubEnv("SEO_LIVE_INDEXING","false");vi.stubEnv("VERCEL_ENV","production");
  expect(informationalIndexingEnabled()).toBe(true);expect(seoAutopilotEnabled()).toBe(false);
  const m=localizedMetadata("/stays", "es","Buscar","Descubre hoteles");expect(m.alternates?.canonical).toBe("https://atlas-living-ten.vercel.app/es/stays");expect(m.alternates?.languages?.en).toBe("https://atlas-living-ten.vercel.app/stays");expect(m.robots).toEqual({index:false,follow:true});
  vi.stubEnv("VERCEL_ENV","preview");expect(informationalIndexingEnabled()).toBe(false);
  expect(localizedHref("/api/referral?offer=123","es")).toBe("/api/referral?offer=123");expect(localizedHref("/es/stays?duration=60","en")).toBe("/stays?duration=60");
 });
});
describe("public forms and transactional email",()=>{
 it("fails closed on cross-origin or oversized JSON",async()=>{
  expect(sameOrigin(new Request("https://atlas.test/api/requests",{headers:{origin:"https://evil.test"}}))).toBe(false);
  expect(sameOrigin(new Request("https://atlas.test/api/requests",{headers:{origin:"https://atlas.test"}}))).toBe(true);
  expect(await boundedJson(new Request("https://atlas.test",{method:"POST",body:JSON.stringify({text:"x".repeat(9000)})}))).toBeNull();
 });
 it("does not send mail without configuration and distinguishes accepted from delivery",async()=>{
  const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);vi.stubEnv("RESEND_API_KEY","");vi.stubEnv("ATLAS_EMAIL_FROM","");
  const input={to:"qa@example.com",hotelName:'<script>alert("x")</script>',city:"Madrid",checkIn:"2027-02-01",nights:60,requestId:"request",language:"es" as const,path:"/es/requests#access=public-test-token",idempotencyKey:"stable-test-key"};
  expect((await sendSourcingReceipt(input)).reason).toBe("not-configured");expect(fetcher).not.toHaveBeenCalled();
  vi.stubEnv("RESEND_API_KEY","unit-test-placeholder");vi.stubEnv("ATLAS_EMAIL_FROM","Atlas <qa@example.com>");fetcher.mockResolvedValue(new Response(JSON.stringify({id:"provider-accepted-id"}),{status:200}));
  const result=await sendSourcingReceipt(input);expect(result).toEqual({sent:true,reason:"accepted",messageId:"provider-accepted-id"});
  const options=fetcher.mock.calls[0][1];expect(options.headers["Idempotency-Key"]).toBe("stable-test-key");const body=JSON.parse(options.body);expect(body.html).not.toContain("<script>");expect(body.html).toContain("Seguir mi solicitud");expect(body.subject).toContain("Tu solicitud");
 });
});
