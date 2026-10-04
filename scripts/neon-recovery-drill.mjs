import { spawnSync } from "node:child_process";

if(process.env.NEON_RECOVERY_DRILL!=="true"){
  console.log("Neon recovery drill disabled; skipping.");
  process.exit(0);
}
if(!process.env.NEON_API_KEY){
  throw new Error("NEON_API_KEY is required for the isolated recovery drill.");
}

const cli=["--yes","neon@latest"];
function neon(args){
  const result=spawnSync("npx",[...cli,...args],{stdio:"inherit",env:process.env});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error("Neon command failed: "+args.join(" "));
}

const suffix=(process.env.VERCEL_GIT_COMMIT_SHA||String(Date.now())).slice(0,8);
const snapshotName="atlas-recovery-drill-"+suffix;
const recoveredName=snapshotName+"-recovered";

neon(["link","--project-id","morning-brook-21821002","--branch","production","-y"]);
neon(["snapshots","create","--branch","production","--name",snapshotName]);
neon(["snapshots","restore",snapshotName,"--name",recoveredName]);
neon(["snapshots","list"]);
neon(["branches","list"]);

console.log(JSON.stringify({
  event:"neon_recovery_drill_complete",
  snapshot:snapshotName,
  recoveredBranch:recoveredName,
  finalized:false,
  productionSwitched:false,
}));
