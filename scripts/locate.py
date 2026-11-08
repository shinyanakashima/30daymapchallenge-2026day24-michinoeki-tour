"""Build data/stations.csv: the official station list with a location for each.

Location priority
1. An OpenStreetMap feature whose name contains 道の駅 and the station name,
   within 3 km of the location given by the liaison council (rest_area/services
   and mapped areas are preferred over other point features).
2. Any OSM feature named 道の駅 within 500 m of the council location.
3. GSI address search (国土地理院 地名・住所検索) on the official address.
"""
import csv
import html
import json
import math
import pathlib
import re
import time
import unicodedata
import urllib.parse
import urllib.request

import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW, WORK = ROOT / "data" / "raw", ROOT / "data" / "work"


def norm(s):
    s = unicodedata.normalize("NFKC", s or "")
    s = re.sub(r"[\s・･♡☆★〜~\-‐ー()（）!！'’]", "", s)
    return s.replace("道の駅", "").lower()


def dist_m(a, b):
    lat1, lon1, lat2, lon2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371000 * 2 * math.asin(math.sqrt(h))


def parse_council():
    s = (RAW / "ichiran.html").read_text(encoding="utf-8")
    rows = []
    for r in re.findall(r"<tr[^>]*>(.*?)</tr>", s, re.S)[1:]:
        cells = [re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", c))).strip()
                 for c in re.findall(r"<td[^>]*>(.*?)</td>", r, re.S)]
        if "取消" in cells[1]:
            continue
        addr = re.sub(r"^〒?\s*\d{3}-\d{4}\s*", "", cells[4])
        muni = re.sub(r"\s*（.*?）", "", cells[2])
        rows.append({"council_no": int(cells[0]), "name_ja": cells[1].replace(" ", "　").replace("　", " "),
                     "municipality_ja": muni, "address_ja": "北海道" + addr})
    en = re.findall(r'\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\]',
                    (RAW / "en.html").read_text(encoding="utf-8"))
    assert len(en) == len(rows), (len(en), len(rows))
    # The English page lists the same stations in a different order: pair each
    # English entry with a Japanese row by distance to the geocoded address.
    cost = []
    for row in rows:
        row["address_point"] = gsi_geocode(row["address_ja"])
        cost.append([dist_m(row["address_point"], (float(a), float(b))) for a, b, _, _ in en])
    from scipy.optimize import linear_sum_assignment
    ri, ci = linear_sum_assignment(cost)
    for i, j in zip(ri, ci):
        lat, lon, name_en, _ = en[j]
        rows[i]["name_en"] = name_en.replace("・", " ").replace("  ", " ").strip()
        rows[i]["council_lat"], rows[i]["council_lon"] = float(lat), float(lon)
        rows[i]["pair_m"] = cost[i][j]
    return rows


def check_mlit(rows):
    x = pd.read_excel(RAW / "mlit_list.xlsx")
    h = x[x["県名"] == "北海道"]
    assert len(h) == len(rows), (len(h), len(rows))
    return len(h)


_cache_path = WORK / "gsi_cache.json"
_cache = json.loads(_cache_path.read_text()) if _cache_path.exists() else {}


def gsi_geocode(q):
    if q in _cache:
        return tuple(_cache[q])
    url = "https://msearch.gsi.go.jp/address-search/AddressSearch?q=" + urllib.parse.quote(q)
    with urllib.request.urlopen(url, timeout=30) as r:
        res = json.load(r)
    time.sleep(1)
    if not res:
        return None
    lon, lat = res[0]["geometry"]["coordinates"]
    _cache[q] = (lat, lon)
    _cache_path.write_text(json.dumps(_cache, ensure_ascii=False))
    return lat, lon


def main():
    rows = parse_council()
    n_mlit = check_mlit(rows)
    cands = json.loads((WORK / "osm_michinoeki.json").read_text())
    for c in cands:
        t = c["tags"]
        c["n"] = norm(" ".join(t.get(k, "") for k in ("name", "official_name", "alt_name")))
        c["rank"] = (0 if t.get("highway") in ("rest_area", "services") else
                     1 if c.get("area") else 2)
    out = []
    for row in rows:
        key = norm(row["name_ja"])
        ref = (row["council_lat"], row["council_lon"])
        named = [c for c in cands if key and key in c["n"] and dist_m(ref, (c["lat"], c["lon"])) < 3000]
        near = [c for c in cands if dist_m(ref, (c["lat"], c["lon"])) < 500]
        pick, method = None, None
        if named:
            pick = min(named, key=lambda c: (c["rank"], dist_m(ref, (c["lat"], c["lon"]))))
            method = "osm"
        elif near:
            pick = min(near, key=lambda c: (c["rank"], dist_m(ref, (c["lat"], c["lon"]))))
            method = "osm_nearby"
        if pick:
            lat, lon, src = pick["lat"], pick["lon"], pick["osm"]
        else:
            g = row["address_point"]
            lat, lon, src, method = g[0], g[1], "gsi", "gsi_address"
        row.pop("address_point")
        if row.pop("pair_m") > 15000:
            print("check pairing:", row["name_ja"], row["name_en"])
        row.update(lat=round(lat, 6), lon=round(lon, 6), location_source=src, location_method=method,
                   offset_from_council_m=round(dist_m(ref, (lat, lon))))
        out.append(row)
    with open(ROOT / "data" / "stations.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0].keys()))
        w.writeheader()
        w.writerows(out)
    from collections import Counter
    print(n_mlit, "stations;", Counter(r["location_method"] for r in out))
    for r in sorted(out, key=lambda r: -r["offset_from_council_m"])[:8]:
        print(r["name_ja"], r["location_method"], r["offset_from_council_m"])


if __name__ == "__main__":
    main()
