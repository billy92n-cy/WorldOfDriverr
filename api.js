// ═══════════════════════════════════════════════════════════════════
//  WOB API INTEGRATIONS v7.0 — WorldOfDriver
//  Open-Météo · Prix Carburant France · TomTom Traffic · Sytadin
//  Navitia Transport Alerts · Open Data ADP (Vols)
//  Chart.js Pro · Supabase · Auto-Save 30s · IA Zones
//
//  ⚙️  CLÉS API GRATUITES — CONFIGUREZ ICI :
//    TOMTOM_KEY   → https://developer.tomtom.com  (free: 2500 req/jour)
//    NAVITIA_KEY  → https://navitia.io             (free: inscription gratuite)
//    SUPABASE_URL → https://supabase.com           (gratuit 500MB)
//    SUPABASE_KEY → votre clé anon publique
//
//  STRATÉGIE CACHE : Toutes les APIs limitées sont cachées ≥ 1h
//  pour rester dans les quotas gratuits.
// ═══════════════════════════════════════════════════════════════════

"use strict";

// ─────────────────────────────────────────────────────────────────
//  ⚙️  CONFIGURATION
// ─────────────────────────────────────────────────────────────────
const WOB_CONFIG = {
  // TomTom Traffic — https://developer.tomtom.com (2500 req/jour gratuit)
  TOMTOM_KEY: 'rLeU77arHeM5CXEUmuEF8fN7Up9I9Awk',

  // IDFM PRIM — https://prim.iledefrance-mobilites.fr
  // ▶ Collez ici votre clé IDF Mobilités (obtenue sur prim.iledefrance-mobilites.fr)
  IDFM_KEY: 'odFJa9ooMgc5hHcNLGBAIfhMheIQZqUi',

  // Navitia legacy (clé expirée — remplacée par PRIM ci-dessus)
  NAVITIA_KEY: 'tmvRLg8J6MvXpjTFKOuqxwlIJ7oMtFtt',

  // Supabase — clés intégrées
  SUPABASE_URL: 'https://ewdbcvygplepjefmpyap.supabase.co',
  SUPABASE_KEY: 'sb_publishable_p9s8AJ4KNBIEYd5vT4h3Dw_MDQjLwJY',

  // Aéroports IDF surveillés (Open Data ADP — 100% gratuit, sans clé)
  AIRPORTS: [
    { code: 'CDG', name: 'Charles de Gaulle', lat: 49.0097, lon: 2.5479 },
    { code: 'ORY', name: 'Orly',              lat: 48.7262, lon: 2.3695 },
  ],

  // Routes stratégiques VTC Paris pour calcul trafic
  ROUTES_VTC: [
    { id: 'cdg_paris',   name: 'CDG → Paris Centre',   from: '49.0097,2.5479',  to: '48.8566,2.3522' },
    { id: 'ory_paris',   name: 'Orly → Paris Centre',  from: '48.7262,2.3695',  to: '48.8566,2.3522' },
    { id: 'defla_gdn',   name: 'La Défense → Gare du Nord', from: '48.8918,2.2380', to: '48.8809,2.3553' },
    { id: 'paris_versailles', name: 'Paris → Versailles', from: '48.8566,2.3522', to: '48.8049,2.1204' },
  ],

  // TTL cache — optimisé pour rester dans les quotas gratuits
  CACHE_TTL: {
    meteo:      30 * 60 * 1000,  // 30 min  (API sans limite)
    carbu:      60 * 60 * 1000,  // 1h      (API sans limite)
    traffic:    20 * 60 * 1000,  // 20 min  (TomTom 2500/jour → ~2 req/heure max)
    sytadin:    15 * 60 * 1000,  // 15 min  (Open Data IDF — sans limite)
    flights:    60 * 60 * 1000,  // 1h      (Open Data ADP — sans limite officielle)
    navitia:    30 * 60 * 1000,  // 30 min  (Navitia free tier)
    events:     30 * 60 * 1000,  // 30 min
  },

  // Intervalles de rafraîchissement auto
  REFRESH: {
    meteo:    30 * 60 * 1000,
    carbu:    60 * 60 * 1000,
    traffic:  20 * 60 * 1000,
    flights:  60 * 60 * 1000,
    navitia:  30 * 60 * 1000,
  },

  AUTOSAVE_INTERVAL: 30 * 1000,
};

// ─────────────────────────────────────────────────────────────────
//  🔧  HELPERS GLOBAUX
// ─────────────────────────────────────────────────────────────────
const LS  = { get: k => localStorage.getItem(k), set: (k,v) => { try { localStorage.setItem(k,v); } catch(e){} } };
const LOG = (...a) => console.log('%c[WOD API]', 'color:#d4a843;font-weight:bold', ...a);
const ERR = (...a) => console.warn('%c[WOD ERR]', 'color:#ff4d6a;font-weight:bold', ...a);

function getCached(key, ttl) {
  try {
    const val = LS.get(key);
    const ts  = parseInt(LS.get(key + '_ts') || '0');
    if (val && Date.now() - ts < ttl) return JSON.parse(val);
  } catch(e) {}
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
function showToastAPI(msg) { if (typeof showToast === 'function') showToast(msg); }

// Vérifier si une clé API est configurée (non placeholder)
function isKeySet(key) {
  return key && key.length > 10 && !key.startsWith('VOTRE_') && !key.startsWith('YOUR_') && key !== 'undefined' && key !== 'null' && key !== '';
}

// ═══════════════════════════════════════════════════════════════════
//  MODULE 1 — OPEN-MÉTÉO (100% gratuit, sans clé)
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
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setCache('wob_meteo', data);
      this.render(data);
    } catch (e) {
      ERR('Météo:', e.message);
      const c = getCached('wob_meteo', Infinity);
      if (c) this.render(c); else this.renderError();
    }
  },

  getVTCImpact(code, wind, precip) {
    if ([95,96,99].includes(code)) return { cls:'danger', msg:'⛈ Orage — Surge +40% demande attendue !', score:3 };
    if ([61,63,65,80,81,82].includes(code) || precip > 2) return { cls:'warn', msg:'🌧 Pluie — Demande VTC +25%', score:2 };
    if (wind > 50) return { cls:'warn', msg:'💨 Vent fort — Évitez bords Seine', score:2 };
    if ([71,73,75].includes(code)) return { cls:'danger', msg:'❄️ Neige — Trafic perturbé, clientèle captive !', score:3 };
    if ([45,48].includes(code)) return { cls:'warn', msg:'🌫 Brouillard — Conduisez prudemment', score:1 };
    if (code === 0) return { cls:'ok', msg:'☀️ Beau temps — Demande normale', score:0 };
    return { cls:'info', msg:'🌤 Météo stable', score:0 };
  },

  render(data) {
    const c = data.current; const d0 = data.daily; const h = data.hourly;
    if (!c) return;
    const code = c.weather_code, temp = Math.round(c.temperature_2m),
          feel = Math.round(c.apparent_temperature), wind = Math.round(c.wind_speed_10m),
          precip = c.precipitation || 0, humid = c.relative_humidity_2m,
          desc = this.WMO_CODES[code] || '🌤 Variable',
          impact = this.getVTCImpact(code, wind, precip);
    const nextHours = [];
    if (h) {
      for (let i = 0; i < 12; i++) {
        const t = new Date(h.time[i]), pct = h.precipitation_probability?.[i] || 0;
        if (pct > 30) nextHours.push({ h: t.getHours(), pct });
      }
    }
    const html = `
      <div class="meteo-card">
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
        <div class="list-item ${impact.cls}" style="margin-top:10px;border-radius:10px;font-weight:700;">${impact.msg}</div>
        ${nextHours.length ? `<div style="margin-top:8px;font-size:11px;color:var(--text-dim);">🌧 Risque pluie : ${nextHours.slice(0,3).map(x=>`${x.h}h (${x.pct}%)`).join(' · ')}</div>` : ''}
        ${d0 ? `<div class="meteo-forecast">${[0,1,2].map(i => {
          const dayName = i===0?'Auj.':(i===1?'Dem.':new Date(d0.time[i]).toLocaleDateString('fr-FR',{weekday:'short'}));
          return `<div class="mf-day">
            <div class="mf-name">${dayName}</div>
            <div class="mf-ico">${(this.WMO_CODES[d0.weather_code[i]]||'🌤').split(' ')[0]}</div>
            <div class="mf-temps"><span style="color:var(--gold)">${Math.round(d0.temperature_2m_max[i])}°</span> <span style="color:var(--text-dim)">${Math.round(d0.temperature_2m_min[i])}°</span></div>
            <div style="font-size:9px;color:#3b82f6;">${d0.precipitation_probability_max?.[i]||0}%💧</div>
          </div>`;
        }).join('')}</div>` : ''}
      </div>`;
    ['meteo-container','meteo-rush-widget'].forEach(id => { const c = el(id); if (c) c.innerHTML = html; });
    this.updateWeatherBadge(temp, desc, impact);
    WOB_STATE.meteoImpact = impact;
    WOB_STATE.meteoData   = { temp, wind, code, precip };
  },

  updateWeatherBadge(temp, desc, impact) {
    const badge = el('weather-badge');
    if (!badge) return;
    badge.innerHTML = `${desc.split(' ')[0]} ${temp}°`;
    badge.className = `weather-badge ${impact.cls}`;
  },

  renderError() {
    ['meteo-container','meteo-rush-widget'].forEach(id => {
      const c = el(id); if (c) c.innerHTML = `<div class="list-item info">🌤 Météo indisponible</div>`;
    });
  },
};

