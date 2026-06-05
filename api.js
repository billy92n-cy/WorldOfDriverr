// ═══════════════════════════════════════════════════════════════════
//  WOB API INTEGRATIONS v6.0
//  Open-Météo · Prix Carburant France · AviationStack · Overpass
//  Chart.js Pro · OneSignal · Supabase · Auto-Save 30s · IA Zones
//
//  ⚠ CONFIGURATION — Remplacez les clés par les vôtres :
//    AVIATION_KEY  → https://aviationstack.com  (free tier: 500 req/mois)
//    ONESIGNAL_APP → https://onesignal.com      (gratuit)
//    SUPABASE_URL  → https://supabase.com        (gratuit 500MB)
//    SUPABASE_KEY  → votre clé anon publique
//
//  AJOUT dans index.html, avant </body> :
//    <script src="api-integrations.js"></script>
// ═══════════════════════════════════════════════════════════════════

"use strict";

// ─────────────────────────────────────────────────────────────────
//  ⚙️  CONFIGURATION — MODIFIEZ ICI
// ─────────────────────────────────────────────────────────────────
const WOB_CONFIG = {
  // AviationStack — https://aviationstack.com (clé gratuite)
  AVIATION_KEY: '50769e65e93de5a2f7646d69c8079e9d',

  // OneSignal — clé intégrée
  // OneSignal supprimé

  // Supabase — clés intégrées
  SUPABASE_URL: 'https://ewdbcvygplepjefmpyap.supabase.co',
  SUPABASE_KEY: 'sb_publishable_p9s8AJ4KNBIEYd5vT4h3Dw_MDQjLwJY',

  // Aéroports IDF surveillés
  AIRPORTS: [
    { code:'CDG', name:'Charles de Gaulle', lat:49.0097, lon:2.5479 },
    { code:'ORY', name:'Orly',              lat:48.7262, lon:2.3695 },
    { code:'BVA', name:'Beauvais',          lat:49.4543, lon:2.1122 },
  ],

  // Auto-save
  AUTOSAVE_INTERVAL: 30 * 1000,   // 30 secondes
  CACHE_TTL: {
    meteo:    30 * 60 * 1000,    // 30 min
    carbu:    60 * 60 * 1000,    // 1h
    flights:  10 * 60 * 1000,    // 10 min
    events:   30 * 60 * 1000,    // 30 min
  },
};

// ─────────────────────────────────────────────────────────────────
//  🔧  HELPERS
// ─────────────────────────────────────────────────────────────────
const LS  = { get: k => localStorage.getItem(k), set: (k,v) => { try { localStorage.setItem(k,v); } catch(e){} } };
const LOG = (...a) => console.log('%c[WOB API]', 'color:#d4a843;font-weight:bold', ...a);
const ERR = (...a) => console.warn('%c[WOB ERR]', 'color:#ff4d6a;font-weight:bold', ...a);

function getCached(key, ttl) {
  const val = LS.get(key);
  const ts  = parseInt(LS.get(key + '_ts') || '0');
  if (val && Date.now() - ts < ttl) return JSON.parse(val);
  return null;
}
function setCache(key, data) {
  LS.set(key, JSON.stringify(data));
  LS.set(key + '_ts', Date.now().toString());
}
function fmtEuro(n) {
  return isNaN(n) ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits:2, maximumFractionDigits:2 }) + ' €';
}
function el(id) { return document.getElementById(id); }
function showToastAPI(msg, type = 'info') {
  if (typeof showToast === 'function') showToast(msg);
}

