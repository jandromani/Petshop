import { canonicalSiteUrl } from "@/src/system/site-url";
import { localizedHref,type Language } from "@/src/i18n/config";
export const campaignChannels=["google","instagram","youtube","community","partner"] as const;
export function campaignUrl(input:{destination:"tenerife"|"gran-canaria";language:Language;channel:typeof campaignChannels[number];campaign:string;creative:string}){
  const url=new URL(localizedHref("/monthly-stays/"+input.destination,input.language),canonicalSiteUrl());
  url.searchParams.set("utm_source",input.channel);url.searchParams.set("utm_medium",input.channel==="google"?"cpc":input.channel==="partner"?"referral":"social");
  url.searchParams.set("utm_campaign",input.campaign.replace(/[^a-zA-Z0-9_-]/g,"-").slice(0,100));url.searchParams.set("utm_content",input.creative.replace(/[^a-zA-Z0-9_-]/g,"-").slice(0,100));return url.toString();
}
export function csvCell(value:unknown){const text=String(value??"");return '"'+(/^[=+@\-\t\r]/.test(text)?"'":"")+text.replace(/"/g,'""')+'"'}
