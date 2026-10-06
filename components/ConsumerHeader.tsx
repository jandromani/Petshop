"use client";
import { usePathname } from "next/navigation";
import { useCopy } from "@/components/useCopy";
import LanguageSwitch from "@/components/LanguageSwitch";
export default function ConsumerHeader(){const path=usePathname();const{local,t}=useCopy();if(["/","/es"].includes(path)||/^\/(control|hotel-desk|growth-desk|ops)(\/|$)/.test(path))return null;return <header className="nav"><div className="shell navin"><a className="brand" href={local("/")}>ATLAS<span>{t("LONG STAY")}</span></a><nav className="consumerNav" aria-label={t("Main navigation")}><a href={local("/stays")}>{t("Explore stays")}</a><a href={local("/saved")}>{t("Saved")}</a><a href={local("/requests")}>{t("My requests")}</a><a href={local("/for-hotels")}>{t("For hotels")}</a><LanguageSwitch/></nav></div></header>}
