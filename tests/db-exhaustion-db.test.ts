import postgres from "postgres";
import { afterAll,describe,expect,it } from "vitest";
import { databaseHealth } from "@/src/db/client";

const enabled=Boolean(process.env.DATABASE_URL);
const adminUrl=process.env.DATABASE_URL||"";
const role="atlas_exhaust_ci";
const password="atlas-exhaust-ci";
const dbName="atlas_ci";
const limitedUrl=`postgres://${role}:${password}@127.0.0.1:5432/${dbName}`;
let admin:ReturnType<typeof postgres>|null=null;
let holder:ReturnType<typeof postgres>|null=null;
const original=process.env.DATABASE_URL;

describe.skipIf(!enabled)("database connection exhaustion",()=>{
  afterAll(async()=>{
    process.env.DATABASE_URL=original;
    if(holder)await holder.end({timeout:1}).catch(()=>{});
    if(admin){
      await admin`select pg_terminate_backend(pid) from pg_stat_activity where usename=${role} and pid<>pg_backend_pid()`.catch(()=>{});
      await admin.unsafe(`drop role if exists ${role}`).catch(()=>{});
      await admin.end({timeout:1}).catch(()=>{});
    }
  });

  it("marks the database unreachable when the configured role cannot open another connection",async()=>{
    admin=postgres(adminUrl,{max:1,prepare:false});
    await admin.unsafe(`drop role if exists ${role}`);
    await admin.unsafe(`create role ${role} login password '${password}' connection limit 1`);

    holder=postgres(limitedUrl,{max:1,prepare:false});
    await holder`select pg_backend_pid()`;

    process.env.DATABASE_URL=limitedUrl;
    const health=await databaseHealth();

    expect(health.configured).toBe(true);
    expect(health.reachable).toBe(false);
    expect(health.latencyMs).not.toBeNull();
    expect(String(health.error||"").toLowerCase()).toMatch(/connection|too many|role/);
  });
});
