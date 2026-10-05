import { notFound } from "next/navigation";
import type { Metadata } from "next";
import MerchantCheckoutForm from "@/components/MerchantCheckoutForm";
import { getMerchantCheckoutQuote } from "@/src/db/merchant";
import { merchantCheckoutStatus } from "@/src/payments/stripe-rest";

export const metadata:Metadata={title:"Atlas Checkout",robots:{index:false,follow:false}};

export default async function CheckoutPage({params,searchParams}:{params:Promise<{offerId:string}>;searchParams:Promise<{checkIn?:string;nights?:string;occupancy?:string}>}){
  const[{offerId},q]=await Promise.all([params,searchParams]);if(!/^[0-9a-f-]{36}$/i.test(offerId))notFound();
  const checkIn=/^\d{4}-\d{2}-\d{2}$/.test(q.checkIn||"")?String(q.checkIn):"";const nightsRaw=Number(q.nights||0);const occupancyRaw=Number(q.occupancy||1);
  if(!checkIn||![30,60,90].includes(nightsRaw)||![1,2].includes(occupancyRaw))notFound();
  const quote=await getMerchantCheckoutQuote({offerId,checkIn,nights:nightsRaw as 30|60|90,occupancy:occupancyRaw as 1|2});if(!quote)notFound();
  const checkout=merchantCheckoutStatus();const money=new Intl.NumberFormat("en-US",{style:"currency",currency:quote.currency,maximumFractionDigits:0});
  return <main className="seoPage merchantCheckoutPage"><div className="shell">
    <a className="backLink" href={"/live/"+encodeURIComponent(quote.slug)}>← Back to stay</a>
    <section className="seoHero"><div className="eyebrow">ATLAS CHECKOUT · MANAGED SUPPLY</div><h1>{quote.hotelName}<br/>{quote.nights} nights.</h1><p>{quote.city}, {quote.country} · {quote.checkIn} → {quote.checkOut} · {quote.occupancy} guest{quote.occupancy===1?"":"s"}</p></section>
    <div className="checkoutGrid">
      <div className="card checkoutPrice"><span>TOTAL ACCOMMODATION</span><b>{money.format(quote.customerTotal)}</b><small>{money.format(quote.monthlyPrice)}/month equivalent</small><p>This offer is configured as managed Atlas supply. Atlas holds one allocated unit while the secure checkout session is active.</p></div>
      <div className="card"><h2>Book without the leakage loop.</h2><p>This path stays inside Atlas until payment. It appears only for direct rates whose contract, merchant terms, rate validity and allocated inventory have passed the publication gates.</p><MerchantCheckoutForm offerId={offerId} checkIn={quote.checkIn} nights={quote.nights} occupancy={quote.occupancy} enabled={checkout.enabled&&checkout.stripeConfigured}/><p className="directoryDisclosure">Payment processing is provided by Stripe. A paid order is recorded separately from final hotel service delivery and remains subject to the displayed accommodation terms.</p></div>
    </div>
  </div></main>;
}
