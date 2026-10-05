import type { Metadata } from "next";
import { merchantOrderBySession } from "@/src/db/merchant";

export const metadata:Metadata={title:"Atlas Checkout Status",robots:{index:false,follow:false}};

export default async function CheckoutSuccess({searchParams}:{searchParams:Promise<{session_id?:string}>}){
  const q=await searchParams;const session=String(q.session_id||"").slice(0,240);const order=session?await merchantOrderBySession(session):null;
  return <main className="seoPage"><div className="shell"><section className="seoHero"><div className="eyebrow">ATLAS CHECKOUT</div><h1>{order?.status==="PAID"||order?.status==="CONFIRMED"?"Payment received.":"Checking payment status."}</h1><p>{order?order.hotel_name+" · "+order.nights+" nights · "+order.city+", "+order.country:"The payment callback has not produced a readable Atlas order yet."}</p></section>
    {order&&<div className="card"><h2>Status: {order.status}</h2><p>Atlas keeps payment state separate from hotel-service confirmation. You will receive the applicable service communication through the email used at checkout.</p><p><b>Total:</b> {new Intl.NumberFormat("en-US",{style:"currency",currency:order.currency,maximumFractionDigits:0}).format(Number(order.customer_total))}</p></div>}
    <div className="actions" style={{marginTop:24}}><a className="btn" href="/saved">Open saved stays →</a><a className="btn ghost" href="/">Back to Atlas</a></div>
  </div></main>;
}
