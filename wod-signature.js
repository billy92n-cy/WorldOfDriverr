/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  WORLD OF DRIVER — SIGNATURE PREMIUM  v1.0                  ║
 * ║  Logo · Sons · Micro-animations · Neon · Dhikr Counter      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
"use strict";

// ══════════════════════════════════════════════════════════════
//  WOD SIGNATURE SONORE — Web Audio API
// ══════════════════════════════════════════════════════════════
const WOD_SOUND = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, type, vol, start, dur, rampUp = 0.005, rampDown = 0.05) {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime + start);
      gain.gain.setValueAtTime(0, c.currentTime + start);
      gain.gain.linearRampToValueAtTime(vol, c.currentTime + start + rampUp);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur - rampDown);
      osc.start(c.currentTime + start);
      osc.stop(c.currentTime + start + dur);
    } catch (e) {}
  }

  return {
    // Ouverture de l'app — accord doré ascendant
    open() {
      tone(220, 'sine', 0.12, 0, 0.25);
      tone(330, 'sine', 0.10, 0.12, 0.25);
      tone(440, 'sine', 0.14, 0.22, 0.35);
      tone(550, 'sine', 0.08, 0.30, 0.5);
      tone(660, 'triangle', 0.06, 0.42, 0.6);
    },

    // Clic standard — tap léger cristallin
    click() {
      tone(880, 'sine', 0.08, 0, 0.09);
      tone(1100, 'sine', 0.04, 0.02, 0.07);
    },

    // Validation / Enregistrement — accord harmonieux
    success() {
      tone(523, 'sine', 0.10, 0, 0.18);
      tone(659, 'sine', 0.10, 0.08, 0.2);
      tone(784, 'sine', 0.12, 0.16, 0.35);
    },

    // Dhikr tap — son doux cristal
    dhikr() {
      tone(1047, 'sine', 0.07, 0, 0.12);
      tone(1319, 'sine', 0.04, 0.04, 0.1);
    },

    // Dhikr 33 célébration — fanfare premium
    dhikrComplete() {
      [0, 0.12, 0.22, 0.30, 0.40, 0.52].forEach((t, i) => {
        const freqs = [523, 659, 784, 1047, 880, 1175];
        tone(freqs[i], 'sine', 0.11, t, 0.22);
      });
      tone(1568, 'triangle', 0.06, 0.65, 0.5);
    },

    // Objectif atteint
    goal() {
      tone(392, 'sine', 0.10, 0, 0.15);
      tone(523, 'sine', 0.10, 0.10, 0.18);
      tone(659, 'sine', 0.12, 0.20, 0.25);
      tone(784, 'sine', 0.08, 0.32, 0.5);
    },

    // Erreur / danger
    error() {
      tone(200, 'sawtooth', 0.08, 0, 0.12);
      tone(160, 'sawtooth', 0.06, 0.10, 0.12);
    },
  };
})();

// Exposer pour app.js (toggle FAB, etc.)
window.playAppleSound = () => WOD_SOUND.click();


// ══════════════════════════════════════════════════════════════
//  LOGO BASE64 EMBEDDING — charge l'image depuis le fichier PNG
// ══════════════════════════════════════════════════════════════
const WOD_LOGO = {
  src: './IMG_4074.PNG',  // Fichier logo uploadé
  fallback: './icon-192.png',

  // Injecte le logo dans tous les emplacements prévus
  injectAll() {
    // Splash screen — remplace l'icône par le vrai logo
    const splashImg = document.getElementById('splash-logo-img');
    if (splashImg) {
      splashImg.src = this.src;
      splashImg.onerror = () => { splashImg.src = this.fallback; };
      splashImg.style.cssText = `
        width:120px; height:120px; border-radius:0; object-fit:contain;
        border:none; box-shadow:none;
        position:relative; z-index:3; display:none;
        filter: drop-shadow(0 0 28px rgba(212,168,67,0.7));
      `;
    }

    // Header logo
    const hdImgs = document.querySelectorAll('.app-header img, .hd-left img');
    hdImgs.forEach(img => {
      img.src = this.src;
      img.onerror = () => { img.src = this.fallback; };
      img.style.cssText = `
        width:36px; height:36px; border-radius:8px; object-fit:contain;
        border:1px solid rgba(212,168,67,0.4); flex-shrink:0;
        background:#0a0f1a;
        box-shadow: 0 0 12px rgba(212,168,67,0.35);
        filter: drop-shadow(0 0 6px rgba(212,168,67,0.5));
      `;
    });

    // Notifications centre — header logo
    this._injectNotifLogo();
  },

  _injectNotifLogo() {
    const notifHd = document.querySelector('.notif-hd');
    if (notifHd && !notifHd.querySelector('.notif-wod-logo')) {
      const logo = document.createElement('img');
      logo.src = this.src;
      logo.onerror = () => { logo.src = this.fallback; };
      logo.className = 'notif-wod-logo';
      logo.style.cssText = 'width:22px;height:22px;object-fit:contain;border-radius:5px;background:#0a0f1a;margin-right:6px;';
      notifHd.insertBefore(logo, notifHd.firstChild);
    }
  },
};


