"""Road distance / travel time matrix from a local OSRM server (car profile).

Points: 128 stations followed by the start points in places.py.
OSRM_URL defaults to http://localhost:5000
"""
import csv
import json
import os
import pathlib
import urllib.request

from places import STARTS

ROOT = pathlib.Path(__file__).resolve().parent.parent
OSRM = os.environ.get("OSRM_URL", "http://localhost:5000")


def points():
    st = list(csv.DictReader(open(ROOT / "data" / "stations.csv", encoding="utf-8")))
    return [(float(s["lon"]), float(s["lat"])) for s in st] + [(p["lon"], p["lat"]) for p in STARTS]


def main():
    pts = points()
    coords = ";".join(f"{lon:.6f},{lat:.6f}" for lon, lat in pts)
    url = f"{OSRM}/table/v1/driving/{coords}?annotations=duration,distance"
    with urllib.request.urlopen(url, timeout=600) as r:
        res = json.load(r)
    assert res["code"] == "Ok", res.get("message")
    snaps = [round(w["distance"], 1) for w in res["sources"]]
    for i, d in enumerate(snaps):
        if d > 300:
            print("far snap", i, d)
    missing = sum(v is None for row in res["durations"] for v in row)
    assert missing == 0, f"{missing} unreachable pairs"
    out = {"n_stations": len(pts) - len(STARTS), "starts": [p["id"] for p in STARTS],
           "durations": res["durations"], "distances": res["distances"], "snap_m": snaps}
    (ROOT / "data" / "work").mkdir(parents=True, exist_ok=True)
    (ROOT / "data" / "work" / "matrix.json").write_text(json.dumps(out))
    print("matrix", len(pts), "x", len(pts), "max snap", max(snaps), "m")


if __name__ == "__main__":
    main()
