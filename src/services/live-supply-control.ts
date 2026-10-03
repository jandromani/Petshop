import { liveProviderStatuses } from "@/src/providers/live/registry";
import { runBookingLiveWave } from "@/src/services/booking-live-wave";
import { runRateHawkMappedWave,runHbxMappedWave } from "@/src/services/mapped-live-waves";
import { defaultCheckIn,type StayDuration } from "@/src/core/search";

export type LiveSupplyControlInput={
  checkIn?:string;
  durations?:StayDuration[];
  adults?:Array<1|2>;
  maxDestinations?:number;
  maxMappedHotels?:number;
};

export async function runLiveSupplyControl(input:LiveSupplyControlInput={}){
  const checkIn=input.checkIn||defaultCheckIn();
  const durations=input.durations||[30,60,90,120,180];
  const adults=input.adults||[1,2];
  const statuses=liveProviderStatuses();
  const configured=new Set(statuses.filter(s=>s.configured).map(s=>s.provider));
  const runs:any[]=[];
  const skipped:any[]=[];

  for(const occupancy of adults){
    for(const duration of durations){
      const key=checkIn+"_"+duration+"n_"+occupancy+"a";
      if(configured.has("booking")&&duration<=90){
        try{runs.push(await runBookingLiveWave({waveKey:"booking_"+key,checkIn,nights:duration,adults:occupancy,maxDestinations:input.maxDestinations??8,persist:true}));}
        catch(error){runs.push({provider:"booking",waveKey:"booking_"+key,error:String(error)});}
      }else if(duration<=90) skipped.push({provider:"booking",duration,occupancy,reason:configured.has("booking")?"unsupported-duration":"provider-disabled"});

      if(configured.has("ratehawk")){
        try{runs.push(await runRateHawkMappedWave({waveKey:"ratehawk_"+key,checkIn,nights:duration,adults:occupancy,maxHotels:input.maxMappedHotels??30,persist:true}));}
        catch(error){runs.push({provider:"ratehawk",waveKey:"ratehawk_"+key,error:String(error)});}
      }else skipped.push({provider:"ratehawk",duration,occupancy,reason:"provider-disabled"});

      if(configured.has("hbx")){
        try{runs.push(await runHbxMappedWave({waveKey:"hbx_"+key,checkIn,nights:duration,adults:occupancy,maxHotels:input.maxMappedHotels??30,persist:true}));}
        catch(error){runs.push({provider:"hbx",waveKey:"hbx_"+key,error:String(error)});}
      }else skipped.push({provider:"hbx",duration,occupancy,reason:"provider-disabled"});
    }
  }

  return{
    runType:"live-supply-control",
    checkIn,
    configuredProviders:[...configured],
    runs,
    skipped,
    totals:{
      sellable:runs.reduce((s,r)=>s+Number(r.sellable||0),0),
      quarantined:runs.reduce((s,r)=>s+Number(r.quarantined||0),0),
      errors:runs.reduce((s,r)=>s+Number(r.errors?.length||Boolean(r.error)),0),
    },
    completedAt:new Date().toISOString(),
  };
}
