"""Fetch road geometry for every leg from OSRM and write the files used by the
web page (web/data/*.json), plus data/summary.json.
"""
import csv
import datetime
import json
import math
import os
import pathlib
import urllib.request

import numpy as np
from shapely.geometry import LineString, MultiLineString, shape
from shapely.strtree import STRtree

from places import STARTS

ROOT = pathlib.Path(__file__).resolve().parent.parent
WORK, OUT = ROOT / "data" / "work", ROOT / "web" / "data"
OSRM = os.environ.get("OSRM_URL", "http://localhost:5000")
TOL_M = 25          # simplification tolerance for the drawn line
DAY_S = 8 * 3600    # driving per day


def route(a, b):
    url = (f"{OSRM}/route/v1/driving/{a[0]:.6f},{a[1]:.6f};{b[0]:.6f},{b[1]:.6f}"
           "?overview=full&geometries=geojson&annotations=duration,distance&steps=false")
    with urllib.request.urlopen(url, timeout=120) as r:
        res = json.load(r)
    assert res["code"] == "Ok"
    rt = res["routes"][0]
    coords = rt["geometry"]["coordinates"]
    ann = rt["legs"][0]["annotation"]
    return coords, ann["duration"], ann["distance"], rt["distance"], rt["duration"]


def rdp_keep(xy, tol):
    """Indices kept by Ramer-Douglas-Peucker."""
    n = len(xy)
    keep = np.zeros(n, bool)
    keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        p, q = xy[i], xy[j]
        seg = xy[i + 1:j]
        d = q - p
        L = np.hypot(*d)
        if L == 0:
            dist = np.hypot(*(seg - p).T)
        else:
            dist = np.abs(d[0] * (seg[:, 1] - p[1]) - d[1] * (seg[:, 0] - p[0])) / L
        k = int(np.argmax(dist))
        if dist[k] > tol:
            m = i + 1 + k
            keep[m] = True
            stack += [(i, m), (m, j)]
    return np.nonzero(keep)[0]


def leg(a, b):
    coords, dur, dist, total_d, total_t = route(a, b)
    c = np.array(coords)
    lat0 = math.radians(c[:, 1].mean())
    xy = np.c_[c[:, 0] * 111320 * math.cos(lat0), c[:, 1] * 110540]
    keep = rdp_keep(xy, TOL_M) if len(c) > 2 else np.arange(len(c))
    cum_t = np.r_[0, np.cumsum(dur)]
    return {
        "d": round(total_d), "t": round(total_t),
        "c": [[round(c[k, 0], 5), round(c[k, 1], 5)] for k in keep],
        "ct": [int(round(cum_t[k])) for k in keep],
        "full": coords,
    }


def main():
    stations = list(csv.DictReader(open(ROOT / "data" / "stations.csv", encoding="utf-8")))
    tour = json.loads((WORK / "tour.json").read_text())
    order = tour["order"]
    n = len(order)
    pt = lambda i: (float(stations[i]["lon"]), float(stations[i]["lat"]))

    loop = [leg(pt(order[k]), pt(order[(k + 1) % n])) for k in range(n)]
    starts = []
    for s in STARTS:
        pos = tour["starts"][s["id"]]["after_pos"]
        a, b = order[pos], order[(pos + 1) % n]
        sp = (s["lon"], s["lat"])
        starts.append({**s, "after_pos": pos, "in": leg(pt(a), sp), "out": leg(sp, pt(b))})

    # Municipalities crossed, per start point.
    munis = json.loads((WORK / "municipalities.geojson").read_text())["features"]
    geoms = [shape(f["geometry"]) for f in munis]
    tree = STRtree(geoms)

    def muni_count(legs):
        line = MultiLineString([LineString(l["full"]) for l in legs])
        hits = tree.query(line, predicate="intersects")
        return sorted({munis[i]["properties"]["name"] for i in hits})

    for s in starts:
        legs = [s["out"]] + [loop[(s["after_pos"] + 1 + k) % n] for k in range(n - 1)] + [s["in"]]
        s["distance_m"] = sum(l["d"] for l in legs)
        s["duration_s"] = sum(l["t"] for l in legs)
        s["days"] = math.ceil(s["duration_s"] / DAY_S)
        s["municipalities"] = muni_count(legs)

    station_munis = sorted({st["municipality_ja"] for st in stations})
    strip = lambda l: {k: v for k, v in l.items() if k != "full"}
    OUT.mkdir(parents=True, exist_ok=True)
    retrieved = json.loads((ROOT / "data" / "raw" / "retrieved.json").read_text())
    osm_ts = (WORK / "osm_timestamp.txt").read_text().strip() if (WORK / "osm_timestamp.txt").exists() else None
    web = {
        "stations": [{"name_ja": s["name_ja"], "name_en": s["name_en"], "muni_ja": s["municipality_ja"],
                      "lon": float(s["lon"]), "lat": float(s["lat"])} for s in stations],
        "order": order,
        "loop": [strip(l) for l in loop],
        "starts": [{k: (strip(v) if k in ("in", "out") else v) for k, v in s.items() if k != "municipalities"}
                   | {"n_municipalities": len(s["municipalities"])} for s in starts],
        "loop_distance_m": sum(l["d"] for l in loop),
        "loop_duration_s": sum(l["t"] for l in loop),
        "day_s": DAY_S,
        "list_date": retrieved["ichiran.html"]["retrieved"],
        "osm_date": osm_ts,
        "solver": {
            "limit": tour["solver"]["time_limit_per_run_s"],
            "ortools_runs": sum(1 for r in tour["solver"]["runs"] if not r["strategy"].startswith("LKH")),
            "lkh_runs": tour["solver"].get("lkh_runs", 0),
            "best": "LKH-3" if tour["solver"].get("best", "").startswith("LKH") else "OR-Tools",
        },
    }
    (OUT / "tour.json").write_text(json.dumps(web, ensure_ascii=False, separators=(",", ":")))
    summary = {
        "stations": len(stations),
        "list_retrieved": retrieved,
        "osm_data_timestamp": osm_ts,
        "loop_distance_km": round(web["loop_distance_m"] / 1000, 1),
        "loop_duration_h": round(web["loop_duration_s"] / 3600, 2),
        "municipalities_with_station": len(station_munis),
        "by_start": {s["id"]: {"distance_km": round(s["distance_m"] / 1000, 1),
                               "duration_h": round(s["duration_s"] / 3600, 2),
                               "days_at_8h": s["days"],
                               "municipalities_passed": len(s["municipalities"])} for s in starts},
        "solver": tour["solver"],
        "built": datetime.date.today().isoformat(),
    }
    (ROOT / "data" / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    print(json.dumps(summary["by_start"], indent=1))
    print("tour.json", round((OUT / "tour.json").stat().st_size / 1e6, 2), "MB")


if __name__ == "__main__":
    main()
