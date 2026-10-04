import type { LiveCatalogOffer } from "@/src/core/live-offers";
import { buildLiveHotelStructuredData } from "@/src/seo/structured-data";

export default function LiveStructuredData({offers,canonical}:{offers:LiveCatalogOffer[];canonical:string}){
  const data=buildLiveHotelStructuredData(offers,canonical);
  if(!data)return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data)}}/>;
}
