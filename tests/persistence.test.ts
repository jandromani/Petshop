import { describe,expect,it } from "vitest";
import { databaseConfigured,getDatabase } from "@/src/db/client";
import { persistGrowthEvent,persistReferralClick } from "@/src/db/ledger";

describe("optional persistence",()=>{
  it("degrades safely when DATABASE_URL is absent",async()=>{
    const old=process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    expect(databaseConfigured()).toBe(false);
    expect(getDatabase()).toBeNull();
    expect(await persistGrowthEvent({name:"test",properties:{x:1}})).toEqual({persisted:false,reason:"database-not-configured"});
    expect(await persistReferralClick({
      clickId:crypto.randomUUID(),
      hotelSlug:"x",
      provider:"booking",
      createdAt:new Date().toISOString(),
    })).toEqual({persisted:false,reason:"database-not-configured"});
    if(old) process.env.DATABASE_URL=old;
  });
});
