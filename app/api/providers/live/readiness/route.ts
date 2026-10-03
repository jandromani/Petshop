import { providerReadinessReport } from "@/src/providers/live/conformance";

import { opsAuthorized } from "@/src/security/ops-auth";
export const runtime="nodejs";


export async function GET(req:Request){
  if(!(await opsAuthorized(req))) return new Response("Not found",{status:404});
  return Response.json({
    providers:providerReadinessReport(),
    generatedAt:new Date().toISOString(),
    invariants:[
      "no credentials => DISABLED",
      "configured does not imply commercial-ready",
      "seed/demo inventory never becomes commercial supply",
      "provider-specific fulfilment gates remain mandatory",
    ],
  },{headers:{"Cache-Control":"no-store"}});
}
