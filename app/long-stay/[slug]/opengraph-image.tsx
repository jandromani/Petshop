import { seoIntentPage } from "@/src/seo/intent-pages";import { atlasOg,ogContentType,ogSize } from "@/src/seo/og-image";
export const size=ogSize;export const contentType=ogContentType;
export default async function Image({params}:{params:Promise<{slug:string}>}){const{slug}=await params;const p=seoIntentPage("long-stay" as const,slug);return atlasOg(p?.headline||"Atlas long-stay hotels",p?.description||"Evidence-gated long-stay hotel search.","ATLAS LONG STAY","Current prices only when verified.")}
