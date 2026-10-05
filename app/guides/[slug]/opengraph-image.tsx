import { editorialBySlug } from "@/src/seo/editorial";import { atlasOg,ogContentType,ogSize } from "@/src/seo/og-image";
export const size=ogSize;export const contentType=ogContentType;
export default async function Image({params}:{params:Promise<{slug:string}>}){const{slug}=await params;const p=editorialBySlug(slug);return atlasOg(p?.title||"Atlas long-stay guide",p?.description||"Evidence-led long-stay hotel research.","ATLAS GUIDES","Data + methodology, not generic travel copy.")}
