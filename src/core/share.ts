import type { Party,PlanMode } from "@/src/core/planner";
import type { StayDuration } from "@/src/core/search";

export type SharedPlan={
  id:string;
  monthlyBudget:number;
  party:Party;
  duration:StayDuration;
  mode:PlanMode;
  checkIn:string;
  flexibleDays:0|7|30;
  expiresAt:string;
};

export type CreateSharedPlan=Omit<SharedPlan,"id"|"expiresAt">;
