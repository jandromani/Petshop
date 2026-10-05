export function canonicalSiteUrl(){
  const explicit=process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if(explicit&&!explicit.includes("localhost")&&!explicit.includes("example.")) return explicit.replace(/\/$/,"");
  const host=process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL;
  if(host)return ("https://"+host).replace(/\/$/,"");
  return "http://localhost:3000";
}

export function publicSiteConfigured(){
  return !canonicalSiteUrl().includes("localhost");
}


export function customPublicDomainConfigured(){
  try{
    const host=new URL(canonicalSiteUrl()).hostname.toLowerCase();
    return host!=="localhost"&&!host.endsWith(".vercel.app");
  }catch{return false;}
}

export function searchConsoleVerificationConfigured(){
  return Boolean(process.env.GOOGLE_SITE_VERIFICATION?.trim());
}
