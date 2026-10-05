import { notFound } from "next/navigation";
import { SeoIntentLanding } from "@/components/SeoIntentLanding";
import { seoIntentPage } from "@/src/seo/intent-pages";
import { intentMetadata } from "@/src/seo/metadata";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const{slug}=await params;return intentMetadata("monthly-hotels" as const,slug)}
export default async function Page({params}:{params:Promise<{slug:string}>}){const{slug}=await params;if(!seoIntentPage("monthly-hotels" as const,slug))notFound();return <SeoIntentLanding kind="monthly-hotels" slug={slug}/>}
