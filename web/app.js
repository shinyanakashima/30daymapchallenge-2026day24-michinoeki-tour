(() => {
  "use strict";

  const T = {
    en: {
      kicker: "#30DayMapChallenge 2026 · Day 24 · Network",
      headline: (n, km) => `${n} roadside stations. One drive. <span class="km">${km} km.</span>`,
      lede: (n, s) => `The shortest road loop through all ${n} Michi-no-Eki (roadside stations) in Hokkaido, starting and ending at ${s}.`,
      startLabel: "Start from",
      startNote: (extra) => `It is a loop, so the order of stations stays the same wherever you start. Only the way in and out changes (${extra} from the nearest point on the loop).`,
      play: "Play", pause: "Pause", replay: "Replay",
      day: (d) => `Day ${d}`,
      daySub: (km, st, n) => `${km} km · ${st} of ${n} stations`,
      statDistance: "Distance", statTime: "Driving time", statDays: "Days at 8 h/day", statMunis: "Municipalities passed",
      about: "About, notes and sources",
      stop: (i, n) => `Stop ${i} of ${n}`,
      next: "Next", back: "Back to",
      mme: "Michi-no-Eki",
      hm: (h, m) => (h ? `${h} h ${m} min` : `${m} min`),
      days: (d) => `${d}`,
    },
    ja: {
      kicker: "#30DayMapChallenge 2026 · Day 24 · Network",
      headline: (n, km) => `北海道の道の駅${n}駅を、一筆書きで。<span class="km">${km} km</span>`,
      lede: (n, s) => `北海道のすべての道の駅（${n}駅）を、実際の道路で1回ずつ回って${s}に戻る最短の巡回ルートです。`,
      startLabel: "出発地",
      startNote: (extra) => `巡回ルートなので、どこから出発しても道の駅を回る順番は同じです。変わるのはルートへの出入りだけです（巡回ルートの最寄りの区間から ${extra}）。`,
      play: "再生", pause: "一時停止", replay: "もう一度",
      day: (d) => `${d}日目`,
      daySub: (km, st, n) => `${km} km・${n}駅中${st}駅`,
      statDistance: "総距離", statTime: "総運転時間", statDays: "1日8時間運転で", statMunis: "通る市町村",
      about: "この地図について・注記・出典",
      stop: (i, n) => `${n}駅中 ${i}番目`,
      next: "次", back: "戻り",
      mme: "道の駅",
      hm: (h, m) => (h ? `${h}時間${m}分` : `${m}分`),
      days: (d) => `${d}日`,
    },
  };

  const ABOUT = {
    en: (d) => `
      <h2>Every roadside station in Hokkaido, in one drive</h2>
      <p>Hokkaido has more Michi-no-Eki (government-registered roadside stations with parking, toilets and local shops) than any other region of Japan. This map shows a single round trip by car that visits each of the ${d.n} stations once and returns to the start, choosing the order that gives the shortest total driving time.</p>
      <h3>How it was computed</h3>
      <ul>
        <li>Station list: Hokkaido Michi-no-Eki liaison council and the MLIT national list (retrieved ${d.listDate}; ${d.n} stations). Locations from OpenStreetMap, checked against the council's map.</li>
        <li>Road distances and times: OSRM (car profile) run locally on the OpenStreetMap Hokkaido extract (data as of ${d.osmDate}), giving a ${d.n} × ${d.n} matrix.</li>
        <li>Order: travelling salesman problem (asymmetric, minimising driving time) solved with two solvers on the same matrix: Google OR-Tools (guided local search, ${d.ortRuns} runs of ${d.limit} s) and LKH-3 (${d.lkhRuns} runs). The shorter tour is used (${d.best}). It is the best tour found, not a proven optimum.</li>
        <li>Start point: the loop is solved over the stations only. A start such as Sapporo is joined to the loop where the detour is smallest, so the station order is the same for every start.</li>
        <li>Days: driving time split into 8-hour days. Stops, meals and sleep are not included.</li>
        <li>No station requires a ferry; all ${d.n} are on the main island.</li>
      </ul>
      <h3>Notes</h3>
      <ul>
        <li>Distances and times are calculated by OSRM from OpenStreetMap road data. Traffic, road closures, seasonal (winter) closures and opening hours are not considered.</li>
        <li>The number of stations is as of ${d.listDate}.</li>
        <li>This is not an official route of the Hokkaido Michi-no-Eki stamp rally.</li>
      </ul>
      <h3>Sources</h3>
      <ul>
        <li>Roads and station locations: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> (ODbL)</li>
        <li>Routing: <a href="https://project-osrm.org/">OSRM</a></li>
        <li>Station list: <a href="https://hokkaido-michinoeki.jp/ichiran/">Hokkaido Michi-no-Eki liaison council</a>, <a href="https://www.mlit.go.jp/road/Michi-no-Eki/list.html">MLIT</a></li>
        <li>Background map: <a href="https://maps.gsi.go.jp/development/ichiran.html">GSI Japan (pale map tiles)</a></li>
      </ul>
      <p><a href="https://github.com/shinyanakashima/30daymapchallenge-2026day24-michinoeki-tour">Source code and data on GitHub</a></p>`,
    ja: (d) => `
      <h2>北海道の道の駅を、一筆書きで</h2>
      <p>北海道は道の駅が全国で最も多い地域です。この地図は、北海道の${d.n}駅すべてを車で1回ずつ回って出発地に戻る巡回ルートのうち、運転時間の合計が最も短くなる順番を示しています。</p>
      <h3>計算方法</h3>
      <ul>
        <li>道の駅の一覧：北海道地区「道の駅」連絡会と国土交通省の一覧（${d.listDate}取得、${d.n}駅）。位置は OpenStreetMap から取り、連絡会の地図の位置と照合。</li>
        <li>道路距離と所要時間：OpenStreetMap の北海道データ（${d.osmDate}時点）で OSRM（車のプロファイル）を手元で動かし、全駅間の行列を作成。</li>
        <li>順番：運転時間の合計を最小にする巡回セールスマン問題（行きと帰りで時間が異なる非対称版）を、同じ行列に対して2つの方法で計算し、短い方を採用（${d.best}）。Google OR-Tools（Guided Local Search、${d.limit} 秒 × ${d.ortRuns} 回）と LKH-3（${d.lkhRuns} 回試行）。見つかった中で最良の解であり、厳密な最適解であることは証明していません。</li>
        <li>出発地：巡回ルートは道の駅だけで計算し、札幌などの出発地は寄り道が最も小さくなる区間に接続しています。そのため、どの出発地でも道の駅を回る順番は同じです。</li>
        <li>日数：運転時間を1日8時間で区切ったもの。休憩・食事・宿泊の時間は含みません。</li>
        <li>フェリーが必要な道の駅はありません（${d.n}駅すべて北海道本島）。</li>
      </ul>
      <h3>注記</h3>
      <ul>
        <li>距離と時間は OpenStreetMap の道路データと OSRM による計算です。渋滞・通行止め・冬期などの季節の道路閉鎖・営業時間は考慮していません。</li>
        <li>道の駅の数は${d.listDate}時点のものです。</li>
        <li>北海道「道の駅」スタンプラリーの公式のルートではありません。</li>
      </ul>
      <h3>出典</h3>
      <ul>
        <li>道路・道の駅の位置：© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>（ODbL）</li>
        <li>経路計算：<a href="https://project-osrm.org/">OSRM</a></li>
        <li>道の駅の一覧：<a href="https://hokkaido-michinoeki.jp/ichiran/">北海道地区「道の駅」連絡会</a>、<a href="https://www.mlit.go.jp/road/Michi-no-Eki/list.html">国土交通省</a></li>
        <li>背景地図：<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院（淡色地図）</a></li>
      </ul>
      <p><a href="https://github.com/shinyanakashima/30daymapchallenge-2026day24-michinoeki-tour">ソースコードとデータ（GitHub）</a></p>`,
  };

  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const params = new URLSearchParams(location.search);
  let lang = params.get("lang") === "ja" ? "ja" : "en";
  try { if (!params.get("lang") && localStorage.getItem("lang") === "ja") lang = "ja"; } catch (e) { /* storage unavailable */ }

  let D, R, startIdx = 0, map, popup, carMarker, startMarker, numMarkers = [], dayMarkers = [];
  const anim = { playing: false, t: 0, last: 0, day: -1 };
  const ANIM_MS = 48000;   // whole tour
  const DAY_PAUSE_MS = 450;

  const fmtKm = (m) => Math.round(m / 1000).toLocaleString("en-US");
  const fmtKm1 = (m) => (m / 1000).toFixed(1);
  const fmtHM = (s) => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return m === 60 ? T[lang].hm(h + 1, 0) : T[lang].hm(h, m); };
  const name = (st) => (lang === "ja" ? st.name_ja : st.name_en);
  const startName = (s) => (lang === "ja" ? s.name_ja : s.name_en);

  // Assemble the route for one start point: start -> loop -> start.
  function buildRoute(si) {
    const s = D.starts[si], n = D.order.length, p = s.after_pos;
    const legs = [s.out];
    for (let k = 1; k < n; k++) legs.push(D.loop[(p + k) % n]);
    legs.push(s.in);
    const seq = [];
    for (let k = 1; k <= n; k++) seq.push(D.order[(p + k) % n]);
    const coords = [], ct = [], arrive = [];
    let t0 = 0, d0 = 0;
    const cumD = [];
    legs.forEach((l, i) => {
      const from = i === 0 ? 0 : 1;
      for (let k = from; k < l.c.length; k++) {
        coords.push(l.c[k]);
        ct.push(t0 + l.ct[k] * (l.t / Math.max(1, l.ct[l.ct.length - 1])));
      }
      t0 += l.t; d0 += l.d;
      arrive.push({ t: t0, d: d0 });
    });
    // cumulative distance per vertex, scaled so legs sum exactly
    let acc = 0, li = 0, legStartD = 0, legStartT = 0;
    for (let k = 0; k < coords.length; k++) {
      while (li < legs.length - 1 && ct[k] > arrive[li].t + 1e-6) { legStartD = arrive[li].d; legStartT = arrive[li].t; li++; }
      const l = legs[li];
      acc = legStartD + (l.t ? (ct[k] - legStartT) / l.t : 0) * l.d;
      cumD.push(acc);
    }
    const total = t0;
    const dayBreaks = [];
    for (let t = D.day_s; t < total; t += D.day_s) dayBreaks.push(t);
    const nextInfo = seq.map((st, i) => ({ to: i + 1 < n ? seq[i + 1] : -1, d: legs[i + 1].d, t: legs[i + 1].t }));
    return { s, legs, seq, coords, ct, cumD, arrive, total, distance: d0, dayBreaks, nextInfo, nDays: Math.ceil(total / D.day_s) };
  }

  function idxAt(t) {
    const a = R.ct; let lo = 0, hi = a.length - 1;
    if (t <= 0) return 0;
    if (t >= a[hi]) return hi;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m] <= t) lo = m; else hi = m; }
    return lo;
  }
  function pointAt(t) {
    const i = idxAt(t), j = Math.min(i + 1, R.coords.length - 1);
    const span = R.ct[j] - R.ct[i], f = span > 0 ? (t - R.ct[i]) / span : 0;
    const a = R.coords[i], b = R.coords[j];
    return { i, p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], d: R.cumD[i] + (R.cumD[j] - R.cumD[i]) * f };
  }
  const line = (c) => ({ type: "Feature", geometry: { type: "LineString", coordinates: c.length > 1 ? c : [c[0], c[0]] }, properties: {} });
  const fc = (f) => ({ type: "FeatureCollection", features: f });

  function setText() {
    const t = T[lang];
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t[el.dataset.i18n]; });
    document.querySelectorAll("#lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    document.title = lang === "ja" ? "北海道の道の駅を、一筆書きで" : "Every Michi-no-Eki in Hokkaido, in one drive";
    if (!D || !R) return;
    const n = D.order.length;
    $("headline").innerHTML = t.headline(n, fmtKm(R.distance));
    $("lede").textContent = t.lede(n, startName(R.s));
    $("start-note").textContent = t.startNote(`+${fmtKm1(R.s.out.d + R.s.in.d - D.loop[R.s.after_pos].d)} km`);
    $("s-dist").textContent = `${fmtKm(R.distance)} km`;
    $("s-time").textContent = fmtHM(R.total);
    $("s-days").textContent = t.days(R.nDays);
    $("s-munis").textContent = String(R.s.n_municipalities);
    const sel = $("start");
    [...sel.options].forEach((o, i) => { o.textContent = startName(D.starts[i]); });
    const md = { n, listDate: D.list_date, osmDate: (D.osm_date || "").slice(0, 10), limit: D.solver.limit, ortRuns: D.solver.ortools_runs, lkhRuns: D.solver.lkh_runs, best: D.solver.best };
    $("about-body").innerHTML = ABOUT[lang](md);
    if (startMarker) startMarker.getElement().textContent = startName(R.s);
    dayMarkers.forEach((m) => { m.getElement().textContent = t.day(m.getElement().dataset.day); });
    updatePlayer();
    if (popup && popup.isOpen() && popup._stIdx != null) showPopup(popup._stIdx);
  }

  function updatePlayer() {
    const t = T[lang];
    const done = anim.t >= R.total;
    $("play-text").textContent = anim.playing ? t.pause : done ? t.replay : t.play;
    $("play").classList.toggle("playing", anim.playing);
    $("play").setAttribute("aria-label", $("play-text").textContent);
    const day = Math.min(R.nDays, Math.floor(anim.t / D.day_s) + 1);
    const visited = R.arrive.filter((a, i) => i < R.seq.length && a.t <= anim.t + 1e-6).length;
    $("day").textContent = t.day(day);
    $("day-sub").textContent = t.daySub(fmtKm(pointAt(anim.t).d), visited, R.seq.length);
  }

  function render() {
    const { i, p } = pointAt(anim.t);
    const dayIdx = Math.floor(anim.t / D.day_s);
    const dayStartT = dayIdx * D.day_s;
    const ds = idxAt(dayStartT);
    if (dayIdx !== anim.day) {
      map.getSource("done").setData(line(R.coords.slice(0, ds + 1).concat([pointAt(dayStartT).p])));
      anim.day = dayIdx;
    }
    map.getSource("current").setData(line([pointAt(dayStartT).p].concat(R.coords.slice(ds + 1, i + 1), [p])));
    carMarker.setLngLat(p);
    const visited = R.arrive.filter((a, k) => k < R.seq.length && a.t <= anim.t + 1e-6).length;
    map.setFilter("stations-visited", ["<", ["get", "pos"], visited + 1]);
    const shown = R.dayBreaks.filter((b) => b <= anim.t).map((b) => ({ type: "Feature", geometry: { type: "Point", coordinates: pointAt(b).p }, properties: {} }));
    map.getSource("daybreaks").setData(fc(shown));
    dayMarkers.forEach((m, k) => { m.getElement().style.display = R.dayBreaks[k] <= anim.t ? "block" : "none"; });
    $("scrub").value = String(Math.round((anim.t / R.total) * 1000));
    updatePlayer();
  }

  function setProgressMode(on) {
    if (!on) dayMarkers.forEach((m) => { m.getElement().style.display = "none"; });
    map.setPaintProperty("route", "line-opacity", on ? 0.28 : 1);
    ["done", "current"].forEach((l) => map.setLayoutProperty(l, "visibility", on ? "visible" : "none"));
    map.setLayoutProperty("stations-visited", "visibility", on ? "visible" : "none");
    carMarker.getElement().style.display = on ? "block" : "none";
  }

  function frame(now) {
    if (!anim.playing) return;
    let dt = now - anim.last; anim.last = now;
    if (anim.pauseUntil && now < anim.pauseUntil) { requestAnimationFrame(frame); return; }
    dt = Math.min(dt, 100);
    const before = Math.floor(anim.t / D.day_s);
    anim.t = Math.min(R.total, anim.t + (dt / ANIM_MS) * R.total);
    const after = Math.floor(anim.t / D.day_s);
    if (after > before && anim.t < R.total) { anim.t = after * D.day_s; anim.pauseUntil = now + DAY_PAUSE_MS; }
    render();
    if (anim.t >= R.total) { anim.playing = false; updatePlayer(); return; }
    requestAnimationFrame(frame);
  }

  function play() {
    if (anim.t >= R.total) { anim.t = 0; anim.day = -1; }
    setProgressMode(true);
    anim.playing = true; anim.last = performance.now(); anim.pauseUntil = 0;
    requestAnimationFrame(frame);
    updatePlayer();
  }
  function pause() { anim.playing = false; if (R) updatePlayer(); }

  function showPopup(k) {
    const n = R.seq.length, pos = R.seq.indexOf(k), st = D.stations[k], nx = R.nextInfo[pos], t = T[lang];
    const nextName = nx.to >= 0 ? name(D.stations[nx.to]) : startName(R.s);
    const other = lang === "ja" ? st.name_en : `${t.mme} ${st.name_ja}`;
    const html = `<div class="pop"><div class="seq">${t.stop(pos + 1, n)}</div>
      <div class="nm">${lang === "ja" ? "道の駅 " : ""}${name(st)}</div>
      <div class="sub">${other} · ${st.muni_ja}</div>
      <div class="next">${nx.to >= 0 ? t.next : t.back}: ${nextName}<br> <b>${fmtKm1(nx.d)} km</b> · <b>${fmtHM(nx.t)}</b></div></div>`;
    popup.setLngLat([st.lon, st.lat]).setHTML(html);
    popup._stIdx = k;
    if (!popup.isOpen()) popup.addTo(map);
  }

  function stationFC() {
    return fc(R.seq.map((k, i) => ({ type: "Feature", id: k, geometry: { type: "Point", coordinates: [D.stations[k].lon, D.stations[k].lat] }, properties: { k, pos: i + 1 } })));
  }

  function applyStart(si) {
    pause();
    startIdx = si;
    R = buildRoute(si);
    anim.t = 0; anim.day = -1;
    map.getSource("route").setData(line(R.coords));
    map.getSource("stations").setData(stationFC());
    map.getSource("done").setData(line([R.coords[0]]));
    map.getSource("current").setData(line([R.coords[0]]));
    map.getSource("daybreaks").setData(fc([]));
    setProgressMode(false);
    numMarkers.forEach((m) => m.remove());
    numMarkers = R.seq.map((k, i) => {
      const el = document.createElement("div"); el.className = "num"; el.textContent = String(i + 1);
      return new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([D.stations[k].lon, D.stations[k].lat]).addTo(map);
    });
    dayMarkers.forEach((m) => m.remove());
    dayMarkers = R.dayBreaks.map((b, k) => {
      const el = document.createElement("div"); el.className = "daylab"; el.dataset.day = String(k + 2); el.style.display = "none";
      return new maplibregl.Marker({ element: el, anchor: "left", offset: [9, 0] }).setLngLat(pointAt(b).p).addTo(map);
    });
    startMarker.setLngLat([R.s.lon, R.s.lat]);
    if (popup) popup.remove();
    setText();
  }

  function fitAll() {
    const small = window.innerWidth < 640;
    map.fitBounds([[139.45, 41.35], [145.75, 45.55]], {
      padding: small ? { top: 170, bottom: 160, left: 10, right: 10 } : { top: 40, bottom: 40, left: 440, right: 40 },
      duration: 0,
    });
  }

  async function init() {
    setText();
    const res = await fetch("data/tour.json");
    D = await res.json();
    const sel = $("start");
    D.starts.forEach((s, i) => { const o = document.createElement("option"); o.value = String(i); sel.appendChild(o); });
    const q = D.starts.findIndex((s) => s.id === params.get("start"));
    startIdx = q >= 0 ? q : 0;
    sel.value = String(startIdx);

    map = new maplibregl.Map({
      container: "map",
      style: {
        version: 8,
        sources: {
          gsi: {
            type: "raster", tileSize: 256, maxzoom: 18,
            tiles: ["https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"],
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">GSI Japan</a> | Roads &amp; stations © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL) | Routing <a href="https://project-osrm.org/" target="_blank" rel="noopener">OSRM</a> | List: <a href="https://hokkaido-michinoeki.jp/ichiran/" target="_blank" rel="noopener">Hokkaido Michi-no-Eki council</a>, MLIT',
          },
        },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": "#f2f1ed" } },
          { id: "gsi", type: "raster", source: "gsi", paint: { "raster-saturation": -0.6, "raster-opacity": 0.85 } },
        ],
      },
      bounds: [[139.45, 41.35], [145.75, 45.55]],
      attributionControl: { compact: true },
      dragRotate: false, pitchWithRotate: false, touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    window.__map = map;
    if (window.innerWidth >= 640) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    popup = new maplibregl.Popup({ closeButton: true, maxWidth: "280px", offset: 10 });

    await new Promise((r) => map.on("load", r));
    fitAll();
    if (window.innerWidth < 640) {
      const a = document.querySelector(".maplibregl-ctrl-attrib");
      if (a) a.classList.remove("maplibregl-compact-show");
    }
    const empty = line([[0, 0]]);
    map.addSource("route", { type: "geojson", data: empty });
    map.addSource("done", { type: "geojson", data: empty });
    map.addSource("current", { type: "geojson", data: empty });
    map.addSource("stations", { type: "geojson", data: fc([]) });
    map.addSource("daybreaks", { type: "geojson", data: fc([]) });
    const lineLayout = { "line-join": "round", "line-cap": "round" };
    const w = (a, b) => ["interpolate", ["linear"], ["zoom"], 5, a, 10, b];
    map.addLayer({ id: "route-casing", type: "line", source: "route", layout: lineLayout, paint: { "line-color": "#fff", "line-width": w(4, 8), "line-opacity": 0.9 } });
    map.addLayer({ id: "route", type: "line", source: "route", layout: lineLayout, paint: { "line-color": "#c3362b", "line-width": w(1.8, 4) } });
    map.addLayer({ id: "done", type: "line", source: "done", layout: lineLayout, paint: { "line-color": "#c3362b", "line-width": w(2.2, 4.5) } });
    map.addLayer({ id: "current", type: "line", source: "current", layout: lineLayout, paint: { "line-color": "#c3362b", "line-width": w(2.6, 5) } });
    map.addLayer({ id: "stations", type: "circle", source: "stations", paint: { "circle-radius": w(3.2, 7), "circle-color": "#fff", "circle-stroke-color": "#1d1d1b", "circle-stroke-width": w(1.4, 2) } });
    map.addLayer({ id: "stations-visited", type: "circle", source: "stations", filter: ["<", ["get", "pos"], 1], paint: { "circle-radius": w(3.2, 7), "circle-color": "#1d1d1b", "circle-stroke-color": "#fff", "circle-stroke-width": 1 } });
    map.addLayer({ id: "daybreaks", type: "circle", source: "daybreaks", paint: { "circle-radius": w(4, 7), "circle-color": "#c3362b", "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });

    const carEl = document.createElement("div"); carEl.className = "car";
    carMarker = new maplibregl.Marker({ element: carEl }).setLngLat([0, 0]).addTo(map);
    const sEl = document.createElement("div"); sEl.className = "start-pin";
    startMarker = new maplibregl.Marker({ element: sEl, anchor: "bottom" }).setLngLat([0, 0]).addTo(map);

    const toggleNums = () => document.body.classList.toggle("hide-nums", map.getZoom() < 7.6);
    map.on("zoom", toggleNums); toggleNums();
    ["stations", "stations-visited"].forEach((l) => {
      map.on("click", l, (e) => showPopup(e.features[0].properties.k));
      map.on("mouseenter", l, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", l, () => { map.getCanvas().style.cursor = ""; });
    });

    applyStart(startIdx);

    sel.addEventListener("change", () => {
      applyStart(Number(sel.value));
      const u = new URL(location.href); u.searchParams.set("start", D.starts[startIdx].id); history.replaceState(null, "", u);
    });
    $("play").addEventListener("click", () => (anim.playing ? pause() : play()));
    $("scrub").addEventListener("input", (e) => {
      pause(); setProgressMode(true); anim.day = -1;
      anim.t = (Number(e.target.value) / 1000) * R.total; render();
    });
    if (!reduceMotion && !params.has("still")) setTimeout(() => { if (!anim.playing && anim.t === 0) play(); }, 1200);
  }

  document.querySelectorAll("#lang button").forEach((b) => b.addEventListener("click", () => {
    lang = b.dataset.lang;
    try { localStorage.setItem("lang", lang); } catch (e) { /* storage unavailable */ }
    setText();
  }));
  $("about-btn").addEventListener("click", () => $("about").showModal());
  init().catch((e) => { console.error(e); });
})();
