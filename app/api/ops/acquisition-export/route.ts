import { opsAuthorized } from "@/src/security/ops-auth";
import { getDatabase } from "@/src/db/client";
import { csvCell } from "@/src/growth/campaigns";
export async function GET(req:Request){
 if(!await opsAuthorized(req))return new Response("Unauthorized",{status:401});const sql=getDatabase();if(!sql)return Response.json({error:"database-unavailable"},{status:503});
 const rows=await sql<Array<{id:string;acquisition:Record<string,string>;quote_sent_at:string|null;quote_accepted_at:string|null}>>`select id::text,acquisition,quote_sent_at::text,quote_accepted_at::text from sourcing_requests where created_at>=now()-interval '90 days' and quote_sent_at is not null and acquisition<>'{}'::jsonb order by created_at desc limit 2000`;
 const output=[['request_id','event_name','event_time','gclid','gbraid','wbraid','source','campaign'].map(csvCell).join(',')];
 for(const row of rows){for(const [event,time] of [['Atlas qualified stay enquiry',row.quote_sent_at],['Atlas accepted stay quote',row.quote_accepted_at]]){if(time)output.push([row.id,event,time,row.acquisition.gclid,row.acquisition.gbraid,row.acquisition.wbraid,row.acquisition.source,row.acquisition.campaign].map(csvCell).join(','))}}
 return new Response(output.join('\r\n'),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=atlas-consented-lead-outcomes.csv","Cache-Control":"private, no-store"}});
}
