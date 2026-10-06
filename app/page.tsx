import { requestLanguage } from "@/src/i18n/server";
import { copy } from "@/src/i18n/config";
import { localizedMetadata,informationalIndexingEnabled } from "@/src/seo/public";
import { cookies } from "next/headers";
import Planner from "@/components/Planner";
import { chooseVariant,type HeroVariant } from "@/src/growth/experiments";
import { getHeroOverride } from "@/src/growth/autopilot";
import { publicDirectorySnapshot } from "@/src/data/public-directory";

export default async function Home(){
  const [jar,override]=await Promise.all([cookies(),getHeroOverride()]);
  const visitor=jar.get("rv_vid")?.value;
  const heroVariant=override?.variant||chooseVariant<HeroVariant>("hero-v1",visitor,["freedom","provocation"]);
  return <Planner heroVariant={heroVariant} initialDirectory={publicDirectorySnapshot(24)}/>;
}

export async function generateMetadata(){const lang=await requestLanguage();return localizedMetadata("/",lang,copy(lang,"Long-Stay Hotels & Monthly Hotel Rates | Atlas","Hoteles para largas estancias y temporadas | Atlas"),copy(lang,"Find a hotel for 30, 60 or 90 days. Review verified rates or request a quote for your dates.","Encuentra un hotel para 30, 60 o 90 días. Consulta tarifas verificadas o solicita un presupuesto para tus fechas."),informationalIndexingEnabled())}
