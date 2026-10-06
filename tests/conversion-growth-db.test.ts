import { afterAll,afterEach,beforeAll,beforeEach,describe,expect,it,vi } from "vitest";
import { getDatabase } from "@/src/db/client";
import { ensureSavedProfile } from "@/src/db/consumer-memory";
import { createSourcingRequest } from "@/src/db/sourcing";
import { createSharedSearch,getSharedSearch } from "@/src/db/shared-search";
import { createRequestAccess,requestIdFromAccess,customerRequests,attachVerifiedQuote,acceptCustomerQuote } from "@/src/db/customer-requests";
import { createDirectRate,createHotelLead,publishDirectRate,verifyDirectRate } from "@/src/db/direct-supply";
import { configureMerchantRate } from "@/src/db/merchant";
import { queueSourcingEmail,drainSourcingEmail } from "@/src/services/sourcing-delivery";
const enabled=Boolean(process.env.DATABASE_URL),tag=crypto.randomUUID(),hotelName="CI Growth "+tag;
let profileA="",profileB="",requestA="",requestB="",lead="",rate="",rate2="",share="";
describe.skipIf(!enabled)("conversion and growth persistence",()=>{
 beforeEach(()=>{vi.stubEnv("ATLAS_MERCHANT_CHECKOUT_ENABLED","true");vi.stubEnv("STRIPE_SECRET_KEY","ci-placeholder");vi.stubEnv("STRIPE_WEBHOOK_SECRET","ci-placeholder")});
 beforeAll(async()=>{
  profileA=(await ensureSavedProfile(null))!;profileB=(await ensureSavedProfile(null))!;
  const base={directoryHotelId:"ci-growth-"+tag,hotelName,city:"Las Palmas",country:"Spain",checkIn:"2027-02-01",nights:60 as const,occupancy:2 as const,requesterEmail:"ci-growth@example.com",contactConsent:true,language:"es" as const,acquisition:{source:"google",campaign:"ci",gclid:"ci-click"}};
  requestA=(await createSourcingRequest({...base,requesterHash:"ci-growth-a-"+tag,consumerProfileId:profileA}))!.id;
  requestB=(await createSourcingRequest({...base,requesterHash:"ci-growth-b-"+tag,consumerProfileId:profileB}))!.id;
  lead=(await createHotelLead({hotelName,city:"Las Palmas",country:"Spain",region:"Europe",lat:28.12,lng:-15.43,source:"ci"}))!;
  for(const code of ["GROWTH-A","GROWTH-B"]){
   const id=(await createDirectRate({hotelLeadId:lead,rateCode:code,minNights:30,maxNights:90,maxGuests:2,monthlyPrice:1800,currency:"EUR",validFrom:"2027-01-01",validTo:"2027-12-31",cancellation:"Refundable until 30 days before check-in"}))!;
   await configureMerchantRate({id,channelModel:"EXCLUSIVE_MERCHANT",hotelNetMonthly:1450,inventoryUnits:2,merchantTermsVerified:true});await verifyDirectRate({id,contractReference:"CI-GROWTH"});expect((await publishDirectRate(id)).published).toBe(true);
   if(!rate)rate=id;else rate2=id;
  }
 });
 afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
 afterAll(async()=>{
  const sql=getDatabase();if(!sql)return;
  await sql`delete from sourcing_requests where id in (${requestA}::uuid,${requestB}::uuid)`;
  if(share)await sql`delete from shared_searches where id=${share}`;
  await sql`delete from consumer_profiles where id in (${profileA}::uuid,${profileB}::uuid)`;
  if(lead)await sql`delete from hotel_leads where id=${lead}::uuid`;
  await sql`delete from canonical_hotels where name=${hotelName}`;
 });
 it("isolates profiles and limits an email access link to one request",async()=>{
  expect((await customerRequests(profileA)).map(r=>r.id)).toEqual([requestA]);expect((await customerRequests(profileB)).map(r=>r.id)).toEqual([requestB]);expect(await customerRequests(undefined)).toEqual([]);
  const token=(await createRequestAccess(requestA))!;expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);expect(await requestIdFromAccess(token)).toBe(requestA);
  const fromEmail=await customerRequests(undefined,token);expect(fromEmail.map(r=>r.id)).toEqual([requestA]);expect(JSON.stringify(fromEmail)).not.toContain("ci-growth@example.com");
  const sql=getDatabase()!;const hashes=await sql`select token_hash from sourcing_access where request_id=${requestA}::uuid`;expect(hashes.every(r=>r.token_hash!==token)).toBe(true);
  await sql`update sourcing_access set expires_at=now()-interval '1 second' where request_id=${requestA}::uuid`;expect(await requestIdFromAccess(token)).toBeNull();expect(await customerRequests(undefined,token)).toEqual([]);
 });
 it("shares only public state and expires short URLs",async()=>{
  const row=(await createSharedSearch("q=Madrid&duration=60&email=private&gclid=paid&access=secret",["hotel-one","hotel-two"],"es"))!;share=row.id;
  const stored=(await getSharedSearch(share))!;expect(stored.search_query).toBe("q=Madrid&duration=60");expect(stored.hotel_ids).toEqual(["hotel-one","hotel-two"]);
  await getDatabase()!`update shared_searches set expires_at=now()-interval '1 second' where id=${share}`;expect(await getSharedSearch(share)).toBeNull();
 });
 it("publishes an exact quote, rejects another profile, and tracks continuation separately from booking",async()=>{
  expect(await attachVerifiedQuote(requestA,crypto.randomUUID())).toBe(false);expect(await attachVerifiedQuote(requestA,rate)).toBe(true);
  const own=(await customerRequests(profileA))[0];expect(own.offer?.displayPrice).toBe(3600);expect(own.offer?.nights).toBe(60);expect(own.offer?.occupancy).toBe(2);
  expect(await acceptCustomerQuote(requestA,profileB)).toBeNull();expect(await acceptCustomerQuote(requestA,profileA)).toContain("/es/checkout/"+rate);
  expect((await customerRequests(profileA))[0].quote_accepted_at).toBeTruthy();
  const orders=await getDatabase()!`select id from merchant_orders where sourcing_request_id=${requestA}::uuid`;expect(orders).toHaveLength(0);
  await getDatabase()!`update direct_rate_offers set publication_state='PAUSED' where id=${rate}::uuid`;expect((await customerRequests(profileA))[0].offer).toBeNull();expect(await acceptCustomerQuote(requestA,profileA)).toBeNull();
 });
 it("retains emails until configured, claims a receipt once, and rejects obsolete quote emails",async()=>{
  await queueSourcingEmail(requestA,"receipt");await queueSourcingEmail(requestA,"receipt");
  vi.stubEnv("RESEND_API_KEY","");vi.stubEnv("ATLAS_EMAIL_FROM","");expect((await drainSourcingEmail()).configured).toBe(false);
  const sql=getDatabase()!;expect((await sql`select attempts from sourcing_mail_queue where request_id=${requestA}::uuid and kind='receipt'`)[0].attempts).toBe(0);
  vi.stubEnv("RESEND_API_KEY","ci-placeholder");vi.stubEnv("ATLAS_EMAIL_FROM","Atlas <ci@example.com>");vi.stubEnv("OPS_ACCESS_KEY","ci-mail-stable-placeholder");
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:"ci-accepted"}),{status:200}));vi.stubGlobal("fetch",fetcher);
  const result=await Promise.all([drainSourcingEmail(1),drainSourcingEmail(1)]);expect(result.reduce((n,x)=>n+x.accepted,0)).toBe(1);expect(fetcher).toHaveBeenCalledTimes(1);
  expect((await sql`select state from sourcing_mail_queue where request_id=${requestA}::uuid and kind='receipt'`)[0].state).toBe("SENT");
  await queueSourcingEmail(requestA,"match");expect(await attachVerifiedQuote(requestA,rate2)).toBe(true);await queueSourcingEmail(requestA,"match");
  fetcher.mockImplementation(()=>Promise.resolve(new Response(JSON.stringify({id:"ci-new-quote"}),{status:200})));
  const sent=await drainSourcingEmail();expect(sent.accepted).toBe(1);expect(sent.failed).toBe(1);expect(fetcher).toHaveBeenCalledTimes(2);
  const old=await sql`select state,last_error from sourcing_mail_queue where request_id=${requestA}::uuid and kind='match' and version=${rate}`;expect(old[0].state).toBe("FAILED");expect(old[0].last_error).toBe("contact-or-quote-unavailable");
 });
});
