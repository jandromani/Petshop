import { notFound } from "next/navigation";
import { getSharedSearch } from "@/src/db/shared-search";
import { searchShareTitle } from "@/src/core/shared-search";
import { requestLanguage } from "@/src/i18n/server";
import { copy } from "@/src/i18n/config";
import { localizedMetadata } from "@/src/seo/public";
import StayDetail from "@/app/stays/[id]/page";
import { resolveDirectoryHotel } from "@/src/services/directory";
import Stays from "@/app/stays/page";
import Compare from "@/app/compare/page";
export async function generateMetadata({params}:{params:Promise<{token:string}>}){const row=await getSharedSearch((await params).token);if(!row)return{robots:{index:false,follow:false}};const lang=await requestLanguage();return localizedMetadata("/s/"+row.id,lang,(row.hotel_ids.length===1?(await resolveDirectoryHotel(row.hotel_ids[0]))?.name:null)||searchShareTitle(row.search_query,lang),copy(lang,"A shared hotel search. Review current rates or request a quote for your dates.","Una búsqueda de hoteles compartida. Consulta tarifas vigentes o solicita un presupuesto para tus fechas."))}
export default async function SharedSearch({params}:{params:Promise<{token:string}>}){const row=await getSharedSearch((await params).token);if(!row)notFound();const query=Object.fromEntries(new URLSearchParams(row.search_query));if(row.hotel_ids.length===1)return <StayDetail params={Promise.resolve({id:row.hotel_ids[0]})} searchParams={Promise.resolve(query)}/>;if(row.hotel_ids.length)return <Compare searchParams={Promise.resolve({...query,ids:row.hotel_ids.join(",")})}/>;return <Stays searchParams={Promise.resolve(query)}/>}
