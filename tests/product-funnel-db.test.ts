import { afterAll,describe,expect,it } from "vitest";
import { getDatabase } from "@/src/db/client";
import { productFunnel } from "@/src/db/growth";

const enabled=Boolean(process.env.DATABASE_URL);
const token=crypto.randomUUID();
const sessions=[1,2,3].map(n=>"product-funnel-"+token+"-"+n);
const clickId="product-funnel-click-"+token;
const conversionId="product-funnel-conv-"+token;

describe.skipIf(!enabled)("real hotel product funnel DB metrics",()=>{
  afterAll(async()=>{
    const sql=getDatabase();if(!sql)return;
    await sql`delete from conversions where provider_conversion_id=${conversionId}`;
    await sql`delete from referral_clicks where click_id=${clickId}`;
    await sql`delete from growth_events where properties->>'test_token'=${token}`;
  });

  it("tracks search through hotel action, sourcing, referral and conversion by session",async()=>{
    const sql=getDatabase();if(!sql)throw new Error("database unavailable");
    const before=await productFunnel(1);
    if(!before)throw new Error("product funnel unavailable");

    await sql`
      insert into growth_events(session_id,event_name,properties)
      values
        (${sessions[0]},'page_view',${sql.json({test_token:token})}),
        (${sessions[0]},'hero_search',${sql.json({test_token:token,matches:12})}),
        (${sessions[0]},'results_loaded',${sql.json({test_token:token,count:12})}),
        (${sessions[0]},'hotel_impression',${sql.json({test_token:token,hotel_id:"h1"})}),
        (${sessions[0]},'hotel_card_click',${sql.json({test_token:token,hotel_id:"h1"})}),
        (${sessions[0]},'source_rate_start',${sql.json({test_token:token,hotel_id:"h1"})}),
        (${sessions[0]},'source_rate_success',${sql.json({test_token:token,hotel_id:"h1"})}),
        (${sessions[1]},'page_view',${sql.json({test_token:token})}),
        (${sessions[1]},'ai_search_submit',${sql.json({test_token:token})}),
        (${sessions[1]},'ai_filters_applied',${sql.json({test_token:token})}),
        (${sessions[1]},'results_loaded',${sql.json({test_token:token,count:8})}),
        (${sessions[1]},'hotel_impression',${sql.json({test_token:token,hotel_id:"h2"})}),
        (${sessions[1]},'map_marker_click',${sql.json({test_token:token,hotel_id:"h2"})}),
        (${sessions[1]},'hotel_saved',${sql.json({test_token:token,hotel_id:"h2"})}),
        (${sessions[2]},'page_view',${sql.json({test_token:token})}),
        (${sessions[2]},'hero_search',${sql.json({test_token:token,matches:3})}),
        (${sessions[2]},'results_loaded',${sql.json({test_token:token,count:3})}),
        (${sessions[2]},'hotel_impression',${sql.json({test_token:token,hotel_id:"h3"})})
    `;
    await sql`insert into referral_clicks(click_id,session_id,provider,source) values (${clickId},${sessions[1]},'test','ci')`;
    await sql`
      insert into conversions(click_id,provider,provider_conversion_id,booking_value,commission,currency,status)
      values (${clickId},'test',${conversionId},1000,100,'EUR','CONFIRMED')
    `;

    const after=await productFunnel(1);
    if(!after)throw new Error("product funnel unavailable");

    expect(after.pageSessions-before.pageSessions).toBe(3);
    expect(after.searchSessions-before.searchSessions).toBe(3);
    expect(after.aiSearchSessions-before.aiSearchSessions).toBe(1);
    expect(after.manualOnlySearchSessions-before.manualOnlySearchSessions).toBe(2);
    expect(after.resultSessions-before.resultSessions).toBe(3);
    expect(after.impressionSessions-before.impressionSessions).toBe(3);
    expect(after.hotelEngagementSessions-before.hotelEngagementSessions).toBe(2);
    expect(after.cardClickSessions-before.cardClickSessions).toBe(1);
    expect(after.mapClickSessions-before.mapClickSessions).toBe(1);
    expect(after.aiEngagementSessions-before.aiEngagementSessions).toBe(1);
    expect(after.manualEngagementSessions-before.manualEngagementSessions).toBe(1);
    expect(after.savedSessions-before.savedSessions).toBe(1);
    expect(after.sourcingStartSessions-before.sourcingStartSessions).toBe(1);
    expect(after.sourcingSuccessSessions-before.sourcingSuccessSessions).toBe(1);
    expect(after.referralSessions-before.referralSessions).toBe(1);
    expect(after.conversionSessions-before.conversionSessions).toBe(1);
  });
});
