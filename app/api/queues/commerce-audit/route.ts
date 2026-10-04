import { handleCallback } from "@vercel/queue";
import { reconcileRevenue } from "@/src/services/revenue-reconciliation";
import { auditOpsEvent } from "@/src/db/governance";
import { commerceAuditRetryPolicy,isCommerceAuditPoisonDelivery } from "@/src/queues/commerce-audit";

export const POST=handleCallback(
  async (message:any,metadata)=>{
    console.log(JSON.stringify({level:"info",event:"queue_event_consumed",topic:metadata.topicName,consumerGroup:metadata.consumerGroup,messageId:metadata.messageId,deliveryCount:metadata.deliveryCount,type:message?.type}));
    try{
      if(message?.type==="conversion.received")await reconcileRevenue(30);
    }catch(error){
      if(isCommerceAuditPoisonDelivery(metadata.deliveryCount)){
        await auditOpsEvent({
          actor:"queue:commerce-audit",
          action:"queue.poison-message",
          resourceType:"queue-message",
          resourceId:String(metadata.messageId||"unknown"),
          outcome:"ACK_AFTER_RETRY_LIMIT",
          detail:{topic:metadata.topicName,consumerGroup:metadata.consumerGroup,deliveryCount:metadata.deliveryCount,type:message?.type,error:String(error).slice(0,500)},
        });
        console.error(JSON.stringify({level:"error",event:"queue_poison_message",messageId:metadata.messageId,deliveryCount:metadata.deliveryCount,type:message?.type,error:String(error)}));
      }
      throw error;
    }
  },
  {
    visibilityTimeoutSeconds:60,
    retry:(_error,metadata)=>commerceAuditRetryPolicy(metadata.deliveryCount),
  },
);
