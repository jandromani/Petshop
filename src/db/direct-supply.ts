import { getDatabase } from "@/src/db/client";
import { addDays } from "@/src/core/search";
import { normalizeLiveCatalogRow, type LiveCatalogOffer } from "@/src/core/live-offers";
import { resolveCanonicalHotel } from "@/src/services/identity";
import { merchantCheckoutStatus } from "@/src/payments/stripe-rest";

export type HotelLeadInput = {
  canonicalHotelId?: string;
  hotelName: string;
  city: string;
  country: string;
  region?: string;
  lat?: number;
  lng?: number;
  website?: string;
  contactName?: string;
  contactRole?: string;
  contactEmail?: string;
  source?: string;
  notes?: Record<string, unknown>;
};

export async function createHotelLead(input: HotelLeadInput) {
  const sql = getDatabase();
  if (!sql) return null;
  const rows = await sql<{ id: string }[]>`
    insert into hotel_leads (
      canonical_hotel_id, hotel_name, city, country, region, lat, lng, website, contact_name,
      contact_role, contact_email, source, notes
    ) values (
      ${input.canonicalHotelId ?? null}::uuid, ${input.hotelName}, ${input.city}, ${input.country}, ${input.region ?? null},
      ${input.lat ?? null}, ${input.lng ?? null}, ${input.website ?? null},
      ${input.contactName ?? null}, ${input.contactRole ?? null},
      ${input.contactEmail ?? null}, ${input.source ?? null},
      ${sql.json((input.notes || {}) as never)}
    )
    returning id::text
  `;
  return rows[0]?.id ?? null;
}

export async function ensureHotelLead(input: HotelLeadInput) {
  const sql=getDatabase();if(!sql)return null;
  const rows=await sql<{id:string}[]>`
    select id::text from hotel_leads
    where lower(hotel_name)=lower(${input.hotelName})
      and lower(city)=lower(${input.city})
      and lower(country)=lower(${input.country})
    order by updated_at desc
    limit 1
  `;
  const existing=rows[0]?.id;
  if(!existing)return createHotelLead(input);
  await sql`
    update hotel_leads set
      canonical_hotel_id=coalesce(${input.canonicalHotelId ?? null}::uuid,canonical_hotel_id),
      region=coalesce(${input.region ?? null},region),
      lat=coalesce(${input.lat ?? null},lat),
      lng=coalesce(${input.lng ?? null},lng),
      website=coalesce(${input.website ?? null},website),
      source=coalesce(${input.source ?? null},source),
      notes=notes || ${sql.json((input.notes || {}) as never)},
      updated_at=now()
    where id=${existing}::uuid
  `;
  return existing;
}
export async function createDirectRate(input: {
  hotelLeadId: string;
  rateCode: string;
  minNights: number;
  maxNights?: number;
  maxGuests?: number;
  board?: string;
  monthlyPrice: number;
  currency: string;
  validFrom?: string;
  validTo?: string;
  cancellation?: string;
}) {
  const sql = getDatabase();
  if (!sql) return null;
  const rows = await sql<{ id: string }[]>`
    insert into direct_rate_offers (
      hotel_lead_id, rate_code, min_nights, max_nights, max_guests, board,
      monthly_price, currency, valid_from, valid_to, cancellation,
      contract_verified, publication_state
    ) values (
      ${input.hotelLeadId}::uuid, ${input.rateCode}, ${input.minNights},
      ${input.maxNights ?? null}, ${input.maxGuests ?? 2}, ${input.board ?? null},
      ${input.monthlyPrice}, ${input.currency}, ${input.validFrom ?? null},
      ${input.validTo ?? null}, ${input.cancellation ?? null}, false, 'DRAFT'
    )
    on conflict (hotel_lead_id, rate_code) do update set
      min_nights = excluded.min_nights,
      max_nights = excluded.max_nights,
      max_guests = excluded.max_guests,
      board = excluded.board,
      monthly_price = excluded.monthly_price,
      currency = excluded.currency,
      valid_from = excluded.valid_from,
      valid_to = excluded.valid_to,
      cancellation = excluded.cancellation,
      booking_url = null,
      contract_reference = null,
      contract_verified = false,
      approved_booking_host = null,
      tracking_query_param = null,
      verified_at = null,
      published_at = null,
      revoked_at = null,
      publication_state = 'DRAFT',
      updated_at = now()
    returning id::text
  `;
  return rows[0]?.id ?? null;
}

