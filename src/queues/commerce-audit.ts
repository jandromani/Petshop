export const COMMERCE_AUDIT_MAX_DELIVERIES=5;

export function commerceAuditRetryPolicy(deliveryCount:number){
  const delivery=Math.max(1,Math.floor(deliveryCount||1));
  if(delivery>COMMERCE_AUDIT_MAX_DELIVERIES){
    return{acknowledge:true as const};
  }
  return{afterSeconds:Math.min(300,2**delivery*5)};
}

export function isCommerceAuditPoisonDelivery(deliveryCount:number){
  return Math.max(1,Math.floor(deliveryCount||1))>=COMMERCE_AUDIT_MAX_DELIVERIES;
}
