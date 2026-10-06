import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { CONSENT_COOKIE,CONSENT_VERSION_COOKIE,consentChoiceFromValues } from "@/src/privacy/consent";
const keys={source:"rv_src",medium:"rv_med",campaign:"rv_campaign",term:"rv_term",content:"rv_content",gclid:"rv_gclid",gbraid:"rv_gbraid",wbraid:"rv_wbraid",msclkid:"rv_msclkid"} as const;
export function consentedAttribution(jar:Pick<ReadonlyRequestCookies,"get">){
  if(consentChoiceFromValues(jar.get(CONSENT_COOKIE)?.value,jar.get(CONSENT_VERSION_COOKIE)?.value)!=="analytics")return{};
  return Object.fromEntries(Object.entries(keys).flatMap(([key,name])=>{const value=jar.get(name)?.value?.slice(0,200);return value?[[key,value]]:[]}));
}
