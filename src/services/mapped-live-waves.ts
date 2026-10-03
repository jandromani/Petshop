import { RateHawkClient } from "@/src/providers/live/ratehawk";
import { HbxClient } from "@/src/providers/live/hbx";
import { listProviderHotels,startAcquisitionRun,finishAcquisitionRun,persistRawProviderEvidence,persistOfferSnapshot,persistSellabilityAudit } from "@/src/db/supply";
import { stableEvidenceHash } from "@/src/services/evidence";
import { evaluateCommercialOffer } from "@/src/core/truth";
import { providerFreshUntil } from "@/src/core/provider-policy";
import { splitStay,aggregateContinuousStay } from "@/src/services/long-stay-probe";
import { addDays } from "@/src/core/search";
import { databaseConfigured } from "@/src/db/client";

export type MappedWaveInput={
  waveKey:string;checkIn:string;nights:30|60|90|120|180;adults:1|2;maxHotels?:number;persist?:boolean;
};
export type MappedWaveResult={
  waveKey:string;provider:"ratehawk"|"hbx";mappedHotels:number;quoteTested:number;sellable:number;stale:number;quarantined:number;persisted:number;errors:Array<{hotel:string;message:string}>;
};

function cheapest<T extends {displayPrice?:number;totalPrice?:number}>(rows:T[]){
  return rows.filter(r=>Number(r.displayPrice??r.totalPrice)>0).sort((a,b)=>Number(a.displayPrice??a.totalPrice)-Number(b.displayPrice??b.totalPrice))[0];
}

export async function runRateHawkMappedWave(input:MappedWaveInput):Promise<MappedWaveResult>{
  const client=new RateHawkClient();
  const status=client.status();
  if(!status.configured)throw new Error("RateHawk provider disabled: "+status.missingEnv.join(", "));
  const shouldPersist=input.persist!==false&&databaseConfigured();
  const mappings=await listProviderHotels("ratehawk",input.maxHotels??30);
  const result:MappedWaveResult={waveKey:input.waveKey,provider:"ratehawk",mappedHotels:mappings.length,quoteTested:0,sellable:0,stale:0,quarantined:0,persisted:0,errors:[]};
  const runId=shouldPersist?await startAcquisitionRun({waveKey:input.waveKey,mode:"live",provider:"ratehawk",checkIn:input.checkIn,durationDays:input.nights,payload:input}):null;

  for(const mapping of mappings){
    try{
      const hid=Number(mapping.provider_hotel_id);
      if(!Number.isFinite(hid))throw new Error("non-numeric RateHawk hotel id");
      const segments=splitStay(input.checkIn,input.nights,30);
      const segmentRows=[] as Array<{segment:(typeof segments)[number];hit:any}>;
      for(const segment of segments){
        const rows=await client.hotelPage({hid,checkIn:segment.checkIn,checkOut:segment.checkOut,adults:input.adults,currency:"EUR"});
        let hit=cheapest(rows);
        if(!hit)throw new Error("no hotelpage rate for segment "+segment.index);
        if(process.env.RATEHAWK_BOOKING_ENABLED==="true"&&hit.providerOfferId){
          const prebook=await client.prebookHotelRate(hit.providerOfferId,0);
          hit=cheapest(prebook)||hit;
        }
        segmentRows.push({segment,hit});
      }
      result.quoteTested++;
      const aggregate=aggregateContinuousStay(segmentRows.map(x=>({segment:x.segment,totalPrice:Number(x.hit.displayPrice??x.hit.totalPrice),currency:String(x.hit.currency||"")})));
      const raw={segments:segmentRows.map(x=>x.hit.raw),aggregate};
      const evidenceHash=stableEvidenceHash(raw);
      const verifiedAt=new Date().toISOString();
      const providerOfferId="multi-"+evidenceHash.slice(0,28);
      const apiReady=aggregate.continuous&&segmentRows.every(x=>x.hit.commercialFulfillment==="api");
      const truth=evaluateCommercialOffer({
        hotelId:mapping.hotel_id,sourceMode:"live",provider:"ratehawk",providerOfferId,totalPrice:aggregate.totalPrice,
        currency:aggregate.currency||"",checkIn:input.checkIn,checkOut:addDays(input.checkIn,input.nights),verifiedAt,
        expiresAt:providerFreshUntil("ratehawk",verifiedAt),apiBookingCapable:apiReady,rawHash:evidenceHash,
      });
      if(truth.state==="SELLABLE")result.sellable++; else if(truth.state==="STALE")result.stale++; else result.quarantined++;
      if(shouldPersist){
        await persistRawProviderEvidence({provider:"ratehawk",providerHotelId:mapping.provider_hotel_id,providerOfferId,evidenceHash,payload:raw});
        const snapshotId=await persistOfferSnapshot({
          hotelId:mapping.hotel_id,provider:"ratehawk",providerOfferId,checkIn:input.checkIn,checkOut:addDays(input.checkIn,input.nights),
          occupancy:input.adults,board:segmentRows[0]?.hit.board,totalPrice:aggregate.totalPrice,displayPrice:aggregate.totalPrice,
          currency:aggregate.currency||"EUR",evidenceHash,evidence:raw,verifiedAt,expiresAt:providerFreshUntil("ratehawk",verifiedAt),fulfillmentType:"API_BOOKING",
        });
        await persistSellabilityAudit({hotelId:mapping.hotel_id,offerSnapshotId:snapshotId,result:truth,evidenceHash});
        result.persisted++;
      }
    }catch(error){result.errors.push({hotel:mapping.slug,message:String(error)});}
  }
  if(runId)await finishAcquisitionRun({runId,rawCount:result.quoteTested,canonicalCount:mappings.length,quoteTested:result.quoteTested,sellableCount:result.sellable,staleCount:result.stale,quarantinedCount:result.quarantined,errorCount:result.errors.length,status:result.errors.length?"PARTIAL":"COMPLETE"});
  return result;
}

