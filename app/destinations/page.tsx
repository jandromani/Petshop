import type { Metadata } from "next";
import { destinationSeoPages } from "@/src/seo/destinations";
import { canonicalSiteUrl } from "@/src/system/site-url";
import { seoAutopilotEnabled } from "@/src/seo/live";

export const metadata:Metadata={
  title:"Long-Stay Hotel Destinations",
  description:"Explore Atlas long-stay hotel destinations for 30–90 day stays, from Madrid and Tenerife to seasonal destinations worldwide.",
  alternates:{canonical:canonicalSiteUrl()+"/destinations"},
  robots:{index:seoAutopilotEnabled(),follow:true},
};

export default function Destinations(){
  const rows=destinationSeoPages.filter(x=>x.hotels>=20).slice(0,80);
  return <main className="seoPage"><div className="shell"><section className="seoHero"><div className="eyebrow">ATLAS DESTINATIONS</div><h1>Places worth living in<br/>for more than a weekend.</h1><p>Explore real hotel markets for month-long, seasonal and 90-day stays. Prices only become “available” when Atlas can verify them.</p></section><div className="destinationHub">{rows.map(x=><a className="card" key={x.slug} href={"/destinations/"+x.slug}><span>{x.country}</span><h2>{x.market}</h2><p>{x.hotels} hotels known · {x.mapped} mapped</p><b>Explore long stays →</b></a>)}</div><nav className="seoInternalLinks"><a href="/budget/under-1500">Under €1,500/month</a><a href="/budget/under-2000">Under €2,000/month</a><a href="/lifestyle/winter-sun">Winter sun</a><a href="/lifestyle/all-inclusive">All inclusive</a><a href="/guides">Long-stay guides</a><a href="/data">Atlas data</a></nav></div></main>;
}
