import { afterAll,describe,expect,it } from "vitest";
import { getDatabase } from "@/src/db/client";
import { createDirectRate,createHotelLead,publishDirectRate,verifyDirectRate } from "@/src/db/direct-supply";
import { configureMerchantRate,createMerchantOrder,getMerchantCheckoutQuote,releaseMerchantOrder } from "@/src/db/merchant";

const enabled=Boolean(process.env.DATABASE_URL);const token=crypto.randomUUID();let leadId="";let rateId="";let orderId="";const hotelName="CI Merchant "+token;

describe.skipIf(!enabled)("managed marketplace persistence",()=>{
  afterAll(async()=>{const sql=getDatabase();if(!sql)return;if(orderId)await sql`delete from merchant_orders where id=${orderId}::uuid`;if(leadId)await sql`delete from hotel_leads where id=${leadId}::uuid`;await sql`delete from canonical_hotels where name=${hotelName}`;});
  it("graduates a direct rate into managed allocated inventory",async()=>{
    leadId=(await createHotelLead({hotelName,city:"Las Palmas",country:"Spain",region:"Europe",lat:28.12,lng:-15.43,source:"ci"}))||"";expect(leadId).toBeTruthy();
    rateId=(await createDirectRate({hotelLeadId:leadId,rateCode:"CI-MERCHANT",minNights:30,maxNights:90,maxGuests:2,monthlyPrice:1800,currency:"EUR",validFrom:"2027-01-01",validTo:"2027-12-31",cancellation:"Refundable until 30 days before check-in"}))||"";expect(rateId).toBeTruthy();
    expect(await configureMerchantRate({id:rateId,channelModel:"EXCLUSIVE_MERCHANT",hotelNetMonthly:1450,inventoryUnits:2,merchantTermsVerified:true})).toBe(rateId);
    expect(await verifyDirectRate({id:rateId,contractReference:"CI-CONTRACT"})).toBe(rateId);
    const published=await publishDirectRate(rateId);expect(published.published).toBe(true);
    const quote=await getMerchantCheckoutQuote({offerId:rateId,checkIn:"2027-02-01",nights:60,occupancy:2});expect(quote?.customerTotal).toBe(3600);expect(quote?.hotelCost).toBe(2900);expect(quote?.platformRevenue).toBe(700);expect(quote?.availableUnits).toBe(2);
    const order=await createMerchantOrder({offerId:rateId,customerEmail:"ci@example.com",checkIn:"2027-02-01",nights:60,occupancy:2});expect(order?.id).toBeTruthy();orderId=order?.id||"";
    const afterReserve=await getMerchantCheckoutQuote({offerId:rateId,checkIn:"2027-02-01",nights:60,occupancy:2});expect(afterReserve?.availableUnits).toBe(1);
    expect(await releaseMerchantOrder(orderId,"CANCELLED")).toBe(true);
    const afterRelease=await getMerchantCheckoutQuote({offerId:rateId,checkIn:"2027-02-01",nights:60,occupancy:2});expect(afterRelease?.availableUnits).toBe(2);
  });
});
