import type { Metadata } from "next";
import ConsentLayer from "@/components/ConsentLayer";
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
  description:"Compare 30–365 day hotel stays by monthly cost and search real hotels with AI, maps and verified commercial rates.",
  metadataBase:new URL(siteUrl()),
  openGraph:{title:"Atlas Long Stay — Live somewhere better",description:"Search real hotels for 30–365 day stays by monthly budget, dates, map and verified availability.",type:"website"},
  verification:{
    google:process.env.GOOGLE_SITE_VERIFICATION||undefined,
    other:process.env.BING_SITE_VERIFICATION?{"msvalidate.01":[process.env.BING_SITE_VERIFICATION]}:undefined,
  },
};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="en"><body>{children}<ConsentLayer/></body></html>;
}
