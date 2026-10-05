import { cookies } from "next/headers";
import Planner from "@/components/Planner";
import { hotels } from "@/src/data/hotels";
import { chooseVariant,type HeroVariant } from "@/src/growth/experiments";
import { getHeroOverride } from "@/src/growth/autopilot";
import { publicDirectorySnapshot } from "@/src/data/public-directory";

export default async function Home(){
  const [jar,override]=await Promise.all([cookies(),getHeroOverride()]);
  const visitor=jar.get("rv_vid")?.value;
  const heroVariant=override?.variant||chooseVariant<HeroVariant>("hero-v1",visitor,["freedom","provocation"]);
  return <Planner hotels={hotels} heroVariant={heroVariant} initialDirectory={publicDirectorySnapshot(24)}/>;
}
