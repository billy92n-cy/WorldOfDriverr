"use strict";

// ══════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════
const state = {
  pos:          { lat:48.8566, lon:2.3522 },
  gpsReady:     false,
  gpsWatchId:   null,
  totalGain:    0,
  totalKm:      0,
  totalTrips:   0,
  sessions:     [],
  platformData: {},
  hourData:     new Array(24).fill(0),
  weekdayData:  new Array(7).fill(0),
  depenses:     [],
  docs:         [],
  docType:      'bc',
  docsHistory:  [],
  goals:        { day:0, week:0, month:0 },
  alerts:       [],
  notifications:[],
  currentDoc:   null,
  depCat:       'carburant',
  leafletMap:   null,
  rushChart:    null,
  revenusChart: null,
  donutChart:   null,
  hoursChart:   null,
  weekdayChart: null,
  viewerIdx:    0,
  fabOpen:      false,
  currentPage:  'home',
};

// ══════════════════════════════════════════════════
//  SPLASH
// ══════════════════════════════════════════════════
const SPLASH_MSG = ['Initialisation...','Chargement des modules...','Connexion GPS...','Prêt à démarrer'];
let splashPct = 0;

function animateSplash() {
  const bar    = $('loader-bar');
  const status = $('splash-status');
  const logo   = $('splash-logo');
  const hint   = $('tap-hint');

  const iv = setInterval(() => {
    splashPct += Math.random() * 22 + 6;
    if (splashPct > 100) splashPct = 100;
    bar.style.width = splashPct + '%';
    status.textContent = SPLASH_MSG[Math.min(3, Math.floor(splashPct / 26))];
    if (splashPct >= 100) {
      clearInterval(iv);
      setTimeout(() => {
        logo.classList.add('ready');
        hint.classList.remove('hidden');
        status.textContent = 'Appuyez sur le logo';
        // Show real logo photo, hide WOB text
        const logoImg = document.getElementById('splash-logo-img');
        if (logoImg) logoImg.style.display = 'block';
        const wobText = logo.querySelector('.splash-wob');
        if (wobText) wobText.style.display = 'none';
      }, 300);
    }
  }, 220);
}

window.unlockApp = function() {
  const logo = $('splash-logo');
  if (!logo.classList.contains('ready')) return;
  haptic([40,20,80,20,40]);
  logo.style.transform = 'scale(1.15)';
  setTimeout(() => { logo.style.transform = 'scale(0)'; logo.style.opacity = '0'; }, 150);
  setTimeout(() => {
    $('splash').style.opacity = '0';
    setTimeout(() => {
      $('splash').classList.add('hidden');
      $('app').classList.remove('hidden');
      initApp();
    }, 500);
  }, 400);
};

// ══════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════
function initApp() {
  restoreAll();
  startGPS();
  initMap();
  renderRushChart();
  loadTraffic();
  loadEvents(false);
  initDocForm();
  checkAlerts();
  scheduleAutoBackup();
  updateHeroDate();
}
window.initApp = initApp;
window._initAppCore = initApp;

function updateHeroDate() {
  const el = $('hero-date');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'});
}

// ══════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════
const PAGE_LABELS = {
  home:'Accueil', rush:'Rush', stats:'Stats', docs:'Documents',
  controle:'Contrôle', pause:'Pause', profil:'Profil'
};

window.goTo = function(id) {
  qsa('.screen').forEach(s => s.classList.remove('active'));
  const target = $('screen-' + id);
  if (target) {
    target.classList.add('active');
    const scroll = target.querySelector('.screen-scroll');
    if (scroll) scroll.scrollTop = 0;
  }
  state.currentPage = id;
  const lbl = $('page-label');
  if (lbl) lbl.textContent = PAGE_LABELS[id] || id;
  if (id === 'stats')    refreshCharts();
  if (id === 'rush') {
    loadTraffic();
    // Corriger le rendu Leaflet quand l'onglet devient visible
    setTimeout(() => {
      if (state.leafletMap) {
        state.leafletMap.invalidateSize(true);
        updateMapPosition();
      } else {
        initMap();
      }
    }, 100);
    setTimeout(() => { if (state.leafletMap) state.leafletMap.invalidateSize(true); }, 400);
  }
  if (id === 'controle') renderCtrlDocs();
  haptic(8);
};

window.fabGo = function(id) {
  closeFAB();
  setTimeout(() => goTo(id), 180);
};

window.fabAction = function(type) {
  closeFAB();
  setTimeout(() => {
    goTo('docs');
    switchDocType(type);
  }, 180);
};

window.toggleFAB = function() {
  state.fabOpen = !state.fabOpen;
  $('fab-btn').classList.toggle('open', state.fabOpen);
  $('fab-menu').classList.toggle('active', state.fabOpen);
  $('fab-overlay').classList.toggle('active', state.fabOpen);
  haptic(state.fabOpen ? [15,10,30] : 8);
  if (state.fabOpen && typeof playAppleSound === 'function') playAppleSound();
};

window.closeFAB = function() {
  state.fabOpen = false;
  $('fab-btn').classList.remove('open');
  $('fab-menu').classList.remove('active');
  $('fab-overlay').classList.remove('active');
};

// ══════════════════════════════════════════════════
//  GPS
// ══════════════════════════════════════════════════
function startGPS() {
  if (!navigator.geolocation) return;
  if (state.gpsWatchId) navigator.geolocation.clearWatch(state.gpsWatchId);
  state.gpsWatchId = navigator.geolocation.watchPosition(
    pos => {
      state.pos = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      state.gpsReady = true;
      const badge = $('gps-badge');
      if (badge) badge.classList.add('active');
      updateMapPosition();
    },
    err => console.warn('GPS:', err.message),
    { enableHighAccuracy:true, maximumAge:5000, timeout:10000 }
  );
}

function updateMapPosition() {
  if (!state.leafletMap || !state.gpsReady) return;
  if (!state._gpsMarker) {
    state._gpsMarker = L.circleMarker([state.pos.lat, state.pos.lon], {
      radius:10, color:'#d4a843', fillColor:'#f5c257', fillOpacity:.9, weight:3
    }).addTo(state.leafletMap).bindPopup('Ma position');
  } else {
    state._gpsMarker.setLatLng([state.pos.lat, state.pos.lon]);
  }
}

// ══════════════════════════════════════════════════
//  MAP LEAFLET
// ══════════════════════════════════════════════════
const HOT_ZONES = [
  { nom:'CDG Aéroport',     lat:49.0097, lon:2.5479,  demand:95, color:'#ff4d6a' },
  { nom:'Paris Centre',     lat:48.8566, lon:2.3522,  demand:88, color:'#ff4d6a' },
  { nom:'La Défense',       lat:48.8918, lon:2.2380,  demand:82, color:'#ff4d6a' },
  { nom:'Gare du Nord',     lat:48.8809, lon:2.3553,  demand:78, color:'#ff9955' },
  { nom:'Orly Aéroport',   lat:48.7262, lon:2.3695,  demand:75, color:'#ff9955' },
  { nom:'Gare de Lyon',     lat:48.8448, lon:2.3732,  demand:72, color:'#ff9955' },
  { nom:'Versailles',       lat:48.8049, lon:2.1204,  demand:55, color:'#2dd4a0' },
  { nom:'Saint-Denis',      lat:48.9362, lon:2.3574,  demand:60, color:'#2dd4a0' },
  { nom:'Boulogne',         lat:48.8389, lon:2.2415,  demand:58, color:'#2dd4a0' },
];

function initMap() {
  const container = $('map');
  if (!container || state.leafletMap) return;

  // Force fixed dimensions so Leaflet initialise même si la section est cachée
  container.style.height = '280px';
  container.style.width  = '100%';
  container.style.display = 'block';

  try {
    const map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
      // Centre Paris par défaut
    }).setView([48.8566, 2.3522], 10);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18, subdomains: 'abcd',
    }).addTo(map);

    HOT_ZONES.forEach(z => {
      const radius = 30 + z.demand * 1.5;
      L.circle([z.lat, z.lon], {
        radius, color: z.color, fillColor: z.color,
        fillOpacity: .22, weight: 1.5, opacity: .6,
      }).addTo(map).bindPopup(`<b>${z.nom}</b><br>Demande : ${z.demand}%`);
      L.circleMarker([z.lat, z.lon], {
        radius: 5, color: z.color, fillColor: z.color, fillOpacity: 1, weight: 2,
      }).addTo(map);
    });

    state.leafletMap = map;
    window.state = state;
    updateMapPosition();

    // invalidateSize multiple fois pour corriger le rendu quand la carte était cachée
    setTimeout(() => map.invalidateSize(true), 200);
    setTimeout(() => map.invalidateSize(true), 600);
    setTimeout(() => map.invalidateSize(true), 1200);
  } catch(e) { console.warn('Map init:', e); }
}

window.centerMap = function() {
  if (!state.leafletMap) return;
  if (state.gpsReady) {
    state.leafletMap.setView([state.pos.lat, state.pos.lon], 13, { animate:true });
  } else {
    state.leafletMap.setView([48.8566, 2.3522], 10, { animate:true });
  }
};

