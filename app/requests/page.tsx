import { headers } from "next/headers";
import CustomerRequests from "@/components/CustomerRequests";
import { copy,localizedHref } from "@/src/i18n/config";
export const metadata={title:"My stay requests",robots:{index:false,follow:false}};
export default async function Requests(){const lang=(await headers()).get("x-atlas-lang")==="es"?"es":"en";return <main className="seoPage"><div className="shell"><a href={localizedHref("/",lang)} className="eyebrow">← ATLAS LONG STAY</a><section className="seoHero"><h1>{copy(lang,"Follow your next season.","Sigue tu próxima temporada.")}</h1><p>{copy(lang,"Your dates, your request, your next step.","Tus fechas, tu solicitud y el siguiente paso.")}</p></section><CustomerRequests/></div></main>}
