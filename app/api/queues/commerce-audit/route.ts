import { handleCallback } from "@vercel/queue";
import { reconcileRevenue } from "@/src/services/revenue-reconciliation";

export const POST=handleCallback(
  async (message:any,metadata)=>{
    console.log(JSON.stringify({level:"info",event:"queue_event_consumed",topic:metadata.topicName,consumerGroup:metadata.consumerGroup,messageId:metadata.messageId,deliveryCount:metadata.deliveryCount,type:message?.type}));
    if(message?.type==="conversion.received") await reconcileRevenue(30);
  },
  {
    visibilityTimeoutSeconds:60,
    retry:(_error,metadata)=>metadata.deliveryCount>5?{acknowledge:true}:{afterSeconds:Math.min(300,2**metadata.deliveryCount*5)},
  },
);
