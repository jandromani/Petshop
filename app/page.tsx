import Planner from "@/components/Planner";
import { hotels } from "@/src/data/hotels";
import { decodePlanToken } from "@/src/core/share";

export default async function Home({searchParams}:{searchParams:Promise<{plan?:string}>}) {
  const {plan}=await searchParams;
  const initial=plan ? decodePlanToken(plan) || undefined : undefined;
  return <Planner hotels={hotels} initial={initial} />;
}
