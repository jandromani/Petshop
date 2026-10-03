import { cookies } from "next/headers";
import { hotelBySlug } from "@/src/data/hotels";
import { createReferralClick, referralLog } from "@/src/services/referral";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("hotel") || "";
  const requestedProvider = url.searchParams.get("provider") || "booking";
  const hotel = hotelBySlug(slug);
  if (!hotel) return Response.json({ error: "Unknown hotel" }, { status: 404 });

  const jar = await cookies();
  const provider = ["booking","ratehawk","hbx"].includes(requestedProvider)
    ? requestedProvider
    : hotel.provider;

  const click = createReferralClick({
    visitorId: jar.get("rv_vid")?.value,
    sessionId: jar.get("rv_sid")?.value,
    hotelSlug: hotel.slug,
    provider,
    source: jar.get("rv_src")?.value || jar.get("rv_ref")?.value || "direct",
    campaign: jar.get("rv_campaign")?.value,
    pagePath: url.searchParams.get("from") || undefined,
    position: Number(url.searchParams.get("pos")) || undefined,
  });

  console.log(referralLog(click));

  // Bootstrap fallback. Production provider adapters will replace this
  // with attributed partner deep links and subID=click.clickId.
  const target = new URL("https://www.booking.com/searchresults.html");
  target.searchParams.set("ss", hotel.city + ", " + hotel.country);
  target.searchParams.set("label", "atlas-" + click.clickId.slice(0, 12));

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      "Cache-Control": "no-store",
      "X-Referral-Click": click.clickId,
    },
  });
}
