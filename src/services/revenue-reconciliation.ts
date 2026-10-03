import { revenueAnomalies,revenueMetrics,persistReconciliation } from "@/src/db/revenue";
import { databaseConfigured } from "@/src/db/client";

export async function reconcileRevenue(days=30){
  if(!databaseConfigured())return{configured:false,status:"WAITING_EXTERNAL",metrics:[],anomalies:[],runId:null};
  const metrics=await revenueMetrics(days)||[];
  const anomalies=await revenueAnomalies(days);
  const conversionCount=metrics.reduce((s,r)=>s+Number(r.count||0),0);
  const end=new Date();
  const start=new Date(end.getTime()-days*86400000);
  const status=anomalies.length?"REVIEW":"PASS";
  const runId=await persistReconciliation({status,windowStart:start.toISOString(),windowEnd:end.toISOString(),conversionCount,metrics,anomalies});
  return{configured:true,status,metrics,anomalies,runId};
}
