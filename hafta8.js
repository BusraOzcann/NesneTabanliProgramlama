/* =========================================================================
   8. HAFTA — Kronos Ajansı: Zaman Turizmi (bitirme: OOP + UML'nin tamamı)
   Aşamalar:
     1) Plan  — UML'yi yazarak çiz: sınıf, soyut sınıf, arayüz, enum ve
                beş ilişki türü (ilişki, toplama, bileşim, kalıtım, gerçekleştirme).
     2) Kod   — Python'u öğrenci yazar (tarayıcıda gerçek Python). Yazmayı
                bıraktığında kod çalışır; sağdaki 3D önizleme çağları kurar.
     3) Tur   — tüm çağlar zaman çizgisi boyunca adalar: WASD ile yürü ya da
                fareyle döndür. Portallardan geçerek çağdan çağa git.
   6. seviyede "değişiklik talepleri" gelir: eski sınıflara dokunmadan,
   yalnızca yeni sınıflarla çözülmelidir (o andaki sınıf kaynakları saklanır).
   ÖDEV: ilerleme kalıcıdır (localStorage) ve kayıt dosyası indirilip yüklenebilir.
   PDF: UML + kod + her çağın 3D görüntüsü; ad, soyad, okul no zorunlu.
   ========================================================================= */
window.Hafta8 = (function () {
  'use strict';

  /* ---------------- küçük yardımcılar ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const strip = s => String(s).replace(/<[^>]+>/g, '');
  function debounce(fn, ms) { let t; const f = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; f.cancel = () => clearTimeout(t); return f; }
  const fold = s => String(s || '').toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/i̇/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]/g, '');
  const isHex = v => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);

  /* =====================================================================
     VERİ
     ===================================================================== */
  const SAVE_KEY = 'nyp-hafta8-kronos-v1';
  const CV_W = 2400, CV_H = 1600;
  const IDP = '[A-Za-zÇĞİÖŞÜçğıöşü_][A-Za-z0-9ÇĞİÖŞÜçğıöşü_]*';
  const RE_ATTR = new RegExp('^([+\\-−#~])?\\s*(' + IDP + ')\\s*(?::\\s*([^=]*?))?\\s*(?:=\\s*(.*))?$');
  const RE_METH = new RegExp('^([+\\-−#~])?\\s*(' + IDP + ')\\s*\\(([^)]*)\\)\\s*(?::\\s*([^{]*?))?\\s*(\\{\\s*abstract\\s*\\})?\\s*$');
  const RE_LIT = /^([A-Za-zÇĞİÖŞÜçğıöşü_][A-Za-z0-9ÇĞİÖŞÜçğıöşü_]*)\s*(?:=.*)?$/;
  const KIND = {
    class: { label: 'Sınıf', stereo: '' },
    abstract: { label: 'Soyut sınıf', stereo: 'abstract' },
    interface: { label: 'Arayüz', stereo: 'interface' },
    enum: { label: 'Enum', stereo: 'enumeration' }
  };
  const RTYPES = {
    assoc: { name: 'İlişki', sym: '→', short: 'bilir / kullanır', ends: true },
    agg: { name: 'Toplama', sym: '◇', short: 'parça dışarıdan gelir, bağımsız yaşar', ends: true },
    comp: { name: 'Bileşim', sym: '◆', short: 'parçayı bütün üretir, onunla ölür', ends: true },
    gen: { name: 'Kalıtım', sym: '▷', short: '“bir … dır” (is-a)', ends: false },
    real: { name: 'Gerçekleştirme', sym: '┄▷', short: 'arayüz sözleşmesini imzalar', ends: false }
  };
  const RT_ORDER = ['assoc', 'agg', 'comp', 'gen', 'real'];
  const MULTS = ['', '1', '0..1', '0..*', '1..*'];
  const CAT = () => (window.H8World ? window.H8World.CATALOG : { yapilar: [], canlilar: [], gok: [], zemin: [], hava: [], malzeme: [], hareket: [], bilesik: {} });

  const LEVELS = [
    {
      n: 1, title: 'Ajansın Temeli', topic: 'Enum + Soyut sınıf + Kapsülleme', icon: '⏳',
      brief: `<p><b>Kronos Ajansı Müdürü'nden:</b> Hoş geldin baş mimar! Yıl 2300; zaman yolculuğu artık bir turizm sektörü. Müşterilerimiz dinozorları, piramitleri, Mars kolonilerini görmek istiyor. Ama önce <b>çağların ne olduğunu</b> tanımlamalıyız.</p>
<ul>
<li><b>4 enum</b>: <code>Malzeme</code> (en az 6, değerleri <code>"#RRGGBB"</code> renk kodu), <code>Gokyuzu</code>, <code>Zemin</code>, <code>Hava</code> (her biri en az 3 sabit; değerler <code>auto()</code> olabilir). Hangi sabitlerin 3D'de özel göründüğü <b>📚 Katalog</b>'da.</li>
<li><b>Cag</b> soyut bir sınıftır: <code>ad</code> (str) ve <b>gizli</b> <code>yil</code> (int; MÖ yıllar eksi: -2560). Yıla dışarıdan yalnızca <code>get_yil()</code> ile bakılır.</li>
<li><code>yil_metni()</code>: -2560 → <code>"MÖ 2560"</code>, 1453 → <code>"MS 1453"</code></li>
<li>Her çağ kendi <code>gok()</code>, <code>zemin()</code> ve <code>hava()</code>'sını bilir; Cag bunları <b>bilemez</b> (soyut metotlar). Hepsi ilgili enum'dan bir sabit döndürür.</li>
<li>Sonra ilk çağını kodla: <code>class AntikMisir(Cag):</code> ve bir nesne üret: <code>misir = AntikMisir("Antik Mısır", -2560)</code>. Sağdaki önizlemede çağın gökyüzü ve zemini belirecek!</li>
</ul>
<p class="w8-q">🤔 Neden yıl private? Biri <code>misir.yil = 99999</code> yazarsa ne olurdu?</p>`,
      concept: `<b>Soyut sınıf</b> yarım bir tariftir: "her çağın bir gökyüzü vardır" der ama hangisi olduğunu alt sınıfa bırakır. Python: <code>class Cag(ABC):</code> + <code>@abstractmethod</code>. UML: «abstract», metot sonunda <code>{abstract}</code>.<br><b>Kapsülleme</b>: <code>− yil: int</code> → kodda <code>self.__yil</code>. Değere yalnızca sınıfın metotları dokunur.<br><b>Enum</b>: seçenekler sabit; 3D motoru <code>Gokyuzu.AURORA</code>'yı tanır ama <code>"aurora"</code> metnini tanımaz.`
    },
    {
      n: 2, title: 'İnşaat', topic: 'Kalıtım + Bileşim', icon: '🏛️',
      brief: `<p><b>Müdür'den:</b> Turistler boş çöl görmeye gelmiyor! Çağlara <b>yapılar</b> lazım.</p>
<ul>
<li><b>Yapi</b> soyut: <code>malzeme</code> (Malzeme) ve <code>yukseklik</code> (int, 1–40). Her yapı kendini anlatır: soyut <code>aciklama()</code> bir metin döndürür (3D'de yapının üstünde görünür).</li>
<li>Yapi'dan en az <b>3 alt sınıf</b> türet. <b>📚 Katalog</b>'daki adları kullanırsan (Piramit, Pagoda, Roket, Volkan…) 3D'de o modeller çizilir; 28 çeşit var!</li>
<li><code>Cag</code>'a <code>yapilar</code> listesi ve <code>yapi_ekle(yapi)</code> ekle: yapı dışarıda üretilir, çağa eklenir (toplama ◇). Kural: bir çağda <b>en fazla 12 yapı</b>; doluysa eklemez ve <code>False</code> döndürür.</li>
<li><b>Bileşik yapı</b>: <code>__init__</code> içinde <b>kendi parçalarını üreten</b> bir yapı yaz (bileşim ◆). Örn. <code>Kale(malzeme, yukseklik, kule_sayisi)</code> → <code>self.kuleler</code> listesine <code>Kule</code>'ler üretir. Tapinak + Sutun, Cami + Minare de olur.</li>
<li>Bir çağa en az 5 yapı koy (biri bileşik olsun).</li>
</ul>`,
      concept: `<b>Kalıtım</b> (──▷): "Piramit bir Yapi'dır". Alt sınıf <code>super().__init__(...)</code> ile üst sınıfın kurulumunu çağırır.<br><b>Toplama ◇ ile bileşim ◆ arasındaki fark</b>: Çağ yapıyı dışarıdan alır (◇). Kale ise kulelerini kendi <code>__init__</code>'inde üretir (◆): kale yıkılırsa kuleleri de gider.<br>UML'de liste tutan özellik çizgiyle gösterilir: Cag ◇── Yapi, uçta <code>0..*</code> ve rol <code>yapilar</code>.`
    },
    {
      n: 3, title: 'Hayat', topic: 'Arayüz + Çoklu gerçekleştirme', icon: '🦕',
      brief: `<p><b>Müdür'den:</b> Yapılar güzel ama çağlar ıssız. <b>Canlılar</b> geliyor!</p>
<ul>
<li><b>Canli</b> soyut: <code>ad</code>, <code>boy</code> (int), <code>malzeme</code> (Malzeme, rengi). Her canlı ses çıkarır: soyut <code>ses()</code> → metin (3D'de konuşma balonu olur!).</li>
<li><b>HareketTipi</b> enum (en az 3): <code>YURU</code>, <code>UC</code>, <code>YUZ</code>, <code>ZIPLA</code>, <code>SUZUL</code>, <code>DON</code>, <code>DUR</code>…</li>
<li><b>«interface» Hareketli</b>: <code>hareket_et()</code> → HareketTipi. 3D motoru canlıyı bu sabite göre hareket ettirir.</li>
<li><b>«interface» Isiklandirilabilir</b>: <code>isik()</code> → Malzeme (ışığın rengi).</li>
<li>En az <b>2 canlı türü</b>: Canli'dan türesin <b>ve</b> Hareketli'yi gerçekleştirsin: <code>class Dinozor(Canli, Hareketli):</code>. Cag'a <code>canlilar</code> listesi ve <code>canli_ekle(canli)</code> ekle.</li>
<li>Bir de <b>ışıklı yapı</b>: hem Yapi hem Isiklandirilabilir (Fener, Kristal, Volkan…).</li>
</ul>
<p class="w8-q">🤔 Ejderha neden Yapi'dan değil de Canli'dan türer ama Isiklandirilabilir olabilir?</p>`,
      concept: `<b>Arayüz</b> bir yetenek sözleşmesidir: "ne" olduğunu değil, "ne yapabildiğini" söyler. Python'da yalnızca soyut metotlu bir ABC. UML: «interface», çizgi kesikli ┄▷ (gerçekleştirme).<br>Bir sınıfın <b>tek bir ailesi</b> (kalıtım) ama <b>birçok yeteneği</b> (arayüz) olabilir: <code>class Fener(Yapi, Isiklandirilabilir)</code>.<br>3D motoru senin sınıflarını tanımaz; yalnızca <code>hareket_et()</code> ve <code>isik()</code> çağırır. Bu çok biçimliliktir.`
    },
    {
      n: 4, title: 'Zaman Çizgisi', topic: 'Çok biçimlilik', icon: '🌀',
      brief: `<p><b>Müdür'den:</b> Tek çağla turizm olmaz. Ajans kuruluyor!</p>
<ul>
<li><b>ZamanAjansi</b>: <code>ad</code>, <code>caglar</code> listesi (◇), <code>cag_ekle(cag)</code>.</li>
<li><code>zaman_cizelgesi()</code>: çağları <b>yıla göre eskiden yeniye</b> sıralı bir liste olarak döndürür. Yıl private olduğu için <code>get_yil()</code> kullanmalısın. İpucu: <code>sorted(self.caglar, key=lambda c: c.get_yil())</code></li>
<li>En az <b>3 farklı çağ sınıfı</b> yaz ve ajansa ekle. Gökyüzü, zemin ve havaları birbirinden farklı olsun. Fikir mi lazım? <b>📚 Katalog</b>'da 19 çağ önerisi var: Mezozoyik, Lale Devri, Mars Kolonisi, Atlantis, Şeker Diyarı…</li>
</ul>
<p>Bitince <b>🌀 Tur</b> sekmesi açılır: çağların zaman çizgisi boyunca adalara dönüşür, aralarında portallar açılır!</p>`,
      concept: `<b>Çok biçimlilik</b>: Tur motoru her çağa yalnızca <code>c.gok()</code>, <code>c.zemin()</code> ve <code>c.hava()</code> der. AntikMisir kum fırtınası, BuzulCagi kar döndürür. Motor hangi çağ olduğunu bilmeden doğru sahneyi kurar.<br><b>Yeni çağ eklemek için motoru değiştirmek gerekmez</b>; yeni bir alt sınıf yeter. 6. seviyede bunun ne kadar değerli olduğunu göreceksin.`
    },
    {
      n: 5, title: 'Turizm', topic: 'İlişkiler + Kapsülleme', icon: '🚀',
      brief: `<p><b>Müdür'den:</b> Artık müşteri kabul ediyoruz!</p>
<ul>
<li><b>ZamanAraci</b> soyut: <code>ad</code>; soyut <code>yolculuk_suresi(yil_farki)</code> → int (gün). En az <b>2 alt sınıf</b>, süreyi farklı hesaplasın: örn. Kapsul her 100 yıl için 1 gün, Portal her zaman 5 gün.</li>
<li><b>Gezgin</b>: <code>ad</code> ve <b>gizli</b> <code>paradoks</code> puanı (başta 0). <code>paradoks_ekle(miktar)</code> puanı değiştirir ama puan <b>0 ile 100 arasında</b> kalır. <code>get_paradoks()</code> puanı döndürür.</li>
<li><b>Tur</b>: <code>Tur(cag, arac)</code>; bir çağı ve bir aracı <b>bilir</b> (ilişki →, roller <code>cag</code> ve <code>arac</code>). Gezginleri toplar: <code>gezginler</code> (◇), <code>gezgin_ekle(gezgin)</code>.</li>
<li>Bir tur kur ve en az bir gezgin ekle. Araç ve gezginler Tur sahnesinde görünecek.</li>
</ul>`,
      concept: `UML'nin dört ilişki çizgisini birlikte kullanıyorsun: Tur → Cag (ilişki, <code>1</code>), Tur ◇ Gezgin (toplama, <code>0..*</code>), ZamanAraci ◁── Kapsul (kalıtım). Kapsüllemede kural (0–100) <b>metodun içindedir</b>; dışarıdan atlatılamaz.`
    },
    {
      n: 6, title: 'Değişiklik Talepleri', topic: 'Değişikliğe dayanıklı tasarım', icon: '📨',
      brief: `<p><b>Müdür'den, acil:</b> Müşteriler yeni şeyler istiyor! Ama ajansın yazılımı çalışıyor; <b>eski sınıflara dokunmak yasak</b>. Her talebi yalnızca <b>YENİ sınıflar</b> ekleyerek çöz (enum'a yeni sabit eklemek serbest).</p>
<ol>
<li><b>Işınlayıcı:</b> anında giden yeni bir araç; <code>yolculuk_suresi()</code> her zaman 0.</li>
<li><b>Parlayan canlı:</b> hem yürüyen/uçan hem ışık saçan yeni bir canlı (Ateş Böceği, Anka…): Canli + Hareketli + Isiklandirilabilir.</li>
<li><b>Yeni bir gökyüzü:</b> Gokyuzu'na yeni bir sabit ekle ve onu kullanan yeni bir çağ yaz, ajansa ekle.</li>
</ol>
<p>Her talep için önce Plan'a yeni kutuyu çiz, sonra kodla. Eski bir sınıfı değiştirirsen uygulama fark eder ve uyarır.</p>`,
      concept: `<b>Açık/Kapalı ilkesi</b>: iyi bir tasarım <i>eklemeye açık, değiştirmeye kapalıdır</i>. Soyut sınıflar ve arayüzler sayesinde yeni bir araç, canlı ya da çağ eklemek için hiçbir eski satıra dokunmadın. Kalıtım ve çok biçimliliğin asıl kazancı budur.`
    },
    {
      n: 7, title: 'Zaman Turu', topic: 'Teslim', icon: '🌀',
      brief: `<p><b>Müdür'den:</b> Ajans açılışa hazır! 🎉</p>
<ul><li><b>🌀 Tur</b> sekmesinde <b>tüm çağları gez</b>: W A S D ile yürü, fareyle bak (önce sahneye tıkla), Shift ile koş. Ya da 🔄 Döndür moduna geçip fareyle çevir.</li>
<li>Son olarak <b>📄 PDF</b>: UML diyagramın, kodun ve her çağının 3D görüntüsü.</li></ul>`,
      concept: `Bu ödevde OOP'nin dört temel taşını (kapsülleme, kalıtım, çok biçimlilik, soyutlama) ve UML sınıf diyagramının bütün öğelerini kullandın: görünürlük, soyut sınıf, arayüz, enum, beş ilişki türü ve çokluklar. Artık bir sistemi metinden UML'ye, UML'den koda taşıyabiliyorsun.`
    }
  ];

  const MODE_ICON = { d: '📐', c: '⌨️', r: '📨', s: '🌀', p: '📄' };
  const MISSIONS = [
    // 1
    { id: 'u1', lv: 1, mode: 'd', text: 'Plan\'a 4 «enumeration» çiz: <b>Malzeme</b> (en az 6), <b>Gokyuzu</b>, <b>Zemin</b>, <b>Hava</b> (en az 3\'er).', ok: () => all(() => needEnum('Malzeme', 6), () => needEnum('Gokyuzu', 3), () => needEnum('Zemin', 3), () => needEnum('Hava', 3)) },
    { id: 'u2', lv: 1, mode: 'd', text: 'Soyut <b>Cag</b>\'ı çiz: <code>+ ad</code>, gizli <code>− yil</code>, <code>get_yil()</code>, <code>yil_metni()</code> ve 3 soyut metot.', ok: () => all(() => needClass('Cag', 'abstract'), () => needAttr('Cag', 'ad', '+', 'str'), () => needAttr('Cag', 'yil', '-', 'int'), () => needMeth('Cag', 'get_yil', [], 'int'), () => needMeth('Cag', 'yil_metni', [], 'str'), () => needMeth('Cag', 'gok', [], 'Gokyuzu', true), () => needMeth('Cag', 'zemin', [], 'Zemin', true), () => needMeth('Cag', 'hava', [], 'Hava', true)) },
    { id: 'k1', lv: 1, mode: 'c', text: '4 enum\'u Python\'da yaz (Malzeme değerleri <code>"#RRGGBB"</code>).', ok: () => all(umlFirst('u1'), () => tests('enumlar'), () => litsMatch('Malzeme'), () => litsMatch('Gokyuzu'), () => litsMatch('Zemin'), () => litsMatch('Hava')) },
    { id: 'k2', lv: 1, mode: 'c', text: '<b>Cag</b>\'ı ve ilk çağını kodla, bir nesne üret. Önizlemede çağın açılışını izle! <small>(İlk çağı Plan\'a da çiz: ──▷ Cag)</small>', ok: () => all(umlFirst('u2'), () => tests('cag', 'ilk_cag'), () => needGenCount('Cag', 1)) },
    // 2
    { id: 'u3', lv: 2, mode: 'd', text: 'Soyut <b>Yapi</b> + en az 3 alt sınıf, Cag ◇ Yapi (<code>0..*</code>, <code>yapilar</code>), <code>yapi_ekle</code> ve bir <b>bileşik yapı</b> ◆ çiz.', ok: () => all(() => needClass('Yapi', 'abstract'), () => needAttr('Yapi', 'malzeme', '+', 'Malzeme'), () => needAttr('Yapi', 'yukseklik', '+', 'int'), () => needMeth('Yapi', 'aciklama', [], 'str', true), () => needGenCount('Yapi', 3), () => needRel('Cag', 'Yapi', 'agg', '0..*', 'yapilar'), () => needMeth('Cag', 'yapi_ekle', ['Yapi'], 'bool'), () => needInnerComp()) },
    { id: 'k3', lv: 2, mode: 'c', text: '<b>Yapi</b> ve alt sınıflarını kodla, <code>yapi_ekle</code>\'yi 12 yapı kuralıyla yaz.', ok: () => all(umlFirst('u3'), () => tests('yapi')) },
    { id: 'k4', lv: 2, mode: 'c', text: 'Bileşik yapını kodla ve bir çağa en az <b>5 yapı</b> diz. 🏗️', ok: () => all(umlFirst('u3'), () => tests('bilesik')) },
    // 3
    { id: 'u4', lv: 3, mode: 'd', text: 'Soyut <b>Canli</b>, «interface» <b>Hareketli</b> ve <b>Isiklandirilabilir</b>, enum <b>HareketTipi</b>; 2 canlı türü (──▷ ve ┄▷), 1 ışıklı yapı, Cag ◇ Canli.', ok: () => all(() => needClass('Canli', 'abstract'), () => needAttr('Canli', 'ad', '+', 'str'), () => needAttr('Canli', 'boy', '+', 'int'), () => needAttr('Canli', 'malzeme', '+', 'Malzeme'), () => needMeth('Canli', 'ses', [], 'str', true), () => needClass('Hareketli', 'interface'), () => needMeth('Hareketli', 'hareket_et', [], 'HareketTipi', true), () => needClass('Isiklandirilabilir', 'interface'), () => needMeth('Isiklandirilabilir', 'isik', [], 'Malzeme', true), () => needEnum('HareketTipi', 3), () => needBoth('Canli', 'Hareketli', 2), () => needBoth('Yapi', 'Isiklandirilabilir', 1), () => needRel('Cag', 'Canli', 'agg', '0..*', 'canlilar'), () => needMeth('Cag', 'canli_ekle', ['Canli'], 'None')) },
    { id: 'k5', lv: 3, mode: 'c', text: 'Canlıları ve arayüzleri kodla, bir çağa ekle. Önizlemede dolaşıp konuşsunlar! 🦖', ok: () => all(umlFirst('u4'), () => tests('canli')) },
    { id: 'k6', lv: 3, mode: 'c', text: 'Işıklı yapını kodla ve bir çağa ekle. ✨', ok: () => all(umlFirst('u4'), () => tests('isik')) },
    // 4
    { id: 'u5', lv: 4, mode: 'd', text: '<b>ZamanAjansi</b>\'ni çiz (ZamanAjansi ◇ Cag, <code>1..*</code>, <code>caglar</code>) ve toplam en az <b>3 çağ</b> sınıfı.', ok: () => all(() => needClass('ZamanAjansi', 'class'), () => needAttr('ZamanAjansi', 'ad', '+', 'str'), () => needMeth('ZamanAjansi', 'cag_ekle', ['Cag'], 'None'), () => needMeth('ZamanAjansi', 'zaman_cizelgesi', [], 'list[Cag]'), () => needRel('ZamanAjansi', 'Cag', 'agg', '1..*', 'caglar'), () => needGenCount('Cag', 3)) },
    { id: 'k7', lv: 4, mode: 'c', text: 'Ajansı kur: 3 farklı çağ, <code>zaman_cizelgesi()</code> yıla göre sıralı. 🌀 Tur açılır!', ok: () => all(umlFirst('u5'), () => tests('ajans')) },
    // 5
    { id: 'u6', lv: 5, mode: 'd', text: 'Turizmi çiz: soyut <b>ZamanAraci</b> + 2 araç, <b>Gezgin</b> (gizli paradoks), <b>Tur</b> (→ Cag, → ZamanAraci, ◇ Gezgin).', ok: () => all(() => needClass('ZamanAraci', 'abstract'), () => needAttr('ZamanAraci', 'ad', '+', 'str'), () => needMeth('ZamanAraci', 'yolculuk_suresi', ['int'], 'int', true), () => needGenCount('ZamanAraci', 2), () => needClass('Gezgin', 'class'), () => needAttr('Gezgin', 'ad', '+', 'str'), () => needAttr('Gezgin', 'paradoks', '-', 'int'), () => needMeth('Gezgin', 'get_paradoks', [], 'int'), () => needMeth('Gezgin', 'paradoks_ekle', ['int'], 'None'), () => needClass('Tur', 'class'), () => needMeth('Tur', 'gezgin_ekle', ['Gezgin'], 'None'), () => needRel('Tur', 'Cag', 'assoc', '1', 'cag'), () => needRel('Tur', 'ZamanAraci', 'assoc', '1', 'arac'), () => needRel('Tur', 'Gezgin', 'agg', '0..*', 'gezginler')) },
    { id: 'k8', lv: 5, mode: 'c', text: 'Turizmi kodla, bir tur kur ve gezgin ekle. 🚀', ok: () => all(umlFirst('u6'), () => tests('turizm')) },
    // 6
    { id: 't1', lv: 6, mode: 'r', text: '📨 <b>Talep 1 · Işınlayıcı</b>: yeni araç, süresi hep 0. (UML + kod, eski sınıflara dokunmadan)', ok: () => all(() => newGen('ZamanAraci'), () => tests('t1')) },
    { id: 't2', lv: 6, mode: 'r', text: '📨 <b>Talep 2 · Parlayan canlı</b>: Canli + Hareketli + Isiklandirilabilir.', ok: () => all(() => newTriple(), () => tests('t2')) },
    { id: 't3', lv: 6, mode: 'r', text: '📨 <b>Talep 3 · Yeni gökyüzü</b>: Gokyuzu\'na yeni sabit + onu kullanan yeni çağ.', ok: () => all(() => newGen('Cag'), () => tests('t3')) },
    // 7
    { id: 's1', lv: 7, mode: 's', text: '🌀 Tur\'da <b>bütün çağları</b> ziyaret et.', ok: () => (S.events.allVisited ? true : 'Tur sekmesinde her çağın adasına yürü (ya da çağ düğmelerine tıkla).') },
    { id: 'p1', lv: 7, mode: 'p', text: '📄 <b>PDF</b>\'i indir: UML + kod + çağlarının 3D görüntüsü.', ok: () => (S.events.pdf ? true : 'Üstteki 📄 PDF düğmesine tıkla.') }
  ];

  const ERAS = [
    ['Mezozoyik', -66000000, 'GUNDUZ', 'CIMEN', 'YAPRAK', 'Dinozor, Volkan, Agac'],
    ['BuzulCagi', -20000, 'AURORA', 'KAR', 'KAR', 'Mamut, Iglo, Penguen'],
    ['AntikMisir', -2560, 'GUN_BATIMI', 'KUM', 'KUM_FIRTINASI', 'Piramit, Sfenks, Obelisk, Deve, Kedi'],
    ['StonehengeCagi', -2500, 'SISLI', 'CIMEN', 'SIS', 'TasCember, Agac'],
    ['AntikYunan', -450, 'GUNDUZ', 'KAYA', 'ACIK', 'Tapinak ◆ Sutun, Heykel'],
    ['MayaUygarligi', 600, 'SAFAK', 'CIMEN', 'YAPRAK', 'MayaPiramidi, Kartal'],
    ['VikingCagi', 900, 'AURORA', 'KAR', 'KAR', 'Ev, Fener, Kale'],
    ['OsmanliIstanbul', 1453, 'GUN_BATIMI', 'KAYA', 'ACIK', 'Cami ◆ Minare, Kule, Cesme, Kedi'],
    ['EdoJaponya', 1700, 'PEMBE_BULUT', 'CICEK', 'YAPRAK', 'Pagoda, Kopru'],
    ['LaleDevri', 1718, 'SAFAK', 'CICEK', 'KONFETI', 'YelDegirmeni, Cesme, Kelebek'],
    ['VahsiBati', 1880, 'GUN_BATIMI', 'KUM', 'KUM_FIRTINASI', 'Ev, At'],
    ['UzayYarisi', 1969, 'YILDIZLI', 'KAYA', 'YILDIZ_KAYMASI', 'Roket'],
    ['MarsKolonisi', 2150, 'KIZIL', 'KAYA', 'KUM_FIRTINASI', 'UzayUssu, Roket, Uzayli'],
    ['Gelecek2300', 2300, 'YILDIZLI', 'METAL', 'YILDIZ_KAYMASI', 'Gokdelen, Robot'],
    ['Atlantis', -9600, 'AURORA', 'SU', 'BALONCUK', 'Kale (CAM), Yunus'],
    ['BulutKrallik', 3000, 'PEMBE_BULUT', 'BULUT', 'KONFETI', 'SicakHavaBalonu, Kale, Anka'],
    ['EjderhaVadisi', -1000, 'ALACAKARANLIK', 'LAV', 'ATES_BOCEGI', 'Volkan, Kristal, Ejderha'],
    ['SekerDiyari', 5000, 'GOKKUSAGI', 'CICEK', 'KONFETI', 'Kubbe (SEKER), Kelebek'],
    ['BataklikKrallik', -300000, 'SISLI', 'BATAKLIK', 'ATES_BOCEGI', 'Agac, AtesBocegi']
  ];

  const CARDS = [
    { k: 'abc', t: 'Soyut sınıf (ABC)', code: `from abc import ABC, abstractmethod

class Muzik(ABC):
    def __init__(self, ad):
        self.ad = ad

    @abstractmethod
    def tur(self):
        pass

class Caz(Muzik):
    def tur(self):
        return Tur.CAZ          # bir enum sabiti`, note: 'Soyut sınıftan nesne üretilmez; alt sınıf tüm @abstractmethod\'ları yazmalı.' },
    { k: 'priv', t: 'Gizli özellik + kurallı metot', code: `class Hesap:
    def __init__(self):
        self.__bakiye = 0          # private

    def get_bakiye(self):
        return self.__bakiye

    def yatir(self, miktar):
        self.__bakiye = max(0, min(1000, self.__bakiye + miktar))`, note: 'UML: − bakiye: int · Kural metodun içinde: 0 ile 1000 arası.' },
    { k: 'arayuz', t: 'Arayüz + çoklu gerçekleştirme', code: `class Ucabilir(ABC):
    @abstractmethod
    def uc(self):
        pass

class Kus(Hayvan, Ucabilir):      # bir aile, bir yetenek
    def uc(self):
        return "kanat çırp"`, note: 'Önce üst sınıf, sonra arayüzler: class X(UstSinif, Arayuz1, Arayuz2)' },
    { k: 'super', t: 'super() ile kurulum', code: `class Kitap(Urun):
    def __init__(self, ad, fiyat, yazar):
        super().__init__(ad, fiyat)   # üst sınıfın __init__'i
        self.yazar = yazar`, note: 'Alt sınıf ek parametre alıyorsa önce super().__init__.' },
    { k: 'bilesim', t: 'Bileşim: parçaları __init__ üretir', code: `class Araba:
    def __init__(self, marka, kapi_sayisi):
        self.marka = marka
        self.kapilar = []
        for i in range(kapi_sayisi):
            self.kapilar.append(Kapi(i + 1))   # ◆`, note: 'Toplamada parça dışarıdan gelir (ekle(x)); bileşimde bütün kendisi üretir.' },
    { k: 'sinir', t: 'Kapasite kuralı ve True/False', code: `def ogrenci_ekle(self, ogrenci):
    if len(self.ogrenciler) >= 30:
        return False
    self.ogrenciler.append(ogrenci)
    return True`, note: 'Metot işi yapıp yapmadığını bool ile bildirir.' },
    { k: 'sorted', t: 'Sıralama: sorted + key', code: `def siralama(self):
    return sorted(self.oyuncular, key=lambda o: o.get_puan())`, note: 'key, her elemandan sıralanacak değeri çıkaran fonksiyondur.' },
    { k: 'yil', t: 'Koşullu metin', code: `def sicaklik_metni(self):
    if self.__derece < 0:
        return "Eksi " + str(-self.__derece)
    return str(self.__derece) + " derece"`, note: 'str() ile sayıyı metne çevir; eksi işaretini kaldırmak için -sayı.' }
  ];

  const STARTER = `# ⏳ Kronos Ajansı — senin Python kodun
# UML'de çizdiğin her şeyi burada koda çevir.
# Yazmayı bıraktığında kod kendiliğinden çalışır, sağdaki 3D önizleme çağlarını kurar.
# 📚 Katalog'daki sınıf adlarını kullanırsan (Piramit, Ejderha, Roket...) 3D'de o modeller çizilir.

from abc import ABC, abstractmethod
from enum import Enum, auto


# ---- Enum'lar ----



# ---- Arayüzler ----



# ---- Sınıflar ----



# ---- Nesneler: çağlarını kur ----

`;

  /* =====================================================================
     DURUM (kalıcı: localStorage + kayıt dosyası)
     ===================================================================== */
  const fresh = () => ({
    app: 'kronos', v: 1, uml: { classes: [], rels: [] }, code: STARTER, mode: 'plan', defter: true, jlv: null,
    zoom: 0.8, done: {}, events: {}, maxLevel: 1, finished: false, tests: {}, analysis: null, snap: null,
    intro: false, mkTab: 'onizleme', cardOpen: 'abc', live: true, letterClosed: {}, base: null, baseGok: null,
    selEra: 0, labels: true, savedAt: null
  });
  let S = load() || fresh();
  const T = { drag: null, hints: {}, runBusy: false, runQueued: false, teacherOk: false, flash: null, stale: false, prev: null, tour: null, mini: null, threeErr: null };
  let root = null, VER = 0, MC = null, MCV = -1;

  function load() {
    try { const t = localStorage.getItem(SAVE_KEY); return t ? Object.assign(fresh(), JSON.parse(t)) : null; } catch (_) { return null; }
  }
  function saveNow() { S.savedAt = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (_) { /* depolama yoksa dosya ile kaydedilir */ } }
  const save = debounce(saveNow, 400);
  function touch() { VER++; }
  function exportSave() {
    saveNow();
    const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    const d = new Date(); a.download = `kronos-kayit-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('💾 Kayıt dosyası indirildi. Başka bir bilgisayarda ☰ → Kayıt yükle ile devam edebilirsin.', 'good', 5200);
  }
  function importSave() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const d = JSON.parse(rd.result);
          if (!d || d.app !== 'kronos' || !d.uml || typeof d.code !== 'string') throw new Error('bu bir Kronos kaydı değil');
          modal(`<h3>Kayıt yüklensin mi?</h3><p>Şu anki çalışman bu dosyadakiyle <b>değiştirilecek</b>.</p>`, [{ label: 'Vazgeç' }, { label: 'Yükle', cls: 'lava', fn: () => {
            S = Object.assign(fresh(), d); S.intro = true; T.hints = {}; T.prev = null; touch(); saveNow();
            if (ED.ta) setCode(S.code); clearOut(); evaluate(true); renderAll(); runCode(true); toast('📂 Kayıt yüklendi. Kaldığın yerden devam!', 'good');
          } }]);
        } catch (e) { toast('Dosya okunamadı: ' + e.message, 'bad', 4500); }
      };
      rd.readAsText(f);
    };
    inp.click();
  }

  /* =====================================================================
     UML MODELİ
     ===================================================================== */
  const normVis = v => (v === '−' ? '-' : v || '');
  function parseAttr(s) {
    if (/\(/.test(s)) return { cls: 'bad', err: 'Bu bir metot gibi görünüyor; metotlar alttaki bölmeye yazılır.' };
    const m = RE_ATTR.exec(s);
    if (!m) return { cls: 'bad', err: 'Biçim: + ad: tip   (ör. − yil: int)' };
    const vis = normVis(m[1]), type = (m[3] || '').trim();
    const warn = !vis ? 'Görünürlük işareti eksik: başına + (public), − (private) ya da # koy.' : !type ? 'Tip eksik: + ad: str gibi yaz.' : '';
    return { ok: true, vis, name: m[2], type, cls: warn ? 'warn' : 'ok', err: warn };
  }
  function parseMeth(s) {
    const m = RE_METH.exec(s);
    if (!m) return { cls: 'bad', err: /\(/.test(s) ? 'Parantezleri kontrol et: + gok(): Gokyuzu {abstract}' : 'Metot parantezle yazılır: + get_yil(): int' };
    const params = m[3].split(',').map(p => p.trim()).filter(Boolean).map(p => { const x = /^([^:]+?)\s*(?::\s*(.+))?$/.exec(p); return { name: x ? x[1].trim() : p, type: x && x[2] ? x[2].trim() : '' }; });
    const vis = normVis(m[1]), ret = (m[4] || '').trim();
    const warn = !vis ? 'Görünürlük işareti eksik: başına + koy.' : !ret ? 'Dönüş tipi eksik: sonuna : None ya da : int ekle.' : params.some(p => !p.type) ? 'Parametrenin tipi eksik: (yapi: Yapi)' : '';
    return { ok: true, vis, name: m[2], params, ret, abstract: !!m[5], cls: (warn ? 'warn' : 'ok') + (m[5] ? ' abs' : ''), err: warn };
  }
  function parseLit(s) {
    if (/[:()+]/.test(s) || /^[-#~−]/.test(s)) return { cls: 'bad', err: 'Enum sabitine tip, + ya da parantez yazılmaz. Sadece adını yaz: ALTIN' };
    const m = RE_LIT.exec(s);
    if (!m) return { cls: 'bad', err: 'Geçersiz sabit adı.' };
    const up = /^[A-Z][A-Z0-9_]*$/.test(m[1]);
    return { ok: true, name: m[1], cls: up ? 'lit' : 'warn', err: up ? '' : 'Enum sabitleri BÜYÜK HARFLE ve Türkçe karakter olmadan yazılır.' };
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
  const parentsOf = (c, type) => M().rels.filter(r => r.a === c.id && r.type === type).map(r => M().byId[r.b]);
  function ancestors(c, type) { const out = new Set(), st = [c]; while (st.length) { const x = st.pop(); parentsOf(x, 'gen').concat(type === 'real' ? parentsOf(x, 'real') : []).forEach(p => { if (!out.has(p)) { out.add(p); st.push(p); } }); } return out; }
  const isSub = (c, sup) => !!c && !!sup && [...ancestors(c, 'real')].includes(sup);

  /* ---------------- görev kontrolleri ---------------- */
  function all(...xs) { for (const x of xs) { const r = typeof x === 'function' ? x() : x; if (r !== true) return r; } return true; }
  function needEnum(name, min, req) {
    const c = clsByName(name);
    if (!c) return `Plan'da ${name} adında bir kutu yok. «enum» düğmesiyle ekle.`;
    if (c.name !== name) return `Kutunun adı tam olarak ${name} olmalı (şu an: ${c.name}).`;
    if (c.kind !== 'enum') return `${name} bir «enumeration» olmalı. Kutunun başlığındaki tür seçicisinden Enum'u seç.`;
    const bad = c.attrs.find(p => p.cls === 'bad' || p.cls === 'warn');
    if (bad) return `${name}: ${bad.err}`;
    const miss = (req || []).filter(x => !c.lits.includes(x));
    if (miss.length) return `${name} kutusunda eksik sabit: ${miss.join(', ')}`;
    if (min && c.lits.length < min) return `${name} kutusunda ${c.lits.length} sabit var; en az ${min} olmalı.`;
    return true;
  }
  function needClass(name, kind) {
    const c = clsByName(name);
    if (!c) return `Plan'da ${name} adında bir kutu yok.`;
    if (c.name !== name) return `Kutunun adı tam olarak ${name} olmalı (şu an: ${c.name}).`;
    if (kind && c.kind !== kind) return `${name} bir ${KIND[kind].label.toLocaleLowerCase('tr')} olmalı. Kutunun başlığındaki tür seçicisinden ${KIND[kind].label}'ı seç.`;
    return true;
  }
  const sameType = (a, b) => fold(a) === fold(b);
  function needAttr(cn, an, vis, type) {
    const c = clsByName(cn); if (!c) return `${cn} kutusu yok.`;
    const a = c.attrs.find(p => p.ok && p.name === an);
    if (!a) return `${cn} kutusunda ${an} özelliği yok. Yaz: ${vis === '-' ? '−' : vis} ${an}: ${type}`;
    if (a.vis !== vis) return `${cn}.${an} ${vis === '-' ? 'gizli (private) olmalı: başına − koy' : 'herkese açık olmalı: başına + koy'}.`;
    if (!sameType(a.type, type)) return `${cn}.${an} tipi ${type} olmalı${a.type ? ` (şu an: ${a.type})` : ''}.`;
    return true;
  }
  function needMeth(cn, mn, ptypes, ret, abs) {
    const c = clsByName(cn); if (!c) return `${cn} kutusu yok.`;
    const m = c.meths.find(p => p.ok && p.name === mn);
    const sig = `+ ${mn}(${ptypes.map(t => fold(t) === 'int' ? (mn === 'yolculuk_suresi' ? 'yil_farki' : 'miktar') + ': int' : t.toLocaleLowerCase('tr') + ': ' + t).join(', ')}): ${ret}${abs ? ' {abstract}' : ''}`;
    if (!m) return `${cn} kutusunun metot bölmesinde ${mn} yok. Yaz: ${sig}`;
    if (m.vis !== '+') return `${cn}.${mn}() herkese açık olmalı: başına + koy.`;
    if (m.params.length !== ptypes.length) return `${mn}() ${ptypes.length ? ptypes.length + ' parametre almalı' : 'parametresiz olmalı'}: ${sig}  (self UML'ye yazılmaz)`;
    for (let i = 0; i < ptypes.length; i++) if (!sameType(m.params[i].type, ptypes[i])) return `${mn}() parametresinin tipi ${ptypes[i]} olmalı: ${sig}`;
    if (!sameType(m.ret, ret)) return `${mn}() dönüş tipi ${ret} olmalı: ${sig}`;
    if (abs && !m.abstract) return `${cn}.${mn}() soyut olmalı: satırın sonuna {abstract} ekle.`;
    if (!abs && m.abstract) return `${cn}.${mn}() soyut olmamalı: {abstract}'ı kaldır.`;
    return true;
  }
  function needRel(an, bn, type, mb, role) {
    const m = M(), a = clsByName(an), b = clsByName(bn);
    if (!a || !b) return `${an} ve ${bn} kutuları olmalı.`;
    const rs = m.rels.filter(r => (r.a === a.id && r.b === b.id) || (r.a === b.id && r.b === a.id));
    if (!rs.length) return `${an} ile ${bn} arasında ilişki yok. 🔗 İlişki düğmesiyle ekle.`;
    const r = rs.find(x => x.type === type);
    if (!r) return `${an}–${bn} ilişkisinin türü ${RTYPES[type].name} ${RTYPES[type].sym} olmalı.`;
    if (r.a !== a.id) return `Yön ters: ${type === 'assoc' ? `${an} bilen, ${bn} bilinen taraf` : `bütün ${an}, parça ${bn}`} olmalı.`;
    if (normMult(r.mb) !== mb) return `${bn} ucundaki çokluk ${mb} olmalı: bir ${an}'de kaç ${bn} olabilir?`;
    if (fold(r.role) !== fold(role)) return `${bn} ucundaki rol adı ${role} olmalı (kodda self.${role}).`;
    return true;
  }
  const subsOf = name => { const sup = clsByName(name); return sup ? M().classes.filter(c => c !== sup && c.name && parentsOf(c, 'gen').includes(sup)) : []; };
  function needGenCount(name, n) {
    const sup = clsByName(name); if (!sup) return `${name} kutusu yok.`;
    const k = subsOf(name).length;
    return k >= n ? true : `${name}'dan türeyen en az ${n} sınıf çiz (kalıtım ──▷, alt sınıftan ${name}'a). Şu an ${k}.`;
  }
  function needBoth(base, iface, n) {
    const B = clsByName(base), I = clsByName(iface); if (!B || !I) return `${base} ve ${iface} kutuları olmalı.`;
    const k = M().classes.filter(c => c !== B && isSub(c, B) && parentsOf(c, 'real').concat(...[...ancestors(c, 'real')].map(x => parentsOf(x, 'real'))).includes(I)).length;
    return k >= n ? true : `${n === 1 ? 'Bir' : n} sınıf hem ${base}'dan türesin (──▷) hem de ${iface}'i gerçekleştirsin (┄▷). Şu an ${k}.`;
  }
  function needInnerComp() {
    const Y = clsByName('Yapi'); if (!Y) return 'Yapi kutusu yok.';
    const r = M().rels.find(x => x.type === 'comp' && isSub(M().byId[x.a], Y) && isSub(M().byId[x.b], Y));
    return r ? (r.role ? true : 'Bileşik yapının ◆ çizgisinde parça ucuna bir rol adı yaz (ör. kuleler).') : 'Bileşik yapı çiz: Yapi\'dan türeyen bir sınıftan (ör. Kale) yine Yapi\'dan türeyen parçasına (ör. Kule) bileşim ◆ çizgisi.';
  }
  const baseNames = () => new Set(Object.keys(S.base || {}));
  function newGen(name) {
    const sup = clsByName(name); if (!sup) return `${name} kutusu yok.`;
    const b = baseNames(), yeni = subsOf(name).filter(c => !b.has(c.name));
    return yeni.length ? true : `Plan'a ${name}'dan türeyen YENİ bir sınıf çiz (──▷).`;
  }
  function newTriple() {
    const C = clsByName('Canli'), H = clsByName('Hareketli'), I = clsByName('Isiklandirilabilir'); if (!C || !H || !I) return 'Canli, Hareketli ve Isiklandirilabilir kutuları olmalı.';
    const b = baseNames();
    const ok = M().classes.filter(c => c.name && !b.has(c.name) && isSub(c, C) && parentsOf(c, 'real').includes(H) && parentsOf(c, 'real').includes(I));
    return ok.length ? true : 'Plan\'a YENİ bir canlı çiz: Canli\'dan türesin (──▷), Hareketli ve Isiklandirilabilir\'i gerçekleştirsin (┄▷ ×2).';
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

  /* =====================================================================
     İSKELET
     ===================================================================== */
  const ICON = {
    logo: '<svg viewBox="0 0 44 44" width="40" height="40" aria-hidden="true"><circle cx="22" cy="22" r="19" fill="#FFF6E0" stroke="#2B2350" stroke-width="2.5"/><circle cx="22" cy="22" r="14" fill="none" stroke="#B39DFF" stroke-width="2" stroke-dasharray="3 3"/><path d="M22 10 V22 L30 27" stroke="#2B2350" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="22" cy="22" r="2.5" fill="#F2A93B"/><path d="M36 8 l3 -3 M8 36 l-3 3" stroke="#F2A93B" stroke-width="2.5" stroke-linecap="round"/></svg>',
    cls: '<svg viewBox="0 0 24 24" width="19" height="19"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9 H21 M3 14 H21" stroke="currentColor" stroke-width="2"/></svg>',
    abs: '<svg viewBox="0 0 24 24" width="19" height="19"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"/><text x="12" y="16.5" text-anchor="middle" font-size="11" font-style="italic" font-weight="800" fill="currentColor">A</text></svg>',
    ifc: '<svg viewBox="0 0 24 24" width="19" height="19"><circle cx="12" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 13 V21" stroke="currentColor" stroke-width="2"/></svg>',
    enm: '<svg viewBox="0 0 24 24" width="19" height="19"><rect x="3" y="4" width="18" height="16" rx="2" fill="#FFF3C4" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="12" r="2" fill="#E5484D"/><circle cx="12" cy="12" r="2" fill="#3D8BFF"/><circle cx="16" cy="12" r="2" fill="#46A758"/></svg>',
    rel: '<svg viewBox="0 0 24 24" width="19" height="19"><path d="M3 12 L6.5 9 L10 12 L6.5 15 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 12 H21" stroke="currentColor" stroke-width="2"/></svg>'
  };
  function relIcon(t) {
    const line = `<line x1="${t === 'agg' || t === 'comp' ? 24 : 3}" y1="9" x2="${t === 'gen' || t === 'real' ? 43 : 58}" y2="9" stroke="currentColor" stroke-width="2"${t === 'real' ? ' stroke-dasharray="5 4"' : ''}/>`;
    let s = '';
    if (t === 'agg' || t === 'comp') s += `<path d="M3 9 L13.5 3.5 L24 9 L13.5 14.5 Z" fill="${t === 'comp' ? 'currentColor' : '#fff'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`;
    if (t === 'gen' || t === 'real') s += '<path d="M59 9 L43 2 L43 16 Z" fill="#fff" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>';
    if (t === 'assoc') s += '<path d="M47 3 L59 9 L47 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>';
    return `<svg class="w8-ricon" viewBox="0 0 62 18" width="62" height="18" aria-hidden="true">${line}${s}</svg>`;
  }

  function shellHTML() {
    return `
    <header class="w8-top">
      <button class="btn" data-act="home">← Haftalar</button>
      <div class="w8-brand"><span class="w8-logo">${ICON.logo}</span><div><small>8. Hafta · Ödev · OOP + UML</small><b>Kronos Ajansı</b></div></div>
      <nav class="w8-modes" id="w8-modes" aria-label="Aşamalar"></nav>
      <div class="w8-prog" id="w8-prog"></div>
      <div class="w8-tact">
        <span class="w8-saved" id="w8-saved" title="Çalışman bu tarayıcıda kalıcı olarak saklanır"></span>
        <button class="btn" data-act="pdf" id="w8-pdf">📄 PDF</button>
        <div class="w8-menu">
          <button class="btn" data-act="menu" aria-haspopup="true" title="Diğer">☰</button>
          <div class="w8-menu-pop" id="w8-menu" hidden>
            <button data-act="export">💾 Kaydı indir (dosya)</button>
            <button data-act="import">📂 Kayıt yükle</button>
            <hr>
            <button data-act="guide">📘 UML kopya kâğıdı</button>
            <button data-act="help">❓ Nasıl çalışır?</button>
            <hr>
            <button data-act="teacher" id="w8-tbtn" hidden>👩‍🏫 Öğretmen</button>
            <button data-act="reset" class="danger">↺ Her şeyi sıfırla</button>
          </div>
        </div>
      </div>
    </header>
    <div class="w8-body" id="w8-body">
      <aside class="w8-defter" id="w8-defter" aria-label="Görevler"></aside>
      <button class="w8-dtab" data-act="defter" id="w8-dt" title="Görevleri aç/kapat"></button>
      <main class="w8-work">
        <section class="w8-view w8-plan" id="w8-v-plan" hidden>${planShell()}</section>
        <section class="w8-view w8-code" id="w8-v-code" hidden>${codeShell()}</section>
        <section class="w8-view w8-tour" id="w8-v-tour" hidden>${tourShell()}</section>
      </main>
      <aside class="w8-side" id="w8-side" aria-label="Önizleme">
        <div class="w8-mtabs" id="w8-mtabs" role="tablist"></div>
        <div class="w8-mbody" id="w8-mbody">
          <div class="w8-pv" id="w8-pv"><div class="w8-pvbar" id="w8-pvbar"></div><div class="w8-3d" id="w8-3d"><div class="w8-3dmsg" id="w8-3dmsg">🌍 3D önizleme hazırlanıyor…</div></div><div class="w8-pvinfo" id="w8-pvinfo"></div></div>
          <div class="w8-mpane" id="w8-mpane" hidden></div>
        </div>
      </aside>
    </div>`;
  }

  function renderAll() { renderTop(); renderDefter(); renderMode(); renderSide(); }

  const tourOpen = () => !!S.done.k7 || T.teacherOk;
  const pdfLeft = () => MISSIONS.filter(m => m.id !== 'p1' && !S.done[m.id]).length;
  function renderTop() {
    const modes = [['plan', '1', 'Plan', 'UML'], ['code', '2', 'Kod', 'Python'], ['tour', '3', 'Tur', '3D zaman turu']];
    $('#w8-modes').innerHTML = modes.map(([k, n, t, s]) => {
      const locked = k === 'tour' && !tourOpen();
      return `<button class="w8-mode ${S.mode === k ? 'on' : ''} ${locked ? 'locked' : ''}" data-act="mode" data-m="${k}" ${S.mode === k ? 'aria-current="page"' : ''}>
        <i>${locked ? '🔒' : n}</i><span><b>${t}</b><small>${locked ? '4. seviyede' : s}</small></span></button>`;
    }).join('');
    const d = MISSIONS.filter(m => S.done[m.id]).length;
    $('#w8-prog').innerHTML = `<div class="w8-dial" style="--p:${(d / MISSIONS.length) * 360}deg" title="${d} / ${MISSIONS.length} görev"><span>${d}</span></div><small>/ ${MISSIONS.length} görev</small>`;
    $('#w8-dt').innerHTML = S.defter ? '‹' : '📜<span>Görevler</span>';
    $('#w8-body').classList.toggle('d-off', !S.defter);
    $('#w8-body').classList.toggle('t-on', S.mode === 'tour');
    const left = pdfLeft(), pb = $('#w8-pdf');
    pb.classList.toggle('w8-locked', left > 0 && !T.teacherOk);
    pb.innerHTML = left > 0 && !T.teacherOk ? '🔒 PDF' : '📄 PDF';
    pb.title = left > 0 ? `PDF tüm görevler bitince açılır (${left} görev kaldı)` : 'UML, kod ve çağlarının 3D görüntüsünü PDF olarak indir';
    updSaved();
  }
  function updSaved() {
    const el = $('#w8-saved'); if (!el) return;
    el.textContent = S.savedAt ? '💾 kaydedildi ' + new Date(S.savedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
  }

  function renderDefter() {
    const lvN = S.jlv && S.jlv <= S.maxLevel ? S.jlv : S.maxLevel;
    const L = LEVELS[lvN - 1];
    const pills = LEVELS.map(x => {
      const ms = MISSIONS.filter(m => m.lv === x.n), d = ms.filter(m => S.done[m.id]).length;
      const st = x.n > S.maxLevel ? 'lock' : d === ms.length ? 'done' : 'open';
      return `<button class="w8-lvp ${st} ${x.n === lvN ? 'on' : ''}" data-act="jlv" data-lv="${x.n}" title="${x.n}. ${x.title} · ${x.topic}" ${st === 'lock' ? 'aria-disabled="true"' : ''}><span>${st === 'lock' ? '🔒' : st === 'done' ? '✓' : x.icon}</span><small>${x.n}</small></button>`;
    }).join('<i class="w8-lvl"></i>');
    const ms = MISSIONS.filter(m => m.lv === lvN), d = ms.filter(m => S.done[m.id]).length;
    $('#w8-defter').innerHTML = `
      <div class="w8-lvps">${pills}</div>
      <div class="w8-dhead"><span class="w8-dn">${L.icon}</span><div><small>${lvN}. Seviye · ${L.topic}</small><h2>${L.title}</h2></div><span class="w8-dc">${d}/${ms.length}</span></div>
      <div class="w8-dscroll">
        <details class="w8-note" ${S.letterClosed[lvN] ? '' : 'open'} data-lv="${lvN}"><summary>📨 Ajans Müdürü'nden mesaj</summary><div class="w8-note-b">${L.brief}</div></details>
        <details class="w8-concept"><summary>💡 Kavram</summary><div>${L.concept}</div></details>
        <ul class="w8-ms">${ms.map(m => {
          const ok = !!S.done[m.id], h = !ok && T.hints[m.id];
          return `<li class="${ok ? 'ok' : ''} ${T.flash === m.id ? 'flash' : ''}"><span class="w8-ck">${ok ? '✓' : MODE_ICON[m.mode]}</span><div><span class="tx">${m.text}</span>${h && typeof h === 'string' ? `<span class="w8-hint">${esc(h)}</span>` : ''}</div></li>`;
        }).join('')}</ul>
      </div>
      <div class="w8-dfoot"><button class="btn" data-act="guide">📘 UML kopya kâğıdı</button><button class="btn" data-act="mktab" data-tab="katalog">📚 Katalog</button></div>`;
    T.flash = null;
  }

  function renderMode() {
    if (S.mode === 'tour' && !tourOpen()) S.mode = 'code';
    ['plan', 'code', 'tour'].forEach(k => { $('#w8-v-' + k).hidden = S.mode !== k; });
    root.dataset.mode = S.mode;
    if (S.mode === 'plan') renderPlan();
    else if (S.mode === 'code') renderCode();
    else renderTour();
  }
  function setMode(m) {
    if (m === 'tour' && !tourOpen()) { toast('🌀 Tur, ajans kurulunca açılır (4. seviyenin kod görevi).', 'info'); return; }
    if (S.mode === m) return;
    if (S.mode === 'tour' && document.pointerLockElement) document.exitPointerLock();
    S.mode = m; save();
    renderTop(); renderMode(); renderSide();
  }

  /* =====================================================================
     GÖREV DEĞERLENDİRME
     ===================================================================== */
  const evalSoon = debounce(() => evaluate(), 250);
  function safeOk(m) { try { return m.ok(); } catch (e) { return 'Kontrol edilemedi.'; } }
  function evaluate(quiet) {
    let changed = false, lvUp = null;
    const newly = [];
    for (let guard = 0; guard < 9; guard++) {
      MISSIONS.forEach(m => {
        if (m.lv > S.maxLevel || S.done[m.id]) return;
        const r = safeOk(m);
        if (r === true) { S.done[m.id] = true; newly.push(m); changed = true; T.flash = m.id; delete T.hints[m.id]; }
        else T.hints[m.id] = r;
      });
      if (S.maxLevel < LEVELS.length && MISSIONS.filter(m => m.lv === S.maxLevel).every(m => S.done[m.id])) {
        S.maxLevel++; S.jlv = null; changed = true; lvUp = S.maxLevel;
        if (S.maxLevel === 6) captureBase();
        continue;
      }
      break;
    }
    if (!quiet) newly.forEach(m => { const t = strip(m.text); toast('⏳ Görev tamam · ' + (t.length > 70 ? t.slice(0, 68) + '…' : t), 'star'); });
    if (!S.finished && MISSIONS.every(m => S.done[m.id])) { S.finished = true; changed = true; if (!quiet) setTimeout(finale, 900); }
    if (changed) { saveNow(); renderTop(); }
    renderDefter();
    if (lvUp && !quiet) setTimeout(() => levelUp(LEVELS[lvUp - 1]), newly.length ? 500 : 0);
  }
  // 6. seviye açılırken sınıfların o anki hâli saklanır: talepler bunlara dokunmadan çözülmeli
  function captureBase() {
    const cs = (S.analysis && S.analysis.classes) || {};
    S.base = {}; Object.entries(cs).forEach(([n, c]) => { if (!c.enum) S.base[n] = c.src; });
    S.baseGok = (cs.Gokyuzu && cs.Gokyuzu.lits) || [];
  }
  function levelUp(L) {
    confetti();
    const extra = L.n === 5 ? '<p>🌀 <b>Tur</b> sekmesi açıldı! Çağlarının arasında yürüyebilirsin.</p>' : L.n === 6 ? '<p>📨 <b>Üç acil müşteri talebi</b> geldi. Eski sınıflarının şu anki hâli kaydedildi; talepleri onlara <u>dokunmadan</u> çöz.</p>' : '';
    modal(`<div class="w8-lvup-art">${L.icon}</div><span class="tag">Seviye ${L.n} açıldı</span><h3>${L.title}</h3><p class="w8-lvup-topic">${L.topic}</p><div class="w8-lvup-c">${L.concept}</div>${extra}<p>Görevlerde Ajans Müdürü'nün yeni mesajı seni bekliyor. 📨</p>`,
      [{ label: 'Mesajı oku', cls: 'w8-go', fn: () => { S.defter = true; S.jlv = null; save(); renderTop(); renderDefter(); } }]);
  }
  function finale() {
    confetti(); setTimeout(confetti, 700);
    modal(`<div class="w8-lvup-art">🏆</div><span class="tag">${MISSIONS.length} / ${MISSIONS.length} görev</span><h3>Kronos Ajansı açıldı!</h3>
      <p>Soyut sınıflar, arayüzler, enumlar, gizli özellikler, kalıtım, bileşim, toplama ve çok biçimlilikle koca bir zaman turizmi sistemi tasarladın. Üstüne üç değişiklik talebini <b>tek bir eski satıra dokunmadan</b> karşıladın.</p>
      <p>UML'yi artık sadece çizmiyorsun, onunla tasarlıyorsun. PDF'ini almayı unutma! 📄</p>`, [{ label: 'Harika!', cls: 'w8-go' }]);
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
    card.className = 'modal-card ' + (cls || 'w8m');
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
    const cols = ['#7C5CFF', '#F2A93B', '#FF6FB5', '#46A758', '#3D8BFF', '#FFD34D'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('div');
      p.className = 'confetti'; p.style.left = Math.random() * 100 + 'vw'; p.style.background = pick(cols);
      p.style.animationDuration = 1.8 + Math.random() * 1.4 + 's'; p.style.animationDelay = Math.random() * 0.4 + 's';
      document.body.appendChild(p); setTimeout(() => p.remove(), 3800);
    }
  }

  /* =====================================================================
     REHBER ve YARDIM
     ===================================================================== */
  function guide() {
    modal(`<h3>📘 UML kopya kâğıdı</h3>
      <p class="w8-sub">Bu hafta UML sınıf diyagramının bütün öğelerini kullanıyorsun. Hepsi bir sayfada:</p>
      <h4>Kutu türleri</h4>
      <div class="w8-tbl"><table>
        <tr><th></th><th>UML</th><th>Python</th><th>Bu ödevde</th></tr>
        <tr><th>Sınıf</th><td>düz başlık</td><td><code>class Tur:</code></td><td>Tur, Gezgin, ZamanAjansi</td></tr>
        <tr><th>Soyut sınıf</th><td>«abstract», <i>italik</i> ad</td><td><code>class Cag(ABC):</code></td><td>Cag, Yapi, Canli, ZamanAraci</td></tr>
        <tr><th>Arayüz</th><td>«interface»</td><td>yalnızca soyut metotlu <code>ABC</code></td><td>Hareketli, Isiklandirilabilir</td></tr>
        <tr><th>Enum</th><td>«enumeration», yalnızca sabit adları</td><td><code>class Zemin(Enum):</code></td><td>Malzeme, Gokyuzu, Zemin, Hava, HareketTipi</td></tr>
      </table></div>
      <h4>Satırlar</h4>
      <ul class="w8-faq">
        <li><code>+ ad: str</code> → public <code>self.ad</code> · <code>− yil: int</code> → private <code>self.__yil</code> · <code># x: int</code> → protected <code>self._x</code></li>
        <li><code>+ yapi_ekle(yapi: Yapi): bool</code> → <code>def yapi_ekle(self, yapi):</code> (self UML'ye yazılmaz)</li>
        <li><code>+ gok(): Gokyuzu {abstract}</code> → <code>@abstractmethod</code></li>
      </ul>
      <h4>Beş çizgi</h4>
      <div class="w8-rels">${RT_ORDER.map(t => `<div>${relIcon(t)}<b>${RTYPES[t].name}</b><span>${RTYPES[t].short}</span><em>${({ assoc: 'Tur → Cag: tur hangi çağa gittiğini bilir', agg: 'Cag ◇ Yapi: yapı dışarıda üretilip eklenir', comp: 'Kale ◆ Kule: kale kulelerini kendisi üretir', gen: 'Piramit ──▷ Yapi: piramit bir yapıdır', real: 'Fener ┄▷ Isiklandirilabilir: fener ışık saçabilir' })[t]}</em></div>`).join('')}</div>
      <h4>Çokluk ve rol</h4>
      <ul class="w8-faq"><li>Çokluk <b>parçanın ucuna</b> yazılır: Cag ◇── <code>0..*</code> Yapi → "bir çağda sıfır ya da çok yapı".</li><li><code>1</code> → tek nesne · <code>0..1</code> → nesne ya da <code>None</code> · <code>0..*</code>, <code>1..*</code> → liste.</li><li>Rol adı, koddaki özelliğin adıdır: <code>yapilar</code> → <code>self.yapilar</code>.</li></ul>`, [{ label: 'Anladım', cls: 'w8-go' }], 'w8m wide');
  }
  function help() {
    modal(`<h3>⏳ Kronos Ajansı'na hoş geldin!</h3>
      <p>Bu bir <b>ödev</b>: kendi zaman turizmi ajansını tasarlayıp kodlayacak, sonra çağların arasında 3D yürüyeceksin. Görevler soldaki <b>📜 Görevler</b> panelinde; asıl tarif <b>Ajans Müdürü'nün mesajında</b>.</p>
      <ol class="w8-steps">
        <li><b>📐 Plan</b>: UML'yi <i>yazarak</i> çiz. Araç çubuğundan Sınıf, Soyut, Arayüz ya da «enum» ekle. Satırlara UML biçiminde yaz: <code>− yil: int</code> · <code>+ gok(): Gokyuzu {abstract}</code>. <kbd>Enter</kbd> yeni satır. Kutunun türünü başlıktaki seçiciden değiştirebilirsin.</li>
        <li><b>⌨️ Kod</b>: Python'u sen yazarsın. Yazmayı bıraktığında kod çalışır ve sağdaki <b>🌍 3D önizleme</b> çağını kurar. <b>📚 Katalog</b>'da 28 yapı, 14 canlı ve 19 çağ fikri var.</li>
        <li><b>🌀 Tur</b>: çağların zaman çizgisinde adalara dönüşür. <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ile yürü, fareyle bak.</li>
      </ol>
      <p class="w8-sub">💾 Çalışman <b>bu tarayıcıda kalıcı</b>: kapatıp yarın devam edebilirsin. Başka bir bilgisayara geçeceksen ☰ → <b>Kaydı indir</b>, orada ☰ → <b>Kayıt yükle</b>. Tüm görevler bitince <b>📄 PDF</b> açılır.</p>`,
    [{ label: 'Başlayalım!', cls: 'w8-go', fn: () => { if (!S.intro) { S.intro = true; save(); } } }], 'w8m wide');
  }

  /* =====================================================================
     ÖĞRETMEN, SIFIRLAMA, PDF
     ===================================================================== */
  const OGR = () => window.NYP_OGRETMEN || null;
  function example() {
    const o = OGR();
    try { return o && o.hafta8 ? JSON.parse(decodeURIComponent(escape(atob(o.hafta8)))) : null; } catch (_) { return null; }
  }
  function teacher() {
    if (!T.teacherOk) {
      const card = modal(`<h3>👩‍🏫 Öğretmen</h3><p>Bu panel ders anlatımı içindir. Öğretmen kodunu gir.</p><input type="password" id="w8-pin" class="w8-in" autocomplete="off" placeholder="öğretmen kodu">`,
        [{ label: 'Vazgeç' }, { label: 'Giriş', cls: 'w8-go', keep: true, fn: () => {
          if (OGR() && $('#w8-pin').value.trim() === OGR().pin) { T.teacherOk = true; renderTop(); teacher(); }
          else { $('#w8-pin').value = ''; $('#w8-pin').classList.add('bad'); toast('Kod yanlış.', 'bad'); }
        } }]);
      const i = $('#w8-pin', card); i.focus();
      i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); card.querySelector('.row .btn:last-child').click(); } });
      return;
    }
    modal(`<h3>👩‍🏫 Öğretmen paneli</h3><p>Derste göstermek için kısayollar.</p>
      <ul><li><b>Tüm seviyeleri aç</b>: Tur ve PDF de açılır.</li><li><b>Örnek UML / Örnek kod</b>: çözüm yüklenir (mevcut çalışma silinir).</li><li><b>Talep tabanını yenile</b>: 6. seviyede "eski sınıflar" olarak kodun şu anki hâlini kaydeder (öğrenci eski sınıflarda gerçek bir hatayı düzeltmek zorunda kaldıysa).</li></ul>`,
    [{ label: 'Kapat' },
      { label: 'Talep tabanını yenile', fn: () => { captureBase(); saveNow(); runCode(true); toast('Talep tabanı şu anki koda göre yenilendi.', 'good'); } },
      { label: 'Tüm seviyeleri aç', fn: () => { S.maxLevel = LEVELS.length; if (!S.base) captureBase(); saveNow(); evaluate(true); renderAll(); toast('Tüm seviyeler açıldı.', 'good'); } },
      { label: 'Örnek UML', fn: () => { const x = example(); if (!x || !x.uml) return toast('Örnek bulunamadı.', 'bad'); S.uml = JSON.parse(JSON.stringify(x.uml)); S.maxLevel = LEVELS.length; touch(); saveNow(); evaluate(true); renderAll(); setTimeout(fitView, 80); toast('Örnek UML yüklendi.', 'good'); } },
      { label: 'Örnek kod', cls: 'w8-go', fn: () => { const x = example(); if (!x || !x.code) return toast('Örnek bulunamadı.', 'bad'); S.code = x.code; S.maxLevel = LEVELS.length; if (x.base) { S.base = x.base; S.baseGok = x.baseGok; } saveNow(); if (ED.ta) setCode(S.code); renderAll(); runCode(true); toast('Örnek kod yüklendi.', 'good'); } }], 'w8m wide');
  }
  function resetAll() {
    modal('<h3>Her şey sıfırlansın mı?</h3><p>Diyagram, kod ve tamamlanan görevler <b>kalıcı olarak</b> silinir. Emin değilsen önce ☰ → Kaydı indir.</p>',
      [{ label: 'Vazgeç' }, { label: 'Sıfırla', cls: 'lava', fn: () => { S = fresh(); S.intro = true; T.hints = {}; T.prev = null; touch(); saveNow(); if (ED.ta) setCode(S.code); clearOut(); renderAll(); toast('Ajans sıfırlandı. Enumlarla başla!', 'info'); } }]);
  }
  async function exportPdf() {
    const left = pdfLeft();
    if (left > 0 && !T.teacherOk) {
      modal(`<div class="w8-lvup-art">🔒</div><h3>PDF henüz kilitli</h3><p>PDF <b>tüm görevler bitince</b> açılır. Sana <b>${left}</b> görev kaldı.</p><p class="w8-sub">PDF'te UML diyagramın, Python kodun ve her çağının 3D görüntüsü yer alacak.</p>`, [{ label: 'Tamam', cls: 'w8-go' }]);
      return;
    }
    const m = M();
    if (!m.classes.length) { toast('Önce Plan\'a sınıf ekle.', 'info'); return; }
    if (!window.NYPPdf) { toast('PDF modülü yüklenemedi.', 'bad'); return; }
    const pretty = t => t.trim().replace(/^-/, '−');
    const classes = m.classes.map(c => ({
      id: c.id, name: c.name || '?', stereo: KIND[c.kind].stereo || null, abstract: c.kind === 'abstract', x: c.raw.x, y: c.raw.y,
      attrs: c.raw.attrs.filter(t => t.trim()).map(t => ({ text: pretty(t) })),
      meths: c.kind === 'enum' ? [] : c.raw.meths.map((t, i) => ({ t, p: c.meths[i] })).filter(x => x.t.trim()).map(x => ({ text: pretty(x.t), abstract: !!(x.p && x.p.abstract) }))
    }));
    const rels = m.rels.map(r => ({ a: r.a, b: r.b, type: r.type, ma: RTYPES[r.type].ends ? (r.ma || '').trim() : '', mb: RTYPES[r.type].ends ? (r.mb || '').trim() : '', role: RTYPES[r.type].ends ? (r.role || '').trim() : '' }));
    const W = worldData(), scenes = [];
    toast('📸 Çağlarının fotoğrafları çekiliyor…', 'info', 2500);
    try {
      const v = await ensureTour();
      if (v && W.eras.length) {
        W.eras.slice(0, 6).forEach((e, i) => {
          const img = v.shot(i, 1600, 900);
          const yk = {}; e.yapilar.forEach(y => { yk[y.cls] = (yk[y.cls] || 0) + 1; });
          const ck = {}; e.canlilar.forEach(c => { ck[c.cls] = (ck[c.cls] || 0) + 1; });
          const list = o => Object.entries(o).map(([k, n]) => (n > 1 ? `${k} ×${n}` : k)).join(', ') || 'yok';
          scenes.push({ img, title: `${e.ad} · ${e.yil}`, pageTitle: `Çağ ${i + 1}: ${e.ad}`, heading: `${e.ad} (${e.yil})`, story: [`Gökyüzü: ${e.gok || '?'} · Zemin: ${e.zemin || '?'} · Hava: ${e.hava || '?'}.`, `Yapılar: ${list(yk)}.`, `Canlılar: ${list(ck)}.`] });
        });
      }
    } catch (_) { /* 3D yoksa PDF yine de UML + kod olarak çıkar */ }
    NYPPdf.exportUML({ title: 'Kronos Ajansı · UML Sınıf Diyagramı', week: '8. Hafta', classes, rels, code: S.code, scenes, require: true, filename: 'kronos-ajansi' }).then(r => {
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
      <div class="w8-ptools">
        <button class="w8-tool" data-act="add" data-k="class">${ICON.cls}<span>Sınıf</span></button>
        <button class="w8-tool abs" data-act="add" data-k="abstract">${ICON.abs}<span>Soyut</span></button>
        <button class="w8-tool ifc" data-act="add" data-k="interface">${ICON.ifc}<span>Arayüz</span></button>
        <button class="w8-tool enum" data-act="add" data-k="enum">${ICON.enm}<span>«enum»</span></button>
        <button class="w8-tool rel" data-act="addrel">${ICON.rel}<span>İlişki</span></button>
        <span class="w8-ptip"><code>− yil: int</code> · <code>+ gok(): Gokyuzu {abstract}</code> · enum'da yalnızca <code>ALTIN</code> · <kbd>Enter</kbd> yeni satır</span>
        <div class="w8-zoom"><button data-act="zout" title="Uzaklaştır">−</button><span id="w8-zv">100%</span><button data-act="zin" title="Yakınlaştır">+</button><button data-act="zfit">Sığdır</button></div>
      </div>
      <div class="w8-cv" id="w8-cv"><div class="w8-cvsize" id="w8-cvsize"><div class="w8-cvin" id="w8-cvin">
        <svg class="w8-edges" id="w8-edges" width="${CV_W}" height="${CV_H}"></svg>
        <div id="w8-boxes"></div>
        <div class="w8-empty" id="w8-empty">📐 Boş plan. Yukarıdan <b>«enum»</b> ekleyerek başla: ilk kutun <b>Malzeme</b> olsun.</div>
      </div></div></div>
      <div class="w8-rels" id="w8-rels"></div>`;
  }
  function boxWidth(c) {
    const lines = [c.name || ''].concat(c.attrs, c.kind === 'enum' ? [] : c.meths);
    const L = Math.max(14, ...lines.map(t => String(t).length));
    return clamp(Math.round(L * 8.3 + 46), 210, 480);
  }
  function lineHTML(c, sec, i) {
    const t = c[sec][i], p = parseLine(c.kind, sec, t);
    const ph = c.kind === 'enum' ? 'SABIT_ADI' : sec === 'attrs' ? '+ ozellik: tip' : '+ metot(param: tip): dönüş';
    return `<input class="w8-ln ${p.cls}" data-cid="${c.id}" data-sec="${sec}" data-i="${i}" value="${esc(t)}" placeholder="${ph}" spellcheck="false" autocomplete="off" title="${esc(p.err || '')}">`;
  }
  function secHTML(c, sec, label) {
    return `<div class="w8-sec" data-sec="${sec}">${c[sec].map((_, i) => lineHTML(c, sec, i)).join('')}<button class="w8-addln" data-act="addln" data-cid="${c.id}" data-sec="${sec}" tabindex="-1">+ ${label}</button></div>`;
  }
  function boxHTML(c) {
    const en = c.kind === 'enum', st = KIND[c.kind].stereo;
    return `<div class="w8-box k-${c.kind} ${T.sel === c.id ? 'sel' : ''}" data-cid="${c.id}" style="left:${c.x}px;top:${c.y}px;width:${boxWidth(c)}px">
      <div class="w8-bh" data-drag="${c.id}" title="Başlıktan tutup taşı">
        <select class="w8-kind" data-cid="${c.id}" title="Kutunun türü" tabindex="-1">${Object.keys(KIND).map(k => `<option value="${k}" ${c.kind === k ? 'selected' : ''}>${KIND[k].label}</option>`).join('')}</select>
        ${st ? `<small>«${st}»</small>` : ''}
        <input class="w8-bname" data-cid="${c.id}" value="${esc(c.name)}" placeholder="${en ? 'EnumAdi' : 'SinifAdi'}" spellcheck="false" autocomplete="off">
        <button class="w8-bx" data-act="delcls" data-cid="${c.id}" title="Kutuyu sil" tabindex="-1">×</button></div>
      ${secHTML(c, 'attrs', en ? 'sabit' : 'özellik')}
      ${en ? '' : secHTML(c, 'meths', 'metot')}
    </div>`;
  }
  function renderPlan() {
    $('#w8-boxes').innerHTML = S.uml.classes.map(boxHTML).join('');
    $('#w8-empty').hidden = S.uml.classes.length > 0;
    applyZoom(); drawEdges(); renderRels();
  }
  const boxEl = id => $(`.w8-box[data-cid="${id}"]`, root);
  const cls = id => S.uml.classes.find(c => c.id === id);
  function refreshBox(id, focus) {
    const c = cls(id), el = boxEl(id); if (!c || !el) return;
    el.outerHTML = boxHTML(c);
    if (focus) {
      const inp = focus.sec ? $(`.w8-ln[data-cid="${id}"][data-sec="${focus.sec}"][data-i="${focus.i}"]`, root) : $(`.w8-bname[data-cid="${id}"]`, root);
      if (inp) { inp.focus(); const n = focus.caret != null ? focus.caret : inp.value.length; inp.setSelectionRange(n, n); }
    }
    drawEdges();
  }
  function applyZoom() {
    const z = S.zoom || 1;
    $('#w8-cvin').style.transform = `scale(${z})`;
    $('#w8-cvsize').style.width = CV_W * z + 'px'; $('#w8-cvsize').style.height = CV_H * z + 'px';
    $('#w8-zv').textContent = Math.round(z * 100) + '%';
  }
  function setZoom(z) { S.zoom = clamp(Math.round(z * 100) / 100, 0.3, 1.6); save(); applyZoom(); }
  function fitView() {
    const cv = $('#w8-cv'); if (!cv || !S.uml.classes.length) return;
    let x1 = 0, y1 = 0;
    S.uml.classes.forEach(c => { const el = boxEl(c.id); x1 = Math.max(x1, c.x + (el ? el.offsetWidth : 240)); y1 = Math.max(y1, c.y + (el ? el.offsetHeight : 200)); });
    setZoom(Math.min(1.1, (cv.clientWidth - 30) / (x1 + 40), (cv.clientHeight - 30) / (y1 + 40)));
    cv.scrollLeft = 0; cv.scrollTop = 0;
  }
  function freeSpot() {
    const taken = S.uml.classes.map(c => { const el = boxEl(c.id); return { x: c.x, y: c.y, w: el ? el.offsetWidth : 240, h: el ? el.offsetHeight : 200 }; });
    for (let row = 0; row < 8; row++) for (let col = 0; col < 7; col++) {
      const x = 40 + col * 320, y = 40 + row * 260;
      if (!taken.some(r => x < r.x + r.w + 30 && x + 250 > r.x - 30 && y < r.y + r.h + 30 && y + 200 > r.y - 30)) return { x, y };
    }
    return { x: 60 + S.uml.classes.length * 20, y: 60 + S.uml.classes.length * 20 };
  }
  function createClass(kind) {
    const p = freeSpot();
    const c = { id: 'c' + uid(), kind, name: '', x: p.x, y: p.y, attrs: [''], meths: [''] };
    S.uml.classes.push(c); T.sel = c.id; touch(); save();
    renderPlan();
    const inp = $(`.w8-bname[data-cid="${c.id}"]`, root);
    if (inp) { inp.focus({ preventScroll: true }); inp.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    evalSoon();
  }
  function deleteClass(id) {
    const c = cls(id); if (!c) return;
    const go = () => { S.uml.classes = S.uml.classes.filter(x => x.id !== id); S.uml.rels = S.uml.rels.filter(r => r.a !== id && r.b !== id); touch(); save(); renderPlan(); evalSoon(); };
    const filled = c.name.trim() || c.attrs.some(t => t.trim()) || c.meths.some(t => t.trim());
    if (!filled) return go();
    modal(`<h3>${esc(c.name || 'Bu kutu')} silinsin mi?</h3><p>Kutunun satırları ve bağlı ilişkileri silinir.</p>`, [{ label: 'Vazgeç' }, { label: 'Sil', cls: 'lava', fn: go }]);
  }
  function rectOf(id) { const el = boxEl(id); return el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null; }
  function drawEdges() {
    const svg = $('#w8-edges'); if (!svg || !window.NYPPdf) return;
    const G = NYPPdf.geom, pairs = {};
    let out = '';
    M().rels.forEach(r => {
      const ra = rectOf(r.a), rb = rectOf(r.b); if (!ra || !rb) return;
      const k = [r.a, r.b].sort().join('|'); const n = pairs[k] = (pairs[k] || 0) + 1;
      const off = n === 1 ? 0 : (n % 2 ? 1 : -1) * Math.ceil((n - 1) / 2) * 16;
      const g = G.edge(ra, rb, off), d = G.decorate(g, r.type), L = G.labels(g, r.type);
      const shapes = d.shapes.map(sh => `<path d="M${sh.pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')}${sh.closed ? ' Z' : ''}" fill="${sh.fill === 'ink' ? '#2B2350' : sh.fill === 'paper' ? '#fff' : 'none'}" stroke="#2B2350" stroke-width="2" stroke-linejoin="round"/>`).join('');
      const lab = (t, p, c) => (t ? `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" class="${c}">${esc(t)}</text>` : '');
      const ends = RTYPES[r.type].ends;
      out += `<g class="w8-edge" data-rid="${r.id}"><line class="hit" x1="${d.s.x}" y1="${d.s.y}" x2="${d.e.x}" y2="${d.e.y}"/><line x1="${d.s.x}" y1="${d.s.y}" x2="${d.e.x}" y2="${d.e.y}" stroke="#2B2350" stroke-width="2"${d.dashed ? ' stroke-dasharray="8 6"' : ''}/>${shapes}${ends ? lab(r.ma, L.ma, 'm') + lab(r.mb, L.mb, 'm') + lab(r.role, L.role, 'r') : ''}</g>`;
    });
    svg.innerHTML = out;
  }
  function relText(r) {
    const a = cls(r.a), b = cls(r.b), e = RTYPES[r.type].ends;
    return `<b>${esc((a && a.name) || '?')}</b> ${RTYPES[r.type].sym} <b>${esc((b && b.name) || '?')}</b>${e && r.mb ? ` <span class="m">${esc(r.mb)}</span>` : ''}${e && r.role ? ` <i>${esc(r.role)}</i>` : ''}`;
  }
  function renderRels() {
    const el = $('#w8-rels'); if (!el) return;
    const rs = M().rels;
    el.innerHTML = `<span class="lbl">🔗 İlişkiler (${rs.length}):</span>${rs.length ? rs.map(r => `<button class="w8-rchip t-${r.type}" data-act="editrel" data-rid="${r.id}">${relText(r)}</button>`).join('') : '<span class="none">henüz yok · kalıtım için de 🔗 İlişki düğmesini kullan</span>'}`;
  }
  function relSentence(an, bn, type, mb, role) {
    const A = an || '?', B = bn || '?', k = mb ? `${mb} ` : '';
    if (type === 'gen') return `${A} <b>bir</b> ${B}'dır (kalıtım). Kodda: <code>class ${A}(${B}):</code>`;
    if (type === 'real') return `${A}, ${B} sözleşmesini <b>gerçekleştirir</b>. Kodda: <code>class ${A}(..., ${B}):</code>`;
    if (type === 'agg') return `Bir ${A}, ${k}${B} nesnesini <b>toplar</b>${role ? ` (self.${role})` : ''}. ${B} dışarıda üretilip eklenir.`;
    if (type === 'comp') return `Bir ${A}, ${k}${B} nesnesinden <b>oluşur</b>${role ? ` (self.${role})` : ''}. ${B}'leri ${A} kendi __init__'inde üretir.`;
    return `${A}, ${k}${B} nesnesini <b>bilir</b>${role ? ` (self.${role})` : ''}.`;
  }
  function relForm(r) {
    const editing = !!r;
    r = r || { a: T.sel || '', b: '', type: 'gen', ma: '', mb: '', role: '' };
    const named = M().classes.filter(c => c.name);
    if (named.length < 2) { toast('İlişki için adı yazılmış en az iki kutu gerekir.', 'info'); return; }
    const opts = sel => named.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}${c.kind !== 'class' ? ` «${KIND[c.kind].stereo}»` : ''}</option>`).join('');
    const mopt = v => MULTS.map(x => `<option value="${x}" ${normMult(v) === x ? 'selected' : ''}>${x || '(boş)'}</option>`).join('');
    const card = modal(`<h3>🔗 ${editing ? 'İlişkiyi düzenle' : 'Yeni ilişki'}</h3>
      <div class="w8-rtypes">${RT_ORDER.map(t => `<label class="${r.type === t ? 'on' : ''}"><input type="radio" name="rft" value="${t}" ${r.type === t ? 'checked' : ''}>${relIcon(t)}<b>${RTYPES[t].name}</b><small>${RTYPES[t].short}</small></label>`).join('')}</div>
      <div class="w8-rf">
        <label><span id="rf-al"></span><select id="rf-a"><option value="">seç…</option>${opts(r.a)}</select></label>
        <label><span id="rf-bl"></span><select id="rf-b"><option value="">seç…</option>${opts(r.b)}</select></label>
        <label class="e"><span>Çokluk (bütün / bilen ucu)</span><select id="rf-ma">${mopt(r.ma)}</select></label>
        <label class="e"><span>Çokluk (parça / bilinen ucu)</span><select id="rf-mb">${mopt(r.mb)}</select></label>
        <label class="e wide"><span>Rol adı (parça ucu = koddaki özellik adı)</span><input id="rf-role" value="${esc(r.role)}" placeholder="ör. yapilar" spellcheck="false"></label>
      </div>
      <p class="w8-rsent" id="rf-sent"></p>`,
    [{ label: 'Vazgeç' }].concat(editing ? [{ label: 'Sil', cls: 'lava', fn: () => { S.uml.rels = S.uml.rels.filter(x => x.id !== r.id); touch(); save(); drawEdges(); renderRels(); evalSoon(); } }] : [])
      .concat([{ label: 'Kaydet', cls: 'w8-go', keep: true, fn: () => {
        const v = read();
        if (!v.a || !v.b) return toast('İki kutuyu da seç.', 'info');
        if (v.a === v.b) return toast('Bir kutu kendisiyle ilişkilendirilemez.', 'info');
        if (!RTYPES[v.type].ends) { v.ma = ''; v.mb = ''; v.role = ''; }
        if (editing) Object.assign(S.uml.rels.find(x => x.id === r.id), v);
        else S.uml.rels.push(Object.assign({ id: 'r' + uid() }, v));
        closeModal(); touch(); save(); drawEdges(); renderRels(); evalSoon();
      } }]), 'w8m wide');
    const read = () => ({ a: $('#rf-a', card).value, b: $('#rf-b', card).value, type: (card.querySelector('input[name="rft"]:checked') || {}).value || 'assoc', ma: $('#rf-ma', card).value, mb: $('#rf-mb', card).value, role: $('#rf-role', card).value.trim() });
    const upd = () => {
      const v = read(), n = id => (cls(id) || {}).name;
      $$('.w8-rtypes label', card).forEach(l => l.classList.toggle('on', l.querySelector('input').checked));
      const L = { gen: ['Alt sınıf', 'Üst sınıf'], real: ['Sınıf', 'Arayüz'], assoc: ['Bilen sınıf', 'Bilinen sınıf'], agg: ['Bütün', 'Parça'], comp: ['Bütün', 'Parça'] }[v.type];
      $('#rf-al', card).textContent = L[0]; $('#rf-bl', card).textContent = L[1];
      $$('.w8-rf .e', card).forEach(x => { x.hidden = !RTYPES[v.type].ends; });
      $('#rf-sent', card).innerHTML = '📖 ' + relSentence(n(v.a), n(v.b), v.type, v.mb, v.role);
    };
    card.addEventListener('change', upd); card.addEventListener('input', upd); upd();
  }

  function onPlanInput(e) {
    const t = e.target;
    if (t.classList.contains('w8-bname')) {
      const c = cls(t.dataset.cid); if (!c) return;
      c.name = t.value; touch(); save();
      const el = boxEl(c.id); if (el) el.style.width = boxWidth(c) + 'px';
      drawEdges(); renderRels(); evalSoon();
    } else if (t.classList.contains('w8-ln')) {
      const c = cls(t.dataset.cid); if (!c) return;
      c[t.dataset.sec][+t.dataset.i] = t.value; touch(); save();
      const p = parseLine(c.kind, t.dataset.sec, t.value);
      t.className = 'w8-ln ' + p.cls; t.title = p.err || '';
      const el = boxEl(c.id); if (el) el.style.width = boxWidth(c) + 'px';
      drawEdges(); evalSoon();
    }
  }
  function onPlanChange(e) {
    const t = e.target;
    if (t.classList.contains('w8-kind')) { const c = cls(t.dataset.cid); if (!c) return; c.kind = t.value; touch(); save(); refreshBox(c.id); evalSoon(); }
  }
  function onPlanKey(e) {
    const t = e.target;
    if (t.classList.contains('w8-bname') && e.key === 'Enter') { e.preventDefault(); refreshBox(t.dataset.cid, { sec: 'attrs', i: 0 }); return; }
    if (!t.classList.contains('w8-ln')) return;
    const c = cls(t.dataset.cid), sec = t.dataset.sec, i = +t.dataset.i;
    if (!c) return;
    if (e.key === 'Enter') { e.preventDefault(); c[sec].splice(i + 1, 0, ''); touch(); save(); refreshBox(c.id, { sec, i: i + 1 }); }
    else if (e.key === 'Backspace' && !t.value && c[sec].length > 1) { e.preventDefault(); c[sec].splice(i, 1); touch(); save(); refreshBox(c.id, { sec, i: Math.max(0, i - 1) }); evalSoon(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { const al = $$(`.w8-ln[data-cid="${c.id}"]`, root); const k = al.indexOf(t) + (e.key === 'ArrowDown' ? 1 : -1); if (al[k]) { e.preventDefault(); al[k].focus(); } }
  }
  function onPlanDown(e) {
    const h = e.target.closest('[data-drag]');
    if (!h || e.target.closest('input,button,select')) return;
    const c = cls(h.dataset.drag); if (!c) return;
    e.preventDefault();
    T.sel = c.id; $$('.w8-box.sel', root).forEach(b => b.classList.remove('sel')); boxEl(c.id).classList.add('sel');
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
  const SNIPS = [['self.', 'self.'], ['self.__', 'self.__'], ['def', 'def |(self):'], ['__init__', 'def __init__(self|):'], ['super()', 'super().__init__(|)'], ['@abstractmethod', '@abstractmethod'], ['class X(ABC)', 'class |(ABC):'], ['class X(Enum)', 'class |(Enum):'], ['auto()', 'auto()'], ['[ ]', '[|]'], ['.append()', '.append(|)'], ['return', 'return '], ['print()', 'print(|)']];

  function codeShell() {
    return `
      <div class="w8-ebar">
        <button class="w8-run" data-act="run" id="w8-run">▶ Çalıştır <kbd>Ctrl</kbd><kbd>Enter</kbd></button>
        <label class="w8-live" title="Yazmayı bırakınca kod kendiliğinden çalışır"><input type="checkbox" id="w8-livecb"> ⚡ Canlı</label>
        <span class="w8-pys" id="w8-pys"></span>
      </div>
      <div class="w8-snips" id="w8-snips" aria-label="Hızlı ekle">${SNIPS.map((s, i) => `<button data-snip="${i}" title="Ekle: ${esc(s[1].replace('|', ''))}" tabindex="-1">${esc(s[0])}</button>`).join('')}</div>
      <div class="w8-ed" id="w8-ed">
        <div class="w8-gut" id="w8-gut" aria-hidden="true"></div>
        <div class="w8-edc"><pre class="w8-hl" id="w8-hl" aria-hidden="true"></pre><textarea id="w8-ta" spellcheck="false" wrap="off" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Python kodu"></textarea></div>
        <div class="w8-lintchip" id="w8-lintchip" hidden></div>
      </div>
      <div class="w8-con">
        <div class="w8-conh"><b>Çıktı</b><span id="w8-cstat"></span></div>
        <div class="w8-cout" id="w8-cout"><div class="w8-cl info">print() çıktıları ve hatalar (Türkçe açıklamasıyla) burada görünür.</div></div>
        <div class="w8-replog" id="w8-replog"></div>
        <label class="w8-repl"><span>&gt;&gt;&gt;</span><input id="w8-repl" placeholder="Bir ifade dene, Enter: misir.yil_metni()" spellcheck="false" autocomplete="off"></label>
      </div>`;
  }
  const PY_TOK = /(#[^\n]*)|("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|[rRbBuUfF]{0,2}"(?:[^"\\\n]|\\.)*"?|[rRbBuUfF]{0,2}'(?:[^'\\\n]|\\.)*'?)|(@[A-Za-z_][\w.]*)|\b(class|def|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|pass|import|from|as|try|except|finally|raise|with|lambda|break|continue|global|nonlocal|yield|del|assert)\b|\b(self|super)\b|\b(print|len|range|isinstance|list|dict|str|int|float|bool|max|min|sum|abs|round|type|enumerate|sorted|Enum|auto|ABC|abstractmethod)\b|\b(\d+(?:\.\d+)?)\b|(?<=\bclass\s+)([A-Za-z_ÇĞİÖŞÜçğıöşü][\wÇĞİÖŞÜçğıöşü]*)|(?<=\bdef\s+)([A-Za-z_ÇĞİÖŞÜçğıöşü][\wÇĞİÖŞÜçğıöşü]*)/g;
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
    const lines = highlightPy(ED.ta.value), bad = ED.errLine || ED.lintLine;
    ED.hl.innerHTML = lines.map((h, i) => `<div class="${i + 1 === bad ? 'err' : ''}${i + 1 === ED.cur ? ' cur' : ''}">${h || ' '}</div>`).join('') + '<div> </div>';
    ED.gut.innerHTML = lines.map((_, i) => `<div class="${i + 1 === bad ? 'err' : ''}${i + 1 === ED.cur ? ' cur' : ''}">${i + 1}</div>`).join('') + '<div></div>';
    syncScroll();
  }
  function syncScroll() { ED.hl.scrollTop = ED.ta.scrollTop; ED.hl.scrollLeft = ED.ta.scrollLeft; ED.gut.scrollTop = ED.ta.scrollTop; }
  function caretLine() { return ED.ta.value.slice(0, ED.ta.selectionStart).split('\n').length; }
  function updateCur() {
    const n = caretLine(); if (n === ED.cur) return;
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
    const ta = ED.ta, v = ta.value; const [s] = lineBounds(ta.selectionStart);
    let e = ta.selectionEnd; if (e > ta.selectionStart && v[e - 1] === '\n') e--;
    const [, e2] = lineBounds(e); const out = fn(v.slice(s, e2).split('\n')).join('\n');
    ta.setSelectionRange(s, e2); insertText(out); ta.setSelectionRange(s, s + out.length);
  }
  function onEdKey(e) {
    const ta = ED.ta, mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === 'Enter') { e.preventDefault(); runCode(); return; }
    if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveNow(); updSaved(); toast('Kaydedildi (zaten otomatik kaydediliyor 😉)', 'info', 1800); return; }
    if (mod && e.key === '/') { e.preventDefault(); mapLines(ls => { const al = ls.filter(l => l.trim()).every(l => /^\s*#/.test(l)); return ls.map(l => (!l.trim() ? l : al ? l.replace(/^(\s*)# ?/, '$1') : l.replace(/^(\s*)/, '$1# '))); }); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) mapLines(ls => ls.map(l => l.replace(/^ {1,4}/, '')));
      else if (ta.value.slice(ta.selectionStart, ta.selectionEnd).includes('\n')) mapLines(ls => ls.map(l => '    ' + l));
      else { const [s] = lineBounds(ta.selectionStart); insertText(' '.repeat(4 - ((ta.selectionStart - s) % 4))); }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !mod) {
      e.preventDefault();
      const [s] = lineBounds(ta.selectionStart), before = ta.value.slice(s, ta.selectionStart);
      let ind = (/^ */.exec(before) || [''])[0].length; const tr = before.trim();
      if (/:\s*(#.*)?$/.test(tr)) ind += 4; else if (/^(return\b|pass$|break$|continue$|raise\b)/.test(tr)) ind = Math.max(0, ind - 4);
      insertText('\n' + ' '.repeat(ind)); return;
    }
    if (e.key === 'Backspace' && ta.selectionStart === ta.selectionEnd && !mod) {
      const [s] = lineBounds(ta.selectionStart), before = ta.value.slice(s, ta.selectionStart);
      if (before.length && /^ +$/.test(before)) {
        e.preventDefault(); const n = before.length % 4 || 4;
        ta.setSelectionRange(ta.selectionStart - n, ta.selectionStart);
        try { if (!document.execCommand('delete')) throw 0; } catch (_) { ta.setRangeText('', ta.selectionStart, ta.selectionEnd, 'end'); onEdInput(); }
      }
    }
  }
  function onEdInput() { S.code = ED.ta.value; save(); ED.errLine = null; ED.lintLine = null; hlRender(); updateCur(); if (S.live) autoRun(); else lintSoon(); }
  function gotoLine(n) {
    const v = ED.ta.value.split('\n'); n = clamp(n, 1, v.length);
    let s = 0; for (let i = 0; i < n - 1; i++) s += v[i].length + 1;
    ED.ta.focus(); ED.ta.setSelectionRange(s, s + v[n - 1].length); ED.ta.scrollTop = Math.max(0, (n - 4) * LH); syncScroll(); updateCur();
  }
  const lintSoon = debounce(async () => {
    if (!ED.ta || H8Py.status() === 'error') return;
    const code = ED.ta.value;
    try { const r = await H8Py.lint(code); if (code !== ED.ta.value) return; showLint(r); if (r.ok) { S.analysis = r.analysis; save(); evalSoon(); } hlRender(); } catch (_) { /* meşgul */ }
  }, 900);
  function showLint(r) {
    const chip = $('#w8-lintchip');
    if (!r.ok) { ED.lintLine = r.err.line; const x = H8Py.explain(r.err, explainCtx()); chip.hidden = false; chip.innerHTML = `⚠ ${r.err.line}. satır: ${esc(x.title)}`; chip.dataset.line = r.err.line; }
    else { ED.lintLine = null; chip.hidden = true; }
  }
  const autoRun = debounce(() => runCode(true), 1000);
  function setPyStatus(s) {
    const el = $('#w8-pys'); if (!el) return;
    el.className = 'w8-pys ' + s;
    el.textContent = { idle: '⚪ Python bekliyor', loading: '⏳ Python yükleniyor… (ilk seferde biraz sürer)', ready: '🟢 Python 3 hazır', busy: '⚙️ Çalışıyor…', error: '🔴 Python yüklenemedi (internet?) · ▶ ile tekrar dene' }[s] || s;
  }
  function clearOut() { const b = $('#w8-cout'); if (b) b.innerHTML = ''; const l = $('#w8-replog'); if (l) l.innerHTML = ''; }
  function outLine(html, c, box) {
    const b = box || $('#w8-cout'); if (!b) return;
    const d = document.createElement('div'); d.className = 'w8-cl ' + (c || ''); d.innerHTML = html; b.appendChild(d);
    while (b.children.length > 200) b.firstChild.remove();
    b.scrollTop = b.scrollHeight;
  }
  function explainCtx() {
    const cs = (S.analysis && S.analysis.classes) || {};
    const enums = Object.entries(cs).filter(([, c]) => c.enum);
    const lits = {}; enums.forEach(([n, c]) => { lits[n] = c.lits; });
    return { enums: enums.map(([n]) => n), lits, isAbstract: n => { const c = clsByName(n); return c ? c.kind !== 'class' && c.kind !== 'enum' : ['Cag', 'Yapi', 'Canli', 'ZamanAraci', 'Hareketli', 'Isiklandirilabilir'].includes(n); } };
  }
  function errHTML(err) {
    const x = H8Py.explain(err, explainCtx());
    return `<div class="t">✖ ${esc(x.title)}${err.line ? ` <button class="w8-goto" data-goto="${err.line}">${err.line}. satıra git</button>` : ''}${err.func && err.func !== '<module>' ? ` <small>(${esc(err.func)}() içinde)</small>` : ''}</div>
      <div class="tip">${esc(x.tip)}</div><div class="raw">${esc(err.type)}: ${esc(err.msg)}${err.text ? `<br><code>${esc(err.text)}</code>` : ''}</div>`;
  }
  async function runCode(auto) {
    if (!ED.ta) return;
    if (T.runBusy) { T.runQueued = true; return; }
    T.runBusy = true;
    const code = ED.ta.value; S.code = code; saveNow(); updSaved();
    const cs = $('#w8-cstat'); if (cs) cs.textContent = auto ? '⚡ canlı' : '';
    try {
      const r = await H8Py.run(code, auto ? 5000 : 8000, S.maxLevel >= 6 ? S.base : null, S.baseGok);
      if (code === ED.ta.value || !auto) {
        const b = $('#w8-cout'); if (b) b.innerHTML = '';
        if (r.fail) outLine('⚠ ' + esc(r.fail), 'err');
        if (r.out) outLine(esc(r.out.replace(/\n$/, '')), 'out');
        if (r.err) { outLine(errHTML(r.err), 'err'); ED.errLine = r.err.line; T.stale = true; }
        else { ED.errLine = null; T.stale = false; if (!r.fail) outLine('✓ Kod hatasız çalıştı.' + (auto ? ' <small>(canlı)</small>' : ''), 'ok'); }
        showLint(r.err && r.err.type === 'SyntaxError' ? { ok: false, err: r.err } : { ok: true });
        if (r.analysis) S.analysis = r.analysis;
        if (r.snap) S.snap = r.snap;
        if (r.tests && Object.keys(r.tests).length) S.tests = r.tests;
        if (S.maxLevel >= 6 && !S.base && S.analysis) captureBase();
        saveNow(); hlRender(); refresh3D(); evaluate();
      }
    } catch (e) {
      if (e && e.timeout) outLine(`⏱ Kod ${auto ? 5 : 8} saniyede bitmedi. Sonsuz döngü olabilir mi (while True)? Python yeniden başlatılıyor.`, 'err');
      else outLine('⚠ ' + esc((e && e.fatal) || String(e)), 'err');
    }
    T.runBusy = false;
    if (T.runQueued) { T.runQueued = false; runCode(true); }
  }
  async function replRun(expr) {
    if (!expr.trim()) return;
    ED.hist.push(expr); ED.hi = ED.hist.length;
    const box = $('#w8-replog');
    outLine(`<span class="p">&gt;&gt;&gt;</span> ${esc(expr)}`, 'in', box);
    try {
      const r = await H8Py.evaluate(ED.ta.value, expr);
      if (r.pre && r.pre.err) outLine(errHTML(r.pre.err), 'err', box);
      if (r.out) outLine(esc(r.out.replace(/\n$/, '')), 'out', box);
      if (r.err) outLine(errHTML(r.err), 'err', box);
      else if (r.val != null) outLine(esc(r.val), 'val', box);
    } catch (e) { outLine(e && e.timeout ? '⏱ Zaman aşımı.' : '⚠ ' + esc((e && e.fatal) || String(e)), 'err', box); }
  }
  function renderCode() {
    if (ED.ta.value !== S.code) ED.ta.value = S.code;
    $('#w8-livecb').checked = !!S.live;
    hlRender(); setPyStatus(H8Py.status());
    H8Py.boot().then(() => { if (!S.snap) runCode(true); else lintSoon(); }).catch(() => { /* çip gösterir */ });
  }

  /* =====================================================================
     NESNELER → 3D DÜNYA VERİSİ
     ===================================================================== */
  const objOf = r => (S.snap && S.snap.objs && S.snap.objs[r]) || null;
  const A = (o, k) => (o && o.attrs ? o.attrs[k] : undefined);
  const C = (o, k) => (o && o.calc ? o.calc[k] : undefined);
  const has = (o, n) => !!o && (o.mro || []).includes(n);
  const matOf = v => (v && v.k === 'e' ? { n: v.n, hex: isHex(v.v) ? v.v : null } : null);
  function kidsOf(o) {
    const out = [];
    Object.values(o.attrs || {}).forEach(v => {
      const xs = v && v.k === 'l' ? v.i : [v];
      xs.forEach(x => { if (x && x.k === 'o') { const k = objOf(x.r); if (k && has(k, 'Yapi')) out.push(k); } });
    });
    return out;
  }
  function yapiView(o, depth) {
    const ac = C(o, 'aciklama'), h = A(o, 'yukseklik');
    return {
      cls: o.cls, mro: o.mro, malzeme: matOf(A(o, 'malzeme')), h: h && h.k === 'p' && typeof h.v === 'number' ? h.v : 6,
      label: S.labels ? o.cls + (ac && ac.k === 'p' && ac.v ? '\n' + String(ac.v).slice(0, 34) : '') : '',
      isik: has(o, 'Isiklandirilabilir') ? matOf(C(o, 'isik')) || { n: '', hex: '#FFE45C' } : null,
      kids: depth < 2 ? kidsOf(o).map(k => Object.assign(yapiView(k, depth + 1), { label: '' })) : []
    };
  }
  function canliView(o) {
    const b = A(o, 'boy'), ad = A(o, 'ad'), hr = C(o, 'hareket_et'), ses = C(o, 'ses');
    return { cls: o.cls, mro: o.mro, ad: ad && ad.v, boy: b && typeof b.v === 'number' ? b.v : 2, malzeme: matOf(A(o, 'malzeme')), hareket: hr && hr.k === 'e' ? hr.n : 'DUR', ses: ses && ses.k === 'p' ? String(ses.v || '') : '', isik: has(o, 'Isiklandirilabilir') ? matOf(C(o, 'isik')) || { n: '', hex: '#FFE45C' } : null };
  }
  const listObjs = v => (v && v.k === 'l' ? v.i.filter(x => x.k === 'o').map(x => objOf(x.r)).filter(Boolean) : []);
  function eraView(o, i) {
    const g = C(o, 'gok'), z = C(o, 'zemin'), h = C(o, 'hava'), y = C(o, 'yil_metni'), ad = A(o, 'ad');
    return {
      ad: ad && ad.k === 'p' ? String(ad.v) : o.cls, cls: o.cls, yil: y && y.k === 'p' ? y.v : '', gok: g && g.k === 'e' ? g.n : '', gokHex: g && g.k === 'e' && isHex(g.v) ? g.v : null,
      zemin: z && z.k === 'e' ? z.n : '', hava: h && h.k === 'e' ? h.n : '', seed: i * 31 + 7,
      yapilar: listObjs(A(o, 'yapilar')).filter(x => has(x, 'Yapi')).map(x => yapiView(x, 0)),
      canlilar: listObjs(A(o, 'canlilar')).filter(x => has(x, 'Canli')).map(canliView),
      _o: o
    };
  }
  function worldData() {
    const W = { eras: [], atolye: { yapilar: [], canlilar: [] }, tur: null };
    if (!S.snap || !S.snap.objs) return W;
    const objs = Object.entries(S.snap.objs).map(([r, o]) => Object.assign({ _r: r }, o));
    const eraObjs = objs.filter(o => has(o, 'Cag') && C(o, 'gok'));
    let order = null;
    const aj = objs.filter(o => has(o, 'ZamanAjansi') || C(o, 'zaman_cizelgesi')).sort((a, b) => ((A(b, 'caglar') || { i: [] }).i || []).length - ((A(a, 'caglar') || { i: [] }).i || []).length)[0];
    const zc = aj && C(aj, 'zaman_cizelgesi');
    if (zc && zc.k === 'l') order = zc.i.filter(x => x.k === 'o').map(x => x.r);
    let list = order ? order.map(r => eraObjs.find(o => o._r === r)).filter(Boolean) : [];
    eraObjs.forEach(o => { if (!list.includes(o)) list.push(o); });
    if (!order) list.sort((a, b) => ((C(a, 'get_yil') || {}).v || 0) - ((C(b, 'get_yil') || {}).v || 0));
    W.eras = list.slice(0, 8).map(eraView);
    const used = new Set();
    W.eras.forEach(e => { [A(e._o, 'yapilar'), A(e._o, 'canlilar')].forEach(v => (v && v.i || []).forEach(x => x.k === 'o' && used.add(x.r))); });
    // başka bir yapının parçası olanlar (◆) atölyede ayrıca gösterilmez
    const kidIds = new Set();
    objs.forEach(o => Object.values(o.attrs || {}).forEach(v => (v && v.k === 'l' ? v.i : [v]).forEach(x => { if (x && x.k === 'o' && has(objOf(x.r), 'Yapi') && has(o, 'Yapi')) kidIds.add(x.r); })));
    objs.forEach(o => {
      if (used.has(o._r) || kidIds.has(o._r)) return;
      if (has(o, 'Yapi')) W.atolye.yapilar.push(yapiView(o, 0));
      else if (has(o, 'Canli')) W.atolye.canlilar.push(canliView(o));
    });
    const tur = objs.find(o => has(o, 'Tur'));
    if (tur) {
      const ar = A(tur, 'arac'), cg = A(tur, 'cag');
      const arO = ar && ar.k === 'o' ? objOf(ar.r) : null;
      W.tur = { arac: arO ? { mro: arO.mro, ad: (A(arO, 'ad') || {}).v || arO.cls } : null, gezginler: listObjs(A(tur, 'gezginler')).map(g => String((A(g, 'ad') || {}).v || 'Gezgin')), eraIndex: Math.max(0, W.eras.findIndex(e => cg && cg.k === 'o' && e._o._r === cg.r)) };
    }
    return W;
  }

  /* =====================================================================
     SAĞ PANEL: 3D önizleme · katalog · kartlar · UML↔kod
     ===================================================================== */
  function renderSide() {
    const tabs = [['onizleme', '🌍 Önizleme'], ['katalog', '📚 Katalog'], ['kart', '🃏 Kartlar'], ['uyum', '🔗 UML↔Kod']];
    $('#w8-mtabs').innerHTML = tabs.map(([k, t]) => `<button role="tab" class="${S.mkTab === k ? 'on' : ''}" aria-selected="${S.mkTab === k}" data-act="mktab" data-tab="${k}">${t}</button>`).join('');
    const pv = S.mkTab === 'onizleme';
    $('#w8-pv').hidden = !pv; $('#w8-mpane').hidden = pv;
    if (pv) { refresh3D(); }
    else $('#w8-mpane').innerHTML = S.mkTab === 'katalog' ? catalogHTML() : S.mkTab === 'kart' ? cardsHTML() : uyumHTML();
  }
  async function ensureMini() {
    if (T.mini) return T.mini;
    if (T.threeErr) throw T.threeErr;
    if (!window.H8World || !H8World.webglOk()) { T.threeErr = new Error('webgl'); throw T.threeErr; }
    await H8World.load();
    if (!T.mini) { $('#w8-3dmsg').hidden = true; T.mini = H8World.create($('#w8-3d'), { tour: false }); }
    return T.mini;
  }
  async function ensureTour() {
    if (T.tour) return T.tour;
    if (!window.H8World || !H8World.webglOk()) throw new Error('webgl');
    await H8World.load();
    if (!T.tour) {
      T.tour = H8World.create($('#w8-tour3d'), { tour: true, onVisit: (i, n, tot) => {
        const W = T.tourW; const e = W && W.eras[i];
        if (e) toast(`🌀 ${e.ad} · ${e.yil}`, 'info', 2200);
        renderTourHud();
        if (n >= tot && tot > 0 && !S.events.allVisited) { S.events.allVisited = true; save(); evaluate(); }
      } });
      T.tourKey = null;
    }
    const W = worldData(), key = JSON.stringify([W.eras.map(e => Object.assign({}, e, { _o: 0 })), W.tur, S.labels]);
    if (T.tourKey !== key) { T.tourKey = key; T.tourW = W; T.tour.setWorld({ eras: W.eras, tur: W.tur }, 0); }
    return T.tour;
  }
  const refresh3D = debounce(async () => {
    if (S.mkTab !== 'onizleme' || S.mode === 'tour') { if (S.mode === 'tour') renderTour(); return; }
    const W = worldData();
    renderPvBar(W);
    let v;
    try { v = await ensureMini(); } catch (e) { $('#w8-3dmsg').hidden = false; $('#w8-3dmsg').innerHTML = '⚠ 3D açılamadı (bu bilgisayarda WebGL yok ya da internet bağlantısı kesik). Ödev yine yapılabilir; nesnelerin listesi aşağıda.'; renderPvInfo(W); return; }
    const sel = S.selEra === 'atolye' ? null : clamp(+S.selEra || 0, 0, Math.max(0, W.eras.length - 1));
    const data = sel == null || !W.eras.length ? { eras: [], atolye: W.atolye } : { eras: [W.eras[sel]], atolye: W.atolye };
    const key = JSON.stringify([sel, data.eras.map(e => [e.ad, e.yil, e.gok, e.zemin, e.hava, e.yapilar, e.canlilar.map(c => [c.cls, c.hareket, c.ses, c.boy, c.malzeme])]), sel == null ? W.atolye : 0, S.labels]);
    if (T.miniKey !== key) { T.miniKey = key; v.setWorld(data, 0); }
    renderPvInfo(W);
  }, 200);
  function renderPvBar(W) {
    const el = $('#w8-pvbar'); if (!el) return;
    const sel = S.selEra === 'atolye' ? 'atolye' : clamp(+S.selEra || 0, 0, Math.max(0, W.eras.length - 1));
    const chips = W.eras.map((e, i) => `<button class="${sel === i ? 'on' : ''}" data-act="selera" data-i="${i}" title="${esc(e.cls)}">${esc(e.ad)}<small>${esc(e.yil)}</small></button>`);
    if (W.atolye.yapilar.length || W.atolye.canlilar.length || !W.eras.length) chips.push(`<button class="${sel === 'atolye' || !W.eras.length ? 'on' : ''}" data-act="selera" data-i="atolye" title="Henüz bir çağa eklenmemiş nesneler">🛠 Atölye<small>${W.atolye.yapilar.length + W.atolye.canlilar.length} nesne</small></button>`);
    el.innerHTML = chips.join('') + `<label class="w8-lbl"><input type="checkbox" data-act="labels" ${S.labels ? 'checked' : ''}> etiketler</label>`;
  }
  function renderPvInfo(W) {
    const el = $('#w8-pvinfo'); if (!el) return;
    const sel = S.selEra === 'atolye' || !W.eras.length ? null : W.eras[clamp(+S.selEra || 0, 0, W.eras.length - 1)];
    const set = sel || { ad: 'Atölye', yapilar: W.atolye.yapilar, canlilar: W.atolye.canlilar };
    const chip = (t, s) => `<span class="w8-oc">${esc(t)}${s ? `<small>${esc(s)}</small>` : ''}</span>`;
    let html = '';
    if (sel) html += `<div class="w8-eh"><b>${esc(sel.ad)}</b> <small>${esc(sel.cls)} · ${esc(sel.yil)}</small><div class="w8-ee"><span>☁ ${esc(sel.gok || '?')}</span><span>⛰ ${esc(sel.zemin || '?')}</span><span>🌦 ${esc(sel.hava || '?')}</span></div></div>`;
    else if (!W.eras.length) html += `<p class="w8-tipline">Henüz bir çağ nesnesi yok. Cag'dan türeyen bir sınıf yazıp nesne üret: <code>misir = AntikMisir("Antik Mısır", -2560)</code></p>`;
    html += `<div class="w8-osec"><b>🏛 Yapılar (${set.yapilar.length}${sel ? '/12' : ''})</b><div>${set.yapilar.map(y => chip(y.cls, `${(y.malzeme && y.malzeme.n) || '?'} · ${y.h}${y.kids.length ? ' · ◆' + y.kids.length : ''}${y.isik ? ' · ✨' : ''}`)).join('') || '<span class="none">yok</span>'}</div></div>`;
    html += `<div class="w8-osec"><b>🦕 Canlılar (${set.canlilar.length})</b><div>${set.canlilar.map(c => chip(c.cls, `${c.hareket}${c.isik ? ' · ✨' : ''}`)).join('') || '<span class="none">yok</span>'}</div></div>`;
    if (T.stale) html += '<p class="w8-stale">⏸ Kodda şu an hata var; sahne son çalışan hâli gösteriyor.</p>';
    html += '<p class="w8-tipline">🖱 Sahneyi fareyle sürükleyip çevir, tekerlekle yakınlaş.</p>';
    el.innerHTML = html;
  }
  function catalogHTML() {
    const K = CAT();
    const chips = (arr, c) => arr.map(x => `<code class="${c || ''}">${esc(x)}</code>`).join(' ');
    return `<p class="w8-sub2">3D motoru bu adları tanır. Sınıfına bu adı ver (ya da bunlardan türet: <code>class DevPiramit(Piramit)</code>); başka bir ad verirsen etiketli bir blok çizilir.</p>
      <details class="w8-cat" open><summary>🗺 19 çağ fikri</summary><div class="w8-eras">${ERAS.map(e => `<div><b>${e[0]}</b> <small>${e[1] < 0 ? 'MÖ ' + (-e[1]).toLocaleString('tr-TR') : 'MS ' + e[1]}</small><span>☁ ${e[2]} · ⛰ ${e[3]} · 🌦 ${e[4]}</span><em>${esc(e[5])}</em></div>`).join('')}</div></details>
      <details class="w8-cat"><summary>🏛 ${K.yapilar.length} yapı</summary><p>${chips(K.yapilar)}</p><p class="w8-sub2">Bileşik yapılar parçalarını kendi yerlerine dizer: ${Object.entries(K.bilesik).map(([a, b]) => `<code>${a}</code> ◆ <code>${b}</code>`).join(' · ')}. Başka bileşikler de olur; parçalar etrafa dizilir.</p></details>
      <details class="w8-cat"><summary>🦕 ${K.canlilar.length} canlı</summary><p>${chips(K.canlilar)}</p></details>
      <details class="w8-cat"><summary>🎨 Enum sabitleri</summary>
        <p><b>Malzeme</b> (değer: "#RRGGBB"): ${chips(K.malzeme)}<br><small>CAM, BUZ, KRISTAL saydam · NEON, LAV parlar · ALTIN, GUMUS, BAKIR, CELIK metalik</small></p>
        <p><b>Gokyuzu</b>: ${chips(K.gok)}<br><small>Başka bir ad verip değerine "#RRGGBB" yazarsan o renkte gökyüzü olur.</small></p>
        <p><b>Zemin</b>: ${chips(K.zemin)}</p><p><b>Hava</b>: ${chips(K.hava)}</p><p><b>HareketTipi</b>: ${chips(K.hareket)}</p></details>`;
  }
  function cardsHTML() {
    return `<p class="w8-sub2">Örnekler <b>başka konulardan</b>; kendi sınıflarına uyarla.</p>` + CARDS.map(c => `<div class="w8-card ${S.cardOpen === c.k ? 'open' : ''}"><button data-act="card" data-k="${c.k}">${esc(c.t)}<span>${S.cardOpen === c.k ? '−' : '+'}</span></button>${S.cardOpen === c.k ? `<pre class="w8-cc">${hlBlock(c.code)}</pre><p>${esc(c.note)}</p>` : ''}</div>`).join('');
  }
  function uyumHTML() {
    const m = M(), code = (S.analysis && S.analysis.classes) || {};
    const named = m.classes.filter(c => c.name);
    if (!named.length) return '<div class="w8-mempty"><div>🔗</div><p>Plan\'da kutu yok. UML çizdikçe burada her kutunun kodda karşılığı var mı göreceksin.</p></div>';
    const ok = (b, t) => `<li class="${b ? 'y' : 'n'}">${b ? '✓' : '✗'} ${t}</li>`;
    return '<p class="w8-sub2">Diyagramdaki her satırın kodda karşılığı var mı?</p>' + named.map(c => {
      const k = code[c.name];
      let items = '';
      if (!k) items = ok(false, `<code>class ${esc(c.name)}</code> kodda yok`);
      else if (c.kind === 'enum') {
        items += ok(k.enum, k.enum ? 'Enum olarak tanımlı' : `<code>class ${esc(c.name)}(Enum):</code> olmalı`);
        c.lits.forEach(l => { items += ok(k.lits.includes(l), `<code>${esc(l)}</code>`); });
      } else {
        if (c.kind === 'abstract' || c.kind === 'interface') items += ok(k.bases.some(b => /ABC$/.test(b)) || Object.values(k.methods).some(x => x.abstract), `${c.kind === 'interface' ? 'arayüz' : 'soyut'}: <code>(ABC)</code> + <code>@abstractmethod</code>`);
        parentsOf(c, 'gen').concat(parentsOf(c, 'real')).forEach(p => { items += ok(k.bases.includes(p.name), `<code>class ${esc(c.name)}(…${esc(p.name)}…)</code>`); });
        c.attrs.filter(p => p.ok).forEach(p => { const n = p.vis === '-' ? '__' + p.name : p.vis === '#' ? '_' + p.name : p.name; items += ok(!!k.attrs[n], `<code>self.${esc(n)}</code>`); });
        m.rels.filter(r => r.a === c.id && r.role && RTYPES[r.type].ends).forEach(r => { items += ok(!!k.attrs[r.role], `<code>self.${esc(r.role)}</code> <small>(ilişki rolü)</small>`); });
        c.meths.filter(p => p.ok).forEach(p => { const km = k.methods[p.name]; items += ok(!!km && (!p.abstract || km.abstract), `<code>${esc(p.name)}()</code>${p.abstract ? ' <small>@abstractmethod</small>' : ''}`); });
      }
      return `<div class="w8-uy"><b>${c.kind !== 'class' ? `«${KIND[c.kind].stereo}» ` : ''}${esc(c.name)}</b><ul>${items}</ul></div>`;
    }).join('');
  }

  /* =====================================================================
     3) TUR — 3D zaman turu
     ===================================================================== */
  function tourShell() {
    return `<div class="w8-tour3d" id="w8-tour3d"><div class="w8-3dmsg" id="w8-tmsg">🌀 Zaman turu hazırlanıyor…</div></div>
      <div class="w8-hud" id="w8-hud"></div>`;
  }
  async function renderTour() {
    let v;
    try { v = await ensureTour(); $('#w8-tmsg').hidden = true; } catch (e) { $('#w8-tmsg').hidden = false; $('#w8-tmsg').innerHTML = '⚠ 3D açılamadı (WebGL yok ya da internet bağlantısı kesik).'; return; }
    v.resize();
    renderTourHud();
  }
  function renderTourHud() {
    const el = $('#w8-hud'); if (!el || !T.tour) return;
    const W = T.tourW || { eras: [] }, vis = T.tour.visited(), walk = T.tour.mode === 'walk';
    el.innerHTML = `<div class="w8-hrow">
        <div class="w8-seg"><button class="${walk ? 'on' : ''}" data-act="tmode" data-m="walk">🚶 Yürü</button><button class="${walk ? '' : 'on'}" data-act="tmode" data-m="orbit">🔄 Döndür</button></div>
        <div class="w8-hint2">${walk ? 'Sahneye tıkla · <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> yürü · fareyle bak · <kbd>Shift</kbd> koş · <kbd>Esc</kbd> fareyi bırak' : 'Sürükle: çevir · tekerlek: yakınlaş'}</div>
        <div class="w8-visit">🌀 ${vis.size} / ${W.eras.length} çağ</div>
        <button class="btn w8-go" data-act="pdf">📄 PDF</button></div>
      <div class="w8-eras2">${W.eras.map((e, i) => `<button class="${vis.has(i) ? 'v' : ''}" data-act="goera" data-i="${i}">${vis.has(i) ? '✓ ' : ''}${esc(e.ad)}<small>${esc(e.yil)}</small></button>`).join('')}</div>`;
  }

  /* =====================================================================
     OLAYLAR ve BAĞLAMA
     ===================================================================== */
  function snippet(i) { const s = SNIPS[i][1], c = s.indexOf('|'), txt = s.replace('|', ''); insertText(txt); if (c >= 0) { const p = ED.ta.selectionStart - (txt.length - c); ED.ta.setSelectionRange(p, p); } }
  function onClick(e) {
    const t = e.target, menu = $('#w8-menu');
    if (!menu.hidden && !t.closest('.w8-menu')) menu.hidden = true;
    const eg = t.closest('.w8-edge'); if (eg) { const r = S.uml.rels.find(x => x.id === eg.dataset.rid); if (r) relForm(r); return; }
    const g = t.closest('[data-goto]'); if (g) { if (S.mode !== 'code') setMode('code'); gotoLine(+g.dataset.goto); return; }
    const sn = t.closest('[data-snip]'); if (sn) { snippet(+sn.dataset.snip); return; }
    if (t.closest('#w8-lintchip')) { gotoLine(+$('#w8-lintchip').dataset.line); return; }
    const b = t.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (b.closest('#w8-menu')) menu.hidden = true;
    switch (act) {
      case 'home': if (document.pointerLockElement) document.exitPointerLock(); if (window.NYP) window.NYP.home(); break;
      case 'mode': setMode(b.dataset.m); break;
      case 'menu': menu.hidden = !menu.hidden; break;
      case 'pdf': exportPdf(); break;
      case 'export': exportSave(); break;
      case 'import': importSave(); break;
      case 'defter': S.defter = !S.defter; save(); renderTop(); setTimeout(drawEdges, 260); break;
      case 'jlv': { const n = +b.dataset.lv; if (n > S.maxLevel) { toast(`${n}. seviye henüz kilitli.`, 'info'); break; } S.jlv = n === S.maxLevel ? null : n; save(); renderDefter(); break; }
      case 'guide': guide(); break;
      case 'help': help(); break;
      case 'teacher': if (OGR()) teacher(); break;
      case 'reset': resetAll(); break;
      case 'add': createClass(b.dataset.k); break;
      case 'addrel': relForm(null); break;
      case 'editrel': { const r = S.uml.rels.find(x => x.id === b.dataset.rid); if (r) relForm(r); break; }
      case 'delcls': deleteClass(b.dataset.cid); break;
      case 'addln': { const c = cls(b.dataset.cid); if (!c) break; c[b.dataset.sec].push(''); touch(); save(); refreshBox(c.id, { sec: b.dataset.sec, i: c[b.dataset.sec].length - 1 }); break; }
      case 'zin': setZoom((S.zoom || 1) + 0.1); break;
      case 'zout': setZoom((S.zoom || 1) - 0.1); break;
      case 'zfit': fitView(); break;
      case 'run': runCode(false); break;
      case 'mktab': S.mkTab = b.dataset.tab; save(); if (S.mode === 'tour' && b.closest('.w8-dfoot')) setMode('code'); renderSide(); break;
      case 'card': S.cardOpen = S.cardOpen === b.dataset.k ? null : b.dataset.k; save(); renderSide(); break;
      case 'selera': S.selEra = b.dataset.i === 'atolye' ? 'atolye' : +b.dataset.i; save(); refresh3D(); break;
      case 'labels': S.labels = b.checked; save(); T.miniKey = null; T.tourKey = null; refresh3D(); break;
      case 'tmode': if (T.tour) { T.tour.setMode(b.dataset.m); renderTourHud(); } break;
      case 'goera': if (T.tour) { T.tour.focusEra(+b.dataset.i, true); } break;
    }
  }
  function onKeyGlobal(e) {
    if (!root || root.hidden) return;
    const modalOpen = !$('#nyp-modal').hidden;
    if (e.key === 'Escape') { if (modalOpen) { closeModal(); return; } const menu = $('#w8-menu'); if (!menu.hidden) menu.hidden = true; }
  }

  function mount(el) {
    root = el;
    ensureGlobals();
    root.innerHTML = shellHTML();
    ED.ta = $('#w8-ta'); ED.hl = $('#w8-hl'); ED.gut = $('#w8-gut');
    ED.ta.value = S.code;
    root.addEventListener('click', onClick);
    root.addEventListener('input', e => { if (e.target.closest('#w8-v-plan')) onPlanInput(e); });
    root.addEventListener('change', e => { if (e.target.closest('#w8-v-plan')) onPlanChange(e); });
    root.addEventListener('keydown', e => { if (e.target.closest('#w8-v-plan')) onPlanKey(e); });
    root.addEventListener('pointerdown', e => { if (e.target.closest('#w8-v-plan')) onPlanDown(e); });
    window.addEventListener('pointermove', e => { if (T.drag) onPlanMove(e); });
    window.addEventListener('pointerup', onPlanUp);
    root.addEventListener('focusin', e => { const bx = e.target.closest('.w8-box'); if (bx && T.sel !== bx.dataset.cid) { T.sel = bx.dataset.cid; $$('.w8-box.sel', root).forEach(x => x.classList.remove('sel')); bx.classList.add('sel'); } });
    root.addEventListener('toggle', e => { const d = e.target; if (!d.classList || !d.classList.contains('w8-note')) return; S.letterClosed[d.dataset.lv] = !d.open; save(); }, true);
    document.addEventListener('keydown', onKeyGlobal);
    ED.ta.addEventListener('keydown', onEdKey);
    ED.ta.addEventListener('input', onEdInput);
    ED.ta.addEventListener('scroll', syncScroll);
    ['keyup', 'click', 'select'].forEach(k => ED.ta.addEventListener(k, updateCur));
    $('#w8-livecb').addEventListener('change', e => { S.live = e.target.checked; save(); if (S.live) runCode(true); });
    $('#w8-repl').addEventListener('keydown', e => {
      const i = e.target;
      if (e.key === 'Enter') { e.preventDefault(); const v = i.value; i.value = ''; replRun(v); }
      else if (e.key === 'ArrowUp' && ED.hist.length) { e.preventDefault(); ED.hi = Math.max(0, ED.hi - 1); i.value = ED.hist[ED.hi] || ''; }
      else if (e.key === 'ArrowDown' && ED.hist.length) { e.preventDefault(); ED.hi = Math.min(ED.hist.length, ED.hi + 1); i.value = ED.hist[ED.hi] || ''; }
    });
    window.addEventListener('resize', () => { if (!root.hidden && S.mode === 'plan') drawEdges(); });
    H8Py.onStatus(setPyStatus);
    const showT = () => { const b = $('#w8-tbtn'); if (b) b.hidden = !OGR(); };
    showT(); document.addEventListener('nyp-ogretmen', showT);
    touch(); evaluate(true); renderAll();
    if (!S.intro) setTimeout(help, 350);
    setTimeout(() => { H8Py.boot().then(() => { if (!S.snap && S.code !== STARTER) runCode(true); }).catch(() => { /* çip gösterir */ }); }, 1200);
  }
  function refresh() { renderAll(); if (S.mode === 'plan') setTimeout(drawEdges, 30); }

  function heroArt() {
    return `<div class="w8-hart">
      <div class="w8-hart-sky"></div>
      <div class="w8-hart-isl a"><span>🏜️</span><small>MÖ 2560</small></div>
      <div class="w8-hart-portal"></div>
      <div class="w8-hart-isl b"><span>🦕</span><small>MÖ 66 milyon</small></div>
      <div class="w8-hart-isl c"><span>🚀</span><small>MS 2300</small></div>
      <div class="w8-hart-uml"><div class="h"><small>«abstract»</small><i>Cag</i></div><div class="s">+ ad: str<br>− yil: int</div><div class="s"><i>+ gok(): Gokyuzu</i></div></div>
      <div class="w8-hart-code"><span class="c">class</span> AntikMisir(<b>Cag</b>):</div>
    </div>`;
  }

  // test/ders anlatımı için: önizleme ve tur görünümlerine erişim
  return { mount, refresh, heroArt, views: () => ({ mini: T.mini, tour: T.tour }) };
})();
