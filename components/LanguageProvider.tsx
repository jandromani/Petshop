"use client";
import { createContext,useContext } from "react";
import type { Language } from "@/src/i18n/config";
export const LanguageContext=createContext<Language>("en");
export default function LanguageProvider({language,children}:{language:Language;children:React.ReactNode}){return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>}
export function useLanguage(){return useContext(LanguageContext)}
