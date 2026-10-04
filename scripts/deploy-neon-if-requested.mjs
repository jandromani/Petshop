import { spawnSync } from "node:child_process";

if(process.env.NEON_PLATFORM_DEPLOY!=="1"){
  console.log("Neon platform deploy not requested; skipping.");
  process.exit(0);
}
if(!process.env.NEON_API_KEY){
  throw new Error("NEON_PLATFORM_DEPLOY=1 but NEON_API_KEY is missing");
}

function neon(args){
  const result=spawnSync("npx",["--yes","neon@latest",...args],{
    stdio:"inherit",
    env:{...process.env,CI:"1"},
  });
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error("Neon CLI failed: neon "+args.join(" "));
}

console.log("Linking Neon project morning-brook-21821002 / production...");
neon(["link","--project-id","morning-brook-21821002","--branch","production","-y"]);

console.log("Planning Neon platform configuration...");
neon(["config","plan"]);

console.log("Applying Neon platform configuration...");
neon(["deploy"]);

console.log("Neon platform configuration deployed.");
