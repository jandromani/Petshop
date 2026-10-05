import { hotelCenterExport,hotelCenterReadiness } from "@/src/google/hotel-center";
import { opsAuthorized } from "@/src/security/ops-auth";
export async function GET(req:Request){if(!(await opsAuthorized(req)))return new Response("Not found",{status:404});const readiness=await hotelCenterReadiness();const feed=await hotelCenterExport();return Response.json({readiness,feed},{headers:{"Cache-Control":"no-store"}})}
