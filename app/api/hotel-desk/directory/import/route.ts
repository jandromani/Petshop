import { z } from "zod";
import { importDirectoryHotels } from "@/src/db/directory";
import { opsAuthorized } from "@/src/security/ops-auth";
export const runtime="nodejs";
const HttpsUrl=z.string().url().refine(v=>v.startsWith("https://"),"https-required");
const Hotel=z.object({
  sourceId:z.string().min(1).max(180),name:z.string().min(2).max(240),city:z.string().min(1).max(140),country:z.string().min(1).max(140),
  region:z.enum(["Europe","Asia","Africa","Americas"]),lat:z.number().min(-90).max(90).optional(),lng:z.number().min(-180).max(180).optional(),
  referenceUrl:HttpsUrl.optional(),website:HttpsUrl.optional(),raw:z.record(z.string(),z.unknown()).optional(),
});
const Input=z.object({source:z.string().min(2).max(64).regex(/^[a-z0-9][a-z0-9._:-]*$/),hotels:z.array(Hotel).min(1).max(250)});
export async function POST(req:Request){
  if(!(await opsAuthorized(req)))return new Response("Unauthorized",{status:401});
  const parsed=Input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"invalid-directory-import",issues:parsed.error.issues},{status:400});
  const result=await importDirectoryHotels(parsed.data.source,parsed.data.hotels);
  if(!result)return Response.json({error:"database-not-configured"},{status:503});
  return Response.json({ok:result.failed===0,...result},{status:result.failed===0?201:207,headers:{"Cache-Control":"no-store"}});
}