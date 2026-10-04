import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const url=process.env.DATABASE_URL;
if(!url){
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql=postgres(url,{max:1,prepare:false,connect_timeout:15,idle_timeout:5});
const lockName="atlas:schema-migrations:v1";

try{
  await sql`select pg_advisory_lock(hashtext(${lockName}))`;
  await sql`
    create table if not exists atlas_schema_migrations (
      filename text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `;

  const dir=path.resolve("db");
  const files=(await fs.readdir(dir)).filter(x=>/^\d+.*\.sql$/.test(x)).sort();

  for(const file of files){
    const source=await fs.readFile(path.join(dir,file),"utf8");
    const checksum=crypto.createHash("sha256").update(source).digest("hex");
    const applied=await sql<{checksum:string}[]>`
      select checksum from atlas_schema_migrations where filename=${file} limit 1
    `;

    if(applied[0]){
      if(applied[0].checksum!==checksum){
        throw new Error("Migration drift detected for "+file+": applied checksum differs from repository");
      }
      console.log("already applied",file);
      continue;
    }

    console.log("applying",file);
    await sql.begin(async tx=>{
      await tx.unsafe(source);
      await tx`
        insert into atlas_schema_migrations (filename,checksum)
        values (${file},${checksum})
      `;
    });
  }

  console.log("database migrations complete");
}finally{
  try{await sql`select pg_advisory_unlock(hashtext(${lockName}))`;}catch{}
  await sql.end();
}
