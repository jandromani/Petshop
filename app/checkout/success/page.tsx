import { merchantOrderBySession } from "@/src/db/merchant";
import { requestLanguage } from "@/src/i18n/server";
import { copy,localizedHref } from "@/src/i18n/config";
export const metadata={title:"Atlas Checkout Status",robots:{index:false,follow:false}};
export default async function CheckoutSuccess({searchParams}:{searchParams:Promise<{session_id?:string}>}){
  const q=await searchParams,l=await requestLanguage();const t=(en:string,es:string)=>copy(l,en,es),local=(p:string)=>localizedHref(p,l);const session=String(q.session_id||"").slice(0,240),order=session?await merchantOrderBySession(session):null;
  return <main className="seoPage"><div className="shell"><section className="seoHero"><div className="eyebrow">ATLAS</div><h1>{order?.status==="PAID"||order?.status==="CONFIRMED"?t("Payment received.","Pago recibido."):t("Checking payment status.","Comprobando el estado del pago.")}</h1><p>{order?order.hotel_name+" · "+order.nights+t(" nights · "," noches · ")+order.city+", "+order.country:t("Your payment status has not been confirmed yet. Refresh this page shortly.","El estado del pago aún no está confirmado. Vuelve a cargar esta página en unos momentos.")}</p></section>
    {order&&<div className="card"><h2>{t("Status:","Estado:")} {order.status}</h2><p>{t("Payment and hotel confirmation are separate stages. Service messages use the email provided at checkout.","El pago y la confirmación del hotel son etapas distintas. Las comunicaciones de la estancia utilizan el email de la reserva.")}</p><p><b>Total:</b> {new Intl.NumberFormat(l,{style:"currency",currency:order.currency,maximumFractionDigits:0}).format(Number(order.customer_total))}</p></div>}
    <div className="actions" style={{marginTop:24}}><a className="btn" href={local("/requests")}>{t("My requests →","Mis solicitudes →")}</a><a className="btn ghost" href={local("/")}>{t("Back to Atlas","Volver a Atlas")}</a></div>
  </div></main>;
}
