import { getSloSnapshot } from "@/src/system/slo";
import { opsAuthorized } from "@/src/security/ops-auth";

export const runtime="nodejs";

export async function GET(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Not found",{status:404});
  return Response.json(await getSloSnapshot(),{headers:{"Cache-Control":"no-store"}});
}