export async function runHbxMappedWave(input:MappedWaveInput):Promise<MappedWaveResult>{
  const client=new HbxClient();
  const status=client.status();
  if(!status.configured)throw new Error("HBX provider disabled: "+status.missingEnv.join(", "));
  const shouldPersist=input.persist!==false&&databaseConfigured();
  const mappings=await listProviderHotels("hbx",input.maxHotels??30);
  const result:MappedWaveResult={waveKey:input.waveKey,provider:"hbx",mappedHotels:mappings.length,quoteTested:0,sellable:0,stale:0,quarantined:0,persisted:0,errors:[]};
  const runId=shouldPersist?await startAcquisitionRun({waveKey:input.waveKey,mode:"live",provider:"hbx",checkIn:input.checkIn,durationDays:input.nights,payload:input}):null;

  for(const mapping of mappings){
    try{
      const code=Number(mapping.provider_hotel_id);
      if(!Number.isFinite(code))throw new Error("non-numeric HBX hotel code");
      let rows=await client.searchHotels({hotelCodes:[code],checkIn:input.checkIn,checkOut:addDays(input.checkIn,input.nights),adults:input.adults,currency:"EUR"});
      let hit=cheapest(rows);
      if(!hit)throw new Error("no HBX availability");
      if(hit.commercialFulfillment!=="api"&&hit.providerOfferId){
        const checked=await client.checkRate(hit.providerOfferId,hit.currency||"EUR");
        hit=cheapest(checked)||hit;
        rows=checked.length?checked:rows;
      }
      result.quoteTested++;
      const total=Number(hit.displayPrice??hit.totalPrice);
      const evidenceHash=stableEvidenceHash({availability:rows.map(r=>r.raw),selected:hit.raw});
      const verifiedAt=hit.verifiedAt||new Date().toISOString();
      const apiReady=hit.commercialFulfillment==="api";
      const truth=evaluateCommercialOffer({
        hotelId:mapping.hotel_id,sourceMode:"live",provider:"hbx",providerOfferId:hit.providerOfferId,totalPrice:total,currency:hit.currency||"",
        checkIn:input.checkIn,checkOut:addDays(input.checkIn,input.nights),verifiedAt,expiresAt:providerFreshUntil("hbx",verifiedAt),apiBookingCapable:apiReady,rawHash:evidenceHash,
      });
      if(truth.state==="SELLABLE")result.sellable++; else if(truth.state==="STALE")result.stale++; else result.quarantined++;
      if(shouldPersist){
        await persistRawProviderEvidence({provider:"hbx",providerHotelId:mapping.provider_hotel_id,providerOfferId:hit.providerOfferId,evidenceHash,payload:{selected:hit.raw}});
        const snapshotId=await persistOfferSnapshot({
          hotelId:mapping.hotel_id,provider:"hbx",providerOfferId:hit.providerOfferId,providerRequestId:hit.providerRequestId,checkIn:input.checkIn,checkOut:addDays(input.checkIn,input.nights),
          occupancy:input.adults,board:hit.board,totalPrice:Number(hit.totalPrice??total),displayPrice:total,currency:hit.currency||"EUR",
          evidenceHash,evidence:{selected:hit.raw},verifiedAt,expiresAt:providerFreshUntil("hbx",verifiedAt),fulfillmentType:"API_BOOKING",
        });
        await persistSellabilityAudit({hotelId:mapping.hotel_id,offerSnapshotId:snapshotId,result:truth,evidenceHash});
        result.persisted++;
      }
    }catch(error){result.errors.push({hotel:mapping.slug,message:String(error)});}
  }
  if(runId)await finishAcquisitionRun({runId,rawCount:result.quoteTested,canonicalCount:mappings.length,quoteTested:result.quoteTested,sellableCount:result.sellable,staleCount:result.stale,quarantinedCount:result.quarantined,errorCount:result.errors.length,status:result.errors.length?"PARTIAL":"COMPLETE"});
  return result;
}
