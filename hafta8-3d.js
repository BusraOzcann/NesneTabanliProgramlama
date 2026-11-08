/* =========================================================================
   8. HAFTA — Kronos Ajansı: 3D dünya (Three.js r128, cdnjs)
   Öğrencinin nesnelerinden low-poly 3D sahne üretir. Hazır model dosyası yok:
   her yapı/canlı, sınıf adına (ya da atasının adına) göre ilkel şekillerden
   kurulur; boyutu, malzemesi, ışığı ve hareketi nesnenin değerlerinden gelir.
     · preview: tek çağ (ya da atölye), kendiliğinden döner, fareyle çevrilir
     · tour   : tüm çağlar zaman çizgisi boyunca adalar; köprüler ve portallar.
                İki mod: 'walk' (WASD + fare, birinci şahıs) ve 'orbit' (sürükle-çevir).
   Açık renk kuralı: gece bile açık lavanta / alacakaranlık tonlarında.
   ========================================================================= */
window.H8World = (function () {
  'use strict';

  const URL3 = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  let libP = null, T3 = null;
  function load() {
    if (window.THREE) { T3 = window.THREE; return Promise.resolve(T3); }
    if (libP) return libP;
    libP = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = URL3; s.async = true;
      s.onload = () => { T3 = window.THREE; T3 ? res(T3) : rej(new Error('three yok')); };
      s.onerror = () => { libP = null; s.remove(); rej(new Error('3D kütüphanesi yüklenemedi')); };
      document.head.appendChild(s);
    });
    return libP;
  }
  function webglOk() {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (_) { return false; }
  }

  /* ---------------- katalog: gökyüzü, zemin, hava, malzeme ---------------- */
  const SKY = {
    GUNDUZ: ['#6EC6FF', '#E8F6FF'], GUN_BATIMI: ['#FF9A6B', '#FFE2B8'], SAFAK: ['#F7B6D2', '#FFF0D9'],
    ALACAKARANLIK: ['#9C8CE0', '#FFD2C2'], YILDIZLI: ['#8C86DE', '#E2DEFF'], AURORA: ['#7FD8C9', '#E7F7FF'],
    KIZIL: ['#E58C6B', '#FFD9C2'], PEMBE_BULUT: ['#FFB3D9', '#FFF0F7'], SISLI: ['#C9D3DB', '#F2F5F7'], GOKKUSAGI: ['#8FD3FF', '#FFFFFF']
  };
  const GROUND = {
    KUM: '#E9CF95', CIMEN: '#7CC66A', KAR: '#F4F8FC', KAYA: '#A9A39A', LAV: '#C9623A', SU: '#5FB8E8',
    BULUT: '#FFFFFF', METAL: '#B8C2CC', CICEK: '#8FD07A', BUZ: '#CFEFFF', BATAKLIK: '#7E9A5F'
  };
  const WEATHER = {
    YAGMUR: { c: '#7DB4E6', n: 500, s: 0.35, vy: -40 }, KAR: { c: '#FFFFFF', n: 600, s: 0.6, vy: -6 },
    KUM_FIRTINASI: { c: '#D9B77A', n: 700, s: 0.45, vx: 18 }, YAPRAK: { c: '#F08A3C', n: 220, s: 0.8, vy: -4 },
    ATES_BOCEGI: { c: '#FFE45C', n: 160, s: 0.7, glow: true }, YILDIZ_KAYMASI: { c: '#FFFFFF', n: 60, s: 1.2, vy: -30, vx: 30, high: true },
    BALONCUK: { c: '#BDEBFF', n: 200, s: 0.9, vy: 5 }, KONFETI: { c: 'multi', n: 300, s: 0.7, vy: -5 }, SIS: { fog: true }
  };
  const MAT_FX = {
    CAM: { op: 0.62 }, BUZ: { op: 0.85, rough: 0.2, emi: 0.12 }, KRISTAL: { op: 0.72, emi: 0.3 }, NEON: { emi: 0.9 }, LAV: { emi: 0.7 },
    ALTIN: { met: 0.45, rough: 0.3 }, GUMUS: { met: 0.45, rough: 0.3 }, BAKIR: { met: 0.4, rough: 0.35 }, CELIK: { met: 0.4, rough: 0.35 },
    MERMER: { rough: 0.45 }, PORSELEN: { rough: 0.3 }, SEKER: { emi: 0.08, rough: 0.5 }
  };
  const isHex = v => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fold = s => String(s || '').toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]/g, '');
  function rnd(seed) { let s = Math.abs(seed | 0) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  /* ---------------- yardımcı geometri ---------------- */
  let G = null; // geometri/malzeme fabrikası (T3 yüklenince)
  function factory() {
    const THREE = T3;
    const mats = new Map();
    function mat(m, extra) {
      if (m && m.isMaterial) m = m.userData.src || { hex: '#' + m.color.getHexString(), n: '' };
      const hex = m && isHex(m.hex) ? m.hex : (typeof m === 'string' ? m : '#C9CED6');
      const fx = (m && MAT_FX[m.n]) || {};
      const key = hex + '|' + (m && m.n) + '|' + JSON.stringify(extra || {});
      if (mats.has(key)) return mats.get(key);
      const o = { color: new THREE.Color(hex), roughness: fx.rough != null ? fx.rough : 0.85, metalness: fx.met || 0, flatShading: true };
      if (fx.op) { o.transparent = true; o.opacity = fx.op; }
      if (fx.emi) { o.emissive = new THREE.Color(hex); o.emissiveIntensity = fx.emi; }
      Object.assign(o, extra || {});
      const r = new THREE.MeshStandardMaterial(o);
      r.userData.src = m;
      mats.set(key, r);
      return r;
    }
    const flat = (hex, extra) => mat({ hex, n: '' }, extra);
    const mesh = (geo, m, x, y, z, rx, ry, rz) => { const k = new THREE.Mesh(geo, m && m.isMaterial ? m : mat(m)); k.position.set(x || 0, y || 0, z || 0); k.rotation.set(rx || 0, ry || 0, rz || 0); return k; };
    const box = (w, h, d, m, x, y, z, ry) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, 0, ry || 0);
    const cyl = (rt, rb, h, m, x, y, z, seg) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 12), m, x, y, z);
    const cone = (r, h, m, x, y, z, seg, ry) => mesh(new THREE.ConeGeometry(r, h, seg || 12), m, x, y, z, 0, ry || 0);
    const sph = (r, m, x, y, z, ws, hs) => mesh(new THREE.SphereGeometry(r, ws || 12, hs || 9), m, x, y, z);
    const dome = (r, m, x, y, z) => mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m, x, y, z);
    function shade(hex, f) {
      const c = new THREE.Color(isHex(hex) ? hex : '#C9CED6');
      if (f < 0) c.multiplyScalar(1 + f); else c.lerp(new THREE.Color('#ffffff'), f);
      return '#' + c.getHexString();
    }
    function label(text, opt) {
      opt = opt || {};
      const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
      const fs = opt.fs || 44, pad = 22;
      ctx.font = `800 ${fs}px Nunito, Segoe UI, sans-serif`;
      const lines = String(text).split('\n');
      const w = Math.ceil(Math.max(...lines.map(l => ctx.measureText(l).width))) + pad * 2, h = lines.length * (fs + 10) + pad * 1.4;
      cv.width = w; cv.height = h;
      ctx.font = `800 ${fs}px Nunito, Segoe UI, sans-serif`;
      ctx.fillStyle = opt.bg || 'rgba(255,255,255,.94)'; ctx.strokeStyle = opt.border || '#26303F'; ctx.lineWidth = 6;
      const r = 22; ctx.beginPath(); ctx.moveTo(r, 3); ctx.arcTo(w - 3, 3, w - 3, h - 3, r); ctx.arcTo(w - 3, h - 3, 3, h - 3, r); ctx.arcTo(3, h - 3, 3, 3, r); ctx.arcTo(3, 3, w - 3, 3, r); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = opt.color || '#26303F'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach((l, i) => ctx.fillText(l, w / 2, pad * 0.7 + (fs + 10) * i + fs / 2 + 4));
      const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 2;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: opt.depth !== false, transparent: true }));
      const sc = (opt.scale || 1) * 0.012;
      sp.scale.set(w * sc, h * sc, 1);
      sp.userData.label = true;
      return sp;
    }
    function glow(hex, size) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const ctx = cv.getContext('2d'), g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, hex); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.scale.set(size, size, 1);
      return sp;
    }
    return { mat, flat, mesh, box, cyl, cone, sph, dome, shade, label, glow };
  }

  /* ---------------- yapı modelleri ----------------
     Her kurucu (Y, m, h, ctx) → { g, r, slots? }  ·  r: taban yarıçapı, slots: çocuk parçaların yerleri */
  const BUILD = {
    piramit(Y, m, h) { const g = new T3.Group(), r = h * 0.85; g.add(G.cone(r, h, m, 0, h / 2, 0, 4, Math.PI / 4)); return { g, r }; },
    mayapiramidi(Y, m, h) {
      const g = new T3.Group(), n = 5, s0 = h * 1.4;
      for (let i = 0; i < n; i++) { const s = s0 * (1 - i / (n + 1)); g.add(G.box(s, h / (n + 1), s, m, 0, (h / (n + 1)) * (i + 0.5), 0)); }
      g.add(G.box(s0 * 0.25, h / 5, s0 * 0.25, G.mat(m, {}), 0, h * 0.92, 0));
      g.add(G.box(s0 * 0.12, h * 0.9, 0.3, G.flat(G.shade(m.hex, -0.15)), 0, h * 0.45, s0 * 0.45));
      return { g, r: s0 * 0.7 };
    },
    obelisk(Y, m, h) { const g = new T3.Group(), w = Math.max(1, h * 0.09); g.add(G.box(w, h * 0.92, w, m, 0, h * 0.46, 0)); g.add(G.cone(w * 0.72, h * 0.08, G.mat({ hex: '#E8B830', n: 'ALTIN' }), 0, h * 0.96, 0, 4, Math.PI / 4)); g.add(G.box(w * 2, 0.6, w * 2, m, 0, 0.3, 0)); return { g, r: w * 1.5 }; },
    sfenks(Y, m, h) {
      const g = new T3.Group(), s = h / 6;
      g.add(G.box(9 * s, 3 * s, 3.4 * s, m, -1 * s, 1.5 * s, 0));
      g.add(G.box(2.6 * s, 3.2 * s, 2.6 * s, m, 3.6 * s, 4 * s, 0));
      g.add(G.box(2.2 * s, 1.6 * s, 3.4 * s, G.flat('#3D8BFF'), 3.5 * s, 4.9 * s, 0));
      [-1, 1].forEach(z => g.add(G.box(4 * s, 0.8 * s, 0.9 * s, m, 4.5 * s, 0.4 * s, z * 1.1 * s)));
      return { g, r: 5 * s };
    },
    sutun(Y, m, h) { const g = new T3.Group(), r = Math.max(0.5, h * 0.06); g.add(G.cyl(r, r * 1.1, h, m, 0, h / 2, 0, 14)); g.add(G.box(r * 3, r * 0.8, r * 3, m, 0, h + r * 0.4, 0)); g.add(G.box(r * 3, r * 0.6, r * 3, m, 0, r * 0.3, 0)); return { g, r: r * 1.6 }; },
    tapinak(Y, m, h) {
      const g = new T3.Group(), w = 8 + h * 0.6, d = w * 0.65;
      [0, 1, 2].forEach(i => g.add(G.box(w + 3 - i, 0.6, d + 3 - i, m, 0, 0.3 + i * 0.6, 0)));
      g.add(G.box(w, 0.9, d, m, 0, h + 1.8, 0));
      const roof = G.mesh(new T3.CylinderGeometry(d / 2 + 0.6, d / 2 + 0.6, w + 0.6, 3), G.mat(m), 0, h + 3.4, 0, Math.PI / 2, 0, Math.PI / 2);
      roof.scale.set(1, 1, 0.45); g.add(roof);
      const slots = []; const n = 6;
      for (let i = 0; i < n; i++) { const x = -w / 2 + 0.8 + (i * (w - 1.6)) / (n - 1); slots.push([x, 1.8, d / 2 - 0.8], [x, 1.8, -d / 2 + 0.8]); }
      return { g, r: w * 0.6, slots, kidH: h, defKid: 'sutun' };
    },
    kule(Y, m, h) { const g = new T3.Group(), r = clamp(h * 0.13, 1.2, 3.5); g.add(G.cyl(r, r * 1.05, h, m, 0, h / 2, 0, 10)); g.add(G.cone(r * 1.4, r * 2, G.flat('#C8553D'), 0, h + r, 0, 10)); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.add(G.box(r * 0.4, r * 0.4, r * 0.4, m, Math.cos(a) * r, h + r * 0.15, Math.sin(a) * r)); } return { g, r: r * 1.3 }; },
    kale(Y, m, h) {
      const g = new T3.Group(), s = 10 + h * 0.5, wh = Math.max(3, h * 0.55);
      [[0, s / 2, 0], [0, -s / 2, 0], [s / 2, 0, Math.PI / 2], [-s / 2, 0, Math.PI / 2]].forEach(([x, z, ry]) => {
        g.add(G.box(s, wh, 1.2, m, x, wh / 2, z, ry));
        for (let k = -s / 2 + 1; k < s / 2; k += 2) g.add(G.box(0.8, 0.8, 1.3, m, ry ? x : k, wh + 0.4, ry ? k : z, ry));
      });
      g.add(G.box(3, wh * 0.6, 1.4, G.flat('#8B5A3C'), 0, wh * 0.3, s / 2 + 0.1));
      return { g, r: s * 0.75, slots: [[s / 2, 0, s / 2], [-s / 2, 0, s / 2], [s / 2, 0, -s / 2], [-s / 2, 0, -s / 2], [0, 0, -s / 2], [s / 2, 0, 0], [-s / 2, 0, 0], [0, 0, s / 2 + 3]], defKid: 'kule', kidH: h + 4 };
    },
    ev(Y, m, h) { const g = new T3.Group(), w = 5, hh = Math.max(3, h * 0.6); g.add(G.box(w, hh, w, m, 0, hh / 2, 0)); const roof = G.mesh(new T3.CylinderGeometry(w * 0.72, w * 0.72, w + 0.6, 3), G.flat('#D9553F'), 0, hh + w * 0.36, 0, 0, 0, Math.PI / 2); roof.rotation.set(0, 0, Math.PI / 2); roof.rotation.y = Math.PI / 2; roof.scale.set(0.7, 1, 1); g.add(roof); g.add(G.box(1.2, 2, 0.2, G.flat(G.shade(m.hex, -0.4)), 0, 1, w / 2 + 0.05)); return { g, r: w * 0.75 }; },
    cadir(Y, m, h) { const g = new T3.Group(), r = clamp(h * 0.5, 2, 6); g.add(G.cone(r, h, m, 0, h / 2, 0, 8)); g.add(G.cyl(0.08, 0.08, h * 0.25, G.flat('#8B5A3C'), 0, h + h * 0.1, 0, 5)); return { g, r }; },
    iglo(Y, m, h) { const g = new T3.Group(), r = clamp(h * 0.7, 2.2, 8); g.add(G.dome(r, m, 0, 0, 0)); const t = G.mesh(new T3.CylinderGeometry(r * 0.35, r * 0.35, r * 0.7, 10, 1, false, 0, Math.PI), m, 0, r * 0.05, r * 0.95, Math.PI / 2, 0, 0); g.add(t); return { g, r: r * 1.2 }; },
    kubbe(Y, m, h) { const g = new T3.Group(), r = clamp(h * 0.45, 2.5, 10); g.add(G.cyl(r, r, h * 0.4, m, 0, h * 0.2, 0, 16)); g.add(G.dome(r, G.mat(m), 0, h * 0.4, 0)); g.add(G.sph(r * 0.12, G.mat({ hex: '#E8B830', n: 'ALTIN' }), 0, h * 0.4 + r + 0.3, 0)); return { g, r: r * 1.1 }; },
    cami(Y, m, h) {
      const g = new T3.Group(), w = 8 + h * 0.35;
      g.add(G.box(w, h * 0.45, w, m, 0, h * 0.225, 0)); g.add(G.dome(w * 0.42, G.mat(m), 0, h * 0.45, 0));
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => g.add(G.dome(w * 0.16, G.mat(m), x * w * 0.3, h * 0.45, z * w * 0.3)));
      g.add(G.sph(0.5, G.mat({ hex: '#E8B830', n: 'ALTIN' }), 0, h * 0.45 + w * 0.42 + 0.5, 0));
      return { g, r: w * 0.8, slots: [[w / 2 + 1.5, 0, w / 2 + 1.5], [-w / 2 - 1.5, 0, w / 2 + 1.5], [w / 2 + 1.5, 0, -w / 2 - 1.5], [-w / 2 - 1.5, 0, -w / 2 - 1.5]], defKid: 'minare', kidH: h * 1.3 };
    },
    minare(Y, m, h) { const g = new T3.Group(), r = clamp(h * 0.04, 0.5, 1.2); g.add(G.cyl(r, r * 1.1, h, m, 0, h / 2, 0, 12)); g.add(G.mesh(new T3.TorusGeometry(r * 1.6, r * 0.35, 6, 14), m, 0, h * 0.78, 0, Math.PI / 2)); g.add(G.cone(r * 1.1, r * 4, G.flat('#7C8FA6'), 0, h + r * 2, 0, 12)); return { g, r: r * 2 }; },
    pagoda(Y, m, h) {
      const g = new T3.Group(), n = clamp(Math.round(h / 4), 2, 7), th = h / n;
      for (let i = 0; i < n; i++) {
        const w = 7 - i * (5 / n);
        g.add(G.box(w * 0.75, th * 0.7, w * 0.75, m, 0, th * i + th * 0.35, 0));
        const rf = G.cone(w * 0.85, th * 0.45, G.flat('#C8553D'), 0, th * i + th * 0.85, 0, 4, Math.PI / 4); g.add(rf);
      }
      g.add(G.cyl(0.12, 0.12, th, G.mat({ hex: '#E8B830', n: 'ALTIN' }), 0, h + th * 0.3, 0, 6));
      return { g, r: 5 };
    },
    yeldegirmeni(Y, m, h) {
      const g = new T3.Group(), r = clamp(h * 0.2, 1.5, 3.2);
      g.add(G.cyl(r * 0.7, r, h, m, 0, h / 2, 0, 8)); g.add(G.cone(r * 0.9, r * 1.4, G.flat('#C8553D'), 0, h + r * 0.7, 0, 8));
      const bl = new T3.Group(); bl.position.set(0, h * 0.85, r * 0.95);
      for (let i = 0; i < 4; i++) { const b = G.box(0.6, h * 0.55, 0.15, G.flat('#F7F2E6'), 0, h * 0.28, 0); const p = new T3.Group(); p.add(b); p.rotation.z = (i * Math.PI) / 2; bl.add(p); }
      bl.userData.spin = 1.2; g.add(bl);
      return { g, r: r * 1.6 };
    },
    fener(Y, m, h) {
      const g = new T3.Group(), r = clamp(h * 0.1, 1, 2.5), n = 6;
      for (let i = 0; i < n; i++) g.add(G.cyl(r * (1 - (i + 1) * 0.04), r * (1 - i * 0.04), h / n, i % 2 ? G.flat('#E5484D') : m, 0, (h / n) * (i + 0.5), 0, 12));
      g.add(G.cyl(r * 0.7, r * 0.7, r * 1.4, G.mat({ hex: '#FFF4B0', n: 'CAM' }), 0, h + r * 0.7, 0, 10));
      g.add(G.cone(r * 0.9, r, G.flat('#C8553D'), 0, h + r * 1.9, 0, 10));
      return { g, r: r * 1.4, lightY: h + r * 0.7 };
    },
    gokdelen(Y, m, h) {
      const g = new T3.Group(), w = clamp(h * 0.16, 3, 7);
      g.add(G.box(w, h, w, m, 0, h / 2, 0));
      const win = G.flat('#FFF6C9', { emissive: new T3.Color('#FFF0A8'), emissiveIntensity: 0.35 });
      for (let y = 2; y < h - 1; y += 2.2) [0, 1, 2, 3].forEach(k => { const a = (k * Math.PI) / 2; g.add(G.box(w * 0.8, 0.5, 0.1, win, Math.sin(a) * (w / 2 + 0.03), y, Math.cos(a) * (w / 2 + 0.03), a)); });
      g.add(G.cyl(0.1, 0.1, h * 0.2, G.flat('#9AA3B2'), 0, h + h * 0.1, 0, 5)); g.add(G.sph(0.35, G.flat('#E5484D', { emissive: new T3.Color('#E5484D'), emissiveIntensity: 0.8 }), 0, h * 1.2, 0));
      return { g, r: w * 0.8 };
    },
    roket(Y, m, h) {
      const g = new T3.Group(), r = clamp(h * 0.1, 0.8, 2.2);
      g.add(G.cyl(r, r, h * 0.7, m, 0, h * 0.35 + 1, 0, 14)); g.add(G.cone(r, h * 0.3, G.flat('#E5484D'), 0, h * 0.85 + 1, 0, 14));
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; g.add(G.box(0.15, h * 0.22, r * 1.4, G.flat('#E5484D'), Math.sin(a) * r * 1.2, h * 0.12 + 1, Math.cos(a) * r * 1.2, a)); }
      g.add(G.sph(r * 0.35, G.flat('#9FD8F5'), 0, h * 0.55 + 1, r * 0.92));
      return { g, r: r * 2 };
    },
    volkan(Y, m, h) {
      const g = new T3.Group(), r = h * 0.9;
      g.add(G.cyl(r * 0.25, r, h, m, 0, h / 2, 0, 12)); g.add(G.cyl(r * 0.2, r * 0.2, 0.3, G.mat({ hex: '#FF7A2F', n: 'LAV' }), 0, h + 0.05, 0, 12));
      const smoke = new T3.Group(); smoke.position.y = h + 1; for (let i = 0; i < 4; i++) { const s = G.sph(1 + i * 0.5, G.flat('#EFEFEF', { transparent: true, opacity: 0.75 }), 0, i * 1.6, 0, 8, 6); s.userData.smoke = i; smoke.add(s); }
      g.add(smoke);
      return { g, r, lightY: h + 0.5, autoLight: '#FF7A2F' };
    },
    agac(Y, m, h, ctx) {
      const g = new T3.Group(), z = ctx.zemin, trunk = G.flat('#8B5A3C');
      if (z === 'KUM') {
        g.add(G.cyl(0.25, 0.4, h, trunk, 0, h / 2, 0, 6));
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const f = G.box(0.4, 0.15, h * 0.4, m, Math.sin(a) * h * 0.18, h, Math.cos(a) * h * 0.18, a); f.rotation.x = 0.4; g.add(f); }
      } else if (z === 'KAR' || z === 'BUZ') {
        g.add(G.cyl(0.25, 0.35, h * 0.3, trunk, 0, h * 0.15, 0, 6));
        for (let i = 0; i < 3; i++) g.add(G.cone(h * 0.28 - i * h * 0.06, h * 0.4, m, 0, h * 0.35 + i * h * 0.22, 0, 8));
        g.add(G.cone(h * 0.12, h * 0.12, G.flat('#FFFFFF'), 0, h * 0.95, 0, 8));
      } else {
        g.add(G.cyl(0.3, 0.45, h * 0.55, trunk, 0, h * 0.27, 0, 6));
        g.add(G.sph(h * 0.32, m, 0, h * 0.7, 0, 7, 5)); g.add(G.sph(h * 0.22, m, h * 0.22, h * 0.6, 0.1, 7, 5)); g.add(G.sph(h * 0.2, m, -h * 0.2, h * 0.62, -0.1, 7, 5));
      }
      return { g, r: h * 0.3 };
    },
    kristal(Y, m, h) { const g = new T3.Group(), R = rnd(h * 7); for (let i = 0; i < 5; i++) { const s = h * (0.25 + R() * 0.25), k = G.mesh(new T3.OctahedronGeometry(s, 0), m, (R() - 0.5) * h * 0.5, s, (R() - 0.5) * h * 0.5); k.scale.y = 1.8; k.rotation.z = (R() - 0.5) * 0.6; g.add(k); } return { g, r: h * 0.45 }; },
    heykel(Y, m, h) { const g = new T3.Group(), s = h / 8; g.add(G.box(3 * s, 2 * s, 3 * s, G.flat('#CFC8BA'), 0, s, 0)); g.add(G.cyl(0.9 * s, 1.1 * s, 3.5 * s, m, 0, 3.75 * s, 0, 8)); g.add(G.sph(0.8 * s, m, 0, 6.3 * s, 0)); const arm = G.cyl(0.25 * s, 0.25 * s, 2.6 * s, m, 1 * s, 6 * s, 0, 6); arm.rotation.z = -0.5; g.add(arm); g.add(G.cone(0.5 * s, 1 * s, G.mat({ hex: '#FFB347', n: 'NEON' }), 1.6 * s, 7.5 * s, 0, 8)); return { g, r: 2 * s }; },
    tascember(Y, m, h) { const g = new T3.Group(), R = 6 + h * 0.3, n = 10; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.add(G.box(1.2, h, 0.8, m, Math.cos(a) * R, h / 2, Math.sin(a) * R, -a)); if (i % 2 === 0) { const b = (i + 0.5) / n * Math.PI * 2; g.add(G.box(2 * R * Math.sin(Math.PI / n) + 1.2, 0.7, 0.9, m, Math.cos(b) * R, h + 0.35, Math.sin(b) * R, -b + Math.PI / 2)); } } return { g, r: R + 1 }; },
    cesme(Y, m, h) { const g = new T3.Group(), r = 2 + h * 0.15; g.add(G.cyl(r, r, 1, m, 0, 0.5, 0, 16)); g.add(G.cyl(r * 0.85, r * 0.85, 0.2, G.mat({ hex: '#7FD0F5', n: 'CAM' }), 0, 1, 0, 16)); g.add(G.cyl(0.3, 0.4, h * 0.6, m, 0, h * 0.3 + 1, 0, 8)); const w = G.sph(0.9, G.mat({ hex: '#9FD8F5', n: 'CAM' }), 0, h * 0.6 + 1.4, 0, 10, 8); w.userData.bob = 1; g.add(w); return { g, r: r * 1.1 }; },
    uzayussu(Y, m, h) { const g = new T3.Group(), r = clamp(h * 0.5, 3, 9); g.add(G.dome(r, G.mat({ hex: '#BDEBFF', n: 'CAM' }), 0, 0, 0)); g.add(G.cyl(r * 1.02, r * 1.02, 0.6, m, 0, 0.3, 0, 20)); g.add(G.cyl(0.15, 0.15, r * 0.8, G.flat('#9AA3B2'), r * 1.2, r * 0.4, 0, 6)); const dish = G.dome(r * 0.3, m, r * 1.2, r * 0.85, 0); dish.rotation.z = 0.8; g.add(dish); return { g, r: r * 1.3 }; },
    sicakhavabalonu(Y, m, h) { const g = new T3.Group(), r = clamp(h * 0.25, 2, 5); g.add(G.sph(r, m, 0, h, 0, 14, 10)); g.add(G.box(r * 0.5, r * 0.4, r * 0.5, G.flat('#A9744F'), 0, h - r * 1.6, 0)); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; const l = G.cyl(0.03, 0.03, r * 0.9, G.flat('#6B4630'), Math.cos(a) * r * 0.3, h - r * 1.15, Math.sin(a) * r * 0.3, 4); g.add(l); } g.userData.floaty = 1; return { g, r: r }; },
    kopru(Y, m, h) { const g = new T3.Group(), L = 6 + h; const arc = G.mesh(new T3.TorusGeometry(L / 2, 0.5, 6, 16, Math.PI), m, 0, 0, 0); g.add(arc); g.add(G.box(L + 1, 0.4, 2.4, m, 0, L / 2 * 0.65, 0)); return { g, r: L / 2 + 1 }; }
  };
  const ALIAS = { pyramid: 'piramit', sphinx: 'sfenks', zigurat: 'mayapiramidi', mayatapinagi: 'mayapiramidi', deniz: 'fener', denizfeneri: 'fener', isikfeneri: 'fener', degirmen: 'yeldegirmeni', balon: 'sicakhavabalonu', stonehenge: 'tascember', agac: 'agac', palmiye: 'agac', cam: 'agac' };

  /* ---------------- canlı modelleri ---------------- */
  const CRT = {
    dinozor(m, s) { const g = new T3.Group(); const b = G.sph(1.2 * s, m, 0, 1.6 * s, 0, 10, 8); b.scale.set(1.6, 1, 1); g.add(b); const n = G.cyl(0.3 * s, 0.45 * s, 2.2 * s, m, 1.7 * s, 2.7 * s, 0, 6); n.rotation.z = -0.7; g.add(n); g.add(G.sph(0.5 * s, m, 2.5 * s, 3.6 * s, 0, 8, 6)); const t = G.cone(0.5 * s, 2.6 * s, m, -2.6 * s, 1.5 * s, 0, 6); t.rotation.z = Math.PI / 2 + 0.2; g.add(t); legs(g, m, s, 0.9, 0.5); eyes(g, s * 0.5, 2.8 * s, 3.75 * s, 0.25 * s); return g; },
    mamut(m, s) { const g = new T3.Group(); const b = G.sph(1.5 * s, m, 0, 2 * s, 0, 10, 8); b.scale.set(1.3, 1, 1); g.add(b); g.add(G.sph(0.9 * s, m, 1.9 * s, 2.6 * s, 0, 8, 6)); const tr = G.cyl(0.15 * s, 0.3 * s, 1.8 * s, m, 2.6 * s, 1.6 * s, 0, 6); tr.rotation.z = -0.25; g.add(tr); [-1, 1].forEach(z => { const tk = G.cone(0.12 * s, 1.4 * s, G.flat('#FFFDF5'), 2.6 * s, 2.0 * s, z * 0.45 * s, 6); tk.rotation.z = -1.9; g.add(tk); }); legs(g, m, s, 1.1, 0.7); eyes(g, s * 0.5, 2.5 * s, 2.9 * s, 0.4 * s); return g; },
    deve(m, s) { const g = new T3.Group(); const b = G.sph(1 * s, m, 0, 2.2 * s, 0, 10, 8); b.scale.set(1.5, 0.8, 0.8); g.add(b); g.add(G.sph(0.6 * s, m, -0.2 * s, 3 * s, 0, 8, 6)); const n = G.cyl(0.22 * s, 0.3 * s, 1.6 * s, m, 1.5 * s, 2.9 * s, 0, 6); n.rotation.z = -0.5; g.add(n); g.add(G.box(0.9 * s, 0.4 * s, 0.4 * s, m, 2.1 * s, 3.6 * s, 0)); legs(g, m, s, 1.6, 0.45); eyes(g, s * 0.4, 2.2 * s, 3.75 * s, 0.2 * s); return g; },
    kedi(m, s) { const g = new T3.Group(); const b = G.sph(0.6 * s, m, 0, 0.8 * s, 0, 8, 6); b.scale.set(1.5, 0.9, 0.9); g.add(b); g.add(G.sph(0.45 * s, m, 0.9 * s, 1.3 * s, 0, 8, 6)); [-1, 1].forEach(z => g.add(G.cone(0.15 * s, 0.35 * s, m, 0.95 * s, 1.75 * s, z * 0.22 * s, 4))); const t = G.cyl(0.08 * s, 0.08 * s, 1.1 * s, m, -1.1 * s, 1.2 * s, 0, 5); t.rotation.z = 0.7; g.add(t); legs(g, m, s, 0.45, 0.35); eyes(g, s * 0.25, 1.3 * s, 1.4 * s, 0.15 * s); return g; },
    at(m, s) { const g = new T3.Group(); const b = G.sph(0.9 * s, m, 0, 2 * s, 0, 10, 8); b.scale.set(1.6, 0.9, 0.8); g.add(b); const n = G.cyl(0.3 * s, 0.4 * s, 1.4 * s, m, 1.4 * s, 2.7 * s, 0, 6); n.rotation.z = -0.6; g.add(n); g.add(G.box(1 * s, 0.5 * s, 0.5 * s, m, 2.1 * s, 3.3 * s, 0)); g.add(G.box(1.2 * s, 0.3 * s, 0.15 * s, G.flat('#6B4630'), 1.3 * s, 3.2 * s, 0)); legs(g, m, s, 1.4, 0.5); eyes(g, s * 0.35, 2.3 * s, 3.45 * s, 0.2 * s); return g; },
    ejderha(m, s) { const g = new T3.Group(); const b = G.sph(1 * s, m, 0, 0, 0, 10, 8); b.scale.set(1.8, 0.8, 0.8); g.add(b); g.add(G.sph(0.55 * s, m, 2 * s, 0.6 * s, 0, 8, 6)); [-1, 1].forEach(z => { g.add(G.cone(0.12 * s, 0.6 * s, G.flat('#FFF4D2'), 2.1 * s, 1.2 * s, z * 0.25 * s, 5)); const w = G.mesh(new T3.ConeGeometry(1.8 * s, 0.1 * s, 3), G.mat(m, { side: T3.DoubleSide }), 0, 0.4 * s, z * 1.8 * s, Math.PI / 2, 0, 0); w.userData.wing = z; g.add(w); }); const t = G.cone(0.4 * s, 2.4 * s, m, -2.5 * s, 0, 0, 6); t.rotation.z = Math.PI / 2; g.add(t); eyes(g, s * 0.35, 2.3 * s, 0.8 * s, 0.2 * s); const fire = G.glow('#FF8A3D', 1.4 * s); fire.position.set(2.7 * s, 0.4 * s, 0); g.add(fire); return g; },
    robot(m, s) { const g = new T3.Group(); g.add(G.box(1.2 * s, 1.4 * s, 0.8 * s, m, 0, 1.6 * s, 0)); g.add(G.box(0.9 * s, 0.7 * s, 0.7 * s, m, 0, 2.7 * s, 0)); g.add(G.cyl(0.04 * s, 0.04 * s, 0.6 * s, G.flat('#9AA3B2'), 0, 3.3 * s, 0, 4)); g.add(G.sph(0.12 * s, G.flat('#FF4FD8', { emissive: new T3.Color('#FF4FD8'), emissiveIntensity: 1 }), 0, 3.65 * s, 0)); [-1, 1].forEach(z => { g.add(G.sph(0.11 * s, G.flat('#9FE8FF', { emissive: new T3.Color('#9FE8FF'), emissiveIntensity: 1 }), 0.36 * s, 2.75 * s, z * 0.2 * s)); g.add(G.box(0.25 * s, 1 * s, 0.25 * s, m, 0, 1.6 * s, z * 0.6 * s)); g.add(G.box(0.3 * s, 0.9 * s, 0.3 * s, m, 0, 0.45 * s, z * 0.3 * s)); }); return g; },
    uzayli(m, s) { const g = new T3.Group(); g.add(G.cyl(0.35 * s, 0.6 * s, 1.4 * s, m, 0, 0.7 * s, 0, 8)); g.add(G.sph(0.75 * s, m, 0, 1.9 * s, 0, 10, 8)); [-1, 1].forEach(z => { g.add(G.sph(0.22 * s, G.flat('#FFFFFF'), 0.62 * s, 2 * s, z * 0.25 * s)); g.add(G.cyl(0.03 * s, 0.03 * s, 0.6 * s, m, 0, 2.8 * s, z * 0.3 * s, 4)); g.add(G.sph(0.1 * s, G.flat('#FFE45C', { emissive: new T3.Color('#FFE45C'), emissiveIntensity: 1 }), 0, 3.1 * s, z * 0.3 * s)); }); return g; },
    kartal(m, s) { const g = new T3.Group(); const b = G.sph(0.5 * s, m, 0, 0, 0, 8, 6); b.scale.set(1.8, 0.8, 0.8); g.add(b); g.add(G.sph(0.32 * s, G.flat('#FFFFFF'), 0.9 * s, 0.25 * s, 0)); const gaga = G.cone(0.1 * s, 0.35 * s, G.flat('#FFC53D'), 1.25 * s, 0.2 * s, 0, 5); gaga.rotation.z = -Math.PI / 2; g.add(gaga); [-1, 1].forEach(z => { const w = G.box(0.8 * s, 0.05 * s, 1.8 * s, m, 0, 0.1 * s, z * 1 * s); w.userData.wing = z; g.add(w); }); return g; },
    yunus(m, s) { const g = new T3.Group(); const b = G.sph(0.6 * s, m, 0, 0, 0, 10, 8); b.scale.set(2.4, 0.8, 0.7); g.add(b); g.add(G.cone(0.25 * s, 0.6 * s, m, 0, 0.6 * s, 0, 4)); const t = G.box(0.2 * s, 0.1 * s, 0.9 * s, m, -1.5 * s, 0, 0); g.add(t); eyes(g, s * 0.2, 0.95 * s, 0.15 * s, 0.25 * s); return g; },
    penguen(m, s) { const g = new T3.Group(); const b = G.sph(0.6 * s, m, 0, 0.8 * s, 0, 10, 8); b.scale.set(0.9, 1.4, 0.9); g.add(b); const bel = G.sph(0.48 * s, G.flat('#FFFFFF'), 0.18 * s, 0.75 * s, 0, 10, 8); bel.scale.set(0.8, 1.3, 0.8); g.add(bel); const gaga = G.cone(0.08 * s, 0.25 * s, G.flat('#FFB347'), 0.55 * s, 1.55 * s, 0, 5); gaga.rotation.z = -Math.PI / 2; g.add(gaga); eyes(g, s * 0.2, 0.45 * s, 1.7 * s, 0.15 * s); return g; },
    kelebek(m, s) { const g = new T3.Group(); const gv = G.cyl(0.05 * s, 0.05 * s, 0.6 * s, G.flat('#5B4630'), 0, 0, 0, 5); gv.rotation.z = Math.PI / 2; g.add(gv); [-1, 1].forEach(z => { const w = G.mesh(new T3.CircleGeometry(0.5 * s, 8), G.mat(m, { side: T3.DoubleSide }), 0, 0, z * 0.45 * s, Math.PI / 2, 0, 0); w.userData.wing = z; g.add(w); }); return g; },
    atesbocegi(m, s) { const g = new T3.Group(); g.add(G.sph(0.25 * s, G.flat('#5B4630'), 0, 0, 0, 8, 6)); g.add(G.sph(0.3 * s, G.mat(m, { emissive: new T3.Color(isHex(m.hex) ? m.hex : '#FFE45C'), emissiveIntensity: 1 }), -0.4 * s, 0, 0, 8, 6)); const gl = G.glow(isHex(m.hex) ? m.hex : '#FFE45C', 2.2 * s); gl.position.set(-0.4 * s, 0, 0); g.add(gl); [-1, 1].forEach(z => { const w = G.mesh(new T3.CircleGeometry(0.3 * s, 6), G.flat('#FFFFFF', { transparent: true, opacity: 0.6, side: T3.DoubleSide }), 0, 0.15 * s, z * 0.3 * s, Math.PI / 2, 0, 0); w.userData.wing = z; g.add(w); }); return g; },
    anka(m, s) { const g = CRT.kartal(m, s); const fl = G.mat({ hex: '#FF7A2F', n: 'NEON' }); for (let i = 0; i < 3; i++) { const t = G.cone(0.2 * s, 1.4 * s, fl, -1.3 * s, 0, (i - 1) * 0.3 * s, 5); t.rotation.z = Math.PI / 2; g.add(t); } g.add(G.glow('#FF9A3D', 2.6 * s)); return g; }
  };
  const CRT_ALIAS = { trex: 'dinozor', brakiyosaurus: 'dinozor', triceratops: 'dinozor', fil: 'mamut', aslan: 'kedi', kaplan: 'kedi', sfenkskedisi: 'kedi', pegasus: 'at', unicorn: 'at', tekboynuz: 'at', kus: 'kartal', guvercin: 'kartal', balina: 'yunus', balik: 'yunus', android: 'robot', marsli: 'uzayli', zumrudukanka: 'anka', feniks: 'anka' };
  function legs(g, m, s, len, sp) { [[0.6, 1], [0.6, -1], [-0.6, 1], [-0.6, -1]].forEach(([x, z]) => { const l = G.cyl(0.18 * s, 0.15 * s, len * s, m, x * s * (sp + 0.6), (len * s) / 2, z * sp * s * 0.9, 6); l.userData.leg = x * z; g.add(l); }); }
  function eyes(g, size, x, y, zs) { [-1, 1].forEach(z => { g.add(G.sph(size * 0.45, G.flat('#FFFFFF'), x, y, z * zs, 6, 5)); g.add(G.sph(size * 0.22, G.flat('#26303F'), x + size * 0.3, y, z * zs, 5, 4)); }); }
  function blob(m, s) { const g = new T3.Group(); const b = G.sph(0.8 * s, m, 0, 0.8 * s, 0, 10, 8); b.scale.set(1, 1.1, 1); g.add(b); eyes(g, s * 0.35, 0.65 * s, 1.1 * s, 0.25 * s); return g; }

  function pick(table, alias, mro) {
    for (const n of mro || []) { const k = fold(n); if (table[k]) return table[k]; if (alias[k] && table[alias[k]]) return table[alias[k]]; }
    return null;
  }

  /* ---------------- dünya kurucu ---------------- */
  function buildStructure(Y, ctx, depth) {
    const m = Y.malzeme || { hex: '#C9CED6', n: '' }, h = clamp(Y.h || 6, 1, 40);
    const f = pick(BUILD, ALIAS, Y.mro);
    let r;
    if (f) r = f(Y, m, h, ctx);
    else {
      const g = new T3.Group(), w = clamp(h * 0.4, 2, 6);
      g.add(G.box(w, h, w, m, 0, h / 2, 0));
      r = { g, r: w * 0.8, generic: true };
    }
    const g = r.g;
    // bileşik yapı: çocuk parçalar (◆) kendi yerlerine
    const kids = (Y.kids || []).slice(0, 12);
    if (kids.length && depth < 3) {
      const slots = r.slots || [];
      kids.forEach((K, i) => {
        const kr = buildStructure(K, ctx, depth + 1);
        let p = slots[i];
        if (!p) { const a = (i / kids.length) * Math.PI * 2; p = [Math.cos(a) * (r.r + kr.r + 0.5), 0, Math.sin(a) * (r.r + kr.r + 0.5)]; }
        kr.g.position.set(p[0], p[1], p[2]);
        g.add(kr.g);
      });
      r.r = Math.max(r.r, ...kids.map((_, i) => { const p = (r.slots || [])[i]; return p ? Math.hypot(p[0], p[2]) + 2 : r.r + 4; }));
    }
    // ışık (Isiklandirilabilir)
    const lc = Y.isik ? (isHex(Y.isik.hex) ? Y.isik.hex : '#FFE45C') : r.autoLight;
    if (lc) {
      const y = r.lightY || h + 1;
      const gl = G.glow(lc, 6 + h * 0.15); gl.position.set(0, y, 0); gl.userData.pulse = 1; g.add(gl);
      if (ctx.lights.n < 6) { const pl = new T3.PointLight(new T3.Color(lc), 1.3, 40); pl.position.set(0, y, 0); g.add(pl); ctx.lights.n++; }
    }
    if (Y.floaty || g.userData.floaty) g.userData.floaty = 1;
    return r;
  }

  function buildCreature(C, ctx) {
    const m = C.malzeme || { hex: '#C9CED6', n: '' }, s = clamp((C.boy || 2) / 2.2, 0.35, 4);
    const f = pick(CRT, CRT_ALIAS, C.mro);
    const body = f ? f(m, s) : blob(m, s);
    const holder = new T3.Group(); holder.add(body);
    if (C.isik) { const lc = isHex(C.isik.hex) ? C.isik.hex : '#FFE45C'; const gl = G.glow(lc, 3 * s + 2); gl.position.y = 1.5 * s; gl.userData.pulse = 1; holder.add(gl); }
    holder.userData.crt = { kind: C.hareket || 'DUR', s, body, ses: C.ses || '', ad: C.ad || '', t: Math.random() * 10, home: null, target: null, bubble: null, nextTalk: 3 + Math.random() * 6 };
    return holder;
  }

  function skyMesh(top, hor, era) {
    const geo = new T3.SphereGeometry(700, 24, 14), cols = [], c1 = new T3.Color(top), c2 = new T3.Color(hor), c = new T3.Color();
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const t = clamp(pos.getY(i) / 700, 0, 1); c.copy(c2).lerp(c1, Math.pow(t, 0.6)); cols.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new T3.Float32BufferAttribute(cols, 3));
    return new T3.Mesh(geo, new T3.MeshBasicMaterial({ vertexColors: true, side: T3.BackSide, fog: false, depthWrite: false }));
  }
  function skyColors(e) {
    const p = SKY[e.gok];
    if (p) return p;
    if (isHex(e.gokHex)) return [e.gokHex, G.shade(e.gokHex, 0.7)];
    return SKY.GUNDUZ;
  }

  function buildIsland(e, ctx, R) {
    const g = new T3.Group();
    const zc = GROUND[e.zemin] || '#BFC5B5';
    const top = G.mesh(new T3.CylinderGeometry(R, R * 0.92, 2, 40), G.flat(G.shade(zc, -0.12)), 0, -1, 0);
    g.add(top);
    const under = new T3.Mesh(new T3.ConeGeometry(R * 0.92, R * 0.7, 20), new T3.MeshBasicMaterial({ color: e.zemin === 'BULUT' ? '#F4F7FB' : '#EADFC8' }));
    under.position.y = -2 - R * 0.35; under.rotation.x = Math.PI;
    g.add(under);
    const Rn = rnd(e.seed || 3);
    if (e.zemin === 'KUM') for (let i = 0; i < 14; i++) { const d = G.sph(3 + Rn() * 4, G.flat(G.shade(zc, -0.05)), (Rn() - 0.5) * R * 1.5, -1.5, (Rn() - 0.5) * R * 1.5, 8, 5); d.scale.y = 0.35; if (Math.hypot(d.position.x, d.position.z) < R - 6) g.add(d); }
    if (e.zemin === 'SU') { const w = G.mesh(new T3.CylinderGeometry(R, R, 0.3, 40), G.flat('#7CCBF0', { transparent: true, opacity: 0.85 }), 0, 0.05, 0); w.userData.water = 1; g.add(w); g.add(G.mesh(new T3.CylinderGeometry(R * 0.55, R * 0.6, 0.6, 30), G.flat('#EBD9A8'), 0, 0.3, 0)); }
    if (e.zemin === 'LAV') for (let i = 0; i < 10; i++) { const a = Rn() * Math.PI * 2, r = Rn() * R * 0.85; g.add(G.box(0.6, 0.1, 4 + Rn() * 6, G.mat({ hex: '#FF9A3D', n: 'LAV' }), Math.cos(a) * r, 0.02, Math.sin(a) * r, Rn() * 3)); }
    if (e.zemin === 'METAL') for (let i = -R + 6; i < R; i += 6) { const L = 2 * Math.sqrt(R * R - i * i) - 2; g.add(G.box(L, 0.05, 0.15, G.flat('#8FA0B3'), 0, 0.02, i)); g.add(G.box(0.15, 0.05, L, G.flat('#8FA0B3'), i, 0.02, 0)); }
    if (e.zemin === 'CICEK') for (let i = 0; i < 90; i++) { const a = Rn() * Math.PI * 2, r = Math.sqrt(Rn()) * R * 0.95; g.add(G.sph(0.35, G.flat(['#FF7EB6', '#FFE45C', '#FFFFFF', '#C3A6F0'][i % 4]), Math.cos(a) * r, 0.2, Math.sin(a) * r, 5, 4)); }
    if (e.zemin === 'BULUT') for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.add(G.sph(3 + Rn() * 2, G.flat('#FFFFFF'), Math.cos(a) * R, -0.5, Math.sin(a) * R, 8, 6)); }
    if (e.zemin === 'KAR' || e.zemin === 'BUZ') for (let i = 0; i < 10; i++) { const a = Rn() * Math.PI * 2, r = Rn() * R * 0.9; const k = G.sph(1 + Rn() * 2, G.flat('#FFFFFF'), Math.cos(a) * r, -0.3, Math.sin(a) * r, 7, 5); k.scale.y = 0.4; g.add(k); }
    if (e.zemin === 'BATAKLIK') for (let i = 0; i < 8; i++) { const a = Rn() * Math.PI * 2, r = Rn() * R * 0.8; g.add(G.mesh(new T3.CircleGeometry(2 + Rn() * 3, 12), G.flat('#7FB7A6'), Math.cos(a) * r, 0.03, Math.sin(a) * r, -Math.PI / 2)); }
    return g;
  }

  function particles(kind, R, cx) {
    const w = WEATHER[kind]; if (!w || w.fog) return null;
    const n = w.n, pos = new Float32Array(n * 3), cols = new Float32Array(n * 3), c = new T3.Color(), pal = ['#FF7EB6', '#FFE45C', '#7FD8C9', '#8FD3FF', '#C3A6F0'];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = cx + (Math.random() - 0.5) * R * 2; pos[i * 3 + 1] = (w.high ? 40 : 0) + Math.random() * 40; pos[i * 3 + 2] = (Math.random() - 0.5) * R * 2;
      c.set(w.c === 'multi' ? pal[i % pal.length] : w.c); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    const geo = new T3.BufferGeometry(); geo.setAttribute('position', new T3.BufferAttribute(pos, 3)); geo.setAttribute('color', new T3.BufferAttribute(cols, 3));
    const p = new T3.Points(geo, new T3.PointsMaterial({ size: w.s, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, blending: w.glow ? T3.AdditiveBlending : T3.NormalBlending }));
    p.userData.wx = { ...w, cx, R };
    return p;
  }

  function skyExtras(e, cx, root) {
    if (e.gok === 'YILDIZLI') { const n = 300, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 0.9 + 0.15, r = 600; pos[i * 3] = cx + Math.cos(a) * Math.cos(b) * r; pos[i * 3 + 1] = Math.sin(b) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(b) * r; } const geo = new T3.BufferGeometry(); geo.setAttribute('position', new T3.BufferAttribute(pos, 3)); root.add(new T3.Points(geo, new T3.PointsMaterial({ size: 3, color: '#FFFFFF', fog: false }))); }
    if (e.gok === 'AURORA') ['#9BF2C9', '#B9A7FF', '#8FE3FF'].forEach((col, i) => { const p = G.mesh(new T3.PlaneGeometry(300, 40, 20, 1), G.flat(col, { transparent: true, opacity: 0.35, side: T3.DoubleSide, emissive: new T3.Color(col), emissiveIntensity: 0.6, fog: false }), cx, 140 + i * 25, -220 - i * 30); p.userData.aurora = i; root.add(p); });
    if (e.gok === 'GOKKUSAGI') ['#FF6B6B', '#FFB347', '#FFE45C', '#7ED37E', '#6EC6FF', '#B39DFF'].forEach((col, i) => { root.add(G.mesh(new T3.TorusGeometry(160 - i * 6, 3, 6, 40, Math.PI), G.flat(col, { transparent: true, opacity: 0.55, fog: false }), cx, 0, -260)); });
    if (e.gok === 'PEMBE_BULUT' || e.gok === 'GUNDUZ' || e.gok === 'SAFAK') for (let i = 0; i < 6; i++) { const c = new T3.Group(); for (let k = 0; k < 4; k++) c.add(G.sph(6 + Math.random() * 5, G.flat(e.gok === 'PEMBE_BULUT' ? '#FFD6EC' : '#FFFFFF', { fog: false }), k * 7, Math.random() * 3, Math.random() * 4, 8, 6)); c.position.set(cx + (Math.random() - 0.5) * 300, 70 + Math.random() * 40, (Math.random() - 0.5) * 300); c.userData.cloud = 1; root.add(c); }
  }

  /* ---------------- görünüm ---------------- */
  function create(container, opts) {
    opts = opts || {};
    const THREE = T3;
    if (!G) G = factory();
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.tour ? 1.5 : 1.25));
    container.appendChild(renderer.domElement);
    renderer.domElement.className = 'h8-canvas';
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    scene.add(new THREE.HemisphereLight('#FFFFFF', '#7A6A58', 0.5));
    const sun = new THREE.DirectionalLight('#FFF8EE', 0.8); sun.position.set(90, 110, 60); scene.add(sun);
    const fill = new THREE.DirectionalLight('#DCE6FF', 0.22); fill.position.set(-80, 40, -60); scene.add(fill);
    let world = null, eraInfo = [], skyObjs = [], running = true, t0 = performance.now(), last = t0;
    const V = { mode: opts.tour ? 'walk' : 'orbit', yaw: 0, pitch: -0.12, pos: new THREE.Vector3(0, 3, 40), keys: {}, drag: null, orbit: { th: 0.9, ph: 0.4, dist: opts.tour ? 95 : 70, target: new THREE.Vector3() }, auto: !opts.tour, visit: opts.onVisit, visited: new Set(), labels: true };

    function resize() {
      const w = container.clientWidth || 300, h = container.clientHeight || 200;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    const ro = window.ResizeObserver ? new ResizeObserver(resize) : null; if (ro) ro.observe(container); else window.addEventListener('resize', resize);
    resize();

    function disposeWorld() {
      if (!world) return;
      scene.remove(world);
      world.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); });
      world = null; eraInfo = []; skyObjs = [];
    }

    function setWorld(data, focus) {
      disposeWorld();
      world = new THREE.Group(); scene.add(world);
      const ctx = { lights: { n: 0 } };
      const eras = data.eras.length ? data.eras : [];
      const R = 46, GAP = 150;
      eras.forEach((e, i) => {
        const cx = i * GAP, er = new THREE.Group(); er.position.x = cx; world.add(er);
        const ectx = Object.assign({}, ctx, { zemin: e.zemin });
        er.add(buildIsland(e, ectx, R));
        // yapılar: halkalar halinde
        let ring = 0, inRing = 0, cap = 5, rad = 12;
        (e.yapilar || []).slice(0, 12).forEach((Y, k) => {
          const st = buildStructure(Y, ectx, 0);
          if (inRing >= cap) { ring++; inRing = 0; cap = 8; rad = 30; }
          const a = (inRing / cap) * Math.PI * 2 + ring * 0.4 + 0.3;
          const rr = Math.min(R - st.r - 2, rad + st.r * 0.5);
          st.g.position.set(Math.cos(a) * Math.max(0, rr), 0, Math.sin(a) * Math.max(0, rr));
          if (e.zemin === 'SU') { const d = Math.hypot(st.g.position.x, st.g.position.z), mx = R * 0.5; if (d > mx) st.g.position.multiplyScalar(mx / d); }
          st.g.lookAt(0, 0, 0);
          if (V.labels && Y.label) { const lb = G.label(Y.label, { fs: 34, scale: 1.5 }); lb.position.set(0, Math.min(48, (Y.h || 6) + 7), 0); lb.visible = true; st.g.add(lb); }
          er.add(st.g); inRing++;
        });
        (e.canlilar || []).slice(0, 14).forEach((C, k) => {
          const cr = buildCreature(C, ectx); const a = (k / Math.max(1, e.canlilar.length)) * Math.PI * 2; const d = 8 + (k % 3) * 6;
          cr.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); cr.userData.crt.home = new THREE.Vector3(0, 0, 0); cr.userData.crt.R = R - 6; cr.userData.crt.zemin = e.zemin;
          er.add(cr);
        });
        const sign = G.label(`${e.ad}\n${e.yil || ''}`, { fs: 56, scale: 2.6, bg: 'rgba(255,248,236,.96)' });
        sign.position.set(0, 30, -R + 6); er.add(sign);
        const wp = particles(e.hava, R, 0); if (wp) er.add(wp);
        skyExtras(e, cx, world);
        eraInfo.push({ cx, e, sky: skyColors(e), fog: e.hava === 'SIS' || e.gok === 'SISLI' });
      });
      // köprüler ve portallar
      for (let i = 0; i < eras.length - 1; i++) {
        const x0 = i * GAP + R - 2, x1 = (i + 1) * GAP - R + 2, L = x1 - x0;
        world.add(G.box(L, 0.6, 6, G.flat('#F2E3C6'), x0 + L / 2, -0.3, 0));
        for (let k = 0; k < L; k += 8) world.add(G.box(0.4, 1.4, 0.4, G.flat('#D9C29A'), x0 + k, 0.4, 3.2), G.box(0.4, 1.4, 0.4, G.flat('#D9C29A'), x0 + k, 0.4, -3.2));
        const pg = new THREE.Group(); pg.position.set(x0 + L / 2, 0, 0); pg.rotation.y = Math.PI / 2;
        pg.add(G.mesh(new THREE.TorusGeometry(7, 0.9, 10, 40), G.mat({ hex: '#B39DFF', n: 'NEON' }), 0, 7, 0));
        const disc = G.mesh(new THREE.CircleGeometry(6.2, 32), G.flat('#CFC2FF', { transparent: true, opacity: 0.45, side: THREE.DoubleSide, emissive: new THREE.Color('#B39DFF'), emissiveIntensity: 0.6 }), 0, 7, 0); disc.userData.portal = 1; pg.add(disc);
        const lb = G.label(`⏳ ${eras[i + 1].yil || ''}`, { fs: 40, scale: 1, bg: 'rgba(240,235,255,.95)' }); lb.position.set(0, 16.5, 0); pg.add(lb);
        world.add(pg);
      }
      // atölye (çağa eklenmemiş nesneler) — yalnızca önizlemede
      if (!eras.length && data.atolye && (data.atolye.yapilar.length || data.atolye.canlilar.length)) {
        const at = { ad: 'Atölye', yil: 'henüz bir çağa eklenmedi', gok: 'GUNDUZ', zemin: 'METAL', yapilar: data.atolye.yapilar, canlilar: data.atolye.canlilar, seed: 5 };
        return setWorld({ eras: [at] }, 0);
      }
      if (!eras.length) {
        const pl = G.mesh(new THREE.CylinderGeometry(R, R * 0.92, 2, 40), G.flat('#E6E1D8'), 0, -1, 0); world.add(pl);
        const lb = G.label('Boş zaman platformu\nBir çağ nesnesi üret', { fs: 44, scale: 1.6 }); lb.position.set(0, 14, 0); world.add(lb);
        eraInfo.push({ cx: 0, e: {}, sky: SKY.SISLI });
      }
      // vasıta ve gezginler
      if (data.tur && eras.length) {
        const i = clamp(data.tur.eraIndex || 0, 0, eras.length - 1), x = i * GAP - R + 10;
        const vg = vehicle(data.tur.arac); vg.position.set(x, 0, -10); world.add(vg);
        (data.tur.gezginler || []).slice(0, 8).forEach((n, k) => { const p = person(k); p.position.set(x + 4 + (k % 4) * 2.4, 0, -4 + Math.floor(k / 4) * 2.4); const lb = G.label(n, { fs: 34, scale: 0.7 }); lb.position.y = 3.8; p.add(lb); world.add(p); });
      }
      const sky = skyMesh(eraInfo[0].sky[0], eraInfo[0].sky[1]); sky.userData.sky = 1; scene.add(sky); skyObjs.push(sky);
      focusEra(focus || 0, true);
    }
    function vehicle(a) {
      const g = new THREE.Group(), k = a ? (a.mro || []).map(fold) : [];
      if (k.includes('isinlayici')) { g.add(G.cyl(4, 4, 0.6, G.flat('#9AA3B2'), 0, 0.3, 0, 24)); const b = G.cyl(3, 3, 22, G.flat('#9FE8FF', { transparent: true, opacity: 0.35, emissive: new THREE.Color('#9FE8FF'), emissiveIntensity: 0.8 }), 0, 11.5, 0, 24); b.userData.beam = 1; g.add(b); }
      else if (k.includes('portal')) { g.add(G.mesh(new THREE.TorusGeometry(5, 0.7, 10, 32), G.mat({ hex: '#FF4FD8', n: 'NEON' }), 0, 5.5, 0)); const d = G.mesh(new THREE.CircleGeometry(4.5, 28), G.flat('#FFC6F2', { transparent: true, opacity: 0.5, side: THREE.DoubleSide }), 0, 5.5, 0); d.userData.portal = 1; g.add(d); }
      else { const b = G.sph(3.2, G.mat({ hex: '#E8EEF5', n: 'GUMUS' }), 0, 4, 0, 16, 12); b.scale.y = 1.3; g.add(b); g.add(G.mesh(new THREE.TorusGeometry(4.2, 0.4, 8, 30), G.mat({ hex: '#E8B830', n: 'ALTIN' }), 0, 4, 0, Math.PI / 2)); g.add(G.sph(1.4, G.flat('#9FD8F5', { transparent: true, opacity: 0.7 }), 2.5, 5, 0)); [0, 1, 2].forEach(i => { const a2 = (i / 3) * Math.PI * 2; g.add(G.cyl(0.2, 0.3, 2, G.flat('#9AA3B2'), Math.cos(a2) * 2.2, 0.9, Math.sin(a2) * 2.2, 5)); }); g.userData.floaty = 1; }
      if (a && a.ad) { const lb = G.label('🚀 ' + a.ad, { fs: 36, scale: 0.9 }); lb.position.y = 11; g.add(lb); }
      return g;
    }
    function person(k) { const g = new THREE.Group(), cols = ['#3D8BFF', '#E5484D', '#46A758', '#8E4EC6', '#F76B15', '#FFC53D']; g.add(G.cyl(0.45, 0.6, 1.8, G.flat(cols[k % cols.length]), 0, 0.9, 0, 8)); g.add(G.sph(0.45, G.flat('#F2C9A0'), 0, 2.2, 0)); return g; }

    function focusEra(i, jump) {
      const info = eraInfo[clamp(i, 0, eraInfo.length - 1)]; if (!info) return;
      V.orbit.target.set(info.cx, 5, 0);
      if (jump || V.mode === 'walk') { V.pos.set(info.cx, 3, 40); V.yaw = 0; V.pitch = -0.08; }
      V.focus = i;
    }

    /* ---- girdi ---- */
    const el = renderer.domElement;
    el.tabIndex = 0;
    function onDown(e) {
      if (V.mode === 'walk' && opts.tour) { if (document.pointerLockElement !== el && el.requestPointerLock) el.requestPointerLock(); return; }
      V.drag = { x: e.clientX, y: e.clientY }; V.auto = false; el.setPointerCapture && el.setPointerCapture(e.pointerId);
    }
    function onMove(e) {
      if (V.mode === 'walk' && document.pointerLockElement === el) { V.yaw -= e.movementX * 0.0025; V.pitch = clamp(V.pitch - e.movementY * 0.0025, -1.3, 1.3); return; }
      if (!V.drag) return;
      const dx = e.clientX - V.drag.x, dy = e.clientY - V.drag.y; V.drag = { x: e.clientX, y: e.clientY };
      V.orbit.th -= dx * 0.008; V.orbit.ph = clamp(V.orbit.ph + dy * 0.006, 0.08, 1.45);
    }
    function onUp() { V.drag = null; }
    function onWheel(e) { if (V.mode !== 'orbit') return; e.preventDefault(); V.orbit.dist = clamp(V.orbit.dist * (e.deltaY > 0 ? 1.1 : 0.9), 20, 320); }
    el.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    const kd = e => { if (!opts.tour || container.closest('[hidden]')) return; const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', ' '].includes(k)) { V.keys[k] = true; if (V.mode === 'walk' && document.activeElement === el || document.pointerLockElement === el) e.preventDefault(); } };
    const ku = e => { V.keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

    /* ---- döngü ---- */
    const tmp = new THREE.Vector3();
    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      if (!container.offsetParent) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000), t = (now - t0) / 1000; last = now;
      step(dt, t);
    }
    function step(dt, t) {
      // kamera
      if (V.mode === 'walk') {
        const sp = (V.keys.shift ? 26 : 13) * dt, f = (V.keys.w || V.keys.arrowup ? 1 : 0) - (V.keys.s || V.keys.arrowdown ? 1 : 0), s = (V.keys.d ? 1 : 0) - (V.keys.a ? 1 : 0), turn = (V.keys.arrowleft ? 1 : 0) - (V.keys.arrowright ? 1 : 0);
        V.yaw += turn * 1.8 * dt;
        V.pos.x += (-Math.sin(V.yaw) * f + Math.cos(V.yaw) * s) * sp; V.pos.z += (-Math.cos(V.yaw) * f - Math.sin(V.yaw) * s) * sp;
        V.pos.z = clamp(V.pos.z, -60, 60); V.pos.x = clamp(V.pos.x, -60, (eraInfo.length - 1) * 150 + 60);
        camera.position.copy(V.pos); camera.rotation.set(V.pitch, V.yaw, 0, 'YXZ');
      } else {
        if (V.auto) V.orbit.th += dt * 0.12;
        const o = V.orbit;
        camera.position.set(o.target.x + Math.cos(o.th) * Math.cos(o.ph) * o.dist, o.target.y + Math.sin(o.ph) * o.dist, o.target.z + Math.sin(o.th) * Math.cos(o.ph) * o.dist);
        camera.lookAt(o.target);
      }
      // gökyüzü: en yakın çağın renkleri
      if (eraInfo.length) {
        const x = camera.position.x; let a = 0;
        for (let i = 0; i < eraInfo.length; i++) if (Math.abs(eraInfo[i].cx - x) < Math.abs(eraInfo[a].cx - x)) a = i;
        if (V.curSky !== a) {
          V.curSky = a; const sk = eraInfo[a].sky;
          skyObjs.forEach(s => scene.remove(s)); skyObjs = [];
          const m = skyMesh(sk[0], sk[1]); scene.add(m); skyObjs.push(m);
          scene.fog = new THREE.Fog(new THREE.Color(sk[1]), eraInfo[a].fog ? 25 : 140, eraInfo[a].fog ? 160 : 520);
        }
        skyObjs.forEach(s => s.position.copy(camera.position));
        if (opts.tour) eraInfo.forEach((info, i) => { if (!V.visited.has(i) && Math.hypot(camera.position.x - info.cx, camera.position.z) < 40) { V.visited.add(i); if (V.visit) V.visit(i, V.visited.size, eraInfo.length); } });
      }
      // canlandırma
      if (world) world.traverse(o => {
        const u = o.userData;
        if (u.spin) o.rotation.z += dt * u.spin;
        if (u.pulse) { const k = 1 + Math.sin(t * 3 + o.id) * 0.12; o.scale.x = o.scale.y = (o.userData.base || (o.userData.base = o.scale.x)) * k; }
        if (u.portal) o.material.opacity = 0.35 + Math.sin(t * 2.5) * 0.15;
        if (u.beam) o.material.opacity = 0.25 + Math.sin(t * 6) * 0.1;
        if (u.floaty) o.position.y = (u.by != null ? u.by : (u.by = o.position.y)) + Math.sin(t * 1.3 + o.id) * 0.8;
        if (u.bob) o.position.y += Math.sin(t * 4) * 0.01;
        if (u.smoke != null) { o.position.y = ((t * 1.5 + u.smoke * 1.6) % 7); o.material.opacity = 0.75 * (1 - o.position.y / 7); }
        if (u.cloud) o.position.x += dt * 2;
        if (u.aurora != null) o.position.y += Math.sin(t * 0.6 + u.aurora) * 0.05;
        if (u.water) o.position.y = 0.05 + Math.sin(t) * 0.08;
        if (u.wx) { const p = o.geometry.attributes.position, w = u.wx; for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); y += (w.vy || 0) * dt + (w.glow ? Math.sin(t * 2 + i) * dt * 2 : 0); x += (w.vx || 0) * dt + (w.glow ? Math.cos(t + i) * dt * 2 : 0); if (y < 0) y += 40; if (y > 80) y -= 40; if (x > w.cx + w.R) x -= 2 * w.R; p.setXYZ(i, x, y, z); } p.needsUpdate = true; }
        if (u.crt) animCreature(o, u.crt, dt, t);
      });
      renderer.render(scene, camera);
    }
    function renderNow() { step(0, (performance.now() - t0) / 1000); }
    function animCreature(o, c, dt, t) {
      c.t += dt;
      const s = c.s, k = c.kind;
      if (!c.target || o.position.distanceTo(c.target) < 1) { const a = Math.random() * Math.PI * 2, r = Math.random() * (c.R || 30); c.target = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r); }
      const base = k === 'UC' ? 10 + s * 2 : k === 'SUZUL' ? 3 + s : k === 'YUZ' && c.zemin === 'SU' ? -0.4 : 0;
      if (k === 'UC') { const a = c.t * 0.5 + o.id; o.position.set(Math.cos(a) * 18, base + Math.sin(c.t * 2) * 1.5, Math.sin(a) * 18); o.rotation.y = -a; }
      else if (k === 'DUR') { o.position.y = Math.sin(c.t * 2) * 0.05; }
      else if (k === 'DON') { o.rotation.y += dt * 2; }
      else {
        tmp.copy(c.target).sub(o.position); tmp.y = 0; const d = tmp.length(); tmp.normalize();
        const sp = (k === 'ZIPLA' ? 4 : k === 'YUZ' ? 6 : 3) * dt * Math.max(0.8, s * 0.6);
        o.position.x += tmp.x * sp; o.position.z += tmp.z * sp;
        o.rotation.y = Math.atan2(-tmp.z, tmp.x);
        o.position.y = base + (k === 'ZIPLA' ? Math.abs(Math.sin(c.t * 5)) * 2 * s : k === 'YUZ' ? Math.max(0, Math.sin(c.t * 2)) * 2 * s : k === 'SUZUL' ? Math.sin(c.t * 1.5) * 0.8 : Math.abs(Math.sin(c.t * 8)) * 0.15 * s);
        if (d < 0.5) c.target = null;
      }
      c.body.traverse(p => { if (p.userData.wing) p.rotation.x = Math.PI / 2 + Math.sin(c.t * 12) * 0.6 * p.userData.wing; if (p.userData.leg) p.rotation.z = Math.sin(c.t * 8) * 0.4 * p.userData.leg; });
      // konuşma balonu: ses()
      c.nextTalk -= dt;
      if (c.ses && c.nextTalk < 0 && !c.bubble) { c.bubble = G.label(c.ses.slice(0, 40), { fs: 40, scale: 0.8, bg: 'rgba(255,255,255,.97)' }); c.bubble.position.y = 4 * s + 2; o.add(c.bubble); c.bubbleT = 2.8; }
      if (c.bubble) { c.bubbleT -= dt; if (c.bubbleT < 0) { o.remove(c.bubble); c.bubble.material.map.dispose(); c.bubble = null; c.nextTalk = 5 + Math.random() * 8; } }
    }
    requestAnimationFrame(frame);

    function shot(i, w, h) {
      const info = eraInfo[clamp(i, 0, eraInfo.length - 1)]; if (!info) return null;
      const prev = { mode: V.mode, pos: camera.position.clone(), rot: camera.rotation.clone(), w: renderer.domElement.width, h: renderer.domElement.height, aspect: camera.aspect, pr: renderer.getPixelRatio() };
      renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      camera.position.set(info.cx + 46, 30, 54); camera.lookAt(info.cx, 5, 0);
      const sk = info.sky; skyObjs.forEach(s => scene.remove(s)); skyObjs = []; const m = skyMesh(sk[0], sk[1]); m.position.copy(camera.position); scene.add(m); skyObjs.push(m); V.curSky = i;
      scene.fog = new THREE.Fog(new THREE.Color(sk[1]), 140, 520);
      renderer.render(scene, camera);
      const url = renderer.domElement.toDataURL('image/jpeg', 0.9);
      renderer.setPixelRatio(prev.pr); resize(); camera.position.copy(prev.pos); camera.rotation.copy(prev.rot); V.curSky = null;
      return url;
    }
    function setMode(m) { V.mode = m; if (m !== 'walk' && document.pointerLockElement === el) document.exitPointerLock(); if (m === 'orbit') { V.orbit.target.set(camera.position.x, 6, 0); } }
    function destroy() { running = false; disposeWorld(); if (ro) ro.disconnect(); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); renderer.dispose(); el.remove(); }
    return { setWorld, focusEra, setMode, shot, destroy, resize, renderNow, count: () => eraInfo.length, visited: () => V.visited, get mode() { return V.mode; }, setAuto: a => { V.auto = a; } };
  }

  // Katalog (Kod paneli için): öğrencinin sınıf adı olarak kullanabileceği modeller
  const CATALOG = {
    yapilar: ['Piramit', 'MayaPiramidi', 'Obelisk', 'Sfenks', 'Sutun', 'Tapinak', 'Kule', 'Kale', 'Ev', 'Cadir', 'Iglo', 'Kubbe', 'Cami', 'Minare', 'Pagoda', 'YelDegirmeni', 'Fener', 'Gokdelen', 'Roket', 'Volkan', 'Agac', 'Kristal', 'Heykel', 'TasCember', 'Cesme', 'UzayUssu', 'SicakHavaBalonu', 'Kopru'],
    bilesik: { Tapinak: 'Sutun', Kale: 'Kule', Cami: 'Minare' },
    canlilar: ['Dinozor', 'Mamut', 'Deve', 'Kedi', 'At', 'Ejderha', 'Robot', 'Uzayli', 'Kartal', 'Yunus', 'Penguen', 'Kelebek', 'AtesBocegi', 'Anka'],
    gok: Object.keys(SKY), zemin: Object.keys(GROUND), hava: ['ACIK'].concat(Object.keys(WEATHER)), malzeme: ['KUMTASI', 'MERMER', 'ALTIN', 'GUMUS', 'BAKIR', 'CELIK', 'AHSAP', 'TAS', 'TUGLA', 'CAM', 'BUZ', 'KRISTAL', 'NEON', 'LAV', 'YOSUN', 'PORSELEN', 'SEKER'],
    hareket: ['YURU', 'UC', 'YUZ', 'ZIPLA', 'SUZUL', 'DON', 'DUR'],
    sky: SKY, ground: GROUND
  };

  return { load, webglOk, create, CATALOG };
})();
