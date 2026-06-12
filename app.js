// ══════════════════════════════════════════════════
//  GEMINI — Moteur IA unique de l'application
// ══════════════════════════════════════════════════
const GEMINI_KEY = 'AIzaSyAb8RN6Jxrrq7Te8iyhnqNqnHw3ZEey-six8X1Ivxa9KsXKbqvA';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

/**
 * Appel Gemini Flash 2.0 — helper central
 * @param {string} prompt
 * @param {object} opts — { maxTokens=600, temperature=0.4 }
 * @returns {Promise<string>} texte généré
 */
async function callGemini(prompt, { maxTokens = 600, temperature = 0.4 } = {}) {
  const resp = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    }),
  });
  if (!resp.ok) throw new Error(`Gemini ${resp.status}`);
  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  if (!text) throw new Error('Réponse Gemini vide');
  return text;
}


// ══════════════════════════════════════════════════════════════════
//  GEMINI IA MODULES — Coach · Planning · Progression · Rapport
//  Budget : ~6 appels/jour max — TTL stricts pour respecter quotas
// ══════════════════════════════════════════════════════════════════

const WOD_IA = {

  // ── Helpers cache ────────────────────────────────────────────
  _get(key)        { try { return localStorage.getItem(key); } catch(e) { return null; } },
  _set(key, val)   { try { localStorage.setItem(key, val); } catch(e) {} },
  _age(tsKey)      { return Date.now() - parseInt(this._get(tsKey) || '0'); },
  _ok(tsKey, ttl)  { return this._age(tsKey) < ttl; },

  // ── Collecte données chauffeur ───────────────────────────────
  _buildDriverContext() {
    const trips    = JSON.parse(this._get('wob_sessions') || '[]');
    const weekHist = JSON.parse(this._get('wob_week_history') || '[]');
    const hourData = JSON.parse(this._get('wob_hours')   || 'null') || new Array(24).fill(0);
    const dayData  = JSON.parse(this._get('wob_weekday') || 'null') || new Array(7).fill(0);
    // Lire goals depuis state si disponible (source de vérité principale)
    const _goalsRaw = (typeof state !== 'undefined' && state.goals)
      ? state.goals
      : JSON.parse(this._get('wob_goals') || '{}');
    const goals = _goalsRaw;
    const conso    = parseFloat(this._get('wob_conso'))  || 6.5;
    const pCarb    = parseFloat(this._get('wob_prix'))   || 1.85;
    const vehType  = this._get('wob_veh_type') || 'essence';
    const name     = this._get('wob_name') || 'Chauffeur';

    // Stats semaine courante
    const totalGain = trips.reduce((s,t) => s+(t.gain||0), 0);
    const totalKm   = trips.reduce((s,t) => s+(t.km||0), 0);
    const fuelCost  = totalKm*(conso/100)*pCarb;
    const net       = totalGain - fuelCost;
    const avgTrip   = trips.length ? totalGain/trips.length : 0;

    // Stats aujourd'hui
    const today    = new Date(); today.setHours(0,0,0,0);
    const todayT   = trips.filter(t => t.date && new Date(t.date) >= today);
    const dayGain  = todayT.reduce((s,t) => s+(t.gain||0), 0);
    const dayTrips = todayT.length;

    // Meilleure heure (index max dans hourData)
    const bestH = hourData.indexOf(Math.max(...hourData));
    const dayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    const bestDay  = dayData.indexOf(Math.max(...dayData));

    // Historique semaines (3 dernières)
    const recentWeeks = weekHist.slice(0,3).map(w =>
      `S${new Date(w.ts).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} : ${w.gain.toFixed(0)}€ brut, ${w.trips} courses, ${w.km.toFixed(0)}km`
    ).join(' | ');

    const h = new Date().getHours();
    const jour = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][new Date().getDay()];

    return {
      name, trips, totalGain, totalKm, net, avgTrip, fuelCost,
      dayGain, dayTrips, goals, bestH, bestDay: dayNames[bestDay],
      recentWeeks, h, jour, conso, pCarb, vehType,
      tripsCount: trips.length,
    };
  },

  // ════════════════════════════════════════════════════════════════
  //  MODULE A — COACH CONNEXION (1 appel/jour, TTL 6h)
  //  → Recommande l'heure idéale de connexion basée sur l'historique
  // ════════════════════════════════════════════════════════════════
  async loadCoachConnexion() {
    const el = document.getElementById('ia-coach-connexion');
    if (!el) return;

    const TTL = 6 * 60 * 60 * 1000; // 6h
    if (this._ok('wod_coach_conn_ts', TTL)) {
      const cached = this._get('wod_coach_conn');
      if (cached) { el.innerHTML = cached; return; }
    }

    el.innerHTML = '<div style="font-size:.75rem;color:var(--text-dim);">🤖 Analyse de votre historique...</div>';

    const d = this._buildDriverContext();
    if (d.tripsCount < 3) {
      el.innerHTML = '<div style="font-size:.75rem;color:var(--text-dim);">Enregistrez au moins 3 courses pour activer le coach connexion.</div>';
      return;
    }

    const prompt = [
      `Chauffeur VTC Paris "${d.name}". ${d.tripsCount} courses enregistrées.`,
      `Meilleure heure historique : ${d.bestH}h. Meilleur jour : ${d.bestDay}.`,
      d.recentWeeks ? `Historique semaines : ${d.recentWeeks}.` : '',
      `Objectif journalier : ${d.goals.day || 0}€. Moyenne/course : ${d.avgTrip.toFixed(2)}€.`,
      `Nous sommes ${d.jour} à ${d.h}h.`,
      'En 2 phrases MAX, dis-lui : 1) a quelle heure se connecter aujourd hui et pourquoi (chiffres a l appui)',
      '2) une zone prioritaire selon l heure recommandee. Direct, pas de blabla.',
    ].join(' ');

    try {
      const text = await callGemini(prompt, { maxTokens: 150, temperature: 0.3 });
      const html = '<div style="font-size:.78rem;line-height:1.6;color:var(--text);">🎯 ' + text + '</div>';
      el.innerHTML = html;
      this._set('wod_coach_conn', html);
      this._set('wod_coach_conn_ts', Date.now().toString());
    } catch(e) {
      el.innerHTML = '<div style="font-size:.75rem;color:var(--text-dim);">Coach connexion temporairement indisponible.</div>';
    }
  },

  // ════════════════════════════════════════════════════════════════
  //  MODULE B — PLANNING QUOTIDIEN (1 appel/jour, TTL jusqu'à minuit)
  //  → Heure début optimale, heure fin estimée, courses nécessaires
  // ════════════════════════════════════════════════════════════════
  async loadPlanningJour(forceRefresh) {
    const el = document.getElementById('ia-planning-jour');
    if (!el) return;

    // TTL jusqu'à minuit
    const midnight = new Date(); midnight.setHours(24,0,0,0);
    const ttlMidnight = midnight.getTime() - Date.now();
    if (!forceRefresh && this._ok('wod_planning_ts', ttlMidnight)) {
      const cached = this._get('wod_planning');
      if (cached) { el.innerHTML = cached; return; }
    }

    const d = this._buildDriverContext();
    if (!d.goals.day || d.goals.day === 0) {
      el.innerHTML = '<div style="font-size:.75rem;color:var(--text-dim);">Définissez un objectif journalier pour activer le planning automatique.</div>';
      return;
    }

    el.innerHTML = '<div style="font-size:.75rem;color:var(--text-dim);">🤖 Génération de votre planning...</div>';

    const coursesNeeded = d.avgTrip > 0 ? Math.ceil((d.goals.day - d.dayGain) / d.avgTrip) : '?';
    const prompt = [
      `Chauffeur VTC Paris. ${d.jour} ${d.h}h. Objectif jour : ${d.goals.day}€. Déjà gagné : ${d.dayGain.toFixed(2)}€.`,
      `Moyenne/course : ${d.avgTrip.toFixed(2)}€. Meilleure heure historique : ${d.bestH}h.`,
      `Il lui faut encore environ ${coursesNeeded} courses. Véhicule ${d.vehType}.`,
      'Génère un planning en JSON strict :',
      '{"debut":"HHhMM","fin_estimee":"HHhMM","courses_restantes":N,"zones":["zone1","zone2"],"tip":"conseil 1 phrase"}',
      'Rien d\'autre que le JSON.',
    ].join(' ');

    try {
      const text  = await callGemini(prompt, { maxTokens: 200, temperature: 0.2 });
      const clean = text.replace(/```json|```/g, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      let html;
      if (match) {
        const p = JSON.parse(match[0]);
        html = [
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">',
          `<div style="background:rgba(212,168,67,.06);border:1px solid rgba(212,168,67,.15);border-radius:14px;padding:12px;text-align:center;backdrop-filter:blur(8px);">`,
          `<div style="font-size:.56rem;font-weight:800;letter-spacing:.12em;color:var(--text-dim);margin-bottom:4px;text-transform:uppercase;">Début conseillé</div>`,
          `<div style="font-size:1.2rem;font-weight:800;color:var(--gold);font-family:'DM Mono',monospace;">${p.debut || '--'}</div></div>`,
          `<div style="background:rgba(212,168,67,.06);border:1px solid rgba(212,168,67,.15);border-radius:14px;padding:12px;text-align:center;backdrop-filter:blur(8px);">`,
          `<div style="font-size:.56rem;font-weight:800;letter-spacing:.12em;color:var(--text-dim);margin-bottom:4px;text-transform:uppercase;">Fin estimée</div>`,
          `<div style="font-size:1.2rem;font-weight:800;color:var(--gold);font-family:'DM Mono',monospace;">${p.fin_estimee || '--'}</div></div>`,
          '</div>',
          p.zones?.length ? `<div style="font-size:.72rem;color:var(--text-dim);margin-bottom:8px;letter-spacing:.02em;">Zones recommandées : <strong style="color:var(--text);font-weight:600;">${p.zones.join(' · ')}</strong></div>` : '',
          p.tip ? `<div style="font-size:.76rem;color:var(--text2);line-height:1.6;border-left:2px solid rgba(212,168,67,.3);padding-left:10px;">${p.tip}</div>` : '',
          p.courses_restantes ? `<div style="font-size:.7rem;color:var(--text-dim);margin-top:8px;">${p.courses_restantes} course${p.courses_restantes>1?'s':''} restante${p.courses_restantes>1?'s':''} estimée${p.courses_restantes>1?'s':''}</div>` : '',
        ].join('');
      } else {
        html = `<div style="font-size:.75rem;color:var(--text2);line-height:1.6;">${text}</div>`;
      }
      el.innerHTML = html;
      this._set('wod_planning', html);
      this._set('wod_planning_ts', Date.now().toString());
    } catch(e) {
      el.innerHTML = '<div style="font-size:.75rem;color:var(--text-dim);">Planning temporairement indisponible.</div>';
    }
  },

  // ════════════════════════════════════════════════════════════════
  //  MODULE C — PROGRESSION TEMPS RÉEL (déclenché après chaque course, TTL 10min)
  //  → Remplace les projections statiques par une analyse dynamique
  // ════════════════════════════════════════════════════════════════
  async loadProgression() {
    const el = document.getElementById('ia-progression');
    if (!el) return;

    const TTL = 10 * 60 * 1000; // 10min
    if (this._ok('wod_prog_ts', TTL)) {
      const cached = this._get('wod_prog');
      if (cached) { el.innerHTML = cached; return; }
    }

    const d = this._buildDriverContext();
    if (d.dayTrips === 0 || !d.goals.day) {
      el.innerHTML = '';
      return;
    }

    const restant = Math.max(0, d.goals.day - d.dayGain);
    const pct     = d.goals.day > 0 ? Math.min(100, (d.dayGain / d.goals.day * 100)).toFixed(0) : 0;
    const prompt  = [
      `Chauffeur VTC Paris. ${d.jour} ${d.h}h. Objectif jour : ${d.goals.day}€.`,
      `Déjà : ${d.dayGain.toFixed(2)}€ (${d.dayTrips} courses). Reste : ${restant.toFixed(2)}€.`,
      `Moyenne course aujourd'hui : ${d.dayTrips ? (d.dayGain/d.dayTrips).toFixed(2) : d.avgTrip.toFixed(2)}€.`,
      'En 1 phrase ultra-courte (max 15 mots) : dis-lui combien de courses et combien de temps restants pour atteindre l objectif.',
      'Exemple : Encore 3 courses, environ 1h30 de travail pour atteindre l objectif.',
    ].join(' ');

    try {
      const text = await callGemini(prompt, { maxTokens: 80, temperature: 0.2 });
      const html = [
        '<div style="margin-top:10px;padding:10px;background:rgba(212,168,67,.06);border:1px solid rgba(212,168,67,.15);border-radius:10px;">',
        `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">`,
        `<span style="font-size:.7rem;color:var(--text-dim);">Progression objectif jour</span>`,
        `<span style="font-size:.8rem;font-weight:800;color:var(--gold);">${pct}%</span>`,
        '</div>',
        `<div style="background:rgba(255,255,255,.08);border-radius:4px;height:4px;margin-bottom:8px;">`,
        `<div style="background:var(--gold);height:4px;border-radius:4px;width:${pct}%;transition:width .5s;"></div></div>`,
        `<div style="font-size:.75rem;color:var(--text);line-height:1.5;">🤖 ${text}</div>`,
        '</div>',
      ].join('');
      el.innerHTML = html;
      this._set('wod_prog', html);
      this._set('wod_prog_ts', Date.now().toString());
    } catch(e) {
      el.innerHTML = '';
    }
  },

  // ════════════════════════════════════════════════════════════════
  //  MODULE D — RAPPORT QUOTIDIEN (1 appel/jour si ≥3 courses)
  //  → Résumé journée, points forts/faibles, conseil demain
  // ════════════════════════════════════════════════════════════════
  async loadRapportJour() {
    const el = document.getElementById('ia-rapport-jour');
    if (!el) return;

    const d = this._buildDriverContext();
    if (d.dayTrips < 3) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';

    const midnight = new Date(); midnight.setHours(24,0,0,0);
    const ttlMidnight = midnight.getTime() - Date.now();
    if (this._ok('wod_rapport_jour_ts', ttlMidnight)) {
      const cached = this._get('wod_rapport_jour');
      if (cached) { el.innerHTML = cached; return; }
    }

    el.innerHTML = '<div style="font-size:.75rem;color:var(--text-dim);">🤖 Génération du rapport journalier...</div>';

    const todayTrips = d.trips.filter(t => {
      const td = new Date(); td.setHours(0,0,0,0);
      return t.date && new Date(t.date) >= td;
    });
    const todayKm    = todayTrips.reduce((s,t) => s+(t.km||0), 0);
    const todayMin   = todayTrips.reduce((s,t) => s+(t.duree||0), 0);
    const todayFuel  = todayKm * (d.conso/100) * d.pCarb;
    const todayNet   = d.dayGain - todayFuel;
    const bestCourse = Math.max(...todayTrips.map(t => t.gain));
    const hourly     = todayMin > 0 ? (d.dayGain/todayMin)*60 : 0;
    const objPct     = d.goals.day > 0 ? (d.dayGain/d.goals.day*100).toFixed(0) : 'N/A';

    const prompt = [
      `Chauffeur VTC Paris. Fin de journée ${d.jour}.`,
      `Résultats : ${d.dayTrips} courses, ${d.dayGain.toFixed(2)}€ brut, ${todayNet.toFixed(2)}€ net, ${todayKm.toFixed(0)}km.`,
      `Taux horaire : ${hourly.toFixed(2)}€/h. Meilleure course : ${bestCourse.toFixed(2)}€. Objectif atteint à ${objPct}%.`,
      `Moyenne/course : ${(d.dayGain/d.dayTrips).toFixed(2)}€.`,
      'Fais un rapport en JSON :',
      '{"pointFort":"une phrase","pointFaible":"une phrase","demain":"conseil concret 1 phrase","note":7}',
      'note sur 10. JSON strict, rien d autre.',
    ].join(' ');

    try {
      const text  = await callGemini(prompt, { maxTokens: 250, temperature: 0.3 });
      const clean = text.replace(/```json|```/g, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      let html;
      if (match) {
        const r = JSON.parse(match[0]);
        const noteColor = r.note >= 8 ? '#4ade80' : r.note >= 6 ? '#d4a843' : '#ff4d6a';
        html = [
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">',
          '<span style="font-size:.8rem;font-weight:700;">📊 Rapport du jour</span>',
          r.note ? `<span style="margin-left:auto;font-size:1rem;font-weight:800;color:${noteColor};">${r.note}/10</span>` : '',
          '</div>',
          r.pointFort  ? `<div style="font-size:.75rem;line-height:1.5;margin-bottom:6px;">✅ <strong>Point fort :</strong> ${r.pointFort}</div>` : '',
          r.pointFaible? `<div style="font-size:.75rem;line-height:1.5;margin-bottom:6px;">⚠️ <strong>À améliorer :</strong> ${r.pointFaible}</div>` : '',
          r.demain     ? `<div style="font-size:.75rem;line-height:1.5;padding:8px;background:rgba(212,168,67,.06);border-radius:8px;border-left:3px solid var(--gold);">💡 <strong>Demain :</strong> ${r.demain}</div>` : '',
        ].join('');
      } else {
        html = '<div style="font-size:.75rem;color:var(--text);">📊 ' + text + '</div>';
      }
      el.innerHTML = html;
      this._set('wod_rapport_jour', html);
      this._set('wod_rapport_jour_ts', Date.now().toString());
    } catch(e) {
      el.style.display = 'none';
    }
  },

  // ── Initialisation — appelé au boot et après chaque course ───
  async init(afterTrip = false) {
    await this.loadCoachConnexion();
    await this.loadPlanningJour();
    if (afterTrip || document.getElementById('ia-progression')) {
      await this.loadProgression();
    }
    await this.loadRapportJour();
  },
};

window.WOD_IA = WOD_IA;

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
  checkWeeklyReset(); // ← Reset lundi 4h00
  restoreAll();
  HOME.init();       // ← Nouveaux widgets accueil
  startGPS();
  initMap();
  renderRushChart();
  loadTraffic();
  loadEvents(false);
  initDocForm();
  checkAlerts();
  scheduleAutoBackup();
  updateHeroDate();
  // Modules IA Gemini — légèrement différé pour ne pas bloquer le rendu
  setTimeout(() => WOD_IA.init(false), 2000);
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
  home:'Revenue', rush:'Rush', stats:'Historique', docs:'B&F',
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
  if (id === 'stats') { refreshCharts(); HOME._renderHistoriqueTrips(); HOME._renderHistoriqueDepenses(); }
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

  container.style.height = '280px';
  container.style.width  = '100%';
  container.style.display = 'block';

  try {
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
    }).setView([48.8566, 2.3522], 10);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18, subdomains: 'abcd',
    }).addTo(map);

    state.leafletMap = map;
    window.state = state;
    updateMapPosition();

    // Demande à Gemini d'analyser les zones chaudes selon l'heure actuelle
    _loadGeminiHeatmap(map);

    setTimeout(() => map.invalidateSize(true), 200);
    setTimeout(() => map.invalidateSize(true), 600);
    setTimeout(() => map.invalidateSize(true), 1200);
  } catch(e) { console.warn('Map init:', e); }
}

