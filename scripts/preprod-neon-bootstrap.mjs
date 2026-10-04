import { createCipheriv,randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

if(process.env.PREPROD_NEON_BOOTSTRAP!=="true"){
  console.log("Preprod Neon bootstrap disabled; skipping.");
  process.exit(0);
}
if(!process.env.NEON_API_KEY||!process.env.PREPROD_EXPORT_KEY){
  throw new Error("Preprod bootstrap credentials are unavailable.");
}

function run(args){
  const result=spawnSync("npx",["--yes","neon@latest",...args],{stdio:["ignore","pipe","pipe"],env:process.env,encoding:"utf8"});
  if(result.status!==0)throw new Error("Neon command failed: "+args[0]+"\n"+String(result.stderr||"").slice(0,1200));
  return String(result.stdout||"");
}

run(["link","--project-id","morning-brook-21821002","--branch","atlas-recovery-drill-75c2502f-recovered","-y"]);
run(["env","pull","--service","postgres","-y"]);

const source=readFileSync(".env.local","utf8");
const vars={};
for(const line of source.split(/\r?\n/)){
  const match=line.match(/^([A-Z0-9_]+)=(.*)$/);
  if(!match)continue;
  let value=match[2].trim();
  if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
  if(["DATABASE_URL","DATABASE_URL_UNPOOLED","DIRECT_URL"].includes(match[1]))vars[match[1]]=value;
}
if(!vars.DATABASE_URL||!vars.DATABASE_URL_UNPOOLED)throw new Error("Neon env pull did not return required Postgres URLs.");
vars.DIRECT_URL=vars.DIRECT_URL||vars.DATABASE_URL_UNPOOLED;

const key=Buffer.from(process.env.PREPROD_EXPORT_KEY,"base64url");
if(key.length!==32)throw new Error("Invalid preprod export key.");
const iv=randomBytes(12);
const cipher=createCipheriv("aes-256-gcm",key,iv);
const plaintext=Buffer.from(JSON.stringify(vars),"utf8");
const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);
const tag=cipher.getAuthTag();
const payload=Buffer.concat([iv,tag,ciphertext]).toString("base64url");

console.log("ATLAS_PREPROD_ENCRYPTED_ENV="+payload);
console.log("Preprod Neon env exported as encrypted payload; no connection string was printed.");
