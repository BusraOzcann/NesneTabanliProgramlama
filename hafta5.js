/* =========================================================================
   5. HAFTA — Vize Zindanı: İlişkiler, Kalıtım, Soyut Sınıf, Arayüz
   Üç aşama:
     1) Tasarla — UML'yi elle YAZARAK kur (satır satır), ilişkinin türünü,
        yönünü, çokluklarını ve rol adını öğrenci seçer. Brife göre denetlenir.
     2) Kodla   — Python kodunu öğrenci yazar (tarayıcıda gerçek Python).
        Kod, UML ile canlı karşılaştırılır; brif testleri koşulur.
     3) Savaş   — öğrencinin nesneleri arenada sınav canavarlarıyla savaşır;
        motor yalnızca saldir()/iyilestir() çağırır (çok biçimlilik önizlemesi).
   Durum yalnızca bu sekme açıkken saklanır; uygulama yeniden açılınca sıfırdan başlar.
   Tüm görevler bitince alınan PDF, her görevin tamamlanma saatini içerir.
   ========================================================================= */
window.Hafta5 = (function () {
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

  /* =====================================================================
     VERİ
     ===================================================================== */
  const SAVE_KEY = 'nyp-hafta5-zindan-v1';
  const CV_W = 2400, CV_H = 1600;
  const IDP = '[A-Za-zÇĞİÖŞÜçğıöşü_][A-Za-z0-9ÇĞİÖŞÜçğıöşü_]*';
  const RE_ID = new RegExp('^' + IDP + '$');
  const RE_ATTR = new RegExp('^([+\\-−#~])?\\s*(' + IDP + ')\\s*(?::\\s*([^=]*?))?\\s*(?:=\\s*(.*))?$');
  const RE_METH = new RegExp('^([+\\-−#~])?\\s*(' + IDP + ')\\s*\\(([^)]*)\\)\\s*(?::\\s*([^{]*?))?\\s*(\\{\\s*([^}]*?)\\s*\\})?\\s*$');

  const VIS = {
    '+': { name: 'public', cls: 'pub', py: '', who: 'herkes' },
    '#': { name: 'protected', cls: 'prot', py: '_', who: 'sınıf ve alt sınıfları' },
    '-': { name: 'private', cls: 'priv', py: '__', who: 'sadece sınıfın kendisi' },
    '~': { name: 'package', cls: 'pkg', py: '', who: 'aynı paket' }
  };
  const KIND = {
    class: { label: 'Sınıf', stereo: '', tip: 'Nesne üretilebilen, tüm metotları dolu sınıf.' },
    abstract: { label: 'Soyut sınıf', stereo: 'abstract', tip: 'Yarım tarif: ondan nesne üretilmez, alt sınıflar tamamlar.' },
    interface: { label: 'Arayüz', stereo: 'interface', tip: 'Yetenek sözleşmesi: sadece metot imzaları.' }
  };
  const RTYPES = {
    assoc: { name: 'İlişki', en: 'association', short: 'bilir / kullanır', ends: true },
    agg: { name: 'Toplama', en: 'aggregation', short: 'sahiptir; parça bağımsız yaşar', ends: true },
    comp: { name: 'Bileşim', en: 'composition', short: 'parça bütünle doğar, bütünle ölür', ends: true },
    gen: { name: 'Kalıtım', en: 'generalization', short: '“bir … dır” (is-a)', ends: false },
    real: { name: 'Gerçekleştirme', en: 'realization', short: 'arayüz sözleşmesini imzalar', ends: false }
  };
  const RT_ORDER = ['assoc', 'agg', 'comp', 'gen', 'real'];
  const MULTS = ['1', '0..1', '*', '1..*', '0..*'];
  const BRIEF_NAMES = ['Karakter', 'Savasci', 'Canavar', 'Iyilestirebilir', 'Sifaci', 'Iksir', 'Envanter', 'Silah', 'Lonca'];

  const LEVELS = [
    {
      n: 1, title: 'Soy Ağacı', topic: 'Kalıtım + Soyut sınıf', icon: '🌳',
      brief: `<p><b>Zindan Bekçisi'nden mektup:</b> Vize haftası geldi, zindan sınav canavarlarıyla doldu. Bir oyun tasarlayacaksın. Her şey bir <b>Karakter</b>le başlar.</p>
<ul>
<li>Her karakterin bir <b>adı</b> vardır (<code>ad</code>, metin). Herkes görebilir.</li>
<li>Bir <b>canı</b> vardır (<code>can</code>, tam sayı). Çok gizli: <i>sadece Karakter sınıfının kendi metotları</i> değiştirebilir.</li>
<li>Bir <b>gücü</b> vardır (<code>guc</code>, tam sayı). Karakter ve ondan türeyen sınıflar kullanabilir; dışarısı karışmasın.</li>
<li><code>get_can()</code> canı tam sayı olarak döndürür. <code>hasar_al(miktar)</code> canı miktar kadar azaltır ama can 0'ın altına inmez. <code>hayatta_mi()</code> doğru/yanlış (bool) döndürür. Hepsi herkese açık.</li>
<li>Her karakter <code>saldir(hedef)</code> ile başka bir Karakter'e saldırır. Ama <i>nasıl</i> saldıracağını karakterin türü bilir; Karakter bunu bilemez.</li>
<li>Ortada “sadece karakter” diye biri yoktur: herkes ya bir <b>Savasci</b> ya da bir <b>Canavar</b>dır. İkisi de birer Karakter'dir ve saldırınca hedefe <b>güçleri kadar</b> hasar verir.</li>
<li>Kodda karakterler (ad, can, guc) sırasıyla üretilir: <code>Savasci("Ali", 120, 15)</code></li>
</ul>
<p class="w5-q">🤔 Düşün: Karakter'den doğrudan nesne üretilmeli mi? Hangi metodun gövdesi Karakter'de yazılamaz?</p>`,
      concept: `<b>Kalıtım</b> (düz çizgi + boş üçgen ──▷): “Savaşçı <u>bir</u> Karakterdir.” Alt sınıf, üst sınıfın özelliklerini ve metotlarını miras alır; ok <b>çocuktan ebeveyne</b> çizilir.<br><b>Soyut sınıf</b> «abstract»: yarım kalmış bir tariftir. “Her karakter saldırır” der ama nasıl saldırılacağını alt sınıflara bırakır (soyut metot: <i>italik</i> + <code>{abstract}</code>). Soyut sınıftan nesne üretilmez.`
    },
    {
      n: 2, title: 'Sözleşme', topic: 'Arayüz', icon: '🤝',
      brief: `<p><b>Mektup:</b> Zindanda iyileşmeden hayatta kalınmaz. Ama iyileştirebilen tek şey <b>Şifacı</b> değil: bir bardak <b>Çay</b> da (bir <b>İksir</b>) iyileştirir! ☕</p>
<ul>
<li>Şifacı bir Karakter'dir. İksir ise bir eşyadır, Karakter <i>değildir</i> (iksir saldıramaz, canı yok 😄).</li>
<li>İkisinin ortak noktası bir <b>yetenek</b>: iyileştirebilmek. Bu yetenek için <code>Iyilestirebilir</code> adında bir <b>arayüz</b> tasarla. İçinde sadece <code>iyilestir(hedef)</code> imzası olsun (hedef bir Karakter).</li>
<li><b>Sifaci</b>: hem bir Karakter'dir hem de Iyilestirebilir sözleşmesini imzalar. Gücünün <b>2 katı</b> kadar iyileştirir; saldırırken gücünün <b>yarısı</b> kadar (tam sayı bölmesi <code>//</code>) hasar verir.</li>
<li><b>Iksir</b>: herkesin görebileceği <code>ad</code> (metin) ve <code>miktar</code> (tam sayı). İyileştirince hedefin canı miktar kadar artar. Kodda <code>Iksir("Çay", 25)</code>.</li>
<li>Bir sorun var: can <b>private</b>! Şifacı da iksir de başka bir karakterin canına doğrudan dokunamaz. Karakter'e herkese açık bir kapı aç: <code>can_kazan(miktar)</code>.</li>
</ul>
<p class="w5-q">🤔 Düşün: Iksir'i Karakter'den türetmek neden yanlış olurdu?</p>`,
      concept: `<b>Arayüz</b> «interface» bir <i>yetenek sözleşmesidir</i> (“…ebilir”). İçinde sadece metot imzaları olur; özellik ve kod olmaz. Birbiriyle akraba olmayan sınıflar aynı arayüzü gerçekleştirebilir (<b>kesikli çizgi + boş üçgen</b> ┄▷).<br>Soyut sınıf “<b>ne</b>dir?” sorusunu, arayüz “<b>ne yapabilir</b>?” sorusunu cevaplar. Python'da <code>interface</code> anahtar kelimesi yoktur: sadece soyut metotlardan oluşan bir ABC sınıfı arayüz gibi kullanılır.`
    },
    {
      n: 3, title: 'Bağlar', topic: '1—1 · 0..1 · 0..* ilişkiler', icon: '🔗',
      brief: `<p><b>Mektup:</b> Kahramanların eşyaya ihtiyacı var.</p>
<ul>
<li><b>Envanter</b>: Her karakter kendi envanteriyle <b>doğar</b>; karakter yok olursa envanteri de yok olur. Bir envanter yalnızca bir karaktere aittir. (Karakter tarafından bakınca envanterin rol adı: <code>envanter</code>)</li>
<li>Bir envanterde <b>hiç</b> iksir olmayabilir ya da <b>çok sayıda</b> iksir olabilir. İksir envanterden bağımsızdır: yerde de durabilir, bir envanterden alınıp başkasına konabilir; ama aynı anda <b>en fazla bir</b> envanterde durur. (rol: <code>iksirler</code>)</li>
<li>Envanterin herkese açık metotları: <code>iksir_ekle(iksir)</code> ve <code>iksir_al()</code> (bir iksiri çıkarıp <b>döndürür</b>; envanter boşsa None döner). <code>Envanter()</code> parametresiz üretilir.</li>
<li><b>Silah</b>: herkese açık <code>ad</code> (metin) ve <code>hasar</code> (tam sayı). Kodda <code>Silah("Annenin Terliği", 15)</code> 🩴</li>
<li>Bir karakter <b>en fazla bir</b> silah kuşanır, hiç kuşanmayabilir. Bir silahı aynı anda <b>en fazla bir</b> karakter kullanır. Karakter silahını bilir ama silah sahibini bilmez. (rol: <code>silah</code>) Karakter'e herkese açık <code>silah_kusan(silah)</code> ekle.</li>
<li>Savaşçı silah kuşanmışsa saldırırken silahın hasarını da ekler.</li>
</ul>
<p class="w5-q">🤔 Düşün: “birlikte doğar, birlikte ölür” ile “ayrılsa da yaşar” UML'de nasıl ayrılır?</p>`,
      concept: `<b>Çokluk</b> çizginin uçlarına yazılır ve “karşı taraftan <i>kaç tane</i>?” sorusunu cevaplar: <code>1</code> tam bir · <code>0..1</code> en fazla bir · <code>*</code> = <code>0..*</code> hiç ya da çok · <code>1..*</code> en az bir.<br><b>Bileşim ◆</b>: parça bütünle doğar, bütünle ölür. <b>Toplama ◇</b>: parça bütünden bağımsız yaşar. <b>İlişki →</b>: sahiplik yok, sadece bilir/kullanır. Kodda <code>1</code> → tek nesne, <code>0..1</code> → nesne ya da <code>None</code>, <code>*</code> → liste.`
    },
    {
      n: 4, title: 'Lonca', topic: 'Sınırlı çokluk + Arena', icon: '🛡️',
      brief: `<p><b>Mektup:</b> Zindana tek başına girilmez! Bir <b>Lonca</b> kur.</p>
<ul>
<li>Loncanın herkese açık bir <code>ad</code>ı (metin) vardır. Kodda <code>Lonca("Son Gece Çalışanlar")</code>.</li>
<li>Bir lonca <b>en az 1, en fazla 4</b> üyeden oluşur. Karakter loncadan ayrılsa da yaşamaya devam eder; bir karakter <b>en fazla bir</b> loncaya üyedir (loncasız da olabilir). (rol: <code>uyeler</code>)</li>
<li>Herkese açık <code>uye_ekle(karakter)</code>: lonca doluysa eklemez ve <b>False</b> döner; eklerse <b>True</b> döner (bool).</li>
<li>Sonra kodunun <b>deneme alanında</b> loncanı kur: en az 3 üye; içlerinde iyileştirebilen biri olsun, birinin elinde silah, birinin envanterinde iksir olsun.</li>
<li>⚖️ <b>Arena kuralları</b> (hile yok 😄): can ≤ 150 · guc ≤ 25 · silah hasarı ≤ 20 · iksir miktarı ≤ 40 · envanterde en fazla 3 iksir.</li>
</ul>
<p class="w5-q">🤔 Düşün: UML “en fazla 4” diyor. Bu kuralı kim korur: diyagram mı, kod mu?</p>`,
      concept: `<b>Sınırlı çokluk</b>: <code>1..4</code> “en az 1, en fazla 4” demektir. UML sınırı <i>söyler</i>; sınırı <i>korumak</i> kodun işidir (ekleme metodunda kontrol).<br>⚔️ <b>Arena</b>'da oyun motoru her tur yalnızca <code>k.saldir(hedef)</code> çağırır; hangi saldir()'ın çalışacağına nesnenin sınıfı karar verir. Iyilestirebilir olanlara <code>iyilestir()</code> çağırır: motor Şifacı'yı da İksir'i de <i>aynı arayüzden</i> tanır.`
    },
    {
      n: 5, title: 'Ejderha', topic: 'Kendi sınıfını icat et', icon: '🐉',
      brief: `<p><b>Son mektup:</b> En alt katta <b>Bütünleme Ejderhası</b> yaşıyor: 1000 can, her 3 turda bir tüm loncayı yakan alev. 🔥 Standart karakterler yetmeyebilir.</p>
<ul>
<li>Kendi kahraman sınıfını <b>icat et</b>! Karakter'den türesin (doğrudan ya da dolaylı), kendine özgü <b>en az bir özelliği</b> ve <b>en az bir metodu</b> olsun, <code>saldir()</code>'ı kendi tarzında yazsın.</li>
<li>Fikirler: <b>Uykucu</b> (bazen uyuyakalır, sonra öfkeyle uyanır 😴), <b>Kantinci</b> (tost fırlatır 🥪), <b>Erteleyici</b> (saldırıyı sonraki tura erteler, sonra iki kat vurur), <b>İnek</b> (her saldırıda biraz daha güçlenir 📚)…</li>
<li>Ek özelliği olan bir sınıf kendi <code>__init__</code>'ini yazar ve <code>super().__init__(ad, can, guc)</code> ile önce ebeveynini çağırır.</li>
<li>Yeni sınıfını loncana kat, UML ile kodun tamamen uyumlu olsun ve tasarımının PDF'ini al.</li>
</ul>`,
      concept: `<b>Genişletilebilirlik</b>: Yeni bir kahraman türü eklerken oyun motorunun koduna hiç dokunmadın! Çünkü motor sadece Karakter'in sözleşmesini (<code>saldir</code>, <code>hasar_al</code>, <code>get_can</code>…) biliyor. İyi kurulmuş bir kalıtım ağacı, yeni türleri eski kodu bozmadan eklemeni sağlar. Gelecek hafta bunun adını koyacağız. 😉`
    }
  ];

  const RANKS = [[0, 'Çaylak'], [50, 'Stajyer'], [110, 'Junior Dev'], [170, 'Mid-level Dev'], [230, 'Senior Dev'], [300, 'Kod Büyücüsü']];

  /* ---- İlişki Dedektifi (quiz) ---- */
  const QUIZ_T = [
    ['Kedi bir Hayvandır.', 'gen', '“bir …dır” cümlesi kalıtımdır.'],
    ['Hem Ördek hem Uçak uçabilir (ama ördek bir uçak değildir).', 'real', 'Akraba olmayan iki sınıfın ortak yeteneği: arayüz.'],
    ['Binanın odaları binayla birlikte yıkılır.', 'comp', 'Parça bütünle birlikte yok oluyorsa bileşim.'],
    ['Futbol takımı oyunculardan oluşur; oyuncu ayrılınca başka takıma transfer olur.', 'agg', 'Parça (oyuncu) bütünsüz de yaşıyor: toplama.'],
    ['Öğrenci, kantindeki tost makinesini kullanır.', 'assoc', 'Sahiplik yok, sadece kullanma: ilişki.'],
    ['WhatsApp grubu üyelerden oluşur; gruptan çıkan kişi hayatına devam eder (biraz küskün de olsa).', 'agg', 'Üye gruptan bağımsız yaşıyor: toplama.'],
    ['Hoca da Asistan da birer Personeldir.', 'gen', 'İkisi de “bir Personel”: kalıtım.'],
    ['Hem Robot Süpürge hem Annen odayı temizleyebilir. 🧹', 'real', 'Ortak yetenek, farklı aileler: arayüz (Temizleyebilir).'],
    ['Kitabın sayfaları kitapla birlikte yanar.', 'comp', 'Sayfa kitapla doğar, kitapla gider: bileşim.'],
    ['Kurye, teslim edeceği siparişi bilir.', 'assoc', 'Bilmek/kullanmak: ilişki.'],
    ['Spotify listesi şarkıları toplar; liste silinse de şarkılar durur.', 'agg', 'Şarkılar listeden bağımsız: toplama.'],
    ['Tost bir Yiyecektir; Ayran bir İçecektir.', 'gen', '“bir …dır” → kalıtım.'],
    ['Telefonun ekranı telefonla birlikte üretilir; telefon çöpe gidince ekranı da gider.', 'comp', 'Birlikte doğar, birlikte ölür: bileşim.'],
    ['Hem Kredi Kartı hem Nakit ile ödeme yapılabilir.', 'real', 'Ortak sözleşme (OdemeYapilabilir): arayüz.'],
    ['Şoför, otobüsü kullanır.', 'assoc', 'Kullanır: ilişki.'],
    ['Çaylak bir Oyuncudur; Kaptan da bir Oyuncudur.', 'gen', 'İkisi de bir Oyuncu: kalıtım.']
  ];
  const QUIZ_M = [
    ['Her vatandaşın tam olarak bir kimlik numarası vardır. (Kimlik numarası ucuna ne yazılır?)', '1', 'Tam olarak bir → 1'],
    ['Bir öğrencinin en fazla bir danışman hocası olur; yeni gelenlerin henüz yoktur. (Danışman ucu?)', '0..1', 'Hiç ya da bir → 0..1'],
    ['Bir siparişte en az bir ürün olmalıdır. (Ürün ucu?)', '1..*', 'En az bir, üst sınır yok → 1..*'],
    ['Bir YouTube kanalının hiç videosu olmayabilir ya da binlerce olabilir. (Video ucu?)', '0..*', 'Hiç ya da çok → 0..* (kısaca *)'],
    ['Bir basketbol takımı sahada tam 5 oyuncuyla oynar. (Sahadaki oyuncu ucu?)', '5', 'Tam sayı biliniyorsa doğrudan yazılır → 5'],
    ['Bir kullanıcının profil fotoğrafı olmayabilir, olursa da tek olur. (Fotoğraf ucu?)', '0..1', 'En fazla bir → 0..1'],
    ['Bir ders açılması için en az bir öğrenci kaydolmalı; üst sınır yok. (Öğrenci ucu?)', '1..*', 'En az bir → 1..*'],
    ['Bir öğrencinin hiç devamsızlığı olmayabilir ya da çok olabilir 😅 (Devamsızlık ucu?)', '0..*', 'Hiç ya da çok → 0..*'],
    ['Bir arabanın tam olarak 4 tekerleği vardır. (Tekerlek ucu?)', '4', 'Tam 4 → 4']
  ];

  /* ---- Kod Kartları (başka konulardan örnekler; öğrenci uyarlamalı) ---- */
  const CARDS = [
    { k: 'sinif', t: 'Sınıf, __init__ ve metot', uml: '+ marka: str', code:
`class Telefon:
    def __init__(self, marka, sarj):
        self.marka = marka          # + marka: str
        self.sarj = sarj            # + sarj: int

    def arama_yap(self, kisi):      # + arama_yap(kisi: str): None
        print(self.marka, "ile", kisi, "aranıyor")

    def sarj_getir(self):           # + sarj_getir(): int
        return self.sarj

tel = Telefon("Lale", 80)           # nesne üret
tel.arama_yap("Anne")               # metot çağır`, note: 'Metodun ilk parametresi her zaman <code>self</code>. UML\'de self yazılmaz, Python\'da yazılır.' },
    { k: 'erisim', t: 'Erişim: + # −', uml: '− bakiye: int', code:
`class Hesap:
    def __init__(self, sahip, bakiye):
        self.sahip = sahip          # +  public: düz ad
        self._limit = 1000          # #  protected: tek alt çizgi
        self.__bakiye = bakiye      # −  private: çift alt çizgi

    def get_bakiye(self):           # private'a açılan kapı
        return self.__bakiye

    def para_yatir(self, miktar):   # private'ı sadece sınıf değiştirir
        self.__bakiye += miktar`, note: 'Başka bir sınıftan (alt sınıf bile!) <code>h.__bakiye</code> yazarsan AttributeError alırsın. Bu hata değil, kapsüllemenin çalıştığının kanıtı. 🔒' },
    { k: 'kalitim', t: 'Kalıtım ──▷', uml: 'Kedi ──▷ Hayvan', code:
`class Hayvan:
    def __init__(self, ad):
        self.ad = ad

    def ses_cikar(self):
        print("...")

class Kedi(Hayvan):                 # Kedi bir Hayvandır
    def ses_cikar(self):            # override: kendi yöntemiyle
        print(self.ad, ": Miyav")

pamuk = Kedi("Pamuk")               # __init__ Hayvan'dan miras
pamuk.ses_cikar()`, note: 'Alt sınıf <code>__init__</code> yazmazsa ebeveyninkini kullanır. Parantez içine ebeveynin adını yaz.' },
    { k: 'super', t: 'Ek özellik + super()', uml: '+ kenar: int', code:
`class Kare(Sekil):
    def __init__(self, renk, kenar):
        super().__init__(renk)      # önce ebeveyn kendi işini yapsın
        self.kenar = kenar          # sonra Kare'ye özgü özellik

    def alan(self):
        return self.kenar * self.kenar`, note: 'Alt sınıfa yeni özellik ekliyorsan kendi <code>__init__</code>\'ini yaz ve ilk satırda <code>super().__init__(...)</code> çağır.' },
    { k: 'soyut', t: 'Soyut sınıf «abstract»', uml: '+ alan(): float {abstract}', code:
`from abc import ABC, abstractmethod

class Sekil(ABC):                   # ABC'den türeyen = soyut olabilir
    def __init__(self, renk):
        self.renk = renk

    @abstractmethod                 # soyut metot: gövdesi yok
    def alan(self):
        pass

    def tanit(self):                # soyut sınıfta dolu metot da olur
        print(self.renk, "bir şekil")

# Sekil("mavi")  → TypeError! Soyut sınıftan nesne olmaz.`, note: 'Alt sınıf soyut metodun hepsini yazmazsa o da soyut kalır ve ondan da nesne üretilemez.' },
    { k: 'arayuz', t: 'Arayüz «interface» ┄▷', uml: 'Telefon ┄▷ SarjEdilebilir', code:
`class SarjEdilebilir(ABC):          # arayüz: SADECE soyut metotlar
    @abstractmethod
    def sarj_et(self, dakika):
        pass

class Telefon(Cihaz, SarjEdilebilir):   # bir Cihaz + sözleşme
    def sarj_et(self, dakika):
        print("Telefon şarj oluyor")

class Powerbank(SarjEdilebilir):        # Cihaz değil ama şarj edilebilir
    def sarj_et(self, dakika):
        print("Powerbank doluyor")

isinstance(Powerbank(), SarjEdilebilir)  # True`, note: 'Bir sınıf hem bir ebeveynden türeyip hem bir arayüzü gerçekleştirebilir: parantez içine ikisini de yaz.' },
    { k: 'bilesim', t: 'Bileşim ◆ (1 — 1)', uml: 'Araba ◆─ 1 Motor', code:
`class Motor:
    def __init__(self):
        self.calisiyor = False

class Araba:
    def __init__(self, model):
        self.model = model
        self.motor = Motor()        # parça, bütünün İÇİNDE doğar

a = Araba("Kartal")
b = Araba("Doğan")
print(a.motor is b.motor)          # False: herkesin KENDİ motoru var`, note: 'Bileşimde parçayı dışarıdan almazsın; bütün kendi parçasını kendisi üretir.' },
    { k: 'sifirbir', t: '0..1 → nesne ya da None', uml: 'Ogrenci → 0..1 Hoca', code:
`class Ogrenci:
    def __init__(self, ad):
        self.ad = ad
        self.danisman = None        # henüz yok → None ile başla

    def danisman_ata(self, hoca):
        self.danisman = hoca

    def danismani_soyle(self):
        if self.danisman is not None:
            print(self.danisman.ad)
        else:
            print("Danışmanım yok")`, note: 'None üzerinde <code>.ad</code> çağırırsan hata alırsın; önce <code>is not None</code> kontrolü.' },
    { k: 'liste', t: '0..* / 1..* → liste', uml: 'Playlist ◇─ * Sarki', code:
`class Playlist:
    def __init__(self, ad):
        self.ad = ad
        self.sarkilar = []          # çok → boş listeyle başla

    def sarki_ekle(self, sarki):
        self.sarkilar.append(sarki)

    def sarki_cikar(self):
        if len(self.sarkilar) == 0:
            return None             # boşsa None
        return self.sarkilar.pop(0) # ilkini listeden çıkar ve döndür`, note: '<code>pop(0)</code> ilk elemanı, <code>pop()</code> son elemanı çıkarıp döndürür.' },
    { k: 'sinir', t: 'Sınırlı çokluk (1..5)', uml: 'Takim ◇─ 1..5 Oyuncu', code:
`class Takim:
    def __init__(self):
        self.oyuncular = []

    def oyuncu_ekle(self, oyuncu):
        if len(self.oyuncular) >= 5:
            print("Kadro dolu!")
            return False
        self.oyuncular.append(oyuncu)
        return True`, note: 'Diyagram sınırı söyler, kod korur.' },
    { k: 'nesne', t: 'Nesneleri birbirine bağla', uml: ':Playlist', code:
`liste = Playlist("Ders Çalışma")
liste.sarki_ekle(Sarki("Lo-fi 1"))
liste.sarki_ekle(Sarki("Lo-fi 2"))

for s in liste.sarkilar:
    print(s.ad)

araba = Araba("Kartal")
araba.motor.calisiyor = True        # nesnenin içindeki nesneye eriş`, note: 'Nokta zinciri: <code>nesne.ozellik.ozellik</code>' }
  ];
  const STARTER = `# ⚔️ Vize Zindanı — senin Python kodun
# UML'de tasarladığın her sınıfı burada koda çevir.
# ▶ Çalıştır (Ctrl+Enter) · Sağdaki "UML ↔ Kod" paneli diyagramınla kodunu karşılaştırır.
# Kod Kartları'ndaki örnekler başka konulardan; kendi sınıflarına UYARLAMAN gerekiyor. 😉

from abc import ABC, abstractmethod


# ---- Sınıflar ----



# ---- Deneme alanı (nesneler ve çağrılar) ----
# Sınıflarından nesne üret, metotlarını çağır, print ile sonuçlara bak.

`;

  /* =====================================================================
     DURUM
     ===================================================================== */
  const fresh = () => ({
    v: 1, uml: { classes: [], rels: [] }, code: STARTER, mode: 'design', journal: true, jlv: null,
    zoom: 1, done: {}, events: {}, maxLevel: 1, finished: false,
    tests: {}, analysis: null, quizBest: 0, kat: 1, wins: {}, intro: false, sideTab: 'uml', cardOpen: 'sinif',
    startedAt: Date.now(), doneAt: {}, levelAt: { 1: Date.now() }, teacherUsed: false
  });
  let S = load() || fresh();
  const T = { sel: null, tool: 'select', drag: null, hints: {}, conf: null, confKey: '', lintErr: null, runBusy: false, teacherOk: false, battle: null, roster: null, focusCls: null };
  let root = null;

  // Çalışma yalnızca bu sekme açıkken saklanır (sessionStorage): sayfa yenilenirse kaldığı yerden
  // devam eder, uygulama kapatılıp index.html yeniden açılınca her şey sıfırdan başlar.
  function load() {
    try { localStorage.removeItem(SAVE_KEY); } catch (_) { /* eski sürümün kaydı */ }
    try { const t = sessionStorage.getItem(SAVE_KEY); return t ? Object.assign(fresh(), JSON.parse(t)) : null; } catch (_) { return null; }
  }
  function saveNow() { try { sessionStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (_) { /* depolama yoksa sorun değil */ } }
  const save = debounce(saveNow, 300);

  /* =====================================================================
     UML MODELİ: satırları ayrıştır
     ===================================================================== */
  let VER = 1, MC = null;
  function touch() { VER++; }
  const normVis = s => (s === '−' ? '-' : s);
  const symOf = v => (v === '-' ? '−' : v);
  function normType(t) {
    t = String(t || '').trim();
    const l = t.toLowerCase();
    return ({ integer: 'int', tamsayi: 'int', string: 'str', metin: 'str', boolean: 'bool', none: 'None', void: 'None', double: 'float' })[l] || (['int', 'str', 'bool', 'float', 'list'].includes(l) ? l : t);
  }

  function parseAttr(raw) {
    const t = String(raw || '').trim();
    if (!t) return { empty: true };
    if (/\(/.test(t)) return { err: 'Parantez var: bu bir metot. Metotlar alttaki bölmeye yazılır.' };
    const m = RE_ATTR.exec(t);
    if (!m) return { err: 'Biçim: erişim ad: tip  (ör. − can: int)' };
    const r = { vis: m[1] ? normVis(m[1]) : null, name: m[2], type: (m[3] || '').trim() };
    if (!r.vis) r.err = 'Başa erişim simgesi koy: + public · # protected · − private';
    else if (!r.type) r.err = `Tip eksik: ${r.name}: int gibi yaz`;
    r.ok = !r.err;
    return r;
  }
  function parseMeth(raw) {
    const t = String(raw || '').trim();
    if (!t) return { empty: true };
    const m = RE_METH.exec(t);
    if (!m) {
      if (!/\(/.test(t)) return { err: 'Metotta parantez olmalı: + ad(param: Tip): DönüşTipi' };
      if (!/\)/.test(t)) return { err: 'Parantez kapanmamış.' };
      return { err: 'Biçim: + ad(param: Tip): DönüşTipi' };
    }
    const params = m[3].trim() ? m[3].split(',').map(p => { const i = p.indexOf(':'); return i < 0 ? { name: p.trim(), type: '' } : { name: p.slice(0, i).trim(), type: p.slice(i + 1).trim() }; }) : [];
    const tag = (m[6] || '').trim().toLowerCase();
    const r = { vis: m[1] ? normVis(m[1]) : null, name: m[2], params, ret: (m[4] || '').trim(), abstract: tag === 'abstract' || tag === 'soyut' };
    if (!r.vis) r.err = 'Başa erişim simgesi koy: + public · # protected · − private';
    else if (m[5] && !r.abstract) r.err = 'Etiket olarak {abstract} yazılır.';
    else if (params.some(p => !RE_ID.test(p.name))) r.err = 'Parametreler: ad: Tip, ad2: Tip';
    else if (params.some(p => p.name === 'self')) r.err = 'UML\'de self yazılmaz; self sadece Python\'da ilk parametredir.';
    else if (!r.ret && r.name !== '__init__') r.warn = 'Dönüş tipini yaz (bir şey döndürmüyorsa : None)';
    r.ok = !r.err;
    return r;
  }

  function model() {
    if (MC && MC.v === VER) return MC.m;
    const classes = S.uml.classes.map(c => {
      const attrs = c.attrs.map(parseAttr), meths = c.meths.map(parseMeth);
      if (c.kind === 'interface') meths.forEach(m => { if (m.ok) m.abstract = true; });
      return { id: c.id, name: (c.name || '').trim(), kind: c.kind, attrs, meths, raw: c };
    });
    const byId = Object.fromEntries(classes.map(c => [c.id, c]));
    const rels = S.uml.rels.filter(r => byId[r.a] && byId[r.b] && r.a !== r.b);
    const m = { classes, byId, rels };
    MC = { v: VER, m };
    return m;
  }
  const M = () => model();
  const clsByName = n => M().classes.find(c => c.name === n);
  const clsNear = n => M().classes.find(c => fold(c.name) === fold(n));
  function parentsOf(c, types) { const m = M(); return m.rels.filter(r => r.a === c.id && (types || ['gen', 'real']).includes(r.type)).map(r => m.byId[r.b]); }
  function ancestors(c, types) {
    const seen = new Set(), st = [c];
    while (st.length) { const x = st.pop(); parentsOf(x, types).forEach(p => { if (!seen.has(p.id) && p.id !== c.id) { seen.add(p.id); st.push(p); } }); }
    return Array.from(seen).map(id => M().byId[id]);
  }
  const isSub = (c, anc) => !!c && !!anc && ancestors(c, ['gen']).some(x => x.id === anc.id);
  function inheritedAbstract(c) {
    const anc = ancestors(c);
    const impl = new Set();
    [c].concat(anc).forEach(x => x.meths.forEach(m => { if (m.ok && !m.abstract) impl.add(m.name); }));
    const must = new Set();
    anc.forEach(x => x.meths.forEach(m => { if (m.ok && m.abstract && !impl.has(m.name)) must.add(m.name); }));
    return Array.from(must);
  }

  /* ---- çokluk ---- */
  function normMult(m) {
    m = String(m || '').replace(/\s+/g, '').replace(/…/g, '..').replace(/\.{3,}/g, '..').replace(/n$/i, '*');
    if (m === '0..*') return '*';
    const x = /^(\d+)\.\.(\d+)$/.exec(m);
    if (x && x[1] === x[2]) return x[1];
    return m;
  }
  function multValid(m) {
    m = normMult(m);
    if (!m) return null;
    if (/^\*$|^\d+$/.test(m)) return true;
    const x = /^(\d+)\.\.(\d+|\*)$/.exec(m);
    return !!x && (x[2] === '*' || +x[1] <= +x[2]);
  }
  function multMany(m) {
    m = normMult(m);
    if (m === '*') return true;
    const x = /^(\d+)\.\.(\d+|\*)$/.exec(m);
    if (x) return x[2] === '*' || +x[2] > 1;
    return /^\d+$/.test(m) && +m > 1;
  }
  function multText(m) {
    m = normMult(m);
    if (!m) return '(çokluk yazılmamış)';
    if (m === '*') return 'hiç ya da birden çok';
    if (m === '1') return 'tam olarak 1';
    if (m === '0..1') return 'en fazla 1 (hiç olmayabilir)';
    if (/^\d+$/.test(m)) return 'tam olarak ' + m;
    const x = /^(\d+)\.\.(\d+|\*)$/.exec(m);
    if (!x) return '“' + m + '” (geçersiz)';
    if (x[2] === '*') return 'en az ' + x[1];
    return x[1] + ' ile ' + x[2] + ' arası';
  }
  const multEq = (have, want) => [].concat(want).some(w => normMult(have) === normMult(w));
  const relSym = t => ({ assoc: '→', agg: '◇', comp: '◆', gen: '──▷', real: '┄▷' })[t];

  /* ---- ilişkiyi Türkçe cümleye çevir ---- */
  function relSentence(r) {
    const m = M(), A = m.byId[r.a], B = m.byId[r.b];
    if (!A || !B) return '';
    const a = `<b>${esc(A.name || '?')}</b>`, b = `<b>${esc(B.name || '?')}</b>`;
    const role = r.role && r.role.trim() ? ` (kodda: <code>${esc(A.name)}.${esc(r.role.trim())}</code>)` : '';
    switch (r.type) {
      case 'gen': return `${a}, ${b} türündendir: ${b} sınıfındaki özellik ve metotlar ${a} sınıfına miras kalır.`;
      case 'real': return `${a}, ${b} arayüzünün sözleşmesini imzalar: ${b} içindeki metotları yazmak zorundadır.`;
      case 'assoc': return `Her ${a} nesnesi <u>${multText(r.mb)}</u> ${b} nesnesini bilir/kullanır${role}. Her ${b} nesnesi <u>${multText(r.ma)}</u> ${a} tarafından bilinir.`;
      case 'agg': return `Her ${a} nesnesi <u>${multText(r.mb)}</u> ${b} nesnesini barındırır${role}; ${b} nesneleri ${a} olmadan da yaşar. Her ${b}, <u>${multText(r.ma)}</u> ${a} içinde bulunur.`;
      case 'comp': return `Her ${a} nesnesi <u>${multText(r.mb)}</u> ${b} parçasına sahiptir${role}; parça bütünle doğar ve bütünle yok olur. Her ${b}, <u>${multText(r.ma)}</u> ${a} nesnesine aittir.`;
    }
    return '';
  }

  /* =====================================================================
     UML DENETİMİ (lint): kutularda ⚠ olarak görünür
     ===================================================================== */
  function lintClass(c) {
    const L = [], m = M();
    const E = msg => L.push({ lv: 'err', msg }), W = msg => L.push({ lv: 'warn', msg }), I = msg => L.push({ lv: 'info', msg });
    if (!c.name) E('Sınıfa bir ad ver.');
    else if (!RE_ID.test(c.name)) E('Sınıf adında boşluk ya da simge olmamalı.');
    else if (!/^[A-ZÇĞİÖŞÜ]/.test(c.name)) W('Sınıf adı büyük harfle başlamalı (PascalCase).');
    if (c.name && m.classes.some(o => o !== c && o.name === c.name)) E('Bu ad başka bir sınıfta da var.');
    const bad = c.attrs.concat(c.meths).filter(x => x.err).length;
    if (bad) E(`${bad} satırda yazım sorunu var (kırmızı satırlar).`);
    const names = c.attrs.filter(a => a.ok).map(a => a.name).concat(c.meths.filter(x => x.ok).map(x => x.name));
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) W(`“${dup}” iki kez yazılmış.`);
    if (c.kind === 'interface' && c.attrs.some(a => a.ok)) W('Arayüzde özellik olmaz; sadece metot imzaları olur.');
    if (c.kind === 'abstract' && !c.meths.some(x => x.ok && x.abstract)) I('Soyut sınıfın genelde en az bir soyut metodu olur ({abstract}).');
    if (c.kind === 'class' && c.meths.some(x => x.ok && x.abstract)) E('Somut sınıfta soyut metot olamaz: sınıfı soyut yap ya da {abstract} etiketini kaldır.');
    if (c.kind === 'class') {
      const must = inheritedAbstract(c);
      if (must.length) W(`Miras kalan soyut metot(lar) burada yazılmalı (override): ${must.map(x => x + '()').join(', ')}. Yoksa ${c.name || 'bu sınıf'} da soyut kalır!`);
    }
    if (parentsOf(c, ['gen']).filter(p => p.kind !== 'interface').length > 1) I('Birden fazla sınıftan kalıtım: Python izin verir ama genelde tek ebeveyn yeter.');
    if (ancestors(c, ['gen']).some(x => x.id === c.id)) E('Kalıtım döngüsü: bir sınıf kendi atası olamaz.');
    return L;
  }
  function lintRel(r) {
    const L = [], m = M(), A = m.byId[r.a], B = m.byId[r.b];
    const E = msg => L.push({ lv: 'err', msg }), W = msg => L.push({ lv: 'warn', msg }), I = msg => L.push({ lv: 'info', msg });
    if (!A || !B) return L;
    if (r.type === 'gen' && B.kind === 'interface' && A.kind !== 'interface') E('Bir sınıf arayüze kalıtımla değil, gerçekleştirmeyle (kesikli çizgi) bağlanır.');
    if (r.type === 'real' && B.kind !== 'interface') E('Gerçekleştirme oku yalnızca bir arayüze gider; hedef bir arayüz değil.');
    if (r.type === 'gen' && A.kind === 'interface' && B.kind !== 'interface') E('Bir arayüz, sınıftan türeyemez.');
    if (RTYPES[r.type].ends) {
      [['ma', A], ['mb', B]].forEach(([k, X]) => {
        const v = multValid(r[k]);
        if (v === false) E(`${X.name || '?'} ucundaki “${r[k]}” geçerli bir çokluk değil (1, 0..1, *, 1..*, 2..4 gibi).`);
      });
      if (multValid(r.ma) === null || multValid(r.mb) === null) I('İki uca da çokluk yaz.');
      if (r.type === 'comp' && multValid(r.ma) && !['1', '0..1'].includes(normMult(r.ma))) W('Bileşimde bütün tarafı 1 (ya da 0..1) olur: bir parça aynı anda iki bütüne ait olamaz.');
      if (!r.role || !r.role.trim()) I(`Rol adı yaz: kodda bu ilişki ${A.name || 'sınıf'} içinde bu adla bir özellik olur.`);
      else if (!RE_ID.test(r.role.trim())) E('Rol adı tek kelime olmalı (boşluksuz).');
    } else if ((r.ma && r.ma.trim()) || (r.mb && r.mb.trim())) {
      I('Kalıtım ve gerçekleştirmede çokluk yazılmaz.');
    }
    return L;
  }

  /* =====================================================================
     BRİF DENETİMLERİ (görev kontrolleri): true ya da ipucu metni döner
     ===================================================================== */
  function all(...xs) { for (const x of xs) { const r = typeof x === 'function' ? x() : x; if (r !== true) return r; } return true; }
  function needClass(name, kind) {
    const c = clsByName(name);
    if (!c) { const n = clsNear(name); return n ? `“${n.name}” adını brifteki gibi yaz: ${name} (Türkçe karakter ve boşluk olmadan, büyük harfle).` : `${name} sınıfı henüz yok.`; }
    if (kind && c.kind !== kind) {
      if (kind === 'abstract') return `${name}: sınıfın türünü düşün. Ondan doğrudan nesne üretilmeli mi? (Kutuyu seç → sağ panelden türü değiştir.)`;
      if (kind === 'interface') return `${name} bir yetenek sözleşmesi. Türü ne olmalı?`;
      return `${name} sınıfından nesne üretilecek; ${KIND[c.kind].label.toLowerCase()} olmamalı.`;
    }
    return true;
  }
  function needAttr(cn, an, vis, type) {
    const c = clsByName(cn); if (!c) return `${cn} sınıfı henüz yok.`;
    const a = c.attrs.find(x => x.name === an);
    if (!a) { const n = c.attrs.find(x => x.name && fold(x.name) === fold(an)); return n ? `${cn}: “${n.name}” özelliğini brifteki adla yaz: ${an}` : `${cn} sınıfında ${an} özelliği yok.`; }
    if (a.err) return `${cn}.${an} satırında yazım sorunu: ${a.err}`;
    if (a.vis !== vis) return `${cn}.${an}: erişim belirleyici uygun değil. Brifte ${an} için kimlerin erişebileceği yazıyor.`;
    if (type && normType(a.type) !== type) return `${cn}.${an}: tip uygun değil (tam sayı → int, metin → str, ondalık → float, doğru/yanlış → bool).`;
    return true;
  }
  function needMeth(cn, mn, o) {
    o = o || {};
    const c = clsByName(cn); if (!c) return `${cn} sınıfı henüz yok.`;
    const m = c.meths.find(x => x.name === mn);
    if (!m) { const n = c.meths.find(x => x.name && fold(x.name) === fold(mn)); return n ? `${cn}: “${n.name}” metodunu brifteki adla yaz: ${mn}` : `${cn} sınıfında ${mn}() metodu yok.`; }
    if (m.err) return `${cn}.${mn} satırında yazım sorunu: ${m.err}`;
    if (m.vis !== (o.vis || '+')) return `${cn}.${mn}(): erişim belirleyici uygun değil.`;
    if (o.n != null && m.params.length !== o.n) return o.n ? `${cn}.${mn}() ${o.n} parametre almalı (ad: Tip biçiminde).` : `${cn}.${mn}() parametre almamalı.`;
    if (o.ptype && m.params[0] && normType(m.params[0].type) !== o.ptype) return `${cn}.${mn}(): parametrenin tipi uygun değil. Parametre neyi temsil ediyor?`;
    if (o.ret && normType(m.ret) !== o.ret) return `${cn}.${mn}(): dönüş tipi uygun değil. Bu metot ne döndürüyor?`;
    if (o.abstract === true && !m.abstract) return `${cn}.${mn}(): bu metodun gövdesi ${cn} içinde yazılabilir mi? Yazılamıyorsa soyuttur ({abstract}).`;
    if (o.abstract === false && m.abstract) return `${cn}.${mn}() burada dolu (somut) olmalı; {abstract} etiketini kaldır.`;
    return true;
  }
  const TYPE_HINT = {
    comp: (a, b) => `${a} ile ${b} arasındaki çizginin türü uygun değil. İpucu: “birlikte doğar, birlikte ölür” hangi ilişki?`,
    agg: (a, b) => `${a} ile ${b} arasındaki çizginin türü uygun değil. İpucu: ${a} onları barındırıyor ama parça ${a} olmadan da yaşayabiliyor.`,
    assoc: (a, b) => `${a} ile ${b} arasındaki çizginin türü uygun değil. İpucu: burada sahiplik yok; sadece bilir/kullanır.`,
    gen: (a, b) => `${a} ile ${b} arasındaki çizginin türü uygun değil. İpucu: “${a}, bir ${b} türüdür.”`,
    real: (a, b) => `${a} ile ${b} arasındaki çizginin türü uygun değil. İpucu: ${b} bir arayüz; arayüze hangi çizgiyle bağlanılır?`
  };
  const DIR_HINT = {
    gen: 'Yön ters: kalıtım oku çocuktan ebeveyne çizilir (üçgen ebeveyn tarafında). Sağ panelde “⇄ Yönü çevir”.',
    real: 'Yön ters: üçgen arayüz tarafında olmalı. Sağ panelde “⇄ Yönü çevir”.',
    comp: 'Yön ters: elmas BÜTÜN tarafında olmalı. Sağ panelde “⇄ Yönü çevir”.',
    agg: 'Yön ters: elmas BÜTÜN tarafında olmalı. Sağ panelde “⇄ Yönü çevir”.',
    assoc: 'Yön ters: ok, bilinen (kullanılan) sınıfı göstermeli. Sağ panelde “⇄ Yönü çevir”.'
  };
  function needRel(an, bn, type, ma, mb, role) {
    const A = clsByName(an), B = clsByName(bn);
    if (!A || !B) return `Önce ${!A ? an : bn} sınıfını kur.`;
    const rs = M().rels.filter(r => (r.a === A.id && r.b === B.id) || (r.a === B.id && r.b === A.id));
    if (!rs.length) return `${an} ile ${bn} arasında henüz bir ilişki çizgisi yok.`;
    const r = rs.find(x => x.type === type) || rs[0];
    if (r.type !== type) return TYPE_HINT[type](an, bn);
    if (r.a !== A.id) return DIR_HINT[type];
    if (RTYPES[type].ends) {
      if (!multEq(r.ma, ma)) return `${an} ucundaki çokluk uygun değil. Sor: bir ${bn} nesnesi kaç ${an} ile bağlantılı?`;
      if (!multEq(r.mb, mb)) return `${bn} ucundaki çokluk uygun değil. Sor: bir ${an} nesnesinin kaç ${bn} nesnesi olur?`;
      if ((r.role || '').trim() !== role) return `Rol adı: çizginin ${bn} ucuna brifteki rol adını yaz.`;
    }
    return true;
  }
  function noAttrs(cn) { const c = clsByName(cn); return !c || !c.attrs.some(a => a.ok) ? true : `${cn} bir arayüz: özellik bölmesi boş kalmalı.`; }
  function customClass() {
    const K = clsByName('Karakter');
    if (!K) return null;
    return M().classes.find(c => c.name && !BRIEF_NAMES.includes(c.name) && c.kind === 'class' && isSub(c, K)) || null;
  }
  function needCustom() {
    const K = clsByName('Karakter');
    if (!K) return 'Önce Karakter sınıfı olmalı.';
    const cands = M().classes.filter(c => c.name && !BRIEF_NAMES.includes(c.name));
    if (!cands.length) return 'Brifte olmayan yeni bir sınıf kur (ör. Uykucu, Kantinci).';
    const c = cands.find(x => isSub(x, K));
    if (!c) return `${cands[0].name || 'Yeni sınıf'} henüz Karakter'den (doğrudan ya da dolaylı) türemiyor.`;
    if (c.kind !== 'class') return `${c.name} sınıfından nesne üretilecek; somut bir sınıf olmalı.`;
    if (!c.attrs.some(a => a.ok)) return `${c.name}: kendine özgü en az bir özellik yaz.`;
    const sal = c.meths.find(m => m.ok && m.name === 'saldir');
    if (!sal || sal.abstract) return `${c.name}: saldir() metodunu kendi tarzında yaz (somut).`;
    if (!c.meths.some(m => m.ok && m.name !== 'saldir' && m.name !== '__init__')) return `${c.name}: kendine özgü en az bir metot daha yaz.`;
    return true;
  }

  /* ---- kod testleri ve olaylar ---- */
  function tests(...ids) {
    if (!S.analysis && !Object.keys(S.tests).length) return 'Kodla sekmesinde kodunu ▶ Çalıştır; sonuç burada görünür.';
    for (const id of ids) {
      const r = S.tests[id];
      if (!r) return 'Kodunu ▶ Çalıştır.';
      if (!r[0]) return r[1];
    }
    return true;
  }
  const ev = (k, hint) => (S.events[k] ? true : hint);

  const MISSIONS = [
    // 1 · Soy Ağacı
    { id: 'd1', lv: 1, mode: 'd', text: '<b>Karakter</b> sınıfını kur ve türünü doğru seç.', ok: () => needClass('Karakter', 'abstract') },
    { id: 'd2', lv: 1, mode: 'd', text: 'Karakter\'in <b>3 özelliğini</b> erişim belirleyici ve tipleriyle yaz.', ok: () => all(() => needAttr('Karakter', 'ad', '+', 'str'), () => needAttr('Karakter', 'can', '-', 'int'), () => needAttr('Karakter', 'guc', '#', 'int')) },
    { id: 'd3', lv: 1, mode: 'd', text: 'Karakter\'in <b>4 metodunu</b> parametre ve dönüş tipleriyle yaz.', ok: () => all(() => needMeth('Karakter', 'get_can', { n: 0, ret: 'int' }), () => needMeth('Karakter', 'hasar_al', { n: 1, ptype: 'int' }), () => needMeth('Karakter', 'hayatta_mi', { n: 0, ret: 'bool' }), () => needMeth('Karakter', 'saldir', { n: 1, ptype: 'Karakter', abstract: true })) },
    { id: 'd4', lv: 1, mode: 'd', text: '<b>Savasci</b> ve <b>Canavar</b>\'ı kur, Karakter\'e doğru çizgiyle bağla; ikisi de saldir()\'ı kendisi yazsın.', ok: () => all(() => needClass('Savasci', 'class'), () => needClass('Canavar', 'class'), () => needRel('Savasci', 'Karakter', 'gen'), () => needRel('Canavar', 'Karakter', 'gen'), () => needMeth('Savasci', 'saldir', { n: 1, abstract: false }), () => needMeth('Canavar', 'saldir', { n: 1, abstract: false })) },
    { id: 'c1', lv: 1, mode: 'c', text: 'Karakter\'i Python\'a çevir: soyut sınıf, private can, protected guc ve 4 metot.', ok: () => tests('abstract', 'private', 'kmeth') },
    { id: 'c2', lv: 1, mode: 'c', text: 'Savasci ve Canavar\'ı kodla: saldırınca hedefin canı güçleri kadar azalsın.', ok: () => tests('savasci', 'canavar') },
    { id: 'c3', lv: 1, mode: 'c', text: '🧪 <b>Deney:</b> deneme alanında Karakter\'den doğrudan nesne üretmeyi dene ve çalıştır. Python ne diyor? (Sonra o satırı sil.)', ok: () => ev('abstractTry', 'Deneme alanına Karakter(...) ile nesne üreten bir satır yaz ve ▶ Çalıştır.') },
    // 2 · Sözleşme
    { id: 'd5', lv: 2, mode: 'd', text: '<b>Iyilestirebilir</b> arayüzünü kur ve tek metodunun imzasını yaz.', ok: () => all(() => needClass('Iyilestirebilir', 'interface'), () => needMeth('Iyilestirebilir', 'iyilestir', { n: 1, ptype: 'Karakter' }), () => noAttrs('Iyilestirebilir')) },
    { id: 'd6', lv: 2, mode: 'd', text: '<b>Sifaci</b>\'yı kur: bir Karakter olsun <i>ve</i> Iyilestirebilir sözleşmesini imzalasın; saldir() ve iyilestir() yazsın.', ok: () => all(() => needClass('Sifaci', 'class'), () => needRel('Sifaci', 'Karakter', 'gen'), () => needRel('Sifaci', 'Iyilestirebilir', 'real'), () => needMeth('Sifaci', 'saldir', { n: 1, abstract: false }), () => needMeth('Sifaci', 'iyilestir', { n: 1, abstract: false })) },
    { id: 'd7', lv: 2, mode: 'd', text: '<b>Iksir</b>\'i kur (ad, miktar, iyilestir); arayüzü gerçekleştirsin ama Karakter <u>olmasın</u>.', ok: () => all(() => needClass('Iksir', 'class'), () => needAttr('Iksir', 'ad', '+', 'str'), () => needAttr('Iksir', 'miktar', '+', 'int'), () => needMeth('Iksir', 'iyilestir', { n: 1, abstract: false }), () => needRel('Iksir', 'Iyilestirebilir', 'real'), () => (isSub(clsByName('Iksir'), clsByName('Karakter')) ? 'Iksir bir Karakter mi? Saldırabilir mi? 😄 Iksir ile Karakter arasındaki kalıtımı kaldır.' : true)) },
    { id: 'd8', lv: 2, mode: 'd', text: 'Karakter\'e <b>can_kazan(miktar: int)</b> ekle: private cana açılan kapı.', ok: () => needMeth('Karakter', 'can_kazan', { n: 1, ptype: 'int' }) },
    { id: 'c4', lv: 2, mode: 'c', text: 'Iyilestirebilir arayüzünü, Iksir\'i ve can_kazan()\'ı kodla.', ok: () => tests('arayuz', 'iksir', 'cankazan') },
    { id: 'c5', lv: 2, mode: 'c', text: 'Sifaci\'yı kodla (iki ebeveyni var!).', ok: () => tests('sifaci') },
    { id: 'c6', lv: 2, mode: 'c', text: '🧪 Konsolun <b>&gt;&gt;&gt;</b> satırına yaz: <code>isinstance(Iksir("Çay", 20), Karakter)</code> Sonuç neden böyle?', ok: () => ev('isinst', 'Kodla sekmesinde konsolun altındaki >>> satırına yaz, Enter.') },
    // 3 · Bağlar
    { id: 'd9', lv: 3, mode: 'd', text: '<b>Envanter</b>\'i iki metoduyla kur; Karakter ile arasındaki ilişkiyi çiz (tür, yön, iki uçta çokluk, rol adı).', ok: () => all(() => needClass('Envanter', 'class'), () => needMeth('Envanter', 'iksir_ekle', { n: 1, ptype: 'Iksir' }), () => needMeth('Envanter', 'iksir_al', { n: 0, ret: 'Iksir' }), () => needRel('Karakter', 'Envanter', 'comp', '1', '1', 'envanter')) },
    { id: 'd10', lv: 3, mode: 'd', text: '<b>Envanter</b> ile <b>Iksir</b> arasındaki ilişkiyi çiz.', ok: () => needRel('Envanter', 'Iksir', 'agg', '0..1', '*', 'iksirler') },
    { id: 'd11', lv: 3, mode: 'd', text: '<b>Silah</b>\'ı kur, Karakter ile ilişkisini çiz; Karakter\'e silah_kusan() ekle.', ok: () => all(() => needClass('Silah', 'class'), () => needAttr('Silah', 'ad', '+', 'str'), () => needAttr('Silah', 'hasar', '+', 'int'), () => needRel('Karakter', 'Silah', 'assoc', '0..1', '0..1', 'silah'), () => needMeth('Karakter', 'silah_kusan', { n: 1, ptype: 'Silah' })) },
    { id: 'q1', lv: 3, mode: 'q', text: '🕵️ <b>İlişki Dedektifi</b>: 10 sorudan en az 8 doğru.', ok: () => (S.quizBest >= 8 ? true : `En iyi skorun: ${S.quizBest}/10`) },
    { id: 'c7', lv: 3, mode: 'c', text: 'Envanter\'i kodla; her karakter kendi envanteriyle doğsun.', ok: () => tests('envanter') },
    { id: 'c8', lv: 3, mode: 'c', text: 'Silah\'ı ve silah_kusan()\'ı kodla; Savaşçı silahın hasarını da eklesin.', ok: () => tests('silah') },
    // 4 · Lonca
    { id: 'd12', lv: 4, mode: 'd', text: '<b>Lonca</b>\'yı kur (ad, uye_ekle) ve Karakter ile ilişkisini çiz.', ok: () => all(() => needClass('Lonca', 'class'), () => needAttr('Lonca', 'ad', '+', 'str'), () => needMeth('Lonca', 'uye_ekle', { n: 1, ptype: 'Karakter', ret: 'bool' }), () => needRel('Lonca', 'Karakter', 'agg', '0..1', '1..4', 'uyeler')) },
    { id: 'c9', lv: 4, mode: 'c', text: 'Lonca\'yı kodla: 4 üye sınırını kod korusun.', ok: () => tests('lonca') },
    { id: 'c10', lv: 4, mode: 'c', text: 'Deneme alanında loncanı kur (en az 3 üye, şifacı, silah, iksir; kurallara uygun).', ok: () => tests('kurulum') },
    { id: 'a1', lv: 4, mode: 'a', text: '⚔️ Arenada <b>1. katı</b> geç: Yoklama Hayaleti ve Sürpriz Quiz Goblini.', ok: () => (S.wins[1] ? true : 'Savaş sekmesinde 1. katı seç, ⚔️ Savaşı başlat.') },
    { id: 'a2', lv: 4, mode: 'a', text: '⚔️ <b>2. kat</b>: Deadline Golemi\'ni yen.', ok: () => (S.wins[2] ? true : 'Golem her 4 turda bir “deadline uzatıp” iyileşiyor.') },
    // 5 · Ejderha
    { id: 'd13', lv: 5, mode: 'd', text: 'Kendi kahraman sınıfını UML\'de <b>icat et</b>.', ok: () => needCustom() },
    { id: 'c11', lv: 5, mode: 'c', text: 'Yeni sınıfını kodla ve loncana kat.', ok: () => tests('ozel') },
    { id: 'c12', lv: 5, mode: 'c', text: 'UML ↔ Kod uyumu <b>%100</b> olsun (en az 10 sınıf).', ok: () => { const c = conformance(); if (!c.ready) return 'Kodunu ▶ Çalıştır.'; if (M().classes.length < 10) return 'Diyagramda en az 10 sınıf olmalı.'; return c.ok === c.total ? true : `Uyum: ${c.ok}/${c.total}. Kodla → UML ↔ Kod panelindeki kırmızıları düzelt.`; } },
    { id: 'a3', lv: 5, mode: 'a', text: '⚔️ <b>Bütünleme Ejderhası</b>\'nı yen! 🐉', ok: () => (S.wins[3] ? true : 'Taktik: 4 üye, şifacı, iksirler ve kendi sınıfın.') },
    { id: 'p1', lv: 5, mode: 'p', text: '📄 Hepsi bitti mi? Diyagramının ve ilerleme raporunun <b>PDF</b>\'ini al.', ok: () => ev('pdf', pdfLeft() ? 'Tüm görevleri bitirince üst çubuktaki 🔒 PDF düğmesinin kilidi açılır.' : 'Üst çubuktaki 📄 PDF düğmesi.') }
  ];
  const MODE_ICON = { d: '📐', c: '⌨️', a: '⚔️', q: '🕵️', p: '📄' };

  /* =====================================================================
     UML ↔ KOD UYUMU (AST analizine göre)
     ===================================================================== */
  const pyName = (vis, n) => (VIS[vis] ? VIS[vis].py : '') + n;
  function conformance() {
    const key = VER + '|' + (S.analysisV || 0);
    if (T.conf && T.confKey === key) return T.conf;
    const A = S.analysis, mdl = M();
    const out = { byClass: {}, extra: [], ok: 0, total: 0, ready: !!A };
    T.conf = out; T.confKey = key;
    if (!A) return out;
    const CC = A.classes || {};
    const codeAnc = name => {
      const seen = new Set(), st = [name];
      while (st.length) { const c = CC[st.pop()]; if (!c) continue; c.bases.forEach(b => { if (!seen.has(b)) { seen.add(b); st.push(b); } }); }
      return seen;
    };
    const findAttr = (cn, an) => { for (const n of [cn, ...codeAnc(cn)]) { const c = CC[n]; if (c && c.attrs[an]) return { cls: n, a: c.attrs[an] }; } return null; };
    mdl.classes.forEach(uc => {
      if (!uc.name) return;
      const items = [], add = (ok, label, msg, line) => items.push({ ok, label, msg, line });
      const cc = CC[uc.name];
      if (!cc) add(false, `class ${uc.name}`, `Kodda ${uc.name} sınıfı yok.`, null);
      else {
        add(true, `class ${uc.name}`, '', cc.line);
        mdl.rels.filter(r => r.a === uc.id && (r.type === 'gen' || r.type === 'real')).forEach(r => {
          const p = mdl.byId[r.b]; if (!p.name) return;
          const ok = cc.bases.includes(p.name);
          add(ok, `${relSym(r.type)} ${p.name}`, ok ? '' : `UML'de ${uc.name}, ${p.name} ${r.type === 'gen' ? 'sınıfından türüyor' : 'arayüzünü gerçekleştiriyor'}; kodda class satırının parantezinde ${p.name} yok.`, cc.line);
        });
        if (uc.kind !== 'class') {
          const abc = codeAnc(uc.name).has('ABC');
          const absM = Object.values(cc.methods).some(m => m.abstract);
          add(abc && absM, `«${KIND[uc.kind].stereo}»`, abc && absM ? '' : !abc ? `${uc.name} soyut olmalı: ABC'den türemeli.` : `${uc.name} içinde @abstractmethod ile işaretli metot yok.`, cc.line);
          if (uc.kind === 'interface') { const at = Object.keys(cc.attrs); if (at.length) add(false, 'özellik yok', `Arayüzde özellik olmaz ama kodda self.${at[0]} var.`, cc.attrs[at[0]].line); }
        } else {
          const am = Object.keys(cc.methods).filter(n => cc.methods[n].abstract);
          if (am.length) add(false, 'somut sınıf', `UML'de ${uc.name} somut ama kodda @abstractmethod var: ${am.join(', ')}`, cc.methods[am[0]].line);
        }
        uc.attrs.forEach(a => {
          if (!a.ok) return;
          const want = pyName(a.vis, a.name), label = `${symOf(a.vis)} ${a.name}: ${a.type}`;
          const f = findAttr(uc.name, want);
          if (f) { add(true, label, f.cls !== uc.name ? `${f.cls} sınıfından miras` : '', f.a.line); return; }
          const alt = ['', '_', '__'].map(p => p + a.name).find(n => findAttr(uc.name, n));
          if (alt) { add(false, label, `Erişim tutmuyor: UML'de ${VIS[a.vis].name} (${symOf(a.vis)}) ama kodda self.${alt} yazılmış.`, findAttr(uc.name, alt).a.line); return; }
          add(false, label, `Kodda self.${want} bulunamadı (genelde __init__ içinde atanır).`, cc.line);
        });
        uc.meths.forEach(m => {
          if (!m.ok) return;
          const want = m.name === '__init__' ? '__init__' : pyName(m.vis, m.name);
          const label = `${symOf(m.vis)} ${m.name}(${m.params.map(p => p.name).join(', ')})`;
          let cm = cc.methods[want], owner = uc.name;
          if (!cm) for (const n of codeAnc(uc.name)) if (CC[n] && CC[n].methods[want]) { cm = CC[n].methods[want]; owner = n; break; }
          if (!cm) {
            const alt = ['', '_', '__'].map(p => p + m.name).find(n => cc.methods[n]);
            add(false, label, alt ? `Erişim tutmuyor: UML'de ${VIS[m.vis].name} ama kodda def ${alt}.` : `Kodda def ${want}(self…) yok.`, alt ? cc.methods[alt].line : cc.line);
            return;
          }
          if (!cm.self) return add(false, label, `def ${want} metodunun ilk parametresi self olmalı.`, cm.line);
          if (cm.params.length !== m.params.length) return add(false, label, `Parametre sayısı tutmuyor: UML'de ${m.params.length}, kodda ${cm.params.length} (self hariç).`, cm.line);
          if (m.abstract && !cm.abstract) return add(false, label, 'UML\'de soyut ({abstract}) ama kodda @abstractmethod yok.', cm.line);
          if (!m.abstract && cm.abstract) return add(false, label, 'UML\'de dolu metot ama kodda @abstractmethod ile işaretli.', cm.line);
          if (owner !== uc.name) return add(false, label, `UML'de ${uc.name} bu metodu kendisi yazıyor (override) ama kodda sadece ${owner} içinde var.`, cc.line);
          if (!m.abstract && cm.trivial) return add(false, label, 'Gövdesi boş (sadece pass). Brife göre doldur.', cm.line);
          add(true, label, '', cm.line);
        });
        mdl.rels.filter(r => r.a === uc.id && RTYPES[r.type].ends && r.role && r.role.trim()).forEach(r => {
          const B = mdl.byId[r.b], role = r.role.trim();
          const many = multMany(r.mb), mb = normMult(r.mb);
          const label = `${relSym(r.type)} ${role}: ${B.name}${many ? '[' + (r.mb || '*') + ']' : ''}`;
          const f = findAttr(uc.name, role);
          if (!f) return add(false, label, `İlişkinin rol adı kodda ${uc.name} nesnesinin bir özelliği olmalı: self.${role}`, cc.line);
          const v = f.a.val;
          if (many && v !== 'list') return add(false, label, `${B.name} ucu “${r.mb}” (çok) → self.${role} bir liste olarak başlamalı.`, f.a.line);
          if (!many && v === 'list') return add(false, label, `${B.name} ucu “${r.mb || '?'}” (tek) ama kodda liste kullanılmış.`, f.a.line);
          if (r.type === 'comp' && !many && v !== 'new:' + B.name) return add(false, label, `Bileşim: ${B.name} parçası ${uc.name} nesnesinin içinde doğmalı (dışarıdan gelmemeli).`, f.a.line);
          if (mb === '0..1' && v !== 'none') return add(false, label, `${B.name} ucu 0..1: başlangıçta olmayabilir → None ile başlamalı.`, f.a.line);
          add(true, label, f.cls !== uc.name ? `${f.cls} sınıfından miras` : '', f.a.line);
        });
      }
      const ok = items.filter(i => i.ok).length;
      out.byClass[uc.id] = { id: uc.id, name: uc.name, items, ok, total: items.length, line: cc ? cc.line : null, end: cc ? cc.end : null };
      out.ok += ok; out.total += items.length;
    });
    const umlNames = new Set(mdl.classes.map(c => c.name));
    out.extra = Object.keys(CC).filter(n => !umlNames.has(n));
    return out;
  }
  /* =====================================================================
     İSKELET
     ===================================================================== */
  function relIcon(t, cls) {
    const line = `<line x1="${t === 'agg' || t === 'comp' ? 24 : 3}" y1="9" x2="${t === 'gen' || t === 'real' ? 43 : 58}" y2="9" stroke="currentColor" stroke-width="2"${t === 'real' ? ' stroke-dasharray="5 4"' : ''}/>`;
    let s = '';
    if (t === 'agg' || t === 'comp') s += `<path d="M3 9 L13.5 3.5 L24 9 L13.5 14.5 Z" fill="${t === 'comp' ? 'currentColor' : '#fff'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`;
    if (t === 'gen' || t === 'real') s += `<path d="M59 9 L43 2 L43 16 Z" fill="#fff" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`;
    if (t === 'assoc') s += `<path d="M47 3 L59 9 L47 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`;
    return `<svg class="w5-ricon ${cls || ''}" viewBox="0 0 62 18" width="62" height="18" aria-hidden="true">${line}${s}</svg>`;
  }

  function shellHTML() {
    return `
    <header class="w5-top">
      <button class="btn" data-act="home">← Haftalar</button>
      <div class="w5-brand"><span class="w5-logo" aria-hidden="true">${miniDragon()}</span><div><small>5. Hafta · İlişkiler, Kalıtım, Arayüz</small><b>Vize Zindanı</b></div></div>
      <nav class="w5-modes" id="w5-modes" aria-label="Aşamalar"></nav>
      <div class="w5-xp" id="w5-xp"></div>
      <div class="w5-tact">
        <button class="btn" data-act="pdf" id="w5-pdf">📄 PDF</button>
        <div class="w5-menu">
          <button class="btn" data-act="menu" aria-haspopup="true" title="Diğer">☰</button>
          <div class="w5-menu-pop" id="w5-menu" hidden>
            <button data-act="guide">🤔 Kavram Rehberi</button>
            <button data-act="quiz">🕵️ İlişki Dedektifi</button>
            <button data-act="help">❓ Nasıl oynanır?</button>
            <hr>
            <button data-act="teacher" id="w5-tbtn" hidden>👩‍🏫 Öğretmen</button>
            <button data-act="reset" class="danger">↺ Her şeyi sıfırla</button>
          </div>
        </div>
      </div>
    </header>
    <div class="w5-body ${S.journal ? '' : 'j-off'}" id="w5-body">
      <aside class="w5-journal" id="w5-journal" aria-label="Görev defteri"></aside>
      <button class="w5-jtab" data-act="journal" id="w5-jt" title="Görev defterini aç/kapat"></button>
      <main class="w5-area">
        <section class="w5-view w5-design" id="w5-v-design" hidden>${designShell()}</section>
        <section class="w5-view w5-code" id="w5-v-code" hidden>${codeShell()}</section>
        <section class="w5-view w5-arena" id="w5-v-arena" hidden>${arenaShell()}</section>
      </main>
    </div>`;
  }

  function renderAll() {
    renderTop(); renderJournal(); renderMode();
  }

  function rankOf(xp) { let r = RANKS[0]; RANKS.forEach(x => { if (xp >= x[0]) r = x; }); return r; }
  function renderTop() {
    const modes = [['design', '1', 'Tasarla', 'UML'], ['code', '2', 'Kodla', 'Python'], ['arena', '3', 'Savaş', 'Arena']];
    $('#w5-modes').innerHTML = modes.map(([k, n, t, s], i) => {
      const locked = k === 'arena' && S.maxLevel < 4;
      return `${i ? '<span class="w5-marrow" aria-hidden="true">›</span>' : ''}<button class="w5-mode ${S.mode === k ? 'on' : ''} ${locked ? 'locked' : ''}" data-act="mode" data-m="${k}" ${S.mode === k ? 'aria-current="page"' : ''}>
        <i>${locked ? '🔒' : n}</i><span><b>${t}</b><small>${locked ? '4. seviyede' : s}</small></span></button>`;
    }).join('');
    const xp = Object.keys(S.done).length * 10, max = MISSIONS.length * 10, r = rankOf(xp);
    const next = RANKS.find(x => x[0] > xp);
    $('#w5-xp').innerHTML = `<div class="w5-xpr"><b>${r[1]}</b><small>${xp} / ${max} XP</small></div>
      <div class="w5-xpbar" title="${next ? `${next[1]} için ${next[0] - xp} XP` : 'Zirvedesin!'}"><i style="width:${(xp / max) * 100}%"></i></div>`;
    $('#w5-jt').innerHTML = S.journal ? '‹' : '📜<span>Görevler</span>';
    $('#w5-body').classList.toggle('j-off', !S.journal);
    const left = pdfLeft(), pb = $('#w5-pdf');
    pb.classList.toggle('w5-locked', left > 0);
    pb.innerHTML = left > 0 ? '🔒 PDF' : '📄 PDF';
    pb.title = left > 0 ? `PDF tüm görevler bitince açılır (${left} görev kaldı)` : 'UML diyagramını ve ilerleme raporunu PDF olarak indir';
  }
  // PDF görevi hariç bitmemiş görev sayısı
  const pdfLeft = () => MISSIONS.filter(m => m.id !== 'p1' && !S.done[m.id]).length;

  function renderJournal() {
    const lvN = S.jlv && S.jlv <= S.maxLevel ? S.jlv : S.maxLevel;
    const L = LEVELS[lvN - 1];
    const pills = LEVELS.map(x => {
      const ms = MISSIONS.filter(m => m.lv === x.n), d = ms.filter(m => S.done[m.id]).length;
      const st = x.n > S.maxLevel ? 'lock' : d === ms.length ? 'done' : 'open';
      return `<button class="w5-lvp ${st} ${x.n === lvN ? 'on' : ''}" data-act="jlv" data-lv="${x.n}" title="${x.n}. ${x.title} · ${x.topic}" ${st === 'lock' ? 'aria-disabled="true"' : ''}>
        <span>${st === 'lock' ? '🔒' : st === 'done' ? '✓' : x.icon}</span><small>${x.n}</small></button>`;
    }).join('');
    const ms = MISSIONS.filter(m => m.lv === lvN);
    const d = ms.filter(m => S.done[m.id]).length;
    $('#w5-journal').innerHTML = `
      <div class="w5-lvps">${pills}</div>
      <div class="w5-jhead"><span class="w5-jn">${L.icon}</span><div><small>${lvN}. Seviye · ${L.topic}</small><h2>${L.title}</h2></div><span class="w5-jc">${d}/${ms.length}</span></div>
      <div class="w5-jscroll">
        <details class="w5-letter" ${S.letterClosed && S.letterClosed[lvN] ? '' : 'open'} data-lv="${lvN}"><summary>📜 Brif: Zindan Bekçisi'nin mektubu</summary><div class="w5-letter-b">${L.brief}</div></details>
        <div class="w5-concept"><b>💡 Kavram</b><div>${L.concept}</div></div>
        <ul class="w5-ms">${ms.map(m => {
          const ok = !!S.done[m.id], h = !ok && T.hints[m.id];
          return `<li class="${ok ? 'ok' : ''} ${T.flash === m.id ? 'flash' : ''}">
            <span class="w5-ck">${ok ? '✓' : MODE_ICON[m.mode]}</span>
            <div><span class="tx">${m.text}</span>${h && typeof h === 'string' ? `<span class="w5-hint">${esc(h)}</span>` : ''}</div></li>`;
        }).join('')}</ul>
      </div>
      <div class="w5-jfoot"><button class="btn" data-act="guide">🤔 Kafam karıştı</button><button class="btn" data-act="quiz">🕵️ İlişki Dedektifi</button></div>`;
    T.flash = null;
  }

  function renderMode() {
    if (S.mode === 'arena' && S.maxLevel < 4) S.mode = 'design';
    ['design', 'code', 'arena'].forEach(k => { $('#w5-v-' + k).hidden = S.mode !== k; });
    root.dataset.mode = S.mode;
    if (S.mode === 'design') renderDesign();
    else if (S.mode === 'code') renderCode();
    else renderArena();
  }
  function setMode(m) {
    if (m === 'arena' && S.maxLevel < 4) { toast('⚔️ Arena 4. seviyede açılır. Önce lonca kurulmalı!', 'info'); return; }
    if (S.mode === m) return;
    if (S.mode === 'arena') stopBattle();
    S.mode = m; save();
    renderTop(); renderMode();
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
        if (r === true) { S.done[m.id] = true; S.doneAt[m.id] = Date.now(); newly.push(m); changed = true; T.flash = m.id; delete T.hints[m.id]; }
        else T.hints[m.id] = r;
      });
      if (S.maxLevel < 5 && MISSIONS.filter(m => m.lv === S.maxLevel).every(m => S.done[m.id])) {
        S.maxLevel++; S.levelAt[S.maxLevel] = Date.now(); S.jlv = null; changed = true; lvUp = S.maxLevel; continue;
      }
      break;
    }
    if (!quiet) newly.forEach(m => { const t = strip(m.text); toast('⭐ +10 XP · ' + (t.length > 72 ? t.slice(0, 70) + '…' : t), 'star'); });
    if (!S.finished && MISSIONS.every(m => S.done[m.id])) { S.finished = true; changed = true; if (!quiet) setTimeout(finale, 900); }
    if (changed) { saveNow(); renderTop(); }
    renderJournal();
    if (lvUp && !quiet) setTimeout(() => levelUp(LEVELS[lvUp - 1]), newly.length ? 500 : 0);
  }
  function levelUp(L) {
    confetti();
    const extra = L.n === 4 ? '<p>⚔️ <b>Savaş</b> aşaması açıldı! Loncanı kurunca arenaya girebilirsin.</p>' : '';
    modal(`<div class="w5-lvup-art">${L.icon}</div><span class="tag">Seviye ${L.n} açıldı</span><h3>${L.title}</h3><p class="w5-lvup-topic">${L.topic}</p><div class="w5-lvup-c">${L.concept}</div>${extra}<p>Görev defterinde yeni mektup seni bekliyor. 📜</p>`,
      [{ label: 'Mektubu oku', cls: 'w5-go', fn: () => { S.journal = true; S.jlv = null; save(); renderTop(); renderJournal(); } }]);
  }
  function finale() {
    confetti(); setTimeout(confetti, 700);
    modal(`<div class="w5-lvup-art">${miniDragon(120)}</div><span class="tag">${MISSIONS.length} / ${MISSIONS.length} görev</span><h3>Bütünlemeye kalmadın! 🎓</h3>
      <p>Soyut sınıf, arayüz, kalıtım, bileşim, toplama ve çokluklarla koca bir oyun tasarladın; sonra onu <b>kendin kodladın</b>. Üstelik oyun motoru senin sınıflarını hiç tanımadan çalıştırdı.</p>
      <p>Tasarımının PDF'ini aldığından emin ol. Gelecek hafta bu loncayla devam edeceğiz. 😉</p>`, [{ label: 'Harika!', cls: 'w5-go' }]);
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
    card.className = 'modal-card ' + (cls || 'w5m');
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
    const cols = ['#6C4CE0', '#F2B33D', '#14966E', '#FF6A3D', '#3D8BFF', '#FF6FB5'];
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
     KAVRAM REHBERİ ve YARDIM
     ===================================================================== */
  function guide() {
    modal(`<h3>🤔 Kavram Rehberi</h3>
      <p class="w5-sub">Kafan karıştığında buraya dön. Zindandan örneklerle.</p>
      <h4>Üç tür kutu</h4>
      <div class="w5-tbl"><table>
        <tr><th></th><th>Sınıf</th><th>Soyut sınıf</th><th>Arayüz</th></tr>
        <tr><th>Hangi soru?</th><td>Bu nedir?</td><td>Bu ailenin ortak noktası ne?</td><td>Bu ne <b>yapabilir</b>?</td></tr>
        <tr><th>İçinde</th><td>özellikler + dolu metotlar</td><td>özellikler + dolu metotlar + <i>soyut</i> metotlar</td><td>sadece metot imzaları</td></tr>
        <tr><th>Nesne üretilir mi?</th><td>✅</td><td>❌ (alt sınıflardan)</td><td>❌</td></tr>
        <tr><th>UML</th><td>düz başlık</td><td>«abstract», <i>italik</i></td><td>«interface»</td></tr>
        <tr><th>Python</th><td><code>class Savasci(Karakter):</code></td><td><code>class Karakter(ABC):</code> + <code>@abstractmethod</code></td><td>sadece soyut metotlu <code>ABC</code></td></tr>
        <tr><th>Zindanda</th><td>Savasci, Iksir, Lonca</td><td>Karakter</td><td>Iyilestirebilir</td></tr>
      </table></div>
      <h4>Beş çizgi</h4>
      <div class="w5-rels">
        ${RT_ORDER.map(t => `<div>${relIcon(t)}<b>${RTYPES[t].name}</b><span>${RTYPES[t].short}</span><em>${({ assoc: 'Karakter → Silah: karakter silahını bilir', agg: 'Lonca ◇ Karakter: üye loncadan ayrılsa da yaşar', comp: 'Karakter ◆ Envanter: envanter karakterle doğar, onunla ölür', gen: 'Savasci ──▷ Karakter: savaşçı bir karakterdir', real: 'Iksir ┄▷ Iyilestirebilir: iksir iyileştirebilir' })[t]}</em></div>`).join('')}
      </div>
      <h4>Sık karışanlar</h4>
      <ul class="w5-faq">
        <li><b>Soyut sınıf mı, arayüz mü?</b> Ortak <i>özellik ve kod</i> paylaşılacaksa soyut sınıf. Sadece bir <i>yetenek</i> sözü veriliyorsa (ve akraba olmayan sınıflar da o yeteneğe sahip olabiliyorsa) arayüz.</li>
        <li><b>Kalıtım mı, ilişki mi?</b> “A bir B'dir” diyebiliyor musun? Savaşçı bir Karakterdir ✅ → kalıtım. Savaşçı bir Silahtır ❌ → silahı <i>vardır</i> → ilişki.</li>
        <li><b>Toplama mı, bileşim mi?</b> Bütün silinince parça da silinmeli mi? Evet → bileşim ◆. Hayır, parça yaşamaya devam eder → toplama ◇.</li>
        <li><b>Çokluk hangi uca yazılır?</b> Kendi ucuna! Envanter ucundaki <code>1</code> “her karakterin <i>1 envanteri</i> var” demek. Okurken karşı taraftan başla: “bir Karakter'in kaç Envanter'i var?” → cevap Envanter ucuna.</li>
        <li><b>Kodda ne olur?</b> <code>1</code> → tek nesne · <code>0..1</code> → nesne ya da <code>None</code> · <code>*</code>, <code>1..*</code>, <code>1..4</code> → liste. Bileşimde parça <code>__init__</code> içinde üretilir.</li>
        <li><b>+ # − kodda?</b> <code>+ ad</code> → <code>self.ad</code> · <code># guc</code> → <code>self._guc</code> · <code>− can</code> → <code>self.__can</code></li>
      </ul>`, [{ label: 'Anladım', cls: 'w5-go' }], 'w5m wide');
  }
  function help() {
    modal(`<h3>⚔️ Vize Zindanı'na hoş geldin!</h3>
      <p>Bu hafta üç aşamada bir oyun yapacaksın. Görevler soldaki <b>📜 Görev Defteri</b>'nde; asıl tarif <b>mektup</b>ta (brif).</p>
      <ol class="w5-steps">
        <li><b>📐 Tasarla</b> — UML'yi <i>yazarak</i> çiz. Sol araç çubuğundan kutu türünü seç, tuvale tıkla. Kutudaki satırlara UML biçiminde yaz:<br>
          <code>+ ad: str</code> · <code>− can: int</code> · <code># guc: int</code><br>
          <code>+ saldir(hedef: Karakter): None {abstract}</code><br>
          <kbd>Enter</kbd> yeni satır, boş satırda <kbd>⌫</kbd> satırı siler. İlişki için <b>🔗 Bağla</b> aracıyla bir kutudan diğerine sürükle, sonra sağ panelden türünü, yönünü ve çokluklarını seç.</li>
        <li><b>⌨️ Kodla</b> — Python'u <i>sen</i> yazarsın. <kbd>Ctrl</kbd>+<kbd>Enter</kbd> çalıştırır. Sağdaki <b>UML ↔ Kod</b> paneli diyagramındaki her satırın kodda karşılığı var mı gösterir. Kod Kartları başka konulardan örnekler verir.</li>
        <li><b>⚔️ Savaş</b> — 4. seviyede açılır. Kodundaki lonca, sınav canavarlarıyla savaşır. Senin <code>print</code>'lerin konuşma balonu olur!</li>
      </ol>
      <p class="w5-sub">⚠️ Sayfayı yenilersen kaldığın yerden devam edersin, ama <b>uygulamayı kapatırsan her şey silinir</b>. Dersi tek oturumda bitir. Tüm görevler bitince <b>📄 PDF</b> açılır; PDF'te her görevi hangi tarih ve saatte tamamladığın yazar. Bu PDF'i öğretmenine teslim edeceksin.</p>`,
    [{ label: 'Başlayalım!', cls: 'w5-go', fn: () => { if (!S.intro) { S.intro = true; save(); } } }], 'w5m wide');
  }

  /* =====================================================================
     İLİŞKİ DEDEKTİFİ (quiz)
     ===================================================================== */
  function quiz() {
    const qs = shuffle(shuffle(QUIZ_T).slice(0, 7).map(q => ({ k: 't', q: q[0], a: q[1], why: q[2] }))
      .concat(shuffle(QUIZ_M).slice(0, 3).map(q => ({ k: 'm', q: q[0], a: q[1], why: q[2] }))));
    const Q = { qs, i: 0, score: 0, picked: null };
    const draw = () => {
      if (Q.i >= Q.qs.length) {
        const best = Math.max(S.quizBest, Q.score), rec = Q.score > S.quizBest;
        S.quizBest = best; save(); evaluate();
        const msg = Q.score >= 9 ? 'UML dedektifi olmuşsun! 🕵️' : Q.score >= 8 ? 'Görev tamam! 🎯' : Q.score >= 6 ? 'Az kaldı, bir daha dene!' : 'Kavram Rehberi\'ne bir göz at, sonra tekrar dene.';
        if (Q.score >= 8) confetti();
        return modal(`<div class="w5-qend"><div class="w5-qscore">${Q.score}<small>/10</small></div><h3>${msg}</h3><p>${rec ? 'Yeni rekor!' : 'En iyi skorun: ' + best + '/10'}</p></div>`,
          [{ label: 'Kapat' }, { label: 'Tekrar oyna', cls: 'w5-go', fn: quiz }], 'w5m');
      }
      const q = Q.qs[Q.i], P = Q.picked;
      const opts = q.k === 't' ? RT_ORDER : ['1', '0..1', '0..*', '1..*'].concat(/^\d+$/.test(q.a) && q.a !== '1' ? [q.a] : []);
      const card = modal(`<div class="w5-qtop"><span>🕵️ İlişki Dedektifi</span><span>Soru ${Q.i + 1}/10 · ✓ ${Q.score}</span></div>
        <div class="w5-qbar"><i style="width:${Q.i * 10}%"></i></div>
        <p class="w5-qask">${q.k === 't' ? 'Bu cümle hangi ilişki?' : 'Hangi çokluk yazılır?'}</p>
        <blockquote class="w5-qq">${esc(q.q)}</blockquote>
        <div class="w5-qopts ${q.k}">${opts.map(o => {
          const st = P == null ? '' : o === q.a ? 'right' : o === P ? 'wrong' : 'dim';
          return `<button class="w5-qo ${st}" data-qo="${o}" ${P != null ? 'disabled' : ''}>${q.k === 't' ? relIcon(o) + `<b>${RTYPES[o].name}</b>` : `<b class="mono">${o}</b>`}</button>`;
        }).join('')}</div>
        ${P != null ? `<div class="w5-qwhy ${P === q.a ? 'ok' : 'no'}">${P === q.a ? '✓ Doğru!' : '✗ Olmadı.'} ${esc(q.why)}</div>` : ''}`,
      P != null ? [{ label: Q.i === 9 ? 'Sonucu gör' : 'Sonraki →', cls: 'w5-go', keep: true, fn: () => { Q.i++; Q.picked = null; draw(); } }] : [{ label: 'Bırak' }], 'w5m quiz');
      card._extra = e => {
        const b = e.target.closest('[data-qo]'); if (!b || Q.picked != null) return;
        Q.picked = b.dataset.qo; if (Q.picked === q.a) Q.score++;
        draw();
      };
    };
    draw();
  }

  /* =====================================================================
     ÖĞRETMEN, DOSYA, SIFIRLAMA, PDF
     ===================================================================== */
  // Öğretmen paneli ve örnek çözüm ayrı bir dosyada (ogretmen.js); öğrenci kopyasında bu dosya yok.
  const OGR = () => window.NYP_OGRETMEN || null;
  function example() {
    const o = OGR();
    try { return o && o.hafta5 ? JSON.parse(decodeURIComponent(escape(atob(o.hafta5)))) : null; } catch (_) { return null; }
  }
  function teacher() {
    if (!T.teacherOk) {
      const card = modal(`<h3>👩‍🏫 Öğretmen</h3><p>Bu panel ders anlatımı içindir. Öğretmen kodunu gir.</p>
        <input type="password" id="w5-pin" class="w5-in" autocomplete="off" placeholder="öğretmen kodu">`,
      [{ label: 'Vazgeç' }, { label: 'Giriş', cls: 'w5-go', keep: true, fn: () => {
        if (OGR() && $('#w5-pin').value.trim() === OGR().pin) { T.teacherOk = true; S.teacherUsed = true; saveNow(); teacher(); }
        else { $('#w5-pin').value = ''; $('#w5-pin').classList.add('bad'); toast('Kod yanlış.', 'bad'); }
      } }]);
      const i = $('#w5-pin', card); i.focus();
      i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); card.querySelector('.row .btn:last-child').click(); } });
      return;
    }
    modal(`<h3>👩‍🏫 Öğretmen paneli</h3><p>Derste göstermek için kısayollar. Öğrenciler kendi bilgisayarında sıfırdan başlar; her tarayıcı kendi çalışmasını saklar.</p>
      <ul><li><b>Tüm seviyeleri aç</b>: çalışma korunur.</li><li><b>Örnek UML</b>: 10 sınıflık çözüm diyagramını yükler (mevcut diyagram silinir).</li><li><b>Örnek kod</b>: çözüm Python kodunu yükler (mevcut kod silinir).</li><li><b>Arena katlarını aç</b>: üç katın hepsini seçilebilir yapar.</li></ul>`,
    [{ label: 'Kapat' },
      { label: 'Tüm seviyeleri aç', fn: () => { S.maxLevel = 5; saveNow(); evaluate(true); renderAll(); toast('Tüm seviyeler açıldı.', 'good'); } },
      { label: 'Arena katlarını aç', fn: () => { S.wins[1] = S.wins[1] || 'ogretmen'; S.wins[2] = S.wins[2] || 'ogretmen'; S.maxLevel = Math.max(S.maxLevel, 4); saveNow(); evaluate(true); renderAll(); toast('Arena katları açıldı.', 'good'); } },
      { label: 'Örnek UML', fn: () => { const x = example(); if (!x || !x.uml) return toast('Örnek bulunamadı.', 'bad'); S.uml = JSON.parse(JSON.stringify(x.uml)); S.maxLevel = 5; T.sel = null; touch(); saveNow(); evaluate(true); renderAll(); setTimeout(fitView, 50); toast('Örnek UML yüklendi.', 'good'); } },
      { label: 'Örnek kod', cls: 'w5-go', fn: () => { const x = example(); if (!x || !x.code) return toast('Örnek bulunamadı.', 'bad'); S.code = x.code; S.maxLevel = 5; saveNow(); if (ED.ta) setCode(S.code); renderAll(); toast('Örnek kod yüklendi. ▶ Çalıştır!', 'good'); } }], 'w5m wide');
    $('#nyp-modal-card .row .btn').focus({ preventScroll: true });
  }
  function resetAll() {
    modal('<h3>Her şey sıfırlansın mı?</h3><p>Diyagram, kod, XP ve arena zaferleri silinir; görev saatleri de sıfırlanır.</p>',
      [{ label: 'Vazgeç' }, { label: 'Sıfırla', cls: 'lava', fn: () => { stopBattle(); const tu = S.teacherUsed; S = fresh(); S.intro = true; S.teacherUsed = tu; T.sel = null; T.hints = {}; touch(); saveNow(); if (ED.ta) setCode(S.code); clearConsole(); renderAll(); toast('Zindan sıfırlandı. Karakter ile başla!', 'info'); } }]);
  }
  const htmlText = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent; };
  const fmtTime = t => (t ? new Date(t).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—');
  const MODE_NAME = { d: 'UML', c: 'Kod', a: 'Arena', q: 'Quiz', p: 'PDF' };
  // PDF'in "İlerleme Raporu" sayfası: her görevin tamamlandığı tarih ve saat
  function progressReport() {
    const now = Date.now(), rows = [];
    LEVELS.forEach(L => {
      const ms = MISSIONS.filter(m => m.lv === L.n);
      const ends = ms.map(m => (m.id === 'p1' ? now : S.doneAt[m.id])).filter(Boolean);
      rows.push({ h: true, text: `${L.n}. Seviye · ${L.title} — ${L.topic}`, a: 'Başlangıç: ' + fmtTime(S.levelAt[L.n]), b: ends.length === ms.length ? 'Bitiş: ' + fmtTime(Math.max.apply(null, ends)) : '' });
      ms.forEach(m => rows.push({ kind: MODE_NAME[m.mode], text: htmlText(m.text).replace(/^\S*[🧪🕵️⚔️📄]\S*\s*/u, ''), time: m.id === 'p1' ? fmtTime(now) + ' (bu PDF)' : fmtTime(S.doneAt[m.id]) }));
    });
    const mins = Math.round((now - S.startedAt) / 60000);
    const intro = [
      `Oturum başlangıcı: ${fmtTime(S.startedAt)}   ·   PDF alınma: ${fmtTime(now)}   ·   Süre: ${Math.floor(mins / 60)} sa ${mins % 60} dk`,
      `Tamamlanan görev: ${Object.keys(S.done).length + (S.done.p1 ? 0 : 1)} / ${MISSIONS.length}   ·   XP: ${Math.min(MISSIONS.length, Object.keys(S.done).length + (S.done.p1 ? 0 : 1)) * 10}   ·   Arena: ${[1, 2, 3].filter(k => S.wins[k] === true).length} / 3 kat`
    ];
    const warn = [];
    if (S.teacherUsed) warn.push('Bu oturumda öğretmen paneli kullanıldı.');
    return { intro, warn, rows, note: 'Saatler, öğrencinin bilgisayar saatine göre kaydedilmiştir.' };
  }
  function exportPdf() {
    const m = M();
    const left = pdfLeft();
    if (left > 0 && !T.teacherOk) {
      modal(`<div class="w5-lvup-art">🔒</div><h3>PDF henüz kilitli</h3><p>PDF çıktısı <b>tüm görevler bitince</b> açılır. Sana <b>${left}</b> görev kaldı.</p><p class="w5-sub">PDF'te diyagramın, kodun ve her görevi hangi tarihte, saat kaçta tamamladığın yer alacak.</p>`, [{ label: 'Tamam', cls: 'w5-go' }]);
      return;
    }
    if (!m.classes.length) { toast('Önce diyagrama sınıf ekle.', 'info'); return; }
    if (!window.NYPPdf) { toast('PDF modülü yüklenemedi.', 'bad'); return; }
    const pretty = t => t.trim().replace(/^-/, '−');
    const classes = m.classes.map(c => ({
      id: c.id, name: c.name || '?', stereo: KIND[c.kind].stereo || null, abstract: c.kind === 'abstract', x: c.raw.x, y: c.raw.y,
      attrs: c.raw.attrs.filter(t => t.trim()).map(t => ({ text: pretty(t) })),
      meths: c.raw.meths.map((t, i) => ({ t, p: c.meths[i] })).filter(x => x.t.trim()).map(x => ({ text: pretty(x.t), abstract: !!x.p.abstract }))
    }));
    const rels = m.rels.map(r => ({ a: r.a, b: r.b, type: r.type, ma: RTYPES[r.type].ends ? (r.ma || '').trim() : '', mb: RTYPES[r.type].ends ? (r.mb || '').trim() : '', role: RTYPES[r.type].ends ? (r.role || '').trim() : '' }));
    NYPPdf.exportUML({ title: 'Vize Zindanı · UML Sınıf Diyagramı', week: '5. Hafta', classes, rels, code: S.code, report: progressReport(), filename: 'vize-zindani' }).then(r => {
      if (!r.ok) { if (!r.cancelled) toast(r.msg || 'PDF oluşturulamadı.', 'bad'); return; }
      toast(r.pdf ? '📄 PDF indirildi!' : r.msg, r.pdf ? 'good' : 'info', 4600);
      if (!S.events.pdf) { S.events.pdf = true; save(); evaluate(); }
    });
  }
  /* =====================================================================
     1) TASARLA — UML tuvali
     ===================================================================== */
  const TOOL_ICON = {
    select: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 3 L19 12 L12 13.5 L8.5 20 Z" fill="currentColor"/></svg>',
    class: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9 H21 M3 14 H21" stroke="currentColor" stroke-width="2"/></svg>',
    abstract: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"/><text x="12" y="16.5" text-anchor="middle" font-size="11" font-style="italic" font-weight="800" fill="currentColor">A</text></svg>',
    interface: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 13 V21" stroke="currentColor" stroke-width="2"/></svg>',
    link: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 18 L15 7" stroke="currentColor" stroke-width="2"/><path d="M20 3 L13 5 L18 10 Z" fill="currentColor"/><circle cx="4.5" cy="18.5" r="2.5" fill="currentColor"/></svg>'
  };
  const TOOL_TIP = {
    select: 'Kutuyu boş bir yerinden tutup taşı. Boş tuvale çift tıkla: yeni sınıf. Tuvali sürükleyerek kaydır.',
    class: 'Tuvalde bir yere tıkla: yeni <b>sınıf</b>.',
    abstract: 'Tuvalde bir yere tıkla: yeni <b>soyut sınıf</b> «abstract».',
    interface: 'Tuvalde bir yere tıkla: yeni <b>arayüz</b> «interface».',
    link: 'Bir kutudan başlayıp diğer kutuya <b>sürükle</b>: ilişki çizgisi. Türünü sonra sağ panelden seç.'
  };

  function designShell() {
    return `
      <div class="w5-tools" id="w5-tools" role="toolbar" aria-label="Araçlar">
        ${[['select', 'Seç', 'V'], ['class', 'Sınıf', 'C'], ['abstract', 'Soyut', 'A'], ['interface', 'Arayüz', 'I'], ['link', 'Bağla', 'L']].map(([k, l, key]) =>
          `<button class="w5-tool" data-tool="${k}" title="${l} (${key})">${TOOL_ICON[k]}<span>${l}</span></button>`).join('')}
        <hr>
        <button class="w5-tool sm" data-act="zoomin" title="Yakınlaş">＋</button>
        <span class="w5-zl" id="w5-zoom">100%</span>
        <button class="w5-tool sm" data-act="zoomout" title="Uzaklaş">－</button>
        <button class="w5-tool sm" data-act="fit" title="Hepsini sığdır">⤢</button>
      </div>
      <div class="w5-cvwrap">
        <div class="w5-cvhint" id="w5-cvhint"></div>
        <div class="w5-cv" id="w5-cv">
          <div class="w5-sizer" id="w5-sizer"><div class="w5-inner" id="w5-inner">
            <svg class="w5-edges" id="w5-edges" width="${CV_W}" height="${CV_H}"></svg>
            <div id="w5-boxes"></div>
            <div class="w5-empty" id="w5-empty"><b>UML tuvali</b>Soldaki araçlardan <b>Soyut</b>'u seç ve buraya tıkla. Brifteki ilk sınıf seni bekliyor: <b>Karakter</b>.<span>Satırlara UML biçiminde yaz: <code>− can: int</code></span></div>
          </div></div>
        </div>
      </div>
      <aside class="w5-insp" id="w5-insp" aria-label="Seçili öğe"></aside>`;
  }

  const boxEl = id => root.querySelector(`.w5-box[data-cid="${id}"]`);
  const rawC = id => S.uml.classes.find(c => c.id === id);
  const rawR = id => S.uml.rels.find(r => r.id === id);

  function renderDesign() {
    $$('.w5-tool[data-tool]', root).forEach(b => b.classList.toggle('on', b.dataset.tool === T.tool));
    root.classList.toggle('tool-link', T.tool === 'link');
    root.classList.toggle('tool-make', ['class', 'abstract', 'interface'].includes(T.tool));
    $('#w5-cvhint').innerHTML = TOOL_TIP[T.tool];
    $('#w5-boxes').innerHTML = M().classes.map(boxHTML).join('');
    $('#w5-empty').hidden = S.uml.classes.length > 0;
    applyZoom();
    drawEdges();
    renderInspector();
  }

  function boxWidth(c) {
    const lens = [c.name.length * 1.15 + 4].concat(c.raw.attrs.map(t => t.length), c.raw.meths.map(t => t.length));
    return Math.round(clamp(Math.max.apply(null, lens) * 8.25 + 62, 220, 580));
  }
  function lineHTML(c, sec, i) {
    const raw = c.raw[sec][i], p = c[sec][i];
    const st = p.empty ? 'empty' : p.err ? 'bad' : p.warn ? 'warn' : 'good';
    return `<div class="w5-ln ${st} vv-${p.vis ? VIS[p.vis].cls : 'none'} ${p.abstract ? 'abs' : ''}" title="${esc(p.err || p.warn || '')}">
      <input class="w5-li" data-cid="${c.id}" data-sec="${sec}" data-i="${i}" value="${esc(raw)}" placeholder="${sec === 'attrs' ? '+ ad: tip' : '+ metot(param: Tip): None'}" spellcheck="false" autocomplete="off" aria-label="${sec === 'attrs' ? 'Özellik' : 'Metot'} satırı"></div>`;
  }
  function boxHTML(c) {
    const L = lintClass(c), nErr = L.filter(x => x.lv === 'err').length, nW = L.filter(x => x.lv === 'warn').length;
    const sel = T.sel && T.sel.t === 'c' && T.sel.id === c.id;
    const conf = T.conf && T.conf.ready && T.conf.byClass[c.id];
    return `<div class="w5-box k-${c.kind} ${sel ? 'sel' : ''}" data-cid="${c.id}" style="left:${c.raw.x}px;top:${c.raw.y}px;width:${boxWidth(c)}px">
      <div class="w5-bh">
        ${c.kind !== 'class' ? `<div class="w5-stereo">«${KIND[c.kind].stereo}»</div>` : ''}
        <input class="w5-bname" data-cid="${c.id}" value="${esc(c.raw.name)}" placeholder="SınıfAdı" spellcheck="false" autocomplete="off" aria-label="Sınıf adı">
      </div>
      <div class="w5-sec" data-sec="attrs">${c.raw.attrs.map((_, i) => lineHTML(c, 'attrs', i)).join('')}
        <button class="w5-addln" data-act="addln" data-sec="attrs" tabindex="-1">${c.kind === 'interface' ? '(arayüzde özellik olmaz)' : '+ özellik'}</button></div>
      <div class="w5-sec" data-sec="meths">${c.raw.meths.map((_, i) => lineHTML(c, 'meths', i)).join('')}
        <button class="w5-addln" data-act="addln" data-sec="meths" tabindex="-1">+ metot</button></div>
      <div class="w5-badges">${nErr ? `<span class="b err" title="Hata">✖ ${nErr}</span>` : ''}${nW ? `<span class="b warn" title="Uyarı">⚠ ${nW}</span>` : ''}${conf ? `<span class="b code ${conf.ok === conf.total ? 'ok' : ''}" title="UML ↔ Kod uyumu">⌨ ${conf.ok}/${conf.total}</span>` : ''}</div>
      <button class="w5-port" data-port="${c.id}" title="Sürükle: ilişki çiz" tabindex="-1"></button>
    </div>`;
  }
  function refreshBox(id, keepFocus) {
    const el = boxEl(id), c = M().byId[id];
    if (!el || !c) return;
    const ae = document.activeElement, sel = ae && el.contains(ae) ? (ae.classList.contains('w5-bname') ? '.w5-bname' : `.w5-li[data-sec="${ae.dataset.sec}"][data-i="${ae.dataset.i}"]`) : null;
    let ss = null; try { ss = ae.selectionStart; } catch (_) { /* yok */ }
    el.outerHTML = boxHTML(c);
    if (keepFocus !== false && sel) { const n = boxEl(id).querySelector(sel); if (n) { n.focus({ preventScroll: true }); try { if (ss != null) n.setSelectionRange(ss, ss); } catch (_) { /* yok */ } } }
  }
  function patchLine(inp) {
    const c = M().byId[inp.dataset.cid], p = c[inp.dataset.sec][+inp.dataset.i];
    const ln = inp.parentElement;
    ln.className = `w5-ln ${p.empty ? 'empty' : p.err ? 'bad' : p.warn ? 'warn' : 'good'} vv-${p.vis ? VIS[p.vis].cls : 'none'} ${p.abstract ? 'abs' : ''}`;
    ln.title = p.err || p.warn || '';
    patchBoxMeta(c);
  }
  function patchBoxMeta(c) {
    const el = boxEl(c.id); if (!el) return;
    el.style.width = boxWidth(c) + 'px';
    const L = lintClass(c), nErr = L.filter(x => x.lv === 'err').length, nW = L.filter(x => x.lv === 'warn').length;
    const conf = T.conf && T.conf.ready && T.conf.byClass[c.id];
    el.querySelector('.w5-badges').innerHTML = `${nErr ? `<span class="b err">✖ ${nErr}</span>` : ''}${nW ? `<span class="b warn">⚠ ${nW}</span>` : ''}${conf ? `<span class="b code ${conf.ok === conf.total ? 'ok' : ''}">⌨ ${conf.ok}/${conf.total}</span>` : ''}`;
  }

  function applyZoom() {
    const z = S.zoom;
    $('#w5-sizer').style.width = CV_W * z + 'px';
    $('#w5-sizer').style.height = CV_H * z + 'px';
    $('#w5-inner').style.transform = `scale(${z})`;
    $('#w5-zoom').textContent = Math.round(z * 100) + '%';
  }
  function setZoom(z, cx, cy) {
    const cv = $('#w5-cv'), old = S.zoom;
    z = clamp(Math.round(z * 100) / 100, 0.35, 1.6);
    if (z === old) return;
    const px = cx == null ? cv.clientWidth / 2 : cx, py = cy == null ? cv.clientHeight / 2 : cy;
    const wx = (cv.scrollLeft + px) / old, wy = (cv.scrollTop + py) / old;
    S.zoom = z; applyZoom(); save();
    cv.scrollLeft = wx * z - px; cv.scrollTop = wy * z - py;
  }
  function fitView() {
    if (S.mode !== 'design' || !S.uml.classes.length) return;
    const cv = $('#w5-cv');
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    S.uml.classes.forEach(c => { const el = boxEl(c.id); const w = el ? el.offsetWidth : 260, h = el ? el.offsetHeight : 160; x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x + w); y1 = Math.max(y1, c.y + h); });
    const pad = 50;
    const z = clamp(Math.min(cv.clientWidth / (x1 - x0 + pad * 2), cv.clientHeight / (y1 - y0 + pad * 2)), 0.35, 1.1);
    S.zoom = Math.floor(z * 100) / 100; applyZoom(); save();
    cv.scrollLeft = (x0 - pad) * S.zoom - Math.max(0, (cv.clientWidth - (x1 - x0 + pad * 2) * S.zoom) / 2);
    cv.scrollTop = (y0 - pad) * S.zoom - Math.max(0, (cv.clientHeight - (y1 - y0 + pad * 2) * S.zoom) / 2);
  }
  function toCanvas(e) {
    const r = $('#w5-inner').getBoundingClientRect();
    return { x: (e.clientX - r.left) / S.zoom, y: (e.clientY - r.top) / S.zoom };
  }

  function rectOf(id) { const el = boxEl(id); return el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null; }
  function drawEdges() {
    const svg = $('#w5-edges'); if (!svg || !window.NYPPdf) return;
    const G = NYPPdf.geom, pc = {};
    let out = '';
    M().rels.forEach(r => {
      const ra = rectOf(r.a), rb = rectOf(r.b); if (!ra || !rb) return;
      const k = [r.a, r.b].sort().join('|'), n = pc[k] = (pc[k] || 0) + 1;
      const off = n === 1 ? 0 : (n % 2 ? 1 : -1) * Math.ceil((n - 1) / 2) * 16;
      const g = G.edge(ra, rb, off), d = G.decorate(g, r.type), L = G.labels(g, r.type);
      const sel = T.sel && T.sel.t === 'r' && T.sel.id === r.id;
      const bad = lintRel(r).some(x => x.lv === 'err');
      const pts = sh => sh.pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      out += `<g class="w5-edge t-${r.type} ${sel ? 'sel' : ''} ${bad ? 'bad' : ''}" data-rid="${r.id}">
        <line class="hit" x1="${g.p1.x}" y1="${g.p1.y}" x2="${g.p2.x}" y2="${g.p2.y}"/>
        <line class="ln ${d.dashed ? 'dash' : ''}" x1="${d.s.x}" y1="${d.s.y}" x2="${d.e.x}" y2="${d.e.y}"/>
        ${d.shapes.map(sh => `<${sh.closed ? 'polygon' : 'polyline'} class="mk ${sh.fill}" points="${pts(sh)}"/>`).join('')}
        ${RTYPES[r.type].ends ? `<text class="mult" x="${L.ma.x}" y="${L.ma.y}">${esc(r.ma || '')}</text><text class="mult" x="${L.mb.x}" y="${L.mb.y}">${esc(r.mb || '')}</text><text class="role" x="${L.role.x}" y="${L.role.y}">${esc(r.role || '')}</text>` : ''}
      </g>`;
    });
    svg.innerHTML = out + '<line id="w5-temp" class="w5-temp" x1="0" y1="0" x2="0" y2="0" visibility="hidden"/>';
  }

  function select(sel, opts) {
    const prev = T.sel;
    T.sel = sel;
    $$('.w5-box.sel', root).forEach(b => b.classList.remove('sel'));
    if (sel && sel.t === 'c') { const b = boxEl(sel.id); if (b) b.classList.add('sel'); }
    if ((prev && prev.t === 'r') || (sel && sel.t === 'r')) drawEdges();
    if (!opts || !opts.noInsp) renderInspector();
  }

  function createClass(kind, x, y) {
    const c = { id: 'c' + uid(), name: '', kind, x: Math.round(clamp(x, 0, CV_W - 260)), y: Math.round(clamp(y, 0, CV_H - 160)), attrs: kind === 'interface' ? [] : [''], meths: [''] };
    S.uml.classes.push(c); touch();
    T.sel = { t: 'c', id: c.id }; T.tool = 'select';
    save(); renderDesign();
    const n = boxEl(c.id).querySelector('.w5-bname'); n.focus({ preventScroll: true });
    toast(`${KIND[kind].label} eklendi. Önce adını yaz, sonra satırlara geç (Enter).`, 'good');
    evalSoon();
  }
  function deleteClass(id) {
    const c = rawC(id); if (!c) return;
    const go = () => {
      S.uml.classes = S.uml.classes.filter(x => x.id !== id);
      S.uml.rels = S.uml.rels.filter(r => r.a !== id && r.b !== id);
      T.sel = null; touch(); save(); renderDesign(); evalSoon();
    };
    const filled = c.attrs.concat(c.meths).some(t => t.trim());
    if (!filled) return go();
    modal(`<h3>${esc(c.name || 'Bu sınıf')} silinsin mi?</h3><p>Satırları ve bağlı ilişki çizgileri de silinir.</p>`, [{ label: 'Vazgeç' }, { label: 'Sil', cls: 'lava', fn: go }]);
  }
  function addRel(a, b) {
    const ex = S.uml.rels.find(r => r.a === a && r.b === b);
    if (ex) { select({ t: 'r', id: ex.id }); toast('Bu iki sınıf arasında zaten bir çizgi var; sağ panelden düzenle.', 'info'); return; }
    const r = { id: 'r' + uid(), a, b, type: 'assoc', ma: '', mb: '', role: '' };
    S.uml.rels.push(r); touch(); save();
    T.sel = { t: 'r', id: r.id };
    drawEdges(); renderInspector(); evalSoon();
    toast('Çizgi çizildi! Sağ panelden ilişkinin türünü, yönünü ve çokluklarını seç.', 'good', 3800);
  }
  function deleteRel(id) { S.uml.rels = S.uml.rels.filter(r => r.id !== id); T.sel = null; touch(); save(); drawEdges(); renderInspector(); evalSoon(); }

  /* ---- sağ panel ---- */
  const renderInspectorSoon = debounce(() => { if (S.mode === 'design') renderInspector(true); }, 250);
  function lintList(L) {
    if (!L.length) return '<div class="w5-lint ok">✓ Sorun görünmüyor.</div>';
    return L.map(x => `<div class="w5-lint ${x.lv}">${x.lv === 'err' ? '✖' : x.lv === 'warn' ? '⚠' : 'ℹ'} ${esc(x.msg)}</div>`).join('');
  }
  function renderInspector(soft) {
    const box = $('#w5-insp'); if (!box) return;
    const s = T.sel, m = M();
    if (soft && box.contains(document.activeElement)) return;
    if (s && s.t === 'c' && m.byId[s.id]) {
      const c = m.byId[s.id], conf = T.conf && T.conf.ready && T.conf.byClass[c.id];
      box.innerHTML = `<div class="w5-ih k-${c.kind}"><small>${KIND[c.kind].label}</small><b>${esc(c.name || 'adsız')}</b></div>
        <div class="w5-isec"><h4>Kutunun türü</h4>
          <div class="w5-seg">${['class', 'abstract', 'interface'].map(k => `<button class="${c.kind === k ? 'on' : ''}" data-act="kind" data-k="${k}">${KIND[k].label}</button>`).join('')}</div>
          <p class="w5-itip">${KIND[c.kind].tip}</p></div>
        <div class="w5-isec"><h4>Denetim</h4>${lintList(lintClass(c))}</div>
        ${conf ? `<div class="w5-isec"><h4>Kodda karşılığı</h4><div class="w5-lint ${conf.ok === conf.total ? 'ok' : 'warn'}">⌨ ${conf.ok}/${conf.total} satır kodla uyumlu. Ayrıntı: Kodla → UML ↔ Kod.</div></div>` : ''}
        <div class="w5-isec"><h4>Satır yazım kuralı</h4>${syntaxHelp(true)}</div>
        <div class="w5-iact"><button class="btn" data-act="delcls">🗑 Sınıfı sil</button></div>`;
      return;
    }
    if (s && s.t === 'r' && m.rels.find(r => r.id === s.id)) {
      const r = rawR(s.id), A = m.byId[r.a], B = m.byId[r.b], ends = RTYPES[r.type].ends;
      const end = (k, X, lbl) => `<div class="w5-end"><label>${lbl}: <b>${esc(X.name || '?')}</b> ucu</label>
          <input class="w5-in mono" data-rf="${k}" value="${esc(r[k] || '')}" placeholder="ör. 1, 0..1, *, 1..*" spellcheck="false" autocomplete="off">
          <div class="w5-chips">${MULTS.map(v => `<button class="${normMult(r[k]) === normMult(v) && (r[k] || '').trim() ? 'on' : ''}" data-act="mult" data-k="${k}" data-v="${v}">${v}</button>`).join('')}</div></div>`;
      box.innerHTML = `<div class="w5-ih rel"><small>İlişki çizgisi</small><b>${esc(A.name || '?')} <span>${relSym(r.type)}</span> ${esc(B.name || '?')}</b></div>
        <div class="w5-isec"><h4>Bu çizgi ne anlatıyor?</h4>
          <div class="w5-rtypes">${RT_ORDER.map(t => `<button class="w5-rt ${r.type === t ? 'on' : ''}" data-act="rtype" data-t="${t}">${relIcon(t)}<span><b>${RTYPES[t].name}</b><small>${RTYPES[t].short}</small></span></button>`).join('')}</div></div>
        <div class="w5-isec"><h4>Yön</h4><div class="w5-dir"><b>${esc(A.name || '?')}</b> ${relIcon(r.type, 'mid')} <b>${esc(B.name || '?')}</b></div>
          <button class="btn sm" data-act="swap">⇄ Yönü çevir</button>
          <p class="w5-itip">${r.type === 'gen' ? 'Üçgen ebeveyn (üst sınıf) tarafında.' : r.type === 'real' ? 'Üçgen arayüz tarafında.' : r.type === 'assoc' ? 'Ok, bilinen/kullanılan sınıfı gösterir.' : 'Elmas BÜTÜN tarafında.'}</p></div>
        ${ends ? `<div class="w5-isec"><h4>Çokluklar ve rol</h4>
          ${end('ma', A, 'Başlangıç')}${end('mb', B, 'Bitiş')}
          <div class="w5-end"><label>Rol adı (kodda <b>${esc(A.name || '?')}</b> içindeki özelliğin adı)</label>
          <input class="w5-in mono" data-rf="role" value="${esc(r.role || '')}" placeholder="ör. envanter" spellcheck="false" autocomplete="off"></div></div>` : '<div class="w5-isec"><p class="w5-itip">Kalıtım ve gerçekleştirme çizgilerinde çokluk ve rol adı olmaz.</p></div>'}
        <div class="w5-isec w5-read"><h4>📖 Diyagramın böyle okunuyor</h4><p id="w5-rsent">${relSentence(r)}</p><small>Brifteki cümleyle aynı mı?</small></div>
        <div class="w5-isec"><h4>Denetim</h4><div id="w5-rlint">${lintList(lintRel(r))}</div></div>
        <div class="w5-iact"><button class="btn" data-act="delrel">🗑 Çizgiyi sil</button></div>`;
      return;
    }
    box.innerHTML = `<div class="w5-ih"><small>Rehber</small><b>UML nasıl yazılır?</b></div>
      <div class="w5-isec"><h4>Satırlar</h4>${syntaxHelp(false)}</div>
      <div class="w5-isec"><h4>Çizgiler</h4><div class="w5-rlegend">${RT_ORDER.map(t => `<div>${relIcon(t)}<span><b>${RTYPES[t].name}</b> · ${RTYPES[t].short}</span></div>`).join('')}</div></div>
      <div class="w5-isec"><h4>Çokluklar</h4><div class="w5-mlegend"><code>1</code> tam bir <code>0..1</code> en fazla bir <code>*</code> hiç ya da çok <code>1..*</code> en az bir <code>2..4</code> 2 ile 4 arası</div></div>
      <div class="w5-isec"><h4>Kısayollar</h4><div class="w5-keys"><kbd>Enter</kbd> yeni satır · <kbd>⌫</kbd> boş satırı sil · <kbd>↑</kbd><kbd>↓</kbd> satırlar arası · <kbd>Del</kbd> seçiliyi sil · <kbd>Ctrl</kbd>+tekerlek yakınlaştır · <kbd>V</kbd><kbd>C</kbd><kbd>A</kbd><kbd>I</kbd><kbd>L</kbd> araçlar</div></div>`;
  }
  function syntaxHelp(short) {
    return `<div class="w5-syn">
      <div><code>+ ad: str</code><span>özellik: erişim ad: tip</span></div>
      <div><code>+ saldir(hedef: Karakter): None</code><span>metot: erişim ad(param: Tip): dönüş</span></div>
      ${short ? '' : '<div><code>+ saldir(hedef: Karakter): None {abstract}</code><span>soyut metot (italik görünür)</span></div>'}
      <div class="vis"><span class="v pub">+</span>public <span class="v prot">#</span>protected <span class="v priv">−</span>private <small>(− için klavyedeki - yeter)</small></div></div>`;
  }
  function patchRelInspector(r) {
    const s = $('#w5-rsent'), l = $('#w5-rlint');
    if (s) s.innerHTML = relSentence(r);
    if (l) l.innerHTML = lintList(lintRel(r));
    $$('.w5-chips button', root).forEach(b => { const v = r[b.dataset.k]; b.classList.toggle('on', !!(v || '').trim() && normMult(v) === normMult(b.dataset.v)); });
  }

  /* ---- tuval etkileşimi ---- */
  function onDesignDown(e) {
    if (e.button && e.button !== 0) return;
    const t = e.target;
    const port = t.closest('[data-port]');
    const boxN = t.closest('.w5-box');
    const edge = t.closest('[data-rid]');
    if (port || (T.tool === 'link' && boxN)) {
      const id = port ? port.dataset.port : boxN.dataset.cid;
      T.drag = { t: 'link', from: id };
      e.preventDefault();
      return;
    }
    if (edge) { select({ t: 'r', id: edge.dataset.rid }); e.preventDefault(); return; }
    if (boxN) {
      const id = boxN.dataset.cid;
      if (!T.sel || T.sel.id !== id) select({ t: 'c', id }, { noInsp: !!t.closest('input') });
      if (t.closest('input,button')) { if (t.closest('input')) renderInspector(); return; }
      const c = rawC(id), p = toCanvas(e);
      T.drag = { t: 'move', id, ox: p.x - c.x, oy: p.y - c.y, el: boxN, moved: false };
      boxN.classList.add('dragging');
      e.preventDefault();
      return;
    }
    if (!t.closest('#w5-cv')) return;
    if (['class', 'abstract', 'interface'].includes(T.tool)) {
      const p = toCanvas(e);
      createClass(T.tool, p.x - 40, p.y - 24);
      e.preventDefault();
      return;
    }
    if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
    if (T.sel) select(null);
    const cv = $('#w5-cv');
    T.drag = { t: 'pan', sx: e.clientX, sy: e.clientY, sl: cv.scrollLeft, st: cv.scrollTop };
    cv.classList.add('panning');
  }
  function onDesignMove(e) {
    const D = T.drag; if (!D) return;
    if (D.t === 'move') {
      const p = toCanvas(e), c = rawC(D.id);
      c.x = Math.round(clamp(p.x - D.ox, 0, CV_W - 200)); c.y = Math.round(clamp(p.y - D.oy, 0, CV_H - 80));
      D.el.style.left = c.x + 'px'; D.el.style.top = c.y + 'px'; D.moved = true;
      drawEdges();
    } else if (D.t === 'pan') {
      const cv = $('#w5-cv');
      cv.scrollLeft = D.sl - (e.clientX - D.sx); cv.scrollTop = D.st - (e.clientY - D.sy);
    } else if (D.t === 'link') {
      const r = rectOf(D.from), p = toCanvas(e), l = $('#w5-temp');
      if (!r || !l) return;
      l.setAttribute('x1', r.x + r.w / 2); l.setAttribute('y1', r.y + r.h / 2);
      l.setAttribute('x2', p.x); l.setAttribute('y2', p.y); l.setAttribute('visibility', 'visible');
      $$('.w5-box.target', root).forEach(b => b.classList.remove('target'));
      const el = document.elementFromPoint(e.clientX, e.clientY), b = el && el.closest('.w5-box');
      if (b && b.dataset.cid !== D.from) b.classList.add('target');
    }
  }
  function onDesignUp(e) {
    const D = T.drag; if (!D) return;
    T.drag = null;
    if (D.t === 'move') { D.el.classList.remove('dragging'); if (D.moved) { save(); } }
    else if (D.t === 'pan') $('#w5-cv').classList.remove('panning');
    else if (D.t === 'link') {
      const l = $('#w5-temp'); if (l) l.setAttribute('visibility', 'hidden');
      $$('.w5-box.target', root).forEach(b => b.classList.remove('target'));
      const el = document.elementFromPoint(e.clientX, e.clientY), b = el && el.closest('.w5-box');
      if (b && b.dataset.cid !== D.from) addRel(D.from, b.dataset.cid);
      else if (!b || b.dataset.cid === D.from) { if (T.tool === 'link') toast('Çizgiyi başka bir kutunun üstünde bırak.', 'info'); select({ t: 'c', id: D.from }); }
    }
  }
  function onDesignDbl(e) {
    if (T.tool !== 'select' || e.target.closest('.w5-box,[data-rid]') || !e.target.closest('#w5-cv')) return;
    const p = toCanvas(e);
    createClass('class', p.x - 40, p.y - 24);
  }

  function onDesignInput(e) {
    const t = e.target;
    if (t.classList.contains('w5-bname')) {
      const c = rawC(t.dataset.cid); c.name = t.value; touch(); save();
      patchBoxMeta(M().byId[c.id]); drawEdges(); evalSoon(); renderInspectorSoon();
      const h = root.querySelector('.w5-ih b'); if (h && T.sel && T.sel.id === c.id) h.textContent = c.name || 'adsız';
      return;
    }
    if (t.classList.contains('w5-li')) {
      const c = rawC(t.dataset.cid); c[t.dataset.sec][+t.dataset.i] = t.value; touch(); save();
      patchLine(t); drawEdges(); evalSoon(); renderInspectorSoon();
      return;
    }
    if (t.dataset.rf && T.sel && T.sel.t === 'r') {
      const r = rawR(T.sel.id); r[t.dataset.rf] = t.value; touch(); save();
      drawEdges(); patchRelInspector(r); evalSoon();
    }
  }
  function onDesignKey(e) {
    const t = e.target;
    if (t.classList.contains('w5-li') || t.classList.contains('w5-bname')) {
      const box = t.closest('.w5-box'), id = box.dataset.cid, c = rawC(id);
      const inputs = $$('input', box), idx = inputs.indexOf(t);
      if (e.key === 'Enter') {
        e.preventDefault();
        let sec = t.dataset.sec, i = +t.dataset.i;
        if (!sec) { sec = c.kind === 'interface' ? 'meths' : 'attrs'; i = -1; }
        c[sec].splice(i + 1, 0, ''); touch(); save();
        refreshBox(id, false); drawEdges();
        const n = boxEl(id).querySelector(`.w5-li[data-sec="${sec}"][data-i="${i + 1}"]`); if (n) n.focus({ preventScroll: true });
        return;
      }
      if (e.key === 'Backspace' && t.classList.contains('w5-li') && !t.value) {
        e.preventDefault();
        const sec = t.dataset.sec, i = +t.dataset.i;
        c[sec].splice(i, 1); touch(); save();
        refreshBox(id, false); drawEdges(); evalSoon();
        const ins = $$('input', boxEl(id)); const n = ins[Math.max(0, idx - 1)];
        if (n) { n.focus({ preventScroll: true }); const L = n.value.length; n.setSelectionRange(L, L); }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const n = inputs[idx + (e.key === 'ArrowDown' ? 1 : -1)];
        if (n) { e.preventDefault(); n.focus({ preventScroll: true }); }
        return;
      }
      if (e.key === 'Escape') { t.blur(); return; }
      return;
    }
    if (t.dataset.rf && e.key === 'Enter') { t.blur(); return; }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if ((e.key === 'Delete' || e.key === 'Backspace') && T.sel) { e.preventDefault(); if (T.sel.t === 'c') deleteClass(T.sel.id); else deleteRel(T.sel.id); return; }
    const tool = { v: 'select', c: 'class', a: 'abstract', i: 'interface', l: 'link' }[k];
    if (tool) { T.tool = tool; renderDesign(); }
    if (e.key === 'Escape') { T.tool = 'select'; select(null); renderDesign(); }
  }
  function onDesignClick(e) {
    const t = e.target;
    const tb = t.closest('[data-tool]');
    if (tb) { T.tool = tb.dataset.tool; renderDesign(); return; }
    const b = t.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    switch (act) {
      case 'zoomin': setZoom(S.zoom + 0.1); break;
      case 'zoomout': setZoom(S.zoom - 0.1); break;
      case 'fit': fitView(); break;
      case 'addln': {
        const id = b.closest('.w5-box').dataset.cid, c = rawC(id), sec = b.dataset.sec;
        c[sec].push(''); touch(); save(); select({ t: 'c', id }, { noInsp: true }); refreshBox(id, false); drawEdges();
        const n = boxEl(id).querySelector(`.w5-li[data-sec="${sec}"][data-i="${c[sec].length - 1}"]`); if (n) n.focus({ preventScroll: true });
        renderInspector();
        break;
      }
      case 'kind': {
        const c = rawC(T.sel.id); c.kind = b.dataset.k;
        if (c.kind === 'interface' && !c.attrs.some(x => x.trim())) c.attrs = [];
        touch(); save(); refreshBox(c.id); drawEdges(); renderInspector(); evalSoon();
        break;
      }
      case 'delcls': deleteClass(T.sel.id); break;
      case 'rtype': { const r = rawR(T.sel.id); r.type = b.dataset.t; touch(); save(); drawEdges(); renderInspector(); evalSoon(); break; }
      case 'swap': { const r = rawR(T.sel.id); [r.a, r.b] = [r.b, r.a]; [r.ma, r.mb] = [r.mb, r.ma]; touch(); save(); drawEdges(); renderInspector(); evalSoon(); break; }
      case 'mult': { const r = rawR(T.sel.id); r[b.dataset.k] = b.dataset.v; touch(); save(); drawEdges(); renderInspector(); evalSoon(); break; }
      case 'delrel': deleteRel(T.sel.id); break;
    }
  }
  /* =====================================================================
     2) KODLA — editör, konsol, UML ↔ Kod
     ===================================================================== */
  const LH = 21;
  const ED = { ta: null, hl: null, gut: null, errLine: null, lintLine: null, cur: 1, hist: [], hi: -1 };
  const SNIPS = [['self.', 'self.'], ['def', 'def |(self):'], ['__init__', 'def __init__(self|):'], ['@abstractmethod', '@abstractmethod'], ['super()', 'super().__init__(|)'], ['[ ]', '[|]'], ['None', 'None'], ['.append()', '.append(|)'], ['return', 'return '], ['print()', 'print(|)'], ['isinstance()', 'isinstance(|, )'], ['len()', 'len(|)'], ['_', '_'], ['__', '__']];
  const TEST_LBL = { abstract: 'Karakter soyut mu? (nesne üretilemiyor mu?)', private: 'Erişim: + ad · − can · # guc', kmeth: 'get_can · hasar_al · hayatta_mi', savasci: 'Savasci.saldir()', canavar: 'Canavar.saldir()', arayuz: 'Iyilestirebilir arayüzü', cankazan: 'Karakter.can_kazan()', iksir: 'Iksir', sifaci: 'Sifaci: iyileştirme ve saldırı', envanter: 'Envanter ve bileşim', silah: 'Silah ve silah_kusan()', lonca: 'Lonca ve 4 üye sınırı', kurulum: 'Lonca kurulumu + arena kuralları', ozel: 'Kendi kahraman sınıfın' };
  const TEST_LV = { abstract: 1, private: 1, kmeth: 1, savasci: 1, canavar: 1, arayuz: 2, cankazan: 2, iksir: 2, sifaci: 2, envanter: 3, silah: 3, lonca: 4, kurulum: 4, ozel: 5 };

  function codeShell() {
    return `
      <div class="w5-cmain">
        <div class="w5-ebar">
          <button class="w5-run" data-act="run" id="w5-run">▶ Çalıştır <kbd>Ctrl</kbd><kbd>Enter</kbd></button>
          <span class="w5-pys" id="w5-pys"></span>
          <div class="w5-snips" id="w5-snips" aria-label="Hızlı ekle">${SNIPS.map((s, i) => `<button data-snip="${i}" title="Ekle: ${esc(s[1].replace('|', ''))}" tabindex="-1">${esc(s[0])}</button>`).join('')}</div>
        </div>
        <div class="w5-ed" id="w5-ed">
          <div class="w5-gut" id="w5-gut" aria-hidden="true"></div>
          <div class="w5-edc">
            <pre class="w5-hl" id="w5-hl" aria-hidden="true"></pre>
            <textarea id="w5-ta" spellcheck="false" wrap="off" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Python kodu"></textarea>
          </div>
          <div class="w5-lintchip" id="w5-lintchip" hidden></div>
        </div>
        <div class="w5-con">
          <div class="w5-conh"><b>Konsol</b><span id="w5-cstat"></span><button data-act="clearcon">Temizle</button></div>
          <div class="w5-cout" id="w5-cout"><div class="w5-cl info">Kodunu yaz ve ▶ Çalıştır. print() çıktıları ve hatalar (Türkçe açıklamasıyla) burada görünür.</div></div>
          <label class="w5-repl"><span>&gt;&gt;&gt;</span><input id="w5-repl" placeholder="Kodun çalıştıktan sonra bir ifade yaz, Enter: ali.get_can()" spellcheck="false" autocomplete="off"></label>
        </div>
      </div>
      <aside class="w5-cside">
        <div class="w5-ctabs" id="w5-ctabs" role="tablist"></div>
        <div class="w5-cbody" id="w5-cbody"></div>
      </aside>`;
  }

  /* ---- sözdizimi renklendirme ---- */
  const PY_TOK = /(#[^\n]*)|("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|[rRbBuUfF]{0,2}"(?:[^"\\\n]|\\.)*"?|[rRbBuUfF]{0,2}'(?:[^'\\\n]|\\.)*'?)|(@[A-Za-z_][\w.]*)|\b(class|def|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|pass|import|from|as|try|except|finally|raise|with|lambda|break|continue|global|nonlocal|yield|del|assert)\b|\b(self|super)\b|\b(print|len|range|isinstance|issubclass|list|dict|str|int|float|bool|max|min|sum|abs|round|type|hasattr|getattr|setattr|enumerate|sorted|input|ABC|abstractmethod)\b|\b(\d+(?:\.\d+)?)\b|(?<=\bclass\s+)([A-Za-z_ÇĞİÖŞÜçğıöşü][\wÇĞİÖŞÜçğıöşü]*)|(?<=\bdef\s+)([A-Za-z_ÇĞİÖŞÜçğıöşü][\wÇĞİÖŞÜçğıöşü]*)/g;
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
    focusClassFromCaret();
  }
  function setCode(code) { ED.ta.value = code; S.code = code; ED.errLine = null; ED.lintLine = null; hlRender(); lintSoon(); }

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
    const block = v.slice(s, e2), out = fn(block.split('\n')).join('\n');
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
    hlRender(); updateCur(); lintSoon();
  }
  function gotoLine(n, caretOnly) {
    const v = ED.ta.value.split('\n'); n = clamp(n, 1, v.length);
    let s = 0; for (let i = 0; i < n - 1; i++) s += v[i].length + 1;
    ED.ta.focus(); ED.ta.setSelectionRange(s, caretOnly ? s : s + v[n - 1].length);
    ED.ta.scrollTop = Math.max(0, (n - 4) * LH);
    syncScroll(); updateCur();
  }

  /* ---- canlı sözdizimi + UML karşılaştırması ---- */
  const lintSoon = debounce(async () => {
    if (!ED.ta || H5Py.status() === 'error') return;
    const code = ED.ta.value;
    try {
      const r = await H5Py.lint(code);
      if (code !== ED.ta.value) return;
      const chip = $('#w5-lintchip');
      if (!r.ok) {
        ED.lintLine = r.err.line;
        const x = H5Py.explain(r.err);
        chip.hidden = false; chip.innerHTML = `⚠ ${r.err.line}. satır: ${esc(x.title)}`; chip.dataset.line = r.err.line;
      } else {
        ED.lintLine = null; chip.hidden = true;
        S.analysis = r.analysis; S.analysisV = (S.analysisV || 0) + 1; save();
        if (S.mode === 'code') renderCodeSide();
        evalSoon();
      }
      hlRender();
    } catch (_) { /* motor meşgul ya da yükleniyor */ }
  }, 900);

  function focusClassFromCaret() {
    const v = ED.ta.value.split('\n').slice(0, ED.cur);
    let name = null;
    for (let i = v.length - 1; i >= 0; i--) {
      const m = /^class\s+([A-Za-z_ÇĞİÖŞÜçğıöşü][\wÇĞİÖŞÜçğıöşü]*)/.exec(v[i]);
      if (m) { name = m[1]; break; }
      if (/^\S/.test(v[i]) && !/^(#|@)/.test(v[i])) break;
    }
    const c = name && clsByName(name);
    if (c && T.focusCls !== c.id) { T.focusCls = c.id; if (S.sideTab === 'uml') renderCodeSide(); }
  }

  /* ---- çalıştır ---- */
  function setPyStatus(s) {
    const el = $('#w5-pys'); if (!el) return;
    el.className = 'w5-pys ' + s;
    el.textContent = { idle: '⚪ Python bekliyor', loading: '⏳ Python yükleniyor… (ilk seferde biraz sürer)', ready: '🟢 Python 3 hazır', busy: '⚙️ Çalışıyor…', error: '🔴 Python yüklenemedi (internet?) · ▶ ile tekrar dene' }[s] || s;
    const rb = $('#w5-run'); if (rb) rb.disabled = s === 'busy' || s === 'loading';
  }
  function conAdd(html, cls) {
    const box = $('#w5-cout'); if (!box) return;
    const d = document.createElement('div'); d.className = 'w5-cl ' + (cls || ''); d.innerHTML = html;
    box.appendChild(d);
    while (box.children.length > 400) box.firstChild.remove();
    box.scrollTop = box.scrollHeight;
  }
  function clearConsole() { const b = $('#w5-cout'); if (b) b.innerHTML = ''; }
  const abstractByDesign = n => { const c = clsByName(n); return c ? c.kind !== 'class' : n === 'Karakter' || n === 'Iyilestirebilir'; };
  function errHTML(err) {
    const x = H5Py.explain(err, { abstractByDesign });
    return `<div class="t">✖ ${esc(x.title)}${err.line ? ` <button class="w5-goto" data-goto="${err.line}">${err.line}. satıra git</button>` : ''}${err.func && err.func !== '<module>' ? ` <small>(${esc(err.func)}() içinde)</small>` : ''}</div>
      <div class="tip">${esc(x.tip)}</div><div class="raw">${esc(err.type)}: ${esc(err.msg)}${err.text ? `<br><code>${esc(err.text)}</code>` : ''}</div>`;
  }
  function checkAbstractTry(err) {
    if (err && err.type === 'TypeError' && /abstract class (Karakter)\b/.test(err.msg) && !S.events.abstractTry) {
      S.events.abstractTry = true; save();
      setTimeout(() => toast('🧪 Gördün mü? Soyut sınıftan nesne üretilemiyor. Şimdi o satırı silebilirsin.', 'star', 5200), 400);
    }
  }
  async function runCode() {
    if (T.runBusy || !ED.ta) return;
    T.runBusy = true;
    const code = ED.ta.value; S.code = code; saveNow();
    conAdd(`<span>▶ Çalıştırılıyor · ${new Date().toLocaleTimeString('tr-TR')}</span>`, 'sep');
    try {
      const r = await H5Py.run(code);
      if (r.out) conAdd(esc(r.out.replace(/\n$/, '')), 'out');
      if (r.err) { conAdd(errHTML(r.err), 'err'); ED.errLine = r.err.line; checkAbstractTry(r.err); }
      else conAdd('✓ Kod hatasız çalıştı.', 'ok');
      if (r.analysis) { S.analysis = r.analysis; S.analysisV = (S.analysisV || 0) + 1; }
      const before = Object.keys(S.tests).filter(k => S.tests[k][0]).length;
      S.tests = r.tests || {};
      const after = Object.keys(S.tests).filter(k => S.tests[k][0] && TEST_LV[k] <= S.maxLevel).length;
      const total = Object.keys(TEST_LV).filter(k => TEST_LV[k] <= S.maxLevel).length;
      if (Object.keys(S.tests).length) conAdd(`🧪 Brif testleri: <b>${after}/${total}</b> geçti${after > before ? ' · 📈 ilerleme var!' : ''} <button class="w5-goto" data-act="tab" data-tab="tests">ayrıntı</button>`, after === total ? 'ok' : 'info');
      T.rosterCode = null;
      saveNow(); hlRender(); renderCodeSide(); evaluate();
    } catch (e) {
      if (e && e.timeout) conAdd('⏱ Kod 8 saniyede bitmedi. Sonsuz döngü olabilir mi (while True)? Python yeniden başlatılıyor; düzeltip tekrar çalıştır.', 'err');
      else conAdd('⚠ ' + esc((e && e.fatal) || String(e)), 'err');
    }
    T.runBusy = false;
  }
  async function replRun(expr) {
    if (!expr.trim()) return;
    ED.hist.push(expr); ED.hi = ED.hist.length;
    conAdd(`<span class="p">&gt;&gt;&gt;</span> ${esc(expr)}`, 'in');
    try {
      const r = await H5Py.evaluate(ED.ta.value, expr);
      if (r.pre) { conAdd('(kodun güncel hâli önce çalıştırıldı)', 'dim'); if (r.pre.err) conAdd(errHTML(r.pre.err), 'err'); }
      if (r.out) conAdd(esc(r.out.replace(/\n$/, '')), 'out');
      if (r.err) { conAdd(errHTML(r.err), 'err'); checkAbstractTry(r.err); }
      else if (r.val != null) {
        const obj = /^<__main__\.(\w+) object at/.exec(r.val);
        conAdd(esc(r.val) + (obj ? ` <small class="dim">← bir ${esc(obj[1])} nesnesi (varsayılan görünümü böyle)</small>` : ''), 'val');
        if (/isinstance\s*\(/.test(expr) && (r.val === 'True' || r.val === 'False') && !S.events.isinst) {
          S.events.isinst = true; save();
          if (/Iksir/.test(expr) && /Karakter/.test(expr) && r.val === 'False') toast('🧪 False! Çünkü İksir bir Karakter değil; sadece Iyilestirebilir. Arayüz akrabalık kurmaz, yetenek kazandırır.', 'star', 6500);
        }
      }
      evaluate();
    } catch (e) {
      conAdd(e && e.timeout ? '⏱ Zaman aşımı.' : '⚠ ' + esc((e && e.fatal) || String(e)), 'err');
    }
  }

  /* ---- sağ panel ---- */
  function renderCode() {
    if (ED.ta.value !== S.code) { ED.ta.value = S.code; }
    hlRender();
    setPyStatus(H5Py.status());
    H5Py.boot().then(() => lintSoon()).catch(() => { /* durum çipi gösteriyor */ });
    renderCodeSide();
  }
  function renderCodeSide() {
    if (S.mode !== 'code') return;
    const tabs = [['uml', 'UML ↔ Kod'], ['cards', 'Kod Kartları'], ['tests', 'Testler']];
    $('#w5-ctabs').innerHTML = tabs.map(([k, l]) => `<button role="tab" class="${S.sideTab === k ? 'on' : ''}" data-act="tab" data-tab="${k}" aria-selected="${S.sideTab === k}">${l}</button>`).join('');
    const body = $('#w5-cbody');
    if (S.sideTab === 'cards') body.innerHTML = cardsHTML();
    else if (S.sideTab === 'tests') body.innerHTML = testsHTML();
    else body.innerHTML = confHTML();
  }
  function confHTML() {
    const m = M();
    if (!m.classes.length) return '<div class="w5-cempty">Önce <b>📐 Tasarla</b> aşamasında UML diyagramını kur. Kod, diyagramının karşılığı olacak.</div>';
    const C = conformance();
    if (!C.ready) return '<div class="w5-cempty">Python motoru hazırlanıyor… Hazır olunca kodun yazdıkça diyagramınla karşılaştırılacak.</div>';
    const pct = C.total ? Math.round((C.ok / C.total) * 100) : 0;
    const ids = m.classes.filter(c => c.name).map(c => c.id);
    if (!T.focusCls || !C.byClass[T.focusCls]) T.focusCls = ids.find(id => C.byClass[id] && C.byClass[id].ok < C.byClass[id].total) || ids[0];
    const F = C.byClass[T.focusCls], fc = m.byId[T.focusCls];
    return `<div class="w5-cmeter"><div><b>Uyum %${pct}</b><small>${C.ok}/${C.total} UML satırının kodda karşılığı var</small></div><div class="w5-bar"><i style="width:${pct}%"></i></div></div>
      <div class="w5-cchips">${ids.map(id => { const x = C.byClass[id]; return `<button class="${id === T.focusCls ? 'on' : ''} ${x.ok === x.total ? 'ok' : x.ok ? 'mid' : 'no'}" data-act="fcls" data-id="${id}">${esc(x.name)} <small>${x.ok}/${x.total}</small></button>`; }).join('')}</div>
      ${F ? `<div class="w5-cbox k-${fc.kind}">
        <div class="h">${fc.kind !== 'class' ? `<small>«${KIND[fc.kind].stereo}»</small>` : ''}<b>${esc(F.name)}</b>${F.line ? `<button class="w5-goto" data-goto="${F.line}">koda git →</button>` : ''}</div>
        <ul>${F.items.map(it => `<li class="${it.ok ? 'ok' : 'no'}" ${it.line ? `data-goto="${it.line}"` : ''}><span class="i">${it.ok ? '✓' : '✗'}</span><div><code>${esc(it.label)}</code>${it.msg ? `<small>${esc(it.msg)}</small>` : ''}</div></li>`).join('')}</ul>
        ${F.line ? '' : `<button class="btn sm w5-todo" data-act="todo" data-id="${fc.id}">📋 Bu sınıfın UML satırlarını koda yorum olarak ekle</button><p class="w5-itip">Yorumlar kod değildir; neyi yazman gerektiğini hatırlatır. Kodu sen yazacaksın. 😉</p>`}
      </div>` : ''}
      ${C.extra.length ? `<div class="w5-lint warn">⚠ Kodda olup UML'de olmayan sınıf: <b>${C.extra.map(esc).join(', ')}</b>. Önce tasarla, sonra kodla!</div>` : ''}
      <p class="w5-itip">İmleç hangi sınıfın içindeyse onun UML kutusu burada görünür. Satıra tıklarsan koda gider.</p>`;
  }
  function testsHTML() {
    const ks = Object.keys(TEST_LV).filter(k => TEST_LV[k] <= S.maxLevel);
    if (!Object.keys(S.tests).length) return '<div class="w5-cempty">Henüz test sonucu yok. Kodunu <b>▶ Çalıştır</b>: brifteki kurallar otomatik denenecek.</div>';
    return `<p class="w5-itip">Testler, brifteki kuralları senin sınıflarınla deneyen küçük programlar. Örneğin “Savaşçı saldırınca hedefin canı güç kadar azalmalı”.</p>
      <ul class="w5-tests">${ks.map(k => { const r = S.tests[k] || [false, 'Henüz çalışmadı']; return `<li class="${r[0] ? 'ok' : 'no'}"><span class="i">${r[0] ? '✓' : '✗'}</span><div><b>${TEST_LBL[k]}</b><small class="lv">${TEST_LV[k]}. seviye</small>${r[0] ? '' : `<small>${esc(r[1])}</small>`}</div></li>`; }).join('')}</ul>`;
  }
  function cardsHTML() {
    return `<p class="w5-itip">Örnekler bilerek <b>başka konulardan</b>: Telefon, Kedi, Araba… Kalıbı anla, kendi sınıflarına uyarla.</p>
      <div class="w5-cards">${CARDS.map(c => `<div class="w5-card ${S.cardOpen === c.k ? 'open' : ''}">
        <button class="w5-cardh" data-act="card" data-k="${c.k}"><b>${c.t}</b><code>${esc(c.uml)}</code></button>
        ${S.cardOpen === c.k ? `<pre class="w5-cardc">${hlBlock(c.code)}</pre><p class="w5-cardn">${c.note}</p>` : ''}</div>`).join('')}</div>`;
  }
  function todoFor(id) {
    const c = M().byId[id]; if (!c) return;
    const m = M(), L = [`# ┌── ${c.name}  (${KIND[c.kind].label.toLowerCase()})`];
    m.rels.filter(r => r.a === c.id && !RTYPES[r.type].ends).forEach(r => L.push(`# │ ${relSym(r.type)} ${m.byId[r.b].name}`));
    c.raw.attrs.filter(t => t.trim()).forEach(t => L.push('# │ ' + t.trim()));
    m.rels.filter(r => r.a === c.id && RTYPES[r.type].ends).forEach(r => L.push(`# │ ${relSym(r.type)} ${(r.role || '?').trim()}: ${m.byId[r.b].name} [${(r.mb || '?').trim()}]`));
    c.raw.meths.filter(t => t.trim()).forEach(t => L.push('# │ ' + t.trim()));
    L.push('# └── (sınıfı bu yorumların altına yaz)', '', '', '');
    const v = ED.ta.value, mark = v.indexOf('# ---- Deneme alanı');
    const at = mark >= 0 ? mark : v.length;
    ED.ta.focus(); ED.ta.setSelectionRange(at, at);
    insertText(L.join('\n'));
    const line = v.slice(0, at).split('\n').length;
    gotoLine(line + L.length - 3, true);
    toast(`${c.name} için yapılacaklar eklendi. Şimdi altına sınıfı yaz!`, 'good');
  }
  /* =====================================================================
     3) SAVAŞ — arena
     ===================================================================== */
  const FLOORS = {
    1: { name: 'Vize Koridoru', mons: [['Yoklama Hayaleti', 'ghost', 70, 'hayalet'], ['Sürpriz Quiz Goblini', 'goblin', 85, 'goblin']], note: 'Isınma turu: iki küçük canavar.' },
    2: { name: 'Proje Bodrumu', mons: [['Deadline Golemi', 'golem', 330, 'golem']], note: 'Her 4 turda bir “deadline uzatılır”: golem 40 can kazanır.' },
    3: { name: 'Bütünleme İni', mons: [['Bütünleme Ejderhası', 'dragon', 1000, 'ejderha']], note: 'Her 3 turda bir alev püskürtür: tüm lonca 14 hasar alır.' }
  };
  const HERO_POS = [[150, 440], [285, 505], [420, 440], [555, 505]];
  const MON_POS = { 1: [[790, 440], [940, 505]], 2: [[870, 500]], 3: [[880, 515]] };
  const MON_SCALE = { ghost: 1.1, goblin: 1.1, golem: 1.5, dragon: 1.9 };
  const ST_W = 1100, ST_H = 540;
  const DUR = { round: 450, atk: 950, heal: 900, potion: 900, crit: 850, burn: 360, aoe: 700, buff: 900 };

  function arenaShell() {
    return `
      <div class="w5-amain">
        <div class="w5-abar">
          <div class="w5-floors" id="w5-floors"></div>
          <button class="w5-fight" data-act="fight" id="w5-fight">⚔️ Savaşı başlat</button>
          <button class="btn sm" data-act="aspeed" id="w5-aspeed">Hız 1x</button>
          <button class="btn sm" data-act="askip" id="w5-askip" disabled>⏭ Sona atla</button>
        </div>
        <div class="w5-awrap" id="w5-awrap"><div class="w5-astage" id="w5-astage"></div></div>
        <div class="w5-alog" id="w5-alog"></div>
      </div>
      <aside class="w5-aside" id="w5-aside"></aside>`;
  }

  /* ---- çizimler ---- */
  const hueOf = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const weaponEmoji = n => (/terlik/i.test(n) ? '🩴' : /klavye/i.test(n) ? '⌨️' : /kalem/i.test(n) ? '✏️' : /kitap/i.test(n) ? '📕' : '🗡️');
  const potionEmoji = n => (/çay|cay/i.test(n) ? '🍵' : /kahve/i.test(n) ? '☕' : /ayran|süt|sut/i.test(n) ? '🥛' : '🧪');
  const heroKind = e => (e.chain.includes('Sifaci') ? 'healer' : e.chain.includes('Savasci') ? 'warrior' : 'custom');
  const FACE = '<circle cx="45" cy="34" r="19" fill="#F3C9A1"/><circle cx="38.5" cy="36" r="2.6" fill="#23213A"/><circle cx="51.5" cy="36" r="2.6" fill="#23213A"/><circle cx="34" cy="42" r="3" fill="#FF8FA3" opacity=".5"/><circle cx="56" cy="42" r="3" fill="#FF8FA3" opacity=".5"/><path d="M39.5 44 q5.5 4.5 11 0" stroke="#23213A" stroke-width="2" fill="none" stroke-linecap="round"/>';
  function heroSVG(e, w) {
    w = w || 90;
    const k = heroKind(e), hue = hueOf(e.cls + e.ad), h = Math.round(w * 120 / 90);
    const wpn = e.silah ? `<text x="${k === 'healer' ? 12 : 80}" y="72" font-size="24" text-anchor="middle">${weaponEmoji(e.silah[0])}</text>` : '';
    let body;
    if (k === 'warrior') {
      const c = `hsl(${(hue % 40) + 345},62%,52%)`, plume = `hsl(${(hue + 180) % 360},70%,55%)`;
      body = `<rect x="31" y="88" width="11" height="28" rx="5" fill="#3B3F5C"/><rect x="48" y="88" width="11" height="28" rx="5" fill="#3B3F5C"/>
        <rect x="14" y="58" width="11" height="28" rx="5.5" fill="${c}"/><rect x="22" y="52" width="46" height="42" rx="14" fill="${c}"/>
        <rect x="22" y="71" width="46" height="6" fill="#8C6B22"/><rect x="65" y="58" width="11" height="28" rx="5.5" fill="${c}"/>${FACE}
        <path d="M25 34 a20 20 0 0 1 40 0 v2 h-40z" fill="#AEB8C6"/><rect x="43.5" y="30" width="3" height="11" rx="1.5" fill="#AEB8C6"/><path d="M45 15 q4 -12 16 -10 q-6 4 -8 12z" fill="${plume}"/>
        <circle cx="17" cy="79" r="13" fill="#E3B54A" stroke="#8C6B22" stroke-width="3"/><path d="M17 70 v18 M8 79 h18" stroke="#8C6B22" stroke-width="3"/>${wpn || '<text x="80" y="72" font-size="24" text-anchor="middle">🗡️</text>'}`;
    } else if (k === 'healer') {
      body = `<rect x="31" y="92" width="11" height="24" rx="5" fill="#6C7BA0"/><rect x="48" y="92" width="11" height="24" rx="5" fill="#6C7BA0"/>
        <rect x="14" y="58" width="11" height="28" rx="5.5" fill="#fff" stroke="#BFE6D3" stroke-width="2"/>
        <path d="M24 56 Q45 46 66 56 L72 106 H18 Z" fill="#fff" stroke="#BFE6D3" stroke-width="2"/>
        <rect x="41" y="62" width="8" height="22" rx="2" fill="#2FA36B"/><rect x="34" y="69" width="22" height="8" rx="2" fill="#2FA36B"/>
        <rect x="65" y="58" width="11" height="28" rx="5.5" fill="#fff" stroke="#BFE6D3" stroke-width="2"/>${FACE}
        <path d="M24 38 Q22 12 45 12 Q68 12 66 38 Q63 22 45 21 Q27 22 24 38Z" fill="#fff" stroke="#BFE6D3" stroke-width="2"/>
        <rect x="75" y="30" width="4" height="84" rx="2" fill="#9C7A3C"/><text x="77" y="32" font-size="18" text-anchor="middle">🍵</text>${wpn}`;
    } else {
      const c = `hsl(${hue},60%,55%)`, d = `hsl(${hue},55%,40%)`;
      body = `<rect x="31" y="88" width="11" height="28" rx="5" fill="#3B3F5C"/><rect x="48" y="88" width="11" height="28" rx="5" fill="#3B3F5C"/>
        <rect x="14" y="58" width="11" height="28" rx="5.5" fill="${c}"/><rect x="22" y="52" width="46" height="42" rx="14" fill="${c}"/>
        <rect x="30" y="80" width="30" height="10" rx="4" fill="${d}" opacity=".5"/><rect x="65" y="58" width="11" height="28" rx="5.5" fill="${c}"/>
        <circle cx="45" cy="68" r="9" fill="#fff" opacity=".92"/><text x="45" y="72.5" text-anchor="middle" font-size="12" font-weight="800" fill="${d}" font-family="Nunito, sans-serif">${esc((e.cls || '?')[0])}</text>${FACE}
        <path d="M26 31 a19 18 0 0 1 38 0 Z" fill="${d}"/><rect x="58" y="27" width="18" height="5" rx="2.5" fill="${d}"/>${wpn || '<text x="80" y="72" font-size="22" text-anchor="middle">✨</text>'}`;
    }
    return `<svg viewBox="0 0 90 120" width="${w}" height="${h}" aria-hidden="true">${body}</svg>`;
  }
  function monSVG(kind, s) {
    s = s || 1;
    if (kind === 'ghost') return `<svg viewBox="0 0 100 110" width="${100 * s}" height="${110 * s}" aria-hidden="true">
      <path d="M18 104 V48 a32 32 0 0 1 64 0 V104 l-10.6 -9 l-10.6 9 l-10.6 -9 l-10.6 9 l-10.6 -9 z" fill="#F7F8FF" stroke="#C9CDE8" stroke-width="3"/>
      <ellipse cx="40" cy="50" rx="5" ry="7" fill="#23213A"/><ellipse cx="60" cy="50" rx="5" ry="7" fill="#23213A"/><ellipse cx="50" cy="68" rx="7" ry="5" fill="#23213A"/>
      <rect x="2" y="60" width="30" height="38" rx="3" fill="#C8A04A"/><rect x="5" y="65" width="24" height="30" fill="#fff"/><rect x="11" y="57" width="12" height="6" rx="2" fill="#8C6B22"/>
      <text x="17" y="73" font-size="5.4" text-anchor="middle" font-weight="800" fill="#23213A" font-family="Nunito, sans-serif">YOKLAMA</text>
      <path d="M8 79 h18 M8 84 h18 M8 89 h12" stroke="#B5B2C8" stroke-width="1.6"/></svg>`;
    if (kind === 'goblin') return `<svg viewBox="0 0 100 110" width="${100 * s}" height="${110 * s}" aria-hidden="true">
      <path d="M24 52 L2 34 L28 64Z" fill="#5FAF3A"/><path d="M76 52 L98 34 L72 64Z" fill="#5FAF3A"/>
      <rect x="34" y="92" width="11" height="16" rx="5" fill="#4F8F30"/><rect x="55" y="92" width="11" height="16" rx="5" fill="#4F8F30"/>
      <ellipse cx="50" cy="66" rx="30" ry="32" fill="#7CCB52"/>
      <circle cx="40" cy="56" r="7.5" fill="#FFF3A0"/><circle cx="41" cy="57" r="3.2" fill="#23213A"/><circle cx="60" cy="56" r="7.5" fill="#FFF3A0"/><circle cx="59" cy="57" r="3.2" fill="#23213A"/>
      <path d="M33 47 l12 4 M67 47 l-12 4" stroke="#3B6F22" stroke-width="3" stroke-linecap="round"/>
      <path d="M36 76 q14 14 28 0 z" fill="#23213A"/><path d="M40 76 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4" fill="#fff"/>
      <g transform="rotate(-12 18 86)"><rect x="4" y="68" width="28" height="34" rx="2" fill="#fff" stroke="#23213A" stroke-width="1.5"/><text x="18" y="82" font-size="8" text-anchor="middle" font-weight="800" fill="#D63B3B" font-family="Nunito, sans-serif">QUIZ</text><path d="M8 88 h20 M8 93 h14" stroke="#B5B2C8" stroke-width="1.5"/></g></svg>`;
    if (kind === 'golem') return `<svg viewBox="0 0 120 130" width="${120 * s}" height="${130 * s}" aria-hidden="true">
      <rect x="35" y="100" width="20" height="26" rx="5" fill="#7E8798"/><rect x="65" y="100" width="20" height="26" rx="5" fill="#7E8798"/>
      <rect x="4" y="50" width="24" height="52" rx="10" fill="#8A93A3"/><rect x="92" y="50" width="24" height="52" rx="10" fill="#8A93A3"/>
      <rect x="24" y="44" width="72" height="62" rx="12" fill="#9AA3B2"/>
      <rect x="38" y="10" width="44" height="38" rx="9" fill="#AEB6C4"/>
      <rect x="45" y="24" width="11" height="7" rx="2" fill="#FF6A3D"/><rect x="64" y="24" width="11" height="7" rx="2" fill="#FF6A3D"/><path d="M50 39 h20" stroke="#5E6676" stroke-width="3" stroke-linecap="round"/>
      <path d="M30 56 l8 8 M88 92 l-6 -9" stroke="#7E8798" stroke-width="2.5"/>
      <circle cx="60" cy="75" r="18" fill="#fff" stroke="#23213A" stroke-width="3"/><text x="60" y="80" font-size="10.5" font-weight="800" text-anchor="middle" fill="#D63B3B" font-family="JetBrains Mono, monospace">23:59</text></svg>`;
    return `<svg viewBox="0 0 160 140" width="${160 * s}" height="${140 * s}" aria-hidden="true">
      <path d="M118 104 Q150 110 156 134 Q138 118 112 116Z" fill="#6A33B8"/>
      <path d="M92 60 L132 12 L124 48 L154 40 L118 78Z" fill="#9B6BE0" stroke="#6A33B8" stroke-width="2"/>
      <rect x="62" y="108" width="15" height="26" rx="6" fill="#6A33B8"/><rect x="96" y="108" width="15" height="26" rx="6" fill="#6A33B8"/>
      <ellipse cx="88" cy="94" rx="44" ry="32" fill="#7A3FC8"/><ellipse cx="80" cy="100" rx="26" ry="20" fill="#E3D2FF"/>
      <path d="M62 82 Q40 66 42 40" stroke="#7A3FC8" stroke-width="20" fill="none" stroke-linecap="round"/>
      <ellipse cx="36" cy="32" rx="25" ry="18" fill="#7A3FC8"/>
      <path d="M40 16 L48 0 L50 18Z M26 16 L28 2 L36 16Z" fill="#F2B33D"/>
      <circle cx="28" cy="27" r="5.5" fill="#FFE066"/><circle cx="27" cy="27" r="2.4" fill="#23213A"/>
      <path d="M12 36 q8 6 18 4" stroke="#23213A" stroke-width="2" fill="none"/><circle cx="14" cy="31" r="1.6" fill="#23213A"/>
      <g transform="rotate(8 104 70)"><rect x="92" y="52" width="30" height="36" rx="2" fill="#fff" stroke="#23213A" stroke-width="1.5"/><text x="107" y="68" font-size="9" text-anchor="middle" font-weight="800" fill="#D63B3B" font-family="Nunito, sans-serif">BÜT</text><path d="M96 75 h22 M96 80 h16" stroke="#B5B2C8" stroke-width="1.5"/></g></svg>`;
  }
  function miniDragon(size) {
    size = size || 34;
    return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#6C4CE0"/>
      <path d="M12 26 Q10 14 20 11 Q31 9 31 19 Q31 27 22 28 Z" fill="#B79BFF"/><path d="M15 13 l-2 -6 l5 4z M24 10 l2 -6 l2 6z" fill="#F2B33D"/>
      <circle cx="25" cy="18" r="2.6" fill="#FFE066"/><circle cx="25.4" cy="18" r="1.2" fill="#23213A"/><path d="M16 24 q5 3 11 0" stroke="#23213A" stroke-width="1.6" fill="none"/></svg>`;
  }

  /* ---- sahne ---- */
  function stageBG(kat) {
    const torches = [[140, 70], [550, 52], [960, 70]].map(([x, y]) => `<div class="w5-torch" style="left:${x}px;top:${y}px"><i></i></div>`).join('');
    return `<div class="w5-wall"></div><div class="w5-floor"></div>${torches}
      <div class="w5-fname">${kat}. Kat · ${FLOORS[kat].name}</div>
      <div class="w5-door"></div>`;
  }
  function entHTML(e, i, x, y) {
    const isH = e.side === 'h';
    const fig = isH ? heroSVG(e, 100) : monSVG(e.sprite, MON_SCALE[e.sprite] || 1);
    return `<div class="w5-ent ${isH ? 'eh' : 'em'} ${e.sprite ? 'sp-' + e.sprite : ''}" data-i="${i}" style="left:${x}px;top:${y}px;z-index:${y}">
      <div class="w5-etop"><div class="w5-etag"><b>${esc(e.ad)}</b><small>${esc(e.var)} : ${esc(e.cls)}</small></div>
      <div class="w5-ehp"><i style="width:${clamp((e.can / (e.max || e.can || 1)) * 100, 0, 100)}%"></i><span>${e.can}</span></div></div>
      <div class="w5-efig">${fig}</div>
      ${isH ? `<div class="w5-eicons">${e.heal ? '<span class="hl" title="Iyilestirebilir">✚</span>' : ''}${e.silah ? `<span title="${esc(e.silah[0])} (+${e.silah[1]})">${weaponEmoji(e.silah[0])}</span>` : ''}${e.iksir.length ? `<span title="${esc(e.iksir.join(', '))}">${potionEmoji(e.iksir[0])}<b>${e.iksir.length}</b></span>` : ''}</div>` : ''}
      <div class="w5-ebub"></div></div>`;
  }
  function placeEnts(ents, kat) {
    let h = 0, m = 0;
    return ents.map((e, i) => {
      const p = e.side === 'h' ? HERO_POS[h++ % 4] : (MON_POS[kat][m++] || [860, 480]);
      e._x = p[0]; e._y = p[1];
      return entHTML(e, i, p[0], p[1]);
    }).join('');
  }
  function fitArena() {
    const wrap = $('#w5-awrap'), st = $('#w5-astage'); if (!wrap || !st || S.mode !== 'arena') return;
    const s = Math.max(0.3, Math.min((wrap.clientWidth - 16) / ST_W, (wrap.clientHeight - 16) / ST_H));
    st.style.transform = `scale(${s})`;
    st.style.left = (wrap.clientWidth - ST_W * s) / 2 + 'px';
    st.style.top = (wrap.clientHeight - ST_H * s) / 2 + 'px';
  }
  function idleStage() {
    const kat = S.kat, st = $('#w5-astage');
    const heroes = T.roster && T.roster.uyeler ? T.roster.uyeler.map(u => Object.assign({}, u, { max: u.can })) : [];
    const mons = FLOORS[kat].mons.map(([ad, sp, can, v]) => ({ side: 'm', ad, cls: 'Canavar', var: v, sprite: sp, can, max: can, chain: [] }));
    st.innerHTML = stageBG(kat) + placeEnts(heroes.concat(mons), kat) +
      (heroes.length ? '' : `<div class="w5-anote">${T.roster && T.roster.loading ? '⏳ Loncan kodundan okunuyor…' : 'Loncan burada görünecek.<br><small>Kodunun deneme alanında bir Lonca nesnesi üret ve üyelerini ekle.</small>'}</div>`) +
      `<div class="w5-fnote">${esc(FLOORS[kat].note)}</div>`;
    fitArena();
  }
  function renderArena() {
    const floors = [1, 2, 3].map(k => {
      const open = k === 1 || S.wins[k - 1];
      return `<button class="w5-floor-b ${S.kat === k ? 'on' : ''} ${open ? '' : 'locked'} ${S.wins[k] ? 'won' : ''}" data-act="floor" data-k="${k}" ${T.battle ? 'disabled' : ''}>
        <i>${open ? (S.wins[k] ? '✓' : k) : '🔒'}</i><span><b>${k}. Kat</b><small>${FLOORS[k].mons.map(x => x[0]).join(' + ')}</small></span></button>`;
    }).join('');
    $('#w5-floors').innerHTML = floors;
    $('#w5-aspeed').textContent = 'Hız ' + (S.aspeed || 1) + 'x';
    if (T.rosterCode !== S.code) loadRoster();
    else renderRoster();
    if (!T.battle) idleStage(); else fitArena();
    if (!$('#w5-alog').children.length) alog('<span class="c"># Savaş günlüğü: oyun motorunun senin nesnelerinde çağırdığı metotlar burada görünür.</span>', 'dim');
  }
  async function loadRoster() {
    T.rosterCode = S.code; T.roster = { loading: true };
    renderRoster(); if (!T.battle) idleStage();
    try { T.roster = await H5Py.roster(S.code); }
    catch (e) { T.roster = { fail: e && e.timeout ? 'Kod zaman aşımına uğradı (sonsuz döngü?).' : ((e && e.fatal) || String(e)) }; }
    if (S.mode === 'arena') { renderRoster(); if (!T.battle) idleStage(); }
  }
  function renderRoster() {
    const box = $('#w5-aside'), R = T.roster;
    let body;
    if (!R || R.loading) body = '<div class="w5-cempty">⏳ Loncan kodundan okunuyor…</div>';
    else if (R.err) body = `<div class="w5-cempty bad"><b>Kodun çalışırken hata veriyor.</b><div class="w5-cl err">${errHTML(R.err)}</div><button class="btn sm" data-act="mode" data-m="code">Kodla'ya git</button></div>`;
    else if (R.fail) body = `<div class="w5-cempty bad">${esc(R.fail)}<br><button class="btn sm" data-act="mode" data-m="code">Kodla'ya git</button></div>`;
    else {
      body = `<div class="w5-lname"><b>“${esc(R.lonca)}”</b><small>${esc(R.var)}.uyeler · ${R.uyeler.length}/4</small></div>
        <div class="w5-roster">${R.uyeler.map(u => `<div class="w5-ru">
          <div class="f">${heroSVG(u, 44)}</div>
          <div class="d"><b>${esc(u.ad)}</b><code>${esc(u.var)} : ${esc(u.cls)}</code>
            <div class="ch">${u.chain.map((c, i) => `<span class="${i ? (c === 'Iyilestirebilir' ? 'if' : 'up') : 'me'}">${i ? (c === 'Iyilestirebilir' ? '┄▷ ' : '──▷ ') : ''}${esc(c)}</span>`).join('')}</div>
            <div class="st"><span title="can">❤ ${u.can}</span><span title="guc">💪 ${u.guc == null ? '?' : u.guc}</span>${u.silah ? `<span>${weaponEmoji(u.silah[0])} +${u.silah[1]}</span>` : ''}${u.iksir.length ? `<span>${potionEmoji(u.iksir[0])} ×${u.iksir.length}</span>` : ''}</div></div></div>`).join('') || '<div class="w5-cempty">Loncada üye yok.</div>'}</div>
        ${R.rules && R.rules.length ? `<div class="w5-rules"><b>⚖️ Hakem itiraz ediyor:</b>${R.rules.map(x => `<div>• ${esc(x)}</div>`).join('')}</div>` : ''}`;
    }
    box.innerHTML = `<h3>🛡️ Loncan</h3>${body}
      <div class="w5-poly"><b>🤖 Motor seni nasıl tanıyor?</b>
        <p>Oyun motoru senin sınıflarını <i>bilmiyor</i>. Sadece şunu yapıyor:</p>
        <pre>${hlBlock('for k in lonca.uyeler:\n    if isinstance(k, Iyilestirebilir) and yarali:\n        k.iyilestir(yarali)\n    else:\n        k.saldir(dusman)')}</pre>
        <p>Hangi <code>saldir()</code>'ın çalışacağına nesnenin <b>sınıfı</b> karar verir. Şifacı ile İksir'i ise aynı <b>arayüzden</b> tanır.</p></div>
      <button class="btn sm" data-act="reroster">↻ Kodumdan yeniden oku</button>`;
  }
  function alog(html, cls) {
    const L = $('#w5-alog'); if (!L) return;
    const d = document.createElement('div'); d.className = 'lg ' + (cls || ''); d.innerHTML = html;
    L.appendChild(d);
    while (L.children.length > 300) L.firstChild.remove();
    L.scrollTop = L.scrollHeight;
  }

  /* ---- savaş ---- */
  async function fight() {
    if (T.battle) return;
    if (S.kat > 1 && !S.wins[S.kat - 1]) { toast('Önce bir önceki katı geçmelisin.', 'info'); return; }
    const btn = $('#w5-fight'); btn.disabled = true; btn.textContent = '⏳ Motor hazırlanıyor…';
    $('#w5-alog').innerHTML = '';
    let r;
    try { r = await H5Py.arena(S.code, S.kat, Math.floor(Math.random() * 1e9)); }
    catch (e) { r = { fail: e && e.timeout ? 'Savaş 15 saniyede bitmedi: bir metodun sonsuz döngüde olabilir.' : ((e && e.fatal) || String(e)) }; }
    btn.disabled = false; btn.textContent = '⚔️ Savaşı başlat';
    if (r.err) { alog(`<div class="w5-cl err">${errHTML(r.err)}</div>`); toast('Kodun hata veriyor; önce Kodla sekmesinde düzelt.', 'bad'); return; }
    if (r.fail) { alog(`<span class="e">⚠ ${esc(r.fail)}</span>`); toast(r.fail, 'bad', 5200); return; }
    if (!r.ok && r.rules) {
      modal(`<h3>⚖️ Hakem düdüğü çaldı!</h3><p>Loncan arena kurallarına uymuyor:</p><ul>${r.rules.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="w5-sub">Kurallar: can ≤ 150 · guc ≤ 25 · silah ≤ 20 · iksir ≤ 40 · envanterde ≤ 3 iksir · loncada ≤ 4 üye</p>`, [{ label: 'Kodla\'ya git', cls: 'w5-go', fn: () => setMode('code') }]);
      return;
    }
    r.ents.forEach((e, i) => { e.max = r.max[i]; });
    T.battle = { r, i: 0, hp: r.ents.map(e => e.can), kat: S.kat, timer: null, skip: false, errs: {} };
    $('#w5-astage').innerHTML = stageBG(S.kat) + placeEnts(r.ents, S.kat) + '<div class="w5-banner" id="w5-banner"></div>';
    fitArena();
    $('#w5-askip').disabled = false;
    renderArena();
    alog('<span class="c"># Motor çalışıyor: her tur kahramanlar, sonra canavarlar hareket eder.</span>', 'dim');
    step();
  }
  function stopBattle() {
    const B = T.battle; if (!B) return;
    clearTimeout(B.timer); T.battle = null;
    const sk = $('#w5-askip'); if (sk) sk.disabled = true;
  }
  function step() {
    const B = T.battle; if (!B) return;
    if (B.i >= B.r.ev.length) { endBattle(); return; }
    const e = B.r.ev[B.i++];
    const d = playEv(e, B);
    B.timer = setTimeout(step, B.skip ? 0 : d / (S.aspeed || 1));
  }
  const entEl = i => root.querySelector(`.w5-ent[data-i="${i}"]`);
  function bubble(i, text, ms) {
    const el = entEl(i); if (!el) return;
    const b = el.querySelector('.w5-ebub'); b.textContent = text; b.classList.add('show');
    clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('show'), ms || 1500);
  }
  function floatAt(i, text, cls) {
    const el = entEl(i); if (!el) return;
    const f = document.createElement('div'); f.className = 'w5-float ' + (cls || ''); f.textContent = text;
    el.appendChild(f); setTimeout(() => f.remove(), 1200);
  }
  function setHP(i, v, B) {
    B.hp[i] = v;
    const el = entEl(i); if (!el) return;
    const e = B.r.ents[i];
    el.querySelector('.w5-ehp i').style.width = clamp((v / e.max) * 100, 0, 100) + '%';
    el.querySelector('.w5-ehp span').textContent = v;
    if (v <= 0 && !el.classList.contains('dead')) {
      el.classList.add('dead');
      const st = document.createElement('div'); st.className = 'w5-stamp ' + (e.side === 'h' ? 'ff' : 'aa');
      st.textContent = e.side === 'h' ? 'FF 😵' : 'AA ✓'; el.appendChild(st);
      alog(e.side === 'h' ? `<span class="e"># 😵 ${esc(e.ad)} bütünlemeye kaldı!</span>` : `<span class="ok"># ✅ ${esc(e.ad)} yenildi! Dersi geçtin.</span>`);
    }
  }
  function playEv(e, B) {
    const fast = B.skip;
    if (e.t === 'round') {
      alog(`<span class="r">── Tur ${e.n} ──</span>`);
      if (!fast) { const b = $('#w5-banner'); if (b) { b.textContent = 'Tur ' + e.n; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); } }
      return DUR.round;
    }
    if (e.t === 'aoe') {
      alog(`<span class="e"># 🔥 ${esc(B.r.ents[e.a].ad)}: ${esc(e.say || '')}</span>`);
      if (!fast) { bubble(e.a, e.say || '🔥', 1600); const st = $('#w5-astage'); st.classList.remove('fire'); void st.offsetWidth; st.classList.add('fire'); }
      return DUR.aoe;
    }
    const A = B.r.ents[e.a], G = e.g != null ? B.r.ents[e.g] : null;
    const ch = Object.entries(e.d || {}).map(([i, [a, b]]) => `${B.r.ents[i].var}: ${a} → ${b}`).join(', ');
    alog(`<span class="call">${esc(e.call)}</span>${ch ? `<span class="c">   # ${esc(ch)}</span>` : ''}`, e.t);
    (e.out || []).forEach(l => alog(`<span class="say">💬 ${esc(A.ad)}: ${esc(l)}</span>`));
    if (e.err) {
      const x = H5Py.explain(e.err, { abstractByDesign });
      alog(`<div class="w5-cl err"><div class="t">💥 ${esc(A.ad)} (${esc(A.cls)}) kodunda hata: ${esc(x.title)}${e.err.line ? ` <small>· ${e.err.line}. satır</small>` : ''}</div><div class="tip">${esc(x.tip)}</div><div class="raw">${esc(e.err.type)}: ${esc(e.err.msg)}</div></div>`);
      alog(`<span class="e"># ${esc(A.ad)} savaştan çekildi.</span>`);
      if (!fast) bubble(e.a, '💥 Hata!', 1800);
      const el = entEl(e.a); if (el) el.classList.add('off');
      if (!B.errs[e.a]) { B.errs[e.a] = 1; toast(`💥 ${A.ad} kodunda hata: ${x.title}`, 'bad', 4200); }
    }
    if (!fast) {
      const say = (e.out && e.out[0]) || e.say;
      if (say) bubble(e.a, say.length > 60 ? say.slice(0, 58) + '…' : say, 1700);
      const ae = entEl(e.a), ge = G ? entEl(e.g) : null;
      if (e.t === 'atk' && ae && ge && e.a !== e.g) {
        const dx = (G._x - A._x) * 0.5, dy = (G._y - A._y) * 0.35;
        ae.animate([{ transform: 'translate(-50%,-100%)' }, { transform: `translate(-50%,-100%) translate(${dx}px,${dy}px)`, offset: 0.4 }, { transform: 'translate(-50%,-100%)' }], { duration: 480 / (S.aspeed || 1), easing: 'ease-out' });
      }
      if (e.t === 'crit' && ge) { floatAt(e.g, '🩴 KRİTİK!', 'crit'); const st = $('#w5-astage'); st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake'); }
      if (e.t === 'heal' && ge) floatAt(e.g, '✨', 'fx');
      if (e.t === 'potion') floatAt(e.a, potionEmoji(A.iksir[0] || ''), 'fx');
      if (e.t === 'burn' && ge) floatAt(e.g, '🔥', 'fx');
      if (e.t === 'buff') floatAt(e.a, '⏰', 'fx');
    }
    Object.entries(e.d || {}).forEach(([i, [a, b]]) => {
      i = +i;
      setTimeout(() => {
        if (!T.battle) return;
        if (!fast) {
          floatAt(i, (b > a ? '+' : '') + (b - a), b > a ? 'heal' : 'dmg');
          if (b < a) { const el = entEl(i); if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); } }
        }
        setHP(i, b, B);
      }, fast ? 0 : 260 / (S.aspeed || 1));
    });
    return e.err ? 1200 : DUR[e.t] || 800;
  }
  function endBattle() {
    const B = T.battle; if (!B) return;
    const r = B.r, kat = B.kat;
    setTimeout(() => {
      if (T.battle !== B) return;
      stopBattle();
      if (r.win === true) {
        const first = !S.wins[kat] || S.wins[kat] === 'ogretmen';
        S.wins[kat] = true; saveNow();
        confetti(); if (kat === 3) setTimeout(confetti, 600);
        const msg = { 1: ['Vize koridoru temiz! 🎉', 'Yoklama alındı, quiz bitti. Sıradaki kat açıldı.'], 2: ['Deadline\'a yetiştin! 🎉', 'Golem un ufak oldu. Son kat seni bekliyor…'], 3: ['BÜTÜNLEMEYE KALMADIN! 🎓🐉', 'Bütünleme Ejderhası yenildi. Lonca efsane oldu!'] }[kat];
        modal(`<div class="w5-lvup-art">${kat === 3 ? miniDragon(110) : '🏆'}</div><span class="tag">${r.rounds} turda zafer</span><h3>${msg[0]}</h3><p>${msg[1]}</p>${first ? '' : '<p class="w5-sub">(Bu katı daha önce de geçmiştin.)</p>'}`,
          [{ label: 'Tekrar savaş', fn: fight }, { label: kat < 3 ? 'Sonraki kat →' : 'Harika!', cls: 'w5-go', fn: () => { if (kat < 3) { S.kat = kat + 1; save(); renderArena(); } } }]);
        evaluate();
      } else {
        const tips = [];
        const us = r.ents.filter(e => e.side === 'h');
        if (!us.some(u => u.heal)) tips.push('Loncanda iyileştirebilen kimse yok.');
        if (us.length < 4) tips.push(`Loncada ${us.length} üye var; 4 olabilir.`);
        if (!us.some(u => u.iksir.length)) tips.push('Kimsenin envanterinde iksir yok.');
        if (us.some(u => (u.guc || 0) < 20 || u.can < 130)) tips.push('Bazı üyelerin can/güç değerleri kural sınırının altında.');
        if (kat === 3 && !us.some(u => heroKind(u) === 'custom')) tips.push('Kendi icat ettiğin sınıf ejderhaya karşı fark yaratabilir.');
        if (Object.keys(B.errs).length) tips.push('Bazı üyeler kod hatası yüzünden savaştan çekildi!');
        modal(`<div class="w5-lvup-art">${r.win === false ? '😈' : '⏰'}</div><h3>${r.win === false ? 'Lonca bütünlemeye kaldı!' : 'Süre doldu! Kâğıtlar toplandı.'}</h3>
          <p>${r.win === false ? 'Canavarlar bu sefer kazandı. Ama hiçbir sınav tek denemelik değil. 😅' : '30 tur bitti ve kimse kazanamadı. Hasar verecek biri var mı?'}</p>
          ${tips.length ? `<ul>${tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p>Şans da bir faktör: bir daha dene!</p>'}`,
        [{ label: 'Kodla\'ya git', fn: () => setMode('code') }, { label: 'Tekrar savaş', cls: 'w5-go', fn: fight }]);
      }
      renderArena();
    }, B.skip ? 100 : 700);
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
    const menu = $('#w5-menu');
    if (!menu.hidden && !t.closest('.w5-menu')) menu.hidden = true;
    if (t.closest('#w5-v-design')) { onDesignClick(e); return; }
    const g = t.closest('[data-goto]'); if (g && !t.closest('[data-act]')) { if (S.mode !== 'code') setMode('code'); gotoLine(+g.dataset.goto); return; }
    const sn = t.closest('[data-snip]'); if (sn) { snippet(+sn.dataset.snip); return; }
    if (t.closest('#w5-lintchip')) { gotoLine(+$('#w5-lintchip').dataset.line); return; }
    const b = t.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (b.closest('#w5-menu')) menu.hidden = true;
    switch (act) {
      case 'home': stopBattle(); if (window.NYP) window.NYP.home(); break;
      case 'mode': setMode(b.dataset.m); break;
      case 'menu': menu.hidden = !menu.hidden; break;
      case 'pdf': exportPdf(); break;
      case 'journal': S.journal = !S.journal; save(); renderTop(); setTimeout(() => { fitArena(); }, 260); break;
      case 'jlv': { const n = +b.dataset.lv; if (n > S.maxLevel) { toast(`${n}. seviye henüz kilitli.`, 'info'); break; } S.jlv = n === S.maxLevel ? null : n; save(); renderJournal(); break; }
      case 'guide': guide(); break;
      case 'quiz': quiz(); break;
      case 'help': help(); break;
      case 'teacher': if (OGR()) teacher(); break;
      case 'reset': resetAll(); break;
      case 'run': runCode(); break;
      case 'clearcon': clearConsole(); break;
      case 'tab': S.sideTab = b.dataset.tab; save(); if (S.mode !== 'code') setMode('code'); renderCodeSide(); break;
      case 'card': S.cardOpen = S.cardOpen === b.dataset.k ? null : b.dataset.k; save(); renderCodeSide(); break;
      case 'fcls': { T.focusCls = b.dataset.id; renderCodeSide(); const F = conformance().byClass[T.focusCls]; if (F && F.line) gotoLine(F.line); break; }
      case 'todo': todoFor(b.dataset.id); break;
      case 'floor': { const k = +b.dataset.k; if (k > 1 && !S.wins[k - 1]) { toast(`${k}. kat kilitli: önce ${k - 1}. katı geç.`, 'info'); break; } S.kat = k; save(); renderArena(); break; }
      case 'fight': fight(); break;
      case 'aspeed': S.aspeed = ({ 1: 2, 2: 4, 4: 0.5, 0.5: 1 })[S.aspeed || 1]; save(); b.textContent = 'Hız ' + S.aspeed + 'x'; break;
      case 'askip': if (T.battle) { T.battle.skip = true; clearTimeout(T.battle.timer); step(); } break;
      case 'reroster': T.rosterCode = null; loadRoster(); break;
    }
  }
  function onKeyGlobal(e) {
    if (!root || root.hidden) return;
    const modalOpen = !$('#nyp-modal').hidden;
    if (e.key === 'Escape') {
      if (modalOpen) { closeModal(); return; }
      const menu = $('#w5-menu'); if (!menu.hidden) { menu.hidden = true; return; }
    }
    if (modalOpen) return;
    if (S.mode === 'design' && !e.target.closest('.w5-code,.w5-journal')) onDesignKey(e);
  }

  function mount(el) {
    root = el;
    ensureGlobals();
    root.innerHTML = shellHTML();
    ED.ta = $('#w5-ta'); ED.hl = $('#w5-hl'); ED.gut = $('#w5-gut');
    ED.ta.value = S.code;
    // tıklama, sürükleme, yazma
    root.addEventListener('click', onClick);
    root.addEventListener('pointerdown', e => { if (S.mode === 'design' && e.target.closest('#w5-v-design')) onDesignDown(e); });
    window.addEventListener('pointermove', e => { if (T.drag) onDesignMove(e); });
    window.addEventListener('pointerup', e => { if (T.drag) onDesignUp(e); });
    root.addEventListener('dblclick', e => { if (S.mode === 'design') onDesignDbl(e); });
    root.addEventListener('input', e => { if (e.target.closest('#w5-v-design')) onDesignInput(e); });
    root.addEventListener('focusin', e => {
      const b = e.target.closest('.w5-box');
      if (b && (!T.sel || T.sel.id !== b.dataset.cid)) select({ t: 'c', id: b.dataset.cid });
    });
    root.addEventListener('toggle', e => {
      const d = e.target; if (!d.classList || !d.classList.contains('w5-letter')) return;
      S.letterClosed = S.letterClosed || {}; S.letterClosed[d.dataset.lv] = !d.open; save();
    }, true);
    document.addEventListener('keydown', onKeyGlobal);
    $('#w5-cv').addEventListener('wheel', e => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const r = $('#w5-cv').getBoundingClientRect();
      setZoom(S.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    // editör
    ED.ta.addEventListener('keydown', onEdKey);
    ED.ta.addEventListener('input', onEdInput);
    ED.ta.addEventListener('scroll', syncScroll);
    ['keyup', 'click', 'select'].forEach(k => ED.ta.addEventListener(k, updateCur));
    $('#w5-repl').addEventListener('keydown', e => {
      const i = e.target;
      if (e.key === 'Enter') { e.preventDefault(); const v = i.value; i.value = ''; replRun(v); }
      else if (e.key === 'ArrowUp' && ED.hist.length) { e.preventDefault(); ED.hi = Math.max(0, ED.hi - 1); i.value = ED.hist[ED.hi] || ''; }
      else if (e.key === 'ArrowDown' && ED.hist.length) { e.preventDefault(); ED.hi = Math.min(ED.hist.length, ED.hi + 1); i.value = ED.hist[ED.hi] || ''; }
    });
    window.addEventListener('resize', () => { if (root.hidden) return; if (S.mode === 'arena') fitArena(); });
    H5Py.onStatus(setPyStatus);
    const showT = () => { const b = $('#w5-tbtn'); if (b) b.hidden = !OGR(); };
    showT(); document.addEventListener('nyp-ogretmen', showT);
    touch(); evaluate(true); renderAll();
    if (!S.intro) setTimeout(help, 350);
    setTimeout(() => { H5Py.boot().then(() => lintSoon()).catch(() => { /* çip gösterir */ }); }, 1200);
  }
  function refresh() { renderAll(); if (S.mode === 'design') setTimeout(drawEdges, 30); }

  function heroArt() {
    return `<div class="w5-art">
      <div class="w5-art-uml a"><div class="h"><small>«abstract»</small><i>Karakter</i></div><div class="s"><span class="pub">+</span> ad: str<br><span class="priv">−</span> can: int<br><span class="prot">#</span> guc: int</div><div class="s"><i><span class="pub">+</span> saldir(hedef): None</i></div></div>
      <svg class="w5-art-tri" viewBox="0 0 40 70" aria-hidden="true"><path d="M20 70 V18" stroke="#2D2A4A" stroke-width="3"/><path d="M20 2 L8 20 H32 Z" fill="#fff" stroke="#2D2A4A" stroke-width="3" stroke-linejoin="round"/></svg>
      <div class="w5-art-uml b"><div class="h"><b>Savasci</b></div><div class="s"><span class="pub">+</span> saldir(hedef): None</div></div>
      <div class="w5-art-hero">${heroSVG({ chain: ['Savasci'], cls: 'Savasci', ad: 'Ali', silah: ['Annenin Terliği', 20], iksir: [] }, 92)}</div>
      <div class="w5-art-vs">VS</div>
      <div class="w5-art-mon">${monSVG('dragon', 1.05)}</div>
    </div>`;
  }

  return { mount, refresh, heroArt };
})();