// ══════════════════════════════════════════════════
//  RESTORE
// ══════════════════════════════════════════════════
function restoreAll() {
  state.totalGain    = parseFloat(ls('wob_gain')) || 0;
  state.totalKm      = parseFloat(ls('wob_km')) || 0;
  state.totalTrips   = parseInt(ls('wob_trips')) || 0;
  state.sessions     = JSON.parse(ls('wob_sessions') || '[]');
  state.platformData = JSON.parse(ls('wob_platforms') || '{}');
  state.depenses     = JSON.parse(ls('wob_depenses') || '[]');
  state.docs         = JSON.parse(ls('wob_docs') || '[]');
  state.docsHistory  = JSON.parse(ls('wob_docs_history') || '[]');
  state.goals        = JSON.parse(ls('wob_goals') || '{"day":0,"week":0,"month":0}');
  state.notifications= JSON.parse(ls('wob_notifications') || '[]');

  const hd = JSON.parse(ls('wob_hours') || 'null');
  if (hd) state.hourData = hd;
  const wd = JSON.parse(ls('wob_weekday') || 'null');
  if (wd) state.weekdayData = wd;

  updateDashboard();
  renderDepenses();
  renderCtrlDocs();
  renderDocsHistory();
  updateNotifBadge();

  const iaText = ls('wob_ia');
  if (iaText && $('ia-report')) $('ia-report').textContent = iaText;

  const files = JSON.parse(ls('wob_files') || '[]');
  const list  = $('csv-files-list');
  if (list && files.length) list.innerHTML = files.map(f => `<div class="list-item ok">${svgCheck()} ${f}</div>`).join('');

  ['uber','bolt'].forEach(p => {
    const v = ls(`wob_status_${p}`);
    if (v) { const el = $(`sel-${p}`); if (el) el.value = v; }
  });

  restoreProfile();
  restoreAlertDates();

  const theme   = ls('wob_theme') || 'dark';
  const accent  = ls('wob_accent');
  const accent2 = ls('wob_accent2');
  applyTheme(theme);
  if (accent) applyAccent(accent, accent2 || accent);

  const backup = ls('wob_backup_ts');
  if (backup && $('backup-info')) $('backup-info').textContent = `Dernière sauvegarde : ${new Date(parseInt(backup)).toLocaleString('fr-FR')}`;
}

function restoreProfile() {
  const name    = ls('wob_name') || 'Billy';
  const modele  = ls('wob_veh_modele') || '';
  const type    = ls('wob_veh_type') || 'essence';
  const conso   = ls('wob_conso') || '6.5';
  const prix    = ls('wob_prix') || '1.85';
  const rating  = ls('wob_rating') || '';
  const avatar  = ls('wob_avatar') || '';

  setVal('profil-name', name);
  setVal('veh-modele', modele);
  setVal('veh-type', type);
  setVal('veh-conso', conso);
  setVal('veh-prix', prix);
  setVal('input-rating', rating);

  if (avatar) { const av = $('profil-avatar'); if (av) av.innerHTML = `<img src="${avatar}" alt="avatar">`; }
  if (rating) { updateStars(parseFloat(rating)); updateProfileRatingDisplay(rating); }
  onFuelTypeChange(type, false);

  const hname  = $('hd-name'); if (hname) hname.textContent = 'World of Driver';
  const pname  = $('profil-rating'); if (pname && rating) updateProfileRatingDisplay(rating);

  const prestName  = ls('wob_prest_name') || name;
  const prestSiret = ls('wob_prest_siret') || '';
  const prestAddr  = ls('wob_prest_addr') || '';
  setVal('doc-prest-name', prestName);
  setVal('doc-prest-siret', prestSiret);
  setVal('doc-prest-addr', prestAddr);
}

function restoreAlertDates() {
  ['ct','assurance','vtc','medical'].forEach(k => {
    const v = ls(`wob_date_${k}`);
    if (v) setVal(`date-${k}`, v);
  });
}

// ══════════════════════════════════════════════════
//  CSV — Import Bolt / Uber
//  Chaque fichier = 1 mois complet de revenus
//  Logique : additionner Prix TTC de chaque course = revenu mensuel
// ══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  animateSplash();
  const inp = $('csv-input');
  if (inp) inp.addEventListener('change', handleCSV);
  const dateEl = $('doc-date');
  if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
  const numEl = $('doc-num');
  if (numEl && !numEl.value) numEl.value = `${new Date().getFullYear()}-001`;
  addDocLine();
});

async function handleCSV(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  let saved = JSON.parse(ls('wob_files') || '[]');

  for (const file of files) {
    if (saved.includes(file.name)) { showToast(`Déjà importé : ${file.name}`); continue; }

    const res = await parseCSVBolt(file);

    // Accumuler dans le state global
    state.totalGain  += res.totalTTC;
    state.totalKm    += res.totalKm;
    state.totalTrips += res.trips;

    // Plateformes
    const plat = detectPlatform(file.name);
    state.platformData[plat] = (state.platformData[plat] || 0) + res.totalTTC;

    // Données horaires et journalières
    res.sessions.forEach(s => {
      if (s.hour !== undefined) state.hourData[s.hour] += s.ttc;
      if (s.weekday !== undefined) state.weekdayData[s.weekday] += s.ttc;
    });
    state.sessions.push(...res.sessions.map(s => ({
      gain: s.ttc,
      km:   s.km || 0,
      date: s.isoDate || null,
    })));

    saved.push(file.name);

    // Stocker le résumé mensuel
    const monthly = JSON.parse(ls('wob_monthly') || '[]');
    monthly.push({
      file:      file.name,
      platform:  plat,
      month:     res.monthLabel,
      totalTTC:  res.totalTTC,
      trips:     res.trips,
      weeklyBreakdown: res.weeklyBreakdown,
    });
    setLS('wob_monthly', JSON.stringify(monthly));

    // Afficher dans la liste
    const li = document.createElement('div');
    li.className = 'list-item ok';
    li.innerHTML = `${svgCheck()} <strong>${res.monthLabel}</strong> — ${res.trips} courses · <strong>${res.totalTTC.toFixed(2)} €</strong>`;
    $('csv-files-list')?.appendChild(li);

    // Détail semaines
    if (Object.keys(res.weeklyBreakdown).length > 0) {
      Object.entries(res.weeklyBreakdown).sort().forEach(([wk, val]) => {
        const sub = document.createElement('div');
        sub.className = 'list-item info';
        sub.style.fontSize = '.75rem';
        sub.style.marginLeft = '12px';
        sub.innerHTML = `📅 ${wk} : ${val.toFixed(2)} €`;
        $('csv-files-list')?.appendChild(sub);
      });
    }
  }

  // Sauvegarder tout
  setLS('wob_gain',      state.totalGain);
  setLS('wob_km',        state.totalKm);
  setLS('wob_trips',     state.totalTrips);
  setLS('wob_sessions',  JSON.stringify(state.sessions));
  setLS('wob_platforms', JSON.stringify(state.platformData));
  setLS('wob_hours',     JSON.stringify(state.hourData));
  setLS('wob_weekday',   JSON.stringify(state.weekdayData));
  setLS('wob_files',     JSON.stringify(saved));

  updateDashboard();
  await generateIAReport();
  showToast('Import réussi !');
}

// ── Parse CSV Bolt (et Uber) ──────────────────────────────────
// Logique : chaque ligne = 1 course → additionner Prix TTC = revenu mensuel
function parseCSVBolt(file) {
  return new Promise(resolve => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: res => {
        const rows = res.data;
        const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin',
                           'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

        // Colonnes Prix TTC — Bolt utilise "Prix TTC", Uber "Fare" etc.
        const TTC_COLS = ['Prix TTC','Fare','Total','Earnings','Amount','Montant','Prix','Revenue','Gain'];
        // Colonnes date trajet
        const DATE_COLS = ['Date du trajet','Date','date','datetime','pickup_datetime','heure','Heure','Pickup time'];
        // Colonnes km (souvent absentes chez Bolt)
        const KM_COLS = ['Distance (km)','Distance','Trip Distance','Kilometers','km','distance_km'];

        let totalTTC = 0;
        let totalKm  = 0;
        let trips    = 0;
        const sessions = [];
        const weeklyBreakdown = {}; // "Semaine 1 (31/03 – 06/04)": 543.60
        const monthCount = {};

        rows.forEach(row => {
          // Lire Prix TTC
          let ttc = 0;
          for (const col of TTC_COLS) {
            const v = row[col];
            if (v !== undefined && v !== null && v !== '') {
              const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.]/g, ''));
              if (!isNaN(n) && n > 0) { ttc = n; break; }
            }
          }
          if (ttc <= 0) return; // ligne invalide

          // Lire km (optionnel)
          let km = 0;
          for (const col of KM_COLS) {
            const v = row[col];
            if (v !== undefined && v !== null && v !== '') {
              const n = parseFloat(String(v).replace(',', '.'));
              if (!isNaN(n) && n > 0) { km = n; break; }
            }
          }

          totalTTC += ttc;
          totalKm  += km;
          trips++;

          // Lire date
          let dateObj = null;
          for (const col of DATE_COLS) {
            const raw = row[col];
            if (raw) {
              const s = String(raw).trim();
              // Format Bolt : "30.04.2026 21:01"
              const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
              if (m) {
                dateObj = new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]||'12'}:${m[5]||'00'}:00`);
              } else {
                const d = new Date(s);
                if (!isNaN(d.getTime())) dateObj = d;
              }
              if (dateObj && !isNaN(dateObj.getTime())) break;
            }
          }

          const sess = { ttc, km };
          if (dateObj && !isNaN(dateObj.getTime())) {
            sess.isoDate = dateObj.toISOString();
            sess.hour    = dateObj.getHours();
            sess.weekday = dateObj.getDay();

            // Mois dominant
            const mKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}`;
            monthCount[mKey] = (monthCount[mKey] || 0) + 1;

            // Semaine calendaire ISO
            const wkNum  = getISOWeek(dateObj);
            const wkYear = dateObj.getFullYear();
            const wkKey  = `Semaine ${wkNum} (${wkYear})`;
            weeklyBreakdown[wkKey] = (weeklyBreakdown[wkKey] || 0) + ttc;
          }
          sessions.push(sess);
        });

        // Déterminer le mois dominant
        let monthLabel = 'Mois inconnu';
        if (Object.keys(monthCount).length > 0) {
          const dominant = Object.entries(monthCount).sort((a,b) => b[1]-a[1])[0][0];
          const [yr, mo] = dominant.split('-');
          monthLabel = `${MONTHS_FR[parseInt(mo)-1]} ${yr}`;
        } else {
          // Fallback : nom du fichier
          const fn = file.name.toLowerCase();
          const found = MONTHS_FR.find(m => fn.includes(m.toLowerCase()));
          if (found) {
            const yMatch = file.name.match(/20\d{2}/);
            monthLabel = `${found}${yMatch ? ' '+yMatch[0] : ''}`;
          }
        }

        resolve({ totalTTC, totalKm, trips, sessions, monthLabel, weeklyBreakdown });
      },
      error: () => resolve({ totalTTC:0, totalKm:0, trips:0, sessions:[], monthLabel:'Erreur', weeklyBreakdown:{} })
    });
  });
}

