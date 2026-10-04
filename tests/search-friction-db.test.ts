import { afterAll,describe,expect,it } from "vitest";
import { getDatabase } from "@/src/db/client";
import { searchFriction } from "@/src/db/growth";

const enabled=Boolean(process.env.DATABASE_URL);
const token=crypto.randomUUID();
const sessions=[1,2,3].map(n=>"friction-"+token+"-"+n);
const clickId="friction-click-"+token;

describe.skipIf(!enabled)("search friction DB metrics",()=>{
  afterAll(async()=>{
    const sql=getDatabase();
    if(!sql)return;
    await sql`delete from referral_clicks where click_id=${clickId}`;
    await sql`delete from growth_events where session_id in (${sessions[0]},${sessions[1]},${sessions[2]}) or properties->>'test_token'=${token}`;
  });

  it("separates zero-result searches from trackable-session abandonment",async()=>{
    const sql=getDatabase();
    if(!sql)throw new Error("database unavailable");
    const before=await searchFriction(1);
    if(!before)throw new Error("friction snapshot unavailable");

    await sql`
      insert into growth_events (session_id,event_name,properties)
      values
        (${sessions[0]},'hero_search',${sql.json({matches:0,test_token:token})}),
        (${sessions[1]},'hero_search',${sql.json({matches:4,test_token:token})}),
        (${sessions[2]},'hero_search',${sql.json({matches:2,test_token:token})}),
        (null,'hero_search',${sql.json({matches:0,test_token:token})})
    `;
    await sql`
      insert into referral_clicks (click_id,session_id,provider,source)
      values (${clickId},${sessions[1]},'test','ci')
    `;

    const after=await searchFriction(1);
    if(!after)throw new Error("friction snapshot unavailable");

    expect(after.searchEvents-before.searchEvents).toBe(4);
    expect(after.searchSessions-before.searchSessions).toBe(4);
    expect(after.zeroResultEvents-before.zeroResultEvents).toBe(2);
    expect(after.zeroResultSessions-before.zeroResultSessions).toBe(2);
    expect(after.trackableSessions-before.trackableSessions).toBe(3);
    expect(after.referralSessions-before.referralSessions).toBe(1);
    expect(after.abandonedSessions-before.abandonedSessions).toBe(2);
  });
});
