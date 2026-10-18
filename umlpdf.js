/* =========================================================================
   UML → PDF (4. ve 5. hafta ortak)
   Diyagram tarayıcının kendi fontlarıyla (Türkçe karakterler sorunsuz) bir
   canvas'a çizilir, jsPDF ile A4 PDF olarak indirilir. jsPDF yüklenemezse
   sayfa PNG olarak indirilir.
   Model: { title, week, classes:[{id,name,stereo,abstract,x,y,attrs:[{text,abstract}],meths:[...]}],
            rels:[{a,b,type:'assoc'|'agg'|'comp'|'gen'|'real',ma,mb,role,label}], code, filename }
   ========================================================================= */
window.NYPPdf = (function () {
  'use strict';

  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const STUDENT_KEY = 'nyp-ogrenci';
  const F = { body: "'Nunito', 'Segoe UI', sans-serif", mono: "'JetBrains Mono', Consolas, monospace", disp: "'Baloo 2', 'Segoe UI', sans-serif" };
  const INK = '#2D2A4A';
  const HEAD = { class: '#EEF3FF', abstract: '#F1EBFF', interface: '#E6F6EE' };

  /* ---------------- ortak geometri (ekrandaki çizim de bunu kullanır) ---------------- */
  function exitPt(r, p, dx, dy) {
    let t = Infinity;
    if (dx > 1e-9) t = Math.min(t, (r.x + r.w - p.x) / dx); else if (dx < -1e-9) t = Math.min(t, (r.x - p.x) / dx);
    if (dy > 1e-9) t = Math.min(t, (r.y + r.h - p.y) / dy); else if (dy < -1e-9) t = Math.min(t, (r.y - p.y) / dy);
    if (!isFinite(t)) t = 0;
    return { x: p.x + dx * t, y: p.y + dy * t };
  }
  function edge(ra, rb, off) {
    const ca = { x: ra.x + ra.w / 2, y: ra.y + ra.h / 2 }, cb = { x: rb.x + rb.w / 2, y: rb.y + rb.h / 2 };
    const dx = cb.x - ca.x, dy = cb.y - ca.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const nx = -uy, ny = ux, o = off || 0;
    const p1 = exitPt(ra, { x: ca.x + nx * o, y: ca.y + ny * o }, ux, uy);
    const p2 = exitPt(rb, { x: cb.x + nx * o, y: cb.y + ny * o }, -ux, -uy);
    let lx = nx, ly = ny;
    if (ly > 0 || (ly === 0 && lx > 0)) { lx = -lx; ly = -ly; }
    return { p1, p2, ux, uy, lx, ly };
  }
  function decorate(g, type) {
    const { p1, p2, ux, uy } = g, nx = -uy, ny = ux;
    const P = (p, a, b) => ({ x: p.x + ux * a + nx * b, y: p.y + uy * a + ny * b });
    const shapes = [];
    let s = p1, e = p2;
    if (type === 'agg' || type === 'comp') {
      shapes.push({ pts: [p1, P(p1, 11, 7), P(p1, 22, 0), P(p1, 11, -7)], fill: type === 'comp' ? 'ink' : 'paper', closed: true });
      s = P(p1, 22, 0);
    }
    if (type === 'gen' || type === 'real') {
      shapes.push({ pts: [p2, P(p2, -17, 10), P(p2, -17, -10)], fill: 'paper', closed: true });
      e = P(p2, -17, 0);
    } else if (type === 'assoc') {
      shapes.push({ pts: [P(p2, -14, 8), p2, P(p2, -14, -8)], fill: 'none', closed: false });
    }
    return { s, e, shapes, dashed: type === 'real' };
  }
  function labels(g, type) {
    const { p1, p2, ux, uy, lx, ly } = g;
    const a0 = type === 'agg' || type === 'comp' ? 36 : 26;
    return {
      ma: { x: p1.x + ux * a0 + lx * 13, y: p1.y + uy * a0 + ly * 13 },
      mb: { x: p2.x - ux * 28 + lx * 13, y: p2.y - uy * 28 + ly * 13 },
      role: { x: p2.x - ux * 30 - lx * 14, y: p2.y - uy * 30 - ly * 14 },
      mid: { x: (p1.x + p2.x) / 2 + lx * 15, y: (p1.y + p2.y) / 2 + ly * 15 }
    };
  }

  /* ---------------- kütüphane ---------------- */
  let libP = null;
  function loadLib() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (libP) return libP;
    libP = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = JSPDF_URL; s.async = true;
      s.onload = () => (window.jspdf && window.jspdf.jsPDF ? res(window.jspdf.jsPDF) : rej(new Error('jsPDF yok')));
      s.onerror = () => { libP = null; s.remove(); rej(new Error('jsPDF yüklenemedi')); };
      document.head.appendChild(s);
    });
    return libP;
  }

  /* ---------------- çizim ---------------- */
  function measure(ctx, c) {
    const PAD = 10, LH = 20;
    // web fontlarının alt kümesinde U+2212 (−) olmayabilir; kanvasta düz tire kullan
    c.attrs.concat(c.meths).forEach(l => { l.text = String(l.text).replace(/−/g, '-'); });
    ctx.font = `${c.abstract ? 'italic ' : ''}800 17px ${F.body}`;
    let w = ctx.measureText(c.name || '?').width;
    if (c.stereo) { ctx.font = `italic 600 13px ${F.body}`; w = Math.max(w, ctx.measureText('«' + c.stereo + '»').width); }
    ctx.font = `13px ${F.mono}`;
    c.attrs.concat(c.meths).forEach(l => { w = Math.max(w, ctx.measureText(l.text).width); });
    const hh = PAD * 2 + 20 + (c.stereo ? 17 : 0);
    const ah = c.attrs.length ? c.attrs.length * LH + 10 : 16;
    const mh = c.meths.length ? c.meths.length * LH + 10 : 16;
    return { w: Math.max(150, Math.ceil(w) + PAD * 2 + 4), h: hh + ah + mh, hh, ah, LH, PAD };
  }

  function drawBox(ctx, c, r, m) {
    ctx.save();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = HEAD[c.stereo === 'interface' ? 'interface' : c.abstract ? 'abstract' : 'class'];
    ctx.fillRect(r.x, r.y, r.w, m.hh);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.beginPath();
    ctx.moveTo(r.x, r.y + m.hh); ctx.lineTo(r.x + r.w, r.y + m.hh);
    ctx.moveTo(r.x, r.y + m.hh + m.ah); ctx.lineTo(r.x + r.w, r.y + m.hh + m.ah);
    ctx.stroke();
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let y = r.y + m.PAD + 9;
    if (c.stereo) { ctx.font = `italic 600 13px ${F.body}`; ctx.fillText('«' + c.stereo + '»', r.x + r.w / 2, y); y += 17; }
    ctx.font = `${c.abstract ? 'italic ' : ''}800 17px ${F.body}`;
    ctx.fillText(c.name || '?', r.x + r.w / 2, y + 2);
    ctx.textAlign = 'left';
    const lines = (arr, y0) => arr.forEach((l, i) => {
      ctx.font = `${l.abstract ? 'italic ' : ''}13px ${F.mono}`;
      ctx.fillText(l.text, r.x + m.PAD, y0 + 5 + m.LH * i + m.LH / 2);
    });
    lines(c.attrs, r.y + m.hh);
    lines(c.meths, r.y + m.hh + m.ah);
    ctx.restore();
  }

  function haloText(ctx, t, x, y, font) {
    if (!t) return;
    ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round';
    ctx.strokeText(t, x, y); ctx.fillStyle = INK; ctx.fillText(t, x, y);
  }

  function drawRels(ctx, rels, rects) {
    const pairCount = {};
    rels.forEach(r => {
      const ra = rects[r.a], rb = rects[r.b]; if (!ra || !rb || r.a === r.b) return;
      const k = [r.a, r.b].sort().join('|'); const n = pairCount[k] = (pairCount[k] || 0) + 1;
      const off = n === 1 ? 0 : (n % 2 ? 1 : -1) * Math.ceil((n - 1) / 2) * 16;
      const g = edge(ra, rb, off), d = decorate(g, r.type), L = labels(g, r.type);
      ctx.save();
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.setLineDash(d.dashed ? [8, 6] : []);
      ctx.beginPath(); ctx.moveTo(d.s.x, d.s.y); ctx.lineTo(d.e.x, d.e.y); ctx.stroke();
      ctx.setLineDash([]);
      d.shapes.forEach(sh => {
        ctx.beginPath(); sh.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        if (sh.closed) ctx.closePath();
        if (sh.fill !== 'none') { ctx.fillStyle = sh.fill === 'ink' ? INK : '#fff'; ctx.fill(); }
        ctx.stroke();
      });
      const fb = `800 13px ${F.body}`;
      if (r.type !== 'gen' && r.type !== 'real') {
        haloText(ctx, r.ma, L.ma.x, L.ma.y, fb);
        haloText(ctx, r.mb, L.mb.x, L.mb.y, fb);
        haloText(ctx, r.role, L.role.x, L.role.y, `italic 600 13px ${F.mono}`);
      }
      haloText(ctx, r.label, L.mid.x, L.mid.y, `italic 700 13px ${F.body}`);
      ctx.restore();
    });
  }

  function pageCanvas(w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    return { cv, ctx };
  }
  function header(ctx, W, meta, sub, title) {
    ctx.fillStyle = INK; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.font = `800 34px ${F.disp}`; ctx.fillText(title || meta.title, 60, 74);
    ctx.font = `700 17px ${F.body}`; ctx.fillStyle = '#5B5875'; ctx.fillText(sub, 60, 100);
    ctx.textAlign = 'right'; ctx.fillStyle = INK; ctx.font = `700 17px ${F.body}`;
    ctx.fillText(meta.student.name ? 'Ad Soyad: ' + meta.student.name : 'Ad Soyad: ……………………', W - 60, 66);
    ctx.fillText(meta.student.no ? 'Numara: ' + meta.student.no : 'Numara: …………', W - 60, 90);
    ctx.font = `600 14px ${F.body}`; ctx.fillStyle = '#5B5875';
    ctx.fillText(new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }), W - 60, 112);
    ctx.fillStyle = '#E2DDF2'; ctx.fillRect(60, 122, W - 120, 3);
  }
  function footer(ctx, W, H, txt) {
    ctx.textAlign = 'center'; ctx.font = `600 13px ${F.body}`; ctx.fillStyle = '#8A87A0'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(txt, W / 2, H - 28);
  }

  function diagramPage(meta) {
    const W = 1754, H = 1240;
    const { cv, ctx } = pageCanvas(W, H);
    header(ctx, W, meta, `${meta.week} · UML Sınıf Diyagramı · ${meta.classes.length} sınıf, ${meta.rels.length} ilişki`);
    const ms = {}, rects = {};
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    meta.classes.forEach(c => {
      const m = ms[c.id] = measure(ctx, c);
      rects[c.id] = { x: c.x, y: c.y, w: m.w, h: m.h };
      x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x + m.w); y1 = Math.max(y1, c.y + m.h);
    });
    const pad = 46;
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    const AX = 60, AY = 140, AW = W - 120, AH = H - 140 - 60;
    const s = Math.min(AW / (x1 - x0), AH / (y1 - y0), 1.7);
    ctx.save();
    ctx.translate(AX + (AW - (x1 - x0) * s) / 2, AY + (AH - (y1 - y0) * s) / 2);
    ctx.scale(s, s); ctx.translate(-x0, -y0);
    drawRels(ctx, meta.rels, rects);
    meta.classes.forEach(c => drawBox(ctx, c, rects[c.id], ms[c.id]));
    ctx.restore();
    footer(ctx, W, H, 'NYP Atölyesi · ' + meta.week + ' · UML diyagramı');
    return { cv, orient: 'landscape' };
  }

  function codePages(meta) {
    const W = 1240, H = 1754, LH = 25, TOP = 150, MAXC = 98;
    const rows = [];
    meta.code.replace(/\t/g, '    ').split('\n').forEach((ln, i) => {
      if (ln.length <= MAXC) rows.push([i + 1, ln]);
      else for (let k = 0; k < ln.length; k += MAXC) rows.push([k ? '' : i + 1, (k ? '  ↪ ' : '') + ln.slice(k, k + MAXC)]);
    });
    while (rows.length && !rows[rows.length - 1][1].trim()) rows.pop();
    const per = Math.floor((H - TOP - 80) / LH), pages = [];
    for (let p = 0; p * per < Math.max(rows.length, 1); p++) {
      const { cv, ctx } = pageCanvas(W, H);
      header(ctx, W, meta, `${meta.week} · Python kodu · sayfa ${p + 1}`);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      rows.slice(p * per, (p + 1) * per).forEach((r, i) => {
        const y = TOP + 8 + i * LH;
        ctx.font = `14px ${F.mono}`; ctx.fillStyle = '#A7A3BD'; ctx.textAlign = 'right'; ctx.fillText(String(r[0]), 104, y);
        ctx.textAlign = 'left';
        const t = r[1], hash = t.indexOf('#');
        const isCom = /^\s*#/.test(t);
        ctx.font = `15.5px ${F.mono}`;
        ctx.fillStyle = isCom ? '#8A87A0' : INK;
        ctx.fillText(t, 120, y);
        if (!isCom && hash > 0 && !/["']/.test(t.slice(0, hash))) {
          ctx.fillStyle = '#fff'; const w0 = ctx.measureText(t.slice(0, hash)).width;
          ctx.fillRect(120 + w0, y - 11, ctx.measureText(t.slice(hash)).width + 2, 22);
          ctx.fillStyle = '#8A87A0'; ctx.fillText(t.slice(hash), 120 + w0, y);
        }
      });
      footer(ctx, W, H, 'NYP Atölyesi · ' + meta.week + ' · Python kodu');
      pages.push({ cv, orient: 'portrait' });
    }
    return pages;
  }

  /* ---------------- öğrenci bilgisi penceresi ---------------- */
  function getStudent() { try { return JSON.parse(localStorage.getItem(STUDENT_KEY)) || {}; } catch (_) { return {}; } }
  function setStudent(s) { try { localStorage.setItem(STUDENT_KEY, JSON.stringify(s)); } catch (_) { /* yok */ } }

  function ask(hasCode) {
    return new Promise(resolve => {
      const st = getStudent();
      const ov = document.createElement('div');
      ov.className = 'modal'; ov.style.zIndex = 1300;
      ov.innerHTML = `<div class="modal-card pdf-card" role="dialog" aria-modal="true">
        <h3>📄 UML'yi PDF olarak al</h3>
        <p>Bilgilerin PDF'in başına yazılır (bu bilgisayarda hatırlanır).</p>
        <label class="pdf-f"><span>Ad Soyad</span><input id="pdf-name" value="${esc(st.name || '')}" autocomplete="name"></label>
        <label class="pdf-f"><span>Öğrenci No</span><input id="pdf-no" value="${esc(st.no || '')}" inputmode="numeric"></label>
        ${hasCode ? '<label class="pdf-c"><input type="checkbox" id="pdf-code" checked> Python kodumu da sonraki sayfalara ekle</label>' : ''}
        <div class="row"><button class="btn" data-x="0">Vazgeç</button><button class="btn lava" data-x="1">PDF indir</button></div></div>`;
      document.body.appendChild(ov);
      const done = ok => {
        const r = ok ? { name: ov.querySelector('#pdf-name').value.trim(), no: ov.querySelector('#pdf-no').value.trim(), code: hasCode && ov.querySelector('#pdf-code').checked } : null;
        if (r) setStudent({ name: r.name, no: r.no });
        ov.remove(); document.removeEventListener('keydown', key, true); resolve(r);
      };
      const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } if (e.key === 'Enter') { e.preventDefault(); done(true); } };
      document.addEventListener('keydown', key, true);
      ov.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (b) done(b.dataset.x === '1'); else if (e.target === ov) done(false); });
      ov.querySelector('#pdf-name').focus();
    });
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function slug(s) {
    return (String(s || '').toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) || 'ogrenci';
  }
  function download(href, name) {
    const a = document.createElement('a'); a.href = href; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------------- dışa aktar ---------------- */
  async function exportUML(model) {
    if (!model.classes.length) return { ok: false, msg: 'Diyagramda hiç sınıf yok.' };
    const who = await ask(!!(model.code && model.code.trim()));
    if (!who) return { ok: false, cancelled: true };
    try { await Promise.all([document.fonts.load(`13px ${F.mono}`), document.fonts.load(`800 17px ${F.body}`), document.fonts.load(`800 34px ${F.disp}`)]); } catch (_) { /* yedek font */ }
    const meta = Object.assign({}, model, { student: who });
    const pages = [diagramPage(meta)].concat(who.code ? codePages(meta) : []);
    const base = `${model.filename || 'uml'}-${slug(who.name)}`;
    try {
      const JsPDF = await loadLib();
      const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      pages.forEach((p, i) => {
        if (i) doc.addPage('a4', p.orient);
        const [w, h] = p.orient === 'landscape' ? [297, 210] : [210, 297];
        doc.addImage(p.cv.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, w, h);
      });
      doc.setProperties({ title: `${model.title} — ${who.name || ''}`, subject: model.week, creator: 'NYP Atölyesi' });
      doc.save(base + '.pdf');
      return { ok: true, pdf: true };
    } catch (_) {
      pages.forEach((p, i) => download(p.cv.toDataURL('image/png'), `${base}${pages.length > 1 ? '-' + (i + 1) : ''}.png`));
      return { ok: true, pdf: false, msg: 'PDF kütüphanesi yüklenemedi (internet?). Diyagram PNG resmi olarak indirildi.' };
    }
  }

  return { exportUML, geom: { edge, decorate, labels } };
})();
