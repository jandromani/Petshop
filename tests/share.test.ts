import { describe, expect, it } from "vitest";
import { decodePlanToken, encodePlanToken } from "@/src/core/share";

describe("share tokens",()=>{
  it("round-trips bounded plan state",()=>{
    const input={pension:1700,rent:1300,other:200,share:64,party:"solo" as const,duration:90 as const,mode:"world" as const};
    expect(decodePlanToken(encodePlanToken(input))).toEqual(input);
  });

  it("rejects malformed tokens",()=>{
    expect(decodePlanToken("not-a-valid-plan")).toBeNull();
  });
});
