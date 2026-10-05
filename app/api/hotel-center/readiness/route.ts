import { hotelCenterReadiness } from "@/src/google/hotel-center";
import { opsAuthorized } from "@/src/security/ops-auth";
export async function GET(req:Request){if(!(await opsAuthorized(req)))return new Response("Not found",{status:404});return Response.json(await hotelCenterReadiness(),{headers:{"Cache-Control":"no-store"}})}
