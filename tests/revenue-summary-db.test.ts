import { afterAll,describe,expect,it } from "vitest";
import { getDatabase } from "@/src/db/client";
import { revenueEurSummary } from "@/src/db/revenue";

const enabled=Boolean(process.env.DATABASE_URL);
const prefix="ci-money-"+crypto.randomUUID();
const clicks=[0,1,2,3].map(()=>crypto.randomUUID());
const ids=[0,1,2,3].map(i=>prefix+"-"+i);

describe.skipIf(!enabled)("EUR revenue summary",()=>{
  afterAll(async()=>{
    const sql=getDatabase();if(!sql)return;
    await sql`delete from conversions where provider='direct' and provider_conversion_id like ${prefix+"%"}`;
    await sql`delete from referral_clicks where click_id=any(${clicks})`;
  });

  it("excludes cancelled and foreign-currency rows from consolidated EUR totals",async()=>{
    const sql=getDatabase();if(!sql)throw new Error("database unavailable");
    const before=await revenueEurSummary(1);

    for(const clickId of clicks){
      await sql`insert into referral_clicks(click_id,provider) values (${clickId},'direct')`;
    }
    await sql`
      insert into conversions(click_id,provider,provider_conversion_id,booking_value,commission,currency,status)
      values
        (${clicks[0]},'direct',${ids[0]},1000,100,'EUR','CONFIRMED'),
        (${clicks[1]},'direct',${ids[1]},500,50,'EUR','SETTLED'),
        (${clicks[2]},'direct',${ids[2]},400,40,'EUR','CANCELLED'),
        (${clicks[3]},'direct',${ids[3]},1000,100,'USD','CONFIRMED')
    `;

    const after=await revenueEurSummary(1);
    expect(after.bookingValueEur-before.bookingValueEur).toBe(1500);
    expect(after.commissionEur-before.commissionEur).toBe(150);
    expect(after.settledCommissionEur-before.settledCommissionEur).toBe(50);
    expect(after.takeRate).not.toBeNull();
  });
});
