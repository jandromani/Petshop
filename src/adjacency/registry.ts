export type AdjacencyKind="flight"|"insurance"|"telemedicine"|"transfer"|"home-management";

export type AdjacencyPartner={
  kind:AdjacencyKind;
  label:string;
  description:string;
  configured:boolean;
  partnerKey:string|null;
  partnerName:string|null;
  url:string|null;
  trackingParam:string|null;
};

const defs:Array<{kind:AdjacencyKind;label:string;description:string;prefix:string}>=[
  {kind:"flight",label:"Flights",description:"Get to the next stay without turning transport into a hidden bundle.",prefix:"ADJ_FLIGHT"},
  {kind:"insurance",label:"Travel insurance",description:"Optional cover referred separately from accommodation.",prefix:"ADJ_INSURANCE"},
  {kind:"telemedicine",label:"Telemedicine",description:"Independent remote-health access where a partner is configured.",prefix:"ADJ_TELEMEDICINE"},
  {kind:"transfer",label:"Airport transfer",description:"Optional arrival transport referred as a separate service.",prefix:"ADJ_TRANSFER"},
  {kind:"home-management",label:"Home management",description:"Keep the home working while living elsewhere.",prefix:"ADJ_HOME_MANAGEMENT"},
];

function safeHttps(raw:string|undefined){
  if(!raw)return null;
  try{
    const url=new URL(raw);
    if(url.protocol!=="https:"||!url.hostname||url.hostname==="localhost")return null;
    return url.toString();
  }catch{return null;}
}

export function adjacencyPartners():AdjacencyPartner[]{
  return defs.map(def=>{
    const url=safeHttps(process.env[def.prefix+"_URL"]);
    const partnerKey=(process.env[def.prefix+"_KEY"]||"").trim()||null;
    const partnerName=(process.env[def.prefix+"_NAME"]||"").trim()||null;
    const trackingParam=(process.env[def.prefix+"_TRACKING_PARAM"]||"").trim()||null;
    return{...def,configured:Boolean(url&&partnerKey&&partnerName),partnerKey,partnerName,url,trackingParam};
  });
}

export function adjacencyPartner(kind:string){
  return adjacencyPartners().find(x=>x.kind===kind)||null;
}

export function safeAdjacencyTarget(partner:AdjacencyPartner){
  if(!partner.configured||!partner.url)return null;
  try{
    const url=new URL(partner.url);
    if(url.protocol!=="https:")return null;
    return url;
  }catch{return null;}
}
