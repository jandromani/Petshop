import type { Metadata } from "next";
import { destinationSeoPages } from "@/src/seo/destinations";
import { canonicalSiteUrl } from "@/src/system/site-url";
import { seoAutopilotEnabled } from "@/src/seo/live";

export const metadata:Metadata={title:"Long-Stay Hotel Data & Price Indexes",description:"Atlas data pages for long-stay hotel markets, verified monthly-equivalent rates, sample sizes, freshness and methodology.",alternates:{canonical:canonicalSiteUrl()+"/data"},robots:{index:seoAutopilotEnabled(),follow:true}};

export default function DataHub(){
  const rows=destinationSeoPages.filter(x=>x.hotels>=20).slice(0,80);
  return <main className="seoPage"><div className="shell"><section className="seoHero"><div className="eyebrow">ATLAS DATA</div><h1>Long-stay hotel data,<br/>with the methodology attached.</h1><p>Each index reports what Atlas can actually verify: sample size, freshness, monthly-equivalent prices and the limits of the evidence.</p></section><div className="destinationHub">{rows.map(x=><a className="card" key={x.slug} href={"/data/"+x.slug}><span>{x.country}</span><h2>{x.market} price index</h2><p>{x.hotels} real hotels known · {x.mapped} mapped</p><b>Open dataset →</b></a>)}</div><nav className="seoInternalLinks"><a href="/methodology">Methodology</a><a href="/guides">Guides</a><a href="/destinations">Destinations</a></nav></div></main>;
}
