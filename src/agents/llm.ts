import { getVercelOidcToken } from "@vercel/oidc";

export type LlmMessage={role:"system"|"user";content:string};
export type LlmRole="actor"|"judge"|"public";

function vercelOidcPotentiallyAvailable(){
  return process.env.VERCEL==="1"||Boolean(process.env.VERCEL_OIDC_TOKEN);
}

export function agentModelConfigured(){
  return Boolean(
    process.env.AI_GATEWAY_API_KEY||
    process.env.VERCEL_OIDC_TOKEN||
    process.env.OPENROUTER_API_KEY||
    vercelOidcPotentiallyAvailable()
  );
}

type ProviderPreference="auto"|"openrouter"|"vercel-ai-gateway";

function providerPreference():ProviderPreference{
  const configured=(process.env.AGENT_LLM_PROVIDER||"auto").trim().toLowerCase();
  if(configured==="openrouter"||configured==="vercel-ai-gateway")return configured;
  return"auto";
}

export function agentRuntimeProvider(){
  const preference=providerPreference();
  const openRouter=Boolean(process.env.OPENROUTER_API_KEY);
  const gateway=Boolean(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN||vercelOidcPotentiallyAvailable());
  if(preference==="openrouter"&&openRouter)return"openrouter";
  if(preference==="vercel-ai-gateway"&&gateway)return"vercel-ai-gateway";
  if(gateway)return"vercel-ai-gateway";
  if(openRouter)return"openrouter";
  return"none";
}

async function resolveGatewayToken(){
  const direct=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN;
  if(direct)return direct;
  if(process.env.VERCEL==="1"){
    try{
      return await getVercelOidcToken();
    }catch(error){
      console.error(JSON.stringify({level:"error",event:"oidc_token_unavailable",error:String(error)}));
    }
  }
  return undefined;
}

export async function agentRuntimeCredentialsAvailable(){
  if(process.env.OPENROUTER_API_KEY)return true;
  return Boolean(await resolveGatewayToken());
}

function gatewayModel(role:LlmRole){
  if(role==="judge")return process.env.AI_GATEWAY_JUDGE_MODEL||"openai/gpt-5.6-sol";
  return process.env.AI_GATEWAY_MODEL||"google/gemini-3.6-flash";
}

function openRouterModel(role:LlmRole){
  if(role==="judge")return process.env.OPENROUTER_JUDGE_MODEL||process.env.OPENROUTER_MODEL||"openrouter/free";
  return process.env.OPENROUTER_MODEL||"openrouter/free";
}

export function llmTimeoutMs(){
  const value=Number(process.env.AGENT_LLM_TIMEOUT_MS||20_000);
  return Number.isFinite(value)?Math.max(3_000,Math.min(60_000,Math.round(value))):20_000;
}

async function gatewayCompletion(
  token:string,messages:LlmMessage[],role:LlmRole,maxTokens:number,temperature:number,
){
  const model=gatewayModel(role);
  const res=await fetch("https://ai-gateway.vercel.sh/v1/chat/completions",{
    method:"POST",
    signal:AbortSignal.timeout(llmTimeoutMs()),
    headers:{
      Authorization:"Bearer "+token,
      "Content-Type":"application/json",
      "ai-reporting-tags":"app:atlas,role:"+role,
    },
    body:JSON.stringify({model,messages,temperature,max_tokens:maxTokens,stream:false}),
  });
  if(!res.ok){
    const detail=(await res.text().catch(()=>"")).slice(0,500);
    throw new Error("AI Gateway status "+res.status+(detail?": "+detail:""));
  }
  const data=await res.json();
  return{
    text:String(data?.choices?.[0]?.message?.content||""),
    usage:data?.usage,
    model:String(data?.model||model),
    provider:"vercel-ai-gateway" as const,
  };
}

async function openRouterCompletion(
  key:string,messages:LlmMessage[],role:LlmRole,maxTokens:number,temperature:number,
){
  const model=openRouterModel(role);
  const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{
    method:"POST",
    signal:AbortSignal.timeout(llmTimeoutMs()),
    headers:{
      Authorization:"Bearer "+key,
      "Content-Type":"application/json",
      "HTTP-Referer":process.env.NEXT_PUBLIC_SITE_URL||"https://vercel.app",
      "X-Title":"Atlas Long Stay",
    },
    body:JSON.stringify({model,messages,temperature,max_tokens:maxTokens}),
  });
  if(!res.ok){
    const detail=(await res.text().catch(()=>"")).slice(0,500);
    throw new Error("OpenRouter status "+res.status+(detail?": "+detail:""));
  }
  const data=await res.json();
  return{
    text:String(data?.choices?.[0]?.message?.content||""),
    usage:data?.usage,
    model:String(data?.model||model),
    provider:"openrouter" as const,
  };
}

export async function llmCompletion(
  messages:LlmMessage[],
  options:{role:LlmRole;maxTokens?:number;temperature?:number},
){
  const gatewayToken=await resolveGatewayToken();
  const openRouterKey=process.env.OPENROUTER_API_KEY;
  const preference=providerPreference();
  const maxTokens=Math.max(64,Math.min(1400,options.maxTokens??700));
  const temperature=options.temperature??.2;

  const tryOpenRouter=async()=>{
    if(!openRouterKey)throw new Error("OpenRouter is not configured");
    return openRouterCompletion(openRouterKey,messages,options.role,maxTokens,temperature);
  };
  const tryGateway=async()=>{
    if(!gatewayToken)throw new Error("Vercel AI Gateway is not configured");
    return gatewayCompletion(gatewayToken,messages,options.role,maxTokens,temperature);
  };

  if(preference==="openrouter"&&openRouterKey){
    try{
      return await tryOpenRouter();
    }catch(error){
      console.error(JSON.stringify({
        level:"warning",event:"openrouter_completion_failed",role:options.role,error:String(error).slice(0,500),
        fallbackConfigured:Boolean(gatewayToken),
      }));
      if(gatewayToken)return tryGateway();
      throw error;
    }
  }

  if(preference==="vercel-ai-gateway"&&gatewayToken){
    try{
      return await tryGateway();
    }catch(error){
      console.error(JSON.stringify({
        level:"warning",event:"ai_gateway_completion_failed",role:options.role,error:String(error).slice(0,500),
        fallbackConfigured:Boolean(openRouterKey),
      }));
      if(openRouterKey)return tryOpenRouter();
      throw error;
    }
  }

  if(gatewayToken){
    try{
      return await tryGateway();
    }catch(error){
      console.error(JSON.stringify({
        level:"warning",event:"ai_gateway_completion_failed",role:options.role,error:String(error).slice(0,500),
        fallbackConfigured:Boolean(openRouterKey),
      }));
      if(openRouterKey)return tryOpenRouter();
      throw error;
    }
  }

  if(openRouterKey)return tryOpenRouter();
  throw new Error("No governed model runtime is configured");
}
