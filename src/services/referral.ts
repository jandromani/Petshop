export type ReferralClick = {
  clickId: string;
  visitorId?: string;
  sessionId?: string;
  hotelSlug: string;
  canonicalHotelId?: string;
  offerSnapshotId?: string;
  expectedCommission?: number;
  providerTrackingId: string;
  provider: string;
  source?: string;
  campaign?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  msclkid?: string;
  pagePath?: string;
  position?: number;
  createdAt: string;
};

export function createReferralClick(input: Omit<ReferralClick, "clickId" | "createdAt" | "providerTrackingId">): ReferralClick {
  const clickId=crypto.randomUUID();
  return {
    ...input,
    clickId,
    providerTrackingId:"atlas_click-"+clickId.replaceAll("-",""),
    createdAt:new Date().toISOString(),
  };
}

export function referralLog(click: ReferralClick) {
  return JSON.stringify({ level: "info", event: "referral_click", ...click });
}
