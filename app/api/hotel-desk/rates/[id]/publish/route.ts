import { publishDirectRate } from "@/src/db/direct-supply";
import { opsAuthorized } from "@/src/security/ops-auth";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await opsAuthorized(req))) return new Response("Unauthorized",{status:401});
  const {id}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({error:"invalid-rate-id"},{status:400});
  const result=await publishDirectRate(id);
  return Response.json(result,{status:result.published?200:409});
}
