"use client";
import { useReportWebVitals } from "next/web-vitals";
import { growthEvent } from "@/src/growth/client";

export default function WebVitals(){
  useReportWebVitals(metric=>{
    if(!["LCP","INP","CLS","FCP","TTFB"].includes(metric.name))return;
    growthEvent("web_vital",{
      metric:metric.name,
      value:Number(metric.value.toFixed(metric.name==="CLS"?4:1)),
      rating:metric.rating,
      metric_id:metric.id.slice(0,80),
      navigation_type:String(metric.navigationType||"unknown"),
    });
  });
  return null;
}
