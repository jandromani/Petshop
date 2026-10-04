export type OperationalAlertSignal={
  key:string;
  severity:"warning"|"critical";
  message:string;
};

export function operationalAlertWebhook(){
  const raw=(process.env.OPS_ALERT_WEBHOOK_URL||"").trim();
  if(!raw)return null;
  try{
    const url=new URL(raw);
    if(url.protocol!=="https:")return null;
    return url.toString();
  }catch{
    return null;
  }
}

export async function sendOperationalAlerts(signals:OperationalAlertSignal[]){
  const actionable=signals.filter(signal=>signal.severity==="warning"||signal.severity==="critical");
  const webhook=operationalAlertWebhook();
  if(!webhook)return{configured:false,sent:false,count:actionable.length};
  if(!actionable.length)return{configured:true,sent:false,count:0};

  try{
    const response=await fetch(webhook,{
      method:"POST",
      signal:AbortSignal.timeout(5_000),
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        source:"atlas",
        event:"operational-alert",
        generatedAt:new Date().toISOString(),
        highestSeverity:actionable.some(x=>x.severity==="critical")?"critical":"warning",
        signals:actionable.map(x=>({key:x.key,severity:x.severity,message:x.message})),
      }),
    });
    if(!response.ok){
      console.error(JSON.stringify({level:"error",event:"ops_alert_delivery_failed",status:response.status,count:actionable.length}));
      return{configured:true,sent:false,count:actionable.length,status:response.status};
    }
    return{configured:true,sent:true,count:actionable.length,status:response.status};
  }catch(error){
    console.error(JSON.stringify({level:"error",event:"ops_alert_delivery_failed",error:String(error).slice(0,300),count:actionable.length}));
    return{configured:true,sent:false,count:actionable.length};
  }
}