// Numéro de semaine ISO 8601
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function detectPlatform(name) {
  const f = name.toLowerCase();
  if (f.includes('bolt')) return 'Bolt';
  if (f.includes('uber')) return 'Uber';
  if (f.includes('heetch')) return 'Heetch';
  return 'Autre';
}

// ══════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════
function updateDashboard() {
  const conso  = parseFloat(ls('wob_conso')) || 6.5;
  const prix   = parseFloat(ls('wob_prix'))  || 1.85;
  const ftype  = ls('wob_veh_type') || 'essence';
  const fuel   = state.totalKm * (conso/100) * prix;
  const totalDep = state.depenses.reduce((s,d) => s+d.montant, 0);
  const net    = state.totalGain - fuel - totalDep;
  const ratio  = state.totalKm > 0 ? net / state.totalKm : 0;

  setText('hero-net', formatEuro(net));
  setText('badge-ratio', `${ratio.toFixed(2)} €/km`);
  setText('badge-fuel', `${formatEuro(fuel)}`);
  setText('badge-depenses', `${formatEuro(totalDep)}`);
  setText('m-brut', formatEuro(state.totalGain));
  setText('m-km', `${state.totalKm.toFixed(0)} km`);
  setText('m-courses', state.totalTrips);
  setText('c-brut', formatEuro(state.totalGain));
  setText('c-carb', formatEuro(fuel));
  setText('c-dep',  formatEuro(totalDep));
  setText('c-net',  formatEuro(net));
  setText('dep-total', formatEuro(totalDep));

  // Objectifs
  const goals = state.goals;
  const todayGain  = getTodayGain();
  const weekGain   = getWeekGain();
  const monthGain  = state.totalGain;

  setText('obj-day-val',   `${formatEuro(todayGain)} / ${formatEuro(goals.day)}`);
  setText('obj-week-val',  `${formatEuro(weekGain)} / ${formatEuro(goals.week)}`);
  setText('obj-month-val', `${formatEuro(monthGain)} / ${formatEuro(goals.month)}`);

  setProgress('prog-day',   goals.day   > 0 ? (todayGain  / goals.day)   * 100 : 0);
  setProgress('prog-week',  goals.week  > 0 ? (weekGain   / goals.week)  * 100 : 0);
  setProgress('prog-month', goals.month > 0 ? (monthGain  / goals.month) * 100 : 0);

  // Projections IA
  updateProjections(net, fuel);
}

function setProgress(id, pct) {
  const el = $(id);
  if (el) el.style.width = Math.min(100, Math.max(0, pct)) + '%';
}

function getTodayGain() {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  return state.sessions.reduce((sum, s) => {
    if (!s.date) return sum;
    const sd = new Date(s.date);
    if (sd.getFullYear() === y && sd.getMonth() === m && sd.getDate() === d) return sum + (s.gain || 0);
    return sum;
  }, 0);
}

function getWeekGain() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=dim
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0,0,0,0);
  return state.sessions.reduce((sum, s) => {
    if (!s.date) return sum;
    const sd = new Date(s.date);
    if (sd >= monday) return sum + (s.gain || 0);
    return sum;
  }, 0);
}

function updateProjections(net, fuel) {
  if (state.totalTrips === 0) return;
  const avgPerTrip = state.totalGain / state.totalTrips;
  const tripsPerDay = state.totalTrips / Math.max(1, getElapsedDays());
  const projDay  = avgPerTrip * tripsPerDay;
  const projWeek = projDay * 7;
  const projMonth= projDay * 30;

  const projHtml = `
    <div class="proj-card"><div class="proj-lbl">Aujourd'hui</div><div class="proj-val">${formatEuro(projDay)}</div></div>
    <div class="proj-card"><div class="proj-lbl">Semaine</div><div class="proj-val">${formatEuro(projWeek)}</div></div>
    <div class="proj-card"><div class="proj-lbl">Mois</div><div class="proj-val">${formatEuro(projMonth)}</div></div>
  `;
  setText('ia-projections', '');
  if ($('ia-projections')) $('ia-projections').innerHTML = projHtml;
  if ($('stats-projections')) $('stats-projections').innerHTML = projHtml;
}

function getElapsedDays() {
  const first = ls('wob_first_session_ts');
  if (!first) return 1;
  return Math.max(1, Math.round((Date.now() - parseInt(first)) / 86400000));
}

