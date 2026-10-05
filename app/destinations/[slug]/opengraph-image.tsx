import { destinationSeoBySlug } from "@/src/seo/destinations";import { atlasOg,ogContentType,ogSize } from "@/src/seo/og-image";
export const size=ogSize;export const contentType=ogContentType;
export default async function Image({params}:{params:Promise<{slug:string}>}){const{slug}=await params;const p=destinationSeoBySlug(slug);return atlasOg(p?p.market+" long-stay hotels":"Atlas destinations",p?p.country+" · monthly & 30–90 day stays":"Explore long-stay destinations","ATLAS DESTINATIONS",p?p.hotels+" real hotels known":"Verified prices only when current.")}
