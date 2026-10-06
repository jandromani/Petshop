import { shareSearchInput } from "@/src/core/shared-search";
import { createSharedSearch } from "@/src/db/shared-search";
import { canonicalSiteUrl } from "@/src/system/site-url";
import { localizedHref } from "@/src/i18n/config";
import { boundedJson,sameOrigin } from "@/src/security/public-request";
import { enforceRateLimit,requestFingerprint } from "@/src/security/rate-limit";
export async function POST(req:Request){
  if(!sameOrigin(req))return Response.json({error:"origin"},{status:403});
  const gate=await enforceRateLimit({key:requestFingerprint(req,"share-search"),limit:20,windowSeconds:3600});
  if(!gate.allowed)return Response.json({error:"rate-limited"},{status:429});
  const input=shareSearchInput.safeParse(await boundedJson(req));if(!input.success)return Response.json({error:"invalid-search"},{status:400});
  const row=await createSharedSearch(input.data.query,[...new Set(input.data.hotelIds)],input.data.language);
  if(!row)return Response.json({error:"unavailable"},{status:503});
  return Response.json({url:canonicalSiteUrl()+localizedHref("/s/"+row.id,input.data.language),expiresAt:row.expires_at},{status:201,headers:{"Cache-Control":"no-store"}});
}
