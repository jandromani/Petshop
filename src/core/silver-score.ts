export type SilverScoreInput={
  nights:number;
  board?:string|null;
  roomType?:string|null;
  cancellation?:string|null;
  taxesIncluded?:boolean|null;
  facilities?:string[];
  photoUrls?:string[];
  description?:string|null;
  confidence?:number;
};

export type SilverScoreBreakdown={label:string;points:number;max:number};

function hasAny(values:string[],terms:string[]){
  const hay=values.join(" ").toLowerCase();
  return terms.some(t=>hay.includes(t));
}

export function computeSilverFit(input:SilverScoreInput){
  const facilities=input.facilities||[];
  const photos=input.photoUrls||[];
  const breakdown:SilverScoreBreakdown[]=[];

  breakdown.push({label:"Long-stay suitability",points:input.nights>=90?20:input.nights>=60?18:input.nights>=30?15:5,max:20});
  const board=String(input.board||"").trim();
  breakdown.push({label:"Board clarity",points:board?12:3,max:12});

  let amenities=0;
  if(hasAny(facilities,["lift","elevator"]))amenities+=4;
  if(hasAny(facilities,["pool","swimming"]))amenities+=4;
  if(hasAny(facilities,["wifi","internet"]))amenities+=4;
  if(hasAny(facilities,["restaurant","breakfast","meal"]))amenities+=4;
  if(hasAny(facilities,["fitness","gym","spa","wellness"]))amenities+=4;
  if(hasAny(facilities,["medical","clinic","doctor","health"]))amenities+=5;
  breakdown.push({label:"Useful amenities",points:Math.min(25,amenities),max:25});

  const cancellation=String(input.cancellation||"").toLowerCase();
  const cancellationPoints=input.cancellation?(cancellation.includes("free")||cancellation.includes("refund")?12:8):2;
  breakdown.push({label:"Cancellation clarity",points:cancellationPoints,max:12});

  let priceClarity=0;
  if(input.taxesIncluded!==null&&input.taxesIncluded!==undefined)priceClarity+=5;
  if(input.roomType)priceClarity+=5;
  breakdown.push({label:"Price & room clarity",points:priceClarity,max:10});

  let content=0;
  if(photos.length>=5)content+=7;else if(photos.length>=1)content+=4;
  if(input.description?.trim())content+=4;
  breakdown.push({label:"Property evidence",points:Math.min(11,content),max:11});

  const confidence=Math.max(0,Math.min(1,input.confidence??0));
  breakdown.push({label:"Commercial evidence",points:Math.round(confidence*10),max:10});

  const score=breakdown.reduce((sum,x)=>sum+x.points,0);
  return{score:Math.max(0,Math.min(100,score)),breakdown};
}
