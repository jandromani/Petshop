import { cookies } from "next/headers";
import { z } from "zod";
import { SAVED_PROFILE_COOKIE } from "@/src/db/consumer-memory";
import { customerRequests,acceptCustomerQuote,REQUEST_ACCESS_COOKIE } from "@/src/db/customer-requests";
import { boundedJson,sameOrigin } from "@/src/security/public-request";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";
export async function GET(){const jar=await cookies();return Response.json({requests:await customerRequests(jar.get(SAVED_PROFILE_COOKIE)?.value,jar.get(REQUEST_ACCESS_COOKIE)?.value)},{headers:{"Cache-Control":"private, no-store"}})}
export async function POST(req:Request){
  if(!sameOrigin(req))return Response.json({error:"origin"},{status:403});
  const gate=await enforceRateLimit({key:requestFingerprint(req,"quote-accept"),limit:20,windowSeconds:3600});if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});
  const input=z.object({id:z.string().uuid()}).strict().safeParse(await boundedJson(req));if(!input.success)return Response.json({error:"invalid-request"},{status:400});
  const jar=await cookies();const path=await acceptCustomerQuote(input.data.id,jar.get(SAVED_PROFILE_COOKIE)?.value,jar.get(REQUEST_ACCESS_COOKIE)?.value);
  return path?Response.json({path,bookingConfirmed:false},{headers:{"Cache-Control":"private, no-store"}}):Response.json({error:"quote-unavailable"},{status:409});
}
