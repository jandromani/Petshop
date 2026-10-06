export type Language="en"|"es";
export function languageFromPath(path:string):Language{return path==="/es"||path.startsWith("/es/")?"es":"en"}
export function withoutLanguage(path:string){return path==="/es"?"/":path.startsWith("/es/")?path.slice(3):path}
export function localizedHref(path:string,language:Language){
  if(!path.startsWith("/")||path.startsWith("/api/")||path.startsWith("//"))return path;
  const clean=withoutLanguage(path);
  return language==="es"?"/es"+(clean==="/"?"":clean):clean;
}
export function copy(language:Language,en:string,es:string){return language==="es"?es:en}