function approvedHttpsHost(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("invalid-booking-url");
  }
  if (url.protocol !== "https:") throw new Error("booking-url-must-use-https");
  if (!url.hostname || url.hostname === "localhost") throw new Error("invalid-booking-host");
  return url.hostname.toLowerCase();
}

export async function verifyDirectRate(input: {
  id: string;
  contractReference: string;
  bookingUrl?: string;
  trackingQueryParam?: string;
  reviewNotes?: string;
}) {
  const sql = getDatabase();
  if (!sql) return null;
  const modes=await sql<Array<{channel_model:string}>>`
    select channel_model from direct_rate_offers where id=${input.id}::uuid limit 1
  `;
  const mode=modes[0]?.channel_model;if(!mode)return null;
  const merchant=mode==="MERCHANT"||mode==="EXCLUSIVE_MERCHANT";
  let host:string|null=null;
  if(!merchant){
    if(!input.bookingUrl)throw new Error("missing-booking-url");
    if(!input.trackingQueryParam||!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(input.trackingQueryParam))throw new Error("invalid-tracking-query-param");
    host=approvedHttpsHost(input.bookingUrl);
  }
  const rows = await sql<{ id: string }[]>`
    update direct_rate_offers set
      booking_url = ${merchant?null:(input.bookingUrl??null)},
      contract_reference = ${input.contractReference},
      contract_verified = true,
      approved_booking_host = ${host},
      tracking_query_param = ${merchant?null:(input.trackingQueryParam??null)},
      verified_at = now(),
      publication_state = 'READY_FOR_REVIEW',
      review_notes = ${input.reviewNotes ?? null},
      revoked_at = null,
      updated_at = now()
    where id = ${input.id}::uuid
    returning id::text
  `;
  return rows[0]?.id ?? null;
}

export type DirectPublishRow = {
  id: string;
  hotel_lead_id: string;
  hotel_name: string;
  city: string;
  country: string;
  region: string | null;
  lat: number | null;
  lng: number | null;
  min_nights: number;
  max_nights: number | null;
  max_guests: number;
  monthly_price: number;
  currency: string;
  valid_from: string | null;
  valid_to: string | null;
  cancellation: string | null;
  booking_url: string | null;
  contract_reference: string | null;
  contract_verified: boolean;
  approved_booking_host: string | null;
  tracking_query_param: string | null;
  channel_model: "REFERRAL"|"MERCHANT"|"EXCLUSIVE_MERCHANT";
  hotel_net_monthly: number | null;
  merchant_enabled: boolean;
  merchant_terms_verified: boolean;
  inventory_units: number;
};

async function directRateForReview(id: string): Promise<DirectPublishRow | null> {
  const sql = getDatabase();
  if (!sql) return null;
  const rows = await sql<DirectPublishRow[]>`
    select
      r.id::text,
      r.hotel_lead_id::text,
      l.hotel_name,
      l.city,
      l.country,
      l.region,
      l.lat,
      l.lng,
      r.min_nights,
      r.max_nights,
      r.max_guests,
      r.monthly_price::float,
      r.currency,
      r.valid_from::text,
      r.valid_to::text,
      r.cancellation,
      r.booking_url,
      r.contract_reference,
      r.contract_verified,
      r.approved_booking_host,
      r.tracking_query_param,
      r.channel_model,
      r.hotel_net_monthly::float,
      r.merchant_enabled,
      r.merchant_terms_verified,
      r.inventory_units
    from direct_rate_offers r
    join hotel_leads l on l.id = r.hotel_lead_id
    where r.id = ${id}::uuid
    limit 1
  `;
  return rows[0] ?? null;
}

