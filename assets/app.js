(function(){
  const D = window.TRIP_DATA;
  const $ = s => document.querySelector(s);
  const el = (t, attrs={}, kids=[]) => {
    const n = document.createElement(t);
    for (const [k,v] of Object.entries(attrs)){
      if (v === null || v === undefined) continue;
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else n.setAttribute(k, v);
    }
    for (const c of kids) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return n;
  };
  const enc = encodeURIComponent;

  let userOrigin = "Current Location";
  async function useMyLocation(){
    if (!navigator.geolocation) return false;
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => { userOrigin = `${pos.coords.latitude},${pos.coords.longitude}`; resolve(true); },
        _ => resolve(false),
        {enableHighAccuracy:false, timeout:8000, maximumAge:300000}
      );
    });
  }

  function mapsOpen(q){ return `https://www.google.com/maps/search/?api=1&query=${enc(q)}`; }
  function mapsDir(dest){ return `https://www.google.com/maps/dir/?api=1&origin=${enc(userOrigin)}&destination=${enc(dest)}&travelmode=driving`; }
  function fullRouteUrl(includeOptional){
    const stops = D.stops.filter(s => includeOptional ? true : !s.optional);
    const origin = userOrigin;
    const destination = stops[stops.length-1].query;
    const waypoints = stops.slice(0, -1).map(s => s.query).join("|");
    return `https://www.google.com/maps/dir/?api=1&origin=${enc(origin)}&destination=${enc(destination)}&waypoints=${enc(waypoints)}&travelmode=driving`;
  }

  function renderContacts(){
    const c = $("#contacts");
    D.contacts.forEach(x => c.appendChild(el("a",{class:"btn", href:`tel:${x.phone}`},["📞 ", x.name])));
  }

  function renderHeader(){
    $("#tripTitle").textContent = D.tripTitle;
    $("#tripSubtitle").textContent = D.subtitle;

    const kv = $("#accomKV");
    const A = D.accommodation;
    [["Address",A.address],["Check-in",A.checkIn],["Check-out",A.checkOut]].forEach(([k,v])=>{
      kv.appendChild(el("div",{class:"k"},[k]));
      kv.appendChild(el("div",{class:"v"},[v]));
    });
    $("#accomMap").href = mapsOpen(A.address);
    $("#accomDir").href = mapsDir(A.address);

    $("#btnLocate").addEventListener("click", async ()=>{
      const ok = await useMyLocation();
      refreshDynamicLinks();
      alert(ok ? "Using your current location for directions." : "Couldn’t access location. Directions will use 'Current Location'.");
    });
    $("#btnFullRoute").addEventListener("click", ()=>{
      const includeOpt = $("#toggleOptional").checked;
      window.open(fullRouteUrl(includeOpt), "_blank", "noopener");
    });
    $("#toggleOptional").addEventListener("change", ()=>{
      renderTimeline();
      renderStops();
      refreshDynamicLinks();
      drawMap();
    });
  }

  function stopDot(s){
    if (s.optional) return "dot w";
    return s.day === 2 ? "dot g" : "dot p";
  }

  function stopBody(s){
    const img = el("img",{class:"photo", src:s.image, alt:s.title});
    const btnRow = el("div",{class:"btnbar"},[
      el("a",{class:"btn", href:mapsOpen(s.query), target:"_blank", rel:"noopener"},["🗺️ Open on Map"]),
      el("a",{class:"btn", href:mapsDir(s.query), target:"_blank", rel:"noopener", "data-dir":"1", "data-dest":s.query},["➡️ Get Directions"])
    ]);
    if (s.website) btnRow.appendChild(el("a",{class:"btn secondary", href:s.website, target:"_blank", rel:"noopener"},["ℹ️ Info page"]));

    return el("div",{class:"imgRow"},[
      el("div",{},[img]),
      el("div",{},[
        el("div",{class:"small", style:"margin-top:0"},[s.description]),
        el("div",{class:"note"},[
          el("div",{class:"muted2"},["Location:"]),
          el("div",{class:"mono", style:"margin-top:4px; color:rgba(255,255,255,.88)"},[s.query])
        ]),
        btnRow
      ])
    ]);
  }

  function renderTimeline(){
    const tl = $("#timeline");
    tl.innerHTML = "";
    const includeOpt = $("#toggleOptional").checked;
    const stops = D.stops.filter(s => includeOpt ? true : !s.optional);

    stops.forEach((s, idx)=>{
      const det = el("details",{open: idx===0 ? "open" : null});
      det.appendChild(el("summary",{},[
        el("div",{class:stopDot(s)}),
        el("div",{class:"sumMain"},[
          el("div",{class:"time"},[`Day ${s.day} • ${s.time}`]),
          el("div",{class:"place"},[s.title]),
          el("div",{class:"small"},[s.subtitle || ""])
        ]),
        s.optional ? el("span",{class:"pill warn"},["Optional"]) : el("span",{class:"pill purple"},[s.day===1?"Day 1":"Day 2"])
      ]));
      det.appendChild(el("div",{class:"body"},[stopBody(s)]));
      tl.appendChild(det);
    });
  }

  function renderStops(){
    const list = $("#stops");
    list.innerHTML = "";
    const includeOpt = $("#toggleOptional").checked;
    const stops = D.stops.filter(s => includeOpt ? true : !s.optional);

    const seen = new Set();
    stops.forEach(s=>{
      if (seen.has(s.query)) return;
      seen.add(s.query);

      const det = el("details",{});
      det.appendChild(el("summary",{},[
        el("div",{class:stopDot(s)}),
        el("div",{class:"sumMain"},[
          el("div",{class:"place"},[s.title]),
          el("div",{class:"small"},[s.query])
        ]),
        s.optional ? el("span",{class:"pill warn"},["Optional"]) : el("span",{class:"pill"},["Stop"])
      ]));
      det.appendChild(el("div",{class:"body"},[stopBody(s)]));
      list.appendChild(det);
    });
  }

  function refreshDynamicLinks(){
    document.querySelectorAll("[data-dir='1']").forEach(a=>{
      const dest = a.getAttribute("data-dest");
      a.href = mapsDir(dest);
    });
  }

  // Leaflet map (OSM) – optional enhancement
  let map = null;
  let markers = [];
  function injectLeaflet(){
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);

    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.onload = () => drawMap();
    js.onerror = () => { $("#mapStatus").textContent = "Map failed to load (network/CSP). Use Google Maps buttons instead."; };
    document.body.appendChild(js);
  }

  function drawMap(){
    if (!window.L) { $("#mapStatus").textContent = "Loading map…"; return; }
    $("#mapStatus").textContent = "";
    const includeOpt = $("#toggleOptional").checked;
    const stops = D.stops.filter(s => includeOpt ? true : !s.optional);

    if (!map){
      map = L.map("map",{scrollWheelZoom:false});
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution:'&copy; OpenStreetMap'}).addTo(map);
    }

    markers.forEach(m=>m.remove()); markers = [];
    if (window._line){ window._line.remove(); }

    const latlngs = [];
    stops.forEach(s=>{
      if (typeof s.lat === "number" && typeof s.lng === "number"){
        const ll = [s.lat, s.lng];
        latlngs.push(ll);
        markers.push(L.marker(ll).addTo(map).bindPopup(`<b>${s.title}</b><br>${s.time}`));
      }
    });

    if (latlngs.length >= 2){
      window._line = L.polyline(latlngs, {weight:4, opacity:0.8}).addTo(map);
      map.fitBounds(window._line.getBounds().pad(0.25));
    } else if (latlngs.length === 1){
      map.setView(latlngs[0], 11);
    }
  }

  // Hourly weather (Open-Meteo)
  const LOCS = {
    "Palmerston North": {lat:-40.3564, lng:175.6111},
    "Hāwera": {lat:-39.5917, lng:174.2833},
    "New Plymouth": {lat:-39.06667, lng:174.08333},
  };

  function weatherUrl(lat,lng){
    const tz = D.dates.timezone || "Pacific/Auckland";
    return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weathercode&timezone=${encodeURIComponent(tz)}&forecast_days=3`;
  }

  function codeToText(code){
    const m = {0:"Clear",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Dense drizzle",
      61:"Light rain",63:"Rain",65:"Heavy rain",80:"Showers",81:"Showers",82:"Heavy showers",95:"Thunderstorm"};
    return m[code] || `Code ${code}`;
  }

  async function loadWeather(){
    const locName = $("#wxLoc").value;
    const day = $("#wxDay").value; // YYYY-MM-DD
    const loc = LOCS[locName];

    $("#wxStatus").textContent = "Loading hourly forecast…";
    $("#wxTable").innerHTML = "";

    try{
      const res = await fetch(weatherUrl(loc.lat, loc.lng));
      if (!res.ok) throw new Error("Weather fetch failed");
      const data = await res.json();

      const t = data.hourly.time;
      const temp = data.hourly.temperature_2m;
      const pop = data.hourly.precipitation_probability;
      const wind = data.hourly.wind_speed_10m;
      const code = data.hourly.weathercode;

      const rows = [];
      for (let i=0;i<t.length;i++){
        if (t[i].startsWith(day)){
          rows.push({time:t[i].slice(11,16), temp:temp[i], pop:pop[i], wind:wind[i], code:codeToText(code[i])});
        }
      }

      const reduced = rows.filter((_, idx)=> idx%2===0);
      const thead = `<tr><th>Time</th><th>Temp</th><th>Rain %</th><th>Wind</th><th>Sky</th></tr>`;
      const tbody = reduced.map(r=>`<tr>
        <td class="mono">${r.time}</td><td>${Math.round(r.temp)}°C</td><td>${r.pop ?? "—"}%</td>
        <td>${Math.round(r.wind)} km/h</td><td>${r.code}</td></tr>`).join("");

      $("#wxTable").innerHTML = `<table>${thead}${tbody}</table>`;
      $("#wxStatus").textContent = `Hourly forecast for ${locName} on ${day}.`;
    }catch(e){
      $("#wxStatus").textContent = "Couldn’t load weather (network blocked). Try again later.";
    }
  }

  function initWeather(){
    const locSel = $("#wxLoc");
    Object.keys(LOCS).forEach(n=> locSel.appendChild(el("option",{value:n},[n])));

    $("#wxDay").innerHTML = "";
    $("#wxDay").appendChild(el("option",{value:D.dates.day1},[`Day 1 (${D.dates.day1})`]));
    $("#wxDay").appendChild(el("option",{value:D.dates.day2},[`Day 2 (${D.dates.day2})`]));

    $("#wxRefresh").addEventListener("click", loadWeather);
    $("#wxLoc").addEventListener("change", loadWeather);
    $("#wxDay").addEventListener("change", loadWeather);

    loadWeather();
  }

  function init(){
    renderContacts();
    renderHeader();
    renderTimeline();
    renderStops();
    injectLeaflet();
    initWeather();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