// ═══════════════════════════════════════════════════════════════════
//  MODULE 1 — OPEN-MÉTÉO (100% gratuit, sans clé)
//  https://open-meteo.com
// ═══════════════════════════════════════════════════════════════════
const METEO = {
  WMO_CODES: {
    0:'☀️ Ciel dégagé',1:'🌤 Peu nuageux',2:'⛅ Partiellement nuageux',3:'☁️ Couvert',
    45:'🌫 Brouillard',48:'🌫 Brouillard givrant',51:'🌦 Bruine légère',53:'🌦 Bruine',
    55:'🌦 Bruine forte',61:'🌧 Pluie légère',63:'🌧 Pluie',65:'🌧 Pluie forte',
    71:'❄️ Neige légère',73:'❄️ Neige',75:'❄️ Neige forte',80:'🌦 Averses',
    81:'🌦 Averses modérées',82:'⛈ Averses fortes',95:'⛈ Orage',96:'⛈ Orage+grêle',99:'⛈ Orage violent',
  },

  async load(lat = 48.8566, lon = 2.3522) {
    const cached = getCached('wob_meteo', WOB_CONFIG.CACHE_TTL.meteo);
    if (cached) { this.render(cached); return; }

    try {
      const url = [
        'https://api.open-meteo.com/v1/forecast',
        `?latitude=${lat}&longitude=${lon}`,
        '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,',
        'weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
        '&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m',
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset',
        '&forecast_days=3&timezone=Europe%2FParis',
      ].join('');

      const resp = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setCache('wob_meteo', data);
      this.render(data);
    } catch (e) {
      ERR('Météo:', e.message);
      const c = getCached('wob_meteo', Infinity);
      if (c) this.render(c);
      else this.renderError();
    }
  },

  getVTCImpact(code, wind, precip) {
    // Impact météo sur la demande VTC
    if ([95,96,99].includes(code)) return { cls:'danger', msg:'⛈ Orage — Surge +40% demande attendue !', score:3 };
    if ([61,63,65,80,81,82].includes(code) || precip > 2) return { cls:'warn', msg:'🌧 Pluie — Demande VTC +25%', score:2 };
    if (wind > 50) return { cls:'warn', msg:'💨 Vent fort — Évitez bords Seine', score:2 };
    if ([71,73,75].includes(code)) return { cls:'danger', msg:'❄️ Neige — Trafic perturbé, clientèle captive !', score:3 };
    if ([45,48].includes(code)) return { cls:'warn', msg:'🌫 Brouillard — Conduisez prudemment', score:1 };
    if (code === 0) return { cls:'ok', msg:'☀️ Beau temps — Demande normale', score:0 };
    return { cls:'info', msg:'🌤 Météo stable', score:0 };
  },

  render(data) {
    const c   = data.current;
    const d0  = data.daily;
    const h   = data.hourly;
    const now = new Date();

    if (!c) return;

    const code   = c.weather_code;
    const temp   = Math.round(c.temperature_2m);
    const feel   = Math.round(c.apparent_temperature);
    const wind   = Math.round(c.wind_speed_10m);
    const precip = c.precipitation || 0;
    const humid  = c.relative_humidity_2m;
    const desc   = this.WMO_CODES[code] || '🌤 Variable';
    const impact = this.getVTCImpact(code, wind, precip);

    // Prochaines heures de pluie
    const nextHours = [];
    if (h) {
      for (let i = 0; i < 12; i++) {
        const t   = new Date(h.time[i]);
        const pct = h.precipitation_probability?.[i] || 0;
        if (pct > 30) nextHours.push({ h: t.getHours(), pct });
      }
    }

    // HTML météo
    const html = `
      <div class="meteo-card">
        <!-- Current -->
        <div class="meteo-top">
          <div class="meteo-main">
            <div class="meteo-temp">${temp}°</div>
            <div class="meteo-desc">${desc}</div>
            <div class="meteo-feel">Ressenti ${feel}°</div>
          </div>
          <div class="meteo-details">
            <div class="md-item">💨 ${wind} km/h</div>
            <div class="md-item">💧 ${humid}%</div>
            <div class="md-item">🌧 ${precip}mm</div>
            ${d0?.sunrise?.[0] ? `<div class="md-item">🌅 ${new Date(d0.sunrise[0]).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>` : ''}
          </div>
        </div>

        <!-- Impact VTC -->
        <div class="list-item ${impact.cls}" style="margin-top:10px;border-radius:10px;font-weight:700;">
          ${impact.msg}
        </div>

        <!-- Alertes pluie prochaines heures -->
        ${nextHours.length ? `
          <div style="margin-top:8px;font-size:11px;color:var(--text-dim);">
            🌧 Risque pluie : ${nextHours.slice(0,3).map(x=>`${x.h}h (${x.pct}%)`).join(' · ')}
          </div>` : ''}

        <!-- Prévisions 3 jours -->
        ${d0 ? `
          <div class="meteo-forecast">
            ${[0,1,2].map(i => {
              const dayName = i===0?'Auj.':(i===1?'Dem.':new Date(d0.time[i]).toLocaleDateString('fr-FR',{weekday:'short'}));
              return `<div class="mf-day">
                <div class="mf-name">${dayName}</div>
                <div class="mf-ico">${(this.WMO_CODES[d0.weather_code[i]]||'🌤').split(' ')[0]}</div>
                <div class="mf-temps">
                  <span style="color:var(--gold)">${Math.round(d0.temperature_2m_max[i])}°</span>
                  <span style="color:var(--text-dim)">${Math.round(d0.temperature_2m_min[i])}°</span>
                </div>
                <div style="font-size:9px;color:#3b82f6;">${d0.precipitation_probability_max?.[i]||0}%💧</div>
              </div>`;
            }).join('')}
          </div>` : ''}
      </div>`;

    // Injecter dans les containers météo
    ['meteo-container','meteo-rush-widget'].forEach(id => {
      const cont = el(id);
      if (cont) cont.innerHTML = html;
    });

    // Mettre à jour le widget compact dans la header rush si il existe
    this.updateWeatherBadge(temp, desc, impact);

    // Conseil stratégique météo pour l'IA
    WOB_STATE.meteoImpact = impact;
    WOB_STATE.meteoData   = { temp, wind, code, precip };
  },

  updateWeatherBadge(temp, desc, impact) {
    const badge = el('weather-badge');
    if (!badge) return;
    const ico = desc.split(' ')[0];
    badge.innerHTML = `${ico} ${temp}°`;
    badge.className = `weather-badge ${impact.cls}`;
  },

  renderError() {
    ['meteo-container','meteo-rush-widget'].forEach(id => {
      const cont = el(id);
      if (cont) cont.innerHTML = `<div class="list-item info">🌤 Météo indisponible</div>`;
    });
  },
};

// ═══════════════════════════════════════════════════════════════════
//  MODULE 2 — PRIX CARBURANT FRANCE (gouvernemental, gratuit)
//  https://data.economie.gouv.fr/api/explore/v2.1
// ═══════════════════════════════════════════════════════════════════
const CARBURANT = {
  TYPES: {
    'Gazole':'diesel', 'SP95':'essence', 'SP98':'essence', 'E10':'essence',
    'GPLc':'gpl', 'E85':'ethanol',
  },

  async load(lat = 48.8566, lon = 2.3522) {
    const cached = getCached('wob_carbu', WOB_CONFIG.CACHE_TTL.carbu);
    if (cached) { this.render(cached); return; }

    try {
      // Try multiple URLs in order (dataset was renamed in 2024)
      const geoWhere = `distance(geom, geom'POINT(${lon} ${lat})', 8000m) AND prix_valeur > 0`;
      const URLS = [
        'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records'
          + '?where=' + encodeURIComponent(geoWhere) + '&limit=30&select=adresse,ville,prix_valeur,prix_nom,id',
        'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix_des_carburants_en_france_flux_instantane_v2/records'
          + '?where=' + encodeURIComponent(geoWhere) + '&limit=30&select=adresse,ville,prix_valeur,prix_nom,id',
        'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records'
          + '?where=' + encodeURIComponent('prix_valeur > 0') + '&limit=80&select=adresse,ville,prix_valeur,prix_nom',
      ];
      let data = null;
      for (const url of URLS) {
        try {
          const ctrl = new AbortController();
          const tid  = setTimeout(() => ctrl.abort(), 12000);
          const resp = await fetch(url, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
          clearTimeout(tid);
          if (!resp.ok) continue;
          const d = await resp.json();
          if (d.results && d.results.length) { data = d; break; }
        } catch(e) { ERR('Carburant URL:', e.message); }
      }
      if (!data) throw new Error('Toutes les URLs carburant ont échoué');
      setCache('wob_carbu', data.results || []);
      this.render(data.results || []);
    } catch (e) {
      ERR('Carburant:', e.message);
      const cached = getCached('wob_carbu', Infinity);
      if (cached) this.render(cached);
      else this.renderFallback();
    }
  },

  // Agréger les prix moyens nationaux (API alternative)
  async loadNational() {
    try {
      const url = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix_des_carburants_en_france_flux_instantane_v2/records?limit=100&select=prix_valeur,prix_nom&where=' + encodeURIComponent('prix_valeur > 0');
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) throw new Error('');
      const data = await resp.json();
      const avgs = {};
      const counts = {};
      (data.results || []).forEach(r => {
        if (!r.prix_nom || !r.prix_valeur) return;
        avgs[r.prix_nom]   = (avgs[r.prix_nom]   || 0) + parseFloat(r.prix_valeur);
        counts[r.prix_nom] = (counts[r.prix_nom] || 0) + 1;
      });
      const result = {};
      Object.keys(avgs).forEach(k => result[k] = (avgs[k] / counts[k]).toFixed(3));
      return result;
    } catch { return null; }
  },

  render(stations) {
    const cont = el('carbu-container');
    if (!cont) return;

    if (!stations.length) {
      cont.innerHTML = `<div class="list-item info">Aucune station dans 2km. Élargissez la recherche.</div>`;
      return;
    }

    // Trouver le meilleur prix par carburant
    const best = {};
    stations.forEach(s => {
      if (!s.prix_nom || !s.prix_valeur) return;
      const type = this.TYPES[s.prix_nom] || 'autre';
      const prix = parseFloat(s.prix_valeur);
      if (!best[s.prix_nom] || prix < best[s.prix_nom].prix) {
        best[s.prix_nom] = { prix, adresse:`${s.adresse||''}, ${s.ville||''}`, type };
      }
    });

    // Auto-mettre à jour le prix dans les paramètres véhicule
    const vehType = localStorage.getItem('wob_veh_type') || 'essence';
    const fuelMap = { essence:['SP95','SP98','E10'], diesel:['Gazole'], gpl:['GPLc'], electric:[], hybrid:['SP95','E10'] };
    const types   = fuelMap[vehType] || ['SP95'];
    types.forEach(t => {
      if (best[t]) {
        const prev = parseFloat(localStorage.getItem('wob_prix') || '0');
        const curr = best[t].prix;
        if (Math.abs(prev - curr) > 0.02) {
          localStorage.setItem('wob_prix', curr.toFixed(3));
          LOG(`Prix carburant auto-mis à jour: ${t} = ${curr}€/L`);
          showToastAPI(`⛽ Prix ${t} mis à jour: ${curr.toFixed(3)}€/L`);
        }
      }
    });

    const icons = { Gazole:'⚫', SP95:'🔴', SP98:'🔴', E10:'🟡', GPLc:'🟢', E85:'🟠' };

    cont.innerHTML = `
      <div style="margin-bottom:10px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-dim);margin-bottom:8px;">
          MEILLEURS PRIX AUTOUR DE VOUS
        </div>
        ${Object.entries(best).map(([nom, info]) => `
          <div class="list-item ok" style="display:flex;justify-content:space-between;align-items:center;border-radius:10px;margin-bottom:4px;">
            <div>
              <span style="font-weight:700;">${icons[nom]||'⛽'} ${nom}</span>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">${info.adresse.trim().replace(/^,\s*/,'')}</div>
            </div>
            <span style="font-size:16px;font-weight:800;color:var(--gold);">${info.prix.toFixed(3)}€</span>
          </div>`).join('')}
      </div>
      <div style="font-size:10px;color:var(--text-muted);text-align:right;">
        ${stations.length} stations · Mise à jour : ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
      </div>`;

    // Stocker pour l'IA
    WOB_STATE.fuelPrices = best;
  },

  renderFallback() {
    const cont = el('carbu-container');
    if (cont) cont.innerHTML = `<div class="list-item warn">⛽ Prix carburant indisponibles — vérifiez votre connexion</div>`;
  },
};

// ═══════════════════════════════════════════════════════════════════
//  MODULE 3 — AVIATIONSTACK (vols en temps réel)
//  https://aviationstack.com — Free: 500 req/mois
//  Sans clé : mode simulation enrichie
// ═══════════════════════════════════════════════════════════════════
const AVIATION = {
  async loadArrivals(airportCode = 'CDG') {
    const cacheKey = `wob_flights_arr_${airportCode}`;
    const cached   = getCached(cacheKey, WOB_CONFIG.CACHE_TTL.flights);
    if (cached) { this.render(cached, airportCode, 'arrivals'); return; }

    const key = WOB_CONFIG.AVIATION_KEY;
    if (!key || key.length < 10) {
      this.renderDemo(airportCode);
      return;
    }

    try {
      const url = `https://api.aviationstack.com/v1/flights?access_key=${key}&arr_iata=${airportCode}&flight_status=active&limit=10`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      setCache(cacheKey, data.data || []);
      this.render(data.data || [], airportCode, 'arrivals');
    } catch (e) {
      ERR('Aviation arrivals:', e.message);
      this.renderDemo(airportCode);
    }
  },

  async loadDepartures(airportCode = 'CDG') {
    const cacheKey = `wob_flights_dep_${airportCode}`;
    const cached   = getCached(cacheKey, WOB_CONFIG.CACHE_TTL.flights);
    if (cached) { this.render(cached, airportCode, 'departures'); return; }

    const key = WOB_CONFIG.AVIATION_KEY;
    if (!key || key.length < 10) { this.renderDemo(airportCode); return; }

    try {
      const url = `https://api.aviationstack.com/v1/flights?access_key=${key}&dep_iata=${airportCode}&flight_status=active&limit=10`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      setCache(cacheKey, data.data || []);
      this.render(data.data || [], airportCode, 'departures');
    } catch (e) {
      ERR('Aviation departures:', e.message);
      this.renderDemo(airportCode);
    }
  },

  render(flights, airport, type) {
    const cont = el(`flights-${airport.toLowerCase()}`);
    if (!cont) return;
    if (!flights.length) {
      cont.innerHTML = `<div class="list-item info">Aucun vol actif pour ${airport}</div>`;
      return;
    }

    const now = Date.now();
    const isArr = type === 'arrivals';
    cont.innerHTML = flights.slice(0, 8).map(f => {
      const timeKey  = isArr ? f.arrival : f.departure;
      const eta      = timeKey?.estimated || timeKey?.scheduled;
      const delay    = timeKey?.delay || 0;
      const airline  = f.airline?.name || '—';
      const flightN  = f.flight?.iata || '—';
      const from     = isArr ? (f.departure?.iata || '—') : (f.arrival?.iata || '—');
      const status   = f.flight_status || 'scheduled';
      const etaTime  = eta ? new Date(eta).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '—';
      const delayTxt = delay > 5 ? `<span style="color:#ff4d6a;font-size:10px;">+${delay}min</span>` : '';
      const cls      = delay > 30 ? 'item-danger' : delay > 10 ? 'item-warn' : 'item-ok';

      // Estimation clients potentiels (large-body = +150-300 personnes)
      const passengers = f.aircraft?.icao ? (f.aircraft.icao.startsWith('B7') ? '~250 pass.' : '~150 pass.') : '';

      return `<div class="list-item ${cls}" style="flex-direction:column;gap:3px;border-radius:10px;">
        <div style="display:flex;justify-content:space-between;">
          <span style="font-weight:700;">${isArr?'✈️ Arrivée':'🛫 Départ'} ${flightN}</span>
          <span style="font-weight:800;color:var(--gold);">${etaTime} ${delayTxt}</span>
        </div>
        <div style="font-size:11px;color:var(--text-dim);">
          ${airline} · ${isArr?'depuis':'vers'} ${from}
          ${passengers ? `· <span style="color:var(--gold)">${passengers}</span>` : ''}
        </div>
        ${delay > 15 ? `<div style="font-size:10px;color:#ff4d6a;">⚠️ Retard ${delay}min — Clients en attente prolongée</div>` : ''}
      </div>`;
    }).join('');

    // Calculer les créneaux VTC optimaux
    this.computeVTCWindows(flights, airport, type);
  },

  computeVTCWindows(flights, airport, type) {
    const now = Date.now();
    const windows = [];
    flights.forEach(f => {
      const timeKey = type === 'arrivals' ? f.arrival : f.departure;
      const eta = timeKey?.estimated || timeKey?.scheduled;
      if (!eta) return;
      const t = new Date(eta).getTime();
      const diffMin = Math.round((t - now) / 60000);
      if (diffMin > 0 && diffMin < 60) {
        windows.push({ diffMin, flightN: f.flight?.iata, delay: timeKey?.delay || 0 });
      }
    });
    windows.sort((a, b) => a.diffMin - b.diffMin);
    if (windows.length) {
      const msg = `✈️ ${airport}: ${windows.length} vol(s) dans 1h — Prochain dans ${windows[0].diffMin}min`;
      WOB_STATE.flightWindows = WOB_STATE.flightWindows || {};
      WOB_STATE.flightWindows[airport] = windows;
      // Mettre à jour le rapport IA stratégique
      IA_ZONES.addFlightContext(airport, windows);
    }
  },

  renderDemo(airportCode) {
    const cont = el(`flights-${airportCode.toLowerCase()}`);
    if (!cont) return;

    const now = new Date();
    const fmtT = d => d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
    const demo = [
      { airline:'Air France',  from:'JFK', arrive: new Date(now.getTime()+15*60000), delay:0,  pass:'~280 pass.' },
      { airline:'easyJet',     from:'LGW', arrive: new Date(now.getTime()+28*60000), delay:12, pass:'~180 pass.' },
      { airline:'Lufthansa',   from:'FRA', arrive: new Date(now.getTime()+42*60000), delay:0,  pass:'~210 pass.' },
      { airline:'British Airw',from:'LHR', arrive: new Date(now.getTime()+55*60000), delay:25, pass:'~160 pass.' },
    ];

    cont.innerHTML = `
      <div class="list-item warn" style="font-size:11px;border-radius:8px;margin-bottom:8px;">
        ℹ️ Mode démo — Configurez votre clé AviationStack dans les paramètres
      </div>` +
      demo.map(f => {
        const cls = f.delay > 20 ? 'item-warn' : 'item-ok';
        return `<div class="list-item ${cls}" style="flex-direction:column;gap:3px;border-radius:10px;">
          <div style="display:flex;justify-content:space-between;">
            <span style="font-weight:700;">✈️ ${airportCode} ← ${f.from}</span>
            <span style="font-weight:800;color:var(--gold);">${fmtT(f.arrive)}${f.delay?` <span style="color:#ff4d6a;font-size:10px;">+${f.delay}m</span>`:''}</span>
          </div>
          <div style="font-size:11px;color:var(--text-dim);">${f.airline} · <span style="color:var(--gold)">${f.pass}</span></div>
        </div>`;
      }).join('');

    // Simuler des créneaux VTC
    IA_ZONES.addFlightContext(airportCode, demo.map((f,i)=>({ diffMin:(i+1)*15, flightN:`AF${100+i}`, delay:f.delay })));
  },
};

// ═══════════════════════════════════════════════════════════════════
//  MODULE 4 — IA ZONES STRATÉGIQUES (enrichi par toutes les APIs)
// ═══════════════════════════════════════════════════════════════════
const IA_ZONES = {
  flightContexts: {},
  _lastBuild:     0,

  addFlightContext(airport, windows) {
    this.flightContexts[airport] = windows;
    this.buildAdvice();
  },

  buildAdvice() {
    const now    = Date.now();
    if (now - this._lastBuild < 60000) return; // max 1x/min
    this._lastBuild = now;

    const h      = new Date().getHours();
    const day    = new Date().getDay(); // 0=dim
    const meteo  = WOB_STATE.meteoData || {};
    const fuel   = WOB_STATE.fuelPrices || {};
    const _s    = window.state || {};
    const gain   = _s.totalGain  || 0;
    const km     = _s.totalKm    || 0;
    const trips  = _s.totalTrips || 0;
    const impact = WOB_STATE.meteoImpact || { score:0, msg:'Météo OK' };

    const conseils = [];

    // ── Conseils météo ──────────────────────────────
    if (impact.score >= 2) {
      conseils.push({ priority:3, icon:'⛈', msg: impact.msg, cls:'danger' });
    } else if (impact.score === 1) {
      conseils.push({ priority:2, icon:'🌧', msg: impact.msg, cls:'warn' });
    }
    if (meteo.temp <= 2) {
      conseils.push({ priority:2, icon:'🥶', msg:'Froid intense — Clientèle préfère le VTC aux transports en commun +30%', cls:'warn' });
    }
    if (meteo.temp >= 32) {
      conseils.push({ priority:1, icon:'🌡️', msg:'Canicule — Zones fraîches : centres commerciaux, hôtels ↑ demande', cls:'info' });
    }

    // ── Conseils vols ──────────────────────────────
    Object.entries(this.flightContexts).forEach(([airport, wins]) => {
      if (!wins.length) return;
      const closest = wins[0];
      if (closest.diffMin <= 20) {
        conseils.push({ priority:3, icon:'✈️', msg:`${airport} : Vol dans ${closest.diffMin}min — Positionnez-vous MAINTENANT`, cls:'danger' });
      } else if (closest.diffMin <= 45) {
        conseils.push({ priority:2, icon:'✈️', msg:`${airport} : ${wins.length} vol(s) à venir — Rejoindre dans ${closest.diffMin - 10}min`, cls:'warn' });
      }
      if (wins.some(w => w.delay > 20)) {
        conseils.push({ priority:2, icon:'⏱', msg:`${airport} : Retards en cours — Clients bloqués = courses garanties`, cls:'warn' });
      }
    });

    // ── Conseils horaires ──────────────────────────
    const isWeekday = day >= 1 && day <= 5;
    if (isWeekday && h >= 7 && h <= 9) {
      conseils.push({ priority:2, icon:'🌅', msg:'Rush matin : Gare du Nord · Gare de Lyon — Clients pro 12-20€/course', cls:'warn' });
    }
    if (isWeekday && h >= 11 && h <= 13) {
      conseils.push({ priority:1, icon:'🍽️', msg:'Heure déjeuner : Opéra · Châtelet · La Défense — Affaires rapides', cls:'info' });
    }
    if (isWeekday && h >= 17 && h <= 20) {
      conseils.push({ priority:2, icon:'🌆', msg:'Rush soir : La Défense + Gares — Pic de demande, positionnez-vous', cls:'warn' });
    }
    if (day === 5 && h >= 18) {
      conseils.push({ priority:3, icon:'🎉', msg:'Vendredi soir — Zone festive : Oberkampf, Bastille, République', cls:'danger' });
    }
    if ((day === 6 || day === 0) && h >= 1 && h <= 4) {
      conseils.push({ priority:3, icon:'🌙', msg:'Nuit festive — Grands Boulevards, Pigalle, Bastille : Surge actif', cls:'danger' });
    }

    // ── Conseils carburant ─────────────────────────
    const sp95 = fuel['SP95']?.prix;
    if (sp95 && sp95 > 1.95) {
      conseils.push({ priority:1, icon:'⛽', msg:`SP95 cher (${sp95.toFixed(3)}€) — Préférez les stations périphériques`, cls:'info' });
    }
    if (sp95 && sp95 < 1.75) {
      conseils.push({ priority:1, icon:'⛽', msg:`SP95 bas (${sp95.toFixed(3)}€) — Faites le plein maintenant !`, cls:'ok' });
    }

    // ── Conseils ratio perso ────────────────────────
    if (trips > 0) {
      const avg = gain / trips;
      if (avg < 8) {
        conseils.push({ priority:2, icon:'📊', msg:`Moyenne ${avg.toFixed(2)}€/course trop basse — Ciblez CDG/Orly (15-30€)`, cls:'warn' });
      } else if (avg > 20) {
        conseils.push({ priority:1, icon:'🚀', msg:`Excellente moyenne ${avg.toFixed(2)}€/course — Maintenez ces zones`, cls:'ok' });
      }
    }

    // ── Zones recommandées selon l'heure ───────────
    const zones = this.getOptimalZones(h, day, impact.score, this.flightContexts);
    if (zones.length) {
      conseils.push({ priority:2, icon:'📍', msg:`Zones prioritaires : ${zones.join(' · ')}`, cls:'gold' });
    }

    // Trier par priorité
    conseils.sort((a, b) => b.priority - a.priority);

    this.render(conseils.slice(0, 8));
  },

  getOptimalZones(h, day, meteoScore, flights) {
    const zones = [];
    // Aéroports si vols proches
    if (flights.CDG?.length) zones.push('CDG ✈️');
    if (flights.ORY?.length) zones.push('Orly ✈️');

    // Horaires
    if (h >= 6 && h <= 9)   zones.push('Gare du Nord', 'Gare de Lyon');
    if (h >= 9 && h <= 11)  zones.push('La Défense', 'Opéra');
    if (h >= 12 && h <= 14) zones.push('Châtelet', 'République');
    if (h >= 16 && h <= 19) zones.push('La Défense', 'Saint-Lazare');
    if (h >= 19 && h <= 22) zones.push('Oberkampf', 'Bastille');
    if (h >= 22 || h <= 5)  zones.push('Grands Boulevards', 'Pigalle');

    // Météo adverse = zones abritées
    if (meteoScore >= 2)    zones.splice(0, 0, 'Paris Centre 🌧');

    return zones.slice(0, 4);
  },

  render(conseils) {
    const containers = ['rush-conseils', 'ia-zones-container'];
    const html = conseils.map((c, i) => `
      <div class="list-item ${c.cls || 'info'}"
           style="border-radius:10px;margin-bottom:5px;
                  animation:slide-up-in .3s ease ${i * 0.06}s both;
                  display:flex;align-items:flex-start;gap:10px;">
        <span style="font-size:18px;flex-shrink:0;line-height:1.2;">${c.icon}</span>
        <span style="font-size:12px;font-weight:600;line-height:1.4;">${c.msg}</span>
      </div>`).join('');

    containers.forEach(id => {
      const cont = el(id);
      if (cont) cont.innerHTML = html;
    });
  },
};

// ═══════════════════════════════════════════════════════════════════
//  MODULE 5 — ONESIGNAL (Notifications push)
//  https://onesignal.com — Gratuit illimité
// ═══════════════════════════════════════════════════════════════════
const NOTIFS = {
  initialized: false,

  async init() {
    const appId = WOB_CONFIG.ONESIGNAL_APP_ID;
    if (!appId) return;

    try {
      // Le SDK est déjà chargé via <head> dans index.html
      // On attend qu'il soit prêt puis on s'y connecte
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      OneSignalDeferred.push(async function(OneSignal) {
        NOTIFS.initialized = true;
        LOG('OneSignal prêt ✅');

        // Écouter les clics sur notifications
        OneSignal.Notifications.addEventListener('click', (event) => {
          const data = event.notification?.additionalData;
          if (data?.screen) {
            if (typeof goTo === 'function') goTo(data.screen);
          }
        });
      });
    } catch (e) {
      ERR('OneSignal:', e.message);
    }
  },

  // Envoi unifié : OneSignal Service Worker si dispo, sinon notification native
  send(title, body, icon = '🚖') {
    const full = `${icon} ${title}`;
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type:'LOCAL_NOTIFICATION', title: full, body });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(full, { body, icon: '/favicon.ico' });
    }
  },

  // Alertes intelligentes
  rushAlert(zone, score) {
    if (score >= 3) this.send('RUSH DÉTECTÉ !', `Zone ${zone} — Surge probable. Positionnez-vous !`, '🔴');
    else if (score === 2) this.send('Activité élevée', `${zone} — Bonne période pour être actif`, '🟡');
  },

  flightAlert(airport, diffMin) {
    this.send(`Vol imminent — ${airport}`, `Atterrissage dans ${diffMin}min. Rejoignez la zone.`, '✈️');
  },

  meteoAlert(msg) { this.send('Alerte Météo', msg, '⛈'); },

  weatherBriefing(temp, desc) {
    this.send('Météo du jour', `${desc} · ${temp}° à Paris`, '🌤');
  },

  // Compat — ancienne référence
  local(title, body, icon = '🚖') { this.send(title, body, icon); },
};

