import { getVercelOidcToken } from "@vercel/oidc";

export type LlmMessage={role:"system"|"user";content:string};
export type LlmRole="actor"|"judge"|"public";

function vercelOidcAvailable(){
  return process.env.VERCEL==="1"||Boolean(process.env.VERCEL_OIDC_TOKEN);
}

export function agentModelConfigured(){
  return Boolean(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN||process.env.OPENROUTER_API_KEY||vercelOidcAvailable());
}

export function agentRuntimeProvider(){
  if(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN||vercelOidcAvailable())return"vercel-ai-gateway";
  if(process.env.OPENROUTER_API_KEY)return"openrouter";
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

function gatewayModel(role:LlmRole){
  if(role==="judge")return process.env.AI_GATEWAY_JUDGE_MODEL||"openai/gpt-5.6-sol";
  return process.env.AI_GATEWAY_MODEL||"google/gemini-3.6-flash";
}
function openRouterModel(role:LlmRole){
  if(role==="judge")return process.env.OPENROUTER_JUDGE_MODEL||process.env.OPENROUTER_MODEL||"openrouter/free";
  return process.env.OPENROUTER_MODEL||"openrouter/free";
}

export async function llmCompletion(
  messages:LlmMessage[],
  options:{role:LlmRole;maxTokens?:number;temperature?:number},
){
  const gatewayToken=await resolveGatewayToken();
  const openRouterKey=process.env.OPENROUTER_API_KEY;
  const maxTokens=Math.max(64,Math.min(1400,options.maxTokens??700));
  const temperature=options.temperature??.2;

  if(gatewayToken){
    const model=gatewayModel(options.role);
    const res=await fetch("https://ai-gateway.vercel.sh/v1/chat/completions",{
      method:"POST",
      headers:{
        Authorization:"Bearer "+gatewayToken,
        "Content-Type":"application/json",
        "ai-reporting-tags":"app:atlas,role:"+options.role,
      },
      body:JSON.stringify({model,messages,temperature,max_tokens:maxTokens,stream:false}),
    });
    if(!res.ok){
      const detail=(await res.text().catch(()=>"")).slice(0,500);
      throw new Error("AI Gateway status "+res.status+(detail?": "+detail:""));
    }
    const data=await res.json();
    return{text:String(data?.choices?.[0]?.message?.content||""),usage:data?.usage,model:String(data?.model||model),provider:"vercel-ai-gateway" as const};
  }

  if(openRouterKey){
    const model=openRouterModel(options.role);
    const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{
      method:"POST",
      headers:{
        Authorization:"Bearer "+openRouterKey,
        "Content-Type":"application/json",
        "HTTP-Referer":process.env.NEXT_PUBLIC_SITE_URL||"https://vercel.app",
        "X-Title":"Atlas Long Stay",
      },
      body:JSON.stringify({model,messages,temperature,max_tokens:maxTokens}),
    });
    if(!res.ok)throw new Error("OpenRouter status "+res.status);
    const data=await res.json();
    return{text:String(data?.choices?.[0]?.message?.content||""),usage:data?.usage,model:String(data?.model||model),provider:"openrouter" as const};
  }

  throw new Error("No governed model runtime is configured");
}
