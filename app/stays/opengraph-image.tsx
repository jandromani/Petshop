import { atlasOg,ogSize } from "@/src/seo/og-image";
import { requestLanguage } from "@/src/i18n/server";
import { copy } from "@/src/i18n/config";
export const size=ogSize;export const contentType="image/png";
export default async function Image(){const lang=await requestLanguage();return atlasOg(copy(lang,"One place. A whole season.","Un lugar. Toda una temporada."),copy(lang,"Search real hotels for 30, 60 or 90 nights.","Busca hoteles reales para 30, 60 o 90 noches."),"ATLAS LONG STAY",undefined,lang)}
