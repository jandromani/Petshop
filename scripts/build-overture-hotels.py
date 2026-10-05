#!/usr/bin/env python3
import json, math, pathlib, re, unicodedata
import duckdb

RELEASE="2026-09-23.1"
OUTPUT=pathlib.Path("src/data/overture-hotels.generated.json")
TARGET=5000
PER_BOX=260

# High-value long-stay destinations. Boxes intentionally overlap a little;
# GERS ids are deduplicated after download.
BOXES=[
 ("Madrid","Spain","Europe",(-3.95,40.20,-3.45,40.65)),
 ("Tenerife","Spain","Europe",(-16.95,28.00,-16.10,28.65)),
 ("Gran Canaria","Spain","Europe",(-15.90,27.70,-15.30,28.25)),
 ("Málaga","Spain","Europe",(-4.70,36.55,-4.20,36.90)),
 ("Benidorm","Spain","Europe",(-0.30,38.45,-0.05,38.65)),
 ("Palma","Spain","Europe",(2.45,39.45,2.85,39.75)),
 ("Lisbon","Portugal","Europe",(-9.35,38.60,-8.95,38.85)),
 ("Algarve","Portugal","Europe",(-9.05,36.90,-7.35,37.35)),
 ("Funchal","Portugal","Europe",(-17.20,32.55,-16.70,32.90)),
 ("Malta","Malta","Europe",(14.10,35.75,14.65,36.15)),
 ("Paphos","Cyprus","Europe",(32.20,34.65,32.65,35.05)),
 ("Heraklion","Greece","Europe",(24.70,34.90,25.45,35.45)),
 ("Rhodes","Greece","Europe",(27.65,35.85,28.25,36.50)),
 ("Sicily","Italy","Europe",(12.35,36.60,15.70,38.35)),
 ("Sardinia","Italy","Europe",(8.00,38.80,9.85,41.35)),
 ("Croatian coast","Croatia","Europe",(13.40,42.35,18.70,45.65)),
 ("Antalya","Türkiye","Europe",(29.90,36.70,31.30,37.25)),
 ("Agadir","Morocco","Africa",(-9.85,30.25,-9.30,30.65)),
 ("Marrakech","Morocco","Africa",(-8.25,31.45,-7.75,31.85)),
 ("Hammamet","Tunisia","Africa",(10.45,36.25,10.85,36.65)),
 ("Hurghada","Egypt","Africa",(33.55,27.00,34.00,27.50)),
 ("Sharm el-Sheikh","Egypt","Africa",(34.15,27.75,34.55,28.10)),
 ("Chiang Mai","Thailand","Asia",(98.75,18.60,99.20,19.05)),
 ("Hua Hin","Thailand","Asia",(99.80,12.35,100.10,12.75)),
 ("Phuket","Thailand","Asia",(98.20,7.70,98.55,8.25)),
 ("Koh Samui","Thailand","Asia",(99.85,9.35,100.15,9.65)),
 ("Bangkok","Thailand","Asia",(100.30,13.55,100.90,14.05)),
 ("Da Nang","Vietnam","Asia",(107.95,15.90,108.45,16.25)),
 ("Nha Trang","Vietnam","Asia",(109.05,12.10,109.35,12.40)),
 ("Ho Chi Minh City","Vietnam","Asia",(106.45,10.60,106.95,11.00)),
 ("Bali","Indonesia","Asia",(114.35,-8.90,115.75,-8.00)),
 ("George Town","Malaysia","Asia",(100.15,5.25,100.55,5.55)),
 ("Kuala Lumpur","Malaysia","Asia",(101.45,2.95,101.95,3.40)),
 ("Cebu","Philippines","Asia",(123.70,10.15,124.10,10.65)),
 ("Boracay","Philippines","Asia",(121.85,11.90,122.05,12.05)),
 ("Playa del Carmen","Mexico","Americas",(-87.25,20.45,-86.70,20.85)),
 ("Cancún","Mexico","Americas",(-87.15,20.75,-86.70,21.25)),
 ("Mérida","Mexico","Americas",(-89.90,20.80,-89.35,21.20)),
 ("Puerto Vallarta","Mexico","Americas",(-105.45,20.45,-104.95,20.90)),
 ("Cartagena","Colombia","Americas",(-75.70,10.25,-75.35,10.60)),
 ("Medellín","Colombia","Americas",(-75.80,6.05,-75.35,6.45)),
 ("Lima","Peru","Americas",(-77.30,-12.30,-76.75,-11.75)),
 ("Cusco","Peru","Americas",(-72.10,-13.70,-71.80,-13.35)),
 ("Buenos Aires","Argentina","Americas",(-58.70,-34.85,-58.20,-34.35)),
 ("Mendoza","Argentina","Americas",(-69.05,-33.10,-68.60,-32.70)),
]

