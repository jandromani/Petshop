import { describe,expect,it } from "vitest";
import { FX_POLICY_VERSION,REPORTING_CURRENCY,convertToReportingCurrency } from "@/src/money/fx";

describe("FX reporting policy",()=>{
  it("keeps EUR native amounts exact",()=>{
    expect(REPORTING_CURRENCY).toBe("EUR");
    expect(FX_POLICY_VERSION).toBeTruthy();
    expect(convertToReportingCurrency(123.45,"eur")).toMatchObject({
      nativeAmount:123.45,nativeCurrency:"EUR",reportingAmount:123.45,appliedRate:1,
      reason:"native-reporting-currency",
    });
  });

  it("never silently treats foreign money as EUR",()=>{
    expect(convertToReportingCurrency(100,"USD")).toMatchObject({
      nativeCurrency:"USD",reportingCurrency:"EUR",reportingAmount:null,appliedRate:null,
      reason:"fx-evidence-required",
    });
  });

  it("converts only with explicit matching evidence",()=>{
    expect(convertToReportingCurrency(100,"USD",{
      baseCurrency:"USD",quoteCurrency:"EUR",rate:.85,
      observedAt:"2026-10-04T12:00:00Z",source:"provider-settlement-ledger",
    })).toMatchObject({
      reportingAmount:85,appliedRate:.85,reason:"explicit-fx-evidence",
    });
    expect(convertToReportingCurrency(100,"USD",{
      baseCurrency:"GBP",quoteCurrency:"EUR",rate:1.1,
      observedAt:"2026-10-04T12:00:00Z",source:"wrong-pair",
    }).reportingAmount).toBeNull();
  });
});
