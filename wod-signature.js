/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  WORLD OF DRIVER — SIGNATURE PREMIUM  v3.0                  ║
 * ║  Logo · Sons · Micro-animations · Neon LED · Dhikr Counter  ║
 * ║  + Shooting Star BG · LED Border FAB · Full Logo Replace    ║
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

  function tone(freq, type, vol, start, dur) {
    try {
      const c = getCtx();
      const osc  = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime + start);
      gain.gain.setValueAtTime(0, c.currentTime + start);
      gain.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
      osc.start(c.currentTime + start);
      osc.stop(c.currentTime + start + dur + 0.01);
    } catch(e) {}
  }

  // Accord dorés premium – légèrement harmonisés
  function chime(freqs, vols, delays, durs, type='sine') {
    freqs.forEach((f,i) => tone(f, type, vols[i]||0.08, delays[i]||0, durs[i]||0.3));
  }

  return {
    // Ouverture app — accord doré ascendant cristallin
    open() {
      // Accord majeur ascendant très doux, 5 notes
      chime(
        [220, 330, 440, 550, 660],
        [0.09,0.08,0.10,0.06,0.05],
        [0,   0.12,0.22,0.30,0.42],
        [0.30,0.28,0.38,0.50,0.60]
      );
      // Overtone shimmer subtil
      setTimeout(() => tone(1320,'sine',0.025,0,0.55), 380);
    },

    // FAB principal — cristal + shimmer
    fab() {
      tone(740,'sine',0.10,0,0.14);
      tone(987,'sine',0.07,0.06,0.18);
      tone(1109,'triangle',0.04,0.14,0.22);
      // Petit écho doré
      tone(880,'sine',0.025,0.22,0.18);
    },

    // Clic standard — très court et précis
    click() {
      tone(880,'sine',0.06,0,0.07);
      tone(1100,'sine',0.025,0.02,0.05);
    },

    // Validation — 3 notes ascendantes
    success() {
      tone(523,'sine',0.08,0,0.16);
      tone(659,'sine',0.08,0.08,0.18);
      tone(784,'sine',0.10,0.16,0.32);
    },

    // Dhikr tap — cloche subtile
    dhikr() {
      tone(1047,'sine',0.06,0,0.12);
      tone(1319,'sine',0.035,0.04,0.10);
      // Harmonique douce
      tone(2093,'sine',0.012,0.02,0.08);
    },

    // Dhikr ×33 célébration — cascade dorée montante
    dhikrComplete() {
      [523,659,784,1047,880,1175,1568,2093].forEach(
        (f,i) => tone(f,'sine',0.09,i*0.10,0.22)
      );
      // Shimmer final
      setTimeout(() => {
        tone(2637,'sine',0.04,0,0.45);
        tone(3136,'sine',0.025,0.15,0.55);
      }, 700);
    },

    // Objectif atteint
    goal() {
      tone(392,'sine',0.09,0,0.14);
      tone(523,'sine',0.09,0.10,0.18);
      tone(659,'sine',0.11,0.20,0.22);
      tone(784,'sine',0.07,0.30,0.45);
    },

    // Erreur
    error() {
      tone(200,'sawtooth',0.07,0,0.11);
      tone(160,'sawtooth',0.05,0.10,0.11);
    },
  };
})();

window.playAppleSound = () => WOD_SOUND.click();

// ══════════════════════════════════════════════════════════════
//  IMAGE LOADER — gère les formats PNG/WEBP/JPG avec fallback SVG
// ══════════════════════════════════════════════════════════════
const WOD_IMG = {
  candidates: [
    './wod-logo-text.png',
    './IMG_4076.PNG',
    './IMG_4074.PNG',
    './IMG_4074.png',
    './logo.png',
    './icon-512.png',
    './icon-192.png',
  ],
  resolved: null,

  fallbackSVG: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 80'%3E%3Ctext x='100' y='52' font-family='serif' font-size='42' font-weight='900' fill='%23d4a843' text-anchor='middle' letter-spacing='4'%3EWD%3C/text%3E%3C/svg%3E`,

  async resolve() {
    if (this.resolved) return this.resolved;
    for (const src of this.candidates) {
      const ok = await new Promise(res => {
        const img = new Image();
        img.onload = () => res(true);
        img.onerror = () => res(false);
        img.src = src;
      });
      if (ok) { this.resolved = src; return src; }
    }
    this.resolved = this.fallbackSVG;
    return this.fallbackSVG;
  },

  // Header + FAB = même logo que splash (wod-logo-text.png) mais sans fond
  async resolveIcon() {
    // On utilise exactement le même logo que le splash écran
    return await this.resolve();
  },

  async applyToAll() {
    const splashSrc = await this.resolve();
    // Header et FAB utilisent EXACTEMENT le même logo que le splash
    const iconSrc = splashSrc;

    // Splash: logo complet avec texte
    const splashEl = document.getElementById('splash-logo-img');
    if (splashEl) {
      splashEl.src = splashSrc;
      splashEl.style.objectFit = 'contain';
    }

    // FAB: même logo que splash, transparent, ajusté
    const fabEl = document.getElementById('fab-logo-img');
    if (fabEl) {
      fabEl.src = iconSrc;
      fabEl.style.width = '48px';
      fabEl.style.height = 'auto';
      fabEl.style.objectFit = 'contain';
      fabEl.style.borderRadius = '0';
      fabEl.style.background = 'transparent';
    }

    // Header: même logo que splash, plus compact
    const hdEl = document.getElementById('hd-wod-logo');
    if (hdEl) {
      hdEl.src = iconSrc;
      hdEl.style.height = '30px';
      hdEl.style.width = 'auto';
      hdEl.style.objectFit = 'contain';
      hdEl.style.borderRadius = '0';
      hdEl.style.background = 'transparent';
    }

    document.querySelectorAll('[data-wod-icon]').forEach(el => {
      el.src = iconSrc;
      el.style.borderRadius = '0';
      el.style.background = 'transparent';
    });
    document.querySelectorAll('[data-wod-logo]').forEach(el => { el.src = splashSrc; });

    ['notif-wod-logo','dhikr-celebration-logo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.src = iconSrc; el.style.borderRadius = '0'; el.style.background = 'transparent'; }
    });

    return splashSrc;
  },
};