// ══════════════════════════════════════════════════
//  IA REPORT
// ══════════════════════════════════════════════════
window.generateIAReport = async function() {
  const iaEl  = $('ia-report');
  const dotEl = $('ia-dots');
  if (!iaEl || state.totalGain === 0) return;
  dotEl?.classList.add('active');
  iaEl.textContent = 'Analyse en cours...';

  const conso    = parseFloat(ls('wob_conso')) || 6.5;
  const prixCarb = parseFloat(ls('wob_prix'))  || 1.85;
  const fuel     = state.totalKm * (conso / 100) * prixCarb;
  const totalDep = state.depenses.reduce((s, d) => s + d.montant, 0);
  const net      = state.totalGain - fuel - totalDep;
  const ratio    = state.totalKm > 0 ? net / state.totalKm : 0;
  const avg      = state.totalTrips > 0 ? state.totalGain / state.totalTrips : 0;

  // Données mensuelles
  const monthly  = JSON.parse(ls('wob_monthly') || '[]');
  const nbMonths = monthly.length;

  // Construire le résumé pour l'IA
  let monthlyLines = '';
  monthly.forEach(m => {
    monthlyLines += `\n• ${m.month} (${m.platform}) : ${m.totalTTC?.toFixed(2) || m.gain?.toFixed(2) || '?'}€ bruts · ${m.trips} courses`;
    if (m.weeklyBreakdown && Object.keys(m.weeklyBreakdown).length > 0) {
      Object.entries(m.weeklyBreakdown).sort().forEach(([wk, val]) => {
        monthlyLines += `\n    - ${wk} : ${val.toFixed(2)}€`;
      });
    }
  });

  const prompt = `Tu es un assistant expert VTC. Génère une analyse concise en français (3-5 phrases + conseils).

RÈGLE ABSOLUE : chaque fichier CSV = UN mois complet. Le revenu mensuel = somme de TOUS les Prix TTC des courses de ce mois. Ne jamais extrapoler annuellement à partir d'un seul mois.

Données par mois importé (${nbMonths} mois) :${monthlyLines || '\n• Pas de détail mensuel disponible'}

Totaux cumulés (${nbMonths} mois confondus) :
- Gains bruts : ${state.totalGain.toFixed(2)}€
- Courses : ${state.totalTrips}
- Distance : ${state.totalKm.toFixed(0)} km${state.totalKm > 0 ? '' : ' (non renseignée)'}
- Carburant estimé : ${fuel.toFixed(2)}€
- Dépenses pro : ${totalDep.toFixed(2)}€
- Bénéfice net estimé : ${net.toFixed(2)}€
- Moyenne par course : ${avg.toFixed(2)}€/course
- Véhicule : ${ls('wob_veh_type') || 'essence'}

Fournis : performance mensuelle, comparaison des semaines si disponible, 2 conseils concrets pour optimiser les revenus.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!resp.ok) throw new Error(`API ${resp.status}`);
    const data = await resp.json();
    const text = data.content?.map(c => c.text || '').join('') || '';
    iaEl.textContent = text;
    setLS('wob_ia', text);
  } catch {
    // Fallback local
    const bestMonth = monthly.length > 0
      ? monthly.reduce((a, b) => ((a.totalTTC||a.gain||0) > (b.totalTTC||b.gain||0) ? a : b))
      : null;
    const txt = `📊 ${nbMonths} mois importé(s) · ${state.totalTrips} courses · ${state.totalGain.toFixed(2)}€ bruts.`
      + (bestMonth ? ` Meilleur mois : ${bestMonth.month} (${(bestMonth.totalTTC||bestMonth.gain||0).toFixed(2)}€).` : '')
      + ` Moyenne : ${avg.toFixed(2)}€/course. Optimisez vos créneaux CDG/Orly pour augmenter la moyenne.`;
    iaEl.textContent = txt;
    setLS('wob_ia', txt);
  } finally {
    dotEl?.classList.remove('active');
  }
};

// ══════════════════════════════════════════════════
//  CHARTS
// ══════════════════════════════════════════════════
function refreshCharts() {
  const conso   = parseFloat(ls('wob_conso')) || 6.5;
  const prix    = parseFloat(ls('wob_prix'))  || 1.85;
  const fuel    = state.totalKm * (conso/100) * prix;
  const totalDep= state.depenses.reduce((s,d) => s+d.montant, 0);
  const net     = state.totalGain - fuel - totalDep;
  const avg     = state.totalTrips > 0 ? state.totalGain/state.totalTrips : 0;
  const pct     = state.totalGain > 0 ? Math.round(net/state.totalGain*100) : 0;

  // KPIs
  const bestSession = state.sessions.length ? state.sessions.reduce((a,b) => a.gain>b.gain?a:b, state.sessions[0]) : null;
  setText('kpi-best',  bestSession ? formatEuro(bestSession.gain) : '—');
  setText('kpi-avg',   formatEuro(avg));
  setText('kpi-rate',  `${pct}%`);
  setText('kpi-hours', `${Math.round(state.totalKm/30)}h`);

  // Revenus bar
  const c1 = $('canvas-revenus');
  if (c1) {
    state.revenusChart?.destroy();
    state.revenusChart = new Chart(c1, {
      type:'bar',
      data:{ labels:['Gains Bruts','Carburant','Dépenses','Bénéfice Net'],
        datasets:[{ data:[+state.totalGain.toFixed(2),+fuel.toFixed(2),+totalDep.toFixed(2),+Math.max(0,net).toFixed(2)],
          backgroundColor:['rgba(212,168,67,.55)','rgba(255,77,106,.55)','rgba(255,153,85,.55)','rgba(45,212,160,.55)'],
          borderColor:['#d4a843','#ff4d6a','#ff9955','#2dd4a0'], borderWidth:2, borderRadius:10,
        }]
      }, options:cOpts()
    });
  }

  // Donut
  const c2 = $('canvas-donut');
  if (c2 && state.totalGain > 0) {
    state.donutChart?.destroy();
    state.donutChart = new Chart(c2, {
      type:'doughnut',
      data:{ labels:['Net','Carburant','Dépenses'],
        datasets:[{ data:[+Math.max(0,net).toFixed(2),+fuel.toFixed(2),+totalDep.toFixed(2)],
          backgroundColor:['rgba(45,212,160,.7)','rgba(255,77,106,.7)','rgba(255,153,85,.7)'],
          borderColor:['#2dd4a0','#ff4d6a','#ff9955'], borderWidth:2,
        }]
      }, options:{ responsive:true, maintainAspectRatio:false, cutout:'65%', plugins:{ legend:{ labels:{ color:'#7a8499', font:{size:11} } } } }
    });
  }

  // Weekday
  const c3 = $('canvas-weekday');
  if (c3) {
    state.weekdayChart?.destroy();
    const wlabels = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    state.weekdayChart = new Chart(c3, {
      type:'bar',
      data:{ labels:wlabels,
        datasets:[{ data:state.weekdayData,
          backgroundColor:state.weekdayData.map(v => v>0?'rgba(212,168,67,.6)':'rgba(255,255,255,.04)'),
          borderColor:state.weekdayData.map(v => v>0?'#d4a843':'rgba(255,255,255,.06)'),
          borderWidth:1, borderRadius:8,
        }]
      }, options:cOpts()
    });
  }

  // Hours
  const c4 = $('canvas-hours');
  if (c4) {
    state.hoursChart?.destroy();
    const hasH = state.hourData.some(v=>v>0);
    const hNote = $('hours-note');
    if (!hasH && hNote) hNote.textContent = 'Pas de données horaires dans vos CSV';
    state.hoursChart = new Chart(c4, {
      type:'bar',
      data:{ labels:Array.from({length:24},(_,i)=>`${i}h`),
        datasets:[{ data: hasH ? state.hourData : [45,62,0,0,0,15,45,80,75,55,50,55,60,52,50,55,65,85,90,78,60,75,90,70],
          backgroundColor: hasH ? state.hourData.map(v=>v>0?'rgba(212,168,67,.6)':'rgba(255,255,255,.04)') : 'rgba(212,168,67,.25)',
          borderColor: hasH ? state.hourData.map(v=>v>0?'#d4a843':'rgba(255,255,255,.06)') : '#d4a843',
          borderWidth:1, borderRadius:5,
        }]
      }, options:cOpts(hasH ? '' : 'Aperçu estimatif')
    });
  }

  // Plateformes
  const platEl = $('platforms-breakdown');
  if (platEl) {
    const pd = state.platformData, keys = Object.keys(pd);
    if (keys.length) {
      const total = Object.values(pd).reduce((a,b)=>a+b,0);
      platEl.innerHTML = keys.map(k => {
        const p = total > 0 ? Math.round(pd[k]/total*100) : 0;
        return `<div class="list-item gold" style="display:flex;justify-content:space-between">
          <span>${k}</span><span style="font-weight:700">${formatEuro(pd[k])} (${p}%)</span>
        </div>`;
      }).join('');
    } else { platEl.innerHTML = `<p class="empty-hint">Importez des CSV pour voir la répartition.</p>`; }
  }

  updateProjections(net, fuel);
}

function cOpts(title='') {
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{ display:false },
      title: title ? { display:true, text:title, color:'#7a8499', font:{size:10} } : { display:false }
    },
    scales:{
      y:{ ticks:{ color:'#7a8499', font:{size:10} }, grid:{ color:'rgba(255,255,255,.04)' } },
      x:{ ticks:{ color:'#7a8499', font:{size:10} }, grid:{ display:false } }
    }
  };
}

function renderRushChart() {
  const ctx = $('canvas-rush');
  if (!ctx) return;
  state.rushChart?.destroy();
  const labels = Array.from({length:24},(_,i)=>`${i}h`);
  const uber   = [20,10,8,5,5,15,45,80,75,55,50,55,60,52,50,55,65,85,90,78,60,75,90,70];
  const bolt   = [15,8,5,3,3,10,35,70,65,48,42,48,52,45,42,48,58,80,85,72,55,70,85,65];
  state.rushChart = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets:[
      { label:'Uber', data:uber, borderColor:'#fff', backgroundColor:'rgba(255,255,255,.05)', borderWidth:2, pointRadius:0, fill:true, tension:.4 },
      { label:'Bolt', data:bolt, borderColor:'#34d399', backgroundColor:'rgba(52,211,153,.05)', borderWidth:2, pointRadius:0, fill:true, tension:.4 }
    ]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:'#7a8499', font:{size:11} } } },
      scales:{
        y:{ min:0, max:100, ticks:{ color:'#7a8499', font:{size:9} }, grid:{ color:'rgba(255,255,255,.04)' } },
        x:{ ticks:{ color:'#7a8499', font:{size:9} }, grid:{ display:false } }
      }
    }
  });
}

// ══════════════════════════════════════════════════
//  TRAFFIC & EVENTS
// ══════════════════════════════════════════════════
const IDF_ZONES = [
  { nom:'Paris Centre',  lat:48.8566, lon:2.3522 },
  { nom:'CDG Aéroport',  lat:49.0097, lon:2.5479 },
  { nom:'Orly Aéroport', lat:48.7262, lon:2.3695 },
  { nom:'La Défense',    lat:48.8918, lon:2.2380 },
  { nom:'Gare du Nord',  lat:48.8809, lon:2.3553 },
  { nom:'Gare de Lyon',  lat:48.8448, lon:2.3732 },
  { nom:'Versailles',    lat:48.8049, lon:2.1204 },
  { nom:'Saint-Denis',   lat:48.9362, lon:2.3574 },
];

function getRushStatus() {
  const h=new Date().getHours(), d=new Date().getDay();
  if (d===5&&h>=17&&h<=23) return { title:'RUSH Vendredi soir', sub:'Surge probable — Zone centrale', cls:'danger' };
  if (d===6&&h>=20)        return { title:'Nuit Samedi — Forte demande', sub:'Zone festive · Grands Boulevards', cls:'danger' };
  if (d===6&&h>=12)        return { title:'Samedi après-midi', sub:'Shopping · Loisirs — Activité élevée', cls:'warn' };
  if (d>=1&&d<=5&&h>=7&&h<=9)   return { title:'Rush matin (7h–9h)', sub:'Gares et zones bureaux', cls:'warn' };
  if (d>=1&&d<=5&&h>=17&&h<=20) return { title:'Rush soir (17h–20h)', sub:'Fort trafic — Positions stratégiques', cls:'warn' };
  if (h>=22||h<=5) return { title:'Nuit — Faible demande', sub:'Repos conseillé · CDG si actif', cls:'info' };
  return { title:'Activité normale', sub:'Trafic fluide attendu', cls:'ok' };
}

window.loadTraffic = async function() {
  const rush = getRushStatus();
  setText('rush-title', rush.title);
  setText('rush-sub', rush.sub);

  const h = new Date().getHours();
  const conseils = [];
  if (h>=6&&h<=9)   conseils.push('Gare du Nord · Gare de Lyon — Clients pro le matin');
  if (h>=11&&h<=14) conseils.push('Zone Opéra / Châtelet — Déjeuners affaires');
  if (h>=17&&h<=20) conseils.push('La Défense + gares — plus de courses');
  if (h>=20&&h<=23) conseils.push('Sorties spectacles — Grands Boulevards, Bastille');
  if (h>=22)        conseils.push('CDG la nuit = course garantie longue distance');
  conseils.push('Orly : moins de concurrence que CDG');
  conseils.push('Vérifiez l\'onglet Événements pour planifier');

  const consEl = $('rush-conseils');
  if (consEl) consEl.innerHTML = conseils.map(c => `<div class="list-item gold">${c}</div>`).join('');

  const zonesEl = $('traffic-zones');
  if (!zonesEl) return;
  zonesEl.innerHTML = `<div class="list-item info">Calcul des trajets...</div>`;

  const results = await Promise.all(IDF_ZONES.map(z => fetchRoute(z)));
  let html = '';
  IDF_ZONES.forEach((z,i) => {
    const r = results[i];
    if (r) {
      html += `<div class="list-item ${r.cls}" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div>
          <div style="font-weight:700;font-size:.82rem">${z.nom}</div>
          <div style="font-size:.7rem;opacity:.8">${r.congestion}</div>
          ${r.tip ? `<div style="font-size:.68rem;color:var(--gold)">${r.tip}</div>` : ''}
        </div>
        <div style="text-align:right;font-weight:700;white-space:nowrap">
          <div>${r.mins} min</div>
          <div style="font-size:.72rem;opacity:.8">${r.km} km</div>
        </div>
      </div>`;
    } else {
      html += `<div class="list-item info">${z.nom} — Indisponible</div>`;
    }
  });
  zonesEl.innerHTML = html;
  clearTimeout(window._trafficTimer);
  window._trafficTimer = setTimeout(loadTraffic, 5*60*1000);
};

async function fetchRoute(zone) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${state.pos.lon},${state.pos.lat};${zone.lon},${zone.lat}?overview=false`;
    const resp = await fetch(url, { signal:AbortSignal.timeout(7000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    const dur  = data.routes?.[0]?.duration;
    const dist = data.routes?.[0]?.distance;
    if (!dur||!dist) return null;
    const mins=Math.round(dur/60), km=(dist/1000).toFixed(1), speed=(dist/1000)/(dur/3600);
    let congestion, cls;
    if (speed>50)      { congestion='Fluide';       cls='ok'; }
    else if (speed>30) { congestion='Modéré';       cls='info'; }
    else if (speed>15) { congestion='Chargé';       cls='warn'; }
    else               { congestion='Congestionné'; cls='danger'; }
    let tip='';
    if (zone.nom.includes('CDG')||zone.nom.includes('Orly')) tip='Courses longues rentables';
    else if (zone.nom.includes('Défense')) tip='Clientèle affaires';
    return { mins, km, congestion, cls, tip };
  } catch { return null; }
}

window.loadEvents = async function(forceRefresh) {
  const el = $('events-list');
  if (!el) return;

  // Check cache first (max 30min)
  const cache = ls('wob_events');
  const cacheTs = parseInt(ls('wob_events_ts') || '0');
  const cacheAge = Date.now() - cacheTs;
  const CACHE_MAX = 30 * 60 * 1000;

  if (!forceRefresh && cache && cacheAge < CACHE_MAX) {
    renderEvents(JSON.parse(cache));
    return;
  }

  el.innerHTML = `<div class="list-item info">Chargement des événements...</div>`;

  try {
    const today = new Date().toISOString().split('T')[0];
    const in14d = new Date(Date.now()+14*86400000).toISOString().split('T')[0];

    // L'API Paris OpenData v2.1 requiert le préfixe date'' pour les dates
    const where = `date_start >= date'${today}' AND date_start <= date'${in14d}'`;
    const url = `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records`
      + `?where=${encodeURIComponent(where)}`
      + `&order_by=date_start`
      + `&limit=25`
      + `&select=title,date_start,address_name,address_zipcode,tags,url,price_type`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data.results?.length) throw new Error('Pas de résultats');

    const sorted = data.results
      .map(ev => ({ ...ev, _impact: getEventImpact(ev) }))
      .sort((a,b) => b._impact.score - a._impact.score);

    setLS('wob_events', JSON.stringify(sorted));
    setLS('wob_events_ts', Date.now().toString());
    renderEvents(sorted);
  } catch(e) {
    console.warn('[Events]', e.message);
    if (cache) {
      const ageH = Math.round(cacheAge / 3600000);
      renderEvents(JSON.parse(cache));
      el.insertAdjacentHTML('afterbegin', `<div class="list-item warn">Hors-ligne · Cache : ${ageH}h</div>`);
    } else {
      // Fallback : afficher des événements simulés connus IDF
      renderEventsFallback(el);
    }
  }
};

function getEventImpact(ev) {
  const txt = ((ev.title||'')+(ev.tags||'')+(ev.address_name||'')).toLowerCase();
  if (txt.match(/stade de france|bercy|accor arena|grand palais|parc des princes/))
    return { label:'Très fort impact', cls:'danger', score:3 };
  if (txt.match(/concert|festival|salon|finale|grand prix|marathon/))
    return { label:'Fort impact', cls:'warn', score:2 };
  if (txt.match(/theatre|spectacle|exposition|cinema|marché/))
    return { label:'Impact modéré', cls:'info', score:1 };
  return { label:'Faible impact', cls:'ok', score:0 };
}

function renderEvents(events) {
  const el = $('events-list');
  if (!el) return;
  el.innerHTML = events.map(ev => {
    const imp  = ev._impact;
    const date = ev.date_start
      ? new Date(ev.date_start).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
      : '—';
    const lieu = ev.address_name ? `${ev.address_name}${ev.address_zipcode?` (${ev.address_zipcode})`:''}` : '';
    const lien = ev.url ? `<a href="${ev.url}" target="_blank" style="color:var(--gold);font-size:.68rem;font-weight:700;text-decoration:none">Voir →</a>` : '';
    return `<div class="list-item ${imp.cls}" data-impact="${imp.score}" style="flex-direction:column;display:flex;gap:2px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
        <span style="font-weight:700;font-size:.8rem;flex:1">${ev.title||'Événement'}</span>
        ${lien}
      </div>
      <span style="font-size:.7rem;opacity:.85">${date}</span>
      ${lieu ? `<span style="font-size:.68rem;opacity:.7">${lieu}</span>` : ''}
      <span style="font-size:.68rem;font-weight:700">${imp.label}</span>
    </div>`;
  }).join('');
}

function renderEventsFallback(el) {
  // Affichage de secours quand l'API Paris est indisponible
  const now = new Date();
  const fmt = d => d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'});
  const d1 = fmt(new Date(now.getTime()+86400000));
  const d2 = fmt(new Date(now.getTime()+2*86400000));
  const d3 = fmt(new Date(now.getTime()+5*86400000));
  el.innerHTML = `
    <div class="list-item warn" style="font-size:11px;border-radius:8px;margin-bottom:8px;">
      ⚠️ API Paris temporairement indisponible · Appuyez sur 🔄 pour réessayer
    </div>
    <div class="list-item danger" data-impact="3" style="flex-direction:column;gap:2px;">
      <span style="font-weight:700;font-size:.8rem;">🏟️ Concerts & Événements Bercy / AccorArenas</span>
      <span style="font-size:.7rem;opacity:.85">${d1}</span>
      <span style="font-size:.68rem;font-weight:700;color:#ff4d6a;">Très fort impact VTC — Se positionner tôt</span>
    </div>
    <div class="list-item warn" data-impact="2" style="flex-direction:column;gap:2px;">
      <span style="font-weight:700;font-size:.8rem;">🎭 Spectacles — Grands Boulevards & Opéra</span>
      <span style="font-size:.7rem;opacity:.85">${d2}</span>
      <span style="font-size:.68rem;font-weight:700;">Fort impact · Zones Opéra / République</span>
    </div>
    <div class="list-item info" data-impact="1" style="flex-direction:column;gap:2px;">
      <span style="font-weight:700;font-size:.8rem;">🏃 Marché & Expositions — Paris centre</span>
      <span style="font-size:.7rem;opacity:.85">${d3}</span>
      <span style="font-size:.68rem;font-weight:700;">Impact modéré</span>
    </div>`;
}

window.filterEvents = function(type, btn) {
  qsa('.ef-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  qsa('#events-list .list-item').forEach(item => {
    const score = parseInt(item.dataset.impact || '0');
    if (type==='all')    item.style.display='';
    else if (type==='fort')  item.style.display = score>=2 ? '' : 'none';
    else if (type==='mod')   item.style.display = score===1 ? '' : 'none';
    else if (type==='faible') item.style.display = score===0 ? '' : 'none';
  });
};

