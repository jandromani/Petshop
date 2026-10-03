import { getDatabase } from "@/src/db/client";

export async function getRuntimeConfig<T=unknown>(key:string):Promise<T|null>{
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<{value:T}[]>`select value from runtime_config where config_key=${key} limit 1`;
  return rows[0]?.value??null;
}

export async function setRuntimeConfig(input:{key:string;value:unknown;source:string;evidence?:unknown}){
  const sql=getDatabase();if(!sql)return false;
  await sql`
    insert into runtime_config (config_key,value,source,evidence,updated_at)
    values (${input.key},${sql.json(input.value as never)},${input.source},${sql.json((input.evidence||{}) as never)},now())
    on conflict (config_key) do update set
      value=excluded.value,source=excluded.source,evidence=excluded.evidence,updated_at=now()
  `;
  return true;
}