// ══════════════════════════════════════════════════════════════
//  SHOOTING STAR BACKGROUND — traînée LED étoile filante
// ══════════════════════════════════════════════════════════════
const WOD_STARS = (() => {
  let canvas, ctx2d, raf, w, h;
  let stars = [];
  let lastSpawn = 0;
  // Intervalle aléatoire entre les étoiles filantes : 7–18 secondes
  let nextSpawn = 9000;

  function initCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 'wod-star-canvas';
    canvas.style.cssText = `
      position:fixed;inset:0;width:100%;height:100%;
      pointer-events:none;z-index:0;opacity:1;
    `;
    document.body.insertBefore(canvas, document.body.firstChild);
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    w = canvas.width  = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function spawnStar() {
    // Direction : toujours de coin supérieur-gauche vers coin inférieur-droit (± variance)
    const side = Math.random() < 0.6 ? 'top' : 'left';
    let x0, y0;
    if (side === 'top') {
      x0 = Math.random() * w * 0.7;
      y0 = -10;
    } else {
      x0 = -10;
      y0 = Math.random() * h * 0.6;
    }
    const angle   = (Math.PI / 4) + (Math.random() - 0.5) * 0.4; // ~45° ± 23°
    const speed   = 280 + Math.random() * 220;          // px/s
    const length  = 80 + Math.random() * 120;           // longueur traînée
    const life    = (w * 1.6) / speed;                  // secondes jusqu'à sortie
    const hue     = Math.random() < 0.75 ? 42 : 200;    // or ou bleu glace
    stars.push({ x: x0, y: y0, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
                 length, life, age: 0, hue, alpha: 0, peak: life*0.12 });
  }

  function draw(ts) {
    raf = requestAnimationFrame(draw);
    ctx2d.clearRect(0, 0, w, h);

    // Spawn aléatoire rare
    if (!lastSpawn) lastSpawn = ts;
    if (ts - lastSpawn > nextSpawn) {
      spawnStar();
      lastSpawn = ts;
      nextSpawn = 7000 + Math.random() * 11000; // 7–18 s
    }

    const dt = 1/60;
    stars = stars.filter(s => s.age < s.life + 0.4);

    stars.forEach(s => {
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      // Fade in / out
      const progress = s.age / s.life;
      if (progress < 0.15)      s.alpha = progress / 0.15 * 0.72;
      else if (progress < 0.75) s.alpha = 0.72;
      else                       s.alpha = (1 - (progress - 0.75) / 0.25) * 0.72;
      s.alpha = Math.max(0, Math.min(s.alpha, 0.72));

      // Traînée dégradée
      const tailX = s.x - Math.cos(Math.atan2(s.vy,s.vx)) * s.length;
      const tailY = s.y - Math.sin(Math.atan2(s.vy,s.vx)) * s.length;

      const grad = ctx2d.createLinearGradient(tailX, tailY, s.x, s.y);
      grad.addColorStop(0,   `hsla(${s.hue},85%,65%,0)`);
      grad.addColorStop(0.6, `hsla(${s.hue},90%,75%,${s.alpha * 0.4})`);
      grad.addColorStop(1,   `hsla(${s.hue},95%,90%,${s.alpha})`);

      ctx2d.save();
      ctx2d.globalCompositeOperation = 'screen';
      ctx2d.strokeStyle = grad;
      ctx2d.lineWidth   = 1.5;
      ctx2d.shadowColor = `hsla(${s.hue},90%,80%,0.6)`;
      ctx2d.shadowBlur  = 6;
      ctx2d.beginPath();
      ctx2d.moveTo(tailX, tailY);
      ctx2d.lineTo(s.x, s.y);
      ctx2d.stroke();

      // Point lumineux de tête
      ctx2d.beginPath();
      ctx2d.arc(s.x, s.y, 1.8, 0, Math.PI*2);
      ctx2d.fillStyle = `hsla(${s.hue},100%,95%,${s.alpha})`;
      ctx2d.shadowBlur = 12;
      ctx2d.fill();
      ctx2d.restore();
    });
  }

  return {
    init() {
      initCanvas();
      raf = requestAnimationFrame(draw);
    }
  };
})();

