import Planner from "@/components/Planner";
import { hotels } from "@/src/data/hotels";

export default function Home() {
  return <Planner hotels={hotels} />;
}
