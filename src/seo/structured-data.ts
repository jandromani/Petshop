import type { LiveCatalogOffer } from "@/src/core/live-offers";

function isoDate(value:string|null|undefined){
  if(!value)return undefined;
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return undefined;
  return date.toISOString().slice(0,10);
}

export function buildLiveHotelStructuredData(offers:LiveCatalogOffer[],canonical:string){
  if(!offers.length)return null;
  const first=offers[0];
  return{
    "@context":"https://schema.org",
    "@type":"Hotel",
    name:first.name,
    address:{
      "@type":"PostalAddress",
      addressLocality:first.city,
      addressCountry:first.country,
    },
    url:canonical,
    makesOffer:offers.map(o=>({
      "@type":"Offer",
      price:o.displayPrice,
      priceCurrency:o.currency,
      validFrom:o.checkIn,
      ...(isoDate(o.expiresAt)?{priceValidUntil:isoDate(o.expiresAt)}:{}),
      availability:"https://schema.org/InStock",
      url:canonical,
    })),
  };
}

export function buildDiscoveryItemListStructuredData(input:{
  title:string;
  canonical:string;
  offers:LiveCatalogOffer[];
}){
  if(!input.offers.length)return null;
  return{
    "@context":"https://schema.org",
    "@type":"ItemList",
    name:input.title,
    url:input.canonical,
    numberOfItems:input.offers.length,
    itemListElement:input.offers.slice(0,12).map((o,index)=>({
      "@type":"ListItem",
      position:index+1,
      item:{
        "@type":"Hotel",
        name:o.name,
        address:{
          "@type":"PostalAddress",
          addressLocality:o.city,
          addressCountry:o.country,
        },
        offers:{
          "@type":"Offer",
          price:o.displayPrice,
          priceCurrency:o.currency,
          validFrom:o.checkIn,
          ...(isoDate(o.expiresAt)?{priceValidUntil:isoDate(o.expiresAt)}:{}),
          availability:"https://schema.org/InStock",
          url:input.canonical,
        },
      },
    })),
  };
}
