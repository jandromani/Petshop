import postgres from "postgres";

let client: ReturnType<typeof postgres> | null = null;

export function databaseConfigured(){
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabase(){
  const url=process.env.DATABASE_URL;
  if(!url)return null;
  if(!client){
    client=postgres(url,{
      max:5,
      idle_timeout:20,
      connect_timeout:10,
      prepare:false,
    });
  }
  return client;
}

export async function databaseHealth(){
  if(!databaseConfigured()){
    return{configured:false,reachable:false,latencyMs:null,error:null} as const;
  }
  const sql=getDatabase();
  if(!sql)return{configured:true,reachable:false,latencyMs:null,error:"client-unavailable"} as const;
  const started=Date.now();
  try{
    const rows=await sql<{database:string;serverTime:string}[]>`
      select current_database()::text as database, now()::text as "serverTime"
    `;
    return{
      configured:true,
      reachable:true,
      latencyMs:Date.now()-started,
      database:rows[0]?.database||null,
      serverTime:rows[0]?.serverTime||null,
      error:null,
    } as const;
  }catch(error){
    return{
      configured:true,
      reachable:false,
      latencyMs:Date.now()-started,
      error:String(error).slice(0,300),
    } as const;
  }
}
