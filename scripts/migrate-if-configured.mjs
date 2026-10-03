import { spawnSync } from "node:child_process";

if(!process.env.DATABASE_URL){
  console.log("DATABASE_URL not configured; skipping database migrations for this build.");
  process.exit(0);
}

const result=spawnSync(process.execPath,["scripts/migrate.mjs"],{
  stdio:"inherit",
  env:process.env,
});
if(result.error)throw result.error;
process.exit(result.status??1);
