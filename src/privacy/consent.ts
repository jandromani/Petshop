export const CONSENT_COOKIE="rv_consent";
export const CONSENT_VERSION_COOKIE="rv_consent_v";
export const CONSENT_VERSION="2026-10-04-v1";
export const ANALYTICS_CONSENT="analytics";
export const ESSENTIAL_CONSENT="essential";

export type ConsentChoice="analytics"|"essential"|"unknown";

function cookieValue(rawCookie:string,name:string){
  const prefix=name+"=";
  const part=rawCookie.split(";").map(x=>x.trim()).find(x=>x.startsWith(prefix));
  return part?.slice(prefix.length);
}

export function consentChoiceFromValues(choice:string|undefined|null,version:string|undefined|null):ConsentChoice{
  if(version!==CONSENT_VERSION)return"unknown";
  if(choice===ANALYTICS_CONSENT)return"analytics";
  if(choice===ESSENTIAL_CONSENT)return"essential";
  return"unknown";
}

export function consentChoice(rawCookie:string):ConsentChoice{
  return consentChoiceFromValues(
    cookieValue(rawCookie,CONSENT_COOKIE),
    cookieValue(rawCookie,CONSENT_VERSION_COOKIE),
  );
}

export function hasAnalyticsConsent(rawCookie:string){
  return consentChoice(rawCookie)==="analytics";
}