// ═══════════════════════════════════════════════════════════════════
//  MODULE 6 — SUPABASE (Stockage cloud)
//  https://supabase.com — Gratuit 500MB + API REST
// ═══════════════════════════════════════════════════════════════════
const SUPA = {
  isConfigured() {
    const url = WOB_CONFIG.SUPABASE_URL;
    const key = WOB_CONFIG.SUPABASE_KEY;
    return !!(url && key && url.startsWith('https://') && key.length > 10);
  },

  headers() {
    return {
      'Content-Type':  'application/json',
      'apikey':        WOB_CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${WOB_CONFIG.SUPABASE_KEY}`,
    };
  },

  async save(userId = 'default') {
    if (!this.isConfigured()) {
      LOG('Supabase non configuré — sauvegarde locale uniquement');
      return false;
    }

    const payload = this.buildPayload(userId);
    try {
      const url = `${WOB_CONFIG.SUPABASE_URL}/rest/v1/wob_sessions?on_conflict=user_id`;
      const resp = await fetch(url, {
        method:  'POST',
        headers: { ...this.headers(), 'Prefer':'resolution=merge-duplicates' },
        body:    JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      LOG('Supabase: sauvegarde cloud OK');
      LS.set('wob_supabase_last_sync', new Date().toISOString());
      return true;
    } catch (e) {
      ERR('Supabase save:', e.message);
      return false;
    }
  },

  async restore(userId = 'default') {
    if (!this.isConfigured()) return null;
    try {
      const url = `${WOB_CONFIG.SUPABASE_URL}/rest/v1/wob_sessions?user_id=eq.${userId}&select=*`;
      const resp = await fetch(url, { headers: this.headers() });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const rows = await resp.json();
      if (!rows.length) return null;
      LOG('Supabase: données cloud restaurées');
      return rows[0];
    } catch (e) {
      ERR('Supabase restore:', e.message);
      return null;
    }
  },

  buildPayload(userId) {
    return {
      user_id:      userId,
      updated_at:   new Date().toISOString(),
      total_gain:   LS.get('wob_gain')     || '0',
      total_km:     LS.get('wob_km')       || '0',
      total_trips:  LS.get('wob_trips')    || '0',
      depenses:     LS.get('wob_depenses') || '[]',
      goals:        LS.get('wob_goals')    || '{}',
      profile_name: LS.get('wob_name')     || 'Billy',
      veh_modele:   LS.get('wob_veh_modele') || '',
      veh_type:     LS.get('wob_veh_type')   || 'essence',
      ia_report:    LS.get('wob_ia')         || '',
    };
  },

  // Instructions SQL pour créer la table Supabase
  getTableSQL() {
    return `
-- À exécuter dans l'éditeur SQL de votre projet Supabase :
CREATE TABLE IF NOT EXISTS wob_sessions (
  user_id      TEXT PRIMARY KEY,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  total_gain   TEXT DEFAULT '0',
  total_km     TEXT DEFAULT '0',
  total_trips  TEXT DEFAULT '0',
  depenses     JSONB DEFAULT '[]',
  goals        JSONB DEFAULT '{}',
  profile_name TEXT DEFAULT 'Billy',
  veh_modele   TEXT DEFAULT '',
  veh_type     TEXT DEFAULT 'essence',
  ia_report    TEXT DEFAULT ''
);
ALTER TABLE wob_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON wob_sessions FOR ALL USING (true);
    `.trim();
  },
};

// ═══════════════════════════════════════════════════════════════════
//  MODULE 7 — AUTO-SAVE 30s + CRASH RECOVERY
// ═══════════════════════════════════════════════════════════════════
const AUTOSAVE = {
  _timer:        null,
  _crashTimer:   null,
  _saveCount:    0,
  _lastSaveTime: 0,
  _isRecovering: false,

  // Démarrer le système d'auto-save
  start() {
    // Vérifier s'il y a une session crashée à récupérer
    this.checkCrashRecovery();

    // Marquer l'app comme "en cours" (pour détecter les crashs)
    this.markAlive();
    this._aliveTimer = setInterval(() => this.markAlive(), 5000);

    // Auto-save toutes les 30s
    this._timer = setInterval(() => this.save(), WOB_CONFIG.AUTOSAVE_INTERVAL);

    // Premier save immédiat après 3s
    setTimeout(() => this.save(), 3000);

    LOG('Auto-save démarré (30s)');
  },

  markAlive() {
    LS.set('wob_alive', Date.now().toString());
    LS.set('wob_crash_guard', JSON.stringify({
      ts:     Date.now(),
      gain:   LS.get('wob_gain')    || '0',
      km:     LS.get('wob_km')      || '0',
      trips:  LS.get('wob_trips')   || '0',
    }));
  },

  checkCrashRecovery() {
    const alive = parseInt(LS.get('wob_alive') || '0');
    const guard = LS.get('wob_crash_guard');
    if (!alive || !guard) return;

    const elapsed = Date.now() - alive;
    // Si l'app s'est fermée sans nettoyage depuis + de 2 min = crash potentiel
    if (elapsed > 2 * 60 * 1000) {
      LOG('Crash détecté, récupération automatique...');
      this._isRecovering = true;
      try {
        const data = JSON.parse(guard);
        // Vérifier si les données locales sont moins récentes
        const currGain = parseFloat(LS.get('wob_gain') || '0');
        const recGain  = parseFloat(data.gain);
        if (recGain > currGain) {
          LS.set('wob_gain',  data.gain);
          LS.set('wob_km',    data.km);
          LS.set('wob_trips', data.trips);
          LOG('Données récupérées:', data);
          this.showRecoveryBanner(data);
        }
      } catch (e) { ERR('Crash recovery:', e); }
      this._isRecovering = false;
    }

    // Tenter aussi une récupération Supabase
    this.tryCloudRecovery();
  },

  async tryCloudRecovery() {
    if (!SUPA.isConfigured()) return;
    try {
      const cloudData = await SUPA.restore();
      if (!cloudData) return;
      const cloudGain = parseFloat(cloudData.total_gain || '0');
      const localGain = parseFloat(LS.get('wob_gain') || '0');
      if (cloudGain > localGain) {
        LS.set('wob_gain',  cloudData.total_gain);
        LS.set('wob_km',    cloudData.total_km);
        LS.set('wob_trips', cloudData.total_trips);
        if (cloudData.depenses) LS.set('wob_depenses', JSON.stringify(cloudData.depenses));
        LOG('Données cloud récupérées');
        this.showRecoveryBanner(cloudData, true);
        if (typeof updateDashboard === 'function') updateDashboard();
      }
    } catch (e) { ERR('Cloud recovery:', e); }
  },

  async save() {
    this._saveCount++;
    this._lastSaveTime = Date.now();

    // 1. LocalStorage (toujours)
    const keys = [
      'wob_gain','wob_km','wob_trips','wob_sessions','wob_platforms',
      'wob_hours','wob_weekday','wob_depenses','wob_goals','wob_ia',
      'wob_name','wob_veh_modele','wob_veh_type','wob_conso','wob_prix',
      'wob_docs_history','wob_date_ct','wob_date_assurance','wob_date_vtc','wob_date_medical',
    ];
    const snapshot = {};
    keys.forEach(k => { const v = LS.get(k); if (v) snapshot[k] = v; });
    LS.set('wob_auto_backup', JSON.stringify({ ts: Date.now(), data: snapshot, version: 6 }));
    LS.set('wob_backup_ts', Date.now().toString());

    // Mettre à jour l'affichage
    const infoEl = el('backup-info');
    if (infoEl) {
      infoEl.textContent = `✅ Sauvegardé à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})} (${this._saveCount} saves)`;
    }

    // 2. Supabase (toutes les 5 saves = toutes les 2.5 min)
    if (this._saveCount % 5 === 0) {
      SUPA.save().then(ok => {
        if (ok) {
          const el2 = el('backup-info');
          if (el2) el2.textContent += ' · ☁️ Cloud sync';
        }
      });
    }
  },

  showRecoveryBanner(data, fromCloud = false) {
    const banner = document.createElement('div');
    banner.style.cssText = `
      position:fixed; top:60px; left:50%; transform:translateX(-50%);
      background:linear-gradient(135deg,#1a1900,#0a0a0e);
      border:1px solid rgba(212,168,67,0.5);
      border-radius:14px; padding:14px 20px; z-index:9999;
      box-shadow:0 8px 32px rgba(212,168,67,0.3);
      max-width:360px; width:90%; animation:slide-up-in .4s ease;
    `;
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:22px;">${fromCloud ? '☁️' : '💾'}</span>
        <div>
          <div style="font-weight:700;color:var(--gold);font-size:13px;">
            Session récupérée ${fromCloud ? 'depuis le cloud' : 'après crash'}
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,.6);margin-top:3px;">
            Gains: ${fmtEuro(parseFloat(data.gain || data.total_gain || 0))} · 
            Km: ${parseFloat(data.km || data.total_km || 0).toFixed(0)}
          </div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()"
                style="margin-left:auto;background:none;border:none;color:rgba(255,255,255,.4);font-size:18px;cursor:pointer;">×</button>
      </div>`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 6000);
  },

  // Nettoyage propre à la fermeture
  setupCleanExit() {
    window.addEventListener('beforeunload', () => {
      LS.set('wob_alive', '0'); // Marquer fermeture propre
      this.save();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save();
    });
  },
};

