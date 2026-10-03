import { cookies } from "next/headers";
import Planner from "@/components/Planner";
import { hotels } from "@/src/data/hotels";
import { chooseVariant,type HeroVariant } from "@/src/growth/experiments";

export default async function Home(){
  const jar=await cookies();
  const visitor=jar.get("rv_vid")?.value;
  const heroVariant=chooseVariant<HeroVariant>("hero-v1",visitor,["freedom","provocation"]);
  return <Planner hotels={hotels} heroVariant={heroVariant}/>;
}
