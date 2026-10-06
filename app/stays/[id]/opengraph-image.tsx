import { resolveDirectoryHotel } from "@/src/services/directory";
import { atlasOg,ogSize } from "@/src/seo/og-image";
import { requestLanguage } from "@/src/i18n/server";
import { copy } from "@/src/i18n/config";
export const size=ogSize;export const contentType="image/png";
export default async function Image({params}:{params:Promise<{id:string}>}){const h=await resolveDirectoryHotel((await params).id);const lang=await requestLanguage();return atlasOg(h?.name||"Atlas Long Stay",h?h.city+", "+h.country:copy(lang,"Your next season","Tu próxima temporada"),"ATLAS · HOTEL",copy(lang,"30–90 nights · request a rate for your dates","30–90 noches · solicita tarifa para tus fechas"),lang)}
