import { monthlyStayGuide } from "@/src/seo/monthly-stays";
import { atlasOg,ogSize } from "@/src/seo/og-image";
import { requestLanguage } from "@/src/i18n/server";
import { copy } from "@/src/i18n/config";
export const size=ogSize;export const contentType="image/png";
export default async function Image({params}:{params:Promise<{destination:string}>}){const guide=monthlyStayGuide((await params).destination);const lang=await requestLanguage();return atlasOg((guide?.destination||"Your next season")+".",copy(lang,"One month. One season. A place to live.","Un mes. Una temporada. Un lugar para vivir."),"ATLAS · 30 / 60 / 90",copy(lang,"Explore hotels · request a rate for your dates","Explora hoteles · solicita tarifa para tus fechas"),lang)}
