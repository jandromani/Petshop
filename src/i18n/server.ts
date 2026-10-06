import { headers } from "next/headers";
import type { Language } from "@/src/i18n/config";
export async function requestLanguage():Promise<Language>{return (await headers()).get("x-atlas-lang")==="es"?"es":"en"}