// ══════════════════════════════════════════════════
//  POI
// ══════════════════════════════════════════════════
const POI_CFG = {
  cafe:    { query:'amenity=cafe', icon:'cafe', name:'Café', radius:1000, title:'Cafés à proximité' },
  mosque:  { query:'amenity=place_of_worship][religion=muslim', icon:'mosque', name:'Mosquée', radius:3000, title:'Mosquées à proximité' },
  fuel:    { query:'amenity=fuel', icon:'fuel', name:'Station', radius:2000, title:'Stations-service' },
  parking: { query:'amenity=parking', icon:'parking', name:'Parking', radius:1000, title:'Parkings à proximité' },
};

window.loadPOI = async function(type, btn) {
  qsa('.poi-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const cfg = POI_CFG[type];
  if (!cfg) return;
  setText('poi-title', cfg.title);
  setText('poi-radius', `rayon ${cfg.radius/1000}km`);
  const resEl = $('poi-results');
  if (resEl) resEl.innerHTML = `<div class="list-item info">📍 Localisation GPS en cours...</div>`;

  // Get real GPS position (not default Paris)
  if (!state.gpsReady || (state.pos.lat === 48.8566 && state.pos.lon === 2.3522)) {
    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          pos => {
            state.pos = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            state.gpsReady = true;
            window.state = state;
            const badge = $('gps-badge');
            if (badge) badge.classList.add('active');
            resolve();
          },
          err => { console.warn('GPS POI:', err.message); resolve(); }, // continue with default
          { enableHighAccuracy: true, timeout: 7000, maximumAge: 10000 }
        );
      });
    } catch(e) {}
  }

  if (resEl) resEl.innerHTML = `<div class="list-item info">Recherche en cours...</div>`;
  const {lat,lon} = state.pos;
  const q = `[out:json][timeout:10];node[${cfg.query}](around:${cfg.radius},${lat},${lon});out 8;`;
  try {
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method:'POST', body:q, signal:AbortSignal.timeout(9000)
    });
    const data = await resp.json();
    if (!data.elements?.length) {
      resEl.innerHTML = `<div class="list-item warn">Aucun ${cfg.name} dans un rayon de ${cfg.radius/1000}km.</div>`;
      return;
    }
    const sorted = data.elements
      .map(el => ({...el, dist:haversine(lat,lon,el.lat,el.lon)}))
      .sort((a,b)=>a.dist-b.dist).slice(0,7);
    resEl.innerHTML = sorted.map(el => {
      const name  = el.tags?.name || cfg.name;
      const dist  = el.dist<1000 ? `${el.dist}m` : `${(el.dist/1000).toFixed(1)}km`;
      const addr  = el.tags?.['addr:street'] ? `${el.tags['addr:street']} ${el.tags['addr:housenumber']||''}` : '';
      const hours = el.tags?.opening_hours || '';
      const mapsUrl = `https://maps.google.com/?q=${el.lat},${el.lon}`;
      return `<div class="poi-item" onclick="window.open('${mapsUrl}','_blank')">
        <div class="poi-top"><span class="poi-name">${name}</span><span class="poi-dist">${dist}</span></div>
        ${addr?`<span class="poi-addr">${addr}</span>`:''}
        ${hours?`<span class="poi-addr">${hours}</span>`:''}
        <span class="poi-nav">Ouvrir itinéraire →</span>
      </div>`;
    }).join('');
  } catch { resEl.innerHTML = `<div class="list-item danger">Service POI indisponible (hors-ligne)</div>`; }
};

// ══════════════════════════════════════════════════
//  DÉPENSES
// ══════════════════════════════════════════════════
window.openDepenseModal = function() {
  const today = new Date().toISOString().split('T')[0];
  setVal('dep-montant',''); setVal('dep-note',''); setVal('dep-date', today);
  openModal('dep-modal');
};