// ══════════════════════════════════════════════════════════════
//  NEON GLOW ENHANCEMENT — widgets premium avec lueur or
// ══════════════════════════════════════════════════════════════
function injectNeonStyles() {
  const style = document.createElement('style');
  style.id = 'wod-signature-styles';
  style.textContent = `
    /* ══ NEON CARD SHIMMER ══ */
    .card {
      transition: box-shadow 0.3s ease, border-color 0.3s ease, transform 0.2s ease !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25), 0 0 0 0 rgba(212,168,67,0) !important;
    }
    .card:hover {
      box-shadow: 0 6px 28px rgba(0,0,0,0.35), 0 0 18px rgba(212,168,67,0.12) !important;
      border-color: rgba(212,168,67,0.22) !important;
    }
    .hero-card {
      box-shadow: 0 8px 48px rgba(212,168,67,0.18),
                  inset 0 1px 0 rgba(255,255,255,.04),
                  0 0 60px rgba(212,168,67,0.08) !important;
      animation: heroNeonBreath 4s ease-in-out infinite !important;
    }
    @keyframes heroNeonBreath {
      0%,100% { box-shadow: 0 8px 48px rgba(212,168,67,0.18), inset 0 1px 0 rgba(255,255,255,.04), 0 0 60px rgba(212,168,67,0.08); }
      50% { box-shadow: 0 8px 60px rgba(212,168,67,0.28), inset 0 1px 0 rgba(255,255,255,.06), 0 0 80px rgba(212,168,67,0.15); }
    }

    /* ══ METRIC TILES NEON ══ */
    .mtile {
      position: relative;
      overflow: hidden;
      transition: transform 0.18s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s ease !important;
    }
    .mtile:active {
      transform: scale(0.93) !important;
      box-shadow: 0 0 20px rgba(212,168,67,0.3) !important;
    }
    .mtile::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: radial-gradient(ellipse at 50% 0%, rgba(212,168,67,0.08), transparent 60%);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .mtile:hover::after { opacity: 1; }

    /* ══ BTN GOLD SPRING EFFECT ══ */
    .btn-gold {
      transition: transform 0.18s cubic-bezier(.34,1.56,.64,1),
                  box-shadow 0.2s ease,
                  background 0.2s ease !important;
    }
    .btn-gold:active {
      transform: scale(0.94) !important;
      box-shadow: 0 2px 12px rgba(212,168,67,0.25) !important;
    }
    .btn-gold:hover {
      box-shadow: 0 6px 28px rgba(212,168,67,0.5) !important;
    }

    /* ══ FAB NEON PULSE ══ */
    .fab-btn {
      box-shadow: 0 0 0 8px rgba(212,168,67,0.13),
                  0 0 40px rgba(212,168,67,0.5),
                  0 8px 30px rgba(0,0,0,0.5) !important;
      animation: fabNeonPulse 2.5s ease-in-out infinite !important;
    }
    @keyframes fabNeonPulse {
      0%,100% { box-shadow: 0 0 0 8px rgba(212,168,67,0.13), 0 0 40px rgba(212,168,67,0.5), 0 8px 30px rgba(0,0,0,0.5); }
      50% { box-shadow: 0 0 0 12px rgba(212,168,67,0.08), 0 0 60px rgba(212,168,67,0.7), 0 8px 40px rgba(0,0,0,0.6); }
    }
    .fab-btn:active {
      transform: translateX(-50%) scale(0.91) !important;
      animation: none !important;
    }

    /* ══ PROGRESS BAR NEON ══ */
    .progress-bar {
      box-shadow: 0 0 8px rgba(212,168,67,0.6) !important;
    }

    /* ══ SPLASH LOGO ENHANCED ══ */
    .splash-logo.ready {
      filter: drop-shadow(0 0 30px rgba(212,168,67,0.8));
      animation: splashLogoBeat 1.5s ease-in-out infinite;
    }
    @keyframes splashLogoBeat {
      0%,100% { filter: drop-shadow(0 0 20px rgba(212,168,67,0.6)); transform: scale(1); }
      50% { filter: drop-shadow(0 0 50px rgba(212,168,67,1)); transform: scale(1.04); }
    }

    /* ══ HEADER LOGO GLOW ══ */
    .app-header img {
      transition: filter 0.3s ease, box-shadow 0.3s ease;
    }
    .app-header img:hover {
      filter: drop-shadow(0 0 10px rgba(212,168,67,0.9)) !important;
    }

    /* ══ SCREEN TRANSITION ══ */
    .screen {
      transition: opacity 0.32s cubic-bezier(.4,0,.2,1),
                  transform 0.32s cubic-bezier(.4,0,.2,1) !important;
    }
    .screen.active {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
    .screen:not(.active) {
      opacity: 0 !important;
      transform: translateY(12px) !important;
    }

    /* ══ ANIMATED COUNTERS ══ */
    .hero-amount, .mtile-val {
      transition: color 0.3s ease;
      will-change: transform;
    }
    .counter-pop {
      animation: counterPop 0.35s cubic-bezier(.34,1.56,.64,1) !important;
    }
    @keyframes counterPop {
      0% { transform: scale(1); }
      40% { transform: scale(1.18); color: var(--gold2); }
      100% { transform: scale(1); }
    }

    /* ══ TOAST ENHANCED ══ */
    #toast {
      transition: opacity 0.35s cubic-bezier(.4,0,.2,1), transform 0.35s cubic-bezier(.34,1.56,.64,1) !important;
      transform: translateX(-50%) translateY(0);
    }
    #toast[style*="opacity: 1"] {
      transform: translateX(-50%) translateY(0) !important;
    }
    #toast[style*="opacity: 0"] {
      transform: translateX(-50%) translateY(12px) !important;
    }

    /* ══ ICON NAV SPRING ══ */
    .fab-item {
      transition: transform 0.22s cubic-bezier(.34,1.56,.64,1),
                  background 0.2s ease, color 0.2s ease !important;
    }
    .fab-item:active {
      transform: scale(0.88) !important;
    }

    /* ═══════════════════════════════════════
       DHIKR WIDGET
    ═══════════════════════════════════════ */
    .dhikr-card {
      background: linear-gradient(145deg, #0e0a00, #110d02, #0a0f1a);
      border: 1px solid rgba(212,168,67,0.25);
      border-radius: 24px;
      padding: 20px;
      margin-bottom: 12px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 6px 32px rgba(0,0,0,0.4), 0 0 40px rgba(212,168,67,0.08);
    }
    .dhikr-card::before {
      content: '';
      position: absolute;
      top: -60px; right: -60px;
      width: 200px; height: 200px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(212,168,67,0.1), transparent 65%);
      pointer-events: none;
    }
    .dhikr-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .dhikr-icon {
      width: 28px; height: 28px;
      border-radius: 8px;
      background: linear-gradient(145deg, #2a1e00, #1a1200);
      border: 1px solid rgba(212,168,67,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      box-shadow: 0 0 10px rgba(212,168,67,0.25);
    }
    .dhikr-title {
      font-size: .82rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: .02em;
    }
    .dhikr-subtitle {
      font-size: .62rem;
      color: var(--gold);
      letter-spacing: .1em;
      opacity: .75;
      margin-left: auto;
    }

    /* Counter display */
    .dhikr-counter-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 8px 0 14px;
    }
    .dhikr-arc-svg {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    .dhikr-arc-bg {
      fill: none;
      stroke: rgba(212,168,67,0.1);
      stroke-width: 3;
      stroke-linecap: round;
    }
    .dhikr-arc-fill {
      fill: none;
      stroke: url(#dhikrGrad);
      stroke-width: 3;
      stroke-linecap: round;
      stroke-dasharray: 283;
      stroke-dashoffset: 283;
      transition: stroke-dashoffset 0.4s cubic-bezier(.4,0,.2,1);
      filter: drop-shadow(0 0 4px rgba(212,168,67,0.8));
    }

    .dhikr-btn {
      width: 100px; height: 100px;
      border-radius: 50%;
      border: 2px solid rgba(212,168,67,0.35);
      background: radial-gradient(circle at 40% 35%, rgba(212,168,67,0.18), rgba(10,10,20,0.9));
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      position: relative;
      transition: transform 0.18s cubic-bezier(.34,1.56,.64,1), border-color 0.2s ease;
      box-shadow: 0 0 30px rgba(212,168,67,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
      outline: none;
      -webkit-tap-highlight-color: transparent;
      z-index: 1;
    }
    .dhikr-btn:active {
      transform: scale(0.88) !important;
      border-color: rgba(212,168,67,0.8) !important;
    }
    .dhikr-count {
      font-family: 'Cinzel', serif;
      font-size: 2.4rem;
      font-weight: 700;
      color: var(--gold2);
      line-height: 1;
      text-shadow: 0 0 20px rgba(245,194,87,0.5);
      user-select: none;
      pointer-events: none;
    }
    .dhikr-count.bounce {
      animation: dhikrBounce 0.35s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes dhikrBounce {
      0% { transform: scale(1); }
      35% { transform: scale(1.4); color: #fff; text-shadow: 0 0 30px rgba(212,168,67,1); }
      65% { transform: scale(0.95); }
      100% { transform: scale(1); }
    }

    /* Ripple effect */
    .dhikr-ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(212,168,67,0.4);
      pointer-events: none;
      transform: scale(0);
      animation: dhikrRipple 0.6s ease-out forwards;
    }
    @keyframes dhikrRipple {
      to { transform: scale(3.5); opacity: 0; }
    }

    /* Light wave */
    .dhikr-wave {
      position: absolute;
      top: 50%; left: 50%;
      width: 100px; height: 100px;
      border-radius: 50%;
      border: 2px solid rgba(212,168,67,0.6);
      transform: translate(-50%, -50%) scale(1);
      opacity: 0;
      pointer-events: none;
      animation: dhikrWave 0.7s ease-out forwards;
    }
    @keyframes dhikrWave {
      to { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
    }

    /* Info row below button */
    .dhikr-info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 2px;
    }
    .dhikr-label {
      font-size: .62rem;
      color: var(--text2);
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .dhikr-of33 {
      font-size: .7rem;
      font-weight: 700;
      color: var(--gold);
      font-variant-numeric: tabular-nums;
    }
    .dhikr-reset-btn {
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--border2);
      border-radius: 8px;
      color: var(--text2);
      font-size: .65rem;
      padding: 5px 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: 'DM Sans', sans-serif;
    }
    .dhikr-reset-btn:active { transform: scale(0.93); color: var(--gold); }

    /* Particles */
    .dhikr-particle {
      position: absolute;
      width: 6px; height: 6px;
      border-radius: 50%;
      pointer-events: none;
      animation: dhikrParticle 0.8s ease-out forwards;
    }
    @keyframes dhikrParticle {
      0% { transform: translate(0,0) scale(1); opacity: 1; }
      100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; }
    }

    /* CELEBRATION OVERLAY */
    .dhikr-celebration {
      position: fixed;
      inset: 0;
      z-index: 9990;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .dhikr-celebration.active {
      opacity: 1;
      pointer-events: auto;
    }
    .dhikr-celebration-bg {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 45%, rgba(212,168,67,0.3), rgba(8,12,20,0.95));
    }
    .dhikr-celebration-logo {
      position: relative;
      z-index: 1;
      width: 140px; height: 140px;
      object-fit: contain;
      border-radius: 0;
      filter: drop-shadow(0 0 40px rgba(212,168,67,1));
      animation: celebLogo 1.5s ease-in-out;
    }
    @keyframes celebLogo {
      0% { transform: scale(0.3) rotate(-15deg); opacity: 0; }
      30% { transform: scale(1.15) rotate(3deg); opacity: 1; }
      60% { transform: scale(0.97) rotate(-1deg); }
      80% { transform: scale(1.05) rotate(0.5deg); }
      100% { transform: scale(1) rotate(0); opacity: 1; }
    }
    .dhikr-celebration-text {
      position: relative; z-index: 1;
      font-family: 'Cinzel', serif;
      font-size: 1.4rem; font-weight: 900;
      color: var(--gold2);
      text-shadow: 0 0 40px rgba(212,168,67,0.9);
      text-align: center;
      margin-top: 20px;
      animation: celebText 0.6s cubic-bezier(.34,1.56,.64,1) 0.3s both;
    }
    .dhikr-celebration-sub {
      position: relative; z-index: 1;
      font-size: .75rem; font-weight: 600;
      color: rgba(212,168,67,0.7);
      letter-spacing: .2em;
      text-align: center;
      margin-top: 6px;
      animation: celebText 0.6s cubic-bezier(.34,1.56,.64,1) 0.5s both;
    }
    @keyframes celebText {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* Confetti flake */
    .dhikr-confetti {
      position: fixed;
      width: 8px; height: 8px;
      border-radius: 2px;
      pointer-events: none;
      animation: confettiFall var(--dur) ease-in var(--delay) forwards;
      z-index: 9991;
    }
    @keyframes confettiFall {
      0% { transform: translate(0, -20px) rotate(0deg); opacity: 1; }
      100% { transform: translate(var(--dx), 110vh) rotate(var(--rot)); opacity: 0; }
    }

    /* ══ NOTIFICATION NEON ══ */
    .notif-item {
      animation: notifSlideIn 0.3s cubic-bezier(.34,1.2,.64,1) both;
    }
    @keyframes notifSlideIn {
      from { transform: translateX(12px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    /* ══ SPLASH LOGO CONTAINER ══ */
    #splash-logo-img {
      filter: drop-shadow(0 0 30px rgba(212,168,67,0.7)) !important;
    }

    /* ══ IA CARD NEON ══ */
    .ia-card {
      box-shadow: 0 4px 24px rgba(0,0,0,0.3), 0 0 30px rgba(212,168,67,0.06) !important;
    }
    .ia-card:hover {
      box-shadow: 0 4px 30px rgba(0,0,0,0.35), 0 0 40px rgba(212,168,67,0.1) !important;
    }

    /* ══ PILL NEON ══ */
    .gps-pill.active {
      box-shadow: 0 0 12px rgba(45,212,160,0.4) !important;
    }

    /* ══ PROFIL AVATAR NEON ══ */
    .p-avatar {
      box-shadow: 0 0 24px rgba(212,168,67,0.35), 0 0 0 4px rgba(212,168,67,0.08) !important;
      transition: box-shadow 0.3s ease !important;
    }
    .p-avatar:hover {
      box-shadow: 0 0 40px rgba(212,168,67,0.6), 0 0 0 8px rgba(212,168,67,0.12) !important;
    }

    /* ══ INPUT FOCUS NEON ══ */
    .fi:focus {
      box-shadow: 0 0 0 2px rgba(212,168,67,0.25), 0 0 12px rgba(212,168,67,0.12) !important;
    }

    /* ══ Poi/list items ══ */
    .poi-item:hover {
      border-color: rgba(212,168,67,0.2) !important;
      box-shadow: 0 0 12px rgba(212,168,67,0.08) !important;
    }
  `;
  document.head.appendChild(style);
}


