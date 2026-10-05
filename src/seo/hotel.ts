import type { DirectoryHotel } from "@/src/db/directory";
import { listSellableOffers } from "@/src/db/catalog";
import { canonicalSiteUrl,customPublicDomainConfigured,searchConsoleVerificationConfigured } from "@/src/system/site-url";
import { seoAutopilotEnabled } from "@/src/seo/live";

function norm(s:string){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function sameHotel(a:string,b:string){const x=norm(a),y=norm(b);return x===y||x.includes(y)||y.includes(x)}

export async function hotelSeoEvidence(hotel:DirectoryHotel){
  const offers=(await listSellableOffers({q:hotel.name,limit:20})).filter(o=>o.city.toLowerCase()===hotel.city.toLowerCase()&&sameHotel(o.name,hotel.name));
  const fresh=offers.filter(o=>new Date(o.expiresAt||0).getTime()>Date.now());
  const canonical=canonicalSiteUrl()+"/stays/"+encodeURIComponent(hotel.id);
  const reasons:string[]=[];
  if(!seoAutopilotEnabled())reasons.push("SEO indexing gate closed");
  if(!customPublicDomainConfigured())reasons.push("custom domain missing");
  if(!searchConsoleVerificationConfigured())reasons.push("Search Console verification missing");
  if(!(hotel.lat!==null&&hotel.lng!==null))reasons.push("coordinates missing");
  if(!hotel.address)reasons.push("address missing");
  if(!(hotel.website||hotel.referenceUrl))reasons.push("official or reliable source missing");
  if(!hotel.description||hotel.description.trim().length<120)reasons.push("unique description too thin");
  if((hotel.facilities||[]).length<4)reasons.push("fewer than four useful attributes");
  if((hotel.photoUrls||[]).length<1||!hotel.contentLicenseRef)reasons.push("licensed image evidence missing");
  if(!fresh.length)reasons.push("no current commercial offer");
  if(!fresh.every(o=>o.displayPrice>0&&Boolean(o.currency&&o.checkIn)))reasons.push("commercial structured-data prerequisites missing");
  return{index:reasons.length===0,reasons,offers:fresh,canonical};
}
