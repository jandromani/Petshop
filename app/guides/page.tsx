import type { Metadata } from "next";
import { EDITORIAL_PAGES } from "@/src/seo/editorial";
import { canonicalSiteUrl } from "@/src/system/site-url";
import { seoAutopilotEnabled } from "@/src/seo/live";

export const metadata:Metadata={title:"Long-Stay Hotel Guides & Data",description:"Evidence-led Atlas guides to monthly hotel living, 90-day stays, budgets, destinations and rate methodology.",alternates:{canonical:canonicalSiteUrl()+"/guides"},robots:{index:seoAutopilotEnabled(),follow:true}};

export default function Guides(){
  return <main className="seoPage"><div className="shell"><section className="seoHero"><div className="eyebrow">ATLAS GUIDES</div><h1>Long-stay travel,<br/>with the numbers attached.</h1><p>Guides are designed around Atlas data and methodology. Pages without enough current evidence remain out of search rather than being padded with invented conclusions.</p></section><div className="guideGrid">{EDITORIAL_PAGES.map(g=><a className="card" href={"/guides/"+g.slug} key={g.slug}><span className="eyebrow">{g.angle}</span><h2>{g.title}</h2><p>{g.description}</p><b>Read guide →</b></a>)}</div><nav className="seoInternalLinks"><a href="/destinations">Destinations</a><a href="/data">Atlas data</a><a href="/methodology">Methodology</a><a href="/trust">Trust Center</a></nav></div></main>;
}