COUNTRY_NAMES={
 "ES":"Spain","PT":"Portugal","MT":"Malta","CY":"Cyprus","GR":"Greece","IT":"Italy","HR":"Croatia","TR":"Türkiye",
 "MA":"Morocco","TN":"Tunisia","EG":"Egypt","TH":"Thailand","VN":"Vietnam","ID":"Indonesia","MY":"Malaysia",
 "PH":"Philippines","MX":"Mexico","CO":"Colombia","PE":"Peru","AR":"Argentina"
}

con=duckdb.connect()
con.execute("INSTALL spatial; LOAD spatial; INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
path=f"s3://overturemaps-us-west-2/release/{RELEASE}/theme=places/type=place/*"
records={}

for fallback_city,fallback_country,region,(xmin,ymin,xmax,ymax) in BOXES:
    expected_code=next((code for code,country in COUNTRY_NAMES.items() if country==fallback_country),None)
    if not expected_code:
        raise RuntimeError(f"missing country code for {fallback_country}")
    query=f"""
      SELECT
        id,
        names.primary AS name,
        confidence,
        operating_status,
        websites[1] AS website,
        brand.names.primary AS brand,
        taxonomy.primary AS category,
        taxonomy.hierarchy AS taxonomy,
        addresses[1].freeform AS address,
        addresses[1].locality AS locality,
        addresses[1].country AS country_code,
        ST_X(geometry) AS lng,
        ST_Y(geometry) AS lat
      FROM read_parquet('{path}', hive_partitioning=1)
      WHERE basic_category='hotel'
        AND names.primary IS NOT NULL
        AND confidence >= 0.70
        AND (operating_status IS NULL OR operating_status='open')
        AND addresses[1].country = '{expected_code}'
        AND bbox.xmin BETWEEN {xmin} AND {xmax}
        AND bbox.ymin BETWEEN {ymin} AND {ymax}
      ORDER BY confidence DESC NULLS LAST
      LIMIT {PER_BOX}
    """
    try:
        rows=con.execute(query).fetchall()
    except Exception as exc:
        print(f"box failed {fallback_city}: {exc}")
        continue

    for oid,name,confidence,status,website,brand,category,taxonomy,address,locality,country_code,lng,lat in rows:
        if not name or not math.isfinite(float(lat)) or not math.isfinite(float(lng)):
            continue
        country=COUNTRY_NAMES.get(country_code or "")
        if country!=fallback_country:
            continue
        city=(locality or fallback_city).strip()
        sid=str(oid)
        web=str(website).strip() if website else None
        if web and not web.lower().startswith("https://"):
            web=None
        ref="https://www.google.com/maps/search/?api=1&query="+__import__("urllib.parse").parse.quote(f"{name} {city} {country}")
        records[sid]={
          "id":"overture-"+sid,
          "sourceId":sid,
          "name":str(name).strip(),
          "city":city,
          "market":fallback_city,
          "country":country,
          "region":region,
          "lat":round(float(lat),6),
          "lng":round(float(lng),6),
          "address":str(address).strip() if address else None,
          "website":web,
          "brand":str(brand).strip() if brand else None,
          "category":str(category).strip() if category else "hotel",
          "taxonomy":[str(x) for x in (taxonomy or [])],
          "referenceUrl":ref,
          "confidence":round(float(confidence),4) if confidence is not None else None,
        }

def norm_name(value):
    value=unicodedata.normalize("NFD",value).encode("ascii","ignore").decode().lower()
    tokens=[x for x in re.sub(r"[^a-z0-9]+"," ",value).split() if x not in {"hotel","resort","spa","the"}]
    return " ".join(tokens)

ranked=sorted(records.values(), key=lambda h:(-(h["confidence"] or 0),h["country"],h["city"],h["name"]))
dedup={}
for h in ranked:
    # Overture has stable GERS ids, but near-identical upstream records can still exist.
    # Collapse only exact normalized names in the same ~100 m coordinate bucket.
    k=(norm_name(h["name"]),h["country"],round(h["lat"],3),round(h["lng"],3))
    dedup.setdefault(k,h)
hotels=list(dedup.values())[:TARGET]
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
OUTPUT.write_text(json.dumps(hotels,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
print(f"wrote {len(hotels)} real Overture hotel identities to {OUTPUT}")
if len(hotels)<2000:
    raise SystemExit(f"snapshot too small: {len(hotels)} < 2000")
