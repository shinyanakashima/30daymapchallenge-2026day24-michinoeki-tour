#!/usr/bin/env bash
# Rebuild everything from scratch. Requires Docker, Python 3.11+ and Node.js with Playwright.
set -euo pipefail
cd "$(dirname "$0")"
OSRM_IMAGE=ghcr.io/project-osrm/osrm-backend:v5.27.1
PBF_URL=${PBF_URL:-https://download.openstreetmap.fr/extracts/asia/japan/hokkaido-latest.osm.pbf}

mkdir -p data/osm
[ -f data/osm/hokkaido-latest.osm.pbf ] || curl -L -o data/osm/hokkaido-latest.osm.pbf "$PBF_URL"

# OSRM (car profile, MLD)
if [ ! -f data/osm/hokkaido-latest.osrm.partition ]; then
  docker run --rm -v "$PWD/data/osm:/data" $OSRM_IMAGE osrm-extract -p /opt/car.lua /data/hokkaido-latest.osm.pbf
  docker run --rm -v "$PWD/data/osm:/data" $OSRM_IMAGE osrm-partition /data/hokkaido-latest.osrm
  docker run --rm -v "$PWD/data/osm:/data" $OSRM_IMAGE osrm-customize /data/hokkaido-latest.osrm
fi
docker rm -f michinoeki-osrm >/dev/null 2>&1 || true
docker run -d --name michinoeki-osrm -p 5000:5000 -v "$PWD/data/osm:/data" $OSRM_IMAGE \
  osrm-routed --algorithm mld --max-table-size 1000 /data/hokkaido-latest.osrm
sleep 5

python3 scripts/fetch_lists.py
python3 scripts/osm_extract.py data/osm/hokkaido-latest.osm.pbf
python3 scripts/locate.py
python3 scripts/matrix.py
python3 scripts/solve.py 300
python3 scripts/build_web_data.py
node scripts/check_page.cjs

docker rm -f michinoeki-osrm
