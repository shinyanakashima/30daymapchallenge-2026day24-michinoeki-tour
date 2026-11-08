"""Extract roadside-station candidates and municipal boundaries from the
OpenStreetMap Hokkaido extract.

usage: python scripts/osm_extract.py data/osm/hokkaido-latest.osm.pbf
"""
import json
import pathlib
import sys

import osmium
from shapely import wkb
from shapely.geometry import mapping

WORK = pathlib.Path(__file__).resolve().parent.parent / "data" / "work"
KEY = "道の駅"


class Handler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.stations = []
        self.munis = []
        self.wkb = osmium.geom.WKBFactory()

    def _station(self, obj, lat, lon, kind):
        t = dict(obj.tags)
        names = " ".join(t.get(k, "") for k in ("name", "official_name", "alt_name"))
        if KEY in names and t.get("highway") != "bus_stop" and t.get("public_transport") is None:
            self.stations.append({"osm": f"{kind}/{obj.id}", "lat": lat, "lon": lon, "tags": t})

    def node(self, n):
        if n.location.valid():
            self._station(n, n.location.lat, n.location.lon, "node")

    def area(self, a):
        t = dict(a.tags)
        try:
            geom = wkb.loads(self.wkb.create_multipolygon(a), hex=True)
        except Exception:
            return
        if t.get("boundary") == "administrative" and t.get("admin_level") == "7":
            self.munis.append({
                "type": "Feature",
                "properties": {"name": t.get("name"), "name_en": t.get("name:en"),
                               "code": t.get("ref:jisx0402") or t.get("ref")},
                "geometry": mapping(geom),
            })
            return
        kind = "way" if a.from_way() else "relation"
        oid = a.orig_id()
        c = geom.representative_point()
        t_names = " ".join(t.get(k, "") for k in ("name", "official_name", "alt_name"))
        if KEY in t_names:
            self.stations.append({"osm": f"{kind}/{oid}", "lat": c.y, "lon": c.x, "tags": t,
                                  "area": True})


def main(pbf):
    WORK.mkdir(parents=True, exist_ok=True)
    h = Handler()
    h.apply_file(pbf, locations=True)
    (WORK / "osm_michinoeki.json").write_text(json.dumps(h.stations, ensure_ascii=False))
    (WORK / "municipalities.geojson").write_text(json.dumps(
        {"type": "FeatureCollection", "features": h.munis}, ensure_ascii=False))
    reader = osmium.io.Reader(pbf, osmium.osm.osm_entity_bits.NOTHING)
    ts = reader.header().get("osmosis_replication_timestamp") or reader.header().get("timestamp")
    reader.close()
    (WORK / "osm_timestamp.txt").write_text(ts + "\n")
    print(len(h.stations), "station candidates;", len(h.munis), "municipalities")


if __name__ == "__main__":
    main(sys.argv[1])
