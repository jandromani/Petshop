import { afterEach,describe,expect,it } from "vitest";
import { agentRuntimeProvider } from "@/src/agents/llm";

describe("LLM provider routing",()=>{
  const keys=[
    "AGENT_LLM_PROVIDER","AGENT_ALLOW_PAID_FALLBACK","OPENROUTER_API_KEY","AI_GATEWAY_API_KEY",
    "VERCEL_OIDC_TOKEN","VERCEL",
  ] as const;
  const original=Object.fromEntries(keys.map(key=>[key,process.env[key]]));

  afterEach(()=>{
    for(const key of keys){
      const value=original[key];
      if(value===undefined)delete process.env[key];
      else process.env[key]=value;
    }
  });

  it("honours OpenRouter-first even on Vercel",()=>{
    process.env.AGENT_LLM_PROVIDER="openrouter";
    process.env.OPENROUTER_API_KEY="test-key";
    process.env.VERCEL="1";
    expect(agentRuntimeProvider()).toBe("openrouter");
  });

  it("fails closed when preferred OpenRouter has no credential and paid fallback is disabled",()=>{
    process.env.AGENT_LLM_PROVIDER="openrouter";
    process.env.AGENT_ALLOW_PAID_FALLBACK="false";
    delete process.env.OPENROUTER_API_KEY;
    process.env.VERCEL="1";
    expect(agentRuntimeProvider()).toBe("none");
  });

  it("uses Vercel only when paid fallback is explicitly enabled",()=>{
    process.env.AGENT_LLM_PROVIDER="openrouter";
    process.env.AGENT_ALLOW_PAID_FALLBACK="true";
    delete process.env.OPENROUTER_API_KEY;
    process.env.VERCEL="1";
    expect(agentRuntimeProvider()).toBe("vercel-ai-gateway");
  });

  it("reports none outside Vercel when no provider is configured",()=>{
    delete process.env.AGENT_LLM_PROVIDER;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;
    delete process.env.VERCEL;
    expect(agentRuntimeProvider()).toBe("none");
  });
});