async function _loadGeminiHeatmap(map) {
  const h    = new Date().getHours();
  const jour = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][new Date().getDay()];
  const cacheKey = 'wod_heatmap_zones';
  const cacheTs  = 'wod_heatmap_ts';
  const age = Date.now() - parseInt(localStorage.getItem(cacheTs) || '0');

  let zones = null;
  if (age < 30 * 60 * 1000) {
    try { zones = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch(e){}
  }

  if (!zones) {
    const prompt = `Tu es un expert VTC Paris. Nous sommes ${jour} à ${h}h. Liste les 8 zones IDF avec le plus de demande VTC EN CE MOMENT selon les heures de rush typiques. Pour chaque zone donne précisément : nom, lat, lon (Paris IDF), intensité de demande de 0 à 100, couleur hex (rouge=#ff4d6a si >70, orange=#ff9955 si 40-70, vert=#2dd4a0 si <40). Reponds UNIQUEMENT en JSON : [{"nom":"...","lat":48.xx,"lon":2.xx,"demand":85,"color":"#ff4d6a","raison":"courte raison"}]`;
    try {
      const text = await callGemini(prompt, { maxTokens: 500, temperature: 0.3 });
      const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
      const match = clean.match(/\[[\s\S]*\]/);
      if (match) {
        zones = JSON.parse(match[0]);
        localStorage.setItem(cacheKey, JSON.stringify(zones));
        localStorage.setItem(cacheTs, Date.now().toString());
      }
    } catch(e) { console.warn('Gemini heatmap:', e); }
  }

  // Fallback si Gemini indisponible — zones statiques selon heure
  if (!zones) {
    zones = HOT_ZONES.map(z => ({ ...z, raison: 'Zone à forte demande' }));
  }

  // Effacer les anciennes zones
  if (state._heatLayers) state._heatLayers.forEach(l => map.removeLayer(l));
  state._heatLayers = [];

  zones.forEach(z => {
    const radius = 800 + (z.demand || 50) * 18;
    const color  = z.color || '#ff9955';
    const opacity = 0.12 + (z.demand || 50) / 100 * 0.2;

    // Zone lumineuse fluide — pas de points, que des halos
    const circle = L.circle([z.lat, z.lon], {
      radius,
      color: 'transparent',
      fillColor: color,
      fillOpacity: opacity,
      weight: 0,
    }).addTo(map).bindPopup(`<b>${z.nom}</b><br>${z.raison || ''}<br>Demande : ${z.demand || '?'}%`);

    // Halo extérieur plus doux
    const outerGlow = L.circle([z.lat, z.lon], {
      radius: radius * 1.8,
      color: 'transparent',
      fillColor: color,
      fillOpacity: opacity * 0.35,
      weight: 0,
    }).addTo(map);

    state._heatLayers.push(circle, outerGlow);
  });

  // Mettre à jour le texte de légende
  const legend = document.getElementById('map-gemini-legend');
  if (legend) legend.textContent = `Analyse Gemini — ${jour} ${h}h — ${zones.length} zones actives`;
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
  const dateEl = $('doc-date');
  if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
  const numEl = $('doc-num');
  if (numEl && !numEl.value) numEl.value = `${new Date().getFullYear()}-001`;
  addDocLine();
});


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
  // Projections désactivées — utiliser le coach IA
  if (state.totalTrips === 0) return;
  // Silencieux — les projections sont dans le coach IA
}

