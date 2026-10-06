import { cronAuthorized } from "@/src/security/ops-auth";
import { drainSourcingEmail } from "@/src/services/sourcing-delivery";
export async function GET(req:Request){if(!cronAuthorized(req))return new Response("Unauthorized",{status:401});return Response.json(await drainSourcingEmail(),{headers:{"Cache-Control":"no-store"}})}
