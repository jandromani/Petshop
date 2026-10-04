import { getEconomicsSnapshot } from "@/src/system/economics";
import { opsAuthorized } from "@/src/security/ops-auth";

export const runtime="nodejs";

export async function GET(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Not found",{status:404});
  const days=Math.max(1,Math.min(365,Number(new URL(req.url).searchParams.get("days")||30)));
  return Response.json(await getEconomicsSnapshot(days),{headers:{"Cache-Control":"no-store"}});
}
