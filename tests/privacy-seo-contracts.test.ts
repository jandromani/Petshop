import { describe,expect,it } from "vitest";
import {
  ANALYTICS_CONSENT,CONSENT_COOKIE,CONSENT_VERSION,CONSENT_VERSION_COOKIE,
  ESSENTIAL_CONSENT,consentChoice,consentChoiceFromValues,hasAnalyticsConsent,
} from "@/src/privacy/consent";
import { buildDiscoveryItemListStructuredData,buildLiveHotelStructuredData } from "@/src/seo/structured-data";
import type { LiveCatalogOffer } from "@/src/core/live-offers";

const offer={
  offerId:"offer-1",offerKind:"snapshot",hotelId:"hotel-1",slug:"test-hotel",
  name:"Test Hotel",city:"Madrid",country:"Spain",region:"Europe",
  provider:"direct",sourceMode:"live",fulfillmentType:"REDIRECT",
  checkIn:"2026-11-01",checkOut:"2027-01-30",nights:90,occupancy:1,
  board:"breakfast",displayPrice:3000,currency:"EUR",monthlyEquivalent:1000,
  cancellation:"flexible",deepLink:"https://hotel.example/book",approvedHost:"hotel.example",
  trackingParam:"ref",verifiedAt:"2026-10-04T10:00:00.000Z",
  expiresAt:"2026-10-05T10:00:00.000Z",confidence:1,
} as unknown as LiveCatalogOffer;

describe("versioned consent",()=>{
  it("rejects legacy analytics consent without the current version",()=>{
    expect(hasAnalyticsConsent(CONSENT_COOKIE+"="+ANALYTICS_CONSENT)).toBe(false);
    expect(consentChoice(CONSENT_COOKIE+"="+ANALYTICS_CONSENT)).toBe("unknown");
  });

  it("accepts only a current-version explicit analytics choice",()=>{
    const raw=CONSENT_COOKIE+"="+ANALYTICS_CONSENT+"; "+CONSENT_VERSION_COOKIE+"="+CONSENT_VERSION;
    expect(hasAnalyticsConsent(raw)).toBe(true);
    expect(consentChoice(raw)).toBe("analytics");
  });

  it("keeps current essential-only consent non-analytic and invalidates stale versions",()=>{
    expect(consentChoiceFromValues(ESSENTIAL_CONSENT,CONSENT_VERSION)).toBe("essential");
    expect(consentChoiceFromValues(ANALYTICS_CONSENT,"old-version")).toBe("unknown");
  });
});

describe("structured commercial data",()=>{
  it("builds Hotel + Offer JSON-LD only from supplied live offer evidence",()=>{
    const data=buildLiveHotelStructuredData([offer],"https://atlas.example/live/test-hotel") as any;
    expect(data?.["@type"]).toBe("Hotel");
    expect(data?.makesOffer).toHaveLength(1);
    expect(data?.makesOffer[0]).toMatchObject({
      "@type":"Offer",price:3000,priceCurrency:"EUR",
      availability:"https://schema.org/InStock",
    });
    expect(data?.makesOffer[0].priceValidUntil).toBe("2026-10-05");
    expect(buildLiveHotelStructuredData([],"https://atlas.example/live/test-hotel")).toBeNull();
  });

  it("builds an ItemList with positional Hotel/Offer children",()=>{
    const data=buildDiscoveryItemListStructuredData({
      title:"Long stays",canonical:"https://atlas.example/discover/value",offers:[offer],
    }) as any;
    expect(data?.["@type"]).toBe("ItemList");
    expect(data?.numberOfItems).toBe(1);
    expect(data?.itemListElement[0]).toMatchObject({
      "@type":"ListItem",position:1,
      item:{"@type":"Hotel",offers:{"@type":"Offer",priceCurrency:"EUR"}},
    });
  });
});
