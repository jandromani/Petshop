import { describe,expect,it } from "vitest";
import { validSavedProfileId } from "@/src/db/consumer-memory";

describe("anonymous consumer memory",()=>{
  it("accepts only opaque UUID profile identifiers",()=>{
    expect(validSavedProfileId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(validSavedProfileId("not-a-profile")).toBe(false);
    expect(validSavedProfileId("")).toBe(false);
    expect(validSavedProfileId(null)).toBe(false);
  });
});
