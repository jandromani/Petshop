import { createHash } from "node:crypto";
import { getDatabase } from "@/src/db/client";

type MemoryBucket={started:number;hits:number};
const memory=(globalThis as typeof globalThis & {__atlasRateLimits?:Map<string,MemoryBucket>});
if(!memory.__atlasRateLimits) memory.__atlasRateLimits=new Map();

export function requestFingerprint(req:Request,scope:string){
  const ip=(req.headers.get("x-forwarded-for")||req.headers.get("x-real-ip")||"unknown").split(",")[0].trim();
  const ua=req.headers.get("user-agent")||"unknown";
  return createHash("sha256").update(scope+"|"+ip+"|"+ua).digest("hex");
}

export async function enforceRateLimit(input:{key:string;limit:number;windowSeconds:number}){
  const sql=getDatabase();
  if(sql){
    const rows=await sql<{hits:number;allowed:boolean}[]>`
      insert into rate_limit_buckets (bucket_key,window_started_at,hits,updated_at)
      values (${input.key},now(),1,now())
      on conflict (bucket_key) do update set
        hits=case
          when rate_limit_buckets.window_started_at <= now()-make_interval(secs => ${input.windowSeconds}) then 1
          else rate_limit_buckets.hits+1
        end,
        window_started_at=case
          when rate_limit_buckets.window_started_at <= now()-make_interval(secs => ${input.windowSeconds}) then now()
          else rate_limit_buckets.window_started_at
        end,
        updated_at=now()
      returning hits,(hits<=${input.limit}) as allowed
    `;
    const row=rows[0];
    return{allowed:Boolean(row?.allowed),remaining:Math.max(0,input.limit-Number(row?.hits||0))};
  }
  const now=Date.now();
  const current=memory.__atlasRateLimits!.get(input.key);
  if(!current||now-current.started>=input.windowSeconds*1000){
    memory.__atlasRateLimits!.set(input.key,{started:now,hits:1});
    return{allowed:true,remaining:input.limit-1};
  }
  current.hits++;
  return{allowed:current.hits<=input.limit,remaining:Math.max(0,input.limit-current.hits)};
}
