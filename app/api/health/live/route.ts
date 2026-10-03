import { runSoftwareProof } from "@/src/system/proof";

export async function GET(){
  const proof=runSoftwareProof();
  return Response.json({
    ok:true,
    service:"atlas-web",
    process:"LIVE",
    softwareProof:proof.pass,
    now:new Date().toISOString(),
  },{headers:{"Cache-Control":"no-store"}});
}
