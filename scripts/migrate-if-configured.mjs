import { spawnSync } from "node:child_process";

const configured=Boolean(process.env.DATABASE_URL_UNPOOLED||process.env.DIRECT_URL||process.env.DATABASE_URL);
if(!configured){
  console.log("No database URL configured; skipping database migrations for this build.");
  process.exit(0);
}

const result=spawnSync(process.execPath,["scripts/migrate.mjs"],{
  stdio:"inherit",
  env:process.env,
});
if(result.error)throw result.error;
process.exit(result.status??1);
