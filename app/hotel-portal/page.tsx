import { requestLanguage } from "@/src/i18n/server";
import { copy,localizedHref } from "@/src/i18n/config";
import { cookies } from "next/headers";
import { HOTEL_COOKIE,hotelAccess,hotelPortalRates } from "@/src/db/hotel-portal";
import HotelPortalClient from "@/components/HotelPortalClient";

export const metadata={title:"Hotel partner portal | Atlas",robots:{index:false,follow:false},referrer:"no-referrer" as const};
export const dynamic="force-dynamic";

export default async function HotelPortal() {
  const lang=await requestLanguage(),t=(en:string,es:string)=>copy(lang,en,es);
  const token=(await cookies()).get(HOTEL_COOKIE)?.value;
  const access=await hotelAccess(token);const rates=access?await hotelPortalRates(token):[];
  return <main className="seoPage"><div className="shell"><a className="eyebrow" href={localizedHref("/for-hotels",lang)}>{t("← FOR HOTELS","← PARA HOTELES")}</a><h1>{access?access.hotel_name:t("Your hotel. Longer stays.","Tu hotel. Estancias más largas.")}</h1>
    {access&&<p>{access.city}, {access.country}</p>}<HotelPortalClient authorized={Boolean(access)}/>
    {access&&<section className="partnerProposals"><h2>{t("Your rate proposals","Tus propuestas de tarifa")}</h2>{rates.length?rates.map(r=><article className="card" key={String(r.id)}><h3>{r.currency} {Number(r.monthly_price).toLocaleString("en-US")} {t("per 30 nights","por 30 noches")}</h3><p>{r.min_nights}–{r.max_nights} {t("nights","noches")} · {r.max_guests} {t("guests","huéspedes")} · {r.board}</p><p>{r.valid_from} → {r.valid_to}</p><strong>{r.publication_state}</strong></article>):<p>{t("No proposals yet. Start with one rate for your next season.","Todavía no hay propuestas. Empieza con una tarifa para tu próxima temporada.")}</p>}</section>}
  </div></main>;
}
