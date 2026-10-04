import { afterAll,describe,expect,it } from "vitest";
import { getDatabase } from "@/src/db/client";
import {
  claimScheduledRun,dailyScheduleSlot,markScheduledRunStarted,releaseScheduledRunClaim,
} from "@/src/db/scheduled-runs";

const enabled=Boolean(process.env.DATABASE_URL);
const jobKey="test:scheduled-run:"+crypto.randomUUID();
const slotKey=dailyScheduleSlot(new Date("2026-10-04T08:00:00Z"));

describe.skipIf(!enabled)("scheduled run claims",()=>{
  afterAll(async()=>{
    const sql=getDatabase();
    if(sql)await sql`delete from scheduled_run_claims where job_key=${jobKey}`;
  });

  it("claims a cron slot once and releases only an unstarted claim",async()=>{
    expect(await claimScheduledRun(jobKey,slotKey)).toMatchObject({durable:true,claimed:true});
    expect(await claimScheduledRun(jobKey,slotKey)).toMatchObject({durable:true,claimed:false});

    expect(await releaseScheduledRunClaim({jobKey,slotKey})).toBe(true);
    expect(await claimScheduledRun(jobKey,slotKey)).toMatchObject({durable:true,claimed:true});

    expect(await markScheduledRunStarted({jobKey,slotKey,runId:"run-test"})).toBe(true);
    expect(await releaseScheduledRunClaim({jobKey,slotKey})).toBe(false);
    expect(await claimScheduledRun(jobKey,slotKey)).toMatchObject({durable:true,claimed:false});
  });
});
