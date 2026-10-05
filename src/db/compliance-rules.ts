import { getDatabase } from "@/src/db/client";

export type ComplianceRuleType="SHORT_STAY"|"DIGITAL_NOMAD"|"RESIDENCE_REGISTRATION"|"OTHER";
export type ComplianceRule={id:string;destination_country:string;nationality_scope:string;rule_key:string;rule_type:ComplianceRuleType;max_presence_days:number|null;window_days:number|null;min_monthly_income:number|null;income_currency:string|null;source_url:string;source_title:string|null;effective_from:string|null;effective_to:string|null;verified_at:string;expires_at:string;human_reviewed:boolean;requirements:Record<string,unknown>};

export async function upsertComplianceRule(input:{destinationCountry:string;nationalityScope:string;ruleKey:string;ruleType:ComplianceRuleType;maxPresenceDays?:number;windowDays?:number;minMonthlyIncome?:number;incomeCurrency?:string;sourceUrl:string;sourceTitle?:string;effectiveFrom?:string;effectiveTo?:string;verifiedAt:string;expiresAt:string;requirements?:Record<string,unknown>}){
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<Array<{id:string}>>`
    insert into compliance_rules(destination_country,nationality_scope,rule_key,rule_type,max_presence_days,window_days,min_monthly_income,income_currency,source_url,source_title,effective_from,effective_to,verified_at,expires_at,human_reviewed,requirements)
    values(${input.destinationCountry},${input.nationalityScope},${input.ruleKey},${input.ruleType},${input.maxPresenceDays??null},${input.windowDays??null},${input.minMonthlyIncome??null},${input.incomeCurrency??null},${input.sourceUrl},${input.sourceTitle??null},${input.effectiveFrom??null},${input.effectiveTo??null},${input.verifiedAt},${input.expiresAt},true,${sql.json((input.requirements||{}) as never)})
    on conflict(destination_country,nationality_scope,rule_key,effective_from) do update set rule_type=excluded.rule_type,max_presence_days=excluded.max_presence_days,window_days=excluded.window_days,min_monthly_income=excluded.min_monthly_income,income_currency=excluded.income_currency,source_url=excluded.source_url,source_title=excluded.source_title,effective_to=excluded.effective_to,verified_at=excluded.verified_at,expires_at=excluded.expires_at,human_reviewed=true,requirements=excluded.requirements,updated_at=now()
    returning id::text
  `;return rows[0]?.id??null;
}

export async function findFreshComplianceRule(input:{destinationCountry:string;nationalityScope:string;ruleType:ComplianceRuleType}){
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<ComplianceRule[]>`
    select id::text,destination_country,nationality_scope,rule_key,rule_type,max_presence_days,window_days,min_monthly_income::float,income_currency,source_url,source_title,effective_from::text,effective_to::text,verified_at::text,expires_at::text,human_reviewed,requirements
    from compliance_rules
    where lower(destination_country)=lower(${input.destinationCountry})
      and rule_type=${input.ruleType}
      and human_reviewed=true
      and expires_at>now()
      and (effective_from is null or effective_from<=current_date)
      and (effective_to is null or effective_to>=current_date)
      and (nationality_scope=${input.nationalityScope} or nationality_scope='ANY')
    order by case when nationality_scope=${input.nationalityScope} then 0 else 1 end,verified_at desc limit 1
  `;return rows[0]??null;
}

export function evaluateComplianceRule(rule:ComplianceRule|null,input:{stayPresenceDays:number;monthlyIncome?:number}){
  if(!rule)return{state:"UNKNOWN" as const,reasons:["No fresh human-reviewed rule is stored for this destination and traveller scope."],source:null,disclaimer:"Atlas will not infer immigration or visa eligibility without current evidence."};
  const reasons:string[]=[];let fail=false;let unknownInput=false;
  if(rule.max_presence_days!==null&&input.stayPresenceDays>rule.max_presence_days){fail=true;reasons.push("Entered presence days exceed the stored maximum of "+rule.max_presence_days+".");}
  if(rule.min_monthly_income!==null){if(input.monthlyIncome===undefined){unknownInput=true;reasons.push("This rule has an income requirement but no monthly income was supplied.");}else if(input.monthlyIncome<rule.min_monthly_income){fail=true;reasons.push("Entered monthly income is below the stored minimum requirement.");}}
  if(!reasons.length)reasons.push("Entered values do not breach the deterministic fields stored in this rule.");
  return{state:fail?"FAIL_SCREEN" as const:unknownInput?"UNKNOWN_INPUT" as const:"PASS_SCREEN" as const,reasons,source:{url:rule.source_url,title:rule.source_title,verifiedAt:rule.verified_at,expiresAt:rule.expires_at,ruleKey:rule.rule_key,ruleType:rule.rule_type,maxPresenceDays:rule.max_presence_days,windowDays:rule.window_days,minMonthlyIncome:rule.min_monthly_income,incomeCurrency:rule.income_currency,requirements:rule.requirements},disclaimer:"This is a source-backed planning screen, not legal advice or a visa decision."};
}
