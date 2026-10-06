import es from "@/src/i18n/es.json";
import type { Language } from "@/src/i18n/config";
export function translate(language:Language,text:string){return language==="es"?(es as Record<string,string>)[text]||text:text}
