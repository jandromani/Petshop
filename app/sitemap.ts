import type { MetadataRoute } from "next";
import { hotels } from "@/src/data/hotels";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://example.vercel.app";
  return [
    {url:base,changeFrequency:"daily",priority:1},
    ...hotels.map(h=>({url:base+"/live/"+h.slug,changeFrequency:"daily" as const,priority:.7}))
  ];
}
