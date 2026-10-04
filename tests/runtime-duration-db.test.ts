import { afterAll,describe,expect,it } from "vitest";
import { getDatabase } from "@/src/db/client";
import { runtimeDurationMetrics } from "@/src/db/observability";

const enabled=Boolean(process.env.DATABASE_URL);
const waveKey="ci-duration-"+crypto.randomUUID();
const agentKey="ci-duration-"+crypto.randomUUID();

describe.skipIf(!enabled)("runtime duration metrics",()=>{
  afterAll(async()=>{
    const sql=getDatabase();if(!sql)return;
    await sql`delete from acquisition_runs where wave_key=${waveKey}`;
    await sql`delete from agent_runs where agent_key=${agentKey}`;
  });

  it("derives duration percentiles from persisted completion evidence",async()=>{
    const sql=getDatabase();if(!sql)throw new Error("database unavailable");
    await sql`
      insert into acquisition_runs(wave_key,status,started_at,completed_at,error_count)
      values
        (${waveKey},'COMPLETE',now()-interval '5 seconds',now()-interval '4 seconds',0),
        (${waveKey},'FAILED',now()-interval '3 seconds',now()-interval '1 second',1)
    `;
    await sql`
      insert into agent_runs(agent_key,objective,status,started_at,completed_at)
      values
        (${agentKey},'ci duration','COMPLETE',now()-interval '4 seconds',now()-interval '3 seconds'),
        (${agentKey},'ci duration','FAILED',now()-interval '4 seconds',now()-interval '2 seconds')
    `;

    const rows=await runtimeDurationMetrics(1);
    const acquisition=rows.find(x=>x.kind==="acquisition-wave");
    const agents=rows.find(x=>x.kind==="agent-run");

    expect(acquisition).toMatchObject({engineRetryCount:null});
    expect(agents).toMatchObject({engineRetryCount:null});
    expect(acquisition?.sample).toBeGreaterThanOrEqual(2);
    expect(agents?.sample).toBeGreaterThanOrEqual(2);
    expect(acquisition?.p50Ms).toBeGreaterThan(0);
    expect(acquisition?.p95Ms).toBeGreaterThanOrEqual(acquisition?.p50Ms||0);
    expect(agents?.maxMs).toBeGreaterThanOrEqual(agents?.p95Ms||0);
  });
});