// ══════════════════════════════════════════════════════════════
//  DHIKR COUNTER WIDGET
// ══════════════════════════════════════════════════════════════
const DHIKR = {
  count: 0,
  MAX: 33,
  celebrating: false,

  init() {
    this.count = parseInt(localStorage.getItem('wod_dhikr') || '0');
    this._injectWidget();
    this._injectCelebration();
  },

  _injectWidget() {
    // Insérer dans la section home, après le card IA
    const homeScroll = document.querySelector('#screen-home .screen-scroll');
    if (!homeScroll || document.getElementById('dhikr-widget')) return;

    const iaCard = homeScroll.querySelector('.ia-card');
    const widget = document.createElement('div');
    widget.id = 'dhikr-widget';
    widget.className = 'dhikr-card';
    widget.innerHTML = this._buildHTML();

    if (iaCard) {
      iaCard.after(widget);
    } else {
      homeScroll.appendChild(widget);
    }

    this._updateArc();
  },

  _buildHTML() {
    return `
      <div class="dhikr-title-row">
        <div class="dhikr-icon">☽</div>
        <span class="dhikr-title">Dhikr</span>
        <span class="dhikr-subtitle">COMPTEUR</span>
      </div>

      <div class="dhikr-counter-wrap" id="dhikr-counter-wrap">
        <!-- SVG arc progress -->
        <svg class="dhikr-arc-svg" width="120" height="120" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="dhikrGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#d4a843"/>
              <stop offset="100%" style="stop-color:#f5c257"/>
            </linearGradient>
          </defs>
          <circle class="dhikr-arc-bg" cx="60" cy="60" r="45"
            stroke-dasharray="283" stroke-dashoffset="0"
            transform="rotate(-90 60 60)"/>
          <circle class="dhikr-arc-fill" id="dhikr-arc-fill" cx="60" cy="60" r="45"
            transform="rotate(-90 60 60)"/>
        </svg>

        <button class="dhikr-btn" id="dhikr-btn" onclick="DHIKR.tap(event)" ontouchstart="">
          <span class="dhikr-count" id="dhikr-count">${this.count}</span>
        </button>
      </div>

      <div class="dhikr-info-row">
        <span class="dhikr-label">Toucher pour compter</span>
        <span class="dhikr-of33" id="dhikr-of33">${this.count} / 33</span>
        <button class="dhikr-reset-btn" onclick="DHIKR.reset()">↺ Reset</button>
      </div>
    `;
  },

  _injectCelebration() {
    if (document.getElementById('dhikr-celebration')) return;
    const overlay = document.createElement('div');
    overlay.id = 'dhikr-celebration';
    overlay.className = 'dhikr-celebration';
    overlay.innerHTML = `
      <div class="dhikr-celebration-bg"></div>
      <img class="dhikr-celebration-logo" src="./IMG_4074.PNG"
        onerror="this.src='./icon-192.png'" alt="WOD">
      <div class="dhikr-celebration-text">سُبْحَانَ ٱللَّٰهِ ×33</div>
      <div class="dhikr-celebration-sub">MASHALLAH — SÉRIE COMPLÈTE</div>
    `;
    overlay.addEventListener('click', () => this._hideCelebration());
    document.body.appendChild(overlay);
  },

  tap(e) {
    if (this.celebrating) return;
    this.count++;
    if (navigator.vibrate) navigator.vibrate(12);
    WOD_SOUND.dhikr();

    // Animate number
    const countEl = document.getElementById('dhikr-count');
    if (countEl) {
      countEl.textContent = this.count;
      countEl.classList.remove('bounce');
      void countEl.offsetWidth;
      countEl.classList.add('bounce');
      countEl.addEventListener('animationend', () => countEl.classList.remove('bounce'), { once: true });
    }

    // Update of33
    const of33 = document.getElementById('dhikr-of33');
    if (of33) of33.textContent = `${this.count} / 33`;

    // Arc progress
    this._updateArc();

    // Ripple
    this._spawnRipple(e);

    // Particles
    this._spawnParticles();

    // Wave
    this._spawnWave();

    // Save
    localStorage.setItem('wod_dhikr', this.count);

    // Complete at 33
    if (this.count >= this.MAX) {
      setTimeout(() => this._celebrate(), 250);
    }
  },

  _updateArc() {
    const arc = document.getElementById('dhikr-arc-fill');
    if (!arc) return;
    const pct = Math.min(this.count / this.MAX, 1);
    const circumference = 283;
    const offset = circumference - pct * circumference;
    arc.style.strokeDashoffset = offset;
  },

  _spawnRipple(e) {
    const btn = document.getElementById('dhikr-btn');
    if (!btn) return;
    const ripple = document.createElement('div');
    ripple.className = 'dhikr-ripple';
    const rect = btn.getBoundingClientRect();
    const size = 40;
    const touch = e.touches?.[0] || e;
    const x = (touch.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
    const y = (touch.clientY || rect.top + rect.height / 2) - rect.top - size / 2;
    ripple.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  },

  _spawnWave() {
    const wrap = document.getElementById('dhikr-counter-wrap');
    if (!wrap) return;
    const wave = document.createElement('div');
    wave.className = 'dhikr-wave';
    wrap.appendChild(wave);
    wave.addEventListener('animationend', () => wave.remove());
  },

  _spawnParticles() {
    const wrap = document.getElementById('dhikr-counter-wrap');
    if (!wrap) return;
    const colors = ['#d4a843','#f5c257','#fff9e0','#ffd700','#ffffff'];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'dhikr-particle';
      const angle = (i / count) * Math.PI * 2;
      const dist = 50 + Math.random() * 30;
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;
      p.style.cssText = `
        left:calc(50% - 3px); top:calc(50% - 3px);
        background:${colors[i % colors.length]};
        --px:${px}px; --py:${py}px;
        animation-duration:${0.5 + Math.random() * 0.3}s;
      `;
      wrap.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  },

  _celebrate() {
    this.celebrating = true;
    if (navigator.vibrate) navigator.vibrate([30, 60, 30, 60, 100]);
    WOD_SOUND.dhikrComplete();
    this._launchConfetti();

    const overlay = document.getElementById('dhikr-celebration');
    if (overlay) overlay.classList.add('active');

    // Auto close after 3s
    setTimeout(() => this._hideCelebration(), 3200);
  },

  _hideCelebration() {
    const overlay = document.getElementById('dhikr-celebration');
    if (overlay) overlay.classList.remove('active');
    // Reset counter
    this.count = 0;
    this.celebrating = false;
    localStorage.setItem('wod_dhikr', '0');
    const countEl = document.getElementById('dhikr-count');
    if (countEl) countEl.textContent = '0';
    const of33 = document.getElementById('dhikr-of33');
    if (of33) of33.textContent = '0 / 33';
    this._updateArc();
    document.querySelectorAll('.dhikr-confetti').forEach(c => c.remove());
  },

  _launchConfetti() {
    const colors = ['#d4a843','#f5c257','#ffd700','#fff','#f0e0a0','#c0a020'];
    for (let i = 0; i < 48; i++) {
      setTimeout(() => {
        const c = document.createElement('div');
        c.className = 'dhikr-confetti';
        const startX = 10 + Math.random() * 80;
        const dx = (Math.random() - 0.5) * 200;
        const rot = Math.random() * 720 - 360;
        c.style.cssText = `
          left:${startX}vw;
          top: 0;
          background:${colors[Math.floor(Math.random() * colors.length)]};
          --dx:${dx}px;
          --rot:${rot}deg;
          --dur:${1.5 + Math.random()}s;
          --delay:0s;
          width:${4 + Math.random() * 8}px;
          height:${4 + Math.random() * 8}px;
          border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
          opacity:${0.7 + Math.random() * 0.3};
        `;
        document.body.appendChild(c);
        c.addEventListener('animationend', () => c.remove());
      }, i * 40);
    }
  },

  reset() {
    this.count = 0;
    localStorage.setItem('wod_dhikr', '0');
    if (navigator.vibrate) navigator.vibrate(20);
    const countEl = document.getElementById('dhikr-count');
    if (countEl) { countEl.textContent = '0'; }
    const of33 = document.getElementById('dhikr-of33');
    if (of33) of33.textContent = '0 / 33';
    this._updateArc();
  },
};

window.DHIKR = DHIKR;


// ══════════════════════════════════════════════════════════════
//  COUNTER ANIMATION — animer les valeurs numériques
// ══════════════════════════════════════════════════════════════
function animateCounterEl(el, from, to, duration = 600, suffix = '') {
  if (!el) return;
  const startTime = performance.now();
  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const val = from + (to - from) * ease;
    el.textContent = val.toLocaleString('fr-FR', {
      minimumFractionDigits: suffix === ' €' ? 2 : 0,
      maximumFractionDigits: suffix === ' €' ? 2 : 0,
    }) + suffix;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Patch updateDashboard to add animations
function patchDashboard() {
  const orig = window.updateDashboard;
  if (!orig) return;
  window.updateDashboard = function(...args) {
    orig.apply(this, args);
    // Pop effect on hero amount
    setTimeout(() => {
      const heroEl = document.getElementById('hero-net');
      if (heroEl) {
        heroEl.classList.remove('counter-pop');
        void heroEl.offsetWidth;
        heroEl.classList.add('counter-pop');
      }
    }, 50);
  };
}


// ══════════════════════════════════════════════════════════════
//  SOUND HOOKS — intercept actions
// ══════════════════════════════════════════════════════════════
function hookSounds() {
  // Boutons .btn-gold → success sound
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-gold');
    if (btn) {
      WOD_SOUND.success();
      if (navigator.vibrate) navigator.vibrate([8, 10, 15]);
    }
    const fabItem = e.target.closest('.fab-item');
    if (fabItem) WOD_SOUND.click();
    const ghost = e.target.closest('.btn-ghost-sm');
    if (ghost) WOD_SOUND.click();
    const danger = e.target.closest('.btn-danger');
    if (danger) WOD_SOUND.error();
  }, true);

  // Toast → success sound
  const origToast = window.showToast;
  if (origToast) {
    window.showToast = function(msg) {
      origToast(msg);
      WOD_SOUND.success();
    };
  }

  // Goal achievement check
  const origUpdateDash = window.updateDashboard;
  if (origUpdateDash) {
    window.updateDashboard = function(...args) {
      origUpdateDash.apply(this, args);
      setTimeout(checkGoalAchieved, 100);
    };
  }
}

