import { describe,expect,it } from "vitest";
import {
  COMMERCE_AUDIT_MAX_DELIVERIES,
  commerceAuditRetryPolicy,
  isCommerceAuditPoisonDelivery,
} from "@/src/queues/commerce-audit";

describe("commerce audit queue retry policy",()=>{
  it("backs off exponentially before the retry limit",()=>{
    expect(commerceAuditRetryPolicy(1)).toEqual({afterSeconds:10});
    expect(commerceAuditRetryPolicy(2)).toEqual({afterSeconds:20});
    expect(commerceAuditRetryPolicy(3)).toEqual({afterSeconds:40});
    expect(commerceAuditRetryPolicy(4)).toEqual({afterSeconds:80});
    expect(commerceAuditRetryPolicy(5)).toEqual({afterSeconds:160});
  });

  it("acknowledges after the maximum retry window to stop poison loops",()=>{
    expect(COMMERCE_AUDIT_MAX_DELIVERIES).toBe(5);
    expect(isCommerceAuditPoisonDelivery(5)).toBe(true);
    expect(commerceAuditRetryPolicy(6)).toEqual({acknowledge:true});
    expect(commerceAuditRetryPolicy(99)).toEqual({acknowledge:true});
  });

  it("does not classify early delivery attempts as poison",()=>{
    expect(isCommerceAuditPoisonDelivery(1)).toBe(false);
    expect(isCommerceAuditPoisonDelivery(4)).toBe(false);
  });
});
