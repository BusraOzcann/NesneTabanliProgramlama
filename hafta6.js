/* =========================================================================
   6. HAFTA — Masal Mahallesi: Enum, Sınıf, Nesne, Metot
   Üç aşama:
     1) Plan  — UML'yi yazarak çiz: «enumeration» kutuları, sınıflar, ilişkiler.
     2) Kod   — Python'u öğrenci yazar (tarayıcıda gerçek Python). Yazmayı
                bıraktığında kod kendiliğinden çalışır; sağdaki MAKET, üretilen
                nesneleri verdikleri değerlere göre canlı çizer.
     3) Sahne — mahalle kurulunca tüm sahne ve nesnelerin yazdığı hikâye açılır.
   Durum yalnızca bu sekme açıkken saklanır (sessionStorage).
   PDF: UML diyagramı + Python kodu + sahne. Öğrenci bilgisi istenmez.
   ========================================================================= */
window.Hafta6 = (function () {
  'use strict';

  /* ---------------- küçük yardımcılar ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const strip = s => String(s).replace(/<[^>]+>/g, '');
  function debounce(fn, ms) { let t; const f = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; f.cancel = () => clearTimeout(t); return f; }
  const fold = s => String(s || '').toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/i̇/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]/g, '');
  function rnd(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  /* =====================================================================
     VERİ
     ===================================================================== */
  const SAVE_KEY = 'nyp-hafta6-mahalle-v1';
  const CV_W = 2000, CV_H = 1400;
  const IDP = '[A-Za-zÇĞİÖŞÜçğıöşü_][A-Za-z0-9ÇĞİÖŞÜçğıöşü_]*';
  const RE_ATTR = new RegExp('^([+\\-−#~])?\\s*(' + IDP + ')\\s*(?::\\s*([^=]*?))?\\s*(?:=\\s*(.*))?$');
  const RE_METH = new RegExp('^([+\\-−#~])?\\s*(' + IDP + ')\\s*\\(([^)]*)\\)\\s*(?::\\s*(.*?))?\\s*$');
  const RE_LIT = /^([A-Za-zÇĞİÖŞÜçğıöşü_][A-Za-z0-9ÇĞİÖŞÜçğıöşü_]*)\s*(?:=.*)?$/;
  const RTYPES = {
    assoc: { name: 'İlişki', sym: '→', short: 'bilir / kullanır' },
    agg: { name: 'Toplama', sym: '◇', short: 'parça dışarıdan gelir, bütün olmadan da yaşar' },
    comp: { name: 'Bileşim', sym: '◆', short: 'parçayı bütün üretir, bütünle doğar ve ölür' }
  };
  const RT_ORDER = ['assoc', 'agg', 'comp'];
  const MULTS = ['', '1', '0..1', '0..*', '1..*'];

  const LEVELS = [
    {
      n: 1, title: 'Sabit Seçenekler', topic: 'Enum', icon: '🎨',
      brief: `<p><b>Muhtar Hüsnü'den not:</b> Hoş geldin mimar! Masal Mahallesi'ni birlikte kuracağız. Ama önce geçen yılın derdini dinle: herkes evinin rengini kendi yazdı. Biri <code>"mavi"</code>, biri <code>"Mavi"</code>, biri <code>"mavı"</code> yazdı. Boya ustası şaşırdı, bir ev pembeye boyandı! 😅</p>
<p>Bu yıl seçenekler <b>önceden belli</b> olacak:</p>
<ul>
<li><b>Renk</b>: mahallede kullanılabilecek renkler, en az <b>5</b> tane. Her rengin bir <i>adı</i> (<code>KIRMIZI</code>) ve bir <i>değeri</i> var: boya ustasının anladığı renk kodu <code>"#E5484D"</code>.</li>
<li><b>CatiTipi</b>: yalnızca üç çeşit çatı yapılabilir: <code>UCGEN</code>, <code>DUZ</code>, <code>KUBBE</code>. Değerleri önemli değil (1, 2, 3 ya da <code>auto()</code>).</li>
</ul>
<p>Önce 📐 <b>Plan</b>'da iki «enumeration» kutusu çiz, sonra ⌨️ <b>Kod</b>'da yaz. Renkleri yazdıkça maketin paletinde belirecekler.</p>
<p class="w6-q">🤔 Düşün: Renkleri neden metin (str) olarak değil de bir enum olarak tutuyoruz?</p>`,
      concept: `<b>Enum (numaralandırma)</b>, seçenekleri <u>önceden belli ve sınırlı</u> olan bir türdür: haftanın günleri, trafik ışığının renkleri, tişört bedenleri...
<ul><li>Enum bir <b>sınıftır</b>. İçindeki her <b>sabit</b> (KIRMIZI, MAVI...) o sınıfın <b>önceden üretilmiş bir nesnesidir</b>. Yeni nesne üretilmez, sabitler değiştirilemez.</li>
<li>Her sabitin bir adı (<code>Renk.MAVI.name</code> → <code>'MAVI'</code>) ve bir değeri (<code>Renk.MAVI.value</code> → <code>'#3D8BFF'</code>) vardır.</li>
<li><b>UML</b>: kutunun başında «enumeration», bölmede yalnızca sabit adları (tip ve + işareti yok).</li>
<li><b>Python</b>: <code>from enum import Enum</code> → <code>class Renk(Enum):</code> → <code>KIRMIZI = "#E5484D"</code>. Kullanırken: <code>Renk.KIRMIZI</code></li>
<li>Yanlış yazarsan (<code>Renk.MAVİ</code>) Python hemen hata verir. Metinde (<code>"mavı"</code>) ise hata sessizce geçer.</li></ul>`
    },
    {
      n: 2, title: 'Kalıp ve Ürün', topic: 'Sınıf + Nesne', icon: '🏠',
      brief: `<p><b>Muhtar'dan not:</b> Renkler hazır, sıra evlerde! Mahalledeki her ev aynı <b>kalıba</b> göre yapılır ama her evin değerleri farklıdır.</p>
<ul>
<li><b>Ev</b> sınıfının 4 özelliği var, hepsi herkese açık (+): <code>sahip</code> (evin sahibinin adı, str), <code>renk</code> (Renk), <code>kat</code> (kat sayısı, int, 1–5) ve <code>cati</code> (CatiTipi).</li>
<li>Ev üretilirken değerler bu sırayla verilir: <code>Ev("Ayşe", Renk.KIRMIZI, 3, CatiTipi.KUBBE)</code></li>
<li>Sonra Nesneler bölümünde <b>en az 3 komşu</b> için 3 farklı ev üret: renk, kat ya da çatı farklı olsun.</li>
</ul>
<p>Sağdaki makette gri bir <b>kalıp ev</b> göreceksin. Nesneyi ürettiğin anda kalıp, senin verdiğin değerlerle gerçek bir eve dönüşür.</p>
<p class="w6-q">🤔 Düşün: Ev sınıfı tek, ama 3 ev var. Bir evin rengi sınıfta mı, nesnede mi saklanıyor?</p>`,
      concept: `<b>Sınıf = kalıp, nesne = kalıptan çıkan ürün.</b> <code>class Ev</code> hangi özelliklerin olacağını söyler ama değer taşımaz. <code>Ev(...)</code> her çağrıldığında <b>yeni</b> bir nesne üretilir ve <code>__init__</code> çalışarak değerleri o nesneye yazar (<code>self.renk = renk</code>).<br>
<b>UML</b>: özellik satırı <code>+ renk: Renk</code>. Tipi bir enum olan özellik böyle yazılır.<br>
<b>Nesne gösterimi</b>: UML'de bir nesne <u>ayse_evi : Ev</u> diye altı çizili yazılır; maketteki kartlar gibi.`
    },
    {
      n: 3, title: 'Evler Değişiyor', topic: 'Metot + Durum', icon: '🛠️',
      brief: `<p><b>Muhtar'dan not:</b> Komşular boş durmuyor! Ayşe Hanım bir kat çıkmak, Mert boyacı çağırmak istiyor. Evlerin <b>davranışları</b> olmalı:</p>
<ul>
<li><code>kat_ekle()</code>: katı 1 artırır. Ama belediye kuralı: <b>5 kattan yüksek ev olmaz</b>. Kat 5 ise değişmez.</li>
<li><code>boya(yeni_renk)</code>: evin rengini verilen Renk ile değiştirir.</li>
<li><code>pencere_sayisi()</code>: her katta 2 pencere var. Toplam pencere sayısını <b>döndürür</b> (int).</li>
</ul>
<p>Kodladıktan sonra Nesneler bölümünde dene: <code>ayse_evi.kat_ekle()</code> ve <code>mert_evi.boya(Renk.YESIL)</code>. Makette evin büyüdüğünü ve boyandığını izle. Maketteki pencereleri artık senin <code>pencere_sayisi()</code> metodun çizecek!</p>
<p class="w6-q">🤔 Düşün: pencere_sayisi() içinde return yerine print yazarsan maket kaç pencere çizer?</p>`,
      concept: `<b>Metot</b>, nesnenin yapabildiği bir iştir. <code>ayse_evi.kat_ekle()</code> çağrısında Python <code>self</code> yerine <code>ayse_evi</code>'yi koyar; yani yalnızca O evin katı değişir. Özelliklerin o anki değerlerine nesnenin <b>durumu</b> denir; metotlar durumu değiştirebilir.<br>
<b>return ile print farkı:</b> <code>print</code> ekrana yazar ve biter. <code>return</code> sonucu çağıran yere geri verir. Maket sonucu kullanabilmek için return bekler.<br>
<b>UML</b>: <code>+ kat_ekle(): None</code> · <code>+ boya(yeni_renk: Renk): None</code> · <code>+ pencere_sayisi(): int</code>`
    },
    {
      n: 4, title: 'Mahalle Kuruluyor', topic: 'Nesneler birlikte', icon: '🌳',
      brief: `<p><b>Muhtar'dan not:</b> Evler hazır, sıra mahallede!</p>
<ul>
<li><b>Mevsim</b> enum'u: <code>ILKBAHAR</code>, <code>YAZ</code>, <code>SONBAHAR</code>, <code>KIS</code>. Mahallenin mevsimi tüm sahneyi değiştirecek.</li>
<li><b>Agac</b>: tek özelliği <code>boy</code> (int, 1–10). Örnek: <code>Agac(6)</code></li>
<li><b>Mahalle</b>: <code>ad</code> (str) ve <code>mevsim</code> (Mevsim) ile kurulur: <code>Mahalle("Papatya", Mevsim.KIS)</code>. Yeni kurulan mahallede ev ve ağaç yoktur.</li>
<li><code>ev_ekle(ev)</code>: <b>dışarıda</b> üretilmiş bir evi mahalleye katar. Ev mahalleden önce de vardı, mahalle olmasa da yaşar → <b>toplama</b> ◇.</li>
<li><code>agac_dik(boy)</code>: ağacı <b>mahallenin kendisi</b> üretir ve listesine koyar. Ağaç mahalleyle doğar → <b>bileşim</b> ◆.</li>
<li>UML'de evler ve ağaçlar özellik satırı olarak değil, <b>ilişki çizgisiyle</b> gösterilir: Ev ucunda çokluk <code>0..*</code> ve rol adı <code>evler</code>, Agac ucunda <code>0..*</code> ve <code>agaclar</code>.</li>
</ul>
<p>Son olarak mahalleni kur: en az <b>3 ev</b> ve <b>2 ağaç</b>. Bitince 🎬 <b>Sahne</b> açılacak!</p>`,
      concept: `<b>Nesneler birlikte çalışır.</b> Mahalle nesnesi ev nesnelerini bir <b>listede</b> tutar: <code>self.evler = []</code>. Listedeki her eleman gerçek bir Ev nesnesidir: <code>papatya.evler[0].sahip</code><br>
<b>Toplama ◇ ile bileşim ◆ kodda nasıl ayrılır?</b> Parçayı kim üretiyor? Dışarıdan geliyorsa (<code>ev_ekle(ev)</code>) toplama. Bütün kendi içinde üretiyorsa (<code>agac_dik</code> içinde <code>Agac(boy)</code>) bileşim.<br>
<b>Enum'un gücü:</b> sahne <code>mahalle.mevsim</code> değerine bakar. <code>Mevsim.KIS</code> verirsen kar yağar. Yalnızca dört seçenek olduğu için sahne hepsini tanır.`
    },
    {
      n: 5, title: 'Masal Başlıyor', topic: 'Sahne + PDF', icon: '🎬',
      brief: `<p><b>Muhtar'dan not:</b> Tebrikler mimar, Masal Mahallesi hazır! 🎉</p>
<ul><li>🎬 <b>Sahne</b> sekmesini aç: mahallen seçtiğin mevsimle canlanıyor. Altındaki hikâyeyi senin nesnelerin yazdı; her cümle bir özelliğin değeri.</li>
<li>İstersen Kod'a dönüp mevsimi, renkleri ya da kat sayılarını değiştir; sahne de değişir.</li>
<li>Son olarak 📄 <b>PDF</b>'i indir: UML diyagramın, kodun ve sahnen.</li></ul>`,
      concept: `Bu hafta: <b>enum</b> (sabit seçenekler), <b>sınıf</b> (kalıp), <b>nesne</b> (ürün), <code>__init__</code>, <b>metot</b> ve <b>durum</b>, nesneleri bir arada tutan nesne. Hepsi tek bir sahnede.`
    }
  ];

  const MODE_ICON = { d: '📐', c: '⌨️', q: '🎯', s: '🎬', p: '📄' };
  const MISSIONS = [
    // 1 · Enum
    { id: 'u1', lv: 1, mode: 'd', text: 'Plan\'da «enumeration» <b>Renk</b> (en az 5 renk) ve <b>CatiTipi</b> (UCGEN, DUZ, KUBBE) kutularını çiz.', ok: () => all(() => needEnum('Renk', [], 5), () => needEnum('CatiTipi', ['UCGEN', 'DUZ', 'KUBBE'])) },
    { id: 'k1', lv: 1, mode: 'c', text: '<b>Renk</b> enum\'unu Python\'da yaz. Her rengin değeri <code>"#RRGGBB"</code> biçiminde bir renk kodu olsun.', ok: () => all(umlFirst('u1'), () => tests('renk'), () => litsMatch('Renk')) },
    { id: 'k2', lv: 1, mode: 'c', text: '<b>CatiTipi</b> enum\'unu Python\'da yaz.', ok: () => all(umlFirst('u1'), () => tests('cati')) },
    { id: 'q1', lv: 1, mode: 'q', text: '🎯 <b>Enum Testi</b>: 5 sorudan en az 4 doğru.', ok: () => (S.quizBest >= 4 ? true : `En iyi skorun: ${S.quizBest}/5`) },
    // 2 · Sınıf + Nesne
    { id: 'u2', lv: 2, mode: 'd', text: 'Plan\'a <b>Ev</b> sınıfını çiz: 4 özelliği tipleriyle.', ok: () => all(() => needClass('Ev'), () => needAttr('Ev', 'sahip', 'str'), () => needAttr('Ev', 'renk', 'Renk'), () => needAttr('Ev', 'kat', 'int'), () => needAttr('Ev', 'cati', 'CatiTipi')) },
    { id: 'k3', lv: 2, mode: 'c', text: '<b>Ev</b> sınıfını ve <code>__init__</code> metodunu yaz: <code>Ev(sahip, renk, kat, cati)</code>', ok: () => all(umlFirst('u2'), () => tests('ev')) },
    { id: 'k4', lv: 2, mode: 'c', text: 'Nesneler bölümünde en az <b>3 farklı Ev</b> nesnesi üret ve maketi izle.', ok: () => all(umlFirst('u2'), () => tests('nesneler')) },
    // 3 · Metot
    { id: 'u3', lv: 3, mode: 'd', text: 'Ev\'e <b>3 metodu</b> parametre ve dönüş tipleriyle ekle.', ok: () => all(() => needMeth('Ev', 'kat_ekle', [], 'None'), () => needMeth('Ev', 'boya', ['Renk'], 'None'), () => needMeth('Ev', 'pencere_sayisi', [], 'int')) },
    { id: 'k5', lv: 3, mode: 'c', text: '<code>kat_ekle()</code> ve <code>boya()</code> metotlarını yaz. Nesneler bölümünde bir evin katını artır, bir evi boya.', ok: () => all(umlFirst('u3'), () => tests('metot'), () => calls('kat_ekle'), () => calls('boya')) },
    { id: 'k6', lv: 3, mode: 'c', text: '<code>pencere_sayisi()</code> metodunu yaz. Maketteki pencereleri artık bu metot çiziyor!', ok: () => all(umlFirst('u3'), () => tests('pencere')) },
    // 4 · Mahalle
    { id: 'u4', lv: 4, mode: 'd', text: '<b>Mevsim</b>, <b>Agac</b> ve <b>Mahalle</b>\'yi çiz. Mahalle\'den Ev\'e toplama ◇, Agac\'a bileşim ◆ çizgisi çek.', ok: () => all(() => needEnum('Mevsim', ['ILKBAHAR', 'YAZ', 'SONBAHAR', 'KIS']), () => needClass('Agac'), () => needAttr('Agac', 'boy', 'int'), () => needClass('Mahalle'), () => needAttr('Mahalle', 'ad', 'str'), () => needAttr('Mahalle', 'mevsim', 'Mevsim'), () => needMeth('Mahalle', 'ev_ekle', ['Ev'], 'None'), () => needMeth('Mahalle', 'agac_dik', ['int'], 'None'), () => needRel('Mahalle', 'Ev', 'agg', '0..*', 'evler'), () => needRel('Mahalle', 'Agac', 'comp', '0..*', 'agaclar')) },
    { id: 'k7', lv: 4, mode: 'c', text: '<b>Mevsim</b>, <b>Agac</b> ve <b>Mahalle</b>\'yi kodla.', ok: () => all(umlFirst('u4'), () => tests('mevsim', 'mahalle')) },
    { id: 'k8', lv: 4, mode: 'c', text: 'Mahalleni kur: en az <b>3 ev</b>, <b>2 ağaç</b> ve bir mevsim. 🎬 Sahne açılır!', ok: () => all(umlFirst('u4'), () => tests('kurulum')) },
    // 5 · Sahne
    { id: 's1', lv: 5, mode: 's', text: '🎬 <b>Sahne</b>\'yi aç: mahallen ve nesnelerinin yazdığı hikâye.', ok: () => (S.events.scene ? true : 'Üstteki 🎬 Sahne sekmesine tıkla.') },
    { id: 'p1', lv: 5, mode: 'p', text: '📄 <b>PDF</b>\'i indir: UML + kod + sahne.', ok: () => (S.events.pdf ? true : 'Üstteki 📄 PDF düğmesine tıkla.') }
  ];

  const QUIZ_HEAD = `class Renk(Enum):
    KIRMIZI = "#E5484D"
    MAVI = "#3D8BFF"
    SARI = "#FFC53D"`;
  const QUIZ = [
    { c: 'print(Renk.MAVI.name)', o: ['MAVI', '#3D8BFF', 'Renk.MAVI', 'Hata verir'], a: 0, why: '.name sabitin adını metin olarak verir.' },
    { c: 'print(Renk.MAVI.value)', o: ['MAVI', '#3D8BFF', 'Renk.MAVI', '1'], a: 1, why: '.value sabite verdiğin değerdir: renk kodu.' },
    { c: 'print(isinstance(Renk.MAVI, Renk))', o: ['True', 'False', 'Hata verir', 'MAVI'], a: 0, why: 'Her enum sabiti, o enum sınıfının önceden üretilmiş bir nesnesidir.' },
    { c: 'print(len(Renk))', o: ['1', '3', '6', 'Hata verir'], a: 1, why: 'Enum üzerinde len() sabit sayısını verir: 3.' },
    { c: 'print(Renk.MAVI == "#3D8BFF")', o: ['True', 'False', 'Hata verir', 'MAVI'], a: 1, why: 'Sabit ile değeri aynı şey değildir. Değerle karşılaştırmak için Renk.MAVI.value yazılır.' },
    { c: 'print(Renk("#3D8BFF"))', o: ['Renk.MAVI', '#3D8BFF', 'Yeni bir renk üretir', 'Hata verir'], a: 0, why: 'Renk(değer) yeni nesne üretmez; o DEĞERE sahip sabiti bulur.' },
    { c: 'print(Renk["SARI"])', o: ['Renk.SARI', '#FFC53D', 'SARI', 'Hata verir'], a: 0, why: 'Renk["AD"] sabiti adıyla bulur.' },
    { c: 'Renk.MAVI = "#000000"', o: ['MAVI siyah olur', 'Yeni bir sabit eklenir', 'Hata verir', 'Hiçbir şey olmaz'], a: 2, why: 'Enum sabitleri değiştirilemez; Python AttributeError verir.' },
    { c: 'print(Renk.MOR)', o: ['Renk.MOR', 'None', 'Hata verir', 'MOR'], a: 2, why: 'MOR tanımlı değil. Enum yazım hatalarını böyle hemen yakalar.' },
    { c: 'for r in Renk:\n    print(r.name, end=" ")', o: ['KIRMIZI MAVI SARI', '#E5484D #3D8BFF #FFC53D', '0 1 2', 'Hata verir'], a: 0, why: 'Enum üzerinde for ile gezinilir; sabitler tanım sırasıyla gelir.' },
    { c: 'print(Renk.KIRMIZI is Renk.KIRMIZI)', o: ['True', 'False', 'Hata verir', 'KIRMIZI'], a: 0, why: 'Her sabitin programda tek bir kopyası vardır; bu yüzden enum karşılaştırmasında is de kullanılabilir.' },
    { c: 'class Boy(Enum):\n    KISA = 1\n    MINI = 1\n    UZUN = 2\nprint(len(Boy))', o: ['3', '2', '1', 'Hata verir'], a: 1, why: 'MINI ile KISA aynı değerde. Python MINI\'yi yeni sabit saymaz, KISA\'nın takma adı (alias) yapar.' }
  ];

  const CARDS = [
    { k: 'enum', t: 'Enum tanımlamak', code: `from enum import Enum

class Gun(Enum):
    PAZARTESI = 1
    SALI = 2
    CARSAMBA = 3

print(Gun.SALI)          # Gun.SALI
print(Gun.SALI.name)     # SALI
print(Gun.SALI.value)    # 2`, note: 'Sabit adları BÜYÜK HARFLE ve Türkçe karakter olmadan yazılır.' },
    { k: 'auto', t: 'Değer önemli değilse: auto()', code: `from enum import Enum, auto

class Beden(Enum):
    S = auto()      # 1
    M = auto()      # 2
    L = auto()      # 3`, note: 'auto() her sabite sırayla farklı bir değer verir.' },
    { k: 'sinif', t: 'Sınıf ve __init__', code: `class Kupa:
    def __init__(self, sahip, hacim):
        self.sahip = sahip
        self.hacim = hacim

k1 = Kupa("Ece", 300)      # nesne üret
k2 = Kupa("Can", 450)      # başka bir nesne
print(k1.sahip, k2.hacim)`, note: 'Parametreleri self.ozellik içine yazmayı unutma.' },
    { k: 'enumpar', t: 'Enum\'u özellik olarak kullanmak', code: `class Tisort:
    def __init__(self, sahip, beden):
        self.sahip = sahip
        self.beden = beden       # bir Beden sabiti

t = Tisort("Ece", Beden.M)
if t.beden is Beden.M:
    print("Orta beden")`, note: 'Değer olarak metin değil, enum sabiti ver: Beden.M' },
    { k: 'metot', t: 'Durumu değiştiren metot ve return', code: `class Termometre:
    def __init__(self, derece):
        self.derece = derece

    def isit(self):
        if self.derece < 100:     # sınır kuralı
            self.derece += 10

    def fahrenhayt(self):
        return self.derece * 9 / 5 + 32

t = Termometre(20)
t.isit()
print(t.fahrenhayt())`, note: 'print ekrana yazar; return sonucu geri verir.' },
    { k: 'liste', t: 'Liste tutan sınıf: toplama ve bileşim', code: `class Kitaplik:
    def __init__(self, ad):
        self.ad = ad
        self.kitaplar = []      # dışarıdan gelenler
        self.raflar = []        # kitaplığın kendi ürettikleri

    def kitap_ekle(self, kitap):
        self.kitaplar.append(kitap)      # toplama ◇

    def raf_tak(self, no):
        self.raflar.append(Raf(no))      # bileşim ◆`, note: 'Listeyi __init__ içinde oluştur, sınıfın gövdesinde değil.' },
    { k: 'nesne', t: 'Nesneleri birbirine bağlamak', code: `kitaplik = Kitaplik("Ev")
kitaplik.kitap_ekle(Kitap("Küçük Prens"))
kitaplik.raf_tak(1)

for k in kitaplik.kitaplar:
    print(k.ad)

print(kitaplik.kitaplar[0].ad)    # nokta zinciri`, note: 'Listedeki her eleman gerçek bir nesnedir.' }
  ];

  const STARTER = `# 🏘️ Masal Mahallesi — senin Python kodun
# UML'de çizdiğin her şeyi burada koda çevir.
# Yazmayı bıraktığında kod kendiliğinden çalışır ve sağdaki MAKET canlanır.
# Kod Kartları'ndaki örnekler başka konulardan; kendi sınıflarına UYARLAMAN gerekiyor. 😉

from enum import Enum, auto


# ---- Enum'lar (sabit seçenekler) ----



# ---- Sınıflar ----



# ---- Nesneler (mahalleni burada kur) ----

`;

  /* =====================================================================
     DURUM
     ===================================================================== */
  const fresh = () => ({
    v: 1, uml: { classes: [], rels: [] }, code: STARTER, mode: 'plan', defter: true, jlv: null,
    zoom: 1, done: {}, events: {}, maxLevel: 1, finished: false, tests: {}, analysis: null, snap: null,
    quizBest: 0, intro: false, mkTab: 'maket', cardOpen: 'enum', live: true, letterClosed: {}
  });
  let S = load() || fresh();
  const T = { drag: null, hints: {}, runBusy: false, teacherOk: false, sel: null, prev: {}, flash: null, stale: false, runQueued: false };
  let root = null, VER = 0, MC = null, MCV = -1;

  function load() {
    try { const t = sessionStorage.getItem(SAVE_KEY); return t ? Object.assign(fresh(), JSON.parse(t)) : null; } catch (_) { return null; }
  }
  function saveNow() { try { sessionStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (_) { /* depolama yoksa sorun değil */ } }
  const save = debounce(saveNow, 300);
  function touch() { VER++; }

  /* =====================================================================
     UML MODELİ
     ===================================================================== */
  const normVis = v => (v === '−' ? '-' : v || '');
  function parseAttr(s) {
    if (/\(/.test(s)) return { cls: 'bad', err: 'Bu bir metot gibi görünüyor; metotlar alttaki bölmeye yazılır.' };
    const m = RE_ATTR.exec(s);
    if (!m) return { cls: 'bad', err: 'Biçim: + ad: tip   (ör. + kat: int)' };
    const vis = normVis(m[1]), type = (m[3] || '').trim();
    const warn = !vis ? 'Görünürlük işareti eksik: başına + koy.' : !type ? 'Tip eksik: + kat: int gibi yaz.' : '';
    return { ok: true, vis, name: m[2], type, cls: warn ? 'warn' : 'ok', err: warn };
  }
  function parseMeth(s) {
    const m = RE_METH.exec(s);
    if (!m) return { cls: 'bad', err: /\(/.test(s) ? 'Parantezleri kontrol et: + boya(yeni_renk: Renk): None' : 'Metot parantezle yazılır: + kat_ekle(): None' };
    const params = m[3].split(',').map(p => p.trim()).filter(Boolean).map(p => { const x = /^([^:]+?)\s*(?::\s*(.+))?$/.exec(p); return { name: x ? x[1].trim() : p, type: x && x[2] ? x[2].trim() : '' }; });
    const vis = normVis(m[1]), ret = (m[4] || '').trim();
    const warn = !vis ? 'Görünürlük işareti eksik: başına + koy.' : !ret ? 'Dönüş tipi eksik: sonuna : None ya da : int ekle.' : params.some(p => !p.type) ? 'Parametrenin tipi eksik: (yeni_renk: Renk)' : '';
    return { ok: true, vis, name: m[2], params, ret, cls: warn ? 'warn' : 'ok', err: warn };
  }
  function parseLit(s) {
    if (/[:()+]/.test(s) || /^[-#~−]/.test(s)) return { cls: 'bad', err: 'Enum sabitine tip, + ya da parantez yazılmaz. Sadece adını yaz: KIRMIZI' };
    const m = RE_LIT.exec(s);
    if (!m) return { cls: 'bad', err: 'Geçersiz sabit adı.' };
    const up = /^[A-Z][A-Z0-9_]*$/.test(m[1]);
    return { ok: true, name: m[1], cls: up ? 'lit' : 'warn', err: up ? '' : 'Enum sabitleri BÜYÜK HARFLE ve Türkçe karakter olmadan yazılır (MAVI, YESIL).' };
  }
  function parseLine(kind, sec, t) {
    const s = String(t || '').trim();
    if (!s) return { empty: true, cls: '' };
    if (kind === 'enum') return parseLit(s);
    return sec === 'attrs' ? parseAttr(s) : parseMeth(s);
  }
  function M() {
    if (MC && MCV === VER) return MC;
    const classes = S.uml.classes.map(c => {
      const attrs = c.attrs.map(t => parseLine(c.kind, 'attrs', t));
      const meths = c.kind === 'enum' ? [] : c.meths.map(t => parseLine(c.kind, 'meths', t));
      return { id: c.id, kind: c.kind, name: (c.name || '').trim(), raw: c, attrs, meths, lits: c.kind === 'enum' ? attrs.filter(p => p.ok).map(p => p.name) : [] };
    });
    const byId = {}; classes.forEach(c => { byId[c.id] = c; });
    const rels = S.uml.rels.filter(r => byId[r.a] && byId[r.b]);
    MC = { classes, byId, rels }; MCV = VER;
    return MC;
  }
  const clsByName = n => M().classes.find(c => c.name === n) || M().classes.find(c => fold(c.name) === fold(n));
  const normMult = m => { const s = String(m || '').replace(/\s/g, ''); return s === '*' ? '0..*' : s === '1..1' ? '1' : s; };

  /* ---------------- görev kontrolleri ---------------- */
  function all(...xs) { for (const x of xs) { const r = typeof x === 'function' ? x() : x; if (r !== true) return r; } return true; }
  function needEnum(name, req, min) {
    const c = clsByName(name);
    if (!c) return `Plan'da ${name} adında bir kutu yok. Araç çubuğundan «enum» ekle ve adını ${name} yap.`;
    if (c.name !== name) return `Kutunun adı tam olarak ${name} olmalı (şu an: ${c.name}).`;
    if (c.kind !== 'enum') return `${name} bir «enumeration» kutusu olmalı. Bu kutuyu silip araç çubuğundan «enum» ile yeniden ekle.`;
    const bad = c.attrs.find(p => p.cls === 'bad' || p.cls === 'warn');
    if (bad) return `${name}: ${bad.err}`;
    const miss = (req || []).filter(x => !c.lits.includes(x));
    if (miss.length) return `${name} kutusunda eksik sabit: ${miss.join(', ')}`;
    if (min && c.lits.length < min) return `${name} kutusunda ${c.lits.length} sabit var; en az ${min} olmalı.`;
    return true;
  }
  function needClass(name) {
    const c = clsByName(name);
    if (!c) return `Plan'da ${name} adında bir sınıf yok.`;
    if (c.name !== name) return `Sınıfın adı tam olarak ${name} olmalı (şu an: ${c.name}).`;
    if (c.kind !== 'class') return `${name} bir sınıf olmalı, enum değil.`;
    return true;
  }
  const sameType = (a, b) => fold(a) === fold(b);
  function needAttr(cn, an, type) {
    const c = clsByName(cn); if (!c) return `${cn} kutusu yok.`;
    const a = c.attrs.find(p => p.ok && p.name === an);
    if (!a) return `${cn} kutusunda ${an} özelliği yok. Yaz: + ${an}: ${type}`;
    if (a.vis !== '+') return `${cn}.${an} herkese açık olmalı: başına + koy.`;
    if (!sameType(a.type, type)) return `${cn}.${an} tipini kontrol et: ${type} olmalı${a.type ? ` (şu an: ${a.type})` : ''}.`;
    return true;
  }
  function needMeth(cn, mn, ptypes, ret) {
    const c = clsByName(cn); if (!c) return `${cn} kutusu yok.`;
    const m = c.meths.find(p => p.ok && p.name === mn);
    const sig = `+ ${mn}(${ptypes.map((t, i) => (mn === 'boya' ? 'yeni_renk' : mn === 'ev_ekle' ? 'ev' : mn === 'agac_dik' ? 'boy' : 'p' + i) + ': ' + t).join(', ')}): ${ret}`;
    if (!m) return `${cn} kutusunun metot bölmesinde ${mn} yok. Yaz: ${sig}`;
    if (m.vis !== '+') return `${cn}.${mn}() herkese açık olmalı: başına + koy.`;
    if (m.params.length !== ptypes.length) return `${mn}() ${ptypes.length ? ptypes.length + ' parametre' : 'parametresiz'} olmalı: ${sig}  (self UML'ye yazılmaz)`;
    for (let i = 0; i < ptypes.length; i++) if (!sameType(m.params[i].type, ptypes[i])) return `${mn}() parametresinin tipi ${ptypes[i]} olmalı: ${sig}`;
    if (!sameType(m.ret, ret)) return `${mn}() dönüş tipi ${ret} olmalı: ${sig}`;
    return true;
  }
  function needRel(an, bn, type, mb, role) {
    const m = M(), a = clsByName(an), b = clsByName(bn);
    if (!a || !b) return `${an} ve ${bn} kutuları olmalı.`;
    const rs = m.rels.filter(r => (r.a === a.id && r.b === b.id) || (r.a === b.id && r.b === a.id));
    if (!rs.length) return `${an} ile ${bn} arasında ilişki yok. 🔗 İlişki düğmesiyle ekle.`;
    const r = rs.find(x => x.type === type);
    if (!r) return `${an}–${bn} ilişkisinin türü ${RTYPES[type].name} ${RTYPES[type].sym} olmalı.`;
    if (r.a !== a.id) return `${RTYPES[type].sym} ${an} ucunda olmalı: "Bütün" ${an}, "Parça" ${bn}.`;
    if (normMult(r.mb) !== mb) return `${bn} ucundaki çokluk ${mb} olmalı: bir ${an}'nin kaç ${bn} nesnesi olabilir?`;
    if (fold(r.role) !== fold(role)) return `${bn} ucundaki rol adı ${role} olmalı (kodda self.${role} listesi olacak).`;
    return true;
  }
  const umlFirst = id => () => (S.done[id] ? true : 'Önce 📐 Plan\'da bu seviyenin UML görevini bitir.');
  function tests(...ids) {
    for (const k of ids) {
      const t = S.tests[k];
      if (!t) return 'Kodu çalıştır (yazmayı bırakınca kendiliğinden çalışır).';
      if (!t[0]) return t[1];
    }
    return true;
  }
  function litsMatch(name) {
    const u = clsByName(name), c = S.analysis && S.analysis.classes && S.analysis.classes[name];
    if (!u || !c) return true;
    const miss = u.lits.filter(l => !c.lits.includes(l));
    return miss.length ? `UML'deki ${name} sabitleri kodda yok: ${miss.join(', ')}. Diyagram ile kod aynı olmalı.` : true;
  }
  function calls(meth) {
    const re = new RegExp('^[A-Za-zÇĞİÖŞÜçğıöşü_][\\wÇĞİÖŞÜçğıöşü]*(\\.[\\wÇĞİÖŞÜçğıöşü]+|\\[\\d+\\])*\\.' + meth + '\\(', 'm');
    return re.test(S.code) ? true : `Nesneler bölümünde (girintisiz bir satırda) ${meth}() metodunu bir ev üzerinde çağır: ornek_evi.${meth}(${meth === 'boya' ? 'Renk.YESIL' : ''})`;
  }

  /* =====================================================================
     İSKELET
     ===================================================================== */
  const ICON = {
    house: '<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><path d="M6 19 L20 7 L34 19" fill="#E2553F" stroke="#26303F" stroke-width="2.5" stroke-linejoin="round"/><rect x="10" y="18" width="20" height="16" fill="#FFC53D" stroke="#26303F" stroke-width="2.5"/><rect x="17" y="24" width="6" height="10" fill="#26303F"/></svg>',
    cls: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9 H21 M3 14 H21" stroke="currentColor" stroke-width="2"/></svg>',
    enm: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="3" y="4" width="18" height="16" rx="2" fill="#FFF3C4" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="12" r="2" fill="#E5484D"/><circle cx="12" cy="12" r="2" fill="#3D8BFF"/><circle cx="16" cy="12" r="2" fill="#46A758"/></svg>',
    rel: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 12 L6.5 9 L10 12 L6.5 15 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 12 H21" stroke="currentColor" stroke-width="2"/></svg>'
  };
  function relIcon(t) {
    const line = `<line x1="${t === 'assoc' ? 3 : 24}" y1="9" x2="58" y2="9" stroke="currentColor" stroke-width="2"/>`;
    let s = '';
    if (t === 'agg' || t === 'comp') s += `<path d="M3 9 L13.5 3.5 L24 9 L13.5 14.5 Z" fill="${t === 'comp' ? 'currentColor' : '#fff'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`;
    if (t === 'assoc') s += '<path d="M47 3 L59 9 L47 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>';
    return `<svg class="w6-ricon" viewBox="0 0 62 18" width="62" height="18" aria-hidden="true">${line}${s}</svg>`;
  }

  function shellHTML() {
    return `
    <header class="w6-top">
      <button class="btn" data-act="home">← Haftalar</button>
      <div class="w6-brand"><span class="w6-logo">${ICON.house}</span><div><small>6. Hafta · Enum, Sınıf, Nesne</small><b>Masal Mahallesi</b></div></div>
      <nav class="w6-modes" id="w6-modes" aria-label="Aşamalar"></nav>
      <div class="w6-prog" id="w6-prog"></div>
      <div class="w6-tact">
        <button class="btn" data-act="pdf" id="w6-pdf">📄 PDF</button>
        <div class="w6-menu">
          <button class="btn" data-act="menu" aria-haspopup="true" title="Diğer">☰</button>
          <div class="w6-menu-pop" id="w6-menu" hidden>
            <button data-act="guide">📘 Enum nedir?</button>
            <button data-act="quiz">🎯 Enum Testi</button>
            <button data-act="help">❓ Nasıl çalışır?</button>
            <hr>
            <button data-act="teacher" id="w6-tbtn" hidden>👩‍🏫 Öğretmen</button>
            <button data-act="reset" class="danger">↺ Her şeyi sıfırla</button>
          </div>
        </div>
      </div>
    </header>
    <div class="w6-body" id="w6-body">
      <aside class="w6-defter" id="w6-defter" aria-label="Muhtar'ın defteri"></aside>
      <button class="w6-dtab" data-act="defter" id="w6-dt" title="Defteri aç/kapat"></button>
      <main class="w6-work">
        <section class="w6-view w6-plan" id="w6-v-plan" hidden>${planShell()}</section>
        <section class="w6-view w6-code" id="w6-v-code" hidden>${codeShell()}</section>
        <section class="w6-view w6-scene" id="w6-v-scene" hidden></section>
      </main>
      <aside class="w6-maket" id="w6-maket" aria-label="Maket">
        <div class="w6-mtabs" id="w6-mtabs" role="tablist"></div>
        <div class="w6-mbody" id="w6-mbody"></div>
      </aside>
    </div>`;
  }

  function renderAll() { renderTop(); renderDefter(); renderMode(); renderMaket(); }

  const sceneOpen = () => !!S.done.k8 || T.teacherOk;
  const pdfLeft = () => MISSIONS.filter(m => m.id !== 'p1' && !S.done[m.id]).length;
  function renderTop() {
    const modes = [['plan', '1', 'Plan', 'UML'], ['code', '2', 'Kod', 'Python'], ['scene', '3', 'Sahne', 'Mahalle']];
    $('#w6-modes').innerHTML = modes.map(([k, n, t, s]) => {
      const locked = k === 'scene' && !sceneOpen();
      return `<button class="w6-mode ${S.mode === k ? 'on' : ''} ${locked ? 'locked' : ''}" data-act="mode" data-m="${k}" ${S.mode === k ? 'aria-current="page"' : ''}>
        <i>${locked ? '🔒' : n}</i><span><b>${t}</b><small>${locked ? 'mahalle kurulunca' : s}</small></span></button>`;
    }).join('');
    const d = MISSIONS.filter(m => S.done[m.id]).length;
    $('#w6-prog').innerHTML = `<div class="w6-houses" title="Her görev bir ev: bitince ışığı yanar">${MISSIONS.map(m => `<i class="${S.done[m.id] ? 'on' : ''}"></i>`).join('')}</div><small>${d} / ${MISSIONS.length} görev</small>`;
    $('#w6-dt').innerHTML = S.defter ? '‹' : '📒<span>Defter</span>';
    $('#w6-body').classList.toggle('d-off', !S.defter);
    $('#w6-body').classList.toggle('s-on', S.mode === 'scene');
    const left = pdfLeft(), pb = $('#w6-pdf');
    pb.classList.toggle('w6-locked', left > 0 && !T.teacherOk);
    pb.innerHTML = left > 0 && !T.teacherOk ? '🔒 PDF' : '📄 PDF';
    pb.title = left > 0 ? `PDF tüm görevler bitince açılır (${left} görev kaldı)` : 'UML, kod ve sahneyi PDF olarak indir';
  }

  function renderDefter() {
    const lvN = S.jlv && S.jlv <= S.maxLevel ? S.jlv : S.maxLevel;
    const L = LEVELS[lvN - 1];
    const pills = LEVELS.map(x => {
      const ms = MISSIONS.filter(m => m.lv === x.n), d = ms.filter(m => S.done[m.id]).length;
      const st = x.n > S.maxLevel ? 'lock' : d === ms.length ? 'done' : 'open';
      return `<button class="w6-lvp ${st} ${x.n === lvN ? 'on' : ''}" data-act="jlv" data-lv="${x.n}" title="${x.n}. ${x.title} · ${x.topic}" ${st === 'lock' ? 'aria-disabled="true"' : ''}>
        <span>${st === 'lock' ? '🔒' : st === 'done' ? '✓' : x.icon}</span><small>${x.n}</small></button>`;
    }).join('');
    const ms = MISSIONS.filter(m => m.lv === lvN);
    const d = ms.filter(m => S.done[m.id]).length;
    $('#w6-defter').innerHTML = `
      <div class="w6-lvps">${pills}</div>
      <div class="w6-dhead"><span class="w6-dn">${L.icon}</span><div><small>${lvN}. Seviye · ${L.topic}</small><h2>${L.title}</h2></div><span class="w6-dc">${d}/${ms.length}</span></div>
      <div class="w6-dscroll">
        <details class="w6-note" ${S.letterClosed[lvN] ? '' : 'open'} data-lv="${lvN}"><summary>📌 Muhtar'ın notu</summary><div class="w6-note-b">${L.brief}</div></details>
        <details class="w6-concept" open><summary>💡 Kavram</summary><div>${L.concept}</div></details>
        <ul class="w6-ms">${ms.map(m => {
          const ok = !!S.done[m.id], h = !ok && T.hints[m.id];
          return `<li class="${ok ? 'ok' : ''} ${T.flash === m.id ? 'flash' : ''}">
            <span class="w6-ck">${ok ? '✓' : MODE_ICON[m.mode]}</span>
            <div><span class="tx">${m.text}</span>${h && typeof h === 'string' ? `<span class="w6-hint">${esc(h)}</span>` : ''}</div></li>`;
        }).join('')}</ul>
      </div>
      <div class="w6-dfoot"><button class="btn" data-act="guide">📘 Enum nedir?</button><button class="btn" data-act="quiz">🎯 Enum Testi</button></div>`;
    T.flash = null;
  }

  function renderMode() {
    if (S.mode === 'scene' && !sceneOpen()) S.mode = 'code';
    ['plan', 'code', 'scene'].forEach(k => { $('#w6-v-' + k).hidden = S.mode !== k; });
    root.dataset.mode = S.mode;
    if (S.mode === 'plan') renderPlan();
    else if (S.mode === 'code') renderCode();
    else renderScene();
  }
  function setMode(m) {
    if (m === 'scene' && !sceneOpen()) { toast('🎬 Sahne, mahalleni kurunca açılır (4. seviyenin son görevi).', 'info'); return; }
    if (S.mode === m) return;
    S.mode = m; save();
    renderTop(); renderMode(); renderMaket();
    if (m === 'scene' && !S.events.scene) { S.events.scene = true; save(); evaluate(); }
  }

  /* =====================================================================
     GÖREV DEĞERLENDİRME
     ===================================================================== */
  const evalSoon = debounce(() => evaluate(), 220);
  function safeOk(m) { try { return m.ok(); } catch (e) { return 'Kontrol edilemedi.'; } }
  function evaluate(quiet) {
    let changed = false, lvUp = null;
    const newly = [];
    for (let guard = 0; guard < 8; guard++) {
      MISSIONS.forEach(m => {
        if (m.lv > S.maxLevel || S.done[m.id]) return;
        const r = safeOk(m);
        if (r === true) { S.done[m.id] = true; newly.push(m); changed = true; T.flash = m.id; delete T.hints[m.id]; }
        else T.hints[m.id] = r;
      });
      if (S.maxLevel < LEVELS.length && MISSIONS.filter(m => m.lv === S.maxLevel).every(m => S.done[m.id])) {
        S.maxLevel++; S.jlv = null; changed = true; lvUp = S.maxLevel; continue;
      }
      break;
    }
    if (!quiet) newly.forEach(m => { const t = strip(m.text); toast('🏠 Görev tamam · ' + (t.length > 72 ? t.slice(0, 70) + '…' : t), 'star'); });
    if (!S.finished && MISSIONS.every(m => S.done[m.id])) { S.finished = true; changed = true; if (!quiet) setTimeout(finale, 900); }
    if (changed) { saveNow(); renderTop(); }
    renderDefter();
    if (lvUp && !quiet) setTimeout(() => levelUp(LEVELS[lvUp - 1]), newly.length ? 500 : 0);
  }
  function levelUp(L) {
    confetti();
    const extra = L.n === 5 ? '<p>🎬 <b>Sahne</b> açıldı! Üstteki sekmeden mahalleni görebilirsin.</p>' : '';
    modal(`<div class="w6-lvup-art">${L.icon}</div><span class="tag">Seviye ${L.n} açıldı</span><h3>${L.title}</h3><p class="w6-lvup-topic">${L.topic}</p><div class="w6-lvup-c">${L.concept}</div>${extra}<p>Defterde Muhtar'ın yeni notu seni bekliyor. 📌</p>`,
      [{ label: 'Notu oku', cls: 'w6-go', fn: () => { S.defter = true; S.jlv = null; save(); renderTop(); renderDefter(); } }]);
  }
  function finale() {
    confetti(); setTimeout(confetti, 700);
    modal(`<div class="w6-lvup-art">🏘️</div><span class="tag">${MISSIONS.length} / ${MISSIONS.length} görev</span><h3>Masal Mahallesi kuruldu!</h3>
      <p>Enum ile seçenekleri sınırladın, sınıfla kalıbı çizdin, her nesneye kendi değerlerini verdin, metotlarla evleri değiştirdin ve hepsini bir mahallede topladın.</p>
      <p>Gelecek hafta bu mahalleye yeni sınıflar ekleyeceğiz. 😉</p>`, [{ label: 'Harika!', cls: 'w6-go' }]);
  }

  /* =====================================================================
     MODAL / TOAST / KONFETİ
     ===================================================================== */
  function ensureGlobals() {
    if (!$('#nyp-modal')) {
      const m = document.createElement('div'); m.className = 'modal'; m.id = 'nyp-modal'; m.hidden = true;
      m.innerHTML = '<div class="modal-card" id="nyp-modal-card" role="dialog" aria-modal="true"></div>';
      document.body.appendChild(m);
    }
    if (!$('#nyp-toasts')) { const t = document.createElement('div'); t.className = 'toasts'; t.id = 'nyp-toasts'; t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
  }
  function modal(html, buttons, cls) {
    const m = $('#nyp-modal'), card = $('#nyp-modal-card');
    card.className = 'modal-card ' + (cls || 'w6m');
    card.innerHTML = html + (buttons && buttons.length ? `<div class="row">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-mb="${i}">${b.label}</button>`).join('')}</div>` : '');
    m.hidden = false;
    card.onclick = e => {
      const b = e.target.closest('[data-mb]');
      if (b) { const B = buttons[+b.dataset.mb]; if (!B.keep) closeModal(); if (B.fn) B.fn(); return; }
      if (card._extra) card._extra(e);
    };
    card._extra = null;
    const btns = card.querySelectorAll('.row .btn');
    const risky = buttons && buttons.length && buttons[buttons.length - 1].cls === 'lava';
    const f = risky ? btns[0] : btns[btns.length - 1];
    if (f) f.focus({ preventScroll: true });
    return card;
  }
  function closeModal() { const m = $('#nyp-modal'); m.hidden = true; const c = $('#nyp-modal-card'); c._extra = null; c.className = 'modal-card'; }
  function toast(text, kind, ms) {
    const box = $('#nyp-toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = text;
    box.appendChild(t);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms || 3200);
  }
  function confetti() {
    const cols = ['#2E6FD8', '#FFC53D', '#E2553F', '#46A758', '#8E4EC6', '#F76B15'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('div');
      p.className = 'confetti';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = pick(cols);
      p.style.animationDuration = 1.8 + Math.random() * 1.4 + 's';
      p.style.animationDelay = Math.random() * 0.4 + 's';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 3800);
    }
  }

  /* =====================================================================
     REHBER, YARDIM, TEST
     ===================================================================== */
  function guide() {
    modal(`<h3>📘 Enum nedir?</h3>
      <p class="w6-sub">Değerleri <b>önceden belli ve sınırlı</b> olan bir türdür. Haftanın günleri, trafik ışığı, tişört bedenleri... Seçenekler bellidir, dışarıdan yenisi uydurulamaz.</p>
      <div class="w6-tbl"><table>
        <tr><th></th><th>Metin (str) ile</th><th>Enum ile</th></tr>
        <tr><th>Tanım</th><td><code>renk = "mavi"</code></td><td><code>class Renk(Enum):</code><br><code>&nbsp;&nbsp;&nbsp;&nbsp;MAVI = "#3D8BFF"</code></td></tr>
        <tr><th>Yazım hatası</th><td><code>"mavı"</code> sessizce geçer 😬</td><td><code>Renk.MAVİ</code> → hemen hata ✅</td></tr>
        <tr><th>Seçenekleri görmek</th><td>bilinmez</td><td><code>for r in Renk: print(r.name)</code></td></tr>
        <tr><th>Ek bilgi taşımak</th><td>ayrı bir değişken gerekir</td><td><code>Renk.MAVI.value</code> → renk kodu</td></tr>
      </table></div>
      <h4>Enum sabiti bir nesnedir</h4>
      <ul class="w6-faq">
        <li><code>Renk</code> bir sınıftır; <code>Renk.MAVI</code> ise o sınıfın <b>önceden üretilmiş</b> bir nesnesidir: <code>isinstance(Renk.MAVI, Renk)</code> → <code>True</code>.</li>
        <li>Her sabitin adı ve değeri vardır: <code>Renk.MAVI.name</code> → <code>'MAVI'</code>, <code>Renk.MAVI.value</code> → <code>'#3D8BFF'</code></li>
        <li>Sabite iki yoldan ulaşılır: adıyla <code>Renk["MAVI"]</code>, değeriyle <code>Renk("#3D8BFF")</code>.</li>
        <li>Sabitler değiştirilemez ve yenisi üretilemez. Aynı değeri iki sabite verirsen ikincisi yeni sabit olmaz, birincinin <b>takma adı</b> (alias) olur.</li>
        <li>Değer önemli değilse <code>auto()</code> kullan: <code>UCGEN = auto()</code></li>
      </ul>
      <h4>UML'de</h4>
      <div class="w6-umlmini"><div class="h"><small>«enumeration»</small><b>Renk</b></div><div class="s">KIRMIZI<br>MAVI<br>SARI</div></div>
      <p class="w6-sub">Bölmeye yalnızca sabit adları yazılır: tip, + işareti ya da değer yazılmaz. Ev'in özelliği ise <code>+ renk: Renk</code> diye yazılır: tipi enum'un adıdır.</p>
      <h4>Sınıf ve nesne</h4>
      <p class="w6-sub"><b>Sınıf</b> kalıptır: hangi özelliklerin olacağını söyler. <b>Nesne</b> o kalıptan üretilen üründür ve kendi değerlerini taşır. Maketteki gri ev kalıptır; <code>Ev(...)</code> yazdığın anda ondan renkli bir ev çıkar.</p>`, [{ label: 'Anladım', cls: 'w6-go' }], 'w6m wide');
  }
  function help() {
    modal(`<h3>🏘️ Masal Mahallesi'ne hoş geldin!</h3>
      <p>Bu hafta kendi mahalleni kuracaksın. Görevler soldaki <b>📒 Defter</b>'de; asıl tarif <b>Muhtar'ın notu</b>nda.</p>
      <ol class="w6-steps">
        <li><b>📐 Plan</b> — UML'yi <i>yazarak</i> çiz. Araç çubuğundan <b>Sınıf</b> ya da <b>«enum»</b> ekle, satırlara UML biçiminde yaz:<br>
          <code>+ kat: int</code> · <code>+ boya(yeni_renk: Renk): None</code> · enum kutusunda yalnızca <code>KIRMIZI</code><br>
          <kbd>Enter</kbd> yeni satır, boş satırda <kbd>⌫</kbd> satırı siler. Kutuyu başlığından tutup taşıyabilirsin.</li>
        <li><b>⌨️ Kod</b> — Python'u <i>sen</i> yazarsın. Yazmayı bıraktığında kod kendiliğinden çalışır ve sağdaki <b>Maket</b> canlanır: ürettiğin her nesne, verdiğin değerlerle çizilir.</li>
        <li><b>🎬 Sahne</b> — mahallen kurulunca açılır: tüm evler, ağaçlar, mevsim ve nesnelerinin yazdığı hikâye.</li>
      </ol>
      <p class="w6-sub">Her seviyede önce UML, sonra kod. Sayfayı yenilersen kaldığın yerden devam edersin; ama <b>sekmeyi kapatırsan her şey silinir</b>. Tüm görevler bitince <b>📄 PDF</b> açılır: UML diyagramın, kodun ve sahnen.</p>`,
    [{ label: 'Başlayalım!', cls: 'w6-go', fn: () => { if (!S.intro) { S.intro = true; save(); } } }], 'w6m wide');
  }
  function quiz() {
    const qs = shuffle(QUIZ).slice(0, 5).map(q => {
      const order = shuffle(q.o.map((t, i) => i));
      return { c: q.c, o: order.map(i => q.o[i]), a: order.indexOf(q.a), why: q.why };
    });
    const Q = { qs, i: 0, score: 0, picked: null };
    const draw = () => {
      if (Q.i >= Q.qs.length) {
        const best = Math.max(S.quizBest, Q.score), rec = Q.score > S.quizBest;
        S.quizBest = best; save(); evaluate();
        const msg = Q.score === 5 ? 'Enum ustası! 🏅' : Q.score >= 4 ? 'Görev tamam! 🎯' : Q.score >= 3 ? 'Az kaldı, bir daha dene!' : '📘 Enum nedir? sayfasına bir göz at, sonra tekrar dene.';
        if (Q.score >= 4) confetti();
        return modal(`<div class="w6-qend"><div class="w6-qscore">${Q.score}<small>/5</small></div><h3>${msg}</h3><p>${rec ? 'Yeni rekor!' : 'En iyi skorun: ' + best + '/5'}</p></div>`,
          [{ label: 'Kapat' }, { label: 'Tekrar dene', cls: 'w6-go', fn: quiz }], 'w6m');
      }
      const q = Q.qs[Q.i], P = Q.picked;
      const card = modal(`<div class="w6-qtop"><span>🎯 Enum Testi</span><span>Soru ${Q.i + 1}/5 · ✓ ${Q.score}</span></div>
        <div class="w6-qbar"><i style="width:${Q.i * 20}%"></i></div>
        <p class="w6-qask">Bu enum tanımlıyken alttaki kod ne yapar?</p>
        <pre class="w6-qcode"><span class="dim">${esc(QUIZ_HEAD)}</span>\n\n${esc(q.c)}</pre>
        <div class="w6-qopts">${q.o.map((o, i) => {
          const st = P == null ? '' : i === q.a ? 'right' : i === P ? 'wrong' : 'dim';
          return `<button class="w6-qo ${st}" data-qo="${i}" ${P != null ? 'disabled' : ''}><b class="mono">${esc(o)}</b></button>`;
        }).join('')}</div>
        ${P != null ? `<div class="w6-qwhy ${P === q.a ? 'ok' : 'no'}">${P === q.a ? '✓ Doğru!' : '✗ Olmadı.'} ${esc(q.why)}</div>` : ''}`,
      P != null ? [{ label: Q.i === 4 ? 'Sonucu gör' : 'Sonraki →', cls: 'w6-go', keep: true, fn: () => { Q.i++; Q.picked = null; draw(); } }] : [{ label: 'Bırak' }], 'w6m quiz');
      card._extra = e => {
        const b = e.target.closest('[data-qo]'); if (!b || Q.picked != null) return;
        Q.picked = +b.dataset.qo; if (Q.picked === q.a) Q.score++;
        draw();
      };
    };
    draw();
  }

  /* =====================================================================
     ÖĞRETMEN, SIFIRLAMA, PDF
     ===================================================================== */
  const OGR = () => window.NYP_OGRETMEN || null;
  function example() {
    const o = OGR();
    try { return o && o.hafta6 ? JSON.parse(decodeURIComponent(escape(atob(o.hafta6)))) : null; } catch (_) { return null; }
  }
  function teacher() {
    if (!T.teacherOk) {
      const card = modal(`<h3>👩‍🏫 Öğretmen</h3><p>Bu panel ders anlatımı içindir. Öğretmen kodunu gir.</p>
        <input type="password" id="w6-pin" class="w6-in" autocomplete="off" placeholder="öğretmen kodu">`,
      [{ label: 'Vazgeç' }, { label: 'Giriş', cls: 'w6-go', keep: true, fn: () => {
        if (OGR() && $('#w6-pin').value.trim() === OGR().pin) { T.teacherOk = true; renderTop(); teacher(); }
        else { $('#w6-pin').value = ''; $('#w6-pin').classList.add('bad'); toast('Kod yanlış.', 'bad'); }
      } }]);
      const i = $('#w6-pin', card); i.focus();
      i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); card.querySelector('.row .btn:last-child').click(); } });
      return;
    }
    modal(`<h3>👩‍🏫 Öğretmen paneli</h3><p>Derste göstermek için kısayollar. Öğrenciler kendi bilgisayarında sıfırdan başlar.</p>
      <ul><li><b>Tüm seviyeleri aç</b>: çalışma korunur; Sahne ve PDF de açılır.</li><li><b>Örnek UML</b>: çözüm diyagramını yükler (mevcut diyagram silinir).</li><li><b>Örnek kod</b>: çözüm Python kodunu yükler (mevcut kod silinir).</li></ul>`,
    [{ label: 'Kapat' },
      { label: 'Tüm seviyeleri aç', fn: () => { S.maxLevel = LEVELS.length; saveNow(); evaluate(true); renderAll(); toast('Tüm seviyeler açıldı.', 'good'); } },
      { label: 'Örnek UML', fn: () => { const x = example(); if (!x || !x.uml) return toast('Örnek bulunamadı.', 'bad'); S.uml = JSON.parse(JSON.stringify(x.uml)); S.maxLevel = LEVELS.length; touch(); saveNow(); evaluate(true); renderAll(); setTimeout(fitView, 60); toast('Örnek UML yüklendi.', 'good'); } },
      { label: 'Örnek kod', cls: 'w6-go', fn: () => { const x = example(); if (!x || !x.code) return toast('Örnek bulunamadı.', 'bad'); S.code = x.code; S.maxLevel = LEVELS.length; saveNow(); if (ED.ta) setCode(S.code); renderAll(); runCode(true); toast('Örnek kod yüklendi.', 'good'); } }], 'w6m wide');
  }
  function resetAll() {
    modal('<h3>Her şey sıfırlansın mı?</h3><p>Diyagram, kod ve tamamlanan görevler silinir.</p>',
      [{ label: 'Vazgeç' }, { label: 'Sıfırla', cls: 'lava', fn: () => { S = fresh(); S.intro = true; T.hints = {}; T.prev = {}; T.sel = null; touch(); saveNow(); if (ED.ta) setCode(S.code); clearOut(); renderAll(); toast('Mahalle sıfırlandı. Renk ile başla!', 'info'); } }]);
  }
  function exportPdf() {
    const left = pdfLeft();
    if (left > 0 && !T.teacherOk) {
      modal(`<div class="w6-lvup-art">🔒</div><h3>PDF henüz kilitli</h3><p>PDF <b>tüm görevler bitince</b> açılır. Sana <b>${left}</b> görev kaldı.</p><p class="w6-sub">PDF'te UML diyagramın, Python kodun ve mahallenin sahnesi yer alacak.</p>`, [{ label: 'Tamam', cls: 'w6-go' }]);
      return;
    }
    const m = M();
    if (!m.classes.length) { toast('Önce Plan\'a sınıf ekle.', 'info'); return; }
    if (!window.NYPPdf) { toast('PDF modülü yüklenemedi.', 'bad'); return; }
    const pretty = t => t.trim().replace(/^-/, '−');
    const classes = m.classes.map(c => ({
      id: c.id, name: c.name || '?', stereo: c.kind === 'enum' ? 'enumeration' : null, abstract: false, x: c.raw.x, y: c.raw.y,
      attrs: c.raw.attrs.filter(t => t.trim()).map(t => ({ text: pretty(t) })),
      meths: c.kind === 'enum' ? [] : c.raw.meths.filter(t => t.trim()).map(t => ({ text: pretty(t) }))
    }));
    const rels = m.rels.map(r => ({ a: r.a, b: r.b, type: r.type, ma: (r.ma || '').trim(), mb: (r.mb || '').trim(), role: (r.role || '').trim() }));
    const mv = mahalleView();
    const scene = mv ? { svg: sceneSVG(mv, { w: 1200, h: 600, still: true }), story: story(mv), title: `${mahalleAdi(mv.ad)} · Sahne` } : null;
    NYPPdf.exportUML({ title: 'Masal Mahallesi · UML Sınıf Diyagramı', week: '6. Hafta', classes, rels, code: S.code, scene, plain: true, filename: 'masal-mahallesi' }).then(r => {
      if (!r.ok) { if (!r.cancelled) toast(r.msg || 'PDF oluşturulamadı.', 'bad'); return; }
      toast(r.pdf ? '📄 PDF indirildi!' : r.msg, r.pdf ? 'good' : 'info', 4600);
      if (!S.events.pdf) { S.events.pdf = true; save(); evaluate(); }
    });
  }

  /* =====================================================================
     1) PLAN — UML tuvali
     ===================================================================== */
  function planShell() {
    return `
      <div class="w6-ptools">
        <button class="w6-tool" data-act="addcls">${ICON.cls}<span>Sınıf</span></button>
        <button class="w6-tool enum" data-act="addenum">${ICON.enm}<span>«enum»</span></button>
        <button class="w6-tool" data-act="addrel">${ICON.rel}<span>İlişki</span></button>
        <span class="w6-ptip">Satırlara UML biçiminde yaz: <code>+ kat: int</code> · <code>+ boya(yeni_renk: Renk): None</code> · enum'da yalnızca <code>KIRMIZI</code> · <kbd>Enter</kbd> yeni satır</span>
        <div class="w6-zoom"><button data-act="zout" title="Uzaklaştır">−</button><span id="w6-zv">100%</span><button data-act="zin" title="Yakınlaştır">+</button><button data-act="zfit">Sığdır</button></div>
      </div>
      <div class="w6-cv" id="w6-cv"><div class="w6-cvsize" id="w6-cvsize"><div class="w6-cvin" id="w6-cvin">
        <svg class="w6-edges" id="w6-edges" width="${CV_W}" height="${CV_H}"></svg>
        <div id="w6-boxes"></div>
        <div class="w6-empty" id="w6-empty">📐 Boş plan. Yukarıdan <b>«enum»</b> ekleyerek başla: ilk kutun <b>Renk</b> olsun.</div>
      </div></div></div>
      <div class="w6-rels" id="w6-rels"></div>`;
  }
  function boxWidth(c) {
    const lines = [c.name || ''].concat(c.attrs, c.kind === 'enum' ? [] : c.meths);
    const L = Math.max(14, ...lines.map(t => String(t).length));
    return clamp(Math.round(L * 8.4 + 44), 200, 460);
  }
  function lineHTML(c, sec, i) {
    const t = c[sec][i], p = parseLine(c.kind, sec, t);
    const ph = c.kind === 'enum' ? 'SABIT_ADI' : sec === 'attrs' ? '+ ozellik: tip' : '+ metot(param: tip): dönüş';
    return `<input class="w6-ln ${p.cls}" data-cid="${c.id}" data-sec="${sec}" data-i="${i}" value="${esc(t)}" placeholder="${ph}" spellcheck="false" autocomplete="off" title="${esc(p.err || '')}">`;
  }
  function secHTML(c, sec, label) {
    return `<div class="w6-sec" data-sec="${sec}">${c[sec].map((_, i) => lineHTML(c, sec, i)).join('')}<button class="w6-addln" data-act="addln" data-cid="${c.id}" data-sec="${sec}" tabindex="-1">+ ${label}</button></div>`;
  }
  function boxHTML(c) {
    const en = c.kind === 'enum';
    return `<div class="w6-box ${en ? 'enum' : ''} ${T.sel === c.id ? 'sel' : ''}" data-cid="${c.id}" style="left:${c.x}px;top:${c.y}px;width:${boxWidth(c)}px">
      <div class="w6-bh" data-drag="${c.id}" title="Başlıktan tutup taşı">${en ? '<small>«enumeration»</small>' : ''}
        <input class="w6-bname" data-cid="${c.id}" value="${esc(c.name)}" placeholder="${en ? 'EnumAdı' : 'SinifAdi'}" spellcheck="false" autocomplete="off">
        <button class="w6-bx" data-act="delcls" data-cid="${c.id}" title="Kutuyu sil" tabindex="-1">×</button></div>
      ${secHTML(c, 'attrs', en ? 'sabit' : 'özellik')}
      ${en ? '' : secHTML(c, 'meths', 'metot')}
    </div>`;
  }
  function renderPlan() {
    $('#w6-boxes').innerHTML = S.uml.classes.map(boxHTML).join('');
    $('#w6-empty').hidden = S.uml.classes.length > 0;
    applyZoom();
    drawEdges(); renderRels();
  }
  const boxEl = id => $(`.w6-box[data-cid="${id}"]`, root);
  const cls = id => S.uml.classes.find(c => c.id === id);
  function refreshBox(id, focus) {
    const c = cls(id), el = boxEl(id); if (!c || !el) return;
    el.outerHTML = boxHTML(c);
    if (focus) {
      const inp = focus.sec ? $(`.w6-ln[data-cid="${id}"][data-sec="${focus.sec}"][data-i="${focus.i}"]`, root) : $(`.w6-bname[data-cid="${id}"]`, root);
      if (inp) { inp.focus(); const n = focus.caret != null ? focus.caret : inp.value.length; inp.setSelectionRange(n, n); }
    }
    drawEdges();
  }
  function applyZoom() {
    const z = S.zoom || 1;
    $('#w6-cvin').style.transform = `scale(${z})`;
    $('#w6-cvsize').style.width = CV_W * z + 'px';
    $('#w6-cvsize').style.height = CV_H * z + 'px';
    $('#w6-zv').textContent = Math.round(z * 100) + '%';
  }
  function setZoom(z) { S.zoom = clamp(Math.round(z * 100) / 100, 0.4, 1.6); save(); applyZoom(); }
  function fitView() {
    const cv = $('#w6-cv'); if (!cv || !S.uml.classes.length) return;
    let x1 = 0, y1 = 0;
    S.uml.classes.forEach(c => { const el = boxEl(c.id); x1 = Math.max(x1, c.x + (el ? el.offsetWidth : 240)); y1 = Math.max(y1, c.y + (el ? el.offsetHeight : 200)); });
    setZoom(Math.min(1.2, (cv.clientWidth - 30) / (x1 + 40), (cv.clientHeight - 30) / (y1 + 40)));
    cv.scrollLeft = 0; cv.scrollTop = 0;
  }
  function freeSpot() {
    const taken = S.uml.classes.map(c => { const el = boxEl(c.id); return { x: c.x, y: c.y, w: el ? el.offsetWidth : 240, h: el ? el.offsetHeight : 200 }; });
    for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) {
      const x = 40 + col * 330, y = 40 + row * 300;
      if (!taken.some(r => x < r.x + r.w + 30 && x + 260 > r.x - 30 && y < r.y + r.h + 30 && y + 220 > r.y - 30)) return { x, y };
    }
    return { x: 60 + S.uml.classes.length * 20, y: 60 + S.uml.classes.length * 20 };
  }
  function createClass(kind) {
    const p = freeSpot();
    const c = { id: 'c' + uid(), kind, name: '', x: p.x, y: p.y, attrs: [''], meths: [''] };
    S.uml.classes.push(c); T.sel = c.id; touch(); save();
    renderPlan();
    const inp = $(`.w6-bname[data-cid="${c.id}"]`, root);
    if (inp) { inp.focus({ preventScroll: true }); inp.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    evalSoon();
  }
  function deleteClass(id) {
    const c = cls(id); if (!c) return;
    const go = () => { S.uml.classes = S.uml.classes.filter(x => x.id !== id); S.uml.rels = S.uml.rels.filter(r => r.a !== id && r.b !== id); touch(); save(); renderPlan(); evalSoon(); renderMaket(); };
    const filled = c.name.trim() || c.attrs.some(t => t.trim()) || c.meths.some(t => t.trim());
    if (!filled) return go();
    modal(`<h3>${esc(c.name || 'Bu kutu')} silinsin mi?</h3><p>Kutunun satırları ve bağlı ilişkileri silinir.</p>`, [{ label: 'Vazgeç' }, { label: 'Sil', cls: 'lava', fn: go }]);
  }
  function rectOf(id) { const el = boxEl(id); return el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null; }
  function drawEdges() {
    const svg = $('#w6-edges'); if (!svg || !window.NYPPdf) return;
    const G = NYPPdf.geom, pairs = {};
    let out = '';
    M().rels.forEach(r => {
      const ra = rectOf(r.a), rb = rectOf(r.b); if (!ra || !rb) return;
      const k = [r.a, r.b].sort().join('|'); const n = pairs[k] = (pairs[k] || 0) + 1;
      const off = n === 1 ? 0 : (n % 2 ? 1 : -1) * Math.ceil((n - 1) / 2) * 16;
      const g = G.edge(ra, rb, off), d = G.decorate(g, r.type), L = G.labels(g, r.type);
      const shapes = d.shapes.map(sh => `<path d="M${sh.pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')}${sh.closed ? ' Z' : ''}" fill="${sh.fill === 'ink' ? '#26303F' : sh.fill === 'paper' ? '#fff' : 'none'}" stroke="#26303F" stroke-width="2" stroke-linejoin="round"/>`).join('');
      const lab = (t, p, c) => (t ? `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" class="${c}">${esc(t)}</text>` : '');
      out += `<g class="w6-edge" data-rid="${r.id}"><line class="hit" x1="${d.s.x}" y1="${d.s.y}" x2="${d.e.x}" y2="${d.e.y}"/><line x1="${d.s.x}" y1="${d.s.y}" x2="${d.e.x}" y2="${d.e.y}" stroke="#26303F" stroke-width="2"/>${shapes}${lab(r.ma, L.ma, 'm')}${lab(r.mb, L.mb, 'm')}${lab(r.role, L.role, 'r')}</g>`;
    });
    svg.innerHTML = out;
  }
  function relText(r) {
    const a = cls(r.a), b = cls(r.b);
    return `<b>${esc((a && a.name) || '?')}</b> ${RTYPES[r.type].sym} <b>${esc((b && b.name) || '?')}</b>${r.mb ? ` <span class="m">${esc(r.mb)}</span>` : ''}${r.role ? ` <i>${esc(r.role)}</i>` : ''}`;
  }
  function renderRels() {
    const el = $('#w6-rels'); if (!el) return;
    const rs = M().rels;
    el.innerHTML = `<span class="lbl">🔗 İlişkiler:</span>${rs.length ? rs.map(r => `<button class="w6-rchip" data-act="editrel" data-rid="${r.id}">${relText(r)}</button>`).join('') : '<span class="none">henüz yok · 4. seviyede gerekecek</span>'}`;
  }
  function relSentence(an, bn, type, mb, role) {
    const A = an || '?', B = bn || '?', k = mb ? `${mb} ` : '';
    if (type === 'agg') return `Bir ${A}, ${k}${B} nesnesini <b>toplar</b>${role ? ` (self.${role})` : ''}. ${B} dışarıda üretilir; ${A} olmadan da yaşar.`;
    if (type === 'comp') return `Bir ${A}, ${k}${B} nesnesinden <b>oluşur</b>${role ? ` (self.${role})` : ''}. ${B} nesnelerini ${A} kendisi üretir; ${A} ile doğar, onunla yok olur.`;
    return `${A}, ${k}${B} nesnesini <b>bilir</b>${role ? ` (self.${role})` : ''}.`;
  }
  function relForm(r) {
    const editing = !!r;
    r = r || { a: '', b: '', type: 'agg', ma: '', mb: '0..*', role: '' };
    const opts = sel => M().classes.filter(c => c.name).map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}${c.kind === 'enum' ? ' «enum»' : ''}</option>`).join('');
    if (M().classes.filter(c => c.name).length < 2) { toast('İlişki için adı yazılmış en az iki kutu gerekir.', 'info'); return; }
    const mopt = (v) => MULTS.map(x => `<option value="${x}" ${normMult(v) === x ? 'selected' : ''}>${x || '(boş)'}</option>`).join('');
    const card = modal(`<h3>🔗 ${editing ? 'İlişkiyi düzenle' : 'Yeni ilişki'}</h3>
      <div class="w6-rtypes">${RT_ORDER.map(t => `<label class="${r.type === t ? 'on' : ''}"><input type="radio" name="rft" value="${t}" ${r.type === t ? 'checked' : ''}>${relIcon(t)}<b>${RTYPES[t].name}</b><small>${RTYPES[t].short}</small></label>`).join('')}</div>
      <div class="w6-rf">
        <label><span id="rf-al">Bütün</span><select id="rf-a"><option value="">seç…</option>${opts(r.a)}</select></label>
        <label><span id="rf-bl">Parça</span><select id="rf-b"><option value="">seç…</option>${opts(r.b)}</select></label>
        <label><span>Çokluk (bütün ucu)</span><select id="rf-ma">${mopt(r.ma)}</select></label>
        <label><span>Çokluk (parça ucu)</span><select id="rf-mb">${mopt(r.mb)}</select></label>
        <label class="wide"><span>Rol adı (parça ucu = koddaki liste adı)</span><input id="rf-role" value="${esc(r.role)}" placeholder="ör. evler" spellcheck="false"></label>
      </div>
      <p class="w6-rsent" id="rf-sent"></p>`,
    [{ label: 'Vazgeç' }].concat(editing ? [{ label: 'Sil', cls: 'lava', fn: () => { S.uml.rels = S.uml.rels.filter(x => x.id !== r.id); touch(); save(); drawEdges(); renderRels(); evalSoon(); } }] : [])
      .concat([{ label: 'Kaydet', cls: 'w6-go', keep: true, fn: () => {
        const v = read();
        if (!v.a || !v.b) return toast('İki kutuyu da seç.', 'info');
        if (v.a === v.b) return toast('Bir kutu kendisiyle ilişkilendirilemez.', 'info');
        if (editing) Object.assign(S.uml.rels.find(x => x.id === r.id), v);
        else S.uml.rels.push(Object.assign({ id: 'r' + uid() }, v));
        closeModal(); touch(); save(); drawEdges(); renderRels(); evalSoon();
      } }]), 'w6m wide');
    const read = () => ({ a: $('#rf-a', card).value, b: $('#rf-b', card).value, type: (card.querySelector('input[name="rft"]:checked') || {}).value || 'assoc', ma: $('#rf-ma', card).value, mb: $('#rf-mb', card).value, role: $('#rf-role', card).value.trim() });
    const upd = () => {
      const v = read(), n = id => (cls(id) || {}).name;
      $$('.w6-rtypes label', card).forEach(l => l.classList.toggle('on', l.querySelector('input').checked));
      $('#rf-al', card).textContent = v.type === 'assoc' ? 'Bilen sınıf' : 'Bütün';
      $('#rf-bl', card).textContent = v.type === 'assoc' ? 'Bilinen sınıf' : 'Parça';
      $('#rf-sent', card).innerHTML = '📖 ' + relSentence(n(v.a), n(v.b), v.type, v.mb, v.role);
    };
    card.addEventListener('change', upd); card.addEventListener('input', upd); upd();
  }

  /* ---- tuval olayları ---- */
  function onPlanInput(e) {
    const t = e.target;
    if (t.classList.contains('w6-bname')) {
      const c = cls(t.dataset.cid); if (!c) return;
      c.name = t.value; touch(); save();
      const el = boxEl(c.id); if (el) el.style.width = boxWidth(c) + 'px';
      drawEdges(); renderRels(); evalSoon(); renderMaketSoon();
    } else if (t.classList.contains('w6-ln')) {
      const c = cls(t.dataset.cid); if (!c) return;
      c[t.dataset.sec][+t.dataset.i] = t.value; touch(); save();
      const p = parseLine(c.kind, t.dataset.sec, t.value);
      t.className = 'w6-ln ' + p.cls; t.title = p.err || '';
      const el = boxEl(c.id); if (el) el.style.width = boxWidth(c) + 'px';
      drawEdges(); evalSoon(); renderMaketSoon();
    }
  }
  function onPlanKey(e) {
    const t = e.target;
    if (t.classList.contains('w6-bname') && e.key === 'Enter') {
      e.preventDefault();
      const c = cls(t.dataset.cid); refreshBox(c.id, { sec: 'attrs', i: 0 });
      return;
    }
    if (!t.classList.contains('w6-ln')) return;
    const c = cls(t.dataset.cid), sec = t.dataset.sec, i = +t.dataset.i;
    if (!c) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      c[sec].splice(i + 1, 0, ''); touch(); save();
      refreshBox(c.id, { sec, i: i + 1 });
    } else if (e.key === 'Backspace' && !t.value && c[sec].length > 1) {
      e.preventDefault();
      c[sec].splice(i, 1); touch(); save();
      refreshBox(c.id, { sec, i: Math.max(0, i - 1) });
      evalSoon();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const all = $$(`.w6-ln[data-cid="${c.id}"]`, root);
      const k = all.indexOf(t) + (e.key === 'ArrowDown' ? 1 : -1);
      if (all[k]) { e.preventDefault(); all[k].focus(); }
    }
  }
  function onPlanDown(e) {
    const h = e.target.closest('[data-drag]');
    if (!h || e.target.closest('input,button')) return;
    const c = cls(h.dataset.drag); if (!c) return;
    e.preventDefault();
    T.sel = c.id; $$('.w6-box.sel', root).forEach(b => b.classList.remove('sel')); boxEl(c.id).classList.add('sel');
    T.drag = { id: c.id, sx: e.clientX, sy: e.clientY, ox: c.x, oy: c.y };
  }
  function onPlanMove(e) {
    const d = T.drag; if (!d) return;
    const c = cls(d.id), z = S.zoom || 1;
    c.x = clamp(Math.round(d.ox + (e.clientX - d.sx) / z), 0, CV_W - 200);
    c.y = clamp(Math.round(d.oy + (e.clientY - d.sy) / z), 0, CV_H - 120);
    const el = boxEl(c.id); el.style.left = c.x + 'px'; el.style.top = c.y + 'px';
    drawEdges();
  }
  function onPlanUp() { if (T.drag) { T.drag = null; save(); } }

  /* =====================================================================
     2) KOD — editör, çıktı, konsol
     ===================================================================== */
  const LH = 21;
  const ED = { ta: null, hl: null, gut: null, errLine: null, lintLine: null, cur: 1, hist: [], hi: -1 };
  const SNIPS = [['self.', 'self.'], ['def', 'def |(self):'], ['__init__', 'def __init__(self|):'], ['class X(Enum)', 'class |(Enum):'], ['auto()', 'auto()'], ['[ ]', '[|]'], ['.append()', '.append(|)'], ['return', 'return '], ['print()', 'print(|)'], ['Renk.', 'Renk.'], ['CatiTipi.', 'CatiTipi.'], ['Mevsim.', 'Mevsim.']];

  function codeShell() {
    return `
      <div class="w6-ebar">
        <button class="w6-run" data-act="run" id="w6-run">▶ Çalıştır <kbd>Ctrl</kbd><kbd>Enter</kbd></button>
        <label class="w6-live" title="Yazmayı bırakınca kod kendiliğinden çalışır"><input type="checkbox" id="w6-livecb"> ⚡ Canlı</label>
        <span class="w6-pys" id="w6-pys"></span>
      </div>
      <div class="w6-snips" id="w6-snips" aria-label="Hızlı ekle">${SNIPS.map((s, i) => `<button data-snip="${i}" title="Ekle: ${esc(s[1].replace('|', ''))}" tabindex="-1">${esc(s[0])}</button>`).join('')}</div>
      <div class="w6-ed" id="w6-ed">
        <div class="w6-gut" id="w6-gut" aria-hidden="true"></div>
        <div class="w6-edc">
          <pre class="w6-hl" id="w6-hl" aria-hidden="true"></pre>
          <textarea id="w6-ta" spellcheck="false" wrap="off" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Python kodu"></textarea>
        </div>
        <div class="w6-lintchip" id="w6-lintchip" hidden></div>
      </div>
      <div class="w6-con">
        <div class="w6-conh"><b>Çıktı</b><span id="w6-cstat"></span></div>
        <div class="w6-cout" id="w6-cout"><div class="w6-cl info">print() çıktıları ve hatalar (Türkçe açıklamasıyla) burada görünür.</div></div>
        <div class="w6-replog" id="w6-replog"></div>
        <label class="w6-repl"><span>&gt;&gt;&gt;</span><input id="w6-repl" placeholder="Bir ifade dene, Enter: Renk.MAVI.value" spellcheck="false" autocomplete="off"></label>
      </div>`;
  }

  /* ---- sözdizimi renklendirme ---- */
  const PY_TOK = /(#[^\n]*)|("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|[rRbBuUfF]{0,2}"(?:[^"\\\n]|\\.)*"?|[rRbBuUfF]{0,2}'(?:[^'\\\n]|\\.)*'?)|(@[A-Za-z_][\w.]*)|\b(class|def|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|pass|import|from|as|try|except|finally|raise|with|lambda|break|continue|global|nonlocal|yield|del|assert)\b|\b(self|super)\b|\b(print|len|range|isinstance|list|dict|str|int|float|bool|max|min|sum|abs|round|type|enumerate|sorted|Enum|auto)\b|\b(\d+(?:\.\d+)?)\b|(?<=\bclass\s+)([A-Za-z_ÇĞİÖŞÜçğıöşü][\wÇĞİÖŞÜçğıöşü]*)|(?<=\bdef\s+)([A-Za-z_ÇĞİÖŞÜçğıöşü][\wÇĞİÖŞÜçğıöşü]*)/g;
  const TOK_CLS = ['', 'cm', 'st', 'dc', 'kw', 'sf', 'bi', 'nu', 'cn', 'fn'];
  function highlightPy(code) {
    const lines = [''];
    const push = (text, c) => text.split('\n').forEach((p, i) => { if (i) lines.push(''); if (p) lines[lines.length - 1] += c ? `<span class="${c}">${esc(p)}</span>` : esc(p); });
    let last = 0, m;
    PY_TOK.lastIndex = 0;
    while ((m = PY_TOK.exec(code))) {
      if (!m[0]) { PY_TOK.lastIndex++; continue; }
      push(code.slice(last, m.index));
      let g = 1; while (!m[g]) g++;
      push(m[0], TOK_CLS[g]);
      last = PY_TOK.lastIndex;
    }
    push(code.slice(last));
    return lines;
  }
  const hlBlock = code => highlightPy(code).map(l => l || ' ').join('\n');
  function hlRender() {
    if (!ED.ta) return;
    const lines = highlightPy(ED.ta.value);
    const bad = ED.errLine || ED.lintLine;
    ED.hl.innerHTML = lines.map((h, i) => `<div class="${i + 1 === bad ? 'err' : ''}${i + 1 === ED.cur ? ' cur' : ''}">${h || ' '}</div>`).join('') + '<div> </div>';
    ED.gut.innerHTML = lines.map((_, i) => `<div class="${i + 1 === bad ? 'err' : ''}${i + 1 === ED.cur ? ' cur' : ''}">${i + 1}</div>`).join('') + '<div></div>';
    syncScroll();
  }
  function syncScroll() { ED.hl.scrollTop = ED.ta.scrollTop; ED.hl.scrollLeft = ED.ta.scrollLeft; ED.gut.scrollTop = ED.ta.scrollTop; }
  function caretLine() { return ED.ta.value.slice(0, ED.ta.selectionStart).split('\n').length; }
  function updateCur() {
    const n = caretLine();
    if (n === ED.cur) return;
    [ED.hl, ED.gut].forEach(el => { const a = el.children[ED.cur - 1], b = el.children[n - 1]; if (a) a.classList.remove('cur'); if (b) b.classList.add('cur'); });
    ED.cur = n;
  }
  function setCode(code) { ED.ta.value = code; S.code = code; ED.errLine = null; ED.lintLine = null; hlRender(); }
  function insertText(text) {
    const ta = ED.ta; ta.focus();
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (_) { ok = false; }
    if (!ok) { ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end'); onEdInput(); }
  }
  function lineBounds(pos) { const v = ED.ta.value; const s = v.lastIndexOf('\n', pos - 1) + 1; let e = v.indexOf('\n', pos); if (e < 0) e = v.length; return [s, e]; }
  function mapLines(fn) {
    const ta = ED.ta, v = ta.value;
    const [s] = lineBounds(ta.selectionStart);
    let e = ta.selectionEnd; if (e > ta.selectionStart && v[e - 1] === '\n') e--;
    const [, e2] = lineBounds(e);
    const out = fn(v.slice(s, e2).split('\n')).join('\n');
    ta.setSelectionRange(s, e2); insertText(out);
    ta.setSelectionRange(s, s + out.length);
  }
  function onEdKey(e) {
    const ta = ED.ta, mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === 'Enter') { e.preventDefault(); runCode(); return; }
    if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveNow(); toast('Kaydedildi (zaten otomatik kaydediliyor 😉)', 'info', 1800); return; }
    if (mod && e.key === '/') {
      e.preventDefault();
      mapLines(ls => { const all = ls.filter(l => l.trim()).every(l => /^\s*#/.test(l)); return ls.map(l => (!l.trim() ? l : all ? l.replace(/^(\s*)# ?/, '$1') : l.replace(/^(\s*)/, '$1# '))); });
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) mapLines(ls => ls.map(l => l.replace(/^ {1,4}/, '')));
      else if (ta.value.slice(ta.selectionStart, ta.selectionEnd).includes('\n')) mapLines(ls => ls.map(l => '    ' + l));
      else { const [s] = lineBounds(ta.selectionStart); insertText(' '.repeat(4 - ((ta.selectionStart - s) % 4))); }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !mod) {
      e.preventDefault();
      const [s] = lineBounds(ta.selectionStart);
      const before = ta.value.slice(s, ta.selectionStart);
      let ind = (/^ */.exec(before) || [''])[0].length;
      const tr = before.trim();
      if (/:\s*(#.*)?$/.test(tr)) ind += 4;
      else if (/^(return\b|pass$|break$|continue$|raise\b)/.test(tr)) ind = Math.max(0, ind - 4);
      insertText('\n' + ' '.repeat(ind));
      return;
    }
    if (e.key === 'Backspace' && ta.selectionStart === ta.selectionEnd && !mod) {
      const [s] = lineBounds(ta.selectionStart), before = ta.value.slice(s, ta.selectionStart);
      if (before.length && /^ +$/.test(before)) {
        e.preventDefault();
        const n = before.length % 4 || 4;
        ta.setSelectionRange(ta.selectionStart - n, ta.selectionStart);
        try { if (!document.execCommand('delete')) throw 0; } catch (_) { ta.setRangeText('', ta.selectionStart, ta.selectionEnd, 'end'); onEdInput(); }
      }
    }
  }
  function onEdInput() {
    S.code = ED.ta.value; save();
    ED.errLine = null; ED.lintLine = null;
    hlRender(); updateCur();
    if (S.live) autoRun(); else lintSoon();
  }
  function gotoLine(n) {
    const v = ED.ta.value.split('\n'); n = clamp(n, 1, v.length);
    let s = 0; for (let i = 0; i < n - 1; i++) s += v[i].length + 1;
    ED.ta.focus(); ED.ta.setSelectionRange(s, s + v[n - 1].length);
    ED.ta.scrollTop = Math.max(0, (n - 4) * LH);
    syncScroll(); updateCur();
  }

  const lintSoon = debounce(async () => {
    if (!ED.ta || H6Py.status() === 'error') return;
    const code = ED.ta.value;
    try {
      const r = await H6Py.lint(code);
      if (code !== ED.ta.value) return;
      showLint(r);
      if (r.ok) { S.analysis = r.analysis; save(); renderMaketSoon(); evalSoon(); }
      hlRender();
    } catch (_) { /* motor meşgul ya da yükleniyor */ }
  }, 900);
  function showLint(r) {
    const chip = $('#w6-lintchip');
    if (!r.ok) {
      ED.lintLine = r.err.line;
      const x = H6Py.explain(r.err, explainCtx());
      chip.hidden = false; chip.innerHTML = `⚠ ${r.err.line}. satır: ${esc(x.title)}`; chip.dataset.line = r.err.line;
    } else { ED.lintLine = null; chip.hidden = true; }
  }
  const autoRun = debounce(() => runCode(true), 950);

  function setPyStatus(s) {
    const el = $('#w6-pys'); if (!el) return;
    el.className = 'w6-pys ' + s;
    el.textContent = { idle: '⚪ Python bekliyor', loading: '⏳ Python yükleniyor… (ilk seferde biraz sürer)', ready: '🟢 Python 3 hazır', busy: '⚙️ Çalışıyor…', error: '🔴 Python yüklenemedi (internet?) · ▶ ile tekrar dene' }[s] || s;
  }
  function clearOut() { const b = $('#w6-cout'); if (b) b.innerHTML = ''; const l = $('#w6-replog'); if (l) l.innerHTML = ''; }
  function outLine(html, cls, box) {
    const b = box || $('#w6-cout'); if (!b) return;
    const d = document.createElement('div'); d.className = 'w6-cl ' + (cls || ''); d.innerHTML = html;
    b.appendChild(d);
    while (b.children.length > 200) b.firstChild.remove();
    b.scrollTop = b.scrollHeight;
  }
  function explainCtx() {
    const enums = Object.entries((S.analysis && S.analysis.classes) || {}).filter(([, c]) => c.enum);
    const lits = {}; enums.forEach(([n, c]) => { lits[n] = c.lits; });
    return { enums: enums.map(([n]) => n), lits };
  }
  function errHTML(err) {
    const x = H6Py.explain(err, explainCtx());
    return `<div class="t">✖ ${esc(x.title)}${err.line ? ` <button class="w6-goto" data-goto="${err.line}">${err.line}. satıra git</button>` : ''}${err.func && err.func !== '<module>' ? ` <small>(${esc(err.func)}() içinde)</small>` : ''}</div>
      <div class="tip">${esc(x.tip)}</div><div class="raw">${esc(err.type)}: ${esc(err.msg)}${err.text ? `<br><code>${esc(err.text)}</code>` : ''}</div>`;
  }
  async function runCode(auto) {
    if (!ED.ta) return;
    if (T.runBusy) { T.runQueued = true; return; }
    T.runBusy = true;
    const code = ED.ta.value; S.code = code; saveNow();
    $('#w6-cstat').textContent = auto ? '⚡ canlı' : '';
    try {
      const r = await H6Py.run(code, auto ? 4000 : 6000);
      if (code === ED.ta.value || !auto) {
        clearOutMain();
        if (r.fail) outLine('⚠ ' + esc(r.fail), 'err');
        if (r.out) outLine(esc(r.out.replace(/\n$/, '')), 'out');
        if (r.err) { outLine(errHTML(r.err), 'err'); ED.errLine = r.err.line; T.stale = true; }
        else { ED.errLine = null; T.stale = false; if (!r.fail) outLine('✓ Kod hatasız çalıştı.' + (auto ? ' <small>(canlı)</small>' : ''), 'ok'); }
        if (r.err && r.err.type === 'SyntaxError') { showLint({ ok: false, err: r.err }); }
        else { showLint({ ok: true }); }
        if (r.analysis) S.analysis = r.analysis;
        if (r.snap) S.snap = r.snap;
        if (r.tests && Object.keys(r.tests).length) S.tests = r.tests;
        saveNow(); hlRender(); renderMaket(); evaluate();
        if (S.mode === 'scene') renderScene();
      }
    } catch (e) {
      if (e && e.timeout) outLine(`⏱ Kod ${auto ? 4 : 6} saniyede bitmedi. Sonsuz döngü olabilir mi (while True)? Python yeniden başlatılıyor.`, 'err');
      else outLine('⚠ ' + esc((e && e.fatal) || String(e)), 'err');
    }
    T.runBusy = false;
    if (T.runQueued) { T.runQueued = false; runCode(true); }
  }
  function clearOutMain() { const b = $('#w6-cout'); if (b) b.innerHTML = ''; }
  async function replRun(expr) {
    if (!expr.trim()) return;
    ED.hist.push(expr); ED.hi = ED.hist.length;
    const box = $('#w6-replog');
    outLine(`<span class="p">&gt;&gt;&gt;</span> ${esc(expr)}`, 'in', box);
    try {
      const r = await H6Py.evaluate(ED.ta.value, expr);
      if (r.pre && r.pre.err) outLine(errHTML(r.pre.err), 'err', box);
      if (r.out) outLine(esc(r.out.replace(/\n$/, '')), 'out', box);
      if (r.err) outLine(errHTML(r.err), 'err', box);
      else if (r.val != null) {
        const obj = /^<__main__\.(\w+) object at/.exec(r.val);
        const en = /^<(\w+)\.(\w+): (.+)>$/.exec(r.val);
        outLine(esc(r.val) + (obj ? ` <small class="dim">← bir ${esc(obj[1])} nesnesi</small>` : en ? ` <small class="dim">← ${esc(en[1])} enum'unun ${esc(en[2])} sabiti (değeri ${esc(en[3])})</small>` : ''), 'val', box);
      }
    } catch (e) {
      outLine(e && e.timeout ? '⏱ Zaman aşımı.' : '⚠ ' + esc((e && e.fatal) || String(e)), 'err', box);
    }
  }
  function renderCode() {
    if (ED.ta.value !== S.code) ED.ta.value = S.code;
    $('#w6-livecb').checked = !!S.live;
    hlRender();
    setPyStatus(H6Py.status());
    H6Py.boot().then(() => { if (!S.snap) runCode(true); else lintSoon(); }).catch(() => { /* durum çipi gösterir */ });
  }

  /* =====================================================================
     MAKET — nesnelerin canlı çizimi
     ===================================================================== */
  const SEASON = {
    ILKBAHAR: { sky: ['#BFE3FF', '#FDF0F6'], ground: '#8FD07A', hill: ['#C3E8B3', '#A6DC94'], road: '#E3DCCB', icon: '🌸', ad: 'İlkbahar' },
    YAZ: { sky: ['#8ECFFF', '#E6F5FF'], ground: '#6CC35A', hill: ['#A8DB8A', '#8BCF72'], road: '#E6DFCF', icon: '☀️', ad: 'Yaz' },
    SONBAHAR: { sky: ['#FFD8A8', '#FFF3E1'], ground: '#CDA65C', hill: ['#E8B76A', '#D99F52'], road: '#E8DCC4', icon: '🍂', ad: 'Sonbahar' },
    KIS: { sky: ['#CFDCEA', '#F1F5FA'], ground: '#F6F9FC', hill: ['#E6EDF5', '#D9E3EE'], road: '#DFE6EE', icon: '❄️', ad: 'Kış' }
  };
  const NAMED = { KIRMIZI: '#E5484D', MAVI: '#3D8BFF', SARI: '#FFC53D', YESIL: '#46A758', MOR: '#8E4EC6', TURUNCU: '#F76B15', PEMBE: '#FF7EB6', BEYAZ: '#F7F7F2', SIYAH: '#3A3A44', GRI: '#9AA3B2', LACIVERT: '#2E4A8F', KAHVERENGI: '#9A6B45', TURKUAZ: '#2CC5C5', BORDO: '#8E2B3B', KREM: '#F3E6C8', LILA: '#C3A6F0' };
  const RENK_AD = { KIRMIZI: 'kırmızı', MAVI: 'mavi', SARI: 'sarı', YESIL: 'yeşil', MOR: 'mor', TURUNCU: 'turuncu', PEMBE: 'pembe', BEYAZ: 'beyaz', SIYAH: 'siyah', GRI: 'gri', LACIVERT: 'lacivert', KAHVERENGI: 'kahverengi', TURKUAZ: 'turkuaz', BORDO: 'bordo', KREM: 'krem', LILA: 'lila', ACIKMAVI: 'açık mavi', KOYUMAVI: 'koyu mavi', ACIKYESIL: 'açık yeşil', KOYUYESIL: 'koyu yeşil', ALTIN: 'altın sarısı', GUMUS: 'gümüş', MINT: 'mint yeşili', SOMON: 'somon', HARDAL: 'hardal sarısı', ZEYTIN: 'zeytin yeşili', LIMON: 'limon sarısı', GOK: 'gök mavisi', GOKMAVI: 'gök mavisi' };
  const CATI_AD = { UCGEN: 'üçgen çatılı', DUZ: 'düz çatılı', KUBBE: 'kubbeli' };
  const isHex = v => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);
  function shade(hex, f) {
    if (!isHex(hex)) return '#8A93A3';
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    return '#' + [r, g, b].map(x => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('');
  }
  const objOf = r => (S.snap && S.snap.objs && S.snap.objs[r]) || null;
  const A = (o, k) => (o && o.attrs ? o.attrs[k] : undefined);
  function valText(v) {
    if (!v) return '—';
    if (v.k === 'e') return `${v.c}.${v.n}`;
    if (v.k === 'p') return v.t === 'str' ? JSON.stringify(v.v) : String(v.v);
    if (v.k === 'l') return `[${v.i.length} eleman]`;
    if (v.k === 'o') return `${v.c} nesnesi`;
    return v.r || '?';
  }
  function evView(o) {
    const v = { sahip: '', color: null, cname: '', kat: 1, katBad: false, cati: '', win: null, winNote: '', warn: [] };
    const sa = A(o, 'sahip'), re = A(o, 'renk'), ka = A(o, 'kat'), ca = A(o, 'cati');
    v.sahip = sa && sa.k === 'p' ? String(sa.v) : '';
    if (re && re.k === 'e') {
      v.cname = re.n;
      v.color = isHex(re.v) ? re.v : NAMED[re.n] || null;
      if (!isHex(re.v)) v.warn.push(`${re.c}.${re.n} değeri bir renk kodu değil ("#RRGGBB" olmalı).`);
    } else if (re) v.warn.push(re.k === 'p' && re.t === 'str' ? `renk bir metin: ${JSON.stringify(re.v)}. Renk.MAVI gibi bir enum sabiti ver!` : `renk geçersiz: ${valText(re)}`);
    else v.warn.push('renk özelliği yok.');
    if (ka && ka.k === 'p' && ka.t === 'int') { v.kat = clamp(ka.v, 1, 5); if (ka.v < 1 || ka.v > 5) { v.katBad = true; v.warn.push(`kat ${ka.v}: 1 ile 5 arasında olmalı.`); } }
    else v.warn.push(ka ? `kat bir tam sayı değil: ${valText(ka)}` : 'kat özelliği yok.');
    if (ca && ca.k === 'e') v.cati = ca.n;
    else v.warn.push(ca ? `cati bir CatiTipi sabiti değil: ${valText(ca)}` : 'cati özelliği yok.');
    const p = o && o.pencere;
    if (p) {
      if (!p.ok) { v.win = 0; v.winNote = 'pencere_sayisi() hata verdi: ' + p.err; }
      else if (p.v && p.v.k === 'p' && p.v.t === 'int') v.win = clamp(p.v.v, 0, 20);
      else if (p.v && p.v.k === 'p' && p.v.v == null) { v.win = 0; v.winNote = 'pencere_sayisi() None döndürdü: return unutulmuş!'; }
      else { v.win = 0; v.winNote = 'pencere_sayisi() sayı döndürmedi.'; }
    }
    return v;
  }
  function agacView(o) { const b = A(o, 'boy'); return { boy: b && b.k === 'p' && typeof b.v === 'number' ? clamp(Math.round(b.v), 1, 10) : 4 }; }
  function listObjs(v) { return v && v.k === 'l' ? v.i.filter(x => x.k === 'o').map(x => objOf(x.r)).filter(Boolean) : []; }
  function mahalleObjView(o) {
    const me = A(o, 'mevsim'), ad = A(o, 'ad');
    return {
      ad: ad && ad.k === 'p' ? String(ad.v) : 'Adsız',
      mevsim: me && me.k === 'e' ? me.n : '',
      evler: listObjs(A(o, 'evler')).filter(x => x.cls === 'Ev').map(evView),
      agaclar: listObjs(A(o, 'agaclar')).filter(x => x.cls === 'Agac').map(agacView)
    };
  }
  function mahalleView() {
    if (!S.snap || !S.snap.objs) return null;
    const ms = Object.values(S.snap.objs).filter(o => o.cls === 'Mahalle').map(mahalleObjView);
    if (!ms.length) return null;
    ms.sort((a, b) => b.evler.length - a.evler.length);
    return ms[0];
  }
  const mahalleAdi = ad => (/mahalle/i.test(ad) ? ad : `${ad} Mahallesi`);

  /* ---- ev çizimi (200 × 270 alanında) ---- */
  function houseG(v, an, opt) {
    an = an || {}; opt = opt || {};
    const W = 124, X = 38, G = 236, FH = 34, kat = v.kat || 1, top = G - kat * FH;
    const col = v.color || '#C9CED6', ink = '#2B2F3A';
    const kalip = !!opt.kalip;
    const st = kalip ? `stroke="#9AA3B2" stroke-dasharray="6 5"` : `stroke="${ink}"`;
    let s = `<ellipse cx="100" cy="${G + 3}" rx="80" ry="7" fill="#000" opacity=".1"/>`;
    // pencere dağılımı
    const n = v.win == null ? kat * 2 : v.win;
    const per = []; for (let i = 0; i < kat; i++) per.push(Math.floor(n / kat) + (i >= kat - (n % kat) ? 1 : 0));
    const winFill = opt.snow ? '#FFF3C4' : '#DDF1FF';
    // baca (çatının arkasında kalır)
    if (v.cati === 'UCGEN') s += `<rect x="${X + W - 38}" y="${top - 38}" width="14" height="30" fill="${kalip ? 'none' : '#B4533F'}" ${st} stroke-width="2.5"/>`;
    // katlar
    for (let i = 0; i < kat; i++) {
      const y = G - (i + 1) * FH, isNew = an.newFrom != null && i >= an.newFrom;
      const cnt = Math.min(per[i], 4);
      const x0 = X + 6, w = i === 0 ? W - 44 : W - 12;
      const gap = (w - cnt * 16) / (cnt + 1);
      let wins = '';
      for (let k = 0; k < cnt; k++) {
        const wx = x0 + gap * (k + 1) + 16 * k;
        wins += `<rect x="${wx.toFixed(1)}" y="${y + 9}" width="16" height="16" rx="1.5" fill="${kalip ? 'none' : winFill}" ${st} stroke-width="2"/>` + (kalip ? '' : `<path d="M${(wx + 8).toFixed(1)} ${y + 9} V${y + 25} M${wx.toFixed(1)} ${y + 17} H${(wx + 16).toFixed(1)}" stroke="${ink}" stroke-width="1.2"/>`);
      }
      s += `<g class="h6-fl${isNew ? ' new' : ''}"${isNew ? ` style="animation-delay:${(i - an.newFrom) * 130}ms"` : ''}><rect x="${X}" y="${y}" width="${W}" height="${FH}" fill="${kalip ? '#F4F6F9' : col}" ${st} stroke-width="2.5"/>${wins}</g>`;
    }
    if (an.paintFrom && !kalip) s += `<rect class="h6-wipe" x="${X + 1.3}" y="${top + 1.3}" width="${W - 2.6}" height="${kat * FH - 2.6}" fill="${an.paintFrom}"/>`;
    // kapı
    s += `<rect x="${X + W - 32}" y="${G - 27}" width="20" height="27" rx="2" fill="${kalip ? 'none' : shade(col, -0.45)}" ${st} stroke-width="2.5"/>` + (kalip ? '' : `<circle cx="${X + W - 16}" cy="${G - 13}" r="1.8" fill="#FFC53D"/>`);
    // çatı
    let roof = '';
    if (v.cati === 'UCGEN') {
      roof = `<polygon points="${X - 12},${top + 1} ${X + W / 2},${top - 46} ${X + W + 12},${top + 1}" fill="${kalip ? '#F4F6F9' : '#D9553F'}" ${st} stroke-width="2.5" stroke-linejoin="round"/>`;
      if (opt.snow) roof += `<polygon points="${X + W / 2 - 26},${top - 25} ${X + W / 2},${top - 46} ${X + W / 2 + 26},${top - 25} ${X + W / 2 + 12},${top - 29} ${X + W / 2},${top - 26} ${X + W / 2 - 13},${top - 30}" fill="#fff" stroke="#C8D3E0" stroke-width="1"/>`;
    } else if (v.cati === 'DUZ') {
      roof = `<rect x="${X - 7}" y="${top - 11}" width="${W + 14}" height="12" rx="2" fill="${kalip ? '#F4F6F9' : '#7C8796'}" ${st} stroke-width="2.5"/>` + (kalip ? '' : [0, 1, 2, 3, 4].map(k => `<line x1="${X + 4 + k * 29}" y1="${top - 11}" x2="${X + 4 + k * 29}" y2="${top - 22}" stroke="${ink}" stroke-width="2"/>`).join('') + `<line x1="${X}" y1="${top - 22}" x2="${X + W + 2}" y2="${top - 22}" stroke="${ink}" stroke-width="2"/>`);
      if (opt.snow) roof += `<rect x="${X - 5}" y="${top - 16}" width="${W + 10}" height="6" rx="3" fill="#fff" stroke="#C8D3E0" stroke-width="1"/>`;
    } else if (v.cati === 'KUBBE') {
      const R = W / 2 - 4, h = R * 0.82;
      roof = `<path d="M${X + 4} ${top + 1} A ${R} ${h} 0 0 1 ${X + W - 4} ${top + 1} Z" fill="${kalip ? '#F4F6F9' : shade(col, -0.22)}" ${st} stroke-width="2.5"/><line x1="${X + W / 2}" y1="${top - h}" x2="${X + W / 2}" y2="${top - h - 12}" ${st} stroke-width="2.5"/><circle cx="${X + W / 2}" cy="${top - h - 15}" r="4" fill="${kalip ? 'none' : '#FFC53D'}" ${st} stroke-width="2"/>`;
      if (opt.snow) roof += `<path d="M${X + 22} ${top - h * 0.62} A ${R} ${h} 0 0 1 ${X + W - 22} ${top - h * 0.62} Q ${X + W / 2} ${top - h * 0.45} ${X + 22} ${top - h * 0.62} Z" fill="#fff" stroke="#C8D3E0" stroke-width="1"/>`;
    } else {
      roof = `<polygon points="${X - 12},${top + 1} ${X + W / 2},${top - 46} ${X + W + 12},${top + 1}" fill="none" stroke="#9AA3B2" stroke-width="2.5" stroke-dasharray="6 5" stroke-linejoin="round"/><text x="${X + W / 2}" y="${top - 12}" text-anchor="middle" style="font: 800 20px Nunito, Segoe UI, sans-serif" fill="#9AA3B2">?</text>`;
    }
    s += `<g class="h6-roof${an.roofDrop ? ' drop' : ''}">${roof}</g>`;
    if (opt.smoke && v.cati === 'UCGEN') s += [0, 1, 2].map(k => `<circle class="h6-smoke" cx="${X + W - 31}" cy="${top - 44}" r="${5 + k}" fill="#fff" opacity=".85" style="animation-delay:${k * 0.9}s"/>`).join('');
    if (v.sahip && !opt.noName) s += `<text x="100" y="${G + 24}" text-anchor="middle" style="font: 800 15px Nunito, Segoe UI, sans-serif" fill="${ink}">${esc(v.sahip.slice(0, 16))}</text>`;
    if (v.warn && v.warn.length && !kalip) s += `<g><circle cx="${X + W + 4}" cy="${top + 8}" r="11" fill="#D64545"/><text x="${X + W + 4}" y="${top + 13}" text-anchor="middle" style="font: 900 15px Nunito, Segoe UI, sans-serif" fill="#fff">!</text></g>`;
    return `<g class="h6-house${an.build ? ' build' : ''}">${s}</g>`;
  }
  const houseSVG = (v, an, opt) => `<svg viewBox="0 -14 200 284" class="h6-svg" xmlns="http://www.w3.org/2000/svg">${houseG(v, an, opt)}</svg>`;

  /* ---- ağaç çizimi (120 × 200 alanında, taban y=190) ---- */
  function treeG(t, mev, seed) {
    const b = t.boy || 4, th = 22 + b * 7, tw = 9 + b * 0.6, r = 18 + b * 2.4;
    const cx = 60, cy = 190 - th - r * 0.55, R = rnd(seed || 7);
    let s = `<ellipse cx="60" cy="191" rx="${r * 0.9}" ry="5" fill="#000" opacity=".1"/><rect x="${60 - tw / 2}" y="${190 - th}" width="${tw}" height="${th + 1}" rx="2" fill="#8B5A3C" stroke="#2B2F3A" stroke-width="2"/>`;
    const blob = (c1, c2) => `<circle cx="${cx - r * 0.62}" cy="${cy + r * 0.32}" r="${r * 0.72}" fill="${c2}" stroke="#2B2F3A" stroke-width="2"/><circle cx="${cx + r * 0.62}" cy="${cy + r * 0.32}" r="${r * 0.72}" fill="${c2}" stroke="#2B2F3A" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${c1}" stroke="#2B2F3A" stroke-width="2"/>`;
    const dots = (col, k, rr) => Array.from({ length: k }, () => `<circle cx="${(cx + (R() - 0.5) * r * 1.6).toFixed(1)}" cy="${(cy + (R() - 0.4) * r * 1.2).toFixed(1)}" r="${rr}" fill="${col}"/>`).join('');
    if (mev === 'KIS') {
      const y0 = 190 - th;
      s += `<path d="M60 ${y0} L${60 - r * 0.8} ${y0 - r * 0.9} M60 ${y0 + 6} L${60 + r * 0.85} ${y0 - r * 0.7} M60 ${y0} L${60 + 4} ${y0 - r * 1.3} M${60 - r * 0.45} ${y0 - r * 0.5} L${60 - r * 0.6} ${y0 - r * 1.1}" stroke="#6B4630" stroke-width="5" stroke-linecap="round" fill="none"/>`;
      s += `<ellipse cx="${60 - r * 0.8}" cy="${y0 - r * 0.92}" rx="8" ry="3.5" fill="#fff"/><ellipse cx="${60 + r * 0.85}" cy="${y0 - r * 0.72}" rx="8" ry="3.5" fill="#fff"/><ellipse cx="64" cy="${y0 - r * 1.32}" rx="7" ry="3" fill="#fff"/>`;
    } else if (mev === 'SONBAHAR') s += blob('#F28C28', '#E2553F') + dots('#FFC53D', 6, 3);
    else if (mev === 'ILKBAHAR') s += blob('#9ADB8A', '#7CCB6D') + dots('#FF8FB8', 10, 3.4) + dots('#fff', 5, 2.2);
    else if (mev === 'YAZ') s += blob('#3E9E4C', '#2F8A3E') + dots('#E5484D', 5, 3.6);
    else s += blob('#5DBB63', '#4BA352');
    return s;
  }
  const treeSVG = (t, mev) => `<svg viewBox="0 0 120 200" class="h6-svg" xmlns="http://www.w3.org/2000/svg">${treeG(t, mev, 11)}</svg>`;

  /* ---- sahne ---- */
  function sceneSVG(mv, o) {
    o = o || {};
    const W = o.w || 1200, H = o.h || 600, se = SEASON[mv.mevsim] || SEASON.YAZ, still = !!o.still;
    const base = H - 118, R = rnd(42);
    let s = `<defs><linearGradient id="h6sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${se.sky[0]}"/><stop offset="1" stop-color="${se.sky[1]}"/></linearGradient></defs>`;
    s += `<rect width="${W}" height="${H}" fill="url(#h6sky)"/>`;
    s += mv.mevsim === 'KIS' ? `<circle cx="${W - 150}" cy="100" r="44" fill="#FFF6D6" opacity=".9"/>` : `<circle cx="${W - 150}" cy="100" r="46" fill="#FFD34D"/><circle cx="${W - 150}" cy="100" r="62" fill="#FFD34D" opacity=".25"/>`;
    const cloud = (x, y, k) => `<g class="${still ? '' : 'h6-cloud'}" style="animation-duration:${60 + k * 25}s"><ellipse cx="${x}" cy="${y}" rx="52" ry="20" fill="#fff" opacity=".95"/><ellipse cx="${x + 30}" cy="${y - 12}" rx="34" ry="20" fill="#fff" opacity=".95"/><ellipse cx="${x - 28}" cy="${y - 6}" rx="26" ry="15" fill="#fff" opacity=".95"/></g>`;
    s += cloud(220, 90, 0) + cloud(640, 60, 1) + cloud(980, 150, 2);
    s += `<path d="M0 ${base - 70} Q ${W * 0.2} ${base - 150} ${W * 0.42} ${base - 80} T ${W * 0.85} ${base - 90} T ${W} ${base - 70} V ${H} H 0 Z" fill="${se.hill[0]}"/>`;
    s += `<path d="M0 ${base - 30} Q ${W * 0.3} ${base - 90} ${W * 0.6} ${base - 40} T ${W} ${base - 40} V ${H} H 0 Z" fill="${se.hill[1]}"/>`;
    s += `<rect x="0" y="${base}" width="${W}" height="${H - base}" fill="${se.ground}"/>`;
    s += `<rect x="0" y="${base + 52}" width="${W}" height="38" fill="${se.road}"/>` + Array.from({ length: Math.ceil(W / 70) }, (_, k) => `<rect x="${k * 70 + 10}" y="${base + 69}" width="36" height="4" rx="2" fill="#fff" opacity=".8"/>`).join('');
    // tabela
    const ad = mahalleAdi(mv.ad).slice(0, 26);
    const tw = Math.max(150, ad.length * 10.5 + 30), bx = Math.max(14, 92 - tw / 2);
    s += `<rect x="88" y="${base - 120}" width="8" height="124" fill="#8B5A3C" stroke="#2B2F3A" stroke-width="2"/><rect x="${bx}" y="${base - 150}" width="${tw}" height="44" rx="8" fill="#2E6FD8" stroke="#2B2F3A" stroke-width="2.5"/><text x="${bx + tw / 2}" y="${base - 121}" text-anchor="middle" style="font: 800 18px Nunito, Segoe UI, sans-serif" fill="#fff">${esc(ad)}</text>`;
    // evler ve ağaçlar sırayla
    const ev = mv.evler.slice(0, 8), ag = mv.agaclar.slice(0, 10), items = [];
    let ti = 0;
    ev.forEach((h, i) => {
      const k = Math.round(((i + 1) * ag.length) / (ev.length + 1)) - ti;
      for (let j = 0; j < k && ti < ag.length; j++) items.push({ t: 'a', v: ag[ti++] });
      items.push({ t: 'e', v: h });
    });
    while (ti < ag.length) items.push({ t: 'a', v: ag[ti++] });
    const unit = it => (it.t === 'e' ? 158 : 84);
    const total = items.reduce((a, it) => a + unit(it), 0);
    const x0 = Math.max(200, 14 + tw + 30), avail = W - x0 - 30, sc = Math.min(1.45, avail / Math.max(total, 1));
    let x = x0 + Math.max(0, (avail - total * sc) / 2);
    items.forEach((it, i) => {
      if (it.t === 'e') {
        const sz = 0.86 * sc;
        s += `<g transform="translate(${(x - 21 * sz).toFixed(1)} ${(base - 236 * sz + 4).toFixed(1)}) scale(${sz.toFixed(3)})">${houseG(it.v, {}, { snow: mv.mevsim === 'KIS', smoke: mv.mevsim === 'KIS' && !still })}</g>`;
      } else {
        const sz = 1.0 * sc;
        s += `<g transform="translate(${(x - 18 * sz).toFixed(1)} ${(base - 190 * sz + 6).toFixed(1)}) scale(${sz.toFixed(3)})">${treeG(it.v, mv.mevsim, 100 + i * 17)}</g>`;
        if (mv.mevsim === 'SONBAHAR') s += `<ellipse cx="${(x + 42 * sz).toFixed(1)}" cy="${base + 8}" rx="${26 * sz}" ry="5" fill="#E8862A" opacity=".8"/>`;
      }
      x += unit(it) * sc;
    });
    // mevsim parçacıkları
    const P = { KIS: ['#fff', 'snow', 40], SONBAHAR: ['#E8862A', 'leaf', 18], ILKBAHAR: ['#FF9EC4', 'petal', 22], YAZ: ['#2B2F3A', 'bird', 4] }[mv.mevsim];
    if (P) {
      for (let i = 0; i < P[2]; i++) {
        const px = (R() * W).toFixed(0), py = (R() * (base - 40)).toFixed(0), dl = (R() * 8).toFixed(2), du = (6 + R() * 6).toFixed(2);
        const cls = still ? '' : `h6-p ${P[1]}`;
        const style = still ? '' : ` style="animation-delay:-${dl}s;animation-duration:${du}s"`;
        if (P[1] === 'bird') s += `<path class="${cls}"${style} d="M${px} ${py} q 8 -8 16 0 q 8 -8 16 0" fill="none" stroke="${P[0]}" stroke-width="2.5" stroke-linecap="round"/>`;
        else if (P[1] === 'leaf') s += `<ellipse class="${cls}"${style} cx="${px}" cy="${py}" rx="6" ry="3.5" fill="${i % 2 ? '#E2553F' : P[0]}"/>`;
        else s += `<circle class="${cls}"${style} cx="${px}" cy="${py}" r="${P[1] === 'snow' ? (2 + R() * 3).toFixed(1) : 3.5}" fill="${P[0]}" ${P[1] === 'snow' ? 'stroke="#C8D3E0" stroke-width=".8"' : ''}/>`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="h6-scene">${s}</svg>`;
  }

  /* ---- hikâye: nesnelerin değerlerinden ---- */
  function iyelik(name) {
    const n = String(name || '').trim() || 'Biri', low = n.toLocaleLowerCase('tr');
    const vs = low.match(/[aeıioöuü]/g), v = vs ? vs[vs.length - 1] : 'e';
    const suf = { a: 'ın', ı: 'ın', e: 'in', i: 'in', o: 'un', u: 'un', ö: 'ün', ü: 'ün' }[v];
    return `${n}'${/[aeıioöuü]$/.test(low) ? 'n' : ''}${suf}`;
  }
  const renkAdi = c => RENK_AD[c] || String(c || 'renksiz').toLocaleLowerCase('tr');
  function story(mv) {
    const s = [], ad = mahalleAdi(mv.ad);
    const giris = { ILKBAHAR: 'ilkbahar gelmişti; ağaçlar pembe çiçekler açmıştı.', YAZ: 'yaz güneşi kaldırımları ısıtıyordu.', SONBAHAR: 'sonbaharın turuncu yaprakları sokağı kaplamıştı.', KIS: 'kar, çatıları beyaz bir örtüyle kaplamıştı.' }[mv.mevsim] || 'mevsim henüz belli değildi.';
    s.push(`${ad}'nde ${giris}`);
    s.push(`Mahallede ${mv.evler.length} ev ve ${mv.agaclar.length} ağaç vardı.`);
    const kimin = e => (e.sahip ? iyelik(e.sahip) : 'Birinin');
    mv.evler.slice(0, 6).forEach(e => {
      const ev = `${kimin(e)} ${e.kat} katlı, ${renkAdi(e.cname)}, ${CATI_AD[e.cati] || 'çatısı belirsiz'}`;
      if (e.win == null) s.push(`${ev} bir evi vardı.`);
      else if (e.win > 0) s.push(`${ev} evinin ${e.win} penceresinden içeri ışık giriyordu.`);
      else s.push(`${ev} evinin hiç penceresi yoktu; belli ki biri return yazmayı unutmuştu!`);
    });
    if (mv.evler.length > 1) {
      const t = mv.evler.reduce((a, b) => (b.kat > a.kat ? b : a));
      s.push(`Mahallenin en yüksek evi ${kimin(t).replace(/^B/, 'b')} eviydi.`);
    }
    if (mv.agaclar.length) s.push(`Ağaçların en uzunu ${Math.max(...mv.agaclar.map(a => a.boy))} metreye ulaşmıştı.`);
    s.push({ ILKBAHAR: 'Kuşlar çatıdan çatıya konup şarkı söylüyordu.', YAZ: 'Çocuklar ağaçların gölgesinde top oynuyordu.', SONBAHAR: 'Komşular yaprakları süpürüp birbirine elma ikram ediyordu. 🍎', KIS: 'Bacalardan tüten duman, komşuların çay demlediğini haber veriyordu. ☕' }[mv.mevsim] || 'Ve hikâye burada başladı.');
    return s;
  }

  /* ---- maket paneli ---- */
  const renderMaketSoon = debounce(() => renderMaket(), 250);
  function objList() {
    const sn = S.snap; if (!sn) return [];
    const out = [], seen = new Set();
    (sn.vars || []).forEach(([name, ref]) => {
      if (typeof ref === 'string') { if (!seen.has(ref) && objOf(ref)) { seen.add(ref); out.push({ name, r: ref, o: objOf(ref) }); } }
      else if (ref && ref.k === 'l') ref.i.forEach((x, i) => { if (x.k === 'o' && !seen.has(x.r) && objOf(x.r)) { seen.add(x.r); out.push({ name: `${name}[${i}]`, r: x.r, o: objOf(x.r) }); } });
    });
    return out;
  }
  function renderMaket() {
    const tabs = [['maket', '🏠 Maket'], ['kart', '🃏 Kod Kartları'], ['uyum', '🔗 UML ↔ Kod']];
    $('#w6-mtabs').innerHTML = tabs.map(([k, t]) => `<button role="tab" class="${S.mkTab === k ? 'on' : ''}" aria-selected="${S.mkTab === k}" data-act="mktab" data-tab="${k}">${t}</button>`).join('');
    const b = $('#w6-mbody');
    if (S.mkTab === 'kart') b.innerHTML = cardsHTML();
    else if (S.mkTab === 'uyum') b.innerHTML = uyumHTML();
    else b.innerHTML = maketHTML();
  }
  function enumCards() {
    const sn = S.snap;
    let enums = sn && sn.enums && sn.enums.length ? sn.enums.map(e => ({ name: e.name, members: e.members, code: true })) : [];
    if (!enums.length) enums = M().classes.filter(c => c.kind === 'enum' && c.name).map(c => ({ name: c.name, members: c.lits.map(n => ({ n, v: null })), code: false }));
    if (!enums.length) return '';
    return `<div class="w6-msec"><h4>🎨 Enumlar <small>${enums[0].code ? 'koddan' : 'UML\'den (henüz kodda yok)'}</small></h4>${enums.map(e => {
      let body;
      if (e.name === 'Renk') body = `<div class="w6-sw">${e.members.map(m => `<div class="${m.alias ? 'alias' : ''}" title="Renk.${esc(m.n)}${m.v != null ? ' · value = ' + esc(JSON.stringify(m.v)) : ''}"><i style="background:${isHex(m.v) ? m.v : NAMED[m.n] || '#fff'}" class="${isHex(m.v) || !e.code ? '' : 'bad'}"></i><b>${esc(m.n)}</b><small>${m.alias ? 'takma ad!' : m.v != null ? esc(String(m.v)) : '…'}</small></div>`).join('')}</div>`;
      else if (e.name === 'CatiTipi') body = `<div class="w6-chips">${e.members.map(m => `<span class="${m.alias ? 'alias' : ''}">${roofIcon(m.n)}${esc(m.n)}</span>`).join('')}</div>`;
      else if (e.name === 'Mevsim') body = `<div class="w6-chips">${e.members.map(m => `<span class="${m.alias ? 'alias' : ''}">${(SEASON[m.n] || {}).icon || '❔'} ${esc(m.n)}</span>`).join('')}</div>`;
      else body = `<div class="w6-chips">${e.members.map(m => `<span>${esc(m.n)}</span>`).join('')}</div>`;
      const al = e.members.filter(m => m.alias);
      return `<div class="w6-ecard"><div class="h"><small>«enumeration»</small><b>${esc(e.name)}</b><em>${e.members.filter(m => !m.alias).length} sabit</em></div>${body}${al.length ? `<p class="w6-warn">⚠ ${al.map(m => m.n).join(', ')} başka bir sabitle aynı değerde: yeni sabit değil, takma ad oldu.</p>` : ''}</div>`;
    }).join('')}
    ${enums.some(e => e.name === 'Renk' && e.code) ? '<p class="w6-tipline">Her sabit bir nesne: <code>Renk.MAVI.name</code> → adı, <code>Renk.MAVI.value</code> → renk kodu. Konsolda dene!</p>' : ''}</div>`;
  }
  function roofIcon(n) {
    const p = n === 'UCGEN' ? '<polygon points="3,15 14,4 25,15" fill="#D9553F" stroke="#2B2F3A" stroke-width="2" stroke-linejoin="round"/>' : n === 'DUZ' ? '<rect x="2" y="9" width="24" height="6" rx="1" fill="#7C8796" stroke="#2B2F3A" stroke-width="2"/>' : n === 'KUBBE' ? '<path d="M4 15 A 10 9 0 0 1 24 15 Z" fill="#46A758" stroke="#2B2F3A" stroke-width="2"/>' : '<text x="14" y="15" text-anchor="middle" font-size="13" font-weight="800" fill="#9AA3B2">?</text>';
    return `<svg viewBox="0 0 28 18" width="28" height="18" aria-hidden="true">${p}</svg>`;
  }
  function kalipSlots() {
    const code = S.analysis && S.analysis.classes && S.analysis.classes.Ev;
    if (code) return Object.entries(code.attrs).filter(([, a]) => a.in === '__init__').map(([k]) => k);
    const u = clsByName('Ev');
    return u ? u.attrs.filter(p => p.ok).map(p => p.name) : [];
  }
  function attrRows(o) {
    return Object.entries(o.attrs || {}).map(([k, v]) => {
      let val = esc(valText(v));
      if (v.k === 'e' && v.c === 'Renk') val = `<i class="dot" style="background:${isHex(v.v) ? v.v : NAMED[v.n] || '#ccc'}"></i>${val}`;
      if (v.k === 'e' && v.c === 'CatiTipi') val = roofIcon(v.n) + val;
      if (v.k === 'e' && v.c === 'Mevsim') val = `${(SEASON[v.n] || {}).icon || ''} ${val}`;
      const typ = v.k === 'e' ? v.c : v.k === 'p' ? v.t : v.k === 'l' ? 'list' : v.k === 'o' ? v.c : '?';
      return `<tr><th>${esc(k)}</th><td>${val}</td><td class="ty">${esc(typ)}</td></tr>`;
    }).join('');
  }
  function maketHTML() {
    const list = objList();
    const hasEv = !!(S.analysis && S.analysis.classes && S.analysis.classes.Ev) || !!clsByName('Ev');
    let sel = list.find(x => x.name === T.sel) || list.filter(x => x.o.cls === 'Ev').slice(-1)[0] || list.slice(-1)[0];
    let stage = '';
    if (sel) {
      T.sel = sel.name;
      const o = sel.o;
      let art = '', warn = [], extra = '';
      if (o.cls === 'Ev') {
        const v = evView(o), pv = T.prev[sel.name], an = {};
        if (!pv) { an.build = true; an.newFrom = 0; an.paintFrom = '#C9CED6'; an.roofDrop = true; }
        else {
          if (v.kat > pv.kat) an.newFrom = pv.kat;
          if (v.color !== pv.color) an.paintFrom = pv.color || '#C9CED6';
          if (v.cati !== pv.cati) an.roofDrop = true;
        }
        T.prev[sel.name] = { kat: v.kat, color: v.color, cati: v.cati };
        art = houseSVG(v, an);
        warn = v.warn.concat(v.winNote ? [v.winNote] : []);
        if (o.pencere) extra = `<tr class="calc"><th>pencere_sayisi()</th><td>${o.pencere.ok ? esc(valText(o.pencere.v)) : '⚠ hata'}</td><td class="ty">metot</td></tr>`;
        else extra = '<tr class="calc dim"><th>pencere_sayisi()</th><td colspan="2">henüz yok · şimdilik her katta 2 pencere</td></tr>';
      } else if (o.cls === 'Agac') {
        const mv = mahalleView();
        art = treeSVG(agacView(o), mv ? mv.mevsim : '');
      } else if (o.cls === 'Mahalle') {
        art = `<div class="w6-mini">${sceneSVG(mahalleObjView(o), { w: 900, h: 460 })}</div>`;
      } else art = `<div class="w6-objbox"><u>${esc(sel.name)} : ${esc(o.cls)}</u></div>`;
      stage = `<div class="w6-stage ${o.cls === 'Mahalle' ? 'wide' : ''}">
        <div class="w6-oname"><u>${esc(sel.name)} : ${esc(o.cls)}</u><small>nesne</small></div>
        <div class="w6-art">${art}</div>
        ${warn.length ? `<div class="w6-owarn">${warn.map(w => `<p>⚠ ${esc(w)}</p>`).join('')}</div>` : ''}
        <table class="w6-otbl">${attrRows(o)}${extra}</table>
        ${T.stale ? '<p class="w6-stale">⏸ Kodda şu an hata var; maket son çalışan hâli gösteriyor.</p>' : ''}
      </div>`;
    } else if (hasEv) {
      const slots = kalipSlots();
      stage = `<div class="w6-stage kalip">
        <div class="w6-oname"><b>Ev</b><small>kalıp (sınıf)</small></div>
        <div class="w6-art">${houseSVG({ kat: 2, cati: '', win: 4 }, {}, { kalip: true })}</div>
        <div class="w6-slots">${(slots.length ? slots : ['?']).map(sl => `<span>${esc(sl)}: <b>?</b></span>`).join('')}</div>
        <p class="w6-tipline">Bu gri ev bir <b>kalıp</b>: değerleri yok. Kodun en altına bir nesne üret, kalıp senin değerlerinle eve dönüşsün:<br><code>ayse_evi = Ev("Ayşe", Renk.KIRMIZI, 3, CatiTipi.KUBBE)</code></p>
      </div>`;
    }
    const thumbs = list.length ? `<div class="w6-msec"><h4>📦 Nesneler <small>${list.length} nesne · tıkla, büyüt</small></h4><div class="w6-thumbs">${list.map(x => {
      let mini = '';
      if (x.o.cls === 'Ev') mini = houseSVG(evView(x.o), {}, { noName: true });
      else if (x.o.cls === 'Agac') { const mv = mahalleView(); mini = treeSVG(agacView(x.o), mv ? mv.mevsim : ''); }
      else if (x.o.cls === 'Mahalle') mini = '<span class="big">🏘️</span>';
      else mini = '<span class="big">📦</span>';
      return `<button class="w6-th ${sel && x.name === sel.name ? 'on' : ''}" data-act="selobj" data-n="${esc(x.name)}">${mini}<u>${esc(x.name)}</u><small>: ${esc(x.o.cls)}</small></button>`;
    }).join('')}</div></div>` : '';
    const en = enumCards();
    const empty = !stage && !en ? `<div class="w6-mempty"><div>🏗️</div><p><b>Maket masası boş.</b></p><p>Plan'a ya da koda bir enum yazınca paleti, Ev sınıfını yazınca kalıbı, nesne üretince de evleri burada göreceksin.</p></div>` : '';
    return (list.length ? stage + thumbs + en : en + stage) + empty;
  }
  function cardsHTML() {
    return `<p class="w6-sub2">Örnekler <b>başka konulardan</b>; kendi sınıflarına uyarla.</p>` + CARDS.map(c => `<div class="w6-card ${S.cardOpen === c.k ? 'open' : ''}">
      <button data-act="card" data-k="${c.k}">${esc(c.t)}<span>${S.cardOpen === c.k ? '−' : '+'}</span></button>
      ${S.cardOpen === c.k ? `<pre class="w6-cc">${hlBlock(c.code)}</pre><p>${esc(c.note)}</p>` : ''}</div>`).join('');
  }
  function uyumHTML() {
    const m = M(), code = (S.analysis && S.analysis.classes) || {};
    const named = m.classes.filter(c => c.name);
    if (!named.length) return '<div class="w6-mempty"><div>🔗</div><p>Plan\'da kutu yok. UML çizdikçe burada her kutunun kodda karşılığı var mı göreceksin.</p></div>';
    const ok = (b, t) => `<li class="${b ? 'y' : 'n'}">${b ? '✓' : '✗'} ${t}</li>`;
    return '<p class="w6-sub2">Diyagramdaki her satırın kodda karşılığı var mı?</p>' + named.map(c => {
      const k = code[c.name];
      let items = '';
      if (!k) items = ok(false, `<code>class ${esc(c.name)}${c.kind === 'enum' ? '(Enum)' : ''}:</code> kodda yok`);
      else if (c.kind === 'enum') {
        items += ok(k.enum, k.enum ? 'Enum olarak tanımlı' : `<code>class ${esc(c.name)}(Enum):</code> olmalı`);
        c.lits.forEach(l => { items += ok(k.lits.includes(l), `<code>${esc(l)}</code>`); });
        k.lits.filter(l => !c.lits.includes(l)).forEach(l => { items += `<li class="x">＋ <code>${esc(l)}</code> kodda var, UML'de yok</li>`; });
      } else {
        c.attrs.filter(p => p.ok).forEach(p => { items += ok(!!k.attrs[p.name], `<code>self.${esc(p.name)}</code>`); });
        m.rels.filter(r => r.a === c.id && r.role).forEach(r => { items += ok(!!k.attrs[r.role], `<code>self.${esc(r.role)}</code> <small>(ilişki rolü)</small>`); });
        c.meths.filter(p => p.ok).forEach(p => { items += ok(!!k.methods[p.name], `<code>${esc(p.name)}()</code>`); });
      }
      return `<div class="w6-uy"><b>${c.kind === 'enum' ? '«enum» ' : ''}${esc(c.name)}</b><ul>${items}</ul></div>`;
    }).join('');
  }

  /* =====================================================================
     3) SAHNE
     ===================================================================== */
  function renderScene() {
    const el = $('#w6-v-scene'), mv = mahalleView();
    if (!mv) {
      el.innerHTML = `<div class="w6-mempty big"><div>🏘️</div><p><b>Sahnede gösterilecek bir mahalle yok.</b></p><p>Kodda bir Mahalle nesnesi kur, evleri ve ağaçları ekle. (Kod sekmesinde ▶ Çalıştır)</p><button class="btn w6-go" data-act="mode" data-m="code">⌨️ Koda dön</button></div>`;
      return;
    }
    const se = SEASON[mv.mevsim];
    el.innerHTML = `<div class="w6-shead"><div><small>${se ? se.icon + ' ' + se.ad : 'Mevsim yok'} · ${mv.evler.length} ev · ${mv.agaclar.length} ağaç</small><h2>${esc(mahalleAdi(mv.ad))}</h2></div>
      <button class="btn" data-act="mode" data-m="code">⌨️ Kodu değiştir</button><button class="btn w6-go" data-act="pdf">📄 PDF indir</button></div>
      <div class="w6-sframe">${sceneSVG(mv, { w: 1200, h: 600 })}</div>
      <div class="w6-story"><h3>📖 Mahallenin hikâyesi</h3><p class="w6-sub2">Bu hikâyeyi senin nesnelerin yazdı: her cümle bir özelliğin ya da bir metodun sonucu.</p>${story(mv).map(t => `<p>${esc(t)}</p>`).join('')}</div>`;
  }

  /* =====================================================================
     OLAYLAR ve BAĞLAMA
     ===================================================================== */
  function snippet(i) {
    const s = SNIPS[i][1], c = s.indexOf('|'), txt = s.replace('|', '');
    insertText(txt);
    if (c >= 0) { const p = ED.ta.selectionStart - (txt.length - c); ED.ta.setSelectionRange(p, p); }
  }
  function onClick(e) {
    const t = e.target;
    const menu = $('#w6-menu');
    if (!menu.hidden && !t.closest('.w6-menu')) menu.hidden = true;
    const eg = t.closest('.w6-edge'); if (eg) { const r = S.uml.rels.find(x => x.id === eg.dataset.rid); if (r) relForm(r); return; }
    const g = t.closest('[data-goto]'); if (g) { if (S.mode !== 'code') setMode('code'); gotoLine(+g.dataset.goto); return; }
    const sn = t.closest('[data-snip]'); if (sn) { snippet(+sn.dataset.snip); return; }
    if (t.closest('#w6-lintchip')) { gotoLine(+$('#w6-lintchip').dataset.line); return; }
    const b = t.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (b.closest('#w6-menu')) menu.hidden = true;
    switch (act) {
      case 'home': if (window.NYP) window.NYP.home(); break;
      case 'mode': setMode(b.dataset.m); break;
      case 'menu': menu.hidden = !menu.hidden; break;
      case 'pdf': exportPdf(); break;
      case 'defter': S.defter = !S.defter; save(); renderTop(); setTimeout(drawEdges, 260); break;
      case 'jlv': { const n = +b.dataset.lv; if (n > S.maxLevel) { toast(`${n}. seviye henüz kilitli.`, 'info'); break; } S.jlv = n === S.maxLevel ? null : n; save(); renderDefter(); break; }
      case 'guide': guide(); break;
      case 'quiz': quiz(); break;
      case 'help': help(); break;
      case 'teacher': if (OGR()) teacher(); break;
      case 'reset': resetAll(); break;
      case 'addcls': createClass('class'); break;
      case 'addenum': createClass('enum'); break;
      case 'addrel': relForm(null); break;
      case 'editrel': { const r = S.uml.rels.find(x => x.id === b.dataset.rid); if (r) relForm(r); break; }
      case 'delcls': deleteClass(b.dataset.cid); break;
      case 'addln': { const c = cls(b.dataset.cid); if (!c) break; c[b.dataset.sec].push(''); touch(); save(); refreshBox(c.id, { sec: b.dataset.sec, i: c[b.dataset.sec].length - 1 }); break; }
      case 'zin': setZoom((S.zoom || 1) + 0.1); break;
      case 'zout': setZoom((S.zoom || 1) - 0.1); break;
      case 'zfit': fitView(); break;
      case 'run': runCode(false); break;
      case 'mktab': S.mkTab = b.dataset.tab; save(); renderMaket(); break;
      case 'card': S.cardOpen = S.cardOpen === b.dataset.k ? null : b.dataset.k; save(); renderMaket(); break;
      case 'selobj': T.sel = b.dataset.n; renderMaket(); break;
    }
  }
  function onKeyGlobal(e) {
    if (!root || root.hidden) return;
    const modalOpen = !$('#nyp-modal').hidden;
    if (e.key === 'Escape') {
      if (modalOpen) { closeModal(); return; }
      const menu = $('#w6-menu'); if (!menu.hidden) menu.hidden = true;
    }
  }

  function mount(el) {
    root = el;
    ensureGlobals();
    root.innerHTML = shellHTML();
    ED.ta = $('#w6-ta'); ED.hl = $('#w6-hl'); ED.gut = $('#w6-gut');
    ED.ta.value = S.code;
    root.addEventListener('click', onClick);
    root.addEventListener('input', e => { if (e.target.closest('#w6-v-plan')) onPlanInput(e); });
    root.addEventListener('keydown', e => { if (e.target.closest('#w6-v-plan')) onPlanKey(e); });
    root.addEventListener('pointerdown', e => { if (e.target.closest('#w6-v-plan')) onPlanDown(e); });
    window.addEventListener('pointermove', e => { if (T.drag) onPlanMove(e); });
    window.addEventListener('pointerup', onPlanUp);
    root.addEventListener('focusin', e => {
      const bx = e.target.closest('.w6-box');
      if (bx && T.sel !== bx.dataset.cid) { $$('.w6-box.sel', root).forEach(x => x.classList.remove('sel')); bx.classList.add('sel'); }
    });
    root.addEventListener('toggle', e => {
      const d = e.target; if (!d.classList || !d.classList.contains('w6-note')) return;
      S.letterClosed[d.dataset.lv] = !d.open; save();
    }, true);
    document.addEventListener('keydown', onKeyGlobal);
    ED.ta.addEventListener('keydown', onEdKey);
    ED.ta.addEventListener('input', onEdInput);
    ED.ta.addEventListener('scroll', syncScroll);
    ['keyup', 'click', 'select'].forEach(k => ED.ta.addEventListener(k, updateCur));
    $('#w6-livecb').addEventListener('change', e => { S.live = e.target.checked; save(); if (S.live) runCode(true); });
    $('#w6-repl').addEventListener('keydown', e => {
      const i = e.target;
      if (e.key === 'Enter') { e.preventDefault(); const v = i.value; i.value = ''; replRun(v); }
      else if (e.key === 'ArrowUp' && ED.hist.length) { e.preventDefault(); ED.hi = Math.max(0, ED.hi - 1); i.value = ED.hist[ED.hi] || ''; }
      else if (e.key === 'ArrowDown' && ED.hist.length) { e.preventDefault(); ED.hi = Math.min(ED.hist.length, ED.hi + 1); i.value = ED.hist[ED.hi] || ''; }
    });
    window.addEventListener('resize', () => { if (!root.hidden && S.mode === 'plan') drawEdges(); });
    H6Py.onStatus(setPyStatus);
    const showT = () => { const b = $('#w6-tbtn'); if (b) b.hidden = !OGR(); };
    showT(); document.addEventListener('nyp-ogretmen', showT);
    touch(); evaluate(true); renderAll();
    if (!S.intro) setTimeout(help, 350);
    setTimeout(() => { H6Py.boot().catch(() => { /* çip gösterir */ }); }, 1200);
  }
  function refresh() { renderAll(); if (S.mode === 'plan') setTimeout(drawEdges, 30); }

  function heroArt() {
    const v = { sahip: 'Ayşe', color: '#E5484D', kat: 3, cati: 'KUBBE', win: 6, warn: [] };
    return `<div class="w6-hart">
      <div class="w6-hart-uml"><div class="h"><small>«enumeration»</small><b>Renk</b></div><div class="s"><i style="background:#E5484D"></i>KIRMIZI<br><i style="background:#3D8BFF"></i>MAVI<br><i style="background:#FFC53D"></i>SARI</div></div>
      <div class="w6-hart-code"><span class="v">ayse_evi</span> = <span class="c">Ev</span>(<span class="s">"Ayşe"</span>, Renk.KIRMIZI, <span class="n">3</span>, CatiTipi.KUBBE)</div>
      <div class="w6-hart-kalip">${houseSVG({ kat: 2, cati: '', win: 4 }, {}, { kalip: true })}<small>kalıp</small></div>
      <div class="w6-hart-arrow">➜</div>
      <div class="w6-hart-ev">${houseSVG(v)}<small><u>ayse_evi : Ev</u></small></div>
    </div>`;
  }

  return { mount, refresh, heroArt };
})();
