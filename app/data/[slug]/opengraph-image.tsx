import { destinationSeoBySlug } from "@/src/seo/destinations";import { atlasOg,ogContentType,ogSize } from "@/src/seo/og-image";
export const size=ogSize;export const contentType=ogContentType;
export default async function Image({params}:{params:Promise<{slug:string}>}){const{slug}=await params;const p=destinationSeoBySlug(slug);return atlasOg((p?.market||"Atlas")+" price index","Verified long-stay hotel rate evidence, sample size, freshness and monthly equivalents.","ATLAS DATA",p?p.hotels+" real hotels in the destination set":"Evidence-gated dataset")}