// ═══════════════════════════════════════════════════════════════════
//  MODULE 2 — PRIX CARBURANT (gouvernemental, gratuit)
// ═══════════════════════════════════════════════════════════════════
const CARBURANT = {
  TYPES: { 'Gazole':'diesel','SP95':'essence','SP98':'essence','E10':'essence','GPLc':'gpl','E85':'ethanol' },

  async load(lat = 48.8566, lon = 2.3522) {
    const cached = getCached('wob_carbu', WOB_CONFIG.CACHE_TTL.carbu);
    if (cached) { this.render(cached); return; }
    try {
      const idfWhere  = `region_name="Ile-de-France" AND prix_valeur > 0`;
      const geoWhere  = `distance(geom, geom'POINT(${lon} ${lat})', 8000m) AND prix_valeur > 0`;
      const select    = 'adresse,ville,prix_valeur,prix_nom';
      // URLs ordonnées par fiabilité — audit endpoints juin 2026
      const URLS = [
        // ★ Principal — instantané v2, CORS OK, mis à jour toutes 10min
        `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?where=${encodeURIComponent(geoWhere)}&limit=40&select=${select}`,
        // Fallback IDF (sans filtre géo précis)
        `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?where=${encodeURIComponent(idfWhere)}&limit=80&select=${select}`,
        // Fallback v1 sans suffixe (alias stable sur certaines régions)
        `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane/records?where=${encodeURIComponent(idfWhere)}&limit=80&select=${select}`,
        // Fallback données consolidées hebdo (dataset stable, sans filtre géo)
        `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix_des_carburants_en_france/records?where=${encodeURIComponent(idfWhere)}&limit=80&select=${select}`,
      ];
      let data = null;
      for (const url of URLS) {
        try {
          const ctrl = new AbortController();
          const tid  = setTimeout(() => ctrl.abort(), 12000);
          const resp = await fetch(url, {
            signal: ctrl.signal,
            headers: { 'Accept': 'application/json', 'Origin': window.location.origin },
          });
          clearTimeout(tid);
          if (!resp.ok) {
            ERR('Carburant HTTP', resp.status, url.slice(60, 100));
            continue;
          }
          const d = await resp.json();
          if (d.results?.length >= 1) {
            data = d;
            LOG('Carburant OK:', d.results.length, 'stations');
            break;
          }
        } catch(e) { ERR('Carburant URL:', e.message); }
      }
      if (!data) throw new Error('Toutes URLs carburant échouées');
      setCache('wob_carbu', data.results || []);
      this.render(data.results || []);
    } catch (e) {
      ERR('Carburant:', e.message);
      const c = getCached('wob_carbu', Infinity); // cache expiré en dernier recours
      if (c) this.render(c); else this.renderFallback();
    }
  },

  render(stations) {
    const cont = el('carbu-container'); if (!cont) return;
    if (!stations.length) { cont.innerHTML = `<div class="list-item info">Aucune station dans 8km.</div>`; return; }
    const best = {};
    stations.forEach(s => {
      if (!s.prix_nom || !s.prix_valeur) return;
      const prix = parseFloat(s.prix_valeur);
      if (!best[s.prix_nom] || prix < best[s.prix_nom].prix)
        best[s.prix_nom] = { prix, adresse:`${s.adresse||''}, ${s.ville||''}` };
    });
    const vehType = LS.get('wob_veh_type') || 'essence';
    const fuelMap = { essence:['SP95','SP98','E10'], diesel:['Gazole'], gpl:['GPLc'], electric:[], hybrid:['SP95','E10'] };
    (fuelMap[vehType] || ['SP95']).forEach(t => {
      if (best[t]) {
        const prev = parseFloat(LS.get('wob_prix') || '0'), curr = best[t].prix;
        if (Math.abs(prev - curr) > 0.02) { LS.set('wob_prix', curr.toFixed(3)); showToastAPI(`⛽ ${t} mis à jour: ${curr.toFixed(3)}€/L`); }
      }
    });
    const icons = { Gazole:'⚫', SP95:'🔴', SP98:'🔴', E10:'🟡', GPLc:'🟢', E85:'🟠' };
    cont.innerHTML = `
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-dim);margin-bottom:8px;">MEILLEURS PRIX AUTOUR DE VOUS</div>
      ${Object.entries(best).map(([nom, info]) => `
        <div class="list-item ok" style="display:flex;justify-content:space-between;align-items:center;border-radius:10px;margin-bottom:4px;">
          <div><span style="font-weight:700;">${icons[nom]||'⛽'} ${nom}</span>
          <div style="font-size:10px;color:var(--text-dim);">${info.adresse.trim().replace(/^,\s*/,'')}</div></div>
          <span style="font-size:16px;font-weight:800;color:var(--gold);">${info.prix.toFixed(3)}€</span>
        </div>`).join('')}
      <div style="font-size:10px;color:var(--text-muted);text-align:right;">${stations.length} stations · ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>`;
    WOB_STATE.fuelPrices = best;
  },

  renderFallback() {
    const cont = el('carbu-container'); if (!cont) return;
    cont.innerHTML = `
      <div class="list-item warn" style="font-size:11px;border-radius:8px;margin-bottom:8px;">⚠️ API carburant indisponible — Prix de référence IDF</div>
      ${[['🔴','SP95','1.839'],['🔴','SP98','1.982'],['⚫','Gazole','1.719'],['🟡','E10','1.789'],['🟠','E85','0.899'],['🟢','GPLc','0.869']].map(([ico,nom,prix]) => `
        <div class="list-item ok" style="display:flex;justify-content:space-between;align-items:center;border-radius:10px;margin-bottom:4px;">
          <div><span style="font-weight:700;">${ico} ${nom}</span><div style="font-size:10px;color:var(--text-dim);">Île-de-France · référence</div></div>
          <span style="font-size:16px;font-weight:800;color:var(--gold);">${prix}€</span>
        </div>`).join('')}`;
  },
};

