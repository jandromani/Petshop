import type { Metadata } from "next";
import StaysExplorer,{type StaysInitialSearch} from "@/components/StaysExplorer";
import { publicDirectorySnapshot } from "@/src/data/public-directory";
import { defaultCheckIn,type SearchRegion,type StayDuration } from "@/src/core/search";

export const metadata:Metadata={
  title:"Real hotel search",
  description:"Search mapped real hotels for 30–365 day stays with deterministic filters and Atlas AI. Prices appear only after commercial verification.",
  robots:{index:false,follow:true},
};

const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value;
const allowedRegions=new Set(["All","Europe","Asia","Africa","Americas"]);
const allowedDurations=new Set([30,60,90,120,180,365]);
const allowedFlex=new Set([0,7,30]);
const allowedProviders=new Set(["","direct","booking","ratehawk","hbx"]);
const allowedSort=new Set(["recommended","price","confidence","name"]);

export default async function StaysPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const p=await searchParams;
  const query=(one(p.q)||"").slice(0,120);
  const region=(allowedRegions.has(one(p.region)||"")?one(p.region):"All") as SearchRegion;
  const durationRaw=Number(one(p.duration)||90);const duration=(allowedDurations.has(durationRaw)?durationRaw:90) as StayDuration;
  const flexRaw=Number(one(p.flexibleDays)||7);const flexibleDays=(allowedFlex.has(flexRaw)?flexRaw:7) as 0|7|30;
  const occupancy=Number(one(p.occupancy))===2?2:1;
  const checkIn=/^\d{4}-\d{2}-\d{2}$/.test(one(p.checkIn)||"")?String(one(p.checkIn)):defaultCheckIn();
  const budgetRaw=Number(one(p.maxMonthly)||5000);const budget=Number.isFinite(budgetRaw)&&budgetRaw>0?Math.min(50000,budgetRaw):5000;
  const minRaw=Number(one(p.minMonthly)||0);const minMonthly=Number.isFinite(minRaw)&&minRaw>0?Math.min(50000,minRaw):undefined;
  const features=(one(p.features)||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean).slice(0,8);
  const featuresMode=one(p.featuresMode)==="strict"?"strict":"rank";
  const verifiedOnly=one(p.verifiedOnly)==="1";
  const board=(one(p.board)||"").slice(0,60);const cancellation=(one(p.cancellation)||"").slice(0,80);
  const provider=allowedProviders.has(one(p.provider)||"")?(one(p.provider)||""):"";
  const brand=(one(p.brand)||"").slice(0,100);const brandedOnly=one(p.brandedOnly)==="1";
  const sort=(allowedSort.has(one(p.sort)||"")?one(p.sort):"recommended") as StaysInitialSearch["sort"];
  const pageRaw=Number(one(p.page)||0);const page=Number.isInteger(pageRaw)&&pageRaw>=0?Math.min(400,pageRaw):0;
  const bbox=(one(p.bbox)||"").slice(0,120);

  const initial:StaysInitialSearch={
    query,region,checkIn,flexibleDays,duration,occupancy,budget,features,featuresMode,verifiedOnly,minMonthly,
    board,cancellation,provider,brand,brandedOnly,sort,page,bbox,
  };
  const requiresLiveState=verifiedOnly||Boolean(minMonthly)||Boolean(board)||Boolean(cancellation)||Boolean(provider)||featuresMode==="strict"||Boolean(bbox);
  const initialData=requiresLiveState?undefined:publicDirectorySnapshot(24,{q:query,region,brand,brandedOnly});

  return <StaysExplorer initial={initial} initialData={initialData}/>;
}
