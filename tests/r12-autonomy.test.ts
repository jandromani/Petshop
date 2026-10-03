import { describe,expect,it } from "vitest";
import { allowedActionsForAgent,isAutoExecutable,parseAgentProposal } from "@/src/agents/actions";

describe("R12 governed actuation",()=>{
  it("parses a bounded JSON proposal",()=>{
    expect(parseAgentProposal(JSON.stringify({
      summary:"Audit SEO evidence.",
      proposedAction:{kind:"seo.audit",payload:{}},
    }))).toEqual({
      summary:"Audit SEO evidence.",
      proposedAction:{kind:"seo.audit",payload:{}},
    });
  });

  it("fails closed on invented action kinds",()=>{
    expect(parseAgentProposal(JSON.stringify({
      summary:"Do anything.",
      proposedAction:{kind:"shell.exec",payload:{}},
    }))).toBeNull();
  });

  it("allows only read-only/idempotent classes to auto execute",()=>{
    expect(isAutoExecutable("seo.audit")).toBe(true);
    expect(isAutoExecutable("growth.audit")).toBe(true);
    expect(isAutoExecutable("revenue.reconcile")).toBe(true);
    expect(isAutoExecutable("direct.publish")).toBe(false);
    expect(isAutoExecutable("sem.spend")).toBe(false);
    expect(isAutoExecutable("code.change")).toBe(false);
  });

  it("scopes actions by role",()=>{
    expect(allowedActionsForAgent("seo-strategist")).toContain("seo.audit");
    expect(allowedActionsForAgent("seo-strategist")).not.toContain("direct.publish");
    expect(allowedActionsForAgent("hotel-sales")).toContain("hotel.outreach");
  });
});