// ══════════════════════════════════════════════════════════════
//  NEON + FULL THEME STYLES — injectés en CSS
// ══════════════════════════════════════════════════════════════
function injectSignatureStyles() {
  const style = document.createElement('style');
  style.id = 'wod-signature-styles';
  style.textContent = `
    /* ══════════════════════════════════
       HEADER — logo remplace le texte
    ══════════════════════════════════ */
    .hd-name { display: none !important; }
    #hd-wod-logo {
      height: 30px; width: auto; object-fit: contain;
      filter: drop-shadow(0 0 10px rgba(212,168,67,0.85));
      display: block; border-radius: 0; background: transparent !important;
    }

    /* ══════════════════════════════════
       FAB BUTTON — logo sans le "+"
    ══════════════════════════════════ */
    .fab-plus { display: none !important; }

    /* ── FAB LOGO IMAGE ── */
    #fab-logo-img {
      width: 48px; height: auto; object-fit: contain; border-radius: 0;
      background: transparent !important;
      filter: drop-shadow(0 0 10px rgba(212,168,67,1)) brightness(1.05);
      will-change: transform, filter;
      pointer-events: none;
      transition: filter 0.25s ease;
    }

    /* ── FAB 360° SPIN ANIMATION ── */
    #fab-icon-wrap {
      will-change: transform;
      transition: transform 0.55s cubic-bezier(.34,1.56,.64,1);
    }
    .fab-btn.spinning #fab-icon-wrap {
      animation: fabSpin360 0.55s cubic-bezier(.34,1.56,.64,1) forwards;
    }
    @keyframes fabSpin360 {
      0%   { transform: rotate(0deg)   scale(1);    }
      40%  { transform: rotate(200deg) scale(1.18); }
      70%  { transform: rotate(340deg) scale(1.15); }
      85%  { transform: rotate(375deg) scale(1.05); }
      100% { transform: rotate(360deg) scale(1);    }
    }

    /* FAB OPEN STATE */
    .fab-btn.open #fab-logo-img {
      filter: drop-shadow(0 0 18px rgba(212,168,67,1)) brightness(1.25);
    }
    .fab-btn.open { background: linear-gradient(145deg,#c8360d,#8b0000) !important; }

    /* FAB NEON PULSE */
    .fab-btn {
      animation: fabNeonPulse 2.8s ease-in-out infinite !important;
    }
    @keyframes fabNeonPulse {
      0%,100% { box-shadow: 0 0 0 8px rgba(212,168,67,0.12), 0 0 40px rgba(212,168,67,0.5), 0 8px 30px rgba(0,0,0,0.5); }
      50%      { box-shadow: 0 0 0 14px rgba(212,168,67,0.07), 0 0 65px rgba(212,168,67,0.75), 0 8px 40px rgba(0,0,0,0.6); }
    }
    .fab-btn:active { transform: translateX(-50%) scale(0.90) !important; animation: none !important; }

    /* ══════════════════════════════════
       FAB ITEMS — SUPPRESSION DES DOTS
       + LED BORDER PREMIUM SUR ICO
    ══════════════════════════════════ */

    /* Cacher les anciens dots */
    .fab-neon-dot { display: none !important; }

    /* Conteneur icône — position relative pour le LED sweep */
    .fab-item-ico {
      position: relative;
      overflow: visible !important;
      isolation: isolate;
    }

    /* Pseudo-élément LED border — statique, pas d'animation de rotation */
    .fab-item-ico::before {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 15px;
      background: transparent;
      border: 1.5px solid rgba(212,168,67,0.35);
      box-shadow: 0 0 6px rgba(212,168,67,0.2);
      z-index: 0;
      pointer-events: none;
      /* animation: ledSweep désactivée */
    }

    /* Masque pour n'afficher que le contour */
    .fab-item-ico::after {
      content: '';
      position: absolute;
      inset: 1.5px;
      border-radius: 13px;
      background: var(--bg3, #111827);
      z-index: 1;
      pointer-events: none;
    }

    /* L'icône SVG passe au-dessus des pseudo-éléments */
    .fab-item-ico > svg,
    .fab-item-ico > img {
      position: relative;
      z-index: 2;
    }

    @keyframes ledSweep {
      from { --led-angle: 0deg; }
      to   { --led-angle: 360deg; }
    }

    /* Halo lumineux externe sur le cadre icône */
    .fab-item-ico {
      box-shadow: 0 0 8px rgba(212,168,67,0.15);
      transition: box-shadow 0.3s ease;
    }
    .fab-item:hover .fab-item-ico {
      box-shadow: 0 0 18px rgba(212,168,67,0.45), 0 0 6px rgba(245,194,87,0.3);
    }
    .fab-item:active .fab-item-ico {
      box-shadow: 0 0 24px rgba(212,168,67,0.7), inset 0 0 8px rgba(212,168,67,0.15) !important;
    }

    /* Stagger LED désactivé */

    /* Support @property conservé pour compatibilité future */

    /* Support @property pour conic-gradient animé (Chrome/Edge) */
    @property --led-angle {
      syntax: '<angle>';
      initial-value: 0deg;
      inherits: false;
    }

    /* Fallback Firefox — border statique */
    @supports not (background: conic-gradient(from 0deg, red, blue)) {
      .fab-item-ico::before {
        background: none;
        border: 1.5px solid rgba(212,168,67,0.35);
      }
    }
    }

    /* Neon border sweep on active fab-item (outer) */
    .fab-item::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 14px;
      border: 1px solid transparent;
      background: linear-gradient(135deg, rgba(212,168,67,0.35), transparent 50%, rgba(212,168,67,0.15)) border-box;
      -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: destination-out;
      mask-composite: exclude;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }
    .fab-item:hover::after  { opacity: 0.6; }
    .fab-item:active { color: var(--gold) !important; }
    .fab-item:active::after { opacity: 1; }

    /* ══════════════════════════════════
       HERO CARD — neon pulsant
    ══════════════════════════════════ */
    .hero-card {
      animation: heroBreath 4.5s ease-in-out infinite !important;
    }
    @keyframes heroBreath {
      0%,100% { box-shadow: 0 8px 48px rgba(212,168,67,0.18), inset 0 1px 0 rgba(255,255,255,.04), 0 0 0 0 transparent; }
      50%      { box-shadow: 0 8px 60px rgba(212,168,67,0.30), inset 0 1px 0 rgba(255,255,255,.06), 0 0 80px rgba(212,168,67,0.12); }
    }

    /* ══════════════════════════════════
       CARDS — neon hover léger
    ══════════════════════════════════ */
    .card {
      transition: box-shadow 0.3s ease, border-color 0.3s ease !important;
    }
    .card:hover {
      box-shadow: 0 6px 28px rgba(0,0,0,0.35), 0 0 20px rgba(212,168,67,0.10) !important;
      border-color: rgba(212,168,67,0.20) !important;
    }

    /* ══════════════════════════════════
       METRIC TILES
    ══════════════════════════════════ */
    .mtile {
      position: relative; overflow: hidden;
      transition: transform 0.18s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s ease !important;
    }
    .mtile::before {
      content: ''; position: absolute; inset: 0; border-radius: inherit;
      background: radial-gradient(ellipse at 50% 0%, rgba(212,168,67,0.07), transparent 65%);
      pointer-events: none; opacity: 0; transition: opacity 0.3s;
    }
    .mtile:hover::before { opacity: 1; }
    .mtile:active { transform: scale(0.92) !important; box-shadow: 0 0 18px rgba(212,168,67,0.25) !important; }

    /* ══════════════════════════════════
       PROGRESS BARS — glow
    ══════════════════════════════════ */
    .progress-bar {
      box-shadow: 0 0 8px rgba(212,168,67,0.55) !important;
    }

    /* ══════════════════════════════════
       BUTTONS — spring + neon
    ══════════════════════════════════ */
    .btn-gold {
      transition: transform 0.18s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s ease !important;
    }
    .btn-gold:hover  { box-shadow: 0 6px 28px rgba(212,168,67,0.55) !important; }
    .btn-gold:active { transform: scale(0.93) !important; }

    .btn-ghost-sm:active { transform: scale(0.91) !important; color: var(--gold) !important; }

    .fab-item {
      transition: transform 0.22s cubic-bezier(.34,1.56,.64,1), background 0.2s, color 0.2s !important;
      position: relative; overflow: hidden;
    }
    .fab-item:active { transform: scale(0.86) !important; }

    /* ══════════════════════════════════
       SCREEN TRANSITIONS
    ══════════════════════════════════ */
    .screen {
      transition: opacity 0.32s cubic-bezier(.4,0,.2,1), transform 0.32s cubic-bezier(.4,0,.2,1) !important;
    }
    .screen.active    { opacity: 1 !important; transform: translateY(0) !important; }
    .screen:not(.active) { opacity: 0 !important; transform: translateY(10px) !important; }

    /* ══════════════════════════════════
       COUNTER ANIMATIONS
    ══════════════════════════════════ */
    .counter-pop { animation: cntPop 0.38s cubic-bezier(.34,1.56,.64,1) !important; }
    @keyframes cntPop {
      0%  { transform: scale(1); }
      40% { transform: scale(1.18); color: var(--gold2); }
      100%{ transform: scale(1); }
    }

    /* ══════════════════════════════════
       INPUT FOCUS NEON
    ══════════════════════════════════ */
    .fi:focus {
      box-shadow: 0 0 0 2px rgba(212,168,67,0.28), 0 0 14px rgba(212,168,67,0.12) !important;
    }

    /* ══════════════════════════════════
       PROFIL AVATAR
    ══════════════════════════════════ */
    .p-avatar {
      box-shadow: 0 0 24px rgba(212,168,67,0.35), 0 0 0 4px rgba(212,168,67,0.08) !important;
      transition: box-shadow 0.3s ease !important;
    }
    .p-avatar:hover {
      box-shadow: 0 0 40px rgba(212,168,67,0.65), 0 0 0 8px rgba(212,168,67,0.12) !important;
    }

    /* ══════════════════════════════════
       SPLASH LOGO ANIMATION
    ══════════════════════════════════ */
    .splash-logo.ready { filter: drop-shadow(0 0 35px rgba(212,168,67,0.9)); }
    #splash-logo-img {
      filter: drop-shadow(0 0 30px rgba(212,168,67,0.85)) !important;
      border-radius: 0 !important; border: none !important;
      background: transparent !important; box-shadow: none !important;
    }

    /* ══════════════════════════════════
       GPS PILL
    ══════════════════════════════════ */
    .gps-pill.active { box-shadow: 0 0 12px rgba(45,212,160,0.4) !important; }

    /* ══════════════════════════════════
       IA CARD GLOW
    ══════════════════════════════════ */
    .ia-card:hover {
      box-shadow: 0 4px 30px rgba(0,0,0,0.4), 0 0 35px rgba(212,168,67,0.10) !important;
    }

    /* ══════════════════════════════════
       NOTIF CENTER — header logo
    ══════════════════════════════════ */
    .notif-hd-logo {
      width: 22px; height: 22px; object-fit: contain; border-radius: 0;
      background: transparent; margin-right: 7px; flex-shrink: 0;
      filter: drop-shadow(0 0 4px rgba(212,168,67,0.6));
    }
    .notif-item { animation: notifIn 0.28s cubic-bezier(.34,1.2,.64,1) both; }
    @keyframes notifIn {
      from { transform: translateX(10px); opacity: 0; }
      to   { transform: translateX(0); opacity: 1; }
    }

    /* ══════════════════════════════════
       RUSH HERO CARD
    ══════════════════════════════════ */
    .rush-hero {
      border-color: rgba(212,168,67,0.18) !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3), 0 0 30px rgba(212,168,67,0.07) !important;
    }

    /* ══════════════════════════════════
       POI ITEMS
    ══════════════════════════════════ */
    .poi-item:hover {
      border-color: rgba(212,168,67,0.2) !important;
      box-shadow: 0 0 14px rgba(212,168,67,0.08) !important;
    }

    /* ══════════════════════════════════
       METEO CARD NEON
    ══════════════════════════════════ */
    .meteo-card { position: relative; }
    .meteo-temp { text-shadow: 0 0 20px rgba(212,168,67,0.5) !important; }

    /* ══════════════════════════════════
       ACCORDIONS
    ══════════════════════════════════ */
    .accordion-card:hover {
      border-color: rgba(212,168,67,0.18) !important;
    }

    /* ══════════════════════════════════
       TOAST — spring
    ══════════════════════════════════ */
    #toast {
      transition: opacity 0.32s cubic-bezier(.4,0,.2,1) !important;
      box-shadow: 0 4px 24px rgba(212,168,67,0.5) !important;
    }

    /* ══════════════════════════════════
       DHIKR WIDGET
    ══════════════════════════════════ */
    .dhikr-card {
      background: linear-gradient(145deg, #0e0a00, #110d02, #0a0f1a);
      border: 1px solid rgba(212,168,67,0.25);
      border-radius: 24px; padding: 20px; margin-bottom: 12px;
      position: relative; overflow: hidden;
      box-shadow: 0 6px 32px rgba(0,0,0,0.4), 0 0 40px rgba(212,168,67,0.07);
      animation: dhikrCardBreath 5s ease-in-out infinite;
    }
    @keyframes dhikrCardBreath {
      0%,100% { box-shadow: 0 6px 32px rgba(0,0,0,0.4), 0 0 30px rgba(212,168,67,0.07); }
      50%      { box-shadow: 0 6px 40px rgba(0,0,0,0.45), 0 0 50px rgba(212,168,67,0.14); }
    }
    .dhikr-card::before {
      content: ''; position: absolute; top: -60px; right: -60px;
      width: 200px; height: 200px; border-radius: 50%;
      background: radial-gradient(circle, rgba(212,168,67,0.1), transparent 65%);
      pointer-events: none;
    }
    .dhikr-title-row {
      display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
    }
    .dhikr-icon {
      width: 28px; height: 28px; border-radius: 8px;
      background: linear-gradient(145deg,#2a1e00,#1a1200);
      border: 1px solid rgba(212,168,67,0.3);
      display: flex; align-items: center; justify-content: center; font-size: 14px;
      box-shadow: 0 0 10px rgba(212,168,67,0.25);
    }
    .dhikr-title {
      font-size: .82rem; font-weight: 700; color: var(--text); letter-spacing: .02em;
    }
    .dhikr-subtitle {
      font-size: .58rem; color: var(--gold); letter-spacing: .15em; opacity: .75; margin-left: auto;
    }
    .dhikr-counter-wrap {
      position: relative; display: flex; align-items: center;
      justify-content: center; margin: 6px 0 14px;
    }
    .dhikr-arc-svg {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%); pointer-events: none;
    }
    .dhikr-arc-bg  { fill:none; stroke:rgba(212,168,67,0.12); stroke-width:3.5; stroke-linecap:round; }
    .dhikr-arc-fill {
      fill: none; stroke: url(#dhikrGrad); stroke-width: 3.5; stroke-linecap: round;
      stroke-dasharray: 283; stroke-dashoffset: 283;
      transition: stroke-dashoffset 0.42s cubic-bezier(.4,0,.2,1);
      filter: drop-shadow(0 0 5px rgba(212,168,67,0.85));
    }
    .dhikr-btn {
      width: 104px; height: 104px; border-radius: 50%;
      border: 2px solid rgba(212,168,67,0.35);
      background: radial-gradient(circle at 40% 35%, rgba(212,168,67,0.16), rgba(10,10,20,0.92));
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      position: relative;
      transition: transform 0.18s cubic-bezier(.34,1.56,.64,1), border-color 0.15s;
      box-shadow: 0 0 32px rgba(212,168,67,0.18), inset 0 1px 0 rgba(255,255,255,0.05);
      outline: none; -webkit-tap-highlight-color: transparent; z-index: 1;
    }
    .dhikr-btn:active { transform: scale(0.87) !important; border-color: rgba(212,168,67,0.85) !important; }
    .dhikr-count {
      font-family: 'Cinzel', serif; font-size: 2.5rem; font-weight: 700;
      color: var(--gold2); line-height: 1;
      text-shadow: 0 0 22px rgba(245,194,87,0.55); user-select: none; pointer-events: none;
    }
    .dhikr-count.bounce { animation: dhikrBounce 0.36s cubic-bezier(.34,1.56,.64,1); }
    @keyframes dhikrBounce {
      0%  { transform: scale(1); }
      35% { transform: scale(1.42); color: #fff; text-shadow: 0 0 30px rgba(212,168,67,1); }
      65% { transform: scale(0.95); }
      100%{ transform: scale(1); }
    }
    .dhikr-ripple {
      position: absolute; border-radius: 50%;
      background: rgba(212,168,67,0.38); pointer-events: none;
      transform: scale(0); animation: dhikrRipple 0.55s ease-out forwards;
    }
    @keyframes dhikrRipple { to { transform: scale(4); opacity: 0; } }
    .dhikr-wave {
      position: absolute; top: 50%; left: 50%;
      width: 104px; height: 104px; border-radius: 50%;
      border: 2px solid rgba(212,168,67,0.55);
      transform: translate(-50%, -50%) scale(1); opacity: 0;
      pointer-events: none; animation: dhikrWave 0.65s ease-out forwards;
    }
    @keyframes dhikrWave { to { transform: translate(-50%,-50%) scale(2.4); opacity: 0; } }
    .dhikr-info-row {
      display: flex; align-items: center; justify-content: space-between; margin-top: 2px;
    }
    .dhikr-label { font-size: .6rem; color: var(--text2); letter-spacing: .08em; text-transform: uppercase; }
    .dhikr-of33  { font-size: .72rem; font-weight: 700; color: var(--gold); font-variant-numeric: tabular-nums; }
    .dhikr-reset-btn {
      background: rgba(255,255,255,0.04); border: 1px solid var(--border2);
      border-radius: 8px; color: var(--text2); font-size: .62rem;
      padding: 5px 10px; cursor: pointer; transition: all 0.2s;
      font-family: 'DM Sans', sans-serif;
    }
    .dhikr-reset-btn:active { transform: scale(0.92); color: var(--gold); }
    .dhikr-particle {
      position: absolute; width: 6px; height: 6px; border-radius: 50%;
      pointer-events: none; animation: dhikrParticle 0.75s ease-out forwards;
    }
    @keyframes dhikrParticle {
      0%   { transform: translate(0,0) scale(1); opacity: 1; }
      100% { transform: translate(var(--px),var(--py)) scale(0); opacity: 0; }
    }

    /* CÉLÉBRATION */
    .dhikr-celebration {
      position: fixed; inset: 0; z-index: 9990;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      pointer-events: none; opacity: 0; transition: opacity 0.3s ease;
    }
    .dhikr-celebration.active { opacity: 1; pointer-events: auto; }
    .dhikr-celebration-bg {
      position: absolute; inset: 0;
      background: radial-gradient(circle at 50% 45%, rgba(212,168,67,0.28), rgba(8,12,20,0.96));
    }
    .dhikr-celebration-logo {
      position: relative; z-index: 1; width: 200px; height: auto;
      object-fit: contain; border-radius: 0; background: transparent !important;
      filter: drop-shadow(0 0 50px rgba(212,168,67,1));
      animation: celebLogo 1.5s ease-in-out;
    }
    @keyframes celebLogo {
      0%   { transform: scale(0.2) rotate(-20deg); opacity: 0; }
      30%  { transform: scale(1.18) rotate(3deg); opacity: 1; }
      60%  { transform: scale(0.96) rotate(-1deg); }
      100% { transform: scale(1) rotate(0); opacity: 1; }
    }
    .dhikr-celebration-text {
      position: relative; z-index: 1;
      font-family: 'Cinzel', serif; font-size: 1.5rem; font-weight: 900;
      color: var(--gold2); text-shadow: 0 0 40px rgba(212,168,67,0.9);
      text-align: center; margin-top: 22px;
      animation: celebSlide 0.6s cubic-bezier(.34,1.56,.64,1) 0.3s both;
    }
    .dhikr-celebration-sub {
      position: relative; z-index: 1;
      font-size: .72rem; font-weight: 700; color: rgba(212,168,67,0.75);
      letter-spacing: .22em; text-align: center; margin-top: 7px;
      animation: celebSlide 0.6s cubic-bezier(.34,1.56,.64,1) 0.5s both;
    }
    @keyframes celebSlide { from { transform: translateY(22px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .dhikr-confetti {
      position: fixed; pointer-events: none;
      animation: confettiFall var(--dur) ease-in var(--delay) forwards; z-index: 9991;
    }
    @keyframes confettiFall {
      0%   { transform: translate(0,-20px) rotate(0deg); opacity: 1; }
      100% { transform: translate(var(--dx), 110vh) rotate(var(--rot)); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// ══════════════════════════════════════════════════════════════
//  HEADER — injecter logo WOD à la place du texte
// ══════════════════════════════════════════════════════════════
function patchHeader() {
  const hdLeft = document.querySelector('.hd-left');
  if (!hdLeft) return;

  const existingImg = hdLeft.querySelector('img');
  if (existingImg) existingImg.id = 'hd-wod-logo-small';

  const hdTitles = hdLeft.querySelector('.hd-titles');
  if (hdTitles && !document.getElementById('hd-wod-logo')) {
    const logoImg = document.createElement('img');
    logoImg.id = 'hd-wod-logo';
    logoImg.alt = 'WORLD OF DRIVER';
    logoImg.setAttribute('data-wod-logo', '1');
    logoImg.style.cssText = 'height:30px;width:auto;object-fit:contain;filter:drop-shadow(0 0 10px rgba(212,168,67,0.85));display:block;border-radius:0;background:transparent;';
    const sub = hdTitles.querySelector('.hd-sub');
    hdTitles.insertBefore(logoImg, sub || hdTitles.firstChild);

    const nameSpan = hdTitles.querySelector('.hd-name');
    if (nameSpan) nameSpan.style.display = 'none';
  }

  // Patch notif center header
  const notifHd = document.querySelector('.notif-hd');
  if (notifHd && !document.getElementById('notif-wod-logo')) {
    const logo = document.createElement('img');
    logo.id = 'notif-wod-logo';
    logo.className = 'notif-hd-logo';
    logo.setAttribute('data-wod-logo', '1');
    logo.alt = 'WOD';
    notifHd.insertBefore(logo, notifHd.firstChild);
  }
}

// ══════════════════════════════════════════════════════════════
//  FAB — son au clic
// ══════════════════════════════════════════════════════════════
function hookFABSound() {
  const origToggle = window.toggleFAB;
  if (origToggle) {
    window.toggleFAB = function() {
      WOD_SOUND.fab();
      if (navigator.vibrate) navigator.vibrate([10, 15, 25]);

      const fabBtn = document.getElementById('fab-btn');
      if (fabBtn) {
        fabBtn.classList.remove('spinning');
        void fabBtn.offsetWidth;
        fabBtn.classList.add('spinning');
        fabBtn.addEventListener('animationend', function onEnd(e) {
          if (e.animationName === 'fabSpin360') {
            fabBtn.classList.remove('spinning');
            fabBtn.removeEventListener('animationend', onEnd);
          }
        });
      }

      origToggle.apply(this, arguments);
    };
  }
}

// ══════════════════════════════════════════════════════════════
//  SOUND HOOKS
// ══════════════════════════════════════════════════════════════
function hookSounds() {
  document.addEventListener('click', e => {
    if (e.target.closest('.btn-gold'))       { WOD_SOUND.success(); if(navigator.vibrate) navigator.vibrate([8,10,18]); }
    else if (e.target.closest('.fab-item'))   WOD_SOUND.click();
    else if (e.target.closest('.btn-ghost-sm')) WOD_SOUND.click();
    else if (e.target.closest('.btn-danger'))   WOD_SOUND.error();
    else if (e.target.closest('.dep-cat'))      WOD_SOUND.click();
    else if (e.target.closest('.poi-btn'))      WOD_SOUND.click();
    else if (e.target.closest('.theme-btn'))    WOD_SOUND.click();
    else if (e.target.closest('.acc-hd'))       WOD_SOUND.click();
    else if (e.target.closest('.modal-close'))  WOD_SOUND.click();
  }, true);

  const origToast = window.showToast;
  if (origToast) {
    window.showToast = function(msg) {
      origToast.apply(this, arguments);
      WOD_SOUND.success();
    };
  }
}

// ══════════════════════════════════════════════════════════════
//  SPLASH SOUND
// ══════════════════════════════════════════════════════════════
function hookSplashSound() {
  document.addEventListener('pointerdown', () => {
    try { new (window.AudioContext||window.webkitAudioContext)().resume(); } catch(e) {}
  }, { once: true });

  const origUnlock = window.unlockApp;
  if (origUnlock) {
    window.unlockApp = function() {
      WOD_SOUND.open();
      origUnlock.apply(this, arguments);
    };
  }
}

// ══════════════════════════════════════════════════════════════
//  ANIMATED COUNTERS
// ══════════════════════════════════════════════════════════════
function hookAnimatedCounters() {
  ['hero-net','m-brut','m-km','m-courses','dep-total','c-net'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    new MutationObserver(() => {
      el.classList.remove('counter-pop');
      void el.offsetWidth;
      el.classList.add('counter-pop');
    }).observe(el, { childList:true, subtree:true, characterData:true });
  });
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
    this._updateArc();
  },

  _injectWidget() {
    if (document.getElementById('dhikr-widget')) return;
    // Widget Dhikr injecté dans screen-muslim (par wod-muslim.js)
    const muslimScroll = document.querySelector('#screen-muslim .screen-scroll');
    if (!muslimScroll) {
      // Retry si le screen muslim n'est pas encore injecté
      setTimeout(() => this._injectWidget(), 500);
      return;
    }

    const widget = document.createElement('div');
    widget.id = 'dhikr-widget';
    widget.className = 'dhikr-card';
    widget.innerHTML = `
      <div class="dhikr-title-row">
        <div class="dhikr-icon">☽</div>
        <span class="dhikr-title">Dhikr</span>
        <span class="dhikr-subtitle">COMPTEUR · 33</span>
      </div>
      <div class="dhikr-counter-wrap" id="dhikr-counter-wrap">
        <svg class="dhikr-arc-svg" width="130" height="130" viewBox="0 0 130 130">
          <defs>
            <linearGradient id="dhikrGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#d4a843"/>
              <stop offset="100%" style="stop-color:#f5c257"/>
            </linearGradient>
          </defs>
          <circle class="dhikr-arc-bg"   cx="65" cy="65" r="45" transform="rotate(-90 65 65)"/>
          <circle class="dhikr-arc-fill" cx="65" cy="65" r="45" id="dhikr-arc-fill" transform="rotate(-90 65 65)"/>
        </svg>
        <button class="dhikr-btn" id="dhikr-btn" onclick="DHIKR.tap(event)" ontouchstart="">
          <span class="dhikr-count" id="dhikr-count">${this.count}</span>
        </button>
      </div>
      <div class="dhikr-info-row">
        <span class="dhikr-label">Appuyer pour compter</span>
        <span class="dhikr-of33" id="dhikr-of33">${this.count} / 33</span>
        <button class="dhikr-reset-btn" onclick="DHIKR.reset()">↺ Reset</button>
      </div>
    `;

    // Insérer le widget Dhikr en haut de l'onglet Muslim (après bismi)
    const bismi = muslimScroll.querySelector('.msl-bismi');
    if (bismi) bismi.insertAdjacentElement('afterend', widget);
    else muslimScroll.insertBefore(widget, muslimScroll.firstChild);
  },

  _injectCelebration() {
    if (document.getElementById('dhikr-celebration')) return;
    const div = document.createElement('div');
    div.id = 'dhikr-celebration';
    div.className = 'dhikr-celebration';
    div.innerHTML = `
      <div class="dhikr-celebration-bg"></div>
      <img class="dhikr-celebration-logo" id="dhikr-celebration-logo"
        data-wod-logo="1" alt="WOD" src="./wod-logo-text.png">
      <div class="dhikr-celebration-text">سُبْحَانَ ٱللَّٰهِ × 33</div>
      <div class="dhikr-celebration-sub">MASHALLAH — SÉRIE COMPLÈTE</div>
    `;
    div.addEventListener('click', () => this._hideCelebration());
    document.body.appendChild(div);
    WOD_IMG.applyToAll();
  },

  tap(e) {
    if (this.celebrating) return;
    this.count++;
    if (navigator.vibrate) navigator.vibrate(12);
    WOD_SOUND.dhikr();

    const countEl = document.getElementById('dhikr-count');
    if (countEl) {
      countEl.textContent = this.count;
      countEl.classList.remove('bounce');
      void countEl.offsetWidth;
      countEl.classList.add('bounce');
    }
    const of33 = document.getElementById('dhikr-of33');
    if (of33) of33.textContent = `${this.count} / 33`;

    this._updateArc();
    this._spawnRipple(e);
    this._spawnParticles();
    this._spawnWave();
    localStorage.setItem('wod_dhikr', this.count);

    if (this.count >= this.MAX) setTimeout(() => this._celebrate(), 260);
  },

  _updateArc() {
    const arc = document.getElementById('dhikr-arc-fill');
    if (!arc) return;
    arc.style.strokeDashoffset = 283 - Math.min(this.count / this.MAX, 1) * 283;
  },

  _spawnRipple(e) {
    const btn = document.getElementById('dhikr-btn');
    if (!btn) return;
    const r = document.createElement('div');
    r.className = 'dhikr-ripple';
    const rect = btn.getBoundingClientRect();
    const t = e.touches?.[0] || e;
    const x = ((t.clientX||rect.left+rect.width/2) - rect.left) - 20;
    const y = ((t.clientY||rect.top+rect.height/2) - rect.top) - 20;
    r.style.cssText = `left:${x}px;top:${y}px;width:40px;height:40px;`;
    btn.appendChild(r);
    r.addEventListener('animationend', () => r.remove());
  },

  _spawnWave() {
    const wrap = document.getElementById('dhikr-counter-wrap');
    if (!wrap) return;
    const w = document.createElement('div');
    w.className = 'dhikr-wave';
    wrap.appendChild(w);
    w.addEventListener('animationend', () => w.remove());
  },

  _spawnParticles() {
    const wrap = document.getElementById('dhikr-counter-wrap');
    if (!wrap) return;
    const colors = ['#d4a843','#f5c257','#fff9e0','#ffd700','#ffffff'];
    for (let i = 0; i < 9; i++) {
      const p = document.createElement('div');
      p.className = 'dhikr-particle';
      const angle = (i / 9) * Math.PI * 2;
      const dist = 52 + Math.random() * 28;
      p.style.cssText = `left:calc(50% - 3px);top:calc(50% - 3px);
        background:${colors[i % colors.length]};
        --px:${Math.cos(angle)*dist}px;--py:${Math.sin(angle)*dist}px;
        animation-duration:${0.45+Math.random()*0.35}s;`;
      wrap.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  },

  _celebrate() {
    this.celebrating = true;
    if (navigator.vibrate) navigator.vibrate([30,60,30,60,100]);
    WOD_SOUND.dhikrComplete();
    this._launchConfetti();
    const ov = document.getElementById('dhikr-celebration');
    if (ov) ov.classList.add('active');
    setTimeout(() => this._hideCelebration(), 3500);
  },

  _hideCelebration() {
    const ov = document.getElementById('dhikr-celebration');
    if (ov) ov.classList.remove('active');
    this.count = 0; this.celebrating = false;
    localStorage.setItem('wod_dhikr', '0');
    const c = document.getElementById('dhikr-count');
    if (c) c.textContent = '0';
    const o = document.getElementById('dhikr-of33');
    if (o) o.textContent = '0 / 33';
    this._updateArc();
    document.querySelectorAll('.dhikr-confetti').forEach(x => x.remove());
  },

  _launchConfetti() {
    const colors = ['#d4a843','#f5c257','#ffd700','#fff','#f0e0a0','#c8a030'];
    for (let i = 0; i < 52; i++) {
      setTimeout(() => {
        const c = document.createElement('div');
        c.className = 'dhikr-confetti';
        c.style.cssText = `
          left:${10+Math.random()*80}vw; top:0;
          width:${4+Math.random()*7}px; height:${4+Math.random()*7}px;
          background:${colors[i%colors.length]};
          border-radius:${Math.random()>.5?'50%':'2px'};
          opacity:${0.7+Math.random()*0.3};
          --dx:${(Math.random()-.5)*200}px;
          --rot:${Math.random()*720-360}deg;
          --dur:${1.4+Math.random()}s; --delay:0s;`;
        document.body.appendChild(c);
        c.addEventListener('animationend', () => c.remove());
      }, i * 38);
    }
  },

  reset() {
    this.count = 0;
    localStorage.setItem('wod_dhikr','0');
    if (navigator.vibrate) navigator.vibrate(18);
    WOD_SOUND.click();
    const c = document.getElementById('dhikr-count');
    if (c) c.textContent = '0';
    const o = document.getElementById('dhikr-of33');
    if (o) o.textContent = '0 / 33';
    this._updateArc();
  },
};
window.DHIKR = DHIKR;

// ══════════════════════════════════════════════════════════════
//  INIT PRINCIPAL
// ══════════════════════════════════════════════════════════════
async function initWODSignature() {
  injectSignatureStyles();
  patchHeader();
  hookSplashSound();
  hookFABSound();
  hookSounds();

  // Shooting star background
  WOD_STARS.init();

  // Résoudre le logo et l'appliquer partout
  const src = await WOD_IMG.resolve();
  console.log('[WOD] Logo résolu :', src);

  // Header + FAB = même logo que splash (wod-logo-text.png)
  const splashEl = document.getElementById('splash-logo-img');
  if (splashEl) {
    splashEl.src = src;
    splashEl.style.borderRadius = '0';
    splashEl.style.objectFit   = 'contain';
    splashEl.style.background  = 'transparent';
    splashEl.style.border      = 'none';
  }

  // FAB — même logo, taille adaptée
  const fabEl = document.getElementById('fab-logo-img');
  if (fabEl) {
    fabEl.src = src;
    fabEl.style.borderRadius = '0';
    fabEl.style.background   = 'transparent';
    fabEl.style.width        = '48px';
    fabEl.style.height       = 'auto';
  }

  // Header
  const hdEl = document.getElementById('hd-wod-logo');
  if (hdEl) {
    hdEl.src = src;
    hdEl.style.background = 'transparent';
    hdEl.style.borderRadius = '0';
  }

  document.querySelectorAll('[data-wod-icon],[data-wod-logo]').forEach(el => {
    el.src = src;
    el.style.borderRadius = '0';
    el.style.background = 'transparent';
  });

  // Dhikr — attendre que l'app soit visible ET que screen-muslim soit injecté
  const tryInitDhikr = () => {
    const appVisible = !document.getElementById('app')?.classList.contains('hidden');
    const muslimExists = !!document.getElementById('screen-muslim');

    if (appVisible && muslimExists) {
      setTimeout(() => { DHIKR.init(); WOD_IMG.applyToAll(); }, 200);
    } else if (!appVisible) {
      // Attendre que l'app soit visible
      const obs = new MutationObserver(() => {
        if (!document.getElementById('app')?.classList.contains('hidden')) {
          obs.disconnect();
          // screen-muslim peut ne pas encore exister → attendre encore
          const waitMuslim = setInterval(() => {
            if (document.getElementById('screen-muslim')) {
              clearInterval(waitMuslim);
              setTimeout(() => { DHIKR.init(); WOD_IMG.applyToAll(); }, 200);
            }
          }, 150);
          // Timeout sécurité 5s
          setTimeout(() => clearInterval(waitMuslim), 5000);
        }
      });
      const app = document.getElementById('app');
      if (app) obs.observe(app, { attributes:true, attributeFilter:['class'] });
    } else {
      // App visible mais screen-muslim pas encore là — attendre
      const waitMuslim = setInterval(() => {
        if (document.getElementById('screen-muslim')) {
          clearInterval(waitMuslim);
          setTimeout(() => { DHIKR.init(); WOD_IMG.applyToAll(); }, 200);
        }
      }, 150);
      setTimeout(() => clearInterval(waitMuslim), 5000);
    }
  };
  tryInitDhikr();

  setTimeout(hookAnimatedCounters, 2500);
  setTimeout(() => WOD_IMG.applyToAll(), 2000);
  setTimeout(() => WOD_IMG.applyToAll(), 5000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWODSignature);
} else {
  initWODSignature();
}
