import { describe, expect, it } from "vitest";
import { createReferralClick } from "@/src/services/referral";

describe("referral attribution", () => {
  it("creates unique attributable clicks", () => {
    const a = createReferralClick({
      visitorId:"v1",
      sessionId:"s1",
      hotelSlug:"antalya-riviera",
      provider:"ratehawk",
      source:"google",
      campaign:"winter",
      pagePath:"/",
      position:1,
    });
    const b = createReferralClick({
      visitorId:"v1",
      sessionId:"s1",
      hotelSlug:"antalya-riviera",
      provider:"ratehawk",
    });
    expect(a.clickId).not.toBe(b.clickId);
    expect(a.source).toBe("google");
    expect(a.createdAt).toBeTruthy();
  });
});
