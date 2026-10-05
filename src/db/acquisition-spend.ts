import { getDatabase } from "@/src/db/client";

export async function recordAcquisitionSpend(input:{network:string;campaign?:string;spendDate:string;currency:string;amount:number;sourceReference?:string}){
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<Array<{id:string}>>`
    insert into acquisition_spend(network,campaign,spend_date,currency,amount,source_reference)
    values(${input.network},${input.campaign??null},${input.spendDate},${input.currency},${input.amount},${input.sourceReference??null})
    on conflict(network,campaign,spend_date,source_reference) do update set amount=excluded.amount,currency=excluded.currency
    returning id::text
  `;return rows[0]?.id??null;
}

export async function acquisitionSpendSummary(days=30){
  const sql=getDatabase();if(!sql)return{configured:false,spendEur:0,rows:[] as Array<{network:string;campaign:string|null;spend:number}>};
  const bounded=Math.max(1,Math.min(365,days));
  const rows=await sql<Array<{network:string;campaign:string|null;spend:number}>>`
    select network,campaign,coalesce(sum(amount),0)::float as spend from acquisition_spend where spend_date>=current_date-${bounded}::int and currency='EUR' group by network,campaign order by spend desc
  `;
  return{configured:true,spendEur:rows.reduce((s,r)=>s+Number(r.spend||0),0),rows:rows.map(r=>({...r,spend:Number(r.spend||0) }))};
}
