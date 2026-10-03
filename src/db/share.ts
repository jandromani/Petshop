import { randomBytes } from "node:crypto";
import { getDatabase } from "@/src/db/client";
import type { CreateSharedPlan,SharedPlan } from "@/src/core/share";

export async function createSharedPlan(input:CreateSharedPlan){
  const sql=getDatabase();if(!sql)return null;
  const id="p_"+randomBytes(12).toString("base64url");
  const rows=await sql<{id:string;expires_at:string}[]>`
    insert into shared_plans (id,monthly_budget,party,duration_days,mode,check_in,flexible_days)
    values (${id},${Math.round(input.monthlyBudget)},${input.party},${input.duration},${input.mode},${input.checkIn},${input.flexibleDays})
    returning id,expires_at::text
  `;
  return rows[0]?{id:rows[0].id,expiresAt:rows[0].expires_at}:null;
}

export async function getSharedPlan(id:string):Promise<SharedPlan|null>{
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<{id:string;monthly_budget:number;party:string;duration_days:number;mode:string;check_in:string;flexible_days:number;expires_at:string}[]>`
    select id,monthly_budget,party,duration_days,mode,check_in::text,flexible_days,expires_at::text
    from shared_plans where id=${id} and expires_at>now() limit 1
  `;
  const r=rows[0];if(!r)return null;
  return{id:r.id,monthlyBudget:Number(r.monthly_budget),party:r.party as SharedPlan["party"],duration:Number(r.duration_days) as SharedPlan["duration"],mode:r.mode as SharedPlan["mode"],checkIn:String(r.check_in).slice(0,10),flexibleDays:Number(r.flexible_days) as SharedPlan["flexibleDays"],expiresAt:r.expires_at};
}
