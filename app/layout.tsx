import type { Metadata } from "next";
import ConsentLayer from "@/components/ConsentLayer";
import GrowthPageView from "@/components/GrowthPageView";
import WebVitals from "@/components/WebVitals";
import { seoAutopilotEnabled } from "@/src/seo/live";
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
  title:{default:"Atlas Long Stay — Live somewhere better",template:"%s · Atlas Long Stay"},
  description:"Find real hotels for 30–365 day stays, compare by month and request a verified long-stay price when one is not available yet.",
  metadataBase:new URL(siteUrl()),
  openGraph:{title:"Atlas Long Stay — Live somewhere better",description:"Live somewhere better for 30–365 days. Explore real hotels by month and only see prices Atlas can verify.",type:"website"},
  robots:{index:seoAutopilotEnabled(),follow:true},
  verification:{
    google:process.env.GOOGLE_SITE_VERIFICATION||undefined,
    other:process.env.BING_SITE_VERIFICATION?{"msvalidate.01":[process.env.BING_SITE_VERIFICATION]}:undefined,
  },
};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="en"><body>{children}<GrowthPageView/><WebVitals/><ConsentLayer/></body></html>;
}
