import { notFound } from "next/navigation";
import { SeoIntentLanding } from "@/components/SeoIntentLanding";
import { seoIntentPage } from "@/src/seo/intent-pages";
import { intentMetadata } from "@/src/seo/metadata";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const{slug}=await params;return intentMetadata("long-stay" as const,slug)}
export default async function Page({params}:{params:Promise<{slug:string}>}){const{slug}=await params;if(!seoIntentPage("long-stay" as const,slug))notFound();return <SeoIntentLanding kind="long-stay" slug={slug}/>}
