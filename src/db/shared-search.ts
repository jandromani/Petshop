import { randomBytes } from "node:crypto";
import { getDatabase } from "@/src/db/client";
import { publicSearchQuery } from "@/src/core/shared-search";
import type { Language } from "@/src/i18n/config";
export async function createSharedSearch(query:string,hotelIds:string[],language:Language){
  const sql=getDatabase();if(!sql)return null;
  const id=randomBytes(16).toString("base64url");
  const rows=await sql<Array<{id:string;expires_at:string}>>`insert into shared_searches(id,search_query,hotel_ids,language) values(${id},${publicSearchQuery(query)},${sql.json(hotelIds)},${language}) returning id,expires_at::text`;
  return rows[0]||null;
}
export async function getSharedSearch(id:string){
  if(!/^[A-Za-z0-9_-]{22}$/.test(id))return null;
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<Array<{id:string;search_query:string;hotel_ids:string[];language:Language;expires_at:string}>>`select id,search_query,hotel_ids,language,expires_at::text from shared_searches where id=${id} and expires_at>now() limit 1`;
  return rows[0]||null;
}
