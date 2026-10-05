import { afterAll,describe,expect,it } from "vitest";
import { getDatabase } from "@/src/db/client";
import { deleteSavedProfile,exportSavedProfileData,listSavedHotelsForProfile,listSavedStaysForProfile,removeSavedHotel,removeSavedStay,upsertSavedHotel,upsertSavedStay } from "@/src/db/consumer-memory";
import type { SavedStay } from "@/src/core/saved-stays";
import type { SavedHotel } from "@/src/core/saved-hotels";
import { deleteRateAlert,listRateAlerts,upsertRateAlert } from "@/src/db/rate-alerts";

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

    const exported=await exportSavedProfileData(saved.profileId);
    expect(exported.profile?.id).toBe(saved.profileId);
    expect(exported.profile?.createdAt).toMatch(/Z$/);
    expect(exported.saved).toHaveLength(1);
    expect(exported.saved[0]).toMatchObject({offerId:"ci-offer-1",provider:"direct",currency:"EUR"});

    expect(await removeSavedStay(saved.profileId,"ci-offer-1")).toBe(true);
    expect(await listSavedStaysForProfile(saved.profileId)).toEqual([]);
  });

  dbIt("round-trips one anonymous saved real hotel without inventing a price",async()=>{
    const hotel:SavedHotel={hotelId:"overture-ci-hotel",name:"CI Real Hotel",city:"Madrid",country:"Spain",source:"overture",savedAt:"2026-10-05T10:00:00.000Z"};
    const saved=await upsertSavedHotel(null,hotel);expect(saved?.profileId).toMatch(/^[0-9a-f-]{36}$/);if(!saved)throw new Error("profile not created");
    created.push(saved.profileId);
    expect(await listSavedHotelsForProfile(saved.profileId)).toEqual([expect.objectContaining({hotelId:"overture-ci-hotel",name:"CI Real Hotel",source:"overture"})]);
    const exported=await exportSavedProfileData(saved.profileId);expect(exported.savedHotels).toHaveLength(1);expect(exported.savedHotels[0]).toMatchObject({hotelId:"overture-ci-hotel"});
    expect(await removeSavedHotel(saved.profileId,"overture-ci-hotel")).toBe(true);expect(await listSavedHotelsForProfile(saved.profileId)).toEqual([]);
  });

  dbIt("round-trips one anonymous rate alert and keeps it price-truthful",async()=>{
    const createdAlert=await upsertRateAlert(null,{
      hotelId:"overture-alert-hotel",hotelName:"Alert Hotel",city:"Madrid",country:"Spain",
      checkIn:"2027-01-15",nights:90,occupancy:1,targetMonthly:1700,
    });
    expect(createdAlert?.profileId).toMatch(/^[0-9a-f-]{36}$/);
    if(!createdAlert?.alert)throw new Error("rate alert not created");
    created.push(createdAlert.profileId);
    const alerts=await listRateAlerts(createdAlert.profileId);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({hotelId:"overture-alert-hotel",status:"ACTIVE",targetMonthly:1700,triggeredOfferId:null,triggeredMonthly:null});
    expect(await deleteRateAlert(createdAlert.profileId,createdAlert.alert.id)).toBe(true);
    expect(await listRateAlerts(createdAlert.profileId)).toEqual([]);
  });

  dbIt("deletes an anonymous profile and cascades saved stays",async()=>{
    const stay:SavedStay={
      offerId:"ci-offer-delete",slug:"ci-delete",name:"Delete Me",city:"Madrid",country:"Spain",provider:"direct",
      savedMonthly:999,currency:"EUR",verifiedAt:"2026-10-04T10:00:00.000Z",expiresAt:null,savedAt:"2026-10-04T10:02:00.000Z",
    };
    const saved=await upsertSavedStay(null,stay);
    if(!saved)throw new Error("profile not created");
    expect(await listSavedStaysForProfile(saved.profileId)).toHaveLength(1);
    expect(await deleteSavedProfile(saved.profileId)).toBe(true);
    expect(await listSavedStaysForProfile(saved.profileId)).toEqual([]);

    const sql=getDatabase();
    const profiles=await sql!<{count:number}[]>`
      select count(*)::int as count from consumer_profiles where id=${saved.profileId}::uuid
    `;
    const stays=await sql!<{count:number}[]>`select count(*)::int as count from consumer_saved_stays where profile_id=${saved.profileId}::uuid`;
    const hotels=await sql!<{count:number}[]>`select count(*)::int as count from consumer_saved_hotels where profile_id=${saved.profileId}::uuid`;
    const alerts=await sql!<{count:number}[]>`select count(*)::int as count from consumer_rate_alerts where profile_id=${saved.profileId}::uuid`;
    expect(profiles[0]?.count).toBe(0);expect(stays[0]?.count).toBe(0);expect(hotels[0]?.count).toBe(0);expect(alerts[0]?.count).toBe(0);
  });
});

afterAll(async()=>{
  const sql=getDatabase();
  if(!sql||!created.length)return;
  for(const id of created)await sql`delete from consumer_profiles where id=${id}::uuid`;
});