function getElapsedDays() {
  const first = ls('wob_first_session_ts');
  if (!first) return 1;
  return Math.max(1, Math.round((Date.now() - parseInt(first)) / 86400000));
}

// ══════════════════════════════════════════════════
//  IA REPORT
// ══════════════════════════════════════════════════

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
  // Statique immédiat (affiché instantanément)
  if (d===5&&h>=17&&h<=23) return { title:'RUSH Vendredi soir', sub:'Surge probable — Zone centrale', cls:'danger' };
  if (d===6&&h>=20)        return { title:'Nuit Samedi — Forte demande', sub:'Zone festive · Grands Boulevards', cls:'danger' };
  if (d===6&&h>=12)        return { title:'Samedi après-midi', sub:'Shopping · Loisirs — Activité élevée', cls:'warn' };
  if (d>=1&&d<=5&&h>=7&&h<=9)   return { title:'Rush matin (7h–9h)', sub:'Gares et zones bureaux', cls:'warn' };
  if (d>=1&&d<=5&&h>=17&&h<=20) return { title:'Rush soir (17h–20h)', sub:'Fort trafic — Positions stratégiques', cls:'warn' };
  if (h>=22||h<=5) return { title:'Nuit — Faible demande', sub:'Repos conseillé · CDG si actif', cls:'info' };
  return { title:'Activité normale', sub:'Trafic fluide attendu', cls:'ok' };
}

// Enrichissement Gemini du statut rush (async, cache 20min)
async function enrichRushWithGemini() {
  const el = $('rush-sub'); if (!el) return;
  const AGE = Date.now() - parseInt(ls('wob_rush_ts') || '0');
  if (AGE < 20 * 60 * 1000) { const c = ls('wob_rush_tip'); if (c) { el.textContent = c; return; } }
  const h = new Date().getHours();
  const d = new Date().getDay();
  const jour = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][d];
  const events = ls('wob_events');
  const evtCtx = events ? JSON.parse(events).slice(0,2).map(e=>e.title).join(', ') : '';
  const prompt = 'VTC Paris. ' + jour + ' ' + h + 'h. '
    + (evtCtx ? 'Evenements du moment : ' + evtCtx + '. ' : '')
    + 'En 8 mots MAX : quelle zone cibler maintenant et pourquoi ? Tres direct.';
  try {
    const tip = await callGemini(prompt, { maxTokens: 40, temperature: 0.4 });
    el.textContent = tip.trim();
    setLS('wob_rush_tip', tip.trim());
    setLS('wob_rush_ts', Date.now().toString());
  } catch(e) {}
}

