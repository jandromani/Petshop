export const CONSENT_COOKIE="rv_consent";
export const ANALYTICS_CONSENT="analytics";
export const ESSENTIAL_CONSENT="essential";

export function hasAnalyticsConsent(rawCookie:string){
  return rawCookie.split(";").some(part=>part.trim()===CONSENT_COOKIE+"="+ANALYTICS_CONSENT);
}
