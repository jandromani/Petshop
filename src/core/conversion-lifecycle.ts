export type ConversionStatus="PENDING"|"CONFIRMED"|"CANCELLED"|"SETTLED"|"REVERSED";

export function nextConversionStatus(current:ConversionStatus,incoming:ConversionStatus):ConversionStatus{
  if(current==="CANCELLED"||current==="REVERSED")return current;
  if(incoming==="CANCELLED"||incoming==="REVERSED")return incoming;
  if(current==="SETTLED")return"SETTLED";
  if(incoming==="SETTLED")return"SETTLED";
  if(current==="CONFIRMED"&&incoming==="PENDING")return"CONFIRMED";
  return incoming;
}
