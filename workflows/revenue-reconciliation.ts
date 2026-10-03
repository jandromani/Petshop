import { reconcileRevenue } from "@/src/services/revenue-reconciliation";

export async function executeRevenueReconciliation(days=30){
  "use step";
  return reconcileRevenue(days);
}
export async function revenueReconciliationWorkflow(days=30){
  "use workflow";
  return executeRevenueReconciliation(days);
}
