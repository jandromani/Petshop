import { afterEach,describe,expect,it,vi } from "vitest";
import { llmCompletion } from "@/src/agents/llm";

const keys=[
  "AGENT_LLM_PROVIDER","AGENT_ALLOW_PAID_FALLBACK","AI_GATEWAY_API_KEY",
  "OPENROUTER_API_KEY","OPENROUTER_MODEL","OPENROUTER_ACTOR_MODEL",
  "OPENROUTER_FALLBACK_MODEL","VERCEL","VERCEL_OIDC_TOKEN",
] as const;
const original=Object.fromEntries(keys.map(key=>[key,process.env[key]]));

function restoreEnv(){
  for(const key of keys){
    const value=original[key];
    if(value===undefined)delete process.env[key];
    else process.env[key]=value;
  }
}

afterEach(()=>{
  vi.restoreAllMocks();
  restoreEnv();
});

describe("AI runtime outage resilience",()=>{
  it("falls back from a failed Vercel AI Gateway request to OpenRouter",async()=>{
    process.env.AGENT_LLM_PROVIDER="vercel-ai-gateway";
    process.env.AI_GATEWAY_API_KEY="gateway-test";
    process.env.OPENROUTER_API_KEY="openrouter-test";
    process.env.OPENROUTER_MODEL="openrouter/free";
    delete process.env.VERCEL;
    delete process.env.VERCEL_OIDC_TOKEN;

    const mocked=vi.spyOn(globalThis,"fetch").mockImplementation(async input=>{
      const url=String(input);
      if(url.includes("ai-gateway.vercel.sh")){
        return new Response("gateway-down",{status:503});
      }
      if(url.includes("openrouter.ai")){
        return new Response(JSON.stringify({
          choices:[{message:{content:"fallback-ok"}}],
          model:"openrouter/free",
          usage:{prompt_tokens:1,completion_tokens:1},
        }),{status:200,headers:{"content-type":"application/json"}});
      }
      throw new Error("unexpected URL "+url);
    });

    const result=await llmCompletion([{role:"user",content:"ping"}],{role:"actor",maxTokens:64,temperature:0});
    expect(result.provider).toBe("openrouter");
    expect(result.text).toBe("fallback-ok");
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it("falls back from a failed OpenRouter primary model to the free fallback model",async()=>{
    process.env.AGENT_LLM_PROVIDER="openrouter";
    process.env.AGENT_ALLOW_PAID_FALLBACK="false";
    process.env.OPENROUTER_API_KEY="openrouter-test";
    process.env.OPENROUTER_ACTOR_MODEL="example/primary-free";
    process.env.OPENROUTER_FALLBACK_MODEL="openrouter/free";
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL;
    delete process.env.VERCEL_OIDC_TOKEN;

    let calls=0;
    vi.spyOn(globalThis,"fetch").mockImplementation(async input=>{
      const url=String(input);
      if(!url.includes("openrouter.ai"))throw new Error("unexpected provider "+url);
      calls++;
      if(calls===1)return new Response("primary-down",{status:503});
      return new Response(JSON.stringify({
        choices:[{message:{content:"free-fallback-ok"}}],
        model:"openrouter/free",
      }),{status:200,headers:{"content-type":"application/json"}});
    });

    const result=await llmCompletion([{role:"user",content:"ping"}],{role:"actor",maxTokens:64,temperature:0});
    expect(result.provider).toBe("openrouter");
    expect(result.model).toBe("openrouter/free");
    expect(result.text).toBe("free-fallback-ok");
    expect(calls).toBe(2);
  });

  it("never crosses into paid Gateway fallback when policy disables it",async()=>{
    process.env.AGENT_LLM_PROVIDER="openrouter";
    process.env.AGENT_ALLOW_PAID_FALLBACK="false";
    process.env.OPENROUTER_API_KEY="openrouter-test";
    process.env.OPENROUTER_ACTOR_MODEL="example/primary-free";
    process.env.OPENROUTER_FALLBACK_MODEL="openrouter/free";
    process.env.AI_GATEWAY_API_KEY="gateway-test";
    delete process.env.VERCEL;
    delete process.env.VERCEL_OIDC_TOKEN;

    const urls:string[]=[];
    vi.spyOn(globalThis,"fetch").mockImplementation(async input=>{
      const url=String(input);urls.push(url);
      if(url.includes("openrouter.ai"))return new Response("all-free-models-down",{status:503});
      if(url.includes("ai-gateway.vercel.sh"))return new Response(JSON.stringify({choices:[{message:{content:"paid"}}]}),{status:200});
      throw new Error("unexpected URL "+url);
    });

    await expect(llmCompletion([{role:"user",content:"ping"}],{role:"actor",maxTokens:64,temperature:0}))
      .rejects.toThrow(/OpenRouter status 503/);
    expect(urls.some(url=>url.includes("ai-gateway.vercel.sh"))).toBe(false);
    expect(urls.filter(url=>url.includes("openrouter.ai"))).toHaveLength(2);
  });
});
