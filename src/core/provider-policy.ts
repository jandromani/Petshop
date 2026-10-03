const DEFAULT_TTL_SECONDS:Record<string,number>={
  booking:15*60,
  ratehawk:5*60,
  hbx:5*60,
};

export function providerTtlSeconds(provider:string){
  const envKey=provider.toUpperCase()+"_OFFER_TTL_SECONDS";
  const override=Number(process.env[envKey]);
  if(Number.isFinite(override)&&override>=60&&override<=86400)return Math.round(override);
  return DEFAULT_TTL_SECONDS[provider]??10*60;
}

export function providerFreshUntil(provider:string,verifiedAt:string){
  const t=new Date(verifiedAt).getTime();
  if(Number.isNaN(t))throw new Error("invalid verifiedAt");
  return new Date(t+providerTtlSeconds(provider)*1000).toISOString();
}
