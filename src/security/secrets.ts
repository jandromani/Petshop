import { timingSafeEqual } from "node:crypto";

export function secureSecretEqual(supplied:string|undefined|null,configured:string|undefined|null){
  if(!supplied||!configured)return false;
  const left=Buffer.from(supplied,"utf8");
  const right=Buffer.from(configured,"utf8");
  return left.length===right.length&&timingSafeEqual(left,right);
}

export function bearerSecretAuthorized(req:Request,configured:string|undefined|null){
  const header=req.headers.get("authorization");
  if(!header?.startsWith("Bearer "))return false;
  return secureSecretEqual(header.slice(7),configured);
}
