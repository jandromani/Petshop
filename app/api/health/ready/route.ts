import { getSystemReadiness } from "@/src/system/readiness";

export async function GET(req:Request){
  const status=await getSystemReadiness();
  const softwareReady=status.proof.pass;
  const commercialReady=status.infrastructure.databaseConfigured
    && status.infrastructure.configuredProviders.length>0
    && status.layers.supply.state==="LIVE";
  const requireCommercial=new URL(req.url).searchParams.get("commercial")==="1";
  const ok=softwareReady&&(!requireCommercial||commercialReady);
  return Response.json({
    ok,softwareReady,commercialReady,
    layers:status.layers,
    infrastructure:status.infrastructure,
    generatedAt:status.generatedAt,
  },{status:ok?200:503,headers:{"Cache-Control":"no-store"}});
}
