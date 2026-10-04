import { NextRequest,NextResponse } from "next/server";
import { CONSENT_COOKIE,CONSENT_VERSION_COOKIE,consentChoiceFromValues } from "@/src/privacy/consent";

const YEAR=60*60*24*365;
const SESSION=60*30;
const TRACKING_COOKIES=["rv_vid","rv_sid","rv_src","rv_med","rv_campaign","rv_term","rv_content","rv_ref"];

function clean(value:string|null,max=160){
  return value?.trim().slice(0,max)||undefined;
}

function clearTracking(response:NextResponse){
  for(const name of TRACKING_COOKIES) response.cookies.delete(name);
}

function malformedPath(request:NextRequest){
  const rawPath=request.url.split("?")[0].toLowerCase();
  return rawPath.includes("%5c")||rawPath.includes("\\")||rawPath.includes("%00");
}

export function proxy(request:NextRequest){
  if(malformedPath(request)){
    return new NextResponse("Not found",{
      status:404,
      headers:{"Cache-Control":"no-store","X-Atlas-Rejected-Path":"malformed"},
    });
  }

  if(request.nextUrl.pathname.startsWith("/api/"))return NextResponse.next();

  const response=NextResponse.next();
  const consent=consentChoiceFromValues(
    request.cookies.get(CONSENT_COOKIE)?.value,
    request.cookies.get(CONSENT_VERSION_COOKIE)?.value,
  );
  if(consent!=="analytics"){
    clearTracking(response);
    return response;
  }

  const now=Date.now().toString(36);
  if(!request.cookies.get("rv_vid")){
    response.cookies.set("rv_vid",crypto.randomUUID(),{httpOnly:true,secure:true,sameSite:"lax",maxAge:YEAR,path:"/"});
  }

  const existingSession=request.cookies.get("rv_sid")?.value;
  response.cookies.set("rv_sid",existingSession||crypto.randomUUID()+"_"+now,{httpOnly:true,secure:true,sameSite:"lax",maxAge:SESSION,path:"/"});

  const params=request.nextUrl.searchParams;
  const attribution:Record<string,string|undefined>={
    rv_src:clean(params.get("utm_source")),
    rv_med:clean(params.get("utm_medium")),
    rv_campaign:clean(params.get("utm_campaign")),
    rv_term:clean(params.get("utm_term")),
    rv_content:clean(params.get("utm_content")),
  };

  const referrer=request.headers.get("referer");
  if(!request.cookies.get("rv_ref")&&referrer){
    try{
      const host=new URL(referrer).hostname;
      if(host&&host!==request.nextUrl.hostname) attribution.rv_ref=host;
    }catch{}
  }

  for(const [name,value] of Object.entries(attribution)){
    if(value&&!request.cookies.get(name)){
      response.cookies.set(name,value,{httpOnly:true,secure:true,sameSite:"lax",maxAge:YEAR,path:"/"});
    }
  }
  return response;
}

export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
