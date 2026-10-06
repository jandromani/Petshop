import { notFound } from "next/navigation";
import MerchantCheckoutForm from "@/components/MerchantCheckoutForm";
import { getMerchantCheckoutQuote } from "@/src/db/merchant";
import { merchantCheckoutStatus } from "@/src/payments/stripe-rest";
import { requestLanguage } from "@/src/i18n/server";
import { copy,localizedHref } from "@/src/i18n/config";
export async function generateMetadata(){const l=await requestLanguage();return{title:copy(l,"Atlas Checkout","Reserva con Atlas"),robots:{index:false,follow:false}}}
export default async function CheckoutPage({params,searchParams}:{params:Promise<{offerId:string}>;searchParams:Promise<{checkIn?:string;nights?:string;occupancy?:string}>}){
  const[{offerId},q,language]=await Promise.all([params,searchParams,requestLanguage()]);if(!/^[0-9a-f-]{36}$/i.test(offerId))notFound();
  const checkIn=/^\d{4}-\d{2}-\d{2}$/.test(q.checkIn||"")?String(q.checkIn):"";const nightsRaw=Number(q.nights||0),occupancyRaw=Number(q.occupancy||1);
  if(!checkIn||![30,60,90].includes(nightsRaw)||![1,2].includes(occupancyRaw))notFound();
  const quote=await getMerchantCheckoutQuote({offerId,checkIn,nights:nightsRaw as 30|60|90,occupancy:occupancyRaw as 1|2});if(!quote)notFound();
  const t=(en:string,es:string)=>copy(language,en,es),local=(p:string)=>localizedHref(p,language);
  const checkout=merchantCheckoutStatus(),money=new Intl.NumberFormat(language,{style:"currency",currency:quote.currency,maximumFractionDigits:0});
  return <main className="seoPage merchantCheckoutPage"><div className="shell">
    <a className="backLink" href={local("/live/"+encodeURIComponent(quote.slug))}>{t("← Back to stay","← Volver a la estancia")}</a>
    <section className="seoHero"><div className="eyebrow">{t("BOOK WITH ATLAS","RESERVA CON ATLAS")}</div><h1>{quote.hotelName}<br/>{quote.nights} {t("nights.","noches.")}</h1><p>{quote.city}, {quote.country} · {quote.checkIn} → {quote.checkOut} · {quote.occupancy} {t(quote.occupancy===1?"guest":"guests",quote.occupancy===1?"huésped":"huéspedes")}</p></section>
    <div className="checkoutGrid">
      <div className="card checkoutPrice"><span>{t("TOTAL ACCOMMODATION","TOTAL DEL ALOJAMIENTO")}</span><b>{money.format(quote.customerTotal)}</b><small>{money.format(quote.monthlyPrice)}{t("/30 nights equivalent","/30 noches equivalente")}</small><p>{t("One allocated unit is held while your secure payment session is active.","Se retiene una unidad disponible mientras tu sesión de pago seguro esté activa.")}</p></div>
      <div className="card"><h2>{t("Review, then pay securely.","Revisa tu estancia y paga de forma segura.")}</h2><p>{t("This rate has a verified hotel agreement and allocated inventory. Review the accommodation terms before payment.","Esta tarifa dispone de un acuerdo de hotel verificado e inventario asignado. Revisa las condiciones del alojamiento antes de pagar.")}</p><MerchantCheckoutForm offerId={offerId} checkIn={quote.checkIn} nights={quote.nights} occupancy={quote.occupancy} enabled={checkout.enabled&&checkout.stripeConfigured}/><p className="directoryDisclosure">{t("Stripe processes the payment. Payment received and final hotel confirmation are separate stages.","Stripe procesa el pago. El pago recibido y la confirmación final del hotel son etapas distintas.")}</p></div>
    </div>
  </div></main>;
}
