"use client";
import Script from "next/script";

export default function GoogleMeasurement(){
  const ga=process.env.NEXT_PUBLIC_GA4_ID?.trim();
  const ads=process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim();
  const id=ga||ads;
  if(!id)return null;
  const config=[
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){dataLayer.push(arguments);}",
    "window.gtag=window.gtag||gtag;",
    "gtag('js',new Date());",
    ga?"gtag('config','"+ga+"',{anonymize_ip:true,send_page_view:true});":"",
    ads?"gtag('config','"+ads+"');":"",
  ].join("\n");
  return <>
    <Script src={"https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(id)} strategy="afterInteractive"/>
    <Script id="atlas-google-measurement" strategy="afterInteractive">{config}</Script>
  </>;
}
