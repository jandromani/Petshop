import type { Hotel } from "@/src/data/hotels";

export type Sellability = {
  hotelId: string;
  state: "SELLABLE" | "STALE" | "QUARANTINED";
  confidence: number;
  reasons: string[];
};

export function evaluateSellability(hotel: Hotel): Sellability {
  const reasons: string[] = [];
  if (hotel.monthly <= 0) reasons.push("invalid_price");
  if (!hotel.provider) reasons.push("missing_provider");
  if (!hotel.lat || !hotel.lng) reasons.push("missing_geo");
  if (hotel.verifiedHoursAgo > 12) reasons.push("stale_quote");

  const hardFailure = reasons.some((r) => r !== "stale_quote");
  const state = hardFailure ? "QUARANTINED" : reasons.includes("stale_quote") ? "STALE" : "SELLABLE";
  const confidence = state === "SELLABLE" ? Math.max(0.9, 0.995 - hotel.verifiedHoursAgo * 0.005) : state === "STALE" ? 0.72 : 0.2;

  return { hotelId: hotel.id, state, confidence: Number(confidence.toFixed(3)), reasons };
}
