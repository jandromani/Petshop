"use client";
import { createContext,useContext,useEffect } from "react";
import { usePathname } from "next/navigation";
import { languageFromPath,type Language } from "@/src/i18n/config";

export const LanguageContext=createContext<Language>("en");

export default function LanguageProvider({children}:{children:React.ReactNode}){
  const pathname=usePathname()||"/";
  const language=languageFromPath(pathname);
  useEffect(()=>{document.documentElement.lang=language},[language]);
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useLanguage(){return useContext(LanguageContext)}