let _lastGoalState = { day: false, week: false, month: false };
function checkGoalAchieved() {
  const s = window.state;
  if (!s) return;
  const goals = s.goals || {};
  const gain = s.totalGain || 0;
  const now = new Date();
  // Simple daily goal check
  if (goals.day > 0) {
    const todaySessions = (s.sessions || []).filter(sess => {
      const d = new Date(sess.date || 0);
      return d.toDateString() === now.toDateString();
    });
    const todayGain = todaySessions.reduce((a, b) => a + (b.gain || 0), 0);
    const reached = todayGain >= goals.day;
    if (reached && !_lastGoalState.day) {
      WOD_SOUND.goal();
      if (navigator.vibrate) navigator.vibrate([20, 40, 80, 40, 20]);
    }
    _lastGoalState.day = reached;
  }
}


// ══════════════════════════════════════════════════════════════
//  SPLASH SOUND — jouer au démarrage
// ══════════════════════════════════════════════════════════════
function hookSplashSound() {
  const origUnlock = window.unlockApp;
  if (origUnlock) {
    window.unlockApp = function() {
      WOD_SOUND.open();
      origUnlock.apply(this, arguments);
    };
  }

  // Also play on first tap anywhere on splash
  const splash = document.getElementById('splash');
  if (splash) {
    splash.addEventListener('pointerdown', () => {
      // Wake audio context
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctx.resume();
      } catch(e) {}
    }, { once: true });
  }
}


