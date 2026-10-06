"use client";
import { useLanguage } from "@/components/LanguageProvider";
import { localizedHref } from "@/src/i18n/config";
export default function LanguageSwitch(){
  const lang=useLanguage();
  return <button className="languageSwitch" type="button" aria-label={lang==="es"?"Cambiar a inglés":"Switch to Spanish"} onClick={()=>{window.location.assign(localizedHref(window.location.pathname,lang==="es"?"en":"es")+window.location.search+window.location.hash)}}>{lang==="es"?"EN":"ES"}</button>;
}
