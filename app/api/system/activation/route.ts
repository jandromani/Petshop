import { activationManifest } from "@/src/system/activation";

export async function GET(){
  return Response.json(await activationManifest(),{headers:{"Cache-Control":"no-store"}});
}
