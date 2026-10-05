import { afterAll,describe,expect,it } from "vitest";
import { getDatabase } from "@/src/db/client";
import { createDirectRate,createHotelLead,publishDirectRate,verifyDirectRate } from "@/src/db/direct-supply";
import { claimMerchantPaymentEvent,configureMerchantRate,createMerchantOrder,finishMerchantPaymentEvent,getMerchantCheckoutQuote,releaseMerchantOrder } from "@/src/db/merchant";

const enabled=Boolean(process.env.DATABASE_URL);const token=crypto.randomUUID();let leadId="";let rateId="";const hotelName="CI Merchant "+token;

describe.skipIf(!enabled)("managed marketplace persistence",()=>{
  afterAll(async()=>{const sql=getDatabase();if(!sql)return;if(rateId)await sql`delete from merchant_orders where direct_rate_offer_id=${rateId}::uuid`;await sql`delete from merchant_payment_events where event_id like ${"evt_ci_"+token+"%"}`;if(leadId)await sql`delete from hotel_leads where id=${leadId}::uuid`;await sql`delete from canonical_hotels where name=${hotelName}`;});
  it("uses interval-aware allocated inventory instead of globally burning units",async()=>{
    leadId=(await createHotelLead({hotelName,city:"Las Palmas",country:"Spain",region:"Europe",lat:28.12,lng:-15.43,source:"ci"}))||"";expect(leadId).toBeTruthy();
    rateId=(await createDirectRate({hotelLeadId:leadId,rateCode:"CI-MERCHANT",minNights:30,maxNights:90,maxGuests:2,monthlyPrice:1800,currency:"EUR",validFrom:"2027-01-01",validTo:"2027-12-31",cancellation:"Refundable until 30 days before check-in"}))||"";expect(rateId).toBeTruthy();
    expect(await configureMerchantRate({id:rateId,channelModel:"EXCLUSIVE_MERCHANT",hotelNetMonthly:1450,inventoryUnits:2,merchantTermsVerified:true})).toBe(rateId);
    expect(await verifyDirectRate({id:rateId,contractReference:"CI-CONTRACT"})).toBe(rateId);
    const published=await publishDirectRate(rateId);expect(published.published).toBe(true);
    const quote=await getMerchantCheckoutQuote({offerId:rateId,checkIn:"2027-02-01",nights:60,occupancy:2});expect(quote?.customerTotal).toBe(3600);expect(quote?.hotelCost).toBe(2900);expect(quote?.platformRevenue).toBe(700);expect(quote?.availableUnits).toBe(2);
    const first=await createMerchantOrder({offerId:rateId,customerEmail:"ci1@example.com",checkIn:"2027-02-01",nights:60,occupancy:2});expect(first?.id).toBeTruthy();
    const second=await createMerchantOrder({offerId:rateId,customerEmail:"ci2@example.com",checkIn:"2027-02-15",nights:30,occupancy:1});expect(second?.id).toBeTruthy();
    expect((await getMerchantCheckoutQuote({offerId:rateId,checkIn:"2027-02-20",nights:30,occupancy:1}))).toBeNull();
    const nonOverlap=await getMerchantCheckoutQuote({offerId:rateId,checkIn:"2027-06-01",nights:60,occupancy:2});expect(nonOverlap?.availableUnits).toBe(2);
    expect(await releaseMerchantOrder(first!.id,"CANCELLED")).toBe(true);
    const afterRelease=await getMerchantCheckoutQuote({offerId:rateId,checkIn:"2027-02-20",nights:30,occupancy:1});expect(afterRelease?.availableUnits).toBe(1);
    expect(await releaseMerchantOrder(second!.id,"CANCELLED")).toBe(true);
  });
  it("makes Stripe event claims retryable after processing failure",async()=>{
    const eventId="evt_ci_"+token;
    expect(await claimMerchantPaymentEvent(eventId,"checkout.session.completed")).toBe(true);
    expect(await claimMerchantPaymentEvent(eventId,"checkout.session.completed")).toBe(false);
    expect(await finishMerchantPaymentEvent(eventId,false,"temporary failure")).toBe(true);
    expect(await claimMerchantPaymentEvent(eventId,"checkout.session.completed")).toBe(true);
    expect(await finishMerchantPaymentEvent(eventId,true)).toBe(true);
    expect(await claimMerchantPaymentEvent(eventId,"checkout.session.completed")).toBe(false);
  });
});
