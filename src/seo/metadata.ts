import type { Metadata } from "next";
import { seoIntentEvidence,seoIntentPage,type SeoIntentKind } from "@/src/seo/intent-pages";

export async function intentMetadata(kind:SeoIntentKind,slug:string):Promise<Metadata>{
  const page=seoIntentPage(kind,slug);if(!page)return{};
  const evidence=await seoIntentEvidence(page);
  return{
    title:page.title,
    description:page.description,
    alternates:{canonical:evidence.canonical},
    robots:{index:evidence.gate.index,follow:true},
    openGraph:{title:page.title+" | Atlas",description:page.description,url:evidence.canonical,type:"website"},
    twitter:{card:"summary_large_image",title:page.title+" | Atlas",description:page.description},
  };
}
