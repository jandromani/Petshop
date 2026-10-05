import type { LiveCatalogOffer } from "@/src/core/live-offers";

function isoDate(value:string|null|undefined){
  if(!value)return undefined;
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return undefined;
  return date.toISOString().slice(0,10);
}

function offerSchema(o:LiveCatalogOffer,url:string){
  return{
    "@type":"Offer",
    price:o.displayPrice,
    priceCurrency:o.currency,
    validFrom:o.checkIn,
    ...(isoDate(o.expiresAt)?{priceValidUntil:isoDate(o.expiresAt)}:{}),
    availability:"https://schema.org/InStock",
    url,
  };
}

export function buildLiveHotelStructuredData(offers:LiveCatalogOffer[],canonical:string){
  if(!offers.length)return null;
  const first=offers[0];
  return{
    "@context":"https://schema.org",
    "@type":"Hotel",
    "@id":canonical+"#hotel",
    name:first.name,
    address:{
      "@type":"PostalAddress",
      addressLocality:first.city,
      addressCountry:first.country,
    },
    url:canonical,
    makesOffer:offers.map(o=>offerSchema(o,canonical)),
  };
}

export function buildDiscoveryItemListStructuredData(input:{title:string;canonical:string;offers:LiveCatalogOffer[]}){
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
      url:input.canonical,
      item:{
        "@type":"Hotel",
        name:o.name,
        address:{"@type":"PostalAddress",addressLocality:o.city,addressCountry:o.country},
        offers:offerSchema(o,input.canonical),
      },
    })),
  };
}

export function buildBreadcrumbStructuredData(items:Array<{name:string;url:string}>){
  if(items.length<2)return null;
  return{
    "@context":"https://schema.org",
    "@type":"BreadcrumbList",
    itemListElement:items.map((item,index)=>({
      "@type":"ListItem",
      position:index+1,
      name:item.name,
      item:item.url,
    })),
  };
}

export function buildArticleStructuredData(input:{headline:string;description:string;canonical:string;dateModified:string;inLanguage?:"en"|"es"}){
  return{
    "@context":"https://schema.org",
    "@type":"Article",
    headline:input.headline,
    description:input.description,
    mainEntityOfPage:input.canonical,
    dateModified:input.dateModified,
    inLanguage:input.inLanguage||"en",
    publisher:{"@type":"Organization","name":"Atlas Long Stay"},
  };
}


export function buildDatasetStructuredData(input:{name:string;description:string;canonical:string;dateModified:string;spatial:string;variables:string[]}){
  return{
    "@context":"https://schema.org",
    "@type":"Dataset",
    name:input.name,
    description:input.description,
    url:input.canonical,
    dateModified:input.dateModified,
    creator:{"@type":"Organization","name":"Atlas Long Stay"},
    spatialCoverage:input.spatial,
    variableMeasured:input.variables,
    license:"https://creativecommons.org/licenses/by/4.0/",
    isAccessibleForFree:true,
  };
}
