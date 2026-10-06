import { describe,expect,it,vi,beforeEach } from "vitest";
import { boundedJson,HotelApplicationInput,PartnerRateInput } from "@/src/core/hotel-partner";
import { POST } from "@/app/api/hotels/apply/route";
const {createLead,rateLimit}=vi.hoisted(()=>({createLead:vi.fn(),rateLimit:vi.fn()}));
vi.mock("@/src/db/direct-supply",()=>({createHotelLead:createLead}));
vi.mock("@/src/security/rate-limit",()=>({enforceRateLimit:rateLimit,requestFingerprint:()=>"fingerprint"}));
const application={hotelName:"Hotel Atlas",city:"Madrid",country:"Spain",website:"https://example.com",contactName:"Hotel manager",contactRole:"Sales",contactEmail:"manager@example.com",contactConsent:true,company:""};
const request=(body:unknown,origin="https://atlas.test")=>new Request("https://atlas.test/api/hotels/apply",{method:"POST",headers:{origin,"Content-Type":"application/json"},body:JSON.stringify(body)});
beforeEach(()=>{createLead.mockReset();createLead.mockResolvedValue("fixture-id");rateLimit.mockReset();rateLimit.mockResolvedValue({allowed:true})});
describe("hotel intake perimeter",()=>{
  it("blocks cross-origin writes and oversized chunked bodies before storage",async()=>{
    expect((await POST(request(application,"https://attacker.test"))).status).toBe(403);
    expect(await boundedJson(request({value:"x".repeat(10000)}))).toBeNull();expect(createLead).not.toHaveBeenCalled();
  });
  it("requires consent and cannot accept identity, publication or contract overrides",async()=>{
    for(const extra of [{contactConsent:false},{canonicalHotelId:"11111111-1111-4111-8111-111111111111"},{contractVerified:true},{status:"CONTRACTED"}])expect(HotelApplicationInput.safeParse({...application,...extra}).success).toBe(false);
    expect((await POST(request({...application,contractVerified:true}))).status).toBe(400);expect(createLead).not.toHaveBeenCalled();
  });
  it("stores an unverified application with contact provenance, never a public rate",async()=>{
    const res=await POST(request(application));expect(res.status).toBe(201);
    expect(createLead).toHaveBeenCalledWith(expect.objectContaining({source:"hotel-public-application",notes:expect.objectContaining({contactConsent:true,identityVerified:false,purpose:"hotel-partnership"})}));
    const output=await res.json();expect(output).toEqual({ok:true,status:"AWAITING_CONTACT_REVIEW"});expect(output).not.toHaveProperty("id");
  });
  it("rejects bots and rate-limit overflow without touching a hotel record",async()=>{
    expect((await POST(request({...application,company:"spam"}))).status).toBe(202);expect(createLead).not.toHaveBeenCalled();
    rateLimit.mockResolvedValue({allowed:false});expect((await POST(request(application))).status).toBe(429);expect(createLead).not.toHaveBeenCalled();
  });
  it("rejects calendar rollovers, too-short validity and partner approval fields",()=>{
    const base={minNights:30,maxNights:90,maxGuests:2,board:"Breakfast",monthlyPrice:3000,currency:"EUR",validFrom:"2027-01-01",validTo:"2027-06-30",cancellation:"Free until 30 days before"};
    expect(PartnerRateInput.safeParse(base).success).toBe(true);
    for(const extra of [{validFrom:"2027-02-31"},{validTo:"2027-01-02"},{monthlyPrice:NaN},{contractVerified:true},{hotelLeadId:"other"}])expect(PartnerRateInput.safeParse({...base,...extra}).success).toBe(false);
  });
});
