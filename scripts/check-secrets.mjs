import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked=execFileSync("git",["ls-files","-z"],{encoding:"utf8"}).split("\0").filter(Boolean);
const rules=[
  {name:"OpenRouter key",re:/sk-or-v1-[A-Za-z0-9_-]{20,}/g},
  {name:"GitHub classic token",re:/ghp_[A-Za-z0-9]{30,}/g},
  {name:"GitHub fine-grained token",re:/github_pat_[A-Za-z0-9_]{40,}/g},
  {name:"AWS access key",re:/AKIA[0-9A-Z]{16}/g},
  {name:"Private key",re:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g},
];

const allowFiles=new Set([".env.example"]);
const findings=[];
for(const file of tracked){
  if(allowFiles.has(file)) continue;
  let text;
  try{text=readFileSync(file,"utf8");}catch{continue;}
  for(const rule of rules){
    rule.re.lastIndex=0;
    if(rule.re.test(text)) findings.push({file,rule:rule.name});
  }
}

if(findings.length){
  console.error("Potential committed secrets detected:");
  for(const finding of findings) console.error(" - "+finding.file+" ["+finding.rule+"]");
  process.exit(1);
}
console.log("Secret scan passed across "+tracked.length+" tracked files.");