export function directPublicationChecks(row: DirectPublishRow, now = new Date()) {
  const reasons: string[] = [];
  if (!row.contract_verified) reasons.push("contract_not_verified");
  if (!row.contract_reference) reasons.push("missing_contract_reference");
  const merchant=row.channel_model==="MERCHANT"||row.channel_model==="EXCLUSIVE_MERCHANT";
  if(merchant){
    if(!row.merchant_enabled) reasons.push("merchant_not_enabled");
    if(!row.merchant_terms_verified) reasons.push("merchant_terms_not_verified");
    if(row.hotel_net_monthly===null||row.hotel_net_monthly<=0) reasons.push("missing_hotel_net_monthly");
    if(row.hotel_net_monthly!==null&&row.hotel_net_monthly>row.monthly_price) reasons.push("hotel_net_above_customer_price");
    if(row.inventory_units<1) reasons.push("no_allocated_inventory");
  }else{
    if (!row.booking_url) reasons.push("missing_booking_url");
    if (!row.approved_booking_host) reasons.push("missing_approved_booking_host");
    if (!row.tracking_query_param) reasons.push("missing_tracking_query_param");
  }
  if (!row.valid_from || !row.valid_to) reasons.push("missing_validity_window");
  if (row.valid_from && row.valid_to && row.valid_from > row.valid_to) reasons.push("invalid_validity_window");
  if (row.valid_to && new Date(row.valid_to + "T23:59:59Z").getTime() <= now.getTime()) reasons.push("rate_expired");
  if (row.min_nights < 30) reasons.push("min_nights_below_long_stay");
  if (row.max_nights !== null && row.max_nights < row.min_nights) reasons.push("max_nights_below_min");
  if (row.max_guests < 1 || row.max_guests > 2) reasons.push("unsupported_guest_capacity");
  if (!Number.isFinite(row.monthly_price) || row.monthly_price <= 0) reasons.push("invalid_monthly_price");
  if (!/^[A-Z]{3}$/.test(row.currency)) reasons.push("invalid_currency");
  if (!row.cancellation?.trim()) reasons.push("missing_cancellation_terms");
  return reasons;
}

export async function publishDirectRate(id: string) {
  const sql = getDatabase();
  if (!sql) return { published: false, reasons: ["database-not-configured"] };
  const row = await directRateForReview(id);
  if (!row) return { published: false, reasons: ["rate-not-found"] };
  const reasons = directPublicationChecks(row);
  if (reasons.length) return { published: false, reasons };

  const identity = await resolveCanonicalHotel({
    provider: "direct",
    providerHotelId: row.hotel_lead_id,
    name: row.hotel_name,
    city: row.city,
    country: row.country,
    region: row.region ?? undefined,
    lat: row.lat,
    lng: row.lng,
  });
  if (!identity.id) return { published: false, reasons: ["canonical-hotel-unavailable"] };

  await sql.begin(async tx => {
    await tx`
      update hotel_leads
      set canonical_hotel_id = ${identity.id}::uuid, status = 'CONTRACTED', updated_at = now()
      where id = ${row.hotel_lead_id}::uuid
    `;
    await tx`
      update direct_rate_offers
      set canonical_hotel_id = ${identity.id}::uuid,
          publication_state = 'LIVE',
          published_at = now(),
          revoked_at = null,
          updated_at = now()
      where id = ${row.id}::uuid
    `;
  });

  return { published: true, reasons: [], hotelId: identity.id, slug: identity.slug };
}

export async function revokeDirectRate(id: string) {
  const sql = getDatabase();
  if (!sql) return false;
  const rows = await sql<{ id: string }[]>`
    update direct_rate_offers
    set publication_state = 'REVOKED', revoked_at = now(), updated_at = now()
    where id = ${id}::uuid and publication_state = 'LIVE'
    returning id::text
  `;
  return Boolean(rows[0]);
}

export type DirectCatalogQuery = {
  limit?: number;
  q?: string;
  slug?: string;
  minMonthly?: number;
  maxMonthly?: number;
  checkIn?: string;
  flexibleDays?: number;
  nights?: number;
  occupancy?: number;
  region?: string;
  board?: string;
  cancellation?: string;
  provider?: string;
};

type DirectRow = {
  offer_id: string;
  hotel_id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  region: string | null;
  lat: number | null;
  lng: number | null;
  check_in: string;
  check_out: string;
  nights: number;
  occupancy: number;
  board: string | null;
  cancellation: string | null;
  display_price: number;
  currency: string;
  verified_at: string;
  expires_at: string;
  channel_model: "REFERRAL"|"MERCHANT"|"EXCLUSIVE_MERCHANT";
  merchant_enabled: boolean;
  merchant_terms_verified: boolean;
};

