export function sameOrigin(req:Request){try{return req.headers.get("origin")===new URL(req.url).origin}catch{return false}}
export async function boundedJson(req:Request,maxBytes=8192){
  if(Number(req.headers.get("content-length")||0)>maxBytes)return null;
  if(!req.body)return null;
  const reader=req.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>maxBytes){await reader.cancel();return null}chunks.push(r.value)}}catch{return null}
  const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length}
  try{return JSON.parse(new TextDecoder().decode(all)) as unknown}catch{return null}
}
