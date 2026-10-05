import { describe,expect,it } from "vitest";
import { evaluateComplianceRule,type ComplianceRule } from "@/src/db/compliance-rules";

const rule:ComplianceRule={id:"1",destination_country:"Spain",nationality_scope:"NON_EU",rule_key:"schengen-short-stay",rule_type:"SHORT_STAY",max_presence_days:90,window_days:180,min_monthly_income:null,income_currency:null,source_url:"https://example.eu/rule",source_title:"Official rule",effective_from:null,effective_to:null,verified_at:"2026-10-01T00:00:00Z",expires_at:"2026-11-01T00:00:00Z",human_reviewed:true,requirements:{}};

describe("evidence-gated compliance rules",()=>{
  it("fails closed to UNKNOWN without a fresh stored rule",()=>{expect(evaluateComplianceRule(null,{stayPresenceDays:60}).state).toBe("UNKNOWN")});
  it("screens deterministic rule fields without claiming a legal decision",()=>{expect(evaluateComplianceRule(rule,{stayPresenceDays:90}).state).toBe("PASS_SCREEN");expect(evaluateComplianceRule(rule,{stayPresenceDays:91}).state).toBe("FAIL_SCREEN");});
  it("requires an input when a verified rule contains an income floor",()=>{const income={...rule,rule_type:"DIGITAL_NOMAD" as const,max_presence_days:null,min_monthly_income:3000,income_currency:"EUR"};expect(evaluateComplianceRule(income,{stayPresenceDays:60}).state).toBe("UNKNOWN_INPUT");expect(evaluateComplianceRule(income,{stayPresenceDays:60,monthlyIncome:2500}).state).toBe("FAIL_SCREEN");expect(evaluateComplianceRule(income,{stayPresenceDays:60,monthlyIncome:3500}).state).toBe("PASS_SCREEN");});
});
