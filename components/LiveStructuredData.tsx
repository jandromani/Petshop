import type { LiveCatalogOffer } from "@/src/core/live-offers";

export default function LiveStructuredData({offers,canonical}:{offers:LiveCatalogOffer[];canonical:string}){
  if(!offers.length)return null;
  const first=offers[0];
  const data={
    "@context":"https://schema.org",
    "@type":"Hotel",
    name:first.name,
    address:{"@type":"PostalAddress",addressLocality:first.city,addressCountry:first.country},
    url:canonical,
    makesOffer:offers.map(o=>({
      "@type":"Offer",
      price:o.displayPrice,
      priceCurrency:o.currency,
      validFrom:o.checkIn,
      availability:"https://schema.org/InStock",
      url:canonical,
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data)}}/>;
}
