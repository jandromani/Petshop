import { hotelBySlug } from "@/src/data/hotels";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("hotel") || "";
  const requestedProvider = url.searchParams.get("provider") || "booking";
  const hotel = hotelBySlug(slug);
  if (!hotel) return Response.json({ error: "Unknown hotel" }, { status: 404 });

  const clickId = crypto.randomUUID();
  const provider = ["booking","ratehawk","hbx"].includes(requestedProvider) ? requestedProvider : hotel.provider;

  console.log(JSON.stringify({
    level:"info",
    event:"referral_click",
    clickId,
    hotelId:hotel.id,
    hotelSlug:hotel.slug,
    provider,
    prototypePrice:hotel.monthly,
    ts:new Date().toISOString()
  }));

  // Until commercial credentials are attached, send to a generic public hotel search.
  // This endpoint already gives us one place to insert affiliate IDs/subIDs later.
  const target = new URL("https://www.booking.com/searchresults.html");
  target.searchParams.set("ss", hotel.city + ", " + hotel.country);
  target.searchParams.set("label", "atlas-prototype-" + clickId.slice(0,8));

  return Response.redirect(target, 302);
}
