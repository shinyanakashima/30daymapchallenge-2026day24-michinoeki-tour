"""Download the official lists of Hokkaido roadside stations.

Sources
- Hokkaido Michi-no-Eki liaison council (北海道地区「道の駅」連絡会):
  https://hokkaido-michinoeki.jp/ichiran/  (names, municipality, address)
  https://hokkaido-michinoeki.jp/en/       (official English names)
- MLIT nationwide list: https://www.mlit.go.jp/road/Michi-no-Eki/file/list.xlsx
"""
import datetime
import json
import pathlib
import urllib.request

RAW = pathlib.Path(__file__).resolve().parent.parent / "data" / "raw"
SOURCES = {
    "ichiran.html": "https://hokkaido-michinoeki.jp/ichiran/",
    "en.html": "https://hokkaido-michinoeki.jp/en/",
    "mlit_list.xlsx": "https://www.mlit.go.jp/road/Michi-no-Eki/file/list.xlsx",
}


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    log = {}
    for name, url in SOURCES.items():
        req = urllib.request.Request(url, headers={"User-Agent": "michinoeki-tour/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            (RAW / name).write_bytes(r.read())
        log[name] = {"url": url, "retrieved": datetime.date.today().isoformat()}
        print("saved", name)
    (RAW / "retrieved.json").write_text(json.dumps(log, indent=2))


if __name__ == "__main__":
    main()
