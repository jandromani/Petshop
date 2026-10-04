import { opsAuthorized } from "@/src/security/ops-auth";
import { getWeeklyOperatingScorecard } from "@/src/system/scorecard";

export const runtime="nodejs";

export async function GET(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Not found",{status:404});
  return Response.json(await getWeeklyOperatingScorecard(),{headers:{"Cache-Control":"no-store"}});
}