// ═══════════════════════════════════════════════════════════════════
//  MODULE 8 — CHART.JS PRO UPGRADES
//  Graphiques avancés avec annotations et tooltips riches
// ═══════════════════════════════════════════════════════════════════
const CHARTS_PRO = {
  // Plugin annotation (ligne objectif)
  annotationPlugin: {
    id: 'wobGoalLine',
    beforeDraw(chart, args, opts) {
      if (!opts.goal || !opts.goal.value) return;
      const { ctx, chartArea, scales } = chart;
      if (!scales.y) return;
      const y = scales.y.getPixelForValue(opts.goal.value);
      if (y < chartArea.top || y > chartArea.bottom) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(chartArea.right, y);
      ctx.strokeStyle = opts.goal.color || 'rgba(212,168,67,0.6)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.fillStyle = opts.goal.color || 'rgba(212,168,67,0.8)';
      ctx.font      = '10px DM Sans, sans-serif';
      ctx.fillText(opts.goal.label || 'Objectif', chartArea.left + 4, y - 4);
      ctx.restore();
    },
  },

  // Dégradé sous courbe
  createGradient(ctx, height, colorTop, colorBottom) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0,   colorTop);
    grad.addColorStop(1,   colorBottom);
    return grad;
  },

  // Options globales premium
  globalDefaults() {
    if (!window.Chart) return;
    Chart.defaults.font.family = "'DM Sans', sans-serif";
    Chart.defaults.font.size   = 11;
    Chart.defaults.color       = '#7a8499';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(12,12,18,0.96)';
    Chart.defaults.plugins.tooltip.borderColor     = 'rgba(212,168,67,0.3)';
    Chart.defaults.plugins.tooltip.borderWidth     = 1;
    Chart.defaults.plugins.tooltip.padding         = 10;
    Chart.defaults.plugins.tooltip.cornerRadius    = 10;
    Chart.defaults.plugins.tooltip.titleColor      = '#d4a843';
    Chart.defaults.plugins.tooltip.bodyColor       = '#e2e8f0';
    Chart.defaults.animation.duration              = 600;
    Chart.defaults.animation.easing               = 'easeInOutQuart';

    // Enregistrer le plugin objectif
    Chart.register(this.annotationPlugin);
    LOG('Chart.js Pro configuré');
  },

  // Graphique revenus 7 jours avec dégradé
  renderWeekChart(canvasId, sessions) {
    const cvs = el(canvasId);
    if (!cvs || !window.Chart) return;

    const ctx  = cvs.getContext('2d');
    const grad = this.createGradient(ctx, cvs.offsetHeight || 200,
      'rgba(212,168,67,0.4)', 'rgba(212,168,67,0.02)');

    const days  = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
    const vals  = new Array(7).fill(0);
    const gains = typeof state !== 'undefined' ? (state.sessions || []) : sessions || [];
    gains.forEach((s, i) => { vals[i % 7] += s.gain || 0; });

    const goal  = parseFloat(LS.get('wob_goals') ? JSON.parse(LS.get('wob_goals')).day || 0 : 0);

    return new Chart(cvs, {
      type:    'line',
      data: {
        labels:   days,
        datasets: [{
          label:           'Gains (€)',
          data:            vals,
          borderColor:     '#d4a843',
          backgroundColor: grad,
          fill:            true,
          tension:         0.45,
          borderWidth:     2.5,
          pointBackgroundColor:  '#d4a843',
          pointBorderColor:      '#0a0a0e',
          pointBorderWidth:      2,
          pointRadius:     5,
          pointHoverRadius: 8,
        }]
      },
      options: {
        responsive:           true,
        maintainAspectRatio:  false,
        plugins: {
          legend:  { display:false },
          wobGoalLine: goal ? { goal:{ value:goal, color:'rgba(212,168,67,0.5)', label:`Obj. ${goal}€` } } : {},
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.raw.toFixed(2)} €`,
            },
          },
        },
        scales: {
          y: { ticks:{ callback: v => `${v}€` }, grid:{ color:'rgba(255,255,255,0.04)' } },
          x: { grid:{ display:false } },
        },
      },
    });
  },
};

// ═══════════════════════════════════════════════════════════════════
//  ÉTAT GLOBAL PARTAGÉ
// ═══════════════════════════════════════════════════════════════════
const WOB_STATE = {
  meteoData:    null,
  meteoImpact:  null,
  fuelPrices:   null,
  flightWindows: {},
  lastFullLoad: 0,
};

// ═══════════════════════════════════════════════════════════════════
//  INJECTION DES CONTAINERS HTML (si absents)
//  Insère les sections dans les pages existantes
// ═══════════════════════════════════════════════════════════════════
function injectContainers() {
  // Trouver la page Rush/Accueil
  const rushScroll = document.querySelector('#screen-rush .screen-scroll') ||
                     document.querySelector('#screen-home .screen-scroll');

  if (rushScroll) {
    // Widget Météo (insérer après le rush-hero)
    if (!el('meteo-container')) {
      const div = document.createElement('div');
      div.className = 'card';
      div.style.marginBottom = '12px';
      div.innerHTML = `
        <div class="card-row-hd" style="margin-bottom:10px;">
          <span class="card-title">🌤 Météo & Impact VTC</span>
          <button class="btn-ghost-sm" onclick="METEO.load(state?.pos?.lat||48.8566, state?.pos?.lon||2.3522)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.93"/>
            </svg>
          </button>
        </div>
        <div id="meteo-container"><div class="list-item info">⏳ Chargement météo...</div></div>`;
      const heroCard = rushScroll.querySelector('.rush-hero,.hero-card');
      heroCard ? heroCard.after(div) : rushScroll.prepend(div);
    }

    // Widget Prix Carburant
    if (!el('carbu-container')) {
      const div = document.createElement('div');
      div.className = 'card';
      div.style.marginBottom = '12px';
      div.innerHTML = `
        <div class="card-row-hd" style="margin-bottom:10px;">
          <span class="card-title">⛽ Prix Carburant — Autour de vous</span>
          <button class="btn-ghost-sm" onclick="CARBURANT.load(state?.pos?.lat||48.8566, state?.pos?.lon||2.3522)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.93"/>
            </svg>
          </button>
        </div>
        <div id="carbu-container"><div class="list-item info">⏳ Chargement...</div></div>`;
      rushScroll.append(div);
    }

    // Widget Vols
    if (!el('flights-cdg')) {
      const div = document.createElement('div');
      div.className = 'card';
      div.style.marginBottom = '12px';
      div.innerHTML = `
        <div style="margin-bottom:10px;">
          <div class="card-row-hd">
            <span class="card-title">✈️ Vols en temps réel</span>
            <div style="display:flex;gap:6px;">
              <button class="ef-btn active" onclick="selectAirport('CDG',this)">CDG</button>
              <button class="ef-btn" onclick="selectAirport('ORY',this)">Orly</button>
              <button class="ef-btn" onclick="selectAirport('BVA',this)">BVA</button>
            </div>
          </div>
          <div style="display:flex;gap:6px;margin-top:8px;">
            <button class="ef-btn active" onclick="selectFlightType('arr',this)" id="ft-arr">Arrivées</button>
            <button class="ef-btn" onclick="selectFlightType('dep',this)" id="ft-dep">Départs</button>
          </div>
        </div>
        <div id="flights-cdg"></div>
        <div id="flights-ory" style="display:none;"></div>
        <div id="flights-bva" style="display:none;"></div>`;
      rushScroll.append(div);
    }
  }

  // Container IA Zones stratégiques (page home)
  const homeScroll = document.querySelector('#screen-home .screen-scroll');
  if (homeScroll && !el('ia-zones-container')) {
    const iaCard = homeScroll.querySelector('.ia-card');
    if (iaCard) {
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `
        <div class="card-row-hd" style="margin-bottom:8px;">
          <span class="card-title">📍 Zones & Conseils IA temps réel</span>
          <button class="btn-ghost-sm" onclick="IA_ZONES.buildAdvice()">⟳</button>
        </div>
        <div id="ia-zones-container">
          <div class="list-item info">⏳ Analyse en cours...</div>
        </div>`;
      iaCard.after(div);
    }
  }

  // Section config APIs supprimée — clés intégrées directement dans le code
}

// ─────────────────────────────────────────────────────────────────
//  Fonctions de navigation vols
// ─────────────────────────────────────────────────────────────────
let _currentAirport = 'CDG';
let _currentFlightType = 'arr';

window.selectAirport = function(code, btn) {
  _currentAirport = code;
  document.querySelectorAll('.ef-btn').forEach(b => {
    if (b.textContent.trim() === 'CDG' || b.textContent.trim() === 'Orly' || b.textContent.trim() === 'BVA') {
      b.classList.remove('active');
    }
  });
  btn?.classList.add('active');

  ['cdg','ory','bva'].forEach(a => {
    const d = el(`flights-${a}`);
    if (d) d.style.display = a === code.toLowerCase() ? '' : 'none';
  });

  // Charger si vide
  const target = el(`flights-${code.toLowerCase()}`);
  if (target && !target.children.length) {
    if (_currentFlightType === 'arr') AVIATION.loadArrivals(code);
    else AVIATION.loadDepartures(code);
  }
};

window.selectFlightType = function(type, btn) {
  _currentFlightType = type;
  el('ft-arr')?.classList.toggle('active', type === 'arr');
  el('ft-dep')?.classList.toggle('active', type === 'dep');
  if (type === 'arr') AVIATION.loadArrivals(_currentAirport);
  else AVIATION.loadDepartures(_currentAirport);
};

// ═══════════════════════════════════════════════════════════════════
//  CSS INJECTÉ (météo card, styles)
// ═══════════════════════════════════════════════════════════════════
function injectCSS() {
  const style = document.createElement('style');
  style.textContent = `
    /* ── Météo card ── */
    .meteo-top { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
    .meteo-temp { font-size:48px; font-weight:800; line-height:1; letter-spacing:-2px; color:var(--gold); }
    .meteo-desc { font-size:14px; font-weight:600; margin-top:4px; }
    .meteo-feel { font-size:11px; color:var(--text-dim); margin-top:2px; }
    .meteo-details { display:flex; flex-direction:column; gap:6px; }
    .md-item { font-size:12px; color:var(--text-dim); background:rgba(255,255,255,.04);
               padding:4px 10px; border-radius:20px; white-space:nowrap; }
    .meteo-forecast { display:flex; gap:8px; margin-top:14px; }
    .mf-day { flex:1; background:rgba(255,255,255,.04); border-radius:12px; padding:10px 6px;
              text-align:center; border:1px solid rgba(255,255,255,.06); }
    .mf-name { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--text-dim); }
    .mf-ico  { font-size:20px; margin:6px 0; }
    .mf-temps{ display:flex; gap:4px; justify-content:center; font-size:11px; font-weight:700; }
    .weather-badge {
      display:inline-flex; align-items:center; gap:4px;
      padding:3px 8px; border-radius:20px; font-size:11px; font-weight:700;
      background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
    }
    .weather-badge.danger { background:rgba(255,77,106,.15); border-color:rgba(255,77,106,.3); color:#ff4d6a; }
    .weather-badge.warn   { background:rgba(255,193,7,.15);  border-color:rgba(255,193,7,.3);  color:#ffc107; }
    .weather-badge.ok     { background:rgba(45,212,160,.12); border-color:rgba(45,212,160,.3); color:#2dd4a0; }
    .list-item.gold { background:rgba(212,168,67,.08); border-left:3px solid var(--gold); }
  `;
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════════
//  INITIALISATION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════
function initAPIs() {
  LOG('Initialisation APIs WOB v6.0');

  injectCSS();
  injectContainers();

  // Chart.js global defaults
  if (window.Chart) CHARTS_PRO.globalDefaults();
  else window.addEventListener('load', () => { if (window.Chart) CHARTS_PRO.globalDefaults(); });

  // Démarrer auto-save + crash recovery
  AUTOSAVE.start();
  AUTOSAVE.setupCleanExit();

  // Charger toutes les données temps réel
  const pos = (window.state && window.state.pos) ? window.state.pos : { lat:48.8566, lon:2.3522 };
  METEO.load(pos.lat, pos.lon);
  CARBURANT.load(pos.lat, pos.lon);
  AVIATION.loadArrivals('CDG');
  AVIATION.loadArrivals('ORY');

  // OneSignal supprimé — notifications natives du navigateur utilisées à la place

  // Construire les conseils IA après 2s (le temps que tout charge)
  setTimeout(() => IA_ZONES.buildAdvice(), 2000);

  // Rafraîchissement auto
  setInterval(() => {
    const p = (window.state && window.state.pos) ? window.state.pos : { lat:48.8566, lon:2.3522 };
    METEO.load(p.lat, p.lon);
  }, WOB_CONFIG.CACHE_TTL.meteo);

  setInterval(() => {
    const p = (window.state && window.state.pos) ? window.state.pos : { lat:48.8566, lon:2.3522 };
    CARBURANT.load(p.lat, p.lon);
  }, WOB_CONFIG.CACHE_TTL.carbu);

  setInterval(() => {
    AVIATION.loadArrivals('CDG');
    AVIATION.loadArrivals('ORY');
  }, WOB_CONFIG.CACHE_TTL.flights);

  // Recalculer les conseils IA toutes les 5 min
  setInterval(() => IA_ZONES.buildAdvice(), 5 * 60 * 1000);

  // Mettre à jour si GPS change
  // GPS update on position change
  let _lastGpsLat = 0;
  setInterval(() => {
    const s = window.state;
    if (s && s.gpsReady && Math.abs(s.pos.lat - _lastGpsLat) > 0.01) {
      _lastGpsLat = s.pos.lat;
      METEO.load(s.pos.lat, s.pos.lon);
      CARBURANT.load(s.pos.lat, s.pos.lon);
    }
  }, 60000);

  LOG('APIs initialisées ✅');
}

// Lancer après que l'app principale soit prête
if (document.readyState === 'complete') {
  setTimeout(initAPIs, 1500);
} else {
  window.addEventListener('load', () => setTimeout(initAPIs, 1500));
}

// Exposer les modules globalement
window.METEO      = METEO;
window.CARBURANT  = CARBURANT;
window.AVIATION   = AVIATION;
window.IA_ZONES   = IA_ZONES;
window.NOTIFS     = NOTIFS;
window.SUPA       = SUPA;
window.AUTOSAVE   = AUTOSAVE;
window.CHARTS_PRO = CHARTS_PRO;
window.WOB_CONFIG = WOB_CONFIG;
window.WOB_STATE  = WOB_STATE;