window.loadTraffic = async function() {
  const rush = getRushStatus();
  setText('rush-title', rush.title);
  setText('rush-sub', rush.sub);

  const h = new Date().getHours();
  const dayNames = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const jour = dayNames[new Date().getDay()];
  const consEl = $('rush-conseils');

  // Enrichissement Gemini du sous-titre rush (async, 20min TTL)
  enrichRushWithGemini();

  // Conseils statiques immédiats (affichage instantané)
  const conseilsStatiques = [];
  if (h>=6&&h<=9)   conseilsStatiques.push('Gare du Nord · Gare de Lyon — Clients pro le matin');
  if (h>=11&&h<=14) conseilsStatiques.push('Zone Opéra / Châtelet — Déjeuners affaires');
  if (h>=17&&h<=20) conseilsStatiques.push('La Défense + gares — plus de courses');
  if (h>=20&&h<=23) conseilsStatiques.push('Sorties spectacles — Grands Boulevards, Bastille');
  if (h>=22)        conseilsStatiques.push('CDG la nuit = course garantie longue distance');
  conseilsStatiques.push('Orly : moins de concurrence que CDG');
  if (consEl) consEl.innerHTML = conseilsStatiques.map(c => `<div class="list-item gold">${c}</div>`).join('');

  // Conseils Gemini dynamiques (en arrière-plan, TTL 20 min)
  const conseilCacheKey = 'wob_conseils_ia';
  const conseilCacheTs  = 'wob_conseils_ia_ts';
  const conseilAge = Date.now() - parseInt(ls(conseilCacheTs) || '0', 10);
  if (conseilAge < 20 * 60 * 1000) {
    const cached = ls(conseilCacheKey);
    if (cached && consEl) { consEl.innerHTML = cached; }
  } else {
    const promptConseils = `Tu es un expert VTC parisien. Il est ${h}h, ${jour}. Donne 4 conseils TRÈS COURTS (max 10 mots chacun) et CONCRETS pour maximiser les courses VTC à Paris maintenant : zones à cibler, créneaux, types de clients probables. Format : liste de 4 bullet points avec emoji. Rien d'autre.`;
    callGemini(promptConseils, { maxTokens: 200, temperature: 0.6 })
      .then(text => {
        if (!text || !consEl) return;
        // Parser les bullet points retournés par Gemini
        const lines = text.split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(l => l.length > 3);
        const html = lines.map(l => `<div class="list-item gold">${l}</div>`).join('');
        consEl.innerHTML = html;
        setLS(conseilCacheKey, html);
        setLS(conseilCacheTs, String(Date.now()));
      })
      .catch(() => {}); // Silencieux — les conseils statiques restent affichés
  }

  const zonesEl = $('traffic-zones');
  if (!zonesEl) return;
  zonesEl.innerHTML = `<div class="list-item info">Calcul des trajets...</div>`;

  const results = await Promise.all(IDF_ZONES.map(z => fetchRoute(z)));

  // Exposer les données trafic pour le coach IA
  window._lastTrafficData = {
    zones: IDF_ZONES.map((z,i) => results[i] ? { nom: z.nom, ...results[i] } : null).filter(Boolean),
    ts: Date.now(),
  };

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

  const cache    = ls('wob_events');
  const cacheTs  = parseInt(ls('wob_events_ts') || '0');
  const cacheAge = Date.now() - cacheTs;
  const CACHE_MAX = 24 * 60 * 60 * 1000; // 24h — actualisation quotidienne

  if (!forceRefresh && cache && cacheAge < CACHE_MAX) {
    renderEvents(JSON.parse(cache));
    return;
  }

  el.innerHTML = `<div class="list-item info">🤖 Analyse des événements en cours...</div>`;

  try {
    const today = new Date().toISOString().split('T')[0];
    let results = null;

    // ── SOURCE 1 : Gemini (principal) — direct, CORS natif, pas de proxy ──
    // Gemini connaît les grands événements parisiens et génère une liste fiable
    // On l'utilise EN PREMIER car les proxies publics sont instables
    try {
      const h    = new Date().getHours();
      const jour = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][new Date().getDay()];
      const prompt = 'Tu es un expert VTC parisien. Nous sommes ' + jour + ' ' + today + ' a ' + h + 'h. Liste 6 evenements REELS ou tres probables a Paris dans les 7 prochains jours creant de la demande VTC (concerts Bercy/AccorArenas, matchs PSG, salons Porte de Versailles, expos, manifestations, festivals...). Sois precis sur les lieux et dates. Reponds UNIQUEMENT en JSON valide, rien d autre : [{"title":"...","date_start":"YYYY-MM-DD","address_name":"lieu exact Paris","address_zipcode":"75XXX","tags":"type evenement","impact":"fort|modere|faible"}]';
      const text = await callGemini(prompt, { maxTokens: 600, temperature: 0.3 });
      const clean = text.replace(/```json|```/g, '').trim();
      const jsonMatch = clean.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('JSON introuvable');
      const evts = JSON.parse(jsonMatch[0]);
      if (evts?.length >= 1) {
        results = evts;
        console.log('[Events] Gemini principal OK:', results.length);
      }
    } catch(eg) { console.warn('[Events] Gemini principal:', eg.message); }

    // ── SOURCE 2 : que-faire-a-paris via proxy (fallback si Gemini KO) ──
    if (!results) {
      const QF_TARGET = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records'
        + '?where=' + encodeURIComponent("date_start >= date'" + today + "'")
        + '&order_by=date_start&limit=20&select=title,date_start,address_name,address_zipcode,tags,url';
      for (const proxy of [
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(QF_TARGET),
        'https://corsproxy.io/?' + encodeURIComponent(QF_TARGET),
      ]) {
        if (results) break;
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 8000);
          const r = await fetch(proxy, { signal: ctrl.signal });
          clearTimeout(t);
          if (!r.ok) continue;
          const text = await r.text();
          let parsed; try { parsed = JSON.parse(text); } catch(e) { continue; }
          const raw = parsed.contents ? JSON.parse(parsed.contents) : parsed;
          if (raw.results?.length >= 1) { results = raw.results; console.log('[Events] QFP proxy OK:', results.length); }
        } catch(e) { console.warn('[Events] QFP proxy:', e.message); }
      }
    }

    if (!results) throw new Error('Toutes les sources événements indisponibles');

    const sorted = results
      .map(ev => ({ ...ev, _impact: getEventImpact(ev) }))
      .sort((a, b) => b._impact.score - a._impact.score);

    ls('wob_events', JSON.stringify(sorted));
    ls('wob_events_ts', Date.now().toString());
    renderEvents(sorted);

  } catch(e) {
    console.warn('[Events] Toutes sources échouées:', e.message);
    const cache2 = ls('wob_events');
    if (cache2) {
      const ageH = Math.round(cacheAge / 3600000);
      renderEvents(JSON.parse(cache2));
      el.insertAdjacentHTML('afterbegin',
        `<div class="list-item warn" style="font-size:11px;border-radius:8px;margin-bottom:8px;">📡 Cache (${ageH}h) — Actualisez pour les derniers événements</div>`);
    } else {
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
  const now  = new Date();
  const h    = now.getHours();
  const jour = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][now.getDay()];
  const date = now.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });

  el.innerHTML = '<div class="list-item info" style="font-size:11px;">🤖 Analyse des événements probables...</div>';

  const cacheKey = 'wob_events_fallback';
  const cacheTs  = 'wob_events_fallback_ts';
  const age = Date.now() - parseInt(ls(cacheTs) || '0', 10);
  if (age < 60 * 60 * 1000) {
    const cached = ls(cacheKey);
    if (cached) { el.innerHTML = cached; return; }
  }

  const prompt = `Tu es un expert VTC parisien. Nous sommes ${jour} ${date} a ${h}h. Liste 3 evenements ou flux de voyageurs PROBABLES aujourd hui a Paris qui creent de la demande VTC. Pour chaque evenement donne : titre court, zone Paris concernee, niveau d impact (fort/modere/faible), conseil de positionnement en 5 mots max. Reponds en JSON strict : [{"titre":"...","zone":"...","impact":"fort|modere|faible","conseil":"..."}] Rien d autre que le JSON.`;

  callGemini(prompt, { maxTokens: 400, temperature: 0.5 })
    .then(text => {
      let events;
      try {
        const clean = text.replace(/```json|```/g, '').trim();
        const match = clean.match(/\[[\s\S]*\]/);
        events = match ? JSON.parse(match[0]) : null;
      } catch(e) { events = null; }

      if (!events || !events.length) {
        el.innerHTML = '<div class="list-item warn" style="font-size:11px;">⚠️ API Paris indisponible · Appuyez sur 🔄 pour réessayer</div>';
        return;
      }

      const clsMap = { 'fort': 'danger', 'modere': 'warn', 'faible': 'info' };
      const html = events.map(ev =>
        '<div class="list-item ' + (clsMap[ev.impact] || 'info') + '" style="flex-direction:column;gap:2px;">' +
        '<span style="font-weight:700;font-size:.8rem;">🤖 ' + ev.titre + '</span>' +
        '<span style="font-size:.7rem;opacity:.85">📍 ' + ev.zone + '</span>' +
        '<span style="font-size:.68rem;font-weight:700;color:var(--gold);">' + ev.conseil + '</span>' +
        '</div>'
      ).join('');
      el.innerHTML = html;
      setLS(cacheKey, html);
      setLS(cacheTs, String(Date.now()));
    })
    .catch(() => {
      el.innerHTML = '<div class="list-item warn" style="font-size:11px;">⚠️ API Paris indisponible · Appuyez sur 🔄 pour réessayer</div>';
    });
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
  // Tenter de tout sauvegarder — si quota LocalStorage dépassé, réduire progressivement
  const full = state.docs.map(d => ({ name: d.name, id: d.id, type: d.type, src: d.src || '' }));
  try {
    setLS('wob_docs', JSON.stringify(full));
    return;
  } catch(e) {}

  // Quota dépassé : retirer les gros docs un par un jusqu'à ce que ça passe
  let trimmed = full.map(d => ({
    ...d,
    src: d.src.length > 300000 ? d.src.slice(0, 300000) : d.src,
  }));
  try { setLS('wob_docs', JSON.stringify(trimmed)); return; } catch(e) {}

  // Dernier recours : on garde seulement les métadonnées (nom, id, type) sans les images
  const meta = full.map(d => ({ name: d.name, id: d.id, type: d.type, src: '' }));
  try { setLS('wob_docs', JSON.stringify(meta)); } catch(e) {
    console.warn('[WOD] localStorage plein — documents non sauvegardés');
  }
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

  // Libérer les anciennes blob URLs pour éviter les fuites mémoire
  if (window._wodPdfBlobUrls) {
    window._wodPdfBlobUrls.forEach(u => URL.revokeObjectURL(u));
  }
  window._wodPdfBlobUrls = [];

  track.innerHTML = state.docs.map(doc => {
    const isImg = doc.type?.startsWith('image/');
    const isPdf = doc.type === 'application/pdf';

    if (isImg && doc.src) {
      return `<div class="iv-slide"><img src="${doc.src}" alt="${doc.name}" style="max-width:100%;max-height:80vh;object-fit:contain;border-radius:8px;"></div>`;
    }

    if (isPdf && doc.src) {
      // Convertir base64 → Blob → URL pour l'embed PDF
      try {
        const base64 = doc.src.split(',')[1] || doc.src;
        const binary = atob(base64);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob   = new Blob([bytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        window._wodPdfBlobUrls.push(blobUrl); // Pour libérer plus tard
        return `<div class="iv-slide" style="width:100%;height:80vh;">
          <embed src="${blobUrl}" type="application/pdf" width="100%" height="100%" style="border-radius:8px;">
          <div style="text-align:center;margin-top:8px;">
            <a href="${blobUrl}" target="_blank" style="color:var(--gold);font-size:.75rem;text-decoration:none;">
              📄 Ouvrir dans un nouvel onglet
            </a>
          </div>
        </div>`;
      } catch(e) {
        return `<div class="iv-slide" style="color:#fff;text-align:center;padding:40px;">
          <span style="font-size:.8rem;opacity:.7">⚠️ PDF trop volumineux pour prévisualisation<br>${doc.name}</span>
        </div>`;
      }
    }

    // Autre type — juste le nom
    return `<div class="iv-slide" style="color:#fff;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;padding:40px;">
      <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span style="font-size:.9rem;opacity:.8">${doc.name}</span>
    </div>`;
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
    alerts.forEach(a => addNotification(a.msg, a.cls));

    // Conseil Gemini sur les démarches à faire (cache 24h — ça ne change pas)
    const alertCacheKey = 'wob_alert_conseil';
    const alertCacheTs  = 'wob_alert_conseil_ts';
    const alertAge = Date.now() - parseInt(ls(alertCacheTs) || '0');
    const alertsEl = $('alerts-list');
    if (alertsEl && alertAge > 24 * 60 * 60 * 1000) {
      const alertsSummary = alerts.map(a => a.msg).join(', ');
      const prompt = 'Chauffeur VTC Paris. Documents : ' + alertsSummary
        + '. En 2 phrases courtes : quelles demarches faire en priorite et combien de temps ca prend ? Direct, actionnable.';
      callGemini(prompt, { maxTokens: 100, temperature: 0.3 })
        .then(conseil => {
          const tip = document.createElement('div');
          tip.className = 'list-item info';
          tip.style.cssText = 'font-size:.75rem;border-left:3px solid var(--gold);padding-left:10px;margin-top:6px;';
          tip.innerHTML = '💡 ' + conseil;
          alertsEl.appendChild(tip);
          setLS(alertCacheKey, conseil);
          setLS(alertCacheTs, Date.now().toString());
        })
        .catch(() => {});
    } else if (alertsEl) {
      const cached = ls(alertCacheKey);
      if (cached) {
        const tip = document.createElement('div');
        tip.className = 'list-item info';
        tip.style.cssText = 'font-size:.75rem;border-left:3px solid var(--gold);padding-left:10px;margin-top:6px;';
        tip.innerHTML = '💡 ' + cached;
        alertsEl.appendChild(tip);
      }
    }
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
    'wob_ia','wob_depenses','wob_docs','wob_docs_history','wob_goals','wob_notifications',
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
// ══════════════════════════════════════════════════
//  RESET HEBDOMADAIRE — Lundi 4h00 du matin
//  Supprime les stats courses pour alléger la sauvegarde
// ══════════════════════════════════════════════════
function checkWeeklyReset() {
  const now     = new Date();
  const dayOfW  = now.getDay();       // 0=Dim, 1=Lun
  const hour    = now.getHours();
  const lastKey = 'wob_last_weekly_reset';
  const lastReset = parseInt(ls(lastKey) || '0');

  // Fenêtre de déclenchement : Lundi entre 4h00 et 4h59
  if (dayOfW === 1 && hour === 4) {
    const lastResetDate = new Date(lastReset);
    // Eviter de re-déclencher si déjà fait cette semaine
    const mondayThisWeek = new Date(now);
    mondayThisWeek.setHours(0, 0, 0, 0);
    mondayThisWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));

    if (lastReset < mondayThisWeek.getTime()) {
      _doWeeklyReset();
      setLS(lastKey, Date.now().toString());
    }
  }
}

function _doWeeklyReset() {
  // Sauvegarder dans l'historique avant de reset
  const snapshot = {
    ts:        Date.now(),
    weekLabel: _getWeekLabel(new Date()),
    gain:      parseFloat(ls('wob_gain'))  || 0,
    km:        parseFloat(ls('wob_km'))    || 0,
    trips:     parseInt(ls('wob_trips'))   || 0,
    workMin:   parseInt(ls('wob_work_minutes')) || 0,
  };
  const history = JSON.parse(ls('wob_week_history') || '[]');
  history.unshift(snapshot);
  // Garder seulement 12 semaines d'historique
  setLS('wob_week_history', JSON.stringify(history.slice(0, 12)));

  // Effacer les stats hebdomadaires (garder profil, docs, dépenses)
  const RESET_KEYS = [
    'wob_gain','wob_km','wob_trips','wob_sessions',
    'wob_platforms','wob_hours','wob_weekday',
    'wob_ia','wob_work_minutes',
  ];
  RESET_KEYS.forEach(k => localStorage.removeItem(k));

  // Réinitialiser le state en mémoire
  state.totalGain    = 0;
  state.totalKm      = 0;
  state.totalTrips   = 0;
  state.sessions     = [];
  state.platformData = {};
  state.hourData     = new Array(24).fill(0);
  state.weekdayData  = new Array(7).fill(0);

  console.log('[WOD] Reset hebdomadaire effectué —', new Date().toLocaleString('fr-FR'));
}

function _getWeekLabel(date) {
  const d   = new Date(date);
  const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7)); mon.setHours(0,0,0,0);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = (d) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`;
  return `Sem. ${fmt(mon)}–${fmt(sun)}`;
}

// Programmation du reset à 4h lundi (vérif. toutes les heures)
function scheduleWeeklyResetCheck() {
  setInterval(checkWeeklyReset, 60 * 60 * 1000); // Vérif. toutes les heures
}

// ══════════════════════════════════════════════════
//  HOME MODULE — Widgets accueil
//  Import course · Revenus Jour/Semaine · Carburant
//  & Temps de travail · IA Coach Chauffeur
// ══════════════════════════════════════════════════
const HOME = {
  init() {
    this._restoreTrips();
    this._updateRevenueWidget();
    this._updateFuelWorkWidget();
    this._updateNextReset();
    this._renderWeekHistory();
    scheduleWeeklyResetCheck();
    // Auto-refresh toutes les minutes
    setInterval(() => {
      this._updateRevenueWidget();
      this._updateFuelWorkWidget();
      this._updateNextReset();
    }, 60000);
  },

  // ── Lecture / Sauvegarde ──────────────────────────
  _getTrips() {
    return JSON.parse(ls('wob_sessions') || '[]');
  },
  _saveTrips(trips) {
    setLS('wob_sessions', JSON.stringify(trips));
  },
  _restoreTrips() {
    const trips = this._getTrips();
    const badge = $('trip-count-badge');
    if (badge) badge.textContent = `${trips.length}`;
    this._updateHistBadge(trips);
  },

  _updateHistBadge(trips) {
    const b = $('hist-trip-count');
    if (b) b.textContent = trips ? trips.length : this._getTrips().length;
  },

  // ── Prévisualisation temps réel ──────────────────
  onTripInput() {
    const prix  = parseFloat($('trip-prix')?.value)  || 0;
    const km    = parseFloat($('trip-km')?.value)    || 0;
    const duree = parseFloat($('trip-duree')?.value) || 0;
    const btn   = $('trip-add-btn');
    const prev  = $('trip-preview');

    if (prix > 0) {
      if (btn) btn.disabled = false;
      if (prev) prev.style.display = 'grid';

      const conso     = parseFloat(ls('wob_conso')) || 6.5;
      const prixCarb  = parseFloat(ls('wob_prix'))  || 1.85;
      const fuelCost  = km > 0 ? km * (conso / 100) * prixCarb : 0;
      const netCourse = prix - fuelCost;
      const ratioKm   = km > 0 ? prix / km : 0;
      const hourly    = duree > 0 ? (prix / duree) * 60 : 0;

      setText('tp-ratio',   km > 0 ? `${ratioKm.toFixed(2)} €/km` : '—');
      setText('tp-hourly',  duree > 0 ? `${hourly.toFixed(2)} €/h` : '—');
      setText('tp-fuel',    km > 0 ? `-${fuelCost.toFixed(2)} €` : '—');
      setText('tp-net',     `${netCourse.toFixed(2)} €`);

      // Couleur net
      const netEl = $('tp-net');
      if (netEl) netEl.style.color = netCourse > 0 ? 'var(--gold)' : 'var(--red)';
    } else {
      if (btn) btn.disabled = true;
      if (prev) prev.style.display = 'none';
    }
  },

  // ── Ajouter une course ───────────────────────────
  addTrip() {
    const prix  = parseFloat($('trip-prix')?.value);
    const km    = parseFloat($('trip-km')?.value)    || 0;
    const duree = parseFloat($('trip-duree')?.value) || 0;

    if (!prix || prix <= 0) { showToast('Entrez un prix valide'); return; }

    const now = new Date();
    const trip = {
      id:      Date.now(),
      gain:    prix,
      km:      km,
      duree:   duree, // en minutes
      date:    now.toISOString(),
      hour:    now.getHours(),
      weekday: now.getDay(),
    };

    // Ajouter au state
    state.totalGain  += prix;
    state.totalKm    += km;
    state.totalTrips += 1;
    if (trip.hour !== undefined) state.hourData[trip.hour] += prix;
    if (trip.weekday !== undefined) state.weekdayData[trip.weekday] += prix;

    const trips = this._getTrips();
    trips.push(trip);
    this._saveTrips(trips);

    // Cumul temps de travail
    if (duree > 0) {
      const prevMin = parseInt(ls('wob_work_minutes') || '0');
      setLS('wob_work_minutes', (prevMin + duree).toString());
    }

    // Sauvegarder tout
    setLS('wob_gain',      state.totalGain);
    setLS('wob_km',        state.totalKm);
    setLS('wob_trips',     state.totalTrips);
    setLS('wob_hours',     JSON.stringify(state.hourData));
    setLS('wob_weekday',   JSON.stringify(state.weekdayData));
    if (!ls('wob_first_session_ts')) setLS('wob_first_session_ts', Date.now().toString());

    // Reset formulaire
    if ($('trip-prix'))  $('trip-prix').value  = '';
    if ($('trip-km'))    $('trip-km').value    = '';
    if ($('trip-duree')) $('trip-duree').value = '';
    const prev = $('trip-preview'); if (prev) prev.style.display = 'none';
    const btn  = $('trip-add-btn'); if (btn) btn.disabled = true;

    // Rafraîchir
    this._renderRecentTrips(trips);
    const badge = $('trip-count-badge');
    if (badge) badge.textContent = `${trips.length}`;
    this._updateRevenueWidget();
    this._updateFuelWorkWidget();
    updateDashboard();

    // IA coaching auto si 5 courses ou multiple de 10
    if (trips.length === 5 || (trips.length > 0 && trips.length % 10 === 0)) {
      setTimeout(() => this.generateCoachReport(), 500);
    }

    haptic([20, 10, 40]);
    showToast(`✅ Course +${formatEuro(prix)} enregistrée`);
    // Invalider cache progression + rapport après nouvelle course
    localStorage.removeItem('wod_prog_ts');
    localStorage.removeItem('wod_rapport_jour_ts');
    setTimeout(() => WOD_IA.init(true), 800);
    enrichRushWithGemini(); // Rafraîchir le tip rush après chaque course
  },

  // ── Supprimer une course ──────────────────────────
  deleteTrip(id) {
    const trips = this._getTrips();
    const trip  = trips.find(t => t.id === id);
    if (!trip) return;

    state.totalGain  = Math.max(0, state.totalGain  - trip.gain);
    state.totalKm    = Math.max(0, state.totalKm    - trip.km);
    state.totalTrips = Math.max(0, state.totalTrips - 1);

    const newTrips = trips.filter(t => t.id !== id);
    this._saveTrips(newTrips);
    setLS('wob_gain',  state.totalGain);
    setLS('wob_km',    state.totalKm);
    setLS('wob_trips', state.totalTrips);

    if (trip.duree > 0) {
      const prevMin = parseInt(ls('wob_work_minutes') || '0');
      setLS('wob_work_minutes', Math.max(0, prevMin - trip.duree).toString());
    }

    this._renderRecentTrips(newTrips);
    const badge = $('trip-count-badge');
    if (badge) badge.textContent = `${newTrips.length}`;
    this._updateHistBadge(newTrips);
    this._updateRevenueWidget();
    this._updateFuelWorkWidget();
    updateDashboard();
    showToast('Course supprimée');
  },

  // ── Afficher les dernières courses ───────────────
  _renderRecentTrips(trips) {
    // On ne render plus ici — tout va dans l'historique
    const badge = $('trip-count-badge');
    if (badge) badge.textContent = `${trips.length}`;
    this._updateHistBadge(trips);
  },

  // ── Historique complet des courses (onglet Historique) ─
  _renderHistoriqueTrips() {
    const el = $('hist-trips-list'); if (!el) return;
    const trips = this._getTrips();
    if (!trips.length) { el.innerHTML = '<p class="empty-hint">Aucune course enregistrée.</p>'; return; }
    const conso = parseFloat(ls('wob_conso')) || 6.5;
    const pCarb = parseFloat(ls('wob_prix'))  || 1.85;
    const sorted = [...trips].reverse();
    el.innerHTML = sorted.map(t => {
      const d       = new Date(t.date);
      const time    = d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
      const day     = d.toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' });
      const fuel    = t.km > 0 ? t.km * (conso/100) * pCarb : 0;
      const net     = t.gain - fuel;
      const ratio   = t.km > 0 ? `${(t.gain/t.km).toFixed(2)} €/km` : '';
      const duree   = t.duree > 0 ? `${t.duree} min` : '';
      return `<div class="trip-item">
        <div style="width:36px;height:36px;border-radius:10px;background:rgba(212,168,67,.08);border:1px solid rgba(212,168,67,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:700;font-size:.85rem;color:var(--text);">${formatEuro(t.gain)}</span>
            <span style="font-size:.85rem;font-weight:800;color:${net >= 0 ? 'var(--gold)' : 'var(--red)'};">${formatEuro(net)} net</span>
          </div>
          <div style="font-size:.66rem;color:var(--text2);margin-top:3px;display:flex;gap:8px;flex-wrap:wrap;">
            <span>${day} ${time}</span>
            ${t.km > 0 ? `<span>${t.km} km</span>` : ''}
            ${ratio ? `<span>${ratio}</span>` : ''}
            ${duree ? `<span>${duree}</span>` : ''}
          </div>
        </div>
        <button onclick="HOME.deleteTrip(${t.id})" style="background:rgba(255,77,106,.08);border:1px solid rgba(255,77,106,.18);color:var(--red);border-radius:8px;padding:6px 9px;cursor:pointer;font-size:.72rem;flex-shrink:0;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>`;
    }).join('');
  },

  // ── Historique dépenses (onglet Historique) ─────
  _renderHistoriqueDepenses() {
    const el = $('hist-depenses'); if (!el) return;
    renderDepenses(el);
  },

  // ── Widget Revenus ───────────────────────────────
  _updateRevenueWidget() {
    const now   = new Date();
    const trips = this._getTrips();

    // Calcul jour
    const todayTrips = trips.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getFullYear() === now.getFullYear() &&
             d.getMonth()    === now.getMonth()    &&
             d.getDate()     === now.getDate();
    });
    const dayGain  = todayTrips.reduce((s, t) => s + (t.gain || 0), 0);
    const dayCount = todayTrips.length;

    // Calcul semaine (lundi → dimanche)
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const weekTrips = trips.filter(t => t.date && new Date(t.date) >= monday);
    const weekGain  = weekTrips.reduce((s, t) => s + (t.gain || 0), 0);
    const weekCount = weekTrips.length;

    setText('rev-day',        formatEuro(dayGain));
    setText('rev-day-trips',  `${dayCount} course${dayCount > 1 ? 's' : ''}`);
    setText('rev-week',       formatEuro(weekGain));
    setText('rev-week-trips', `${weekCount} course${weekCount > 1 ? 's' : ''}`);

    // Objectifs
    const goals     = state.goals || { day:0, week:0, month:0 };
    const monthGain = trips.reduce((s, t) => s + (t.gain || 0), 0);
    setText('obj-day-val',   `${formatEuro(dayGain)} / ${formatEuro(goals.day)}`);
    setText('obj-week-val',  `${formatEuro(weekGain)} / ${formatEuro(goals.week)}`);
    setText('obj-month-val', `${formatEuro(monthGain)} / ${formatEuro(goals.month)}`);
    setProgress('prog-day',   goals.day   > 0 ? (dayGain  / goals.day)   * 100 : 0);
    setProgress('prog-week',  goals.week  > 0 ? (weekGain / goals.week)  * 100 : 0);
    setProgress('prog-month', goals.month > 0 ? (monthGain / goals.month) * 100 : 0);
  },

  // ── Widget Carburant & Temps de travail ──────────
  _updateFuelWorkWidget() {
    const trips   = this._getTrips();
    const conso   = parseFloat(ls('wob_conso')) || 6.5;
    const pCarb   = parseFloat(ls('wob_prix'))  || 1.85;

    // Semaine courante
    const now    = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const weekTrips = trips.filter(t => t.date && new Date(t.date) >= monday);

    const weekKm      = weekTrips.reduce((s, t) => s + (t.km || 0), 0);
    const weekGain    = weekTrips.reduce((s, t) => s + (t.gain || 0), 0);
    const weekDuree   = weekTrips.reduce((s, t) => s + (t.duree || 0), 0);
    const fuelCost    = weekKm * (conso / 100) * pCarb;
    const totalDep    = state.depenses.reduce((s, d) => s + d.montant, 0);
    const netWeek     = weekGain - fuelCost - totalDep;
    const hourlyRate  = weekDuree > 0 ? (weekGain / weekDuree) * 60 : 0;

    const h   = Math.floor(weekDuree / 60);
    const m   = weekDuree % 60;

    setText('fw-fuel-cost',   formatEuro(fuelCost));
    setText('fw-work-time',   `${h}h ${m.toString().padStart(2,'0')}`);
    setText('fw-net',         formatEuro(netWeek));
    setText('fw-hourly-rate', `${hourlyRate.toFixed(2)} €/h`);

    // Couleur taux horaire
    const hrEl = $('fw-hourly-rate');
    if (hrEl) hrEl.style.color = hourlyRate >= 15 ? 'var(--gold)' : hourlyRate >= 10 ? '#ffc107' : 'var(--red)';
  },

  // ── Info prochain reset ──────────────────────────
  _updateNextReset() {
    const el = $('hero-reset-hint'); if (!el) return;
    const now     = new Date();
    const day     = now.getDay(); // 0=dim
    // Prochain lundi 4h
    const daysUntilMonday = day === 1 ? (now.getHours() >= 4 ? 7 : 0) : (8 - day) % 7;
    const nextReset = new Date(now);
    nextReset.setDate(now.getDate() + daysUntilMonday);
    nextReset.setHours(4, 0, 0, 0);
    const diffH = Math.round((nextReset - now) / 3600000);
    el.textContent = diffH < 24
      ? `🔄 Reset dans ${diffH}h`
      : `🔄 Reset lundi prochain`;
    el.title = `Reset automatique le ${nextReset.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })} à 04h00`;
  },

  // ── IA Coach Chauffeur — Lignes structurées ─────
  async generateCoachReport() {
    const dotEl = $('ia-dots');
    dotEl?.classList.add('active');

    const trips = this._getTrips();

    const _setLine = (id, text) => {
      const el = $(id);
      if (!el) return;
      // Mise en valeur des chiffres/montants en or
      const formatted = text.replace(/(\d+[,.]?\d*\s*[€%]|\.\d+\s*€\/[a-zéèê]+)/g,
        '<strong style="color:var(--gold);font-weight:700;">$1</strong>');
      const textEl = el.querySelector('.ia-line-text');
      if (textEl) { textEl.innerHTML = formatted; }
      else { el.innerHTML = formatted; }
      el.classList.add('active');
    };

    if (!trips.length) {
      _setLine('ia-line-revenus',    'Enregistrez vos premières courses.');
      _setLine('ia-line-zones',      'Analyse en attente.');
      _setLine('ia-line-carbu',      'Analyse en attente.');
      _setLine('ia-line-motivation', 'Commencez à conduire pour activer le coach.');
      _setLine('ia-line-restant',    'Définissez un objectif journalier.');
      dotEl?.classList.remove('active');
      return;
    }

    const conso   = parseFloat(ls('wob_conso')) || 6.5;
    const pCarb   = parseFloat(ls('wob_prix'))  || 1.85;
    const vehType = ls('wob_veh_type') || 'essence';
    const goals   = state.goals || { day:0, week:0, month:0 };
    const h       = new Date().getHours();
    const jour    = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][new Date().getDay()];

    // Stats
    const gains    = trips.map(t => t.gain);
    const total    = gains.reduce((a,b) => a+b, 0);
    const avg      = total / trips.length;
    const totalKm  = trips.reduce((s,t) => s+(t.km||0), 0);
    const totalMin = trips.reduce((s,t) => s+(t.duree||0), 0);
    const fuelCost = totalKm * (conso/100) * pCarb;
    const net      = total - fuelCost;
    const hourly   = totalMin > 0 ? (total/totalMin)*60 : 0;
    const ratioKm  = totalKm > 0 ? total/totalKm : 0;
    const lowRatio = trips.filter(t => t.km>0 && t.gain/t.km < 1.5).length;
    const premium  = trips.filter(t => t.gain >= 30).length;

    // Calcul restant objectif journalier
    const today = new Date(); today.setHours(0,0,0,0);
    const dayGain = trips.filter(t => t.date && new Date(t.date) >= today).reduce((s,t) => s+(t.gain||0), 0);
    const restant = goals.day > 0 ? Math.max(0, goals.day - dayGain) : null;
    const coursesRestantes = restant && avg > 0 ? Math.ceil(restant / avg) : null;

    // Cache TTL 30min
    const cacheKey = 'wod_coach_lines';
    const cacheTs  = 'wod_coach_lines_ts';
    const cacheTrips = 'wod_coach_lines_trips';
    const age = Date.now() - parseInt(ls(cacheTs) || '0');
    const cachedTrips = parseInt(ls(cacheTrips) || '0');

    let lines = null;
    if (age < 30 * 60 * 1000 && cachedTrips === trips.length) {
      try { lines = JSON.parse(ls(cacheKey) || 'null'); } catch(e){}
    }

    if (!lines) {
      const prompt = `Tu es expert VTC Paris. Chauffeur ${jour} ${h}h. Données: ${trips.length} courses, brut ${total.toFixed(2)}€, net ${net.toFixed(2)}€, moy ${avg.toFixed(2)}€/course, ratio ${ratioKm.toFixed(2)}€/km, taux ${hourly.toFixed(1)}€/h, carbu ${fuelCost.toFixed(2)}€ (${conso}L/100 à ${pCarb}€), ${lowRatio} courses sous 1.5€/km, ${premium} courses premium >=30€. Objectif jour ${goals.day}€, déjà ${dayGain.toFixed(2)}€. Reponds UNIQUEMENT en JSON strict: {"revenus":"une phrase courte sur la performance revenus, chiffrée, sans emoji","zones":"une phrase sur zones/créneaux à cibler maintenant, sans emoji","carburant":"une phrase sur gestion carburant et rentabilité km, sans emoji","motivation":"une phrase motivante courte et directe, sans emoji"}`;

      try {
        const text  = await callGemini(prompt, { maxTokens: 350, temperature: 0.4 });
        const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) {
          lines = JSON.parse(match[0]);
          setLS(cacheKey,  JSON.stringify(lines));
          setLS(cacheTs,   Date.now().toString());
          setLS(cacheTrips, String(trips.length));
        }
      } catch(e) { console.warn('Coach lines Gemini:', e); }
    }

    // Fallback local
    if (!lines) {
      lines = {
        revenus:    hourly >= 15
          ? `Taux horaire de ${hourly.toFixed(1)} €/h sur ${trips.length} courses — bonne dynamique.`
          : `Taux horaire de ${hourly.toFixed(1)} €/h — ciblez CDG/Orly (45-80€) pour augmenter le panier.`,
        zones:      h >= 7 && h <= 9   ? 'Rush matin actif — priorité gares et zones bureaux (La Défense, Part-Dieu).'
                  : h >= 17 && h <= 20 ? 'Rush soir — positionnez-vous centres d\'affaires et restaurants.'
                  : h >= 22            ? 'Nuit — CDG toutes les 30 min, zones festives Grands Boulevards.'
                  :                      'Activité modérée — restez proches des hôtels et gares principales.',
        carburant:  `Carburant: ${fuelCost.toFixed(2)} € pour ${totalKm.toFixed(0)} km — ${ratioKm < 1.8 ? 'réduisez les trajets à vide, restez dans les zones demande forte.' : 'bonne maîtrise des kilomètres à vide.'}`,
        motivation: trips.length < 5 ? 'Chaque course compte — construisez votre historique pour affiner l\'analyse.'
          : premium > 0 ? `${premium} courses premium enregistrées — continuez à cibler les longues distances.`
          : 'Concentrez-vous sur la qualité plutôt que la quantité — une bonne course vaut trois mauvaises.',
      };
    }

    _setLine('ia-line-revenus',    lines.revenus    || '—');
    _setLine('ia-line-zones',      lines.zones      || '—');
    _setLine('ia-line-carbu',      lines.carburant  || '—');
    _setLine('ia-line-motivation', lines.motivation || '—');

    // Ligne restant objectif — toujours calculé localement
    if (restant !== null && coursesRestantes !== null) {
      _setLine('ia-line-restant', restant > 0
        ? `Il reste ${formatEuro(restant)} à atteindre, soit environ ${coursesRestantes} course${coursesRestantes > 1 ? 's' : ''} à ${formatEuro(avg)} de moyenne.`
        : `Objectif journalier de ${formatEuro(goals.day)} atteint — continuez à optimiser le net.`);
    } else if (goals.day === 0) {
      _setLine('ia-line-restant', 'Définissez un objectif journalier dans Revenus & Objectifs.');
    }

    dotEl?.classList.remove('active');
    setLS('wob_ia', JSON.stringify(lines));
    this._renderProjections(avg, trips.length);
  },

  _renderProjections(avgPerTrip, tripsCount) {
    const projEl = $('ia-projections'); if (!projEl || tripsCount === 0) return;
    const elapsed = Math.max(1, getElapsedDays());
    const tpd     = tripsCount / elapsed;
    const projD   = avgPerTrip * tpd;
    const projW   = projD * 7;
    const projM   = projD * 30;
    projEl.innerHTML = `
      <div class="proj-card"><div class="proj-lbl">Projection/jour</div><div class="proj-val">${formatEuro(projD)}</div></div>
      <div class="proj-card"><div class="proj-lbl">Projection/semaine</div><div class="proj-val">${formatEuro(projW)}</div></div>
      <div class="proj-card"><div class="proj-lbl">Projection/mois</div><div class="proj-val">${formatEuro(projM)}</div></div>`;
    if ($('stats-projections')) $('stats-projections').innerHTML = projEl.innerHTML;

    // Alimenter widget Performances & Carburant (mis à jour à chaque recalcul)
    const _conso = parseFloat(ls('wob_conso')) || 6.5;
    const _prix  = parseFloat(ls('wob_prix'))  || 1.85;
    const _km    = state.totalKm || 0;
    const _mins  = state.sessions ? state.sessions.reduce((s,t) => s+(t.duree||0), 0) : 0;
    const _gain  = state.totalGain || 0;
    const _fuelL = _km * (_conso / 100);
    const _fuelE = _fuelL * _prix;
    const _hrly  = _mins > 0 ? (_gain / _mins) * 60 : 0;
    const _ratio = _km > 0 ? _gain / _km : 0;
    [['perf-hourly',   _hrly  > 0 ? _hrly.toFixed(1)  + ' €' : '—'],
     ['perf-fuel-cost',_fuelE > 0 ? _fuelE.toFixed(2) + ' €' : '—'],
     ['perf-fuel-l',   _fuelL > 0 ? _fuelL.toFixed(1) + ' L' : '—'],
     ['perf-ratio-km', _ratio > 0 ? _ratio.toFixed(2) + ' €' : '—'],
    ].forEach(([id, v]) => { const el = $(id); if (el) el.textContent = v; });
  },
  _renderWeekHistory() {
    const el = document.getElementById('week-history-list'); if (!el) return;
    const history = JSON.parse(localStorage.getItem('wob_week_history') || '[]');
    if (!history.length) return;
    const conso = parseFloat(localStorage.getItem('wob_conso')) || 6.5;
    const prix  = parseFloat(localStorage.getItem('wob_prix'))  || 1.85;
    el.innerHTML = history.slice(0, 12).map(w => {
      const fuelCost = w.km * (conso / 100) * prix;
      const net      = w.gain - fuelCost;
      const workH    = Math.floor((w.workMin || 0) / 60);
      const workM    = (w.workMin || 0) % 60;
      const date     = new Date(w.ts).toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;">
        <div>
          <div style="font-size:.78rem;font-weight:700;">${w.weekLabel || 'Semaine'}</div>
          <div style="font-size:.65rem;color:var(--text-dim);">${w.trips} courses · ${w.km.toFixed(0)} km${workH > 0 ? ` · ${workH}h${workM.toString().padStart(2,'0')}` : ''}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:.9rem;font-weight:800;color:var(--gold);">${net.toFixed(2)} € net</div>
          <div style="font-size:.62rem;color:var(--text-dim);">brut ${w.gain.toFixed(2)}€ · ⛽${fuelCost.toFixed(2)}€</div>
        </div>
      </div>`;
    }).join('');
  },


};
window.HOME = HOME;

// ══════════════════════════════════════════════════
//  TOGGLE HISTORIQUE COURSES
// ══════════════════════════════════════════════════
window.toggleHistorique = function() {
  const list = $('hist-trips-list');
  const lbl  = $('hist-toggle-lbl');
  const ico  = $('hist-toggle-ico');
  if (!list) return;
  const hidden = list.style.display === 'none';
  list.style.display = hidden ? '' : 'none';
  if (lbl) lbl.textContent = hidden ? 'Masquer' : 'Afficher';
  if (ico) ico.style.transform = hidden ? '' : 'rotate(-90deg)';
};

window.generateIAReport = () => HOME.generateCoachReport();

// Expose state globally for api.js
window.state = state;