window.selectDepCat = function(btn) {
  qsa('.dep-cat').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.depCat = btn.dataset.cat;
};

window.saveDepense = function() {
  const montant = parseFloat($('dep-montant')?.value);
  if (!montant || montant <= 0) { showToast('Montant invalide'); return; }
  const dep = {
    id:     Date.now(),
    cat:    state.depCat,
    montant,
    note:   $('dep-note')?.value || '',
    date:   $('dep-date')?.value || new Date().toISOString().split('T')[0],
  };
  state.depenses.push(dep);
  setLS('wob_depenses', JSON.stringify(state.depenses));
  closeModal('dep-modal');
  renderDepenses();
  updateDashboard();
  showToast('Dépense enregistrée');
};

function renderDepenses() {
  const el = $('depenses-list');
  if (!el) return;
  if (!state.depenses.length) { el.innerHTML = `<p class="empty-hint">Aucune dépense enregistrée.</p>`; return; }
  const recent = [...state.depenses].reverse().slice(0,5);
  el.innerHTML = recent.map(d => `
    <div class="dep-item">
      <div class="dep-ico">${depIcon(d.cat)}</div>
      <div class="dep-info">
        <div class="dep-cat-lbl">${d.cat}</div>
        ${d.note?`<div class="dep-note-txt">${d.note}</div>`:''}
      </div>
      <div class="dep-amount">-${formatEuro(d.montant)}</div>
    </div>
  `).join('');

  const hist = $('hist-depenses');
  if (hist) {
    if (!state.depenses.length) { hist.innerHTML = `<p class="empty-hint">Aucune dépense.</p>`; return; }
    hist.innerHTML = [...state.depenses].reverse().map(d => `
      <div class="dep-item">
        <div class="dep-ico">${depIcon(d.cat)}</div>
        <div class="dep-info">
          <div class="dep-cat-lbl">${d.cat}</div>
          <div class="dep-note-txt">${d.date}${d.note?' · '+d.note:''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="dep-amount">-${formatEuro(d.montant)}</div>
          <button onclick="deleteDepense(${d.id})" style="background:rgba(255,77,106,.1);border:none;color:var(--red);border-radius:8px;padding:5px 8px;cursor:pointer;font-size:.72rem">Sup.</button>
        </div>
      </div>
    `).join('');
  }
}

window.deleteDepense = function(id) {
  state.depenses = state.depenses.filter(d => d.id !== id);
  setLS('wob_depenses', JSON.stringify(state.depenses));
  renderDepenses();
  updateDashboard();
  showToast('Dépense supprimée');
};

function depIcon(cat) {
  const icons = {
    carburant:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 22V8l9-6 9 6v14"/><path d="M9 22V12h6v10"/></svg>',
    repas:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>',
    lavage:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>',
    amende:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
    entretien:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>',
    autre:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  };
  return icons[cat] || icons.autre;
}

// ══════════════════════════════════════════════════
//  DOCUMENTS GÉNÉRATION + PDF
// ══════════════════════════════════════════════════
function initDocForm() {
  updateDocTotal();
}

window.switchDocType = function(type) {
  state.docType = type;
  $('btn-bc')?.classList.toggle('active', type==='bc');
  $('btn-fac')?.classList.toggle('active', type==='fac');
  setText('doc-form-title', type==='bc' ? 'Nouveau Bon de Commande' : 'Nouvelle Facture');
  const numEl = $('doc-num');
  if (numEl) numEl.value = `${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
};

window.addDocLine = function() {
  const id = Date.now();
  const container = $('doc-lines');
  const div = document.createElement('div');
  div.className = 'doc-line';
  div.id = `line-${id}`;
  div.innerHTML = `
    <input class="fi" placeholder="Description" oninput="updateDocTotal()">
    <input class="fi" type="number" placeholder="Qté" value="1" min="1" oninput="updateDocTotal()">
    <input class="fi" type="number" placeholder="Prix €" min="0" step="0.01" oninput="updateDocTotal()">
    <button class="doc-line-del" onclick="removeLine('line-${id}')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  container?.appendChild(div);
  updateDocTotal();
};

window.removeLine = function(id) {
  $(id)?.remove();
  updateDocTotal();
};

window.updateDocTotal = function() {
  let total = 0;
  qsa('.doc-line').forEach(line => {
    const inputs = line.querySelectorAll('input[type="number"]');
    total += (parseFloat(inputs[0]?.value)||0) * (parseFloat(inputs[1]?.value)||0);
  });
  setText('doc-total-ht',  formatEuro(total));
  setText('doc-total-tva', '0,00 €');
  setText('doc-total-ttc', formatEuro(total));
};

window.generateDoc = function() {
  const type   = state.docType === 'bc' ? 'BON DE COMMANDE' : 'FACTURE';
  const client = { name:val('doc-client-name')||'Client', addr:val('doc-client-addr'), email:val('doc-client-email') };
  const prest  = { name:val('doc-prest-name')||'Prestataire', siret:val('doc-prest-siret'), addr:val('doc-prest-addr') };
  const num    = val('doc-num') || '001';
  const date   = val('doc-date') || new Date().toISOString().split('T')[0];
  const notes  = val('doc-notes');

  setLS('wob_prest_name', prest.name);
  setLS('wob_prest_siret', prest.siret);
  setLS('wob_prest_addr', prest.addr);

  const lines = [];
  qsa('.doc-line').forEach(line => {
    const desc   = line.querySelector('input[placeholder="Description"]')?.value || '';
    const inputs = line.querySelectorAll('input[type="number"]');
    const qty    = parseFloat(inputs[0]?.value)||0;
    const price  = parseFloat(inputs[1]?.value)||0;
    if (desc || (qty && price)) lines.push({ desc, qty, price, total:qty*price });
  });
  const total = lines.reduce((s,l)=>s+l.total,0);
  const dateFmt = new Date(date).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});

  // Store for history
  const docEntry = { id:Date.now(), type:state.docType, num, date, client:client.name, total };
  state.docsHistory.unshift(docEntry);
  setLS('wob_docs_history', JSON.stringify(state.docsHistory.slice(0,50)));
  renderDocsHistory();

  state.currentDoc = { type, client, prest, num, date:dateFmt, notes, lines, total };

  const html = buildDocHTML(state.currentDoc);
  setText('modal-title', `${type} N°${num}`);
  if ($('modal-content')) $('modal-content').innerHTML = html;
  openModal('doc-modal');
};

function buildDocHTML(doc) {
  const linesHTML = doc.lines.map(l => `
    <tr>
      <td>${l.desc}</td>
      <td style="text-align:center">${l.qty}</td>
      <td style="text-align:right">${formatEuro(l.price)}</td>
      <td style="text-align:right;font-weight:700">${formatEuro(l.total)}</td>
    </tr>
  `).join('');

  return `<div class="doc-print-wrap">
    <div class="doc-print-hd">
      <div>
        <div class="doc-print-logo">WOB</div>
        <div class="doc-print-logo-sub">World of Billy — VTC Premium</div>
      </div>
      <div>
        <div class="doc-print-type">${doc.type}</div>
        <div class="doc-print-meta">N° ${doc.num} · ${doc.date}</div>
      </div>
    </div>
    <div class="doc-print-parties">
      <div>
        <div class="dp-title">Prestataire</div>
        <div class="dp-name">${doc.prest.name}</div>
        <div class="dp-info">${doc.prest.addr||''}${doc.prest.siret?`<br>SIRET: ${doc.prest.siret}`:''}</div>
      </div>
      <div>
        <div class="dp-title">Client</div>
        <div class="dp-name">${doc.client.name}</div>
        <div class="dp-info">${doc.client.addr||''}${doc.client.email?`<br>${doc.client.email}`:''}</div>
      </div>
    </div>
    <table class="doc-print-table">
      <thead><tr><th>Description</th><th>Qté</th><th style="text-align:right">P.U.</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${linesHTML}</tbody>
    </table>
    <div class="doc-totals-box">
      <div class="doc-totals-inner">
        <div class="doc-tot-print"><span>Total HT</span><span>${formatEuro(doc.total)}</span></div>
        <div class="doc-tot-print"><span>TVA (0%)</span><span>0,00 €</span></div>
        <div class="doc-tot-print main"><span>TOTAL TTC</span><span>${formatEuro(doc.total)}</span></div>
      </div>
    </div>
    ${doc.notes?`<div class="doc-notes-box">${doc.notes}</div>`:''}
    <div class="doc-print-footer">Document généré par World of Billy — Auto-entrepreneur VTC</div>
  </div>`;
}

