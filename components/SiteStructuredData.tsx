import { canonicalSiteUrl } from "@/src/system/site-url";

export default function SiteStructuredData(){
  const base=canonicalSiteUrl();
  const data={
    "@context":"https://schema.org",
    "@graph":[
      {
        "@type":"Organization",
        "@id":base+"/#organization",
        name:"Atlas Long Stay",
        url:base,
        sameAs:[],
      },
      {
        "@type":"WebSite",
        "@id":base+"/#website",
        url:base,
        name:"Atlas Long Stay",
        description:"Long-stay hotels and monthly hotel rates for 30–365 day stays.",
        publisher:{"@id":base+"/#organization"},
        inLanguage:["en","es"],
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,"\\u003c")}}/>;
}
