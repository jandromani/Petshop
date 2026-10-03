import { describe, expect, it } from "vitest";
import { parseBookingSearchResponse } from "@/src/providers/live/booking";

describe("Booking Demand API v3.2 parser",()=>{
  it("uses booker currency, display price, product id and web URL",()=>{
    const raw={
      request_id:"req-1",
      data:[{
        id:10004,
        currency:{accommodation:"USD",booker:"EUR"},
        price:{display:1200,total:1250},
        url:{web:"https://www.booking.com/example",app:"booking://example"},
        products:[{id:"product-123",price:{display:1200,total:1250}}],
      }],
    };
    const hits=parseBookingSearchResponse(raw,"2027-01-01T10:00:00Z");
    expect(hits).toHaveLength(1);
    expect(hits[0].currency).toBe("EUR");
    expect(hits[0].displayPrice).toBe(1200);
    expect(hits[0].totalPrice).toBe(1250);
    expect(hits[0].providerOfferId).toBe("product-123");
    expect(hits[0].providerRequestId).toBe("req-1");
    expect(hits[0].deepLink).toBe("https://www.booking.com/example");
    expect(hits[0].commercialFulfillment).toBe("redirect");
  });

  it("does not fabricate fulfilment when URL is absent",()=>{
    const hits=parseBookingSearchResponse({data:[{id:1,currency:{booker:"EUR"},price:{display:99},products:[{id:"p1"}]}]});
    expect(hits[0].commercialFulfillment).toBe("none");
    expect(hits[0].deepLink).toBeUndefined();
  });
});
