export type JudgeVerdict = "PASS" | "REVISION" | "REJECT";

export type JudgeResult = {
  judge: string;
  verdict: JudgeVerdict;
  score: number;
  reasons: string[];
};

function result(judge:string,reasons:string[],severity:"revision"|"reject"="revision"):JudgeResult{
  return{
    judge,
    verdict:reasons.length?(severity==="reject"?"REJECT":"REVISION"):"PASS",
    score:reasons.length?(severity==="reject"?35:65):96,
    reasons,
  };
}

export function deterministicTruthJudge(artifact:string):JudgeResult{
  const reasons:string[]=[];
  const lower=artifact.toLowerCase();
  if(/guaranteed|100% available|live price/.test(lower)&&!/evidence|verified|provider/.test(lower)) reasons.push("commercial certainty without explicit evidence");
  if(/€\s?\d/.test(artifact)&&!/prototype|verified|provider|seed|evidence|budget|cost estimate/i.test(artifact)) reasons.push("price appears without provenance language");
  if(/booked|reserved|contract signed|published|deployed|sent successfully/i.test(artifact)&&!/tool|evidence|result|verified/i.test(artifact)) reasons.push("execution claim without explicit evidence language");
  return result("truth",reasons);
}

export function deterministicBrandJudge(artifact:string):JudgeResult{
  const reasons:string[]=[];
  if(/elderly|old people|geriatric/i.test(artifact)) reasons.push("brand language is age-first instead of freedom-first");
  if(/senior citizens? must|old-age/i.test(artifact)) reasons.push("patronizing or institutional retirement framing");
  return result("brand",reasons);
}

export function deterministicSeoJudge(artifact:string):JudgeResult{
  const reasons:string[]=[];
  if(/guaranteed ranking|rank #?1|instant seo|index immediately/i.test(artifact)) reasons.push("unsupported SEO outcome claim");
  if(/thousands of pages|mass[- ]publish|programmatic pages/i.test(artifact)&&!/evidence|live inventory|quality gate|noindex/i.test(artifact)) reasons.push("scaled SEO proposed without evidence/indexing gate");
  return result("seo",reasons);
}

export function deterministicConversionJudge(artifact:string):JudgeResult{
  const reasons:string[]=[];
  if(/guaranteed conversion|double conversions|\b\d{2,3}%\s+conversion/i.test(artifact)&&!/experiment|observed|measured|baseline/i.test(artifact)) reasons.push("conversion uplift stated without observed experiment evidence");
  if(/dark pattern|fake urgency|only \d+ left/i.test(artifact)&&!/provider|verified/i.test(artifact)) reasons.push("conversion tactic relies on unsupported urgency");
  return result("conversion",reasons);
}

export function deterministicRevenueJudge(artifact:string):JudgeResult{
  const reasons:string[]=[];
  if(/commission|revenue|margin|cpa|roas/i.test(artifact)&&/€|\$|%/.test(artifact)&&!/ledger|rule|observed|provider|contract|estimate/i.test(artifact)) reasons.push("revenue fact lacks ledger/rule provenance");
  if(/settled|paid out|commission received/i.test(artifact)&&!/ledger|settlement|provider report|evidence/i.test(artifact)) reasons.push("settlement claim lacks provider or ledger evidence");
  return result("revenue",reasons);
}

export function deterministicAuthorityJudge(artifact:string):JudgeResult{
  const reasons:string[]=[];
  if(/self[- ]approve|approve my own|ignore (?:the )?(?:judge|approval|policy)|bypass (?:the )?(?:judge|review|approval|policy)/i.test(artifact)){
    reasons.push("artifact attempts to bypass independent approval or self-approve");
  }
  if(/no (?:human|manual) (?:approval|review) (?:is )?(?:needed|required)|override (?:human|policy) authority/i.test(artifact)){
    reasons.push("artifact attempts to remove the human authority boundary");
  }
  return result("authority",reasons,"reject");
}

export function deterministicSecurityJudge(artifact:string):JudgeResult{
  const reasons:string[]=[];
  if(/sk-[a-z0-9_-]{12,}|api[_ -]?key\s*[:=]\s*\S+|bearer\s+[a-z0-9._-]{12,}/i.test(artifact)) reasons.push("possible secret material in artifact");
  if(/disable auth|bypass auth|turn off security|ignore permission/i.test(artifact)) reasons.push("proposal weakens security boundary");
  return result("security",reasons,"reject");
}

export function deterministicReliabilityJudge(artifact:string):JudgeResult{
  const reasons:string[]=[];
  if(/deployed|merged|published|sent|completed|fixed in production/i.test(artifact)&&!/tool result|verified|evidence|observed|commit|deployment/i.test(artifact)) reasons.push("completion claim lacks external execution evidence");
  if(/always works|never fails|100% reliable/i.test(artifact)) reasons.push("absolute reliability claim");
  return result("reliability",reasons);
}

export function deterministicJudge(name:string,artifact:string):JudgeResult{
  switch(name){
    case "truth": return deterministicTruthJudge(artifact);
    case "brand": return deterministicBrandJudge(artifact);
    case "seo": return deterministicSeoJudge(artifact);
    case "conversion": return deterministicConversionJudge(artifact);
    case "revenue": return deterministicRevenueJudge(artifact);
    case "authority": return deterministicAuthorityJudge(artifact);
    case "security": return deterministicSecurityJudge(artifact);
    case "reliability": return deterministicReliabilityJudge(artifact);
    default:return{judge:name,verdict:"REVISION",score:50,reasons:["required deterministic judge is not implemented"]};
  }
}

export function runRequiredJudges(required:string[],artifact:string){
  const names=[...new Set(["truth","authority",...required])];
  return names.map(name=>deterministicJudge(name,artifact));
}
