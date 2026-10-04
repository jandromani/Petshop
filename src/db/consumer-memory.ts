import { randomUUID } from "node:crypto";
import { getDatabase } from "@/src/db/client";
import type { SavedStay } from "@/src/core/saved-stays";

export const SAVED_PROFILE_COOKIE="atlas_saved_profile";

export function validSavedProfileId(value:string|undefined|null):value is string{
  return Boolean(value&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export async function ensureSavedProfile(candidate?:string|null){
  const sql=getDatabase();
  if(!sql)return null;

  if(validSavedProfileId(candidate)){
    const rows=await sql<{id:string}[]>`
      update consumer_profiles
      set last_seen_at=now(),updated_at=now()
      where id=${candidate}::uuid
      returning id::text
    `;
    if(rows[0]?.id)return rows[0].id;
  }

  const id=randomUUID();
  await sql`
    insert into consumer_profiles(id) values (${id}::uuid)
    on conflict (id) do update set last_seen_at=now(),updated_at=now()
  `;
  return id;
}

export async function listSavedStaysForProfile(profileId:string|undefined|null):Promise<SavedStay[]>{
  const sql=getDatabase();
  if(!sql||!validSavedProfileId(profileId))return[];
  const rows=await sql<Array<{
    offer_id:string;slug:string;name:string;city:string;country:string;provider:string;
    saved_monthly:number;currency:string;verified_at:string;expires_at:string|null;saved_at:string;
  }>>`
    select offer_id,slug,name,city,country,provider,saved_monthly,currency,
      verified_at::text,expires_at::text,saved_at::text
    from consumer_saved_stays
    where profile_id=${profileId}::uuid
    order by saved_at desc
    limit 30
  `;
  await sql`update consumer_profiles set last_seen_at=now(),updated_at=now() where id=${profileId}::uuid`;
  return rows.map(row=>({
    offerId:row.offer_id,slug:row.slug,name:row.name,city:row.city,country:row.country,provider:row.provider,
    savedMonthly:Number(row.saved_monthly),currency:row.currency,
    verifiedAt:new Date(row.verified_at).toISOString(),
    expiresAt:row.expires_at?new Date(row.expires_at).toISOString():null,
    savedAt:new Date(row.saved_at).toISOString(),
  }));
}

export async function upsertSavedStay(candidateProfileId:string|undefined|null,stay:SavedStay){
  const sql=getDatabase();
  if(!sql)return null;
  const profileId=await ensureSavedProfile(candidateProfileId);
  if(!profileId)return null;
  const rows=await sql<{saved_at:string}[]>`
    insert into consumer_saved_stays(
      profile_id,offer_id,slug,name,city,country,provider,saved_monthly,currency,verified_at,expires_at,saved_at
    ) values (
      ${profileId}::uuid,${stay.offerId},${stay.slug},${stay.name},${stay.city},${stay.country},${stay.provider},
      ${stay.savedMonthly},${stay.currency},${stay.verifiedAt}::timestamptz,${stay.expiresAt}::timestamptz,now()
    )
    on conflict (profile_id,offer_id) do update set
      slug=excluded.slug,name=excluded.name,city=excluded.city,country=excluded.country,provider=excluded.provider,
      saved_monthly=excluded.saved_monthly,currency=excluded.currency,verified_at=excluded.verified_at,
      expires_at=excluded.expires_at,saved_at=now()
    returning saved_at::text
  `;
  return{profileId,savedAt:new Date(rows[0]?.saved_at||Date.now()).toISOString()};
}

export async function removeSavedStay(profileId:string|undefined|null,offerId:string){
  const sql=getDatabase();
  if(!sql||!validSavedProfileId(profileId))return false;
  const rows=await sql<{offer_id:string}[]>`
    delete from consumer_saved_stays
    where profile_id=${profileId}::uuid and offer_id=${offerId}
    returning offer_id
  `;
  await sql`update consumer_profiles set last_seen_at=now(),updated_at=now() where id=${profileId}::uuid`;
  return Boolean(rows[0]);
}
