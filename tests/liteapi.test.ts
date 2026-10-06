import { afterEach,describe,expect,it,vi } from "vitest";
import { LiteApiClient } from "@/src/providers/live/liteapi";
import { readinessFromStatus } from "@/src/providers/live/conformance";

const input={city:"Madrid",countryCode:"ES",guestNationality:"ES",checkIn:"2027-01-01",nights:60 as const,adults:2 as const,currency:"EUR"};
const fixture={data:[{hotelId:"lp123",roomTypes:[{offerId:"offer",offerRetailRate:{amount:6000,currency:"EUR"},rates:[{name:"Double",adultCount:2,maxOccupancy:2,retailRate:{total:[{amount:6000,currency:"EUR"}]}}]}]}]};
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
describe("LiteAPI guarded integration",()=>{
  it("is disabled without a key and cannot claim commercial readiness with a production key",()=>{
    vi.stubEnv("LITEAPI_API_KEY","");expect(readinessFromStatus(new LiteApiClient().status()).grade).toBe("DISABLED");
    vi.stubEnv("LITEAPI_API_KEY","test-only-placeholder");vi.stubEnv("LITEAPI_ENVIRONMENT","production");
    expect(readinessFromStatus(new LiteApiClient().status()).grade).toBe("DISCOVERY");
    expect(new LiteApiClient().status().commercialReady).toBe(false);
  });
  it("requests the whole 60-night stay with private headers and no paid endpoints",async()=>{
    vi.stubEnv("LITEAPI_API_KEY","test-only-placeholder");
    const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture)));vi.stubGlobal("fetch",fetch);
    const result=await new LiteApiClient().probe(input);const [url,request]=fetch.mock.calls[0];
    expect(url).toBe("https://api.liteapi.travel/v3.0/hotels/rates");
    expect(JSON.parse(request.body)).toMatchObject({checkin:"2027-01-01",checkout:"2027-03-02",occupancies:[{adults:2}],cityName:"Madrid",countryCode:"ES"});
    expect(request.headers["X-API-Key"]).toBe("test-only-placeholder");
    expect(result).toMatchObject({sellable:false,environment:"sandbox",count:1});
    expect(result.observations[0]).toMatchObject({totalStayAmount:6000,currency:"EUR"});
    expect(JSON.stringify(result)).not.toContain("test-only-placeholder");
  });
  it("quarantines currency, occupancy and inconsistent offer totals instead of inventing a price",async()=>{
    vi.stubEnv("LITEAPI_API_KEY","test-only-placeholder");
    for(const mutation of [(v:any)=>v.data[0].roomTypes[0].rates[0].retailRate.total[0].currency="USD",(v:any)=>v.data[0].roomTypes[0].rates[0].adultCount=1,(v:any)=>v.data[0].roomTypes[0].offerRetailRate.amount=1]){
      const altered=structuredClone(fixture);mutation(altered);vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify(altered))));
      expect((await new LiteApiClient().probe(input)).count).toBe(0);
    }
  });
  it("handles supplier no-availability responses and rejects malformed evidence",async()=>{
    vi.stubEnv("LITEAPI_API_KEY","test-only-placeholder");
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(null,{status:204})));
    expect((await new LiteApiClient().probe(input)).count).toBe(0);
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response('{"data":"broken"}')));
    await expect(new LiteApiClient().probe(input)).rejects.toThrow();
  });
});
