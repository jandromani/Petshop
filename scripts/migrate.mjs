import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const url=process.env.DATABASE_URL;
if(!url){
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql=postgres(url,{max:1,prepare:false});
try{
  const dir=path.resolve("db");
  const files=(await fs.readdir(dir)).filter(x=>/^\d+.*\.sql$/.test(x)).sort();
  for(const file of files){
    const source=await fs.readFile(path.join(dir,file),"utf8");
    console.log("applying",file);
    await sql.unsafe(source);
  }
  console.log("database migrations complete");
}finally{
  await sql.end();
}
