import { getDatabase } from "@/src/db/client";

export type IncidentSignal={key:string;severity:"warning"|"critical";message:string};

export async function syncIncidents(signals:IncidentSignal[]){
  const sql=getDatabase();if(!sql)return{persisted:false,open:0};
  const active=signals.map(s=>s.key);
  for(const signal of signals){
    await sql`
      insert into ops_incidents (incident_key,severity,status,message,occurrence_count,first_seen_at,last_seen_at,resolved_at)
      values (${signal.key},${signal.severity},'OPEN',${signal.message},1,now(),now(),null)
      on conflict (incident_key) do update set
        severity=excluded.severity,
        status='OPEN',
        message=excluded.message,
        occurrence_count=ops_incidents.occurrence_count+1,
        last_seen_at=now(),
        resolved_at=null
    `;
  }
  if(active.length){
    await sql`
      update ops_incidents set status='RESOLVED',resolved_at=now(),last_seen_at=now()
      where status='OPEN' and not (incident_key=any(${active}))
    `;
  }else{
    await sql`update ops_incidents set status='RESOLVED',resolved_at=now(),last_seen_at=now() where status='OPEN'`;
  }
  const rows=await sql<{count:number}[]>`select count(*)::int from ops_incidents where status='OPEN'`;
  return{persisted:true,open:Number(rows[0]?.count||0)};
}

export async function listOpenIncidents(limit=20){
  const sql=getDatabase();if(!sql)return[];
  const bounded=Math.max(1,Math.min(100,limit));
  return sql<Array<{key:string;severity:string;message:string;occurrences:number;firstSeenAt:string;lastSeenAt:string}>>`
    select incident_key as key,severity,message,occurrence_count as occurrences,
      first_seen_at::text as "firstSeenAt",last_seen_at::text as "lastSeenAt"
    from ops_incidents
    where status='OPEN'
    order by case severity when 'critical' then 0 else 1 end,last_seen_at desc
    limit ${bounded}
  `;
}

export async function auditOpsEvent(input:{
  actor:string;action:string;resourceType?:string;resourceId?:string;outcome:string;detail?:unknown;
}){
  const sql=getDatabase();if(!sql)return false;
  await sql`
    insert into ops_audit_events (actor,action,resource_type,resource_id,outcome,detail)
    values (
      ${input.actor},${input.action},${input.resourceType??null},${input.resourceId??null},${input.outcome},
      ${sql.json((input.detail||{}) as never)}
    )
  `;
  return true;
}
