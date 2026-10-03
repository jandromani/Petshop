import { describe,expect,it } from "vitest";
import { busEvent } from "@/src/events/bus";

describe("event bus envelope",()=>{
  it("creates traceable domain events",()=>{
    const event=busEvent("referral.clicked",{clickId:"abc"},"abc","evt-1");
    expect(event.id).toBe("evt-1");
    expect(event.correlationId).toBe("abc");
    expect(event.type).toBe("referral.clicked");
    expect(event.occurredAt).toBeTruthy();
  });
});
