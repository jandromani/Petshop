import { adjacencyPartners } from "@/src/adjacency/registry";

export async function GET(){
  const partners=adjacencyPartners().map(p=>({
    kind:p.kind,label:p.label,description:p.description,configured:p.configured,partnerName:p.configured?p.partnerName:null,
  }));
  return Response.json({partners,generatedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
}
