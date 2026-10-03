import { describe,expect,it } from "vitest";
import { normalizeBookingOrder } from "@/src/services/booking-order-sync";

describe("Booking order reconciliation",()=>{
  it("recovers full click label and confirmed money facts",()=>{
    const row=normalizeBookingOrder({
      id:"4859251752",
      label:"atlas_click-1234567890abcdef1234567890abcdef",
      status:"booked",
      currencies:{booker:"EUR"},
      price:{total:5200},
      commission:{actual:410},
      updated:"2026-10-03T18:00:00Z",
    });
    expect(row).toMatchObject({
      orderId:"4859251752",
      label:"atlas_click-1234567890abcdef1234567890abcdef",
      status:"CONFIRMED",
      currency:"EUR",
      bookingValue:5200,
      commission:410,
    });
  });
  it("maps cancellations without inventing commission",()=>{
    const row=normalizeBookingOrder({id:"2",status:"cancelled",currency:"EUR",price:{total:"1500"}},{accommodation:{label:"atlas_click-abc"}});
    expect(row?.status).toBe("CANCELLED");
    expect(row?.commission).toBeUndefined();
    expect(row?.label).toBe("atlas_click-abc");
  });
});