window.generatePDF = function() {
  if (!window.jspdf) { window.print(); return; }
  const { jsPDF } = window.jspdf;
  const doc2 = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const d = state.currentDoc;
  if (!d) { window.print(); return; }

  // Header
  doc2.setFillColor(212,168,67);
  doc2.rect(0,0,210,18,'F');
  doc2.setTextColor(0,0,0);
  doc2.setFontSize(14); doc2.setFont('helvetica','bold');
  doc2.text('WOB — World of Billy', 14, 12);
  doc2.setFontSize(10); doc2.setFont('helvetica','normal');
  doc2.text(`${d.type} N° ${d.num}`, 140, 8);
  doc2.text(d.date, 140, 14);

  // Parties
  doc2.setTextColor(30,30,30);
  doc2.setFontSize(9); doc2.setFont('helvetica','bold');
  doc2.text('PRESTATAIRE', 14, 28);
  doc2.setFont('helvetica','normal');
  doc2.text(d.prest.name, 14, 33);
  if (d.prest.addr) doc2.text(d.prest.addr, 14, 37);
  if (d.prest.siret) doc2.text(`SIRET: ${d.prest.siret}`, 14, 41);

  doc2.setFont('helvetica','bold');
  doc2.text('CLIENT', 120, 28);
  doc2.setFont('helvetica','normal');
  doc2.text(d.client.name, 120, 33);
  if (d.client.addr) doc2.text(d.client.addr, 120, 37);
  if (d.client.email) doc2.text(d.client.email, 120, 41);

  // Table
  let y = 52;
  doc2.setFillColor(30,30,30); doc2.rect(14,y,182,7,'F');
  doc2.setTextColor(255,255,255); doc2.setFontSize(8); doc2.setFont('helvetica','bold');
  doc2.text('Description', 16, y+5);
  doc2.text('Qté', 120, y+5);
  doc2.text('P.U.', 145, y+5);
  doc2.text('Total', 170, y+5);
  y+=7;

  doc2.setTextColor(30,30,30); doc2.setFont('helvetica','normal');
  d.lines.forEach((l,i) => {
    if (i%2===0) { doc2.setFillColor(250,250,250); doc2.rect(14,y,182,7,'F'); }
    doc2.text(l.desc.substring(0,45), 16, y+5);
    doc2.text(String(l.qty), 122, y+5);
    doc2.text(formatEuro(l.price), 144, y+5);
    doc2.text(formatEuro(l.total), 169, y+5);
    y+=7;
  });

  // Totals
  y+=5;
  doc2.setDrawColor(200,200,200); doc2.line(120,y,196,y);
  y+=5;
  doc2.text('Total HT :', 130, y); doc2.text(formatEuro(d.total), 175, y);
  y+=5; doc2.text('TVA (0%) :', 130, y); doc2.text('0,00 €', 175, y);
  y+=2; doc2.setDrawColor(212,168,67); doc2.setLineWidth(0.5); doc2.line(120,y,196,y);
  y+=6; doc2.setFont('helvetica','bold'); doc2.setFontSize(10);
  doc2.setTextColor(212,168,67);
  doc2.text('TOTAL TTC :', 128, y); doc2.text(formatEuro(d.total), 172, y);

  if (d.notes) {
    y+=12; doc2.setTextColor(80,80,80); doc2.setFontSize(8); doc2.setFont('helvetica','normal');
    doc2.text(`Notes : ${d.notes}`, 14, y);
  }

  // Footer
  doc2.setTextColor(180,180,180); doc2.setFontSize(7); doc2.setFont('helvetica','normal');
  doc2.text('Document généré par World of Billy — Auto-entrepreneur VTC', 105, 285, {align:'center'});

  doc2.save(`${d.type.replace(/ /g,'-')}_${d.num}.pdf`);
  showToast('PDF téléchargé !');
};

function renderDocsHistory() {
  const el = $('docs-history');
  if (!el) return;
  if (!state.docsHistory.length) { el.innerHTML = `<p class="empty-hint">Aucun document généré.</p>`; return; }
  el.innerHTML = state.docsHistory.map(doc => `
    <div class="hist-item">
      <div class="hist-row">
        <span class="hist-type">${doc.type === 'bc' ? 'Bon de commande' : 'Facture'}</span>
        <span class="hist-num">N° ${doc.num}</span>
      </div>
      <div class="hist-row" style="margin-top:4px">
        <span class="hist-client">${doc.client}</span>
        <span class="hist-total">${formatEuro(doc.total)}</span>
      </div>
      <div class="hist-date">${new Date(doc.id).toLocaleDateString('fr-FR')}</div>
    </div>
  `).join('');
}

window.filterHistory = function(q) {
  const items = qsa('#docs-history .hist-item');
  items.forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
};

// ══════════════════════════════════════════════════
//  CONTROLE — docs visuels
// ══════════════════════════════════════════════════
window.uploadDocs = function(input) {
  const files = Array.from(input.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const doc = { name:file.name, src:e.target.result, type:file.type, id:Date.now()+Math.random() };
      state.docs.push(doc);
      saveDocs();
      renderCtrlDocs();
      showToast(`Document ajouté : ${file.name}`);
    };
    reader.readAsDataURL(file);
  });
};

function saveDocs() {
  const light = state.docs.map(d => ({ name:d.name, id:d.id, type:d.type, src:d.src.length<600000?d.src:'' }));
  try { setLS('wob_docs', JSON.stringify(light)); } catch(e) {}
}

function renderCtrlDocs() {
  const el = $('ctrl-docs-grid');
  if (!el) return;
  if (!state.docs.length) { el.innerHTML = `<p class="empty-hint">Aucun document. Ajoutez permis, carte VTC, assurance...</p>`; return; }
  el.innerHTML = state.docs.map((doc,i) => {
    const isImg = doc.type?.startsWith('image/');
    const inner = isImg && doc.src
      ? `<img src="${doc.src}" alt="${doc.name}">`
      : `<div class="ctrl-doc-pdf"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span style="font-size:.6rem">PDF</span></div>`;
    return `<div class="ctrl-doc-item" onclick="openViewer(${i})">
      ${inner}
      <div class="ctrl-doc-name">${doc.name}</div>
      <button class="ctrl-doc-del" onclick="event.stopPropagation();deleteDoc('${doc.id}')">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`;
  }).join('');
}

window.openViewer = function(idx) {
  if (!state.docs.length) return;
  state.viewerIdx = idx;
  const viewer = $('img-viewer');
  viewer?.classList.remove('hidden');
  renderViewerSlides();
};

function renderViewerSlides() {
  const track = $('iv-track');
  const dots  = $('iv-dots');
  const counter = $('iv-counter');
  if (!track) return;

  track.innerHTML = state.docs.map(doc => {
    const isImg = doc.type?.startsWith('image/');
    const content = isImg && doc.src
      ? `<img src="${doc.src}" alt="${doc.name}">`
      : `<div style="color:#fff;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;padding:40px">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span style="font-size:.9rem;opacity:.8">${doc.name}</span>
          <span style="font-size:.75rem;opacity:.5">Prévisualisation PDF non disponible</span>
        </div>`;
    return `<div class="iv-slide">${content}</div>`;
  }).join('');

  dots.innerHTML = state.docs.map((_,i) => `<div class="iv-dot ${i===state.viewerIdx?'active':''}" onclick="goToSlide(${i})"></div>`).join('');
  counter.textContent = `${state.viewerIdx+1} / ${state.docs.length}`;

  // Scroll to current
  setTimeout(() => {
    const slide = track.querySelectorAll('.iv-slide')[state.viewerIdx];
    slide?.scrollIntoView({ behavior:'instant', block:'nearest', inline:'start' });
  }, 50);

  // Touch/swipe handling
  let startX = 0;
  track.ontouchstart = e => { startX = e.touches[0].clientX; };
  track.ontouchend = e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && state.viewerIdx < state.docs.length-1) goToSlide(state.viewerIdx+1);
      else if (diff < 0 && state.viewerIdx > 0) goToSlide(state.viewerIdx-1);
    }
  };
}

window.goToSlide = function(idx) {
  state.viewerIdx = idx;
  const slides = qsa('.iv-slide');
  slides[idx]?.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'start' });
  qsa('.iv-dot').forEach((d,i) => d.classList.toggle('active', i===idx));
  setText('iv-counter', `${idx+1} / ${state.docs.length}`);
};

window.closeViewer = function() {
  $('img-viewer')?.classList.add('hidden');
};

window.deleteCurrentDoc = function() {
  const doc = state.docs[state.viewerIdx];
  if (!doc) return;
  deleteDoc(doc.id);
  if (state.docs.length === 0) { closeViewer(); return; }
  state.viewerIdx = Math.min(state.viewerIdx, state.docs.length-1);
  renderViewerSlides();
};

window.deleteDoc = function(id) {
  state.docs = state.docs.filter(d => String(d.id) !== String(id));
  saveDocs();
  renderCtrlDocs();
  showToast('Document supprimé');
};

// ══════════════════════════════════════════════════
//  ALERTES
// ══════════════════════════════════════════════════
window.saveAlertDates = function() {
  ['ct','assurance','vtc','medical'].forEach(k => {
    const v = $(`date-${k}`)?.value;
    if (v) setLS(`wob_date_${k}`, v);
  });
  checkAlerts();
};

function checkAlerts() {
  const now = Date.now();
  const WARN_DAYS = 30;
  const checks = [
    { key:'ct',       label:'Contrôle technique' },
    { key:'assurance',label:'Assurance' },
    { key:'vtc',      label:'Carte VTC' },
    { key:'medical',  label:'Visite médicale' },
  ];
  const alerts = [];
  checks.forEach(c => {
    const v = ls(`wob_date_${c.key}`);
    if (!v) return;
    const expiry = new Date(v).getTime();
    const daysLeft = Math.round((expiry - now) / 86400000);
    if (daysLeft < 0) {
      alerts.push({ cls:'danger', msg:`${c.label} expiré depuis ${Math.abs(daysLeft)}j !`, daysLeft });
    } else if (daysLeft <= WARN_DAYS) {
      alerts.push({ cls:'warn', msg:`${c.label} expire dans ${daysLeft}j`, daysLeft });
    }
  });

  const alertsEl = $('alerts-list');
  if (alertsEl) {
    if (!alerts.length) alertsEl.innerHTML = `<div class="list-item ok">Tous vos documents sont à jour.</div>`;
    else alertsEl.innerHTML = alerts.map(a => `<div class="list-item ${a.cls}">${a.msg}</div>`).join('');
  }

  if (alerts.length) {
    const banner = $('alert-banner');
    const text   = $('alert-text');
    if (banner && text) {
      text.textContent = alerts[0].msg;
      banner.classList.remove('hidden');
    }
    // Add to notif
    alerts.forEach(a => addNotification(a.msg, a.cls));
  }
}

window.dismissAlert = function() {
  $('alert-banner')?.classList.add('hidden');
};

// ══════════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════════
function addNotification(msg, cls='info') {
  const existing = state.notifications.find(n => n.msg === msg);
  if (existing) return;
  state.notifications.unshift({ id:Date.now(), msg, cls, ts:Date.now() });
  state.notifications = state.notifications.slice(0,20);
  setLS('wob_notifications', JSON.stringify(state.notifications));
  updateNotifBadge();
}

function updateNotifBadge() {
  const dot = $('notif-dot');
  if (dot) dot.classList.toggle('visible', state.notifications.length > 0);
}