// ══════════════════════════════════════════════════════════════
//  SPRING BUTTON FEEDBACK — touch feedback renforcé
// ══════════════════════════════════════════════════════════════
function addSpringFeedback() {
  // Add spring to FAB button
  const fab = document.getElementById('fab-btn');
  if (fab) {
    fab.addEventListener('touchstart', () => {
      fab.style.transform = 'translateX(-50%) scale(0.93)';
    }, { passive: true });
    fab.addEventListener('touchend', () => {
      fab.style.transform = '';
    }, { passive: true });
  }
}


// ══════════════════════════════════════════════════════════════
//  ANIMATED NUMBER COUNTERS
// ══════════════════════════════════════════════════════════════
function hookAnimatedCounters() {
  // Observe changes in metric values and animate them
  const targets = ['hero-net', 'm-brut', 'm-km', 'm-courses', 'dep-total'];
  targets.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const observer = new MutationObserver(() => {
      el.classList.remove('counter-pop');
      void el.offsetWidth;
      el.classList.add('counter-pop');
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
  });
}


// ══════════════════════════════════════════════════════════════
//  INIT — lancer tout après le DOM
// ══════════════════════════════════════════════════════════════
function initWODSignature() {
  injectNeonStyles();
  WOD_LOGO.injectAll();
  hookSplashSound();
  hookSounds();
  addSpringFeedback();
  hookAnimatedCounters();

  // Dhikr init after app loads
  const appEl = document.getElementById('app');
  if (appEl && !appEl.classList.contains('hidden')) {
    DHIKR.init();
  } else {
    // Wait for app to show
    const obs = new MutationObserver(() => {
      if (!document.getElementById('app').classList.contains('hidden')) {
        obs.disconnect();
        setTimeout(() => DHIKR.init(), 300);
      }
    });
    const app = document.getElementById('app');
    if (app) obs.observe(app, { attributes: true, attributeFilter: ['class'] });
  }

  // Patch dashboard for animations after app init
  setTimeout(patchDashboard, 2000);

  // Re-inject logo after dynamic content loads
  setTimeout(() => WOD_LOGO.injectAll(), 1000);
  setTimeout(() => WOD_LOGO.injectAll(), 3000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWODSignature);
} else {
  initWODSignature();
}
