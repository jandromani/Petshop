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
        description:"30–90 day hotel stays with verified monthly rates and private sourcing when public supply is absent.",
        publisher:{"@id":base+"/#organization"},
        inLanguage:["en","es"],
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,"\\u003c")}}/>;
}