function normalizeDirectRow(row: DirectRow): LiveCatalogOffer {
  return normalizeLiveCatalogRow({
    offerId: row.offer_id,
    offerKind: "direct",
    checkoutMode:(row.channel_model==="MERCHANT"||row.channel_model==="EXCLUSIVE_MERCHANT")&&row.merchant_enabled&&row.merchant_terms_verified?"atlas_checkout":"redirect",
    channelModel:row.channel_model,
    hotelId: row.hotel_id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    country: row.country,
    region: row.region,
    lat: row.lat,
    lng: row.lng,
    provider: "direct",
    checkIn: String(row.check_in).slice(0, 10),
    checkOut: String(row.check_out).slice(0, 10),
    nights: Number(row.nights),
    occupancy: Number(row.occupancy),
    board: row.board,
    roomType: null,
    cancellation: row.cancellation,
    displayPrice: Number(row.display_price),
    currency: row.currency,
    verifiedAt: new Date(row.verified_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    confidence: 0.995,
  });
}

export async function listSellableDirectOffers(input: DirectCatalogQuery = {}): Promise<LiveCatalogOffer[]> {
  const sql = getDatabase();
  if (!sql) return [];
  const merchantConfig=merchantCheckoutStatus();
  const merchantCheckoutActive=merchantConfig.enabled&&merchantConfig.stripeConfigured&&merchantConfig.webhookConfigured;

  const limit = Math.max(1, Math.min(50, input.limit ?? 12));
  const q = input.q?.trim() ? "%" + input.q.trim() + "%" : null;
  const slug = input.slug?.trim() || null;
  const minMonthly = input.minMonthly && input.minMonthly > 0 ? input.minMonthly : null;
  const maxMonthly = input.maxMonthly && input.maxMonthly > 0 ? input.maxMonthly : null;
  const requestedCheckIn = input.checkIn || null;
  const flexibleDays = Math.max(0, Math.min(30, input.flexibleDays ?? 0));
  const requestedNights = input.nights && input.nights > 0 ? input.nights : null;
  const occupancy = input.occupancy && input.occupancy > 0 ? input.occupancy : 1;
  const region = input.region && input.region !== "All" ? input.region : null;
  const board = input.board?.trim() ? "%" + input.board.trim() + "%" : null;
  const cancellation = input.cancellation?.trim() ? "%" + input.cancellation.trim() + "%" : null;
  const provider = input.provider?.trim() || null;

  const rows = await sql<DirectRow[]>`
    with candidates as (
      select
        r.id::text as offer_id,
        h.id::text as hotel_id,
        h.slug,
        h.name,
        h.city,
        h.country,
        h.region,
        h.lat,
        h.lng,
        greatest(coalesce(${requestedCheckIn}::date,current_date), r.valid_from)::text as check_in,
        (
          greatest(coalesce(${requestedCheckIn}::date,current_date), r.valid_from)
          + coalesce(${requestedNights}::int, r.min_nights)
        )::date::text as check_out,
        coalesce(${requestedNights}::int, r.min_nights)::int as nights,
        ${occupancy}::int as occupancy,
        r.board,
        r.cancellation,
        (r.monthly_price::float * coalesce(${requestedNights}::int, r.min_nights)::float / 30.0) as display_price,
        r.currency,
        coalesce(r.verified_at, r.updated_at)::text as verified_at,
        (r.valid_to::date + interval '23 hours 59 minutes 59 seconds')::text as expires_at,
        r.channel_model,
        r.merchant_enabled,
        r.merchant_terms_verified
      from direct_rate_offers r
      join canonical_hotels h on h.id = r.canonical_hotel_id
      where r.publication_state = 'LIVE'
        and r.contract_verified = true
        and (
          (r.channel_model='REFERRAL' and r.booking_url is not null and r.approved_booking_host is not null)
          or
          (${merchantCheckoutActive}::boolean=true and r.channel_model in ('MERCHANT','EXCLUSIVE_MERCHANT') and r.merchant_enabled=true and r.merchant_terms_verified=true and (r.inventory_units-r.reserved_units-r.sold_units)>0)
        )
        and r.valid_from is not null
        and r.valid_to is not null
        and r.valid_to >= current_date
        and r.max_guests >= ${occupancy}
        and (${q}::text is null or h.name ilike ${q} or h.city ilike ${q} or h.country ilike ${q})
        and (${slug}::text is null or h.slug = ${slug})
        and (${region}::text is null or h.region = ${region})
        and (${minMonthly}::float is null or r.monthly_price >= ${minMonthly})
        and (${maxMonthly}::float is null or r.monthly_price <= ${maxMonthly})
        and (${board}::text is null or coalesce(r.board,'') ilike ${board})
        and (${cancellation}::text is null or coalesce(r.cancellation,'') ilike ${cancellation})
        and (${provider}::text is null or ${provider}='direct')
        and (${requestedNights}::int is null or (
          ${requestedNights}::int >= r.min_nights
          and (r.max_nights is null or ${requestedNights}::int <= r.max_nights)
        ))
        and (${requestedCheckIn}::date is null or (
          ${requestedCheckIn}::date between (r.valid_from - ${flexibleDays}::int) and r.valid_to
          and (greatest(${requestedCheckIn}::date,r.valid_from) + coalesce(${requestedNights}::int, r.min_nights)) <= r.valid_to + 1
        ))
    )
    select * from candidates
    order by display_price asc
    limit ${limit}
  `;
  return rows.map(normalizeDirectRow);
}

export async function getSellableDirectOfferForReferral(id: string) {
  const sql = getDatabase();
  if (!sql) return null;
  const rows = await sql<Array<{
    offer_id: string;
    hotel_id: string;
    slug: string;
    name: string;
    city: string;
    country: string;
    region: string | null;
    lat: number | null;
    lng: number | null;
    min_nights: number;
    board: string | null;
    monthly_price: number;
    currency: string;
    valid_from: string;
    valid_to: string;
    verified_at: string;
    booking_url: string;
    approved_booking_host: string;
    tracking_query_param: string;
  }>>`
    select
      r.id::text as offer_id,
      h.id::text as hotel_id,
      h.slug,
      h.name,
      h.city,
      h.country,
      h.region,
      h.lat,
      h.lng,
      r.min_nights,
      r.board,
      r.monthly_price::float,
      r.currency,
      r.valid_from::text,
      r.valid_to::text,
      coalesce(r.verified_at, r.updated_at)::text as verified_at,
      r.booking_url,
      r.approved_booking_host,
      r.tracking_query_param
    from direct_rate_offers r
    join canonical_hotels h on h.id = r.canonical_hotel_id
    where r.id = ${id}::uuid
      and r.publication_state = 'LIVE'
      and r.contract_verified = true
      and r.channel_model='REFERRAL'
      and r.booking_url is not null
      and r.approved_booking_host is not null
      and r.valid_to >= current_date
    limit 1
  `;
  const r = rows[0];
  if (!r) return null;

  const today = new Date().toISOString().slice(0, 10);
  const checkIn = r.valid_from > today ? r.valid_from : today;
  const checkOut = addDays(checkIn, Number(r.min_nights));
  const offer = normalizeLiveCatalogRow({
    offerId: r.offer_id,
    offerKind: "direct",
    hotelId: r.hotel_id,
    slug: r.slug,
    name: r.name,
    city: r.city,
    country: r.country,
    region: r.region,
    lat: r.lat,
    lng: r.lng,
    provider: "direct",
    checkIn,
    checkOut,
    nights: Number(r.min_nights),
    occupancy: 1,
    board: r.board,
    roomType: null,
    displayPrice: Number(r.monthly_price) * Number(r.min_nights) / 30,
    currency: r.currency,
    verifiedAt: new Date(r.verified_at).toISOString(),
    expiresAt: new Date(r.valid_to + "T23:59:59Z").toISOString(),
    confidence: 0.995,
  });
  return { ...offer, deepLink: r.booking_url, approvedHost: r.approved_booking_host, trackingParam:r.tracking_query_param };
}

export async function listHotelDesk() {
  const sql = getDatabase();
  if (!sql) return { configured: false, leads: [], rates: [] };

  const leads = await sql`
    select id::text, hotel_name, city, country, region, contact_name, contact_role,
      contact_email, status, source, updated_at::text
    from hotel_leads
    order by updated_at desc
    limit 50
  `;
  const rates = await sql`
    select r.id::text, r.hotel_lead_id::text, l.hotel_name, r.rate_code,
      r.min_nights, r.max_nights, r.max_guests, r.board, r.monthly_price::float,
      r.currency, r.contract_verified, r.publication_state,
      r.valid_from::text, r.valid_to::text, r.approved_booking_host,
      r.channel_model,r.hotel_net_monthly::float,r.merchant_enabled,r.merchant_terms_verified,
      r.inventory_units,r.reserved_units,r.sold_units,r.updated_at::text
    from direct_rate_offers r
    join hotel_leads l on l.id = r.hotel_lead_id
    order by r.updated_at desc
    limit 50
  `;
  return { configured: true, leads, rates };
}
