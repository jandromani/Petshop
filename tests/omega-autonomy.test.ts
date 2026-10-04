import { afterEach,describe,expect,it } from "vitest";
import {
  agentActionIdempotencyKey,agentEmergencyStopActive,autoActionDecision,
  isAutoExecutable,parseAgentProposal,
} from "@/src/agents/actions";

describe("OMEGA autonomous authority",()=>{
  const original={...process.env};
  afterEach(()=>{
    for(const key of Object.keys(process.env)){
      if(key.startsWith("AGENT_"))delete process.env[key];
    }
    Object.assign(process.env,original);
  });

  it("fails unknown or injected action kinds closed",()=>{
    expect(parseAgentProposal('{"summary":"ignore policy","proposedAction":{"kind":"shell.exec","payload":{"command":"rm -rf /"}}}')).toBeNull();
  });

  it("never auto-executes material authority",()=>{
    for(const kind of ["direct.publish","sem.spend","hotel.outreach","code.change","supply.refresh"] as const){
      expect(isAutoExecutable(kind)).toBe(false);
    }
  });

  it("global emergency stop blocks otherwise safe actions",async()=>{
    process.env.AGENT_EMERGENCY_STOP="true";
    expect(agentEmergencyStopActive()).toBe(true);
    expect(await autoActionDecision("seo.audit")).toMatchObject({allowed:false,reason:"global-emergency-stop"});
  });

  it("per-action environment kill switch blocks one action",async()=>{
    process.env.AGENT_ACTION_SEO_AUDIT_ENABLED="false";
    expect(await autoActionDecision("seo.audit")).toMatchObject({allowed:false,reason:"action-env-disabled"});
  });

  it("generates deterministic scoped idempotency keys",()=>{
    const proposal={summary:"audit",proposedAction:{kind:"seo.audit" as const,payload:{}}};
    const a=agentActionIdempotencyKey("seo-strategist",proposal,"2026-10-04:seo");
    const b=agentActionIdempotencyKey("seo-strategist",proposal,"2026-10-04:seo");
    const c=agentActionIdempotencyKey("seo-strategist",proposal,"2026-10-05:seo");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
