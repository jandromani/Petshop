import { runLiveSupplyControl,type LiveSupplyControlInput } from "@/src/services/live-supply-control";

export async function executeLiveSupplyControl(input:LiveSupplyControlInput){
  "use step";
  return runLiveSupplyControl(input);
}
export async function liveSupplyControlWorkflow(input:LiveSupplyControlInput={}){
  "use workflow";
  return executeLiveSupplyControl(input);
}
