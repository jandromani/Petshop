export type LlmMessage={role:"system"|"user";content:string};
export type LlmRole="actor"|"judge"|"public";

export function agentModelConfigured(){
  return Boolean(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN||process.env.OPENROUTER_API_KEY);
}

export function agentRuntimeProvider(){
  if(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN)return"vercel-ai-gateway";
  if(process.env.OPENROUTER_API_KEY)return"openrouter";
  return"none";
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
  const gatewayToken=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN;
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
    if(!res.ok)throw new Error("AI Gateway status "+res.status);
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