// ═══════════════════════════════════════════════════════════════════
//  MODULE 3 — TRAFIC ROUTIER : TOMTOM + SYTADIN
//  TomTom: 2500 req/jour gratuit → cache 20min (max ~72/jour)
//  Sytadin: Open Data IDFM gratuit, sans clé
// ═══════════════════════════════════════════════════════════════════
const TRAFFIC = {
  // Seuils embouteillages (rapport vitesse actuelle / normale)
  CONGESTION_LEVELS: [
    { ratio: 0.85, cls: 'ok',     label: '🟢 Fluide',           score: 0 },
    { ratio: 0.65, cls: 'info',   label: '🟡 Circulation dense', score: 1 },
    { ratio: 0.45, cls: 'warn',   label: '🟠 Ralentissement',    score: 2 },
    { ratio: 0.0,  cls: 'danger', label: '🔴 Embouteillage',     score: 3 },
  ],

  getCongestionLevel(currentSpeed, freeFlowSpeed) {
    const ratio = freeFlowSpeed > 0 ? currentSpeed / freeFlowSpeed : 1;
    for (const lvl of this.CONGESTION_LEVELS) {
      if (ratio >= lvl.ratio) return { ...lvl, ratio };
    }
    return this.CONGESTION_LEVELS[this.CONGESTION_LEVELS.length - 1];
  },

  // ── TomTom Traffic Flow (1 req = 1 point de trafic) ──
  async loadTomTom(lat = 48.8566, lon = 2.3522) {
    if (!isKeySet(WOB_CONFIG.TOMTOM_KEY)) {
      LOG('TomTom: clé non configurée — mode Sytadin uniquement');
      return null;
    }
    const cacheKey = 'wob_tomtom_flow';
    const cached = getCached(cacheKey, WOB_CONFIG.CACHE_TTL.traffic);
    if (cached) return cached;

    try {
      // 1 seule requête = 1 point de trafic centré sur la position (~économique)
      const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/18/json?point=${lat},${lon}&key=${WOB_CONFIG.TOMTOM_KEY}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) throw new Error(`TomTom HTTP ${resp.status}`);
      const data = await resp.json();
      const flow = data.flowSegmentData;
      if (!flow) throw new Error('Pas de données trafic');
      const result = {
        currentSpeed:  flow.currentSpeed,
        freeFlowSpeed: flow.freeFlowSpeed,
        currentTravelTime: flow.currentTravelTime,
        freeFlowTravelTime: flow.freeFlowTravelTime,
        confidence: flow.confidence,
        roadClosure: flow.roadClosure || false,
        ts: Date.now(),
      };
      setCache(cacheKey, result);
      LOG('TomTom flow OK:', result.currentSpeed, 'km/h vs', result.freeFlowSpeed, 'km/h normal');
      return result;
    } catch(e) {
      ERR('TomTom:', e.message);
      return getCached('wob_tomtom_flow', Infinity); // fallback cache expiré
    }
  },

  // ── TomTom Routing avec trafic (calcul ETA réel avec embouteillages) ──
  async calcRouteTomTom(fromLatLon, toLatLon, routeLabel) {
    if (!isKeySet(WOB_CONFIG.TOMTOM_KEY)) return null;
    const cacheKey = `wob_route_${fromLatLon}_${toLatLon}`.replace(/[,\.]/g, '_');
    const cached = getCached(cacheKey, WOB_CONFIG.CACHE_TTL.traffic);
    if (cached) return cached;
    try {
      const url = `https://api.tomtom.com/routing/1/calculateRoute/${fromLatLon}:${toLatLon}/json?traffic=true&travelMode=car&key=${WOB_CONFIG.TOMTOM_KEY}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const leg = data.routes?.[0]?.legs?.[0]?.summary;
      if (!leg) throw new Error('Pas de route');
      const result = {
        label: routeLabel,
        distanceKm: (leg.lengthInMeters / 1000).toFixed(1),
        etaMin:     Math.round(leg.travelTimeInSeconds / 60),
        etaNoTrafficMin: Math.round(leg.noTrafficTravelTimeInSeconds / 60),
        delayMin:   Math.round((leg.travelTimeInSeconds - leg.noTrafficTravelTimeInSeconds) / 60),
        departureTime: leg.departureTime,
        arrivalTime:   leg.arrivalTime,
        ts: Date.now(),
      };
      setCache(cacheKey, result);
      return result;
    } catch(e) {
      ERR('TomTom Route:', e.message);
      return null;
    }
  },

  // ── Sytadin / Open Data IDFM — Indice de trafic Île-de-France (gratuit, sans clé) ──
  async loadSytadin() {
    const cached = getCached('wob_sytadin', WOB_CONFIG.CACHE_TTL.sytadin);
    if (cached) { this.renderSytadin(cached); return cached; }
    try {
      // API Open Data IDF Mobilités — perturbations réseau (dataset stable, remplace etat-du-reseau-routier supprimé)
      const url = 'https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/perturbations-en-temps-reel-sur-le-reseau-ferre/records?limit=10&select=ligne,type_perturbation,message&order_by=date_debut+desc';
      const resp = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'Accept': 'application/json' } });
      if (!resp.ok) throw new Error(`Sytadin HTTP ${resp.status}`);
      const data = await resp.json();
      const result = { records: data.results || [], ts: Date.now(), source: 'idfm' };
      setCache('wob_sytadin', result);
      this.renderSytadin(result);
      return result;
    } catch(e) {
      ERR('Sytadin IDFM:', e.message);
      // Fallback: indice trafic Sytadin via proxy CORS alternatif
      return await this.loadSytadinAlt();
    }
  },

  async loadSytadinAlt() {
    try {
      // Fallback direct sans requête externe — opendata.paris.fr bloque le CORS navigateur
      // On passe directement à l'indice synthétique (fiable, pas de quota)
      const cached = getCached('wob_sytadin', Infinity);
      if (cached) { this.renderSytadin(cached); return cached; }
      // Indice calculé localement par heure (simulation réaliste)
      const synth = this.buildSyntheticTrafficIndex();
      this.renderSytadin(synth);
      return synth;
    } catch(e) {
      const synth = this.buildSyntheticTrafficIndex();
      this.renderSytadin(synth);
      return synth;
    }
  },

  // Indice trafic synthétique basé sur l'heure (réaliste pour IDF)
  buildSyntheticTrafficIndex() {
    const h = new Date().getHours(), day = new Date().getDay();
    const isWeekday = day >= 1 && day <= 5;
    let index = 2; // 1=fluide, 2=normal, 3=dense, 4=bouché, 5=très bouché
    if (isWeekday) {
      if (h >= 7 && h <= 9)   index = 4; // rush matin
      else if (h >= 17 && h <= 20) index = 5; // rush soir
      else if (h >= 12 && h <= 14) index = 3; // déjeuner
      else if (h >= 9 && h <= 12)  index = 2;
      else if (h >= 14 && h <= 17) index = 2;
      else index = 1;
    } else {
      if (h >= 14 && h <= 19) index = 3; // WE après-midi
      else index = 1;
    }
    const labels = ['','🟢 Fluide','🟡 Normal','🟠 Dense','🔴 Ralenti','🚨 Très chargé'];
    const cls    = ['','ok','info','warn','danger','danger'];
    return { synthetic: true, index, label: labels[index], cls: cls[index], ts: Date.now() };
  },

  renderSytadin(data) {
    const cont = el('sytadin-container'); if (!cont) return;
    if (data.synthetic) {
      cont.innerHTML = `
        <div class="list-item ${data.cls}" style="border-radius:10px;font-weight:700;font-size:13px;">
          ${data.label} — Trafic IDF estimé
        </div>
        <div style="font-size:10px;color:var(--text-dim);margin-top:6px;">
          📡 Basé sur l'analyse horaire • Rechargez dans ${Math.round((WOB_CONFIG.CACHE_TTL.sytadin - (Date.now() - data.ts)) / 60000)}min
        </div>`;
    } else {
      const records = data.records || [];
      const count = records.length;
      cont.innerHTML = `
        <div class="list-item info" style="border-radius:10px;">
          📡 ${count} segment(s) routier(s) IDF surveillés
        </div>
        <div style="font-size:10px;color:var(--text-dim);margin-top:6px;">Source: Open Data IDFM · ${new Date(data.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>`;
    }
    WOB_STATE.trafficIndex = data;
  },

  // ── Chargement principal : TomTom + routes clés + Sytadin ──
  async load() {
    const cont = el('traffic-container');
    if (!cont) { this._injectContainer(); }

    const pos = (window.state?.gpsReady ? window.state.pos : null) || { lat: 48.8566, lon: 2.3522 };

    // 1. Indice trafic local via TomTom
    const flow = await this.loadTomTom(pos.lat, pos.lon);

    // 2. Données Sytadin / IDFM
    const sytadin = await this.loadSytadin();

    // 3. Calcul routes VTC clés (seulement si TomTom configuré)
    let routes = [];
    if (isKeySet(WOB_CONFIG.TOMTOM_KEY)) {
      const routePromises = WOB_CONFIG.ROUTES_VTC.map(r =>
        this.calcRouteTomTom(r.from, r.to, r.name)
      );
      routes = (await Promise.allSettled(routePromises))
        .map(r => r.status === 'fulfilled' ? r.value : null)
        .filter(Boolean);
    }

    this.render(flow, sytadin, routes);
  },

  render(flow, sytadin, routes) {
    const cont = el('traffic-container'); if (!cont) return;

    // Bloc trafic local (TomTom ou synthétique)
    let flowHtml = '';
    if (flow && flow.currentSpeed != null) {
      const lvl = this.getCongestionLevel(flow.currentSpeed, flow.freeFlowSpeed);
      const delayRatio = flow.freeFlowTravelTime > 0
        ? Math.round((flow.currentTravelTime - flow.freeFlowTravelTime) / 60)
        : 0;
      flowHtml = `
        <div class="list-item ${lvl.cls}" style="border-radius:10px;font-weight:700;margin-bottom:6px;">
          ${lvl.label} — ${flow.currentSpeed} km/h <span style="font-size:10px;font-weight:400;">(normal: ${flow.freeFlowSpeed} km/h)</span>
        </div>
        ${delayRatio > 2 ? `<div class="list-item warn" style="border-radius:8px;margin-bottom:6px;font-size:11px;">⏱ Retard estimé : +${delayRatio} min sur votre position</div>` : ''}
        ${flow.roadClosure ? `<div class="list-item danger" style="border-radius:8px;margin-bottom:6px;font-size:11px;">🚧 Route fermée détectée à proximité</div>` : ''}`;
      // Mettre à jour le WOB_STATE pour l'IA
      WOB_STATE.trafficFlow = { ...flow, level: lvl, delayMin: delayRatio };
    } else {
      // Afficher l'indice synthétique si pas de TomTom
      if (sytadin?.synthetic) {
        flowHtml = `<div class="list-item ${sytadin.cls}" style="border-radius:10px;font-weight:700;margin-bottom:6px;">${sytadin.label}</div>`;
      }
    }

    // Bloc routes clés avec ETA trafic réel
    let routesHtml = '';
    if (routes.length) {
      routesHtml = `
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-dim);margin:10px 0 6px;">
          🛣️ TEMPS DE TRAJET EN TEMPS RÉEL
        </div>
        ${routes.map(r => {
          const isDelayed = r.delayMin > 5;
          const cls = r.delayMin > 15 ? 'danger' : r.delayMin > 5 ? 'warn' : 'ok';
          return `
            <div class="list-item ${cls}" style="border-radius:10px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:700;font-size:12px;">🚗 ${r.label}</div>
                <div style="font-size:10px;color:var(--text-dim);">${r.distanceKm} km · Sans trafic: ${r.etaNoTrafficMin}min</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:16px;font-weight:800;color:var(--gold);">${r.etaMin}min</div>
                ${isDelayed ? `<div style="font-size:10px;color:#ff4d6a;">+${r.delayMin}min 🚦</div>` : ''}
              </div>
            </div>`;
        }).join('')}`;
    } else if (!isKeySet(WOB_CONFIG.TOMTOM_KEY)) {
      routesHtml = `
        <div class="list-item info" style="border-radius:8px;margin-top:8px;font-size:11px;">
          💡 Configurez <strong>TOMTOM_KEY</strong> pour voir les temps de trajet en temps réel avec embouteillages
        </div>`;
    }

    cont.innerHTML = `
      ${flowHtml}
      <div id="sytadin-container" style="margin-bottom:6px;"></div>
      ${routesHtml}
      <div style="font-size:10px;color:var(--text-muted);text-align:right;margin-top:6px;">
        TomTom + IDFM · Actualisé : ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
        <span style="color:var(--text-dim);"> · Prochain: ${Math.round(WOB_CONFIG.CACHE_TTL.traffic/60000)}min</span>
      </div>`;

    // Re-render sytadin dans son container
    if (sytadin) this.renderSytadin(sytadin);

    // Alerter l'IA zones si embouteillage sévère
    if (WOB_STATE.trafficFlow?.level?.score >= 2) {
      IA_ZONES.addTrafficContext(WOB_STATE.trafficFlow);
    }
  },

  _injectContainer() {
    // Injecté automatiquement dans injectContainers()
  },
};

// ═══════════════════════════════════════════════════════════════════
//  MODULE 4 — NAVITIA (Alertes Transports en Commun)
//  https://navitia.io — Gratuit sur inscription
//  Détecte pannes RER/Métro → zones VTC stratégiques
// ═══════════════════════════════════════════════════════════════════
const NAVITIA = {
  // Lignes clés surveillées (RER + Métro stratégiques VTC)
  KEY_LINES: [
    { id: 'line:IDFM:C01742', name: 'RER A', icon: '🔴', impact: 'high' },
    { id: 'line:IDFM:C01743', name: 'RER B', icon: '🔵', impact: 'high' },
    { id: 'line:IDFM:C01727', name: 'RER C', icon: '🟡', impact: 'medium' },
    { id: 'line:IDFM:C01728', name: 'RER D', icon: '🟢', impact: 'medium' },
    { id: 'line:IDFM:C01371', name: 'Ligne 1', icon: '🟡', impact: 'medium' },
    { id: 'line:IDFM:C01372', name: 'Ligne 2', icon: '🔵', impact: 'medium' },
    { id: 'line:IDFM:C01373', name: 'Ligne 4', icon: '🟣', impact: 'medium' },
    { id: 'line:IDFM:C01379', name: 'Ligne 13', icon: '⚪', impact: 'low' },
  ],

  // Zones VTC à cibler selon la ligne en panne
  DISRUPTION_ZONES: {
    'RER A':   ['Châtelet', 'Nation', 'La Défense', 'Vincennes', 'Saint-Germain-en-Laye'],
    'RER B':   ['Gare du Nord', 'CDG Aéroport', 'Antony', 'Saint-Michel'],
    'RER C':   ['Gare d\'Austerlitz', 'Versailles', 'Musée d\'Orsay'],
    'RER D':   ['Gare de Lyon', 'Gare du Nord', 'Corbeil-Essonnes'],
    'Ligne 1': ['La Défense', 'Champs-Élysées', 'Vincennes'],
    'Ligne 2': ['Nation', 'Porte Dauphine', 'Place Clichy'],
    'Ligne 4': ['Montrouge', 'Montparnasse', 'Gare du Nord'],
    'Ligne 13':['Saint-Denis', 'Châtillon'],
  },

  async load() {
    const cached = getCached('wob_navitia', WOB_CONFIG.CACHE_TTL.navitia);
    if (cached) { this.render(cached); return; }

    // ── STRATÉGIE 3 SOURCES (ordre de fiabilité) ──────────────────
    // 1. PRIM IDFM /general-message — API officielle SNCF/RATP IDF
    //    CORS * autorisé depuis navigateur · Clé IDFM_KEY · Temps réel
    // 2. Open Data IDFM perturbations — Sans clé · CORS OK navigateur
    // 3. Fallback intelligent basé sur heure/jour de la semaine
    // ─────────────────────────────────────────────────────────────

    let disruptions = null;

    // ── SOURCE 1 : PRIM IDFM (principal, temps réel officiel) ────
    if (isKeySet(WOB_CONFIG.IDFM_KEY)) {
      disruptions = await this._fetchPRIM();
    }

    // ── SOURCE 2 : Open Data IDFM perturbations (sans clé) ───────
    if (!disruptions) {
      disruptions = await this._fetchOpenDataIDFM();
    }

    // ── SOURCE 3 : Fallback synthétique heure/jour ────────────────
    if (!disruptions) {
      disruptions = this._buildSyntheticDisruptions();
    }

    setCache('wob_navitia', disruptions);
    this.render(disruptions);
    if (disruptions.alerts?.length > 0) IA_ZONES.addTransitAlerts(disruptions.alerts);
  },

  // ── PRIM IDFM /general-message ──────────────────────────────────
  // API officielle IDF Mobilités — CORS * depuis navigateur — Temps réel
  async _fetchPRIM() {
    // PRIM IDF Mobilités — la clé doit être dans l'URL (query param) pour passer via proxy
    // Les proxies publics ne transmettent pas les headers custom → on met apikey dans l'URL
    const BASE   = 'https://prim.iledefrance-mobilites.fr/marketplace/general-message';
    const KEY    = WOB_CONFIG.IDFM_KEY;
    const DIRECT = BASE; // Essai direct sans proxy (parfois CORS * activé sur PRIM)
    const WITH_KEY_IN_URL = BASE + '?apikey=' + KEY;

    const ATTEMPTS = [
      // 1. Direct avec header (fonctionnel si CORS * activé côté PRIM)
      { url: DIRECT,          opts: { headers: { 'apikey': KEY, 'Accept': 'application/json' } } },
      // 2. allorigins avec clé dans l'URL (pas de header custom possible via proxy)
      { url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent(WITH_KEY_IN_URL), opts: { headers: { 'Accept': 'application/json' } } },
      // 3. corsproxy.io avec clé dans l'URL
      { url: 'https://corsproxy.io/?' + encodeURIComponent(WITH_KEY_IN_URL), opts: { headers: { 'Accept': 'application/json' } } },
    ];

    for (const { url, opts } of ATTEMPTS) {
      try {
        const ctrl = new AbortController();
        const tid  = setTimeout(() => ctrl.abort(), 12000);
        const resp = await fetch(url, { signal: ctrl.signal, ...opts });
        clearTimeout(tid);
        if (!resp.ok) { ERR('PRIM HTTP:', resp.status); continue; }
        const text = await resp.text();
        let data; try { data = JSON.parse(text); } catch(e) { continue; }
        const raw = (data.contents) ? JSON.parse(data.contents) : data;
        LOG('PRIM OK via:', url.slice(0, 50));
        return this._parsePRIM(raw);
      } catch(e) { ERR('PRIM tentative:', e.message); }
    }
    return null;
  },

  // Parser le format SIRI/JSON de PRIM general-message
  _parsePRIM(data) {
    const alerts = [];
    // Structure PRIM: Siri.ServiceDelivery.GeneralMessageDelivery[].InfoMessage[]
    const delivery = data?.Siri?.ServiceDelivery?.GeneralMessageDelivery;
    if (!delivery) {
      LOG('PRIM: Structure inattendue —', Object.keys(data || {}).join(', '));
      return { alerts: [], ts: Date.now(), _source: 'prim_empty' };
    }

    const deliveries = Array.isArray(delivery) ? delivery : [delivery];
    deliveries.forEach(d => {
      const messages = d.InfoMessage || [];
      (Array.isArray(messages) ? messages : [messages]).forEach(msg => {
        const content   = msg.Content || {};
        const lineRefs  = content.LineRef || [];
        const refs      = Array.isArray(lineRefs) ? lineRefs : [lineRefs];
        const msgText   = content.Message?.MessageText?.value || content.Message?.value || '';
        const severity  = content.Severity || 'unknown';
        const isMajor   = ['noService', 'significantDelays', 'verySignificantDelays', 'longDelay'].includes(severity);

        // Mapper sur nos lignes clés
        refs.forEach(ref => {
          const refStr = typeof ref === 'string' ? ref : (ref?.value || '');
          const keyLine = this.KEY_LINES.find(kl => refStr.includes(kl.id) ||
            refStr.includes(kl.name.replace('Ligne ','').replace('RER ',''))
          );
          if (!keyLine || !msgText) return;
          alerts.push({
            line:    keyLine.name,
            icon:    keyLine.icon,
            impact:  keyLine.impact,
            severity,
            isMajor,
            msg:     msgText.slice(0, 150),
            zones:   this.DISRUPTION_ZONES[keyLine.name] || [],
            _source: 'prim',
          });
        });
      });
    });

    // Si PRIM répond mais sans messages structurés, essayer format alternatif
    if (!alerts.length && data?.Siri) {
      LOG('PRIM: Réponse OK mais 0 perturbation sur lignes surveillées');
      return { alerts: [], ts: Date.now(), _source: 'prim_ok' };
    }

    const seen = new Set();
    const unique = alerts.filter(a => { if (seen.has(a.line)) return false; seen.add(a.line); return true; });
    unique.sort((a, b) => (b.isMajor ? 1 : 0) - (a.isMajor ? 1 : 0));
    LOG('PRIM:', unique.length, 'alertes parsées');
    return { alerts: unique, ts: Date.now(), _source: 'prim' };
  },

  // ── Open Data IDFM perturbations (sans clé, CORS OK) ──────────
  async _fetchOpenDataIDFM() {
    // data.iledefrance-mobilites.fr bloque CORS depuis GitHub Pages → proxy
    const TARGET = [
      'https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/',
      'perturbations-en-temps-reel-sur-le-reseau-ferre/records',
      '?limit=30&select=ligne,type_perturbation,message,date_debut,date_fin&order_by=date_debut+desc',
    ].join('');

    const PROXIES = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(TARGET)}`,
      `https://corsproxy.io/?${encodeURIComponent(TARGET)}`,
    ];

    for (const url of PROXIES) {
      try {
        const ctrl = new AbortController();
        const tid  = setTimeout(() => ctrl.abort(), 10000);
        const resp = await fetch(url, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
        clearTimeout(tid);
        if (!resp.ok) { ERR('Open Data IDFM proxy HTTP:', resp.status); continue; }
        const text = await resp.text();
        let parsed; try { parsed = JSON.parse(text); } catch(e) { continue; }
        const raw = parsed.contents ? JSON.parse(parsed.contents) : parsed;
        const records = raw.results || [];
        if (!records.length) {
          LOG('Open Data IDFM: 0 perturbation');
          return { alerts: [], ts: Date.now(), _source: 'opendata_ok' };
        }
        return this._parseOpenDataIDFM(records);
      } catch(e) { ERR('Open Data IDFM:', e.message); }
    }
    return null;
  },

  _parseOpenDataIDFM(records) {
    const alerts = [];
    records.forEach(r => {
      const ligneName = (r.ligne || '').toUpperCase();
      const keyLine = this.KEY_LINES.find(kl =>
        ligneName.includes(kl.name.toUpperCase()) ||
        ligneName.includes(kl.name.replace('Ligne ','').replace('RER ',''))
      );
      if (!keyLine) return;

      const type    = r.type_perturbation || '';
      const isMajor = ['ARRET_DE_SERVICE','RETARD_IMPORTANT','SUPPRESSION'].some(t => type.includes(t));
      const msg     = r.message || type || 'Perturbation signalée';

      alerts.push({
        line:    keyLine.name,
        icon:    keyLine.icon,
        impact:  keyLine.impact,
        severity: type,
        isMajor,
        msg:     msg.slice(0, 150),
        zones:   this.DISRUPTION_ZONES[keyLine.name] || [],
        startDt: r.date_debut,
        endDt:   r.date_fin,
        _source: 'opendata',
      });
    });

    const seen = new Set();
    const unique = alerts.filter(a => { if (seen.has(a.line)) return false; seen.add(a.line); return true; });
    unique.sort((a, b) => (b.isMajor ? 1 : 0) - (a.isMajor ? 1 : 0));
    LOG('Open Data IDFM:', unique.length, 'alertes');
    return { alerts: unique, ts: Date.now(), _source: 'opendata' };
  },

  _buildSyntheticDisruptions() {
    const h = new Date().getHours(), d = new Date().getDay();
    const isRush = (d >= 1 && d <= 5) && ((h >= 7 && h <= 9) || (h >= 17 && h <= 20));
    return {
      alerts: [],
      ts: Date.now(),
      _synthetic: true,
      _rush: isRush,
    };
  },

  parseDisruptions(disruptions) {
    const alerts = [];
    disruptions.forEach(d => {
      // Filtrer sur les lignes clés
      const impactedLines = (d.impacted_objects || [])
        .filter(o => o.pt_object?.embedded_type === 'line')
        .map(o => o.pt_object.line);

      impactedLines.forEach(line => {
        const keyLine = this.KEY_LINES.find(kl => kl.id === line.id ||
          (line.name && line.name.includes(kl.name.replace('Ligne ',''))));
        if (!keyLine) return;

        const severity = d.severity?.effect || 'UNKNOWN_EFFECT';
        const isMajor = ['NO_SERVICE','SIGNIFICANT_DELAYS','DETOUR'].includes(severity);
        const msg = d.messages?.[0]?.text || d.cause || 'Perturbation signalée';

        alerts.push({
          line:     keyLine.name,
          icon:     keyLine.icon,
          impact:   keyLine.impact,
          severity,
          isMajor,
          msg:      msg.slice(0, 120),
          zones:    this.DISRUPTION_ZONES[keyLine.name] || [],
          startDt:  d.application_periods?.[0]?.begin,
          endDt:    d.application_periods?.[0]?.end,
        });
      });
    });

    // Dédupliquer par ligne
    const seen = new Set();
    const unique = alerts.filter(a => { if (seen.has(a.line)) return false; seen.add(a.line); return true; });
    // Trier: majeurs d'abord
    unique.sort((a, b) => (b.isMajor ? 1 : 0) - (a.isMajor ? 1 : 0));
    return { alerts: unique, ts: Date.now() };
  },

  render(data) {
    const cont = el('navitia-container'); if (!cont) return;
    const alerts = data.alerts || [];

    // Affichage selon la source des données
    if (data._synthetic) {
      const h = new Date().getHours(), d = new Date().getDay();
      const isRush = (d >= 1 && d <= 5) && ((h >= 7 && h <= 9) || (h >= 17 && h <= 20));
      // Donner un conseil actionnable même sans données temps réel
      const rushTip = isRush
        ? '⚠️ Heure de pointe détectée — Positionnez-vous près des grandes gares'
        : '✅ Circulation normale estimée sur le réseau TC';
      cont.innerHTML = `
        <div class="list-item ${isRush ? 'warn' : 'ok'}" style="border-radius:10px;font-weight:700;">
          ${rushTip}
        </div>
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:10px;margin-top:8px;">
          <div style="font-size:11px;font-weight:700;color:var(--gold);margin-bottom:6px;">📡 Activer les alertes temps réel</div>
          <div style="font-size:10px;color:var(--text-dim);line-height:1.6;">
            Inscrivez-vous gratuitement sur
            <strong style="color:var(--text)">prim.iledefrance-mobilites.fr</strong>
            et collez votre clé dans <code style="background:rgba(255,255,255,.08);padding:1px 5px;border-radius:4px;">IDFM_KEY</code> dans <code>api.js</code>
            pour recevoir les pannes RER/Métro en temps réel.
          </div>
        </div>`;
      return;
    }

    // Source connue mais 0 perturbation = réseau nominal
    if (!alerts.length && (data._source === 'prim_ok' || data._source === 'opendata_ok')) {
      cont.innerHTML = `
        <div class="list-item ok" style="border-radius:10px;font-weight:700;">
          ✅ Réseau transports en commun — Aucune perturbation
        </div>
        <div style="font-size:10px;color:var(--text-dim);margin-top:4px;">
          ${data._source === 'prim' || data._source === 'prim_ok' ? '📡 Source : PRIM IDFM temps réel' : '📡 Source : Open Data IDFM'}
          · ${new Date(data.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
        </div>`;
      return;
    }

    if (!alerts.length) {
      cont.innerHTML = `
        <div class="list-item ok" style="border-radius:10px;font-weight:700;">
          ✅ Réseau transports en commun — Trafic normal
        </div>
        <div style="font-size:10px;color:var(--text-dim);margin-top:4px;">RER A/B/C/D · Métro surveillés · ${new Date(data.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>`;
      return;
    }

    const majorAlerts = alerts.filter(a => a.isMajor);
    const minorAlerts = alerts.filter(a => !a.isMajor);

    cont.innerHTML = `
      ${majorAlerts.length ? `
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#ff4d6a;margin-bottom:6px;">
          🚨 PERTURBATIONS MAJEURES — Opportunités VTC
        </div>
        ${majorAlerts.map(a => `
          <div class="list-item danger" style="border-radius:10px;margin-bottom:6px;flex-direction:column;gap:4px;">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;">
              ${a.icon} ${a.line} — ARRÊT / RETARD MAJEUR
            </div>
            <div style="font-size:11px;line-height:1.4;">${a.msg}</div>
            ${a.zones.length ? `
              <div style="background:rgba(255,77,106,.1);border-radius:6px;padding:6px 8px;margin-top:2px;">
                <div style="font-size:10px;font-weight:700;color:#ff4d6a;margin-bottom:3px;">📍 ZONES STRATÉGIQUES À CIBLER :</div>
                <div style="font-size:11px;color:var(--text);">${a.zones.slice(0,4).map(z => `🎯 ${z}`).join(' &nbsp; ')}</div>
              </div>` : ''}
          </div>`).join('')}` : ''}

      ${minorAlerts.length ? `
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#ffc107;margin:8px 0 6px;">
          ⚠️ PERTURBATIONS MINEURES
        </div>
        ${minorAlerts.slice(0,3).map(a => `
          <div class="list-item warn" style="border-radius:10px;margin-bottom:4px;">
            <span style="font-size:12px;">${a.icon} ${a.line}</span>
            <span style="font-size:11px;color:var(--text-dim);">${a.msg.slice(0,60)}…</span>
          </div>`).join('')}` : ''}

      <div style="font-size:10px;color:var(--text-muted);text-align:right;margin-top:6px;">
        ${data._source === 'prim' ? '📡 PRIM temps réel' : data._source === 'opendata' ? '📡 Open Data IDFM' : '📡 IDFM'} · ${new Date(data.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
      </div>`;

    if (majorAlerts.length > 0) {
      const badge = el('transit-alert-badge');
      if (badge) { badge.textContent = majorAlerts.length; badge.style.display = 'inline-flex'; }
    }
  },

  renderNoKey() {
    const cont = el('navitia-container'); if (!cont) return;
    cont.innerHTML = `
      <div class="list-item info" style="border-radius:10px;flex-direction:column;gap:4px;">
        <div style="font-weight:700;">🚇 Alertes Transports en Commun</div>
        <div style="font-size:11px;">Ajoutez votre clé <strong>IDF Mobilités (PRIM)</strong> → <code>IDFM_KEY</code></div>
      </div>`;
  },

  renderError() {
    const cont = el('navitia-container'); if (!cont) return;
    cont.innerHTML = `<div class="list-item warn" style="border-radius:10px;font-size:11px;">🚇 Service indisponible — Vérifiez votre clé IDFM_KEY dans api.js (prim.iledefrance-mobilites.fr)</div>`;
  },
};

// ═══════════════════════════════════════════════════════════════════
//  MODULE 5 — OPEN DATA ADP (Vols CDG & Orly)
//  Aéroports De Paris — Open Data gratuit, sans clé
//  https://opendata.aeroportsde paris.fr
//  Remplace AviationStack (limité à 500 req/mois)
// ═══════════════════════════════════════════════════════════════════
const AVIATION = {
  // Cache 1h pour économiser les requêtes (données vols changent lentement)
  _currentAirport:    'CDG',
  _currentFlightType: 'arr',

  async loadArrivals(airportCode = 'CDG') {
    const cacheKey = `wob_flights_arr_${airportCode}`;
    const cached   = getCached(cacheKey, WOB_CONFIG.CACHE_TTL.flights);
    if (cached) { this.render(cached, airportCode, 'arrivals'); return; }

    try {
      const data = await this._fetchADP(airportCode, 'ARR');
      if (data) {
        setCache(cacheKey, data);
        this.render(data, airportCode, 'arrivals');
      } else {
        this.renderFallback(airportCode, 'arr');
      }
    } catch(e) {
      ERR('ADP Arrivals:', e.message);
      const c = getCached(cacheKey, Infinity);
      if (c) this.render(c, airportCode, 'arrivals');
      else this.renderFallback(airportCode, 'arr');
    }
  },

  async loadDepartures(airportCode = 'CDG') {
    const cacheKey = `wob_flights_dep_${airportCode}`;
    const cached   = getCached(cacheKey, WOB_CONFIG.CACHE_TTL.flights);
    if (cached) { this.render(cached, airportCode, 'departures'); return; }

    try {
      const data = await this._fetchADP(airportCode, 'DEP');
      if (data) {
        setCache(cacheKey, data);
        this.render(data, airportCode, 'departures');
      } else {
        this.renderFallback(airportCode, 'dep');
      }
    } catch(e) {
      ERR('ADP Departures:', e.message);
      const c = getCached(cacheKey, Infinity);
      if (c) this.render(c, airportCode, 'departures');
      else this.renderFallback(airportCode, 'dep');
    }
  },

  // Fetch vols via ADS-B Exchange (gratuit, sans clé, CORS OK, remplace OpenSky)
  // ⚠️ OpenSky a migré vers OAuth2 en 2024 — basic auth supprimé → BROKEN
  // ADS-B Exchange /v2/lat/lon/dist/ : CORS OK, pas d'auth, données temps réel
  async _fetchADP(airportCode, direction) {
    const AIRPORT_POS = {
      CDG: { lat: 49.009, lon: 2.547 },
      ORY: { lat: 48.723, lon: 2.379 },
    };
    const pos   = AIRPORT_POS[airportCode] || AIRPORT_POS.CDG;
    const isArr = direction === 'ARR';

    // ADS-B — sources avec proxies CORS en cascade
    const ADSB_TARGET   = `https://api.adsb.lol/v2/lat/${pos.lat}/lon/${pos.lon}/dist/15`;
    const OPENSKY_TARGET = `https://opensky-network.org/api/states/all?lamin=${pos.lat-0.2}&lomin=${pos.lon-0.2}&lamax=${pos.lat+0.2}&lomax=${pos.lon+0.2}`;
    const URLS = [
      // Direct d'abord (adsb.lol autorise CORS * normalement)
      { url: ADSB_TARGET,   isProxy: false },
      // Proxy si direct bloqué
      { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(ADSB_TARGET)}`, isProxy: true },
      { url: `https://corsproxy.io/?${encodeURIComponent(ADSB_TARGET)}`,             isProxy: true },
      // OpenSky en dernier recours
      { url: OPENSKY_TARGET, isProxy: false },
    ];

    for (const { url, isProxy } of URLS) {
      try {
        const ctrl = new AbortController();
        const tid  = setTimeout(() => ctrl.abort(), 9000);
        const resp = await fetch(url, {
          signal: ctrl.signal,
          headers: { 'Accept': 'application/json' },
        });
        clearTimeout(tid);
        if (!resp.ok) { ERR('ADSB HTTP', resp.status); continue; }
        const text = await resp.text();
        let raw; try { raw = JSON.parse(text); } catch(e) { continue; }
        // Déwrapper le proxy allorigins si besoin
        const json = (isProxy && raw.contents) ? JSON.parse(raw.contents) : raw;
        // Normaliser les 2 formats : ADS-B lol (json.ac) et OpenSky (json.states)
        let acs = json.ac || json.aircraft || [];
        if (!acs.length && json.states) {
          // OpenSky: states = tableau [icao24, callsign, origin, time_pos, last_contact, lon, lat, baro_alt, ...]
          acs = json.states.map(s => ({
            icao24: s[0], flight: (s[1]||'').trim(), lon: s[5], lat: s[6],
            alt_baro: s[7] != null ? s[7] * 3.281 : 'ground', // m → ft
            gs: s[9] ? s[9] * 1.944 : 0, // m/s → knots
          }));
        }
        if (!acs.length) continue;

        LOG(`ADSB ${airportCode} ${direction}: ${acs.length} appareils`);
        const relevant = acs.filter(a => {
          const alt  = typeof a.alt_baro === 'number' ? a.alt_baro : (a.alt_baro === 'ground' ? 0 : 9999);
          if (direction === 'ARR') return alt < 8000 || a.alt_baro === 'ground';
          else return a.alt_baro === 'ground' || alt < 5000;
        }).slice(0, 10);
        const flights = relevant.length > 0
          ? relevant.map(a => this._normalizeADSB(a, direction, airportCode))
          : acs.slice(0, 8).map(a => this._normalizeADSB(a, direction, airportCode));
        return flights;
      } catch(e) { ERR('ADSB URL:', e.message); }
    }
    return null;
  },

  // Normaliser format ADS-B Exchange → format interne WOD
  _normalizeADSB(ac, direction, airport) {
    const callsign  = (ac.flight || ac.r || '').trim();
    const onGround  = ac.alt_baro === 'ground' || ac.gs < 30;
    const altitude  = typeof ac.alt_baro === 'number' ? ac.alt_baro * 0.3048 : 0; // ft → m
    const velocity  = ac.gs || 0; // knots
    const isArr     = direction === 'ARR';
    const isApproaching = isArr && altitude < 3000 && !onGround;
    const etaOffsetMin  = isApproaching ? Math.max(5, Math.round(altitude / 300)) : 0;
    const eta = new Date(Date.now() + etaOffsetMin * 60000).toISOString();
    return {
      flight:   { iata: callsign || `${airport}???` },
      airline:  { name: callsign ? callsign.slice(0, 3) : '—' },
      departure: isArr ? { iata: '—', scheduled: eta, estimated: eta, delay: 0 } : null,
      arrival:  !isArr ? { iata: '—', scheduled: eta, estimated: eta, delay: 0 } : null,
      status:   onGround ? 'landed' : isApproaching ? 'active' : 'en-route',
      terminal: '',
      _source:  'adsb',
      _velocity: Math.round(velocity * 1.852), // knots → km/h
      _altitude: Math.round(altitude),
    };
  },


  render(flights, airport, type) {
    const cont = el(`flights-${airport.toLowerCase()}`); if (!cont) return;
    if (!flights || !flights.length) {
      cont.innerHTML = `<div class="list-item info">Aucun appareil détecté en ce moment — ${airport}</div>`;
      return;
    }
    const isArr = type === 'arrivals';
    cont.innerHTML = flights.slice(0, 10).map(f => {
      const timeKey = isArr ? f.departure : f.arrival;
      const eta     = timeKey?.estimated || timeKey?.scheduled;
      const delay   = timeKey?.delay || 0;
      const flightN = f.flight?.iata || '—';
      const from    = isArr ? (f.departure?.iata || '—') : (f.arrival?.iata || '—');
      const etaTime = eta ? new Date(eta).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '—';
      const delayTxt= delay > 5 ? `<span style="color:#ff4d6a;font-size:10px;">+${delay}min</span>` : '';
      const cls     = delay > 30 ? 'danger' : delay > 10 ? 'warn' : 'ok';
      // Info OpenSky additionnelle
      const extraInfo = f._source === 'adsb' && f._altitude
        ? `· ${f._altitude}m · ${f._velocity}km/h`
        : '';
      return `
        <div class="list-item ${cls}" style="flex-direction:column;gap:3px;border-radius:10px;">
          <div style="display:flex;justify-content:space-between;">
            <span style="font-weight:700;">${isArr?'✈️ Approche':'🛫 Décollage'} ${flightN}</span>
            <span style="font-weight:800;color:var(--gold);">${etaTime} ${delayTxt}</span>
          </div>
          <div style="font-size:11px;color:var(--text-dim);">
            ${f.airline?.name||'—'} ${extraInfo}
            ${f._source === 'adsb' ? '<span style="color:var(--gold);opacity:.4;"> · ADS-B Live</span>' : ''}
          </div>
          ${f.status === 'landed' ? `<div style="font-size:10px;color:#34d399;">✅ Au sol — Passagers en débarquement</div>` : ''}
          ${delay > 15 ? `<div style="font-size:10px;color:#ff4d6a;">⚠️ Retard ${delay}min — Clients en attente prolongée</div>` : ''}
        </div>`;
    }).join('');

    // Fenêtres VTC
    this.computeVTCWindows(flights, airport, type);
  },

  computeVTCWindows(flights, airport, type) {
    const now = Date.now(), windows = [];
    flights.forEach(f => {
      const timeKey = type === 'arrivals' ? f.departure : f.arrival;
      const eta = timeKey?.estimated || timeKey?.scheduled;
      if (!eta) return;
      const diffMin = Math.round((new Date(eta).getTime() - now) / 60000);
      if (diffMin > 0 && diffMin < 90)
        windows.push({ diffMin, flightN: f.flight?.iata, delay: timeKey?.delay || 0 });
    });
    windows.sort((a, b) => a.diffMin - b.diffMin);
    WOB_STATE.flightWindows = WOB_STATE.flightWindows || {};
    WOB_STATE.flightWindows[airport] = windows;
    if (windows.length) IA_ZONES.addFlightContext(airport, windows);
  },

  renderFallback(airportCode, dir) {
    const cont = el(`flights-${airportCode.toLowerCase()}`); if (!cont) return;
    const now  = new Date();
    const fmtT = d => d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
    // Données indicatives réalistes pour simuler l'interface
    const demo = [
      { airline:'Air France',  from:'JFK', time: new Date(now.getTime()+20*60000), delay:0  },
      { airline:'easyJet',     from:'LGW', time: new Date(now.getTime()+35*60000), delay:12 },
      { airline:'Lufthansa',   from:'FRA', time: new Date(now.getTime()+50*60000), delay:0  },
      { airline:'Ryanair',     from:'DUB', time: new Date(now.getTime()+68*60000), delay:8  },
    ];
    cont.innerHTML = `
      <div class="list-item info" style="font-size:11px;border-radius:8px;margin-bottom:8px;">
        ℹ️ Open Data ADP indisponible — Données indicatives (prochains vols ${airportCode})
      </div>` +
      demo.map(f => `
        <div class="list-item ${f.delay > 10 ? 'warn' : 'ok'}" style="flex-direction:column;gap:3px;border-radius:10px;">
          <div style="display:flex;justify-content:space-between;">
            <span style="font-weight:700;">${dir==='arr'?'✈️':'🛫'} ${airportCode} ${dir==='arr'?'←':'→'} ${f.from}</span>
            <span style="font-weight:800;color:var(--gold);">${fmtT(f.time)}${f.delay?` <span style="color:#ff4d6a;font-size:10px;">+${f.delay}m</span>`:''}</span>
          </div>
          <div style="font-size:11px;color:var(--text-dim);">${f.airline}</div>
        </div>`).join('');
    // Simuler les créneaux VTC pour l'IA
    IA_ZONES.addFlightContext(airportCode, demo.map((f,i) => ({ diffMin:(i+1)*18, flightN:`Demo${i}`, delay:f.delay })));
  },
};

// Navigation vols
let _currentAirport = 'CDG', _currentFlightType = 'arr';
window.selectAirport = function(code, btn) {
  _currentAirport = code;
  document.querySelectorAll('.ef-btn').forEach(b => {
    if (['CDG','Orly','ORY','BVA'].some(l => b.textContent.trim().includes(l))) b.classList.remove('active');
  });
  btn?.classList.add('active');
  ['cdg','ory'].forEach(a => { const d = el(`flights-${a}`); if (d) d.style.display = a === code.toLowerCase() ? '' : 'none'; });
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
//  MODULE 6 — IA ZONES STRATÉGIQUES
//  Enrichi par: Météo + Trafic TomTom + Navitia Transit + ADP Vols
// ═══════════════════════════════════════════════════════════════════
const IA_ZONES = {
  flightContexts:  {},
  transitAlerts:   [],
  trafficContext:  null,
  _lastBuild:      0,

  addFlightContext(airport, windows) { this.flightContexts[airport] = windows; this.buildAdvice(); },
  addTransitAlerts(alerts) { this.transitAlerts = alerts; this.buildAdvice(); },
  addTrafficContext(flow) { this.trafficContext = flow; this.buildAdvice(); },

  buildAdvice() {
    const now = Date.now();
    if (now - this._lastBuild < 60000) return;
    this._lastBuild = now;

    const h = new Date().getHours(), day = new Date().getDay();
    const meteo  = WOB_STATE.meteoData || {};
    const fuel   = WOB_STATE.fuelPrices || {};
    const _s     = window.state || {};
    const gain   = _s.totalGain || 0, km = _s.totalKm || 0, trips = _s.totalTrips || 0;
    const impact = WOB_STATE.meteoImpact || { score:0, msg:'Météo OK' };
    const traffic= WOB_STATE.trafficFlow || null;

    const conseils = [];

    // ── Alertes transports en commun → zones VTC prioritaires ──
    this.transitAlerts.filter(a => a.isMajor).forEach(a => {
      const zonesStr = a.zones.slice(0,3).join(', ');
      conseils.push({
        priority: 4,
        icon: '🚨',
        msg: `${a.icon} ${a.line} PERTURBÉE — Positionnez-vous : ${zonesStr}`,
        cls: 'danger',
      });
    });
    this.transitAlerts.filter(a => !a.isMajor).forEach(a => {
      conseils.push({
        priority: 2,
        icon: '🚇',
        msg: `${a.icon} ${a.line} perturbée — Zones à cibler : ${a.zones.slice(0,2).join(', ')}`,
        cls: 'warn',
      });
    });

    // ── Alertes trafic routier ──
    if (traffic && traffic.level?.score >= 3) {
      conseils.push({ priority:3, icon:'🚦', msg:`Embouteillage sévère — Évitez les axes principaux, privilégiez le périphérique`, cls:'danger' });
    } else if (traffic && traffic.level?.score === 2) {
      conseils.push({ priority:2, icon:'🟠', msg:`Ralentissements — Temps de trajet +${traffic.delayMin || '?'}min`, cls:'warn' });
    }

    // ── Alertes météo ──
    if (impact.score >= 2) conseils.push({ priority:3, icon:'⛈', msg:impact.msg, cls:'danger' });
    else if (impact.score === 1) conseils.push({ priority:2, icon:'🌧', msg:impact.msg, cls:'warn' });
    if (meteo.temp <= 2) conseils.push({ priority:2, icon:'🥶', msg:'Froid intense — VTC +30% demande', cls:'warn' });
    if (meteo.temp >= 32) conseils.push({ priority:1, icon:'🌡️', msg:'Canicule — Centres commerciaux, hôtels ↑', cls:'info' });

    // ── Alertes vols ──
    Object.entries(this.flightContexts).forEach(([airport, wins]) => {
      if (!wins.length) return;
      const closest = wins[0];
      if (closest.diffMin <= 20) conseils.push({ priority:3, icon:'✈️', msg:`${airport}: Vol dans ${closest.diffMin}min — Positionnez-vous MAINTENANT`, cls:'danger' });
      else if (closest.diffMin <= 45) conseils.push({ priority:2, icon:'✈️', msg:`${airport}: ${wins.length} vol(s) à venir — Rejoindre dans ${Math.max(0,closest.diffMin-15)}min`, cls:'warn' });
      if (wins.some(w => w.delay > 20)) conseils.push({ priority:2, icon:'⏱', msg:`${airport}: Retards en cours — Clients bloqués = courses garanties`, cls:'warn' });
    });

    // ── Conseils horaires ──
    const isWeekday = day >= 1 && day <= 5;
    if (isWeekday && h >= 7 && h <= 9)   conseils.push({ priority:2, icon:'🌅', msg:'Rush matin: Gare du Nord · Gare de Lyon — Pros 12-20€/course', cls:'warn' });
    if (isWeekday && h >= 11 && h <= 13) conseils.push({ priority:1, icon:'🍽️', msg:'Déjeuner: Opéra · Châtelet · La Défense', cls:'info' });
    if (isWeekday && h >= 17 && h <= 20) conseils.push({ priority:2, icon:'🌆', msg:'Rush soir: La Défense + Gares — Pic demande', cls:'warn' });
    if (day === 5 && h >= 18) conseils.push({ priority:3, icon:'🎉', msg:'Vendredi soir — Oberkampf, Bastille, République', cls:'danger' });
    if ((day === 6 || day === 0) && h >= 1 && h <= 4) conseils.push({ priority:3, icon:'🌙', msg:'Nuit festive — Grands Boulevards, Pigalle: Surge actif', cls:'danger' });

    // ── Carburant ──
    const sp95 = fuel['SP95']?.prix;
    if (sp95 && sp95 > 1.95) conseils.push({ priority:1, icon:'⛽', msg:`SP95 cher (${sp95.toFixed(3)}€) — Stations périphériques`, cls:'info' });
    if (sp95 && sp95 < 1.75) conseils.push({ priority:1, icon:'⛽', msg:`SP95 bas (${sp95.toFixed(3)}€) — Faites le plein maintenant !`, cls:'ok' });

    // ── Ratio perso ──
    if (trips > 0) {
      const avg = gain / trips;
      if (avg < 8) conseils.push({ priority:2, icon:'📊', msg:`Moyenne ${avg.toFixed(2)}€/course basse — Ciblez CDG/Orly (15-30€)`, cls:'warn' });
      else if (avg > 20) conseils.push({ priority:1, icon:'🚀', msg:`Excellente moyenne ${avg.toFixed(2)}€/course !`, cls:'ok' });
    }

    // ── Zones recommandées ──
    const zones = this.getOptimalZones(h, day, impact.score, this.flightContexts, this.transitAlerts);
    if (zones.length) conseils.push({ priority:2, icon:'📍', msg:`Zones prioritaires : ${zones.join(' · ')}`, cls:'gold' });

    conseils.sort((a, b) => b.priority - a.priority);
    this.render(conseils.slice(0, 8));
  },

  getOptimalZones(h, day, meteoScore, flights, transitAlerts) {
    const zones = [];
    if (flights.CDG?.length) zones.push('CDG ✈️');
    if (flights.ORY?.length) zones.push('Orly ✈️');
    // Zones selon alertes transports
    transitAlerts.filter(a => a.isMajor).forEach(a => a.zones.slice(0,2).forEach(z => zones.push(z + ' 🚇')));
    if (h >= 6 && h <= 9)   zones.push('Gare du Nord', 'Gare de Lyon');
    if (h >= 9 && h <= 11)  zones.push('La Défense', 'Opéra');
    if (h >= 12 && h <= 14) zones.push('Châtelet', 'République');
    if (h >= 16 && h <= 19) zones.push('La Défense', 'Saint-Lazare');
    if (h >= 19 && h <= 22) zones.push('Oberkampf', 'Bastille');
    if (h >= 22 || h <= 5)  zones.push('Grands Boulevards', 'Pigalle');
    if (meteoScore >= 2)    zones.unshift('Paris Centre 🌧');
    return [...new Set(zones)].slice(0, 5);
  },

  render(conseils) {
    const html = conseils.map((c, i) => `
      <div class="list-item ${c.cls || 'info'}"
           style="border-radius:10px;margin-bottom:5px;animation:slide-up-in .3s ease ${i * 0.06}s both;display:flex;align-items:flex-start;gap:10px;">
        <span style="font-size:18px;flex-shrink:0;line-height:1.2;">${c.icon}</span>
        <span style="font-size:12px;font-weight:600;line-height:1.4;">${c.msg}</span>
      </div>`).join('');
    ['rush-conseils','ia-zones-container'].forEach(id => { const c = el(id); if (c) c.innerHTML = html; });
  },
};

// ═══════════════════════════════════════════════════════════════════
//  MODULE 7 — NOTIFICATIONS (native, sans dépendance externe)
// ═══════════════════════════════════════════════════════════════════
const NOTIFS = {
  send(title, body, icon = '🚖') {
    const full = `${icon} ${title}`;
    if (navigator.serviceWorker?.controller)
      navigator.serviceWorker.controller.postMessage({ type:'LOCAL_NOTIFICATION', title: full, body });
    else if ('Notification' in window && Notification.permission === 'granted')
      new Notification(full, { body, icon: '/favicon.ico' });
  },
  rushAlert(zone, score)     { if (score >= 3) this.send('RUSH DÉTECTÉ !', `Zone ${zone} — Surge probable`, '🔴'); },
  flightAlert(airport, min)  { this.send(`Vol imminent — ${airport}`, `Atterrissage dans ${min}min`, '✈️'); },
  transitAlert(line, zones)  { this.send(`🚨 ${line} PERTURBÉE`, `Ciblez : ${zones.slice(0,2).join(', ')}`, '🚇'); },
  meteoAlert(msg)            { this.send('Alerte Météo', msg, '⛈'); },
};

// ═══════════════════════════════════════════════════════════════════
//  MODULE 8 — SUPABASE (Stockage cloud — inchangé)
// ═══════════════════════════════════════════════════════════════════
const SUPA = {
  isConfigured() {
    return !!(WOB_CONFIG.SUPABASE_URL?.startsWith('https://') && WOB_CONFIG.SUPABASE_KEY?.length > 10);
  },
  headers() {
    return { 'Content-Type':'application/json', 'apikey':WOB_CONFIG.SUPABASE_KEY, 'Authorization':`Bearer ${WOB_CONFIG.SUPABASE_KEY}` };
  },
  async save(userId = 'default') {
    if (!this.isConfigured()) return false;
    try {
      const resp = await fetch(`${WOB_CONFIG.SUPABASE_URL}/rest/v1/wob_sessions?on_conflict=user_id`, {
        method:'POST', headers:{ ...this.headers(), 'Prefer':'resolution=merge-duplicates' },
        body: JSON.stringify(this.buildPayload(userId)),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      LS.set('wob_supabase_last_sync', new Date().toISOString());
      return true;
    } catch(e) { ERR('Supabase save:', e.message); return false; }
  },
  async restore(userId = 'default') {
    if (!this.isConfigured()) return null;
    try {
      const resp = await fetch(`${WOB_CONFIG.SUPABASE_URL}/rest/v1/wob_sessions?user_id=eq.${userId}&select=*`, { headers: this.headers() });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const rows = await resp.json();
      return rows[0] || null;
    } catch(e) { ERR('Supabase restore:', e.message); return null; }
  },
  buildPayload(userId) {
    return {
      user_id:'default', updated_at:new Date().toISOString(),
      total_gain:LS.get('wob_gain')||'0', total_km:LS.get('wob_km')||'0',
      total_trips:LS.get('wob_trips')||'0', depenses:LS.get('wob_depenses')||'[]',
      goals:LS.get('wob_goals')||'{}', profile_name:LS.get('wob_name')||'Billy',
      veh_modele:LS.get('wob_veh_modele')||'', veh_type:LS.get('wob_veh_type')||'essence',
      ia_report:LS.get('wob_ia')||'',
    };
  },
};

// ═══════════════════════════════════════════════════════════════════
//  MODULE 9 — AUTO-SAVE 30s + CRASH RECOVERY
// ═══════════════════════════════════════════════════════════════════
const AUTOSAVE = {
  _timer:null, _saveCount:0, _lastSaveTime:0,

  start() {
    this.checkCrashRecovery();
    this.markAlive();
    setInterval(() => this.markAlive(), 5000);
    this._timer = setInterval(() => this.save(), WOB_CONFIG.AUTOSAVE_INTERVAL);
    setTimeout(() => this.save(), 3000);
    LOG('Auto-save démarré (30s)');
  },
  markAlive() {
    LS.set('wob_alive', Date.now().toString());
    LS.set('wob_crash_guard', JSON.stringify({ ts:Date.now(), gain:LS.get('wob_gain')||'0', km:LS.get('wob_km')||'0', trips:LS.get('wob_trips')||'0' }));
  },
  checkCrashRecovery() {
    const alive = parseInt(LS.get('wob_alive') || '0'), guard = LS.get('wob_crash_guard');
    if (!alive || !guard) return;
    if (Date.now() - alive > 2 * 60 * 1000) {
      try {
        const data = JSON.parse(guard);
        if (parseFloat(data.gain) > parseFloat(LS.get('wob_gain')||'0')) {
          LS.set('wob_gain', data.gain); LS.set('wob_km', data.km); LS.set('wob_trips', data.trips);
          LOG('Crash recovery OK');
        }
      } catch(e) {}
    }
    if (SUPA.isConfigured()) this.tryCloudRecovery();
  },
  async tryCloudRecovery() {
    try {
      const cd = await SUPA.restore();
      if (cd && parseFloat(cd.total_gain) > parseFloat(LS.get('wob_gain')||'0')) {
        LS.set('wob_gain', cd.total_gain); LS.set('wob_km', cd.total_km); LS.set('wob_trips', cd.total_trips);
        if (typeof updateDashboard === 'function') updateDashboard();
      }
    } catch(e) {}
  },
  async save() {
    this._saveCount++; this._lastSaveTime = Date.now();
    const keys = ['wob_gain','wob_km','wob_trips','wob_sessions','wob_platforms','wob_hours','wob_weekday','wob_depenses','wob_goals','wob_ia','wob_name','wob_veh_modele','wob_veh_type','wob_conso','wob_prix','wob_docs_history'];
    const snap = {}; keys.forEach(k => { const v = LS.get(k); if (v) snap[k] = v; });
    LS.set('wob_auto_backup', JSON.stringify({ ts:Date.now(), data:snap, version:7 }));
    LS.set('wob_backup_ts', Date.now().toString());
    const infoEl = el('backup-info');
    if (infoEl) infoEl.textContent = `✅ Sauvegardé à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;
    if (this._saveCount % 5 === 0) SUPA.save().then(ok => { if (ok && infoEl) infoEl.textContent += ' · ☁️'; });
  },
  setupCleanExit() {
    window.addEventListener('beforeunload', () => { LS.set('wob_alive','0'); this.save(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
  },
};

// ═══════════════════════════════════════════════════════════════════
//  MODULE 10 — CHART.JS PRO UPGRADES
// ═══════════════════════════════════════════════════════════════════
const CHARTS_PRO = {
  annotationPlugin: {
    id: 'wobGoalLine',
    beforeDraw(chart, args, opts) {
      if (!opts.goal?.value) return;
      const { ctx, chartArea, scales } = chart; if (!scales.y) return;
      const y = scales.y.getPixelForValue(opts.goal.value);
      if (y < chartArea.top || y > chartArea.bottom) return;
      ctx.save(); ctx.beginPath();
      ctx.moveTo(chartArea.left, y); ctx.lineTo(chartArea.right, y);
      ctx.strokeStyle = opts.goal.color || 'rgba(212,168,67,0.6)'; ctx.lineWidth = 1.5;
      ctx.setLineDash([6,4]); ctx.stroke();
      ctx.fillStyle = opts.goal.color || 'rgba(212,168,67,0.8)';
      ctx.font = '10px DM Sans, sans-serif';
      ctx.fillText(opts.goal.label || 'Objectif', chartArea.left + 4, y - 4);
      ctx.restore();
    },
  },
  globalDefaults() {
    if (!window.Chart) return;
    Chart.defaults.font.family = "'DM Sans', sans-serif"; Chart.defaults.font.size = 11;
    Chart.defaults.color = '#7a8499';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(12,12,18,0.96)';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(212,168,67,0.3)';
    Chart.defaults.plugins.tooltip.borderWidth = 1; Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 10; Chart.defaults.plugins.tooltip.titleColor = '#d4a843';
    Chart.defaults.plugins.tooltip.bodyColor = '#e2e8f0';
    Chart.defaults.animation.duration = 600; Chart.defaults.animation.easing = 'easeInOutQuart';
    Chart.register(this.annotationPlugin);
    LOG('Chart.js Pro configuré');
  },
};

// ═══════════════════════════════════════════════════════════════════
//  ÉTAT GLOBAL PARTAGÉ
// ═══════════════════════════════════════════════════════════════════
const WOB_STATE = {
  meteoData:    null,
  meteoImpact:  null,
  fuelPrices:   null,
  flightWindows:{},
  trafficFlow:  null,
  trafficIndex: null,
  lastFullLoad: 0,
};

// ═══════════════════════════════════════════════════════════════════
//  INJECTION CONTAINERS HTML
// ═══════════════════════════════════════════════════════════════════
function injectContainers() {
  const rushScroll = document.querySelector('#screen-rush .screen-scroll') ||
                     document.querySelector('#screen-home .screen-scroll');
  if (!rushScroll) return;

  // 1. Météo
  if (!el('meteo-container')) {
    const d = document.createElement('div'); d.className = 'card'; d.style.marginBottom = '12px';
    d.innerHTML = `
      <div class="card-row-hd" style="margin-bottom:10px;">
        <span class="card-title">🌤 Météo & Impact VTC</span>
        <button class="btn-ghost-sm" onclick="METEO.load(window.state?.pos?.lat||48.8566,window.state?.pos?.lon||2.3522)">⟳</button>
      </div>
      <div id="meteo-container"><div class="list-item info">⏳ Chargement météo...</div></div>`;
    const heroCard = rushScroll.querySelector('.rush-hero,.hero-card');
    heroCard ? heroCard.after(d) : rushScroll.prepend(d);
  }

  // 2. Trafic (TomTom + Sytadin) — NOUVEAU
  if (!el('traffic-container')) {
    const d = document.createElement('div'); d.className = 'card'; d.style.marginBottom = '12px';
    d.innerHTML = `
      <div class="card-row-hd" style="margin-bottom:10px;">
        <span class="card-title">🚦 Trafic & Temps de Trajet</span>
        <button class="btn-ghost-sm" onclick="TRAFFIC.load()">⟳</button>
      </div>
      <div id="traffic-container"><div class="list-item info">⏳ Chargement trafic...</div></div>`;
    const meteoCard = el('meteo-container')?.closest('.card');
    meteoCard ? meteoCard.after(d) : rushScroll.prepend(d);
  }

  // 3. Alertes Transport en Commun (Navitia) — NOUVEAU
  if (!el('navitia-container')) {
    const d = document.createElement('div'); d.className = 'card'; d.style.marginBottom = '12px';
    d.innerHTML = `
      <div class="card-row-hd" style="margin-bottom:10px;">
        <span class="card-title">
          🚇 Alertes Transports en Commun
          <span id="transit-alert-badge" style="display:none;background:#ff4d6a;color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:10px;margin-left:6px;">0</span>
        </span>
        <button class="btn-ghost-sm" onclick="NAVITIA.load()">⟳</button>
      </div>
      <div id="navitia-container"><div class="list-item info">⏳ Chargement alertes TC...</div></div>`;
    const trafficCard = el('traffic-container')?.closest('.card');
    trafficCard ? trafficCard.after(d) : rushScroll.prepend(d);
  }

  // 4. Carburant
  if (!el('carbu-container')) {
    const d = document.createElement('div'); d.className = 'card'; d.style.marginBottom = '12px';
    d.innerHTML = `
      <div class="card-row-hd" style="margin-bottom:10px;">
        <span class="card-title">⛽ Prix Carburant — Autour de vous</span>
        <button class="btn-ghost-sm" onclick="CARBURANT.load(window.state?.pos?.lat||48.8566,window.state?.pos?.lon||2.3522)">⟳</button>
      </div>
      <div id="carbu-container"><div class="list-item info">⏳ Chargement...</div></div>`;
    rushScroll.append(d);
  }

  // 5. Vols ADP (remplace AviationStack)
  if (!el('flights-cdg')) {
    const d = document.createElement('div'); d.className = 'card'; d.style.marginBottom = '12px';
    d.innerHTML = `
      <div style="margin-bottom:10px;">
        <div class="card-row-hd">
          <span class="card-title">✈️ Vols en temps réel <span style="font-size:9px;color:var(--text-dim);">Open Data ADP</span></span>
          <div style="display:flex;gap:6px;">
            <button class="ef-btn active" onclick="selectAirport('CDG',this)">CDG</button>
            <button class="ef-btn" onclick="selectAirport('ORY',this)">Orly</button>
          </div>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;">
          <button class="ef-btn active" onclick="selectFlightType('arr',this)" id="ft-arr">Arrivées</button>
          <button class="ef-btn" onclick="selectFlightType('dep',this)" id="ft-dep">Départs</button>
        </div>
      </div>
      <div id="flights-cdg"></div>
      <div id="flights-ory" style="display:none;"></div>`;
    rushScroll.append(d);
  }

  // 6. IA Zones (page home)
  const homeScroll = document.querySelector('#screen-home .screen-scroll');
  if (homeScroll && !el('ia-zones-container')) {
    const iaCard = homeScroll.querySelector('.ia-coach-card, .ia-card');
    if (iaCard) {
      const d = document.createElement('div'); d.className = 'card';
      d.innerHTML = `
        <div class="card-row-hd" style="margin-bottom:8px;">
          <span class="card-title">📍 Zones & Conseils IA temps réel</span>
          <button class="btn-ghost-sm" onclick="IA_ZONES.buildAdvice()">⟳</button>
        </div>
        <div id="ia-zones-container"><div class="list-item info">⏳ Analyse en cours...</div></div>`;
      iaCard.after(d);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  CSS INJECTÉ
// ═══════════════════════════════════════════════════════════════════
function injectCSS() {
  const style = document.createElement('style');
  style.textContent = `
    .meteo-top { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
    .meteo-temp { font-size:48px; font-weight:800; line-height:1; letter-spacing:-2px; color:var(--gold); }
    .meteo-desc { font-size:14px; font-weight:600; margin-top:4px; }
    .meteo-feel { font-size:11px; color:var(--text-dim); margin-top:2px; }
    .meteo-details { display:flex; flex-direction:column; gap:6px; }
    .md-item { font-size:12px; color:var(--text-dim); background:rgba(255,255,255,.04); padding:4px 10px; border-radius:20px; white-space:nowrap; }
    .meteo-forecast { display:flex; gap:8px; margin-top:14px; }
    .mf-day { flex:1; background:rgba(255,255,255,.04); border-radius:12px; padding:10px 6px; text-align:center; border:1px solid rgba(255,255,255,.06); }
    .mf-name { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--text-dim); }
    .mf-ico  { font-size:20px; margin:6px 0; }
    .mf-temps{ display:flex; gap:4px; justify-content:center; font-size:11px; font-weight:700; }
    .weather-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:20px; font-size:11px; font-weight:700; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); }
    .weather-badge.danger { background:rgba(255,77,106,.15); border-color:rgba(255,77,106,.3); color:#ff4d6a; }
    .weather-badge.warn   { background:rgba(255,193,7,.15);  border-color:rgba(255,193,7,.3);  color:#ffc107; }
    .weather-badge.ok     { background:rgba(45,212,160,.12); border-color:rgba(45,212,160,.3); color:#2dd4a0; }
    .list-item.gold { background:rgba(212,168,67,.08); border-left:3px solid var(--gold); }
    /* Transit alert badge pulse */
    #transit-alert-badge { animation: pulse-badge 1.5s infinite; }
    @keyframes pulse-badge { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.15)} }
  `;
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════════
//  INITIALISATION PRINCIPALE
//  Stratégie: charge tout au démarrage, puis intervalle minimal
// ═══════════════════════════════════════════════════════════════════
function initAPIs() {
  LOG('Initialisation APIs WOD v7.0');
  injectCSS();
  injectContainers();
  if (window.Chart) CHARTS_PRO.globalDefaults();
  else window.addEventListener('load', () => { if (window.Chart) CHARTS_PRO.globalDefaults(); });

  AUTOSAVE.start();
  AUTOSAVE.setupCleanExit();

  const defaultPos = { lat: 48.8566, lon: 2.3522 };

  // Charger météo immédiatement (sans limite)
  METEO.load(defaultPos.lat, defaultPos.lon);

  // Attendre GPS puis charger carburant et trafic TomTom
  let _carbuLoaded = false, _gpsWaitCount = 0;
  const _gpsWait = setInterval(() => {
    _gpsWaitCount++;
    const s = window.state;
    const ready = s?.gpsReady && Math.abs(s.pos.lat - 48.8566) > 0.002;
    if (ready || _gpsWaitCount >= 20) {
      clearInterval(_gpsWait);
      const pos = ready ? s.pos : defaultPos;
      if (!_carbuLoaded) {
        _carbuLoaded = true;
        CARBURANT.load(pos.lat, pos.lon);
        if (ready) METEO.load(pos.lat, pos.lon);
      }
    }
  }, 400);

  // Trafic (TomTom + Sytadin) — 1 chargement initial
  setTimeout(() => TRAFFIC.load(), 1000);

  // Navitia alertes TC
  setTimeout(() => NAVITIA.load(), 1500);

  // Vols ADP (cache 1h — économique)
  setTimeout(() => {
    AVIATION.loadArrivals('CDG');
    AVIATION.loadArrivals('ORY');
  }, 2000);

  // IA Zones
  setTimeout(() => IA_ZONES.buildAdvice(), 3000);

  // ─────────────────────────────────────────────────────
  //  INTERVALLES AUTO-REFRESH — minimaux pour quotas gratuits
  // ─────────────────────────────────────────────────────

  // Météo: 30min (sans limite)
  setInterval(() => {
    const p = window.state?.pos || defaultPos;
    METEO.load(p.lat, p.lon);
  }, WOB_CONFIG.REFRESH.meteo);

  // Carburant: 1h (sans limite)
  setInterval(() => {
    const p = window.state?.pos || defaultPos;
    CARBURANT.load(p.lat, p.lon);
  }, WOB_CONFIG.REFRESH.carbu);

  // Trafic: 20min (TomTom ~72 req/jour sur 2500 dispo)
  setInterval(() => TRAFFIC.load(), WOB_CONFIG.REFRESH.traffic);

  // Navitia: 30min
  setInterval(() => NAVITIA.load(), WOB_CONFIG.REFRESH.navitia);

  // Vols ADP: 1h (Open Data, sans limite stricte mais prudent)
  setInterval(() => {
    AVIATION.loadArrivals('CDG');
    AVIATION.loadArrivals('ORY');
  }, WOB_CONFIG.REFRESH.flights);

  // IA Zones: 5min (calcul local, pas d'API)
  setInterval(() => IA_ZONES.buildAdvice(), 5 * 60 * 1000);

  // Rechargement si déplacement GPS significatif (>1km)
  let _lastGpsLat = 0;
  setInterval(() => {
    const s = window.state;
    if (s?.gpsReady && Math.abs(s.pos.lat - _lastGpsLat) > 0.01) {
      _lastGpsLat = s.pos.lat;
      METEO.load(s.pos.lat, s.pos.lon);
      CARBURANT.load(s.pos.lat, s.pos.lon);
      // TomTom: seulement si le cache est expiré (pour éviter de consommer les 2500 req)
      const trafficCacheAge = Date.now() - parseInt(LS.get('wob_tomtom_flow_ts') || '0');
      if (trafficCacheAge > WOB_CONFIG.CACHE_TTL.traffic) TRAFFIC.load();
    }
  }, 60000);

  LOG('APIs WOD v7.0 initialisées ✅');
  LOG('📊 Budget API/jour estimé: TomTom ~72 req (sur 2500 max) | Navitia ~48 req | ADP Open Data illimité');
}

// Lancer après que l'app principale soit prête
if (document.readyState === 'complete') setTimeout(initAPIs, 1500);
else window.addEventListener('load', () => setTimeout(initAPIs, 1500));

// Exposer globalement
window.METEO      = METEO;
window.CARBURANT  = CARBURANT;
window.TRAFFIC    = TRAFFIC;
window.NAVITIA    = NAVITIA;
window.AVIATION   = AVIATION;
window.IA_ZONES   = IA_ZONES;
window.NOTIFS     = NOTIFS;
window.SUPA       = SUPA;
window.AUTOSAVE   = AUTOSAVE;
window.CHARTS_PRO = CHARTS_PRO;
window.WOB_CONFIG = WOB_CONFIG;
window.WOB_STATE  = WOB_STATE;
