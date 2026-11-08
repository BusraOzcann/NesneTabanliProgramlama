/* Ana sayfa ve hafta yönlendirmesi.
   Yeni bir haftanın simülasyonunu eklemek için: haftaN.js dosyasını yaz,
   index.html'e <section id="screen-wN"> ve <script> ekle, aşağıdaki SIMS'e bir satır ekle. */
(function () {
  'use strict';

  const CURRENT_WEEK = 8;
  const TOTAL_WEEKS = 14;
  const SIMS = {
    4: { screen: 'screen-w4', title: 'UML · Dino Vadisi', mount: el => window.Hafta4.mount(el), refresh: () => window.Hafta4.refresh() },
    5: { screen: 'screen-w5', title: 'İlişkiler · Vize Zindanı', mount: el => window.Hafta5.mount(el), refresh: () => window.Hafta5.refresh() },
    6: { screen: 'screen-w6', title: 'Enum · Masal Mahallesi', mount: el => window.Hafta6.mount(el), refresh: () => window.Hafta6.refresh() },
    7: { screen: 'screen-w7', title: 'Çok Biçimlilik · Kantin Express', mount: el => window.Hafta7.mount(el), refresh: () => window.Hafta7.refresh() },
    8: { screen: 'screen-w8', title: 'OOP + UML · Kronos Ajansı', mount: el => window.Hafta8.mount(el), refresh: () => window.Hafta8.refresh() }
  };

  const screens = () => Array.from(document.querySelectorAll('#screen-home, [id^="screen-w"]'));
  function show(id) {
    screens().forEach(s => { s.hidden = s.id !== id; });
    window.scrollTo(0, 0);
  }
  function setHash(h) {
    try { history.replaceState(null, '', h ? '#' + h : location.pathname + location.search); } catch (_) { location.hash = h; }
  }

  function openWeek(n) {
    const sim = SIMS[n];
    if (!sim) return;
    const el = document.getElementById(sim.screen);
    if (!el.dataset.mounted) { sim.mount(el); el.dataset.mounted = '1'; } else sim.refresh();
    show(sim.screen);
    setHash('hafta' + n);
  }
  function home() { show('screen-home'); setHash(''); }

  function renderWeeks() {
    const grid = document.getElementById('week-grid');
    let html = '';
    for (let n = 1; n <= TOTAL_WEEKS; n++) {
      if (SIMS[n]) {
        html += `<button class="week ${n === CURRENT_WEEK ? 'now' : 'open'}" data-week="${n}"><b>${n}</b><span>${n === CURRENT_WEEK ? 'Bu hafta · ' : ''}${SIMS[n].title}</span></button>`;
      } else if (n < CURRENT_WEEK) {
        html += `<div class="week past"><b>${n}</b><span>Simülasyon yok</span></div>`;
      } else {
        html += `<div class="week soon"><b>${n}</b><span>🔒 Yakında</span></div>`;
      }
    }
    grid.innerHTML = html;
    grid.addEventListener('click', e => {
      const b = e.target.closest('[data-week]');
      if (b) openWeek(+b.dataset.week);
    });
  }

  window.NYP = { home, openWeek };
  renderWeeks();
  document.getElementById('go-w8').addEventListener('click', () => openWeek(8));
  const art = document.getElementById('hero-art-w8');
  if (art && window.Hafta8) art.innerHTML = window.Hafta8.heroArt();
  function route() {
    const m = /^#hafta(\d+)$/.exec(location.hash);
    if (m && SIMS[+m[1]]) openWeek(+m[1]);
  }
  window.addEventListener('hashchange', route);
  route();

  // Öğretmen dosyası (ogretmen.js) yalnızca öğretmenin kendi kopyasında bulunur ve GitHub'a yüklenmez.
  // Yerelde (index.html / localhost) ya da adres ?ogretmen ile açıldığında yüklenmeye çalışılır.
  const local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (local || /[?&]ogretmen\b/.test(location.search)) {
    const s = document.createElement('script');
    s.src = 'ogretmen.js';
    s.onload = () => document.dispatchEvent(new CustomEvent('nyp-ogretmen'));
    s.onerror = () => s.remove();
    document.body.appendChild(s);
  }
})();
