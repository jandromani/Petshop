export type SearchScope = "auto" | "destination" | "hotel";
export type SearchIdentity = {
  name:string; city:string; country:string; market?:string|null;
  address?:string|null; brand?:string|null;
};

export const normalizeSearch = (value:string) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

export function resolveSearchScope(query:string, scope:SearchScope, identities:SearchIdentity[]):Exclude<SearchScope,"auto"> {
  if(scope!=="auto") return scope;
  const q=normalizeSearch(query);
  return q && identities.some(h=>[h.city,h.market||"",h.country].some(v=>normalizeSearch(v)===q)) ? "destination" : "hotel";
}

export function matchesDirectorySearch(h:SearchIdentity, query:string, scope:Exclude<SearchScope,"auto">) {
  const q=normalizeSearch(query);
  if(!q) return true;
  const fields=scope==="destination" ? [h.city,h.market||"",h.country] : [h.name,h.brand||""];
  return fields.some(value=>normalizeSearch(value).includes(q));
}
