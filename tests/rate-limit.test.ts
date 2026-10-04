import { describe,expect,it } from "vitest";
import { enforceRateLimit } from "@/src/security/rate-limit";

describe("application rate-limit fallback",()=>{
  it("enforces a bounded in-memory bucket when durable DB storage is unavailable",async()=>{
    const old=process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const key="ci-rate-"+crypto.randomUUID();
    try{
      await expect(enforceRateLimit({key,limit:2,windowSeconds:60})).resolves.toMatchObject({allowed:true,remaining:1});
      await expect(enforceRateLimit({key,limit:2,windowSeconds:60})).resolves.toMatchObject({allowed:true,remaining:0});
      await expect(enforceRateLimit({key,limit:2,windowSeconds:60})).resolves.toMatchObject({allowed:false,remaining:0});
    }finally{
      if(old===undefined)delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL=old;
    }
  });
});
