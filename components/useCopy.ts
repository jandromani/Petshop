"use client";
import { useLanguage } from "@/components/LanguageProvider";
import { localizedHref } from "@/src/i18n/config";
import { translate } from "@/src/i18n/text";
export function useCopy(){const language=useLanguage();return{language,t:(text:string)=>translate(language,text),local:(path:string)=>localizedHref(path,language)}}
