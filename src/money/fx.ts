export const REPORTING_CURRENCY="EUR";
export const FX_POLICY_VERSION="atlas-fx-v1";

export type FxRateEvidence={
  baseCurrency:string;
  quoteCurrency:string;
  rate:number;
  observedAt:string;
  source:string;
};

export type FxConversion={
  nativeAmount:number;
  nativeCurrency:string;
  reportingCurrency:typeof REPORTING_CURRENCY;
  reportingAmount:number|null;
  appliedRate:number|null;
  evidence:FxRateEvidence|null;
  reason:"native-reporting-currency"|"explicit-fx-evidence"|"fx-evidence-required";
};

function currency(code:string){
  return String(code||"").trim().toUpperCase();
}

export function convertToReportingCurrency(
  amount:number,
  nativeCurrency:string,
  evidence?:FxRateEvidence|null,
):FxConversion{
  const native=currency(nativeCurrency);
  if(!Number.isFinite(amount))throw new Error("amount must be finite");
  if(!/^[A-Z]{3}$/.test(native))throw new Error("invalid native currency");

  if(native===REPORTING_CURRENCY){
    return{
      nativeAmount:amount,nativeCurrency:native,reportingCurrency:REPORTING_CURRENCY,
      reportingAmount:amount,appliedRate:1,evidence:null,reason:"native-reporting-currency",
    };
  }

  const valid=Boolean(
    evidence
    && currency(evidence.baseCurrency)===native
    && currency(evidence.quoteCurrency)===REPORTING_CURRENCY
    && Number.isFinite(evidence.rate)
    && evidence.rate>0
    && typeof evidence.source==="string"
    && evidence.source.trim().length>0
    && typeof evidence.observedAt==="string"
    && !Number.isNaN(Date.parse(evidence.observedAt)),
  );
  if(!valid){
    return{
      nativeAmount:amount,nativeCurrency:native,reportingCurrency:REPORTING_CURRENCY,
      reportingAmount:null,appliedRate:null,evidence:null,reason:"fx-evidence-required",
    };
  }

  return{
    nativeAmount:amount,
    nativeCurrency:native,
    reportingCurrency:REPORTING_CURRENCY,
    reportingAmount:Math.round(amount*evidence!.rate*100)/100,
    appliedRate:evidence!.rate,
    evidence:evidence!,
    reason:"explicit-fx-evidence",
  };
}
