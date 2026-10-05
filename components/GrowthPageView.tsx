"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { growthEvent } from "@/src/growth/client";

export default function GrowthPageView(){
  const pathname=usePathname();
  useEffect(()=>{growthEvent("page_view",{route:pathname})},[pathname]);
  return null;
}