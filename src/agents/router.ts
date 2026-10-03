import type { AgentKey } from "@/src/agents/registry";

export type RoutedSignal={key:string;message:string;severity:"info"|"warning"|"critical"};

export function agentForSignal(key:string):AgentKey{
  if(key.startsWith("supply."))return "supply-scout";
  if(key.startsWith("revenue."))return "revenue-reconciler";
  if(key.startsWith("seo."))return "seo-strategist";
  if(key.startsWith("growth."))return "growth-operator";
  if(key.startsWith("hotel."))return "hotel-sales";
  if(key.startsWith("security."))return "engineering";
  if(key.startsWith("infra."))return "engineering";
  if(key.startsWith("support."))return "support";
  return "orchestrator";
}

export function objectiveForSignal(signal:RoutedSignal){
  return [
    "Analyze this operational signal and propose one bounded next action.",
    "Do not claim execution, publish content, commit money, sign contracts, or invent facts.",
    "Signal: "+signal.key,
    "Severity: "+signal.severity,
    "Message: "+signal.message,
  ].join("\\n");
}
