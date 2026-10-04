import { getDatabase } from "@/src/db/client";

export type ScheduledRunClaim={
  durable:boolean;
  claimed:boolean;
  jobKey:string;
  slotKey:string;
};

export function dailyScheduleSlot(now=new Date()){
  return now.toISOString().slice(0,10);
}

export async function claimScheduledRun(jobKey:string,slotKey:string):Promise<ScheduledRunClaim>{
  const sql=getDatabase();
  if(!sql)return{durable:false,claimed:true,jobKey,slotKey};
  const rows=await sql<{job_key:string}[]>`
    insert into scheduled_run_claims (job_key,slot_key,status,claimed_at)
    values (${jobKey},${slotKey},'CLAIMED',now())
    on conflict (job_key,slot_key) do nothing
    returning job_key
  `;
  return{durable:true,claimed:Boolean(rows[0]),jobKey,slotKey};
}

export async function markScheduledRunStarted(input:{jobKey:string;slotKey:string;runId:string}){
  const sql=getDatabase();if(!sql)return false;
  const rows=await sql<{job_key:string}[]>`
    update scheduled_run_claims
    set run_id=${input.runId},status='STARTED',started_at=now()
    where job_key=${input.jobKey} and slot_key=${input.slotKey} and status='CLAIMED'
    returning job_key
  `;
  return Boolean(rows[0]);
}

export async function releaseScheduledRunClaim(input:{jobKey:string;slotKey:string}){
  const sql=getDatabase();if(!sql)return false;
  const rows=await sql<{job_key:string}[]>`
    delete from scheduled_run_claims
    where job_key=${input.jobKey} and slot_key=${input.slotKey}
      and status='CLAIMED' and run_id is null
    returning job_key
  `;
  return Boolean(rows[0]);
}
