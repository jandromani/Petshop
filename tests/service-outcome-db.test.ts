import { afterAll,describe,expect,it } from "vitest";
import { getDatabase } from "@/src/db/client";
import { serviceOutcomeMetrics } from "@/src/db/observability";

const enabled=Boolean(process.env.DATABASE_URL);
const prefix="ci-slo-"+crypto.randomUUID();

describe.skipIf(!enabled)("service outcome metrics",()=>{
  afterAll(async()=>{
    const sql=getDatabase();if(!sql)return;
    await sql`delete from ops_audit_events where resource_id like ${prefix+"%"}`;
  });

  it("aggregates operational failures separately from policy rejections",async()=>{
    const sql=getDatabase();if(!sql)throw new Error("database unavailable");
    const before=await serviceOutcomeMetrics(1);
    const oldReferral=before.find(x=>x.action==="referral.redirect");
    const oldConversion=before.find(x=>x.action==="conversion.ingest");

    await sql`
      insert into ops_audit_events(actor,action,resource_type,resource_id,outcome,detail)
      values
        ('ci','referral.redirect','service-request',${prefix+"-r1"},'success','{}'::jsonb),
        ('ci','referral.redirect','service-request',${prefix+"-r2"},'failure','{}'::jsonb),
        ('ci','referral.redirect','service-request',${prefix+"-r3"},'rejected','{}'::jsonb),
        ('ci','conversion.ingest','service-request',${prefix+"-c1"},'success','{}'::jsonb)
    `;

    const after=await serviceOutcomeMetrics(1);
    const referral=after.find(x=>x.action==="referral.redirect");
    const conversion=after.find(x=>x.action==="conversion.ingest");
    expect(referral).toBeTruthy();
    expect(conversion).toBeTruthy();
    expect(referral!.success).toBeGreaterThanOrEqual((oldReferral?.success||0)+1);
    expect(referral!.failure).toBeGreaterThanOrEqual((oldReferral?.failure||0)+1);
    expect(referral!.rejected).toBeGreaterThanOrEqual((oldReferral?.rejected||0)+1);
    expect(referral!.denominator).toBe(referral!.success+referral!.failure);
    expect(conversion!.success).toBeGreaterThanOrEqual((oldConversion?.success||0)+1);
  });
});
