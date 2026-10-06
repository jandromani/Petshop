"use client";
import { useCopy } from "@/components/useCopy";
export default function SilverPromise(){
  const {t,local,language}=useCopy();
  return <section className="silverPromise"><div className="shell promiseGrid">
    <div><div className="eyebrow">{t("THE MIDDLE GROUND")}</div><h2>{t("Not a weekend.")}<br/>{t("Not a twelve-month lease.")}</h2><p>{t("Atlas focuses on the neglected interval between hotel nights and residential renting: one hotel, one monthly budget, 30–90 days.")}</p></div>
    <div className="promiseCards">
      <div><b>{t("Stay longer")}</b><span>{t("30, 60 or 90 days")}</span></div>
      <div><b>{t("Price honestly")}</b><span>{t("verified monthly equivalent or no price")}</span></div>
      <div><b>{t("Source privately")}</b><span>{t("request a rate when public supply is absent")}</span></div>
      <div><b>{t("Repeat later")}</b><span>{t("one season at a time")}</span></div>
    </div>
  </div></section>;
}
