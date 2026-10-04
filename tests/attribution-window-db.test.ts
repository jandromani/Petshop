import { afterAll,describe,expect,it } from "vitest";
import { getDatabase } from "@/src/db/client";
import { persistConversion } from "@/src/db/ledger";

const enabled=Boolean(process.env.DATABASE_URL);
const freshClick=crypto.randomUUID();
const staleClick=crypto.randomUUID();
const freshConversion="ci-fresh-"+crypto.randomUUID();
const staleConversion="ci-stale-"+crypto.randomUUID();

describe.skipIf(!enabled)("conversion attribution window",()=>{
  afterAll(async()=>{
    const sql=getDatabase();if(!sql)return;
    await sql`delete from conversions where provider='direct' and provider_conversion_id in (${freshConversion},${staleConversion})`;
    await sql`delete from referral_clicks where click_id in (${freshClick},${staleClick})`;
  });

  it("accepts a fresh first attribution and allows a later lifecycle update",async()=>{
    const sql=getDatabase();if(!sql)throw new Error("database unavailable");
    await sql`
      insert into referral_clicks(click_id,provider,created_at)
      values (${freshClick},'direct',now()-interval '1 day')
    `;

    const first=await persistConversion({
      clickId:freshClick,provider:"direct",providerConversionId:freshConversion,
      bookingValue:1200,commission:120,currency:"EUR",status:"CONFIRMED",
      occurredAt:new Date().toISOString(),
    });
    expect(first).toEqual({persisted:true});

    const lateLifecycle=await persistConversion({
      clickId:freshClick,provider:"direct",providerConversionId:freshConversion,
      status:"SETTLED",settlementReference:"ci-settled",
      occurredAt:new Date(Date.now()+180*86400000).toISOString(),
    });
    expect(lateLifecycle).toEqual({persisted:true});

    const rows=await sql<{status:string;settlement_reference:string|null}[]>`
      select status,settlement_reference from conversions
      where provider='direct' and provider_conversion_id=${freshConversion}
    `;
    expect(rows[0]).toMatchObject({status:"SETTLED",settlement_reference:"ci-settled"});
  });

  it("rejects a first attribution outside the configured window",async()=>{
    const sql=getDatabase();if(!sql)throw new Error("database unavailable");
    await sql`
      insert into referral_clicks(click_id,provider,created_at)
      values (${staleClick},'direct',now()-interval '120 days')
    `;
    const result=await persistConversion({
      clickId:staleClick,provider:"direct",providerConversionId:staleConversion,
      bookingValue:900,commission:90,currency:"EUR",status:"CONFIRMED",
      occurredAt:new Date().toISOString(),
    });
    expect(result).toEqual({persisted:false,reason:"attribution-window-rejected"});
    const rows=await sql<{count:number}[]>`
      select count(*)::int as count from conversions
      where provider='direct' and provider_conversion_id=${staleConversion}
    `;
    expect(rows[0]?.count).toBe(0);
  });
});