window.toggleNotifCenter = function() {
  const nc = $('notif-center');
  if (!nc) return;
  nc.classList.toggle('hidden');
  if (!nc.classList.contains('hidden')) renderNotifs();
};

function renderNotifs() {
  const el = $('notif-list');
  if (!el) return;
  if (!state.notifications.length) { el.innerHTML = `<p class="empty-hint" style="text-align:center;padding:16px">Aucune notification</p>`; return; }
  el.innerHTML = state.notifications.map(n => `
    <div class="notif-item list-item ${n.cls}">
      ${n.msg}
      <div style="font-size:.6rem;opacity:.6;margin-top:3px">${new Date(n.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════
//  OBJECTIFS
// ══════════════════════════════════════════════════
window.openGoalModal = function() {
  setVal('goal-day',   state.goals.day   || '');
  setVal('goal-week',  state.goals.week  || '');
  setVal('goal-month', state.goals.month || '');
  openModal('goal-modal');
};

window.saveGoals = function() {
  state.goals = {
    day:   parseFloat($('goal-day')?.value)   || 0,
    week:  parseFloat($('goal-week')?.value)  || 0,
    month: parseFloat($('goal-month')?.value) || 0,
  };
  setLS('wob_goals', JSON.stringify(state.goals));
  closeModal('goal-modal');
  updateDashboard();
  showToast('Objectifs enregistrés');
};

// ══════════════════════════════════════════════════
//  BACKUP / RESTORE
// ══════════════════════════════════════════════════
function scheduleAutoBackup() {
  autoBackup();
  setInterval(autoBackup, 10 * 60 * 1000); // every 10min
}

function autoBackup() {
  const backup = buildBackupData();
  try { setLS('wob_auto_backup', JSON.stringify(backup)); } catch(e) {}
  setLS('wob_backup_ts', Date.now().toString());
  const el = $('backup-info');
  if (el) el.textContent = `Dernière sauvegarde : ${new Date().toLocaleTimeString('fr-FR')}`;
}

function buildBackupData() {
  const keys = ['wob_gain','wob_km','wob_trips','wob_sessions','wob_platforms','wob_hours','wob_weekday',
    'wob_files','wob_ia','wob_depenses','wob_docs','wob_docs_history','wob_goals','wob_notifications',
    'wob_name','wob_veh_modele','wob_veh_type','wob_conso','wob_prix','wob_rating','wob_theme',
    'wob_accent','wob_accent2','wob_prest_name','wob_prest_siret','wob_prest_addr',
    'wob_date_ct','wob_date_assurance','wob_date_vtc','wob_date_medical','wob_events','wob_events_ts',
  ];
  const data = {};
  keys.forEach(k => { const v = ls(k); if (v) data[k] = v; });
  return { version:5, ts:Date.now(), data };
}

window.exportJSON = function() {
  const backup = buildBackupData();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `wob-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Export JSON téléchargé');
};

window.importJSON = function(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const backup = JSON.parse(e.target.result);
      if (!backup.data) throw new Error('Format invalide');
      Object.entries(backup.data).forEach(([k,v]) => setLS(k, v));
      showToast('Restauration réussie ! Rechargement...');
      setTimeout(() => location.reload(), 1200);
    } catch(err) {
      showToast('Erreur : fichier invalide');
    }
  };
  reader.readAsText(file);
};

// ══════════════════════════════════════════════════
//  PROFIL / VÉHICULE
// ══════════════════════════════════════════════════
window.onFuelTypeChange = function(type, save=true) {
  if (save) { setLS('wob_veh_type', type); saveProfile(); }
  const hints = {
    essence:  { label:'Conso (L/100km)', hint:'SP95/SP98 (~1,85 €/L)', pdef:'1.85' },
    diesel:   { label:'Conso (L/100km)', hint:'Diesel (~1,72 €/L)', pdef:'1.72' },
    hybrid:   { label:'Conso (L/100km)', hint:'Hybride (~1,80 €/L)', pdef:'1.80' },
    electric: { label:'Conso (kWh/100km)', hint:'Prix kWh (~0,22 €)', pdef:'0.22' },
    gpl:      { label:'Conso (L/100km)', hint:'GPL (~0,95 €/L)', pdef:'0.95' },
  };
  const h = hints[type] || hints.essence;
  setText('cons-label', h.label);
  const fuelHint = $('fuel-hint');
  if (fuelHint) fuelHint.textContent = h.hint;
  const prixEl = $('veh-prix');
  if (prixEl && !ls('wob_prix')) prixEl.value = h.pdef;
};

window.saveVehicle = function() {
  setLS('wob_veh_modele', val('veh-modele'));
  setLS('wob_veh_type',   val('veh-type'));
  setLS('wob_conso',      val('veh-conso'));
  setLS('wob_prix',       val('veh-prix'));
  updateDashboard();
  // Close accordion
  const card = $('veh-card');
  if (card) card.classList.remove('open');
  showToast('Véhicule enregistré !');
};

window.saveProfile = function() {
  setLS('wob_name', val('profil-name'));
  const r = parseFloat(val('input-rating'));
  if (!isNaN(r)) { setLS('wob_rating', r); updateStars(r); updateProfileRatingDisplay(r); }
};

function updateStars(r) {
  const el = $('rating-stars');
  if (!el) return;
  const full = Math.floor(r), half = r-full >= 0.5;
  el.textContent = '★'.repeat(full) + (half?'½':'') + '☆'.repeat(5-full-(half?1:0));
}

function updateProfileRatingDisplay(r) {
  const el = $('profil-rating');
  if (el) el.textContent = r ? `Note : ${parseFloat(r).toFixed(2)}/5` : 'Note : —';
}

window.loadAvatar = function(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const src = e.target.result;
    const av = $('profil-avatar');
    if (av) av.innerHTML = `<img src="${src}" alt="avatar">`;
    setLS('wob_avatar', src);
    showToast('Photo mise à jour');
  };
  reader.readAsDataURL(file);
};

// ══════════════════════════════════════════════════
//  ACCORDION
// ══════════════════════════════════════════════════
window.toggleAccordion = function(cardId) {
  const card = $(cardId);
  if (!card) return;
  card.classList.toggle('open');
  haptic(6);
};

// ══════════════════════════════════════════════════
//  THEME
// ══════════════════════════════════════════════════
window.setTheme = function(theme) {
  setLS('wob_theme', theme);
  applyTheme(theme);
  showToast(`Thème ${theme === 'dark' ? 'sombre' : 'clair'} activé`);
};

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  $('btn-dark')?.classList.toggle('active', theme==='dark');
  $('btn-light')?.classList.toggle('active', theme==='light');
}

window.setAccent = function(color, color2) {
  setLS('wob_accent', color); setLS('wob_accent2', color2);
  applyAccent(color, color2);
  showToast('Couleur mise à jour');
};

function applyAccent(color, color2) {
  const r = document.documentElement;
  r.style.setProperty('--gold', color);
  r.style.setProperty('--gold2', color2||color);
  const hex = color.replace('#','');
  const ri = parseInt(hex.substring(0,2),16);
  const gi = parseInt(hex.substring(2,4),16);
  const bi = parseInt(hex.substring(4,6),16);
  r.style.setProperty('--gold-glow', `rgba(${ri},${gi},${bi},0.22)`);
  r.style.setProperty('--gold-dim',  `rgba(${ri},${gi},${bi},0.07)`);
  r.style.setProperty('--border',    `rgba(${ri},${gi},${bi},0.13)`);
}

// ══════════════════════════════════════════════════
//  STATUS
// ══════════════════════════════════════════════════
window.saveStatus = function(plat, val2) { setLS(`wob_status_${plat}`, val2); };

// ══════════════════════════════════════════════════
//  CLEAR / RESET
// ══════════════════════════════════════════════════
window.clearCSV = function() {
  if (!confirm('Effacer toutes les données CSV importées ?')) return;
  ['wob_gain','wob_km','wob_trips','wob_sessions','wob_platforms','wob_hours','wob_weekday','wob_files','wob_ia','wob_monthly']
    .forEach(k => localStorage.removeItem(k));
  state.totalGain=0; state.totalKm=0; state.totalTrips=0;
  state.sessions=[]; state.platformData={}; state.hourData=new Array(24).fill(0); state.weekdayData=new Array(7).fill(0);
  updateDashboard();
  if ($('ia-report')) $('ia-report').textContent = 'Importez des CSV pour générer votre analyse.';
  if ($('csv-files-list')) $('csv-files-list').innerHTML='';
  showToast('Données CSV effacées');
};

window.resetAll = function() {
  if (!confirm('Réinitialiser toute l\'application ? Cette action est irréversible.')) return;
  localStorage.clear();
  location.reload();
};

// ══════════════════════════════════════════════════
//  MODALS
// ══════════════════════════════════════════════════
function openModal(id) {
  $(id)?.classList.remove('hidden');
  haptic(15);
}
window.closeModal = function(id) { $(id)?.classList.add('hidden'); };

// ══════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════
function showToast(msg) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2800);
}

// ══════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════
function $(id)    { return document.getElementById(id); }
function qsa(sel) { return document.querySelectorAll(sel); }
function ls(k)    { return localStorage.getItem(k); }
function setLS(k,v) { try { localStorage.setItem(k,v); } catch(e) {} }
function val(id)    { return $(id)?.value || ''; }
function setVal(id,v) { const el=$(id); if(el) el.value=v; }
function setText(id,t){ const el=$(id); if(el) el.textContent=t; }
function formatEuro(n) {
  if (isNaN(n)) return '0,00 €';
  return n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
}
function haversine(lat1,lon1,lat2,lon2) {
  const R=6371000, dL=(lat2-lat1)*Math.PI/180, dO=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dO/2)**2;
  return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
}
function haptic(pattern) {
  if (navigator.vibrate) navigator.vibrate(Array.isArray(pattern)?pattern:[pattern]);
}
function svgCheck() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>`;
}
// Expose state globally for api.js
window.state = state;
