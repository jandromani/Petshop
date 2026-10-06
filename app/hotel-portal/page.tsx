import { cookies } from "next/headers";
import { HOTEL_COOKIE,hotelAccess,hotelPortalRates } from "@/src/db/hotel-portal";
import HotelPortalClient from "@/components/HotelPortalClient";

export const metadata={title:"Hotel partner portal | Atlas",robots:{index:false,follow:false},referrer:"no-referrer" as const};
export const dynamic="force-dynamic";

export default async function HotelPortal() {
  const token=(await cookies()).get(HOTEL_COOKIE)?.value;
  const access=await hotelAccess(token);const rates=access?await hotelPortalRates(token):[];
  return <main className="seoPage"><div className="shell"><a className="eyebrow" href="/for-hotels">← FOR HOTELS</a><h1>{access?access.hotel_name:"Your hotel. Longer stays."}</h1>
    {access&&<p>{access.city}, {access.country}</p>}<HotelPortalClient authorized={Boolean(access)}/>
    {access&&<section className="partnerProposals"><h2>Your rate proposals</h2>{rates.length?rates.map(r=><article className="card" key={String(r.id)}><h3>{r.currency} {Number(r.monthly_price).toLocaleString("en-US")} per 30 nights</h3><p>{r.min_nights}–{r.max_nights} nights · {r.max_guests} guests · {r.board}</p><p>{r.valid_from} → {r.valid_to}</p><strong>{r.publication_state}</strong></article>):<p>No proposals yet. Start with one rate for your next season.</p>}</section>}
  </div></main>;
}
