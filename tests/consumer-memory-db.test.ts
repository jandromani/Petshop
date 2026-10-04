import { afterAll,describe,expect,it } from "vitest";
import { getDatabase } from "@/src/db/client";
import { listSavedStaysForProfile,removeSavedStay,upsertSavedStay } from "@/src/db/consumer-memory";
import type { SavedStay } from "@/src/core/saved-stays";

const dbIt=process.env.DATABASE_URL?it:it.skip;
const created:string[]=[];

describe("consumer memory persistence",()=>{
  dbIt("round-trips one anonymous saved stay",async()=>{
    const stay:SavedStay={
      offerId:"ci-offer-1",slug:"ci-hotel",name:"CI Hotel",city:"Madrid",country:"Spain",provider:"direct",
      savedMonthly:1234,currency:"EUR",verifiedAt:"2026-10-04T10:00:00.000Z",expiresAt:null,savedAt:"2026-10-04T10:01:00.000Z",
    };
    const saved=await upsertSavedStay(null,stay);
    expect(saved?.profileId).toMatch(/^[0-9a-f-]{36}$/);
    if(!saved)throw new Error("profile not created");
    created.push(saved.profileId);

    const rows=await listSavedStaysForProfile(saved.profileId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({offerId:"ci-offer-1",slug:"ci-hotel",savedMonthly:1234,currency:"EUR"});

    expect(await removeSavedStay(saved.profileId,"ci-offer-1")).toBe(true);
    expect(await listSavedStaysForProfile(saved.profileId)).toEqual([]);
  });
});

afterAll(async()=>{
  const sql=getDatabase();
  if(!sql||!created.length)return;
  await sql`delete from consumer_profiles where id = any(${created}::uuid[])`;
});
