import type { Metadata } from "next";
import { headers } from "next/headers";
import ConsentLayer from "@/components/ConsentLayer";
import GrowthPageView from "@/components/GrowthPageView";
import WebVitals from "@/components/WebVitals";
import SiteStructuredData from "@/components/SiteStructuredData";
import { seoAutopilotEnabled } from "@/src/seo/live";
import { canonicalSiteUrl } from "@/src/system/site-url";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

function siteUrl(){
  const explicit=process.env.NEXT_PUBLIC_SITE_URL;
  if(explicit)return explicit;
  const host=process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL;
  if(host)return "https://"+host;
  return "http://localhost:3000";
}

export const metadata:Metadata={
  title:{default:"Long-Stay Hotels & Monthly Hotel Rates | Atlas",template:"%s | Atlas"},
  description:"Find real hotels for 30–90 day stays, compare verified monthly-equivalent rates and request a private long-stay rate when public supply is absent.",
  metadataBase:new URL(siteUrl()),
  alternates:{canonical:canonicalSiteUrl()},
  openGraph:{
    title:"Long-Stay Hotels & Monthly Hotel Rates | Atlas",
    description:"Find real hotels for 30–90 day stays and compare verified monthly hotel rates.",
    type:"website",
    url:canonicalSiteUrl(),
    siteName:"Atlas Long Stay",
  },
  twitter:{card:"summary_large_image",title:"Long-Stay Hotels & Monthly Hotel Rates | Atlas",description:"30–90 day hotel stays: verified monthly rates or private sourcing."},
  robots:{index:seoAutopilotEnabled(),follow:true},
  verification:{
    google:process.env.GOOGLE_SITE_VERIFICATION||undefined,
    other:process.env.BING_SITE_VERIFICATION?{"msvalidate.01":[process.env.BING_SITE_VERIFICATION]}:undefined,
  },
};

export default async function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  const h=await headers();
  const lang=h.get("x-atlas-lang")==="es"?"es":"en";
  return <html lang={lang}><body><SiteStructuredData/>{children}<GrowthPageView/><WebVitals/><ConsentLayer/></body></html>;
}
