import { describe,expect,it } from "vitest";
import { nextConversionStatus } from "@/src/core/conversion-lifecycle";

describe("conversion lifecycle",()=>{
  it("does not regress confirmed or settled conversions",()=>{
    expect(nextConversionStatus("CONFIRMED","PENDING")).toBe("CONFIRMED");
    expect(nextConversionStatus("SETTLED","CONFIRMED")).toBe("SETTLED");
    expect(nextConversionStatus("SETTLED","PENDING")).toBe("SETTLED");
  });

  it("allows settlement and cancellation/reversal terminal evidence",()=>{
    expect(nextConversionStatus("CONFIRMED","SETTLED")).toBe("SETTLED");
    expect(nextConversionStatus("CONFIRMED","CANCELLED")).toBe("CANCELLED");
    expect(nextConversionStatus("SETTLED","REVERSED")).toBe("REVERSED");
  });

  it("keeps terminal cancellation states terminal against stale events",()=>{
    expect(nextConversionStatus("CANCELLED","CONFIRMED")).toBe("CANCELLED");
    expect(nextConversionStatus("REVERSED","SETTLED")).toBe("REVERSED");
  });
});
