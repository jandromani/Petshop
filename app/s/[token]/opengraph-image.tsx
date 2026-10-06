import { resolveDirectoryHotel } from "@/src/services/directory";
import { getSharedSearch } from "@/src/db/shared-search";
import { searchShareTitle } from "@/src/core/shared-search";
import { atlasOg,ogSize } from "@/src/seo/og-image";
export const size=ogSize;export const contentType="image/png";
export default async function Image({params}:{params:Promise<{token:string}>}){const row=await getSharedSearch((await params).token);const hotel=row?.hotel_ids.length===1?await resolveDirectoryHotel(row.hotel_ids[0]):null;return atlasOg(hotel?.name|| (row?searchShareTitle(row.search_query,row.language):"Atlas Long Stay"),row?.language==="es"?"Compara hoteles reales. Solicita una tarifa para tus fechas.":"Compare real hotels. Request a rate for your dates.","ATLAS · SHARED SEARCH",row?.hotel_ids.length?row.hotel_ids.length+(row.language==="es"?" hoteles seleccionados":" hotels selected"):"30 / 60 / 90",row?.language||"en")}
