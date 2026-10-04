import { describe,expect,it } from "vitest";
import { NextRequest } from "next/server";
import { bearerSecretAuthorized,secureSecretEqual } from "@/src/security/secrets";
import { config,proxy } from "../proxy";

describe("perimeter hardening",()=>{
  it("compares shared secrets without accepting prefixes or unequal values",()=>{
    expect(secureSecretEqual("alpha","alpha")).toBe(true);
    expect(secureSecretEqual("alpha","alph")).toBe(false);
    expect(secureSecretEqual("alpha","alpha2")).toBe(false);
    expect(secureSecretEqual("", "alpha")).toBe(false);
  });

  it("requires an exact bearer token",()=>{
    expect(bearerSecretAuthorized(new Request("https://atlas.test",{headers:{authorization:"Bearer exact"}}),"exact")).toBe(true);
    expect(bearerSecretAuthorized(new Request("https://atlas.test",{headers:{authorization:"Bearer exactx"}}),"exact")).toBe(false);
    expect(bearerSecretAuthorized(new Request("https://atlas.test"),"exact")).toBe(false);
  });

  it("runs malformed-path protection across API routes too",()=>{
    expect(config.matcher[0]).not.toContain("api|");
    const rejected=proxy(new NextRequest("https://atlas.test/api/health%5C"));
    expect(rejected.status).toBe(404);
    expect(rejected.headers.get("x-atlas-rejected-path")).toBe("malformed");
  });
});
