export type FinancialInput={
  pension:number;
  homeIncome:number;
  otherIncome:number;
  reserve:number;
};

export type FinancialSummary=FinancialInput & {
  monthlyResources:number;
  livingBudget:number;
};

const money=(value:number)=>Math.max(0,Math.round(Number.isFinite(value)?value:0));

export function summarizeFinances(input:FinancialInput):FinancialSummary{
  const pension=money(input.pension);
  const homeIncome=money(input.homeIncome);
  const otherIncome=money(input.otherIncome);
  const monthlyResources=pension+homeIncome+otherIncome;
  const reserve=Math.min(monthlyResources,money(input.reserve));
  return{pension,homeIncome,otherIncome,reserve,monthlyResources,livingBudget:monthlyResources-reserve};
}

export function routeHeadroom(input:FinancialSummary,routeMonthlyCost:number){
  const route=Math.max(0,Math.round(routeMonthlyCost));
  return{
    withinLivingBudget:route<=input.livingBudget,
    livingBudgetHeadroom:Math.max(0,input.livingBudget-route),
    totalMonthlyHeadroom:Math.max(0,input.monthlyResources-route),
  };
}
