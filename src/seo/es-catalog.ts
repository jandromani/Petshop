export const ES_DISCOVERY=[
  {
    slug:"menos-de-1500-al-mes",
    sourceSlug:"under-1500-month",
    title:"Estancias largas por menos de 1.500 € al mes",
    headline:"¿Hasta dónde pueden llevarte 1.500 € al mes?",
    description:"Compara estancias hoteleras largas verificadas por debajo de 1.500 € al mes cuando exista inventario comercial vigente.",
  },
  {
    slug:"todo-incluido",
    sourceSlug:"all-inclusive",
    title:"Estancias largas con todo incluido",
    headline:"Vivir una temporada con las comidas resueltas.",
    description:"Opciones de larga estancia con régimen todo incluido, publicadas sólo cuando existe una oferta comercial verificada.",
  },
  {
    slug:"mejor-valor-asia",
    sourceSlug:"best-value-asia",
    title:"Estancias largas con mejor valor en Asia",
    headline:"Más mundo por cada euro.",
    description:"Estancias largas verificadas en Asia ordenadas alrededor del coste mensual y la evidencia comercial disponible.",
  },
] as const;

export function esDiscoveryBySlug(slug:string){
  return ES_DISCOVERY.find(x=>x.slug===slug);
}
export function esSlugForSource(sourceSlug:string){
  return ES_DISCOVERY.find(x=>x.sourceSlug===sourceSlug)?.slug;
}
