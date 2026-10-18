/* =========================================================================
   4. HAFTA — Dino Vadisi: UML Sınıf Diyagramı Atölyesi
   Öğrenciler sınıf kartlarını tuvale sürükler, özellik/metot ekler,
   erişim belirleyicileri (+ # −) ayarlar, sınıflar arasında ilişki kurar,
   nesne üretir ve simülasyonda nesnelerin metotlarını çalışırken izler.
   ========================================================================= */
window.Hafta4 = (function () {
  'use strict';

  /* ---------------- küçük yardımcılar ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rfl = (a, b) => Math.round(rnd(a, b) * 10) / 10;
  const uid = () => Math.random().toString(36).slice(2, 9);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const strip = s => s.replace(/<[^>]+>/g, '');

  /* ---------------- veri ---------------- */
  const COLORS = {
    'yeşil': '#43B86B', 'mor': '#9B6BF2', 'turuncu': '#FF8A3D', 'mavi': '#3D9BFF',
    'pembe': '#FF6FB5', 'sarı': '#F2C230', 'kırmızı': '#EF4B4B', 'turkuaz': '#1FB5AD'
  };
  const CN = Object.keys(COLORS);
  const DINO_NAMES = ['Rexy', 'Pıtırcık', 'Kemik', 'Zıpzıp', 'Bulut', 'Fıstık', 'Lav', 'Şimşek', 'Minnoş'];
  const PEOPLE = ['Ayşe', 'Mert', 'Elif', 'Can', 'Zeynep', 'Emre', 'Deniz', 'Ece', 'Kerem', 'Su', 'Bora', 'Defne'];
  const BAR = { enerji: '#22B064', aclik: '#FF8A3D', yakit: '#3D8BFF', temizlik: '#20B2C2', mutluluk: '#FF5FA2' };
  const LABEL_KEY = { dino: 'ad', bakici: 'ad', zyr: 'ad', cip: 'plaka' };

  const A = (key, type, gen, rec, hint) => ({ key, type, gen, rec: rec || null, hint });
  const M = (key, anim, say, hint, x) => Object.assign({ key, anim, say, hint }, x || {});

  const KINDS = {
    dino: {
      label: 'Dinozor', suggest: 'Dinozor', level: 1, color: '#2E9E5B', soft: '#E2F5E9',
      intro: 'Parkın yıldızları: yürür, koşar, kükrer. <b>renk</b> ve <b>boy</b> özellikleri çizimi değiştirir.',
      attrs: [
        A('ad', 'str', () => pick(DINO_NAMES), null, 'Dinozorun adı (çizimde görünür)'),
        A('tur', 'str', () => pick(['T-Rex', 'Triceratops', 'Stegozor', 'Raptor', 'Brontozor']), null, 'Türü'),
        A('renk', 'color', () => pick(CN), null, 'Rengi; eklersen dinozor renklenir'),
        A('boy', 'float', () => rfl(2.5, 6), null, 'Boyu (metre); büyüdükçe çizim de büyür'),
        A('yas', 'int', () => rint(1, 40), null, 'Yaşı'),
        A('enerji', 'int', () => rint(60, 100), '#', '0-100 arası enerji; koşunca azalır, uyuyunca dolar'),
        A('aclik', 'int', () => rint(10, 45), '#', '0-100 arası açlık; zamanla artar, yiyince azalır'),
        A('hiz', 'int', () => rint(3, 9), null, '1-10 arası hız; simülasyonda ne kadar hızlı gittiği'),
        A('cipNo', 'str', () => 'DN-' + rint(1000, 9999), '-', 'Mikroçip numarası; asla değiştirilmemeli!')
      ],
      methods: [
        M('yuru', 'walk', 'Yürüyüş zamanı', 'Parkta yürür'),
        M('kos', 'run', 'Koşuyorum!', 'Hızla koşar, enerji harcar', { fx: [['enerji', -15]] }),
        M('ye', 'eat', 'Nyam nyam!', 'Yemek yer, açlığı azalır', { fx: [['aclik', -45]] }),
        M('uyu', 'sleep', 'Zzz...', 'Uyur, enerjisi dolar', { fx: [['enerji', '=', 100]] }),
        M('kukre', 'roar', 'ROOAAR!', 'Kükrer; yakındaki insanlar irkilir'),
        M('zipla', 'jump', 'Hop!', 'Zıplar', { fx: [['enerji', -5]] }),
        M('kuyrukSalla', 'wag', 'Çok mutluyum!', 'Kuyruğunu sallar'),
        M('buyu', 'grow', 'Büyüyorum!', 'Biraz büyür (boy ve yaş artar)', { fx: [['boy', 0.3], ['yas', 1]] })
      ]
    },
    bakici: {
      label: 'Bakıcı', suggest: 'Bakici', level: 2, color: '#E07A2E', soft: '#FDEBDC',
      intro: 'Dinozorları besler, parkı korur. <b>maas</b> ve <b>sicilNo</b> gizli kalmalı!',
      attrs: [
        A('ad', 'str', () => pick(PEOPLE), null, 'Bakıcının adı'),
        A('sicilNo', 'str', () => 'BK-' + rint(100, 999), '-', 'Personel sicil numarası; gizli bilgi'),
        A('maas', 'int', () => rint(30, 48) * 1000, '-', 'Aylık maaş (TL); kimse görmemeli'),
        A('deneyimYili', 'int', () => rint(1, 20), '#', 'Kaç yıldır çalışıyor'),
        A('sapkaRengi', 'color', () => pick(CN), null, 'Şapkasının rengi (çizime yansır)'),
        A('telsizKanali', 'int', () => rint(1, 16), '#', 'Telsiz kanalı'),
        A('cesaret', 'int', () => rint(50, 100), null, '0-100 arası cesaret'),
        A('vardiya', 'str', () => pick(['Sabah', 'Akşam', 'Gece']), null, 'Çalışma vardiyası')
      ],
      methods: [
        M('devriyeGez', 'walk', 'Devriye vakti!', 'Parkta dolaşır'),
        M('yemVer', 'feed', 'Yemek geldi!', 'Bağlı olduğu dinozora yemek verir. Bakıcı → Dinozor ilişkisi gerekir.', { param: { rel: 'bakar', name: 'dinozor' }, calls: 'ye' }),
        M('dudukCal', 'whistle', 'Fiiiit!', 'Düdük çalar, baktığı dinozorlar yanına koşar'),
        M('selamVer', 'wave', 'Merhaba!', 'El sallar'),
        M('fotografCek', 'photo', 'Gülümse!', 'Fotoğraf çeker'),
        M('telsizleKonus', 'talk', 'Merkez, her şey yolunda!', 'Telsizle konuşur'),
        M('cipSur', 'ride', 'Cipe biniyorum!', 'Cipe binip sürer. Bakıcı → Cip ilişkisi gerekir.', { param: { rel: 'kullanir', name: 'cip' }, calls: 'sur' }),
        M('yuvaTemizle', 'cleanHome', 'Temizlik zamanı!', 'Bir yuvayı temizler. Bakıcı → Yuva ilişkisi gerekir.', { param: { rel: 'temizler', name: 'yuva' }, calls: 'temizle' })
      ]
    },
    yuva: {
      label: 'Yuva', suggest: 'Yuva', level: 3, color: '#B07A1E', soft: '#F8EDD8',
      intro: 'Dinozorların yaşadığı çitli alan. Ağaç sayısı, gölet ve sıcaklık çizimde görünür.',
      attrs: [
        A('ad', 'str', () => pick(['Volkan Vadisi', 'Palmiye Koyu', 'Eğrelti Ormanı', 'Kristal Göl']), null, 'Yuvanın adı (tabelada görünür)'),
        A('alan', 'int', () => rint(5, 20) * 100, null, 'Alan (m²)'),
        A('sicaklik', 'int', () => rint(20, 36), null, 'Sıcaklık (°C); zemin rengini değiştirir'),
        A('kapasite', 'int', () => rint(2, 6), null, 'En fazla kaç dinozor yaşayabilir'),
        A('temizlik', 'int', () => rint(45, 90), '#', '0-100 arası temizlik; zamanla azalır'),
        A('kapiKodu', 'str', () => String(rint(1000, 9999)), '-', 'Kapının şifresi; kesinlikle gizli!'),
        A('bitkiSayisi', 'int', () => rint(2, 5), null, 'Ağaç sayısı (çizime yansır)'),
        A('gol', 'bool', () => Math.random() < 0.7, null, 'Gölet var mı? True / False')
      ],
      methods: [
        M('kapiAc', 'gateOpen', 'Kapı açıldı', 'Kapıyı açar'),
        M('kapiKapat', 'gateClose', 'Kapı kapandı', 'Kapıyı kapatır'),
        M('sula', 'water', 'Fışşş!', 'Bitkileri sular'),
        M('isiAyarla', 'heat', 'Sıcaklık 28°C', 'Sıcaklığı 28 dereceye ayarlar', { fx: [['sicaklik', '=', 28]] }),
        M('bitkiDik', 'plant', 'Yeni ağaç!', 'Bir ağaç diker', { fx: [['bitkiSayisi', 1]] }),
        M('alarmCal', 'alarm', 'ALARM!', 'Alarm çalar'),
        M('temizle', 'clean', 'Pırıl pırıl!', 'Yuvayı temizler', { fx: [['temizlik', '=', 100]] })
      ]
    },
    cip: {
      label: 'Cip', suggest: 'Cip', level: 3, color: '#2F74D0', soft: '#E1ECFB',
      intro: 'Parkın arazi aracı. Bakıcılar kullanır; yakıtı azalır, farları yanar.',
      attrs: [
        A('plaka', 'str', () => '34 DNO ' + rint(100, 999), null, 'Plaka (çizimde görünür)'),
        A('renk', 'color', () => pick(CN), null, 'Rengi (çizime yansır)'),
        A('yakit', 'int', () => rint(40, 100), '#', '0-100 arası yakıt'),
        A('hiz', 'int', () => rint(4, 9), null, '1-10 arası hız'),
        A('kapasite', 'int', () => rint(2, 6), null, 'Kaç kişilik'),
        A('motorNo', 'str', () => 'MTR-' + rint(10000, 99999), '-', 'Motor seri numarası; gizli'),
        A('kilometre', 'int', () => rint(1000, 40000), null, 'Toplam kilometre'),
        A('farlarAcik', 'bool', () => false, null, 'Farlar açık mı? True / False (çizime yansır)')
      ],
      methods: [
        M('sur', 'drive', 'Vınnn!', 'Parkta sürer, yakıt harcar', { fx: [['yakit', -10], ['kilometre', 12]] }),
        M('kornaCal', 'honk', 'Bip bip!', 'Korna çalar'),
        M('farYak', 'light', 'Farlar açık!', 'Farları yakar', { fx: [['farlarAcik', '=', true]] }),
        M('yakitAl', 'fuel', 'Depo full!', 'Benzinliğe gidip yakıt alır', { fx: [['yakit', '=', 100]] }),
        M('dur', 'stop', 'Durdum.', 'Durur'),
        M('turbo', 'turbo', 'TURBOOO!', 'Çok hızlı gider, çok yakıt harcar', { fx: [['yakit', -25], ['kilometre', 30]] }),
        M('muzikAc', 'music', '♪ ♫ ♪', 'Müzik açar')
      ]
    },
    zyr: {
      label: 'Ziyaretçi', suggest: 'Ziyaretci', level: 5, color: '#8A57E8', soft: '#EFE7FD',
      intro: 'Parkı gezen misafirler. <b>biletNo</b> ve <b>bakiye</b> gizli kalmalı.',
      attrs: [
        A('ad', 'str', () => pick(PEOPLE), null, 'Ziyaretçinin adı'),
        A('yas', 'int', () => rint(7, 65), null, 'Yaşı'),
        A('biletNo', 'str', () => 'TKT-' + rint(1000, 9999), '-', 'Bilet numarası; gizli'),
        A('bakiye', 'int', () => rint(150, 500), '-', 'Cüzdandaki para (TL); gizli'),
        A('favoriDinozor', 'str', () => pick(DINO_NAMES), null, 'En sevdiği dinozor'),
        A('kiyafetRengi', 'color', () => pick(CN), null, 'Kıyafet rengi (çizime yansır)'),
        A('mutluluk', 'int', () => rint(50, 80), '#', '0-100 arası mutluluk'),
        A('sapkaVar', 'bool', () => Math.random() < 0.5, null, 'Şapka takıyor mu? True / False')
      ],
      methods: [
        M('gez', 'walk', 'Ne güzel park!', 'Parkı gezer'),
        M('fotografCek', 'photo', 'Çekiyorum!', 'Fotoğraf çeker'),
        M('dondurmaYe', 'icecream', 'Mmm dondurma!', 'Dondurma yer', { fx: [['bakiye', -30], ['mutluluk', 10]] }),
        M('elSalla', 'wave', 'Selaaam!', 'El sallar'),
        M('dinozorIzle', 'watch', 'Vaaay!', 'Bir dinozoru izler. Ziyaretçi → Dinozor ilişkisi gerekir.', { param: { rel: 'izler', name: 'dinozor' }, fx: [['mutluluk', 20]] }),
        M('hediyelikAl', 'gift', 'Peluş dino aldım!', 'Hediyelik eşya alır', { fx: [['bakiye', -50], ['mutluluk', 15]] }),
        M('alkisla', 'clap', 'Bravooo!', 'Alkışlar')
      ]
    }
  };
  const KIND_ORDER = ['dino', 'bakici', 'yuva', 'cip', 'zyr'];
  const CODE_ORDER = ['yuva', 'dino', 'cip', 'bakici', 'zyr'];
  const HOME_POS = { zyr: [40, 40], dino: [390, 40], yuva: [740, 40], cip: [40, 720], bakici: [390, 720] };
  const LIMIT = { dino: 8, bakici: 4, yuva: 3, cip: 3, zyr: 5 };
  const CV_W = 1700, CV_H = 1500;

  const RELS = [
    { key: 'bakar', from: 'bakici', to: 'dino', label: 'bakar', m1: '1', m2: '1..*', attr: 'dinozorlar', many: true, why: 'Bir bakıcı bir ya da daha çok (1..*) dinozora bakar.' },
    { key: 'yasar', from: 'dino', to: 'yuva', label: 'yaşar', m1: '*', m2: '1', attr: 'yuva', many: false, why: 'Her dinozor tek (1) yuvada yaşar; bir yuvada çok (*) dinozor olabilir.' },
    { key: 'kullanir', from: 'bakici', to: 'cip', label: 'kullanır', m1: '1', m2: '0..1', attr: 'cip', many: false, why: 'Bir bakıcı en fazla bir (0..1) cip kullanır.' },
    { key: 'temizler', from: 'bakici', to: 'yuva', label: 'temizler', m1: '1..*', m2: '*', attr: 'yuvalar', many: true, why: 'Bakıcılar yuvaları temizler.' },
    { key: 'izler', from: 'zyr', to: 'dino', label: 'izler', m1: '*', m2: '*', attr: 'izlenenler', many: true, why: 'Çok ziyaretçi çok dinozoru izleyebilir (* — *).' }
  ];
  const REL = Object.fromEntries(RELS.map(r => [r.key, r]));
  const NO_REL = {
    'cip|dino': 'Dinozorlar araba kullanamaz 🙂',
    'cip|yuva': 'Cip ile Yuva arasında doğrudan bir ilişki yok.',
    'cip|zyr': 'Ziyaretçiler parkın cipini kullanamaz, sadece bakıcılar!',
    'yuva|zyr': 'Ziyaretçiler yuvalara giremez, güvenlik!',
    'bakici|zyr': 'Bu parkta bakıcı ile ziyaretçi arasında bir ilişki tanımlı değil.'
  };

  const VIS = {
    '+': { name: 'public', cls: 'v-pub', sym: '+', py: n => n, info: 'herkes erişebilir' },
    '#': { name: 'protected', cls: 'v-prot', sym: '#', py: n => '_' + n, info: 'sınıfın kendisi ve alt sınıfları erişir (Python’da _ ile başlar)' },
    '-': { name: 'private', cls: 'v-priv', sym: '−', py: n => '__' + n, info: 'yalnızca sınıfın kendi içinden erişilir (Python’da __ ile başlar)' }
  };
  const VIS_NEXT = { '+': '-', '-': '#', '#': '+' };
  const BEHAVIORS = [['jump', 'Zıpla'], ['spin', 'Kendi etrafında dön'], ['dance', 'Dans et'], ['talk', 'Konuş'], ['walk', 'Yürü'], ['run', 'Koş']];
  const PY_RESERVED = ['class', 'def', 'self', 'return', 'if', 'else', 'elif', 'for', 'while', 'in', 'is', 'not', 'and', 'or', 'true', 'false', 'none', 'import', 'from', 'pass', 'lambda', 'global', 'with', 'try', 'except'];

  const LEVELS = [
    { n: 1, title: 'İlk Sınıfım', unlock: ['dino'], concept: '<b>Sınıf</b> bir şablondur: <b>adı</b>, <b>özellikleri</b> (verileri) ve <b>metotları</b> (davranışları) vardır. UML kutusu bu üç bölmeden oluşur.' },
    { n: 2, title: 'Gizli Bilgiler', unlock: ['bakici'], concept: '<b>Kapsülleme:</b> Bazı bilgiler dışarıdan değiştirilmemeli. <b>+</b> public: herkes · <b>#</b> protected: sınıf ve alt sınıflar · <b>−</b> private: sadece sınıfın içi.' },
    { n: 3, title: 'Bağlantılar', unlock: ['yuva', 'cip'], concept: '<b>İlişki (association):</b> Bir sınıf başka bir sınıfı kullanır. Çizginin uçlarındaki <code>1</code>, <code>*</code>, <code>1..*</code> kaç nesnenin bağlandığını söyler.' },
    { n: 4, title: 'Nesneler Canlanıyor', unlock: [], concept: '<b>Nesne (object):</b> Sınıftan üretilen somut örnektir. Aynı sınıftan farklı değerlerle birçok nesne üretilir. UML’de <u>rexy : Dinozor</u> diye yazılır.' },
    { n: 5, title: 'Usta Tasarımcı', unlock: ['zyr'], concept: 'Artık tasarım senin! Kendi özellik ve metotlarını yaz, bütün parkı canlandır.' }
  ];

  const MISSIONS = [
    { id: 'm1', lv: 1, text: '<b>Dinozor</b> sınıf kartını tuvale sürükle, kutuya büyük harfle başlayan bir ad yaz.', ok: () => named('dino') },
    { id: 'm2', lv: 1, text: 'Dinozor sınıfına en az <b>6 özellik</b> ekle.', ok: () => nA('dino') >= 6 },
    { id: 'm3', lv: 1, text: 'Dinozor sınıfına en az <b>5 metot</b> ekle.', ok: () => nM('dino') >= 5 },
    { id: 'm4', lv: 1, text: 'Sağdaki <b>Canlı Önizleme</b>de bir metoda tıkla, ne yaptığını gör.', ok: () => ev('preview') },
    { id: 'm5', lv: 2, text: '<code>cipNo</code> özelliğini <b>private (−)</b> yap. Çip numarasını kimse değiştirmemeli!', ok: () => visOf('dino', 'cipNo') === '-' },
    { id: 'm6', lv: 2, text: '<code>enerji</code> ya da <code>aclik</code> özelliğini <b>protected (#)</b> yap.', ok: () => visOf('dino', 'enerji') === '#' || visOf('dino', 'aclik') === '#' },
    { id: 'm7', lv: 2, text: '<b>Bakıcı</b> sınıfını oluştur: en az 6 özellik, 5 metot.', ok: () => named('bakici') && nA('bakici') >= 6 && nM('bakici') >= 5 },
    { id: 'm8', lv: 2, text: 'Bakıcının <code>maas</code> ve <code>sicilNo</code> özelliklerini <b>private</b> yap.', ok: () => visOf('bakici', 'maas') === '-' && visOf('bakici', 'sicilNo') === '-' },
    { id: 'm9', lv: 3, text: '🔗 düğmesiyle <b>Bakıcı → Dinozor</b> ilişkisini kur.', ok: () => relOn('bakar') },
    { id: 'm10', lv: 3, text: 'Bakıcıya <code>yemVer()</code>, Dinozora <code>ye()</code> ekle. Bakıcı, dinozorun ye() metodunu çağıracak.', ok: () => hasM('bakici', 'yemVer') && hasM('dino', 'ye') },
    { id: 'm11', lv: 3, text: '<b>Yuva</b> sınıfını oluştur (en az 5 özellik, 4 metot) ve <b>Dinozor → Yuva</b> ilişkisini kur.', ok: () => named('yuva') && nA('yuva') >= 5 && nM('yuva') >= 4 && relOn('yasar') },
    { id: 'm12', lv: 3, text: '<b>Cip</b> sınıfını oluştur (en az 5 özellik, 4 metot) ve <b>Bakıcı → Cip</b> ilişkisini kur.', ok: () => named('cip') && nA('cip') >= 5 && nM('cip') >= 4 && relOn('kullanir') },
    { id: 'm13', lv: 4, text: '<b>Nesneler</b> sekmesinden <b>3 Dinozor nesnesi</b> üret; renkleri birbirinden farklı olsun.', ok: () => distinctDinoColors() >= 3 },
    { id: 'm14', lv: 4, text: 'Bakıcı, Yuva ve Cip sınıflarından en az birer nesne üret.', ok: () => objsOf('bakici').length > 0 && objsOf('yuva').length > 0 && objsOf('cip').length > 0 },
    { id: 'm15', lv: 4, text: '▶ <b>Simülasyonu başlat</b> ve nesnelerin metotlarını izle.', ok: () => ev('sim') },
    { id: 'm16', lv: 4, text: 'Simülasyonda bir nesneye tıkla, <b>private</b> bir özelliği dışarıdan değiştirmeyi dene.', ok: () => ev('private') },
    { id: 'm17', lv: 5, text: '<b>Ziyaretçi</b> sınıfını oluştur (en az 5 özellik, 4 metot) ve <b>Ziyaretçi → Dinozor</b> ilişkisini kur.', ok: () => named('zyr') && nA('zyr') >= 5 && nM('zyr') >= 4 && relOn('izler') },
    { id: 'm18', lv: 5, text: '<b>Bakıcı → Yuva</b> ilişkisini kur ve Bakıcıya <code>yuvaTemizle()</code> ekle.', ok: () => relOn('temizler') && hasM('bakici', 'yuvaTemizle') },
    { id: 'm19', lv: 5, text: 'Bir sınıfa <b>kendi özelliğini</b> yaz (kutudaki “+ kendi özelliğin”).', ok: () => S.classes.some(c => c.attrs.some(a => a.custom)) },
    { id: 'm20', lv: 5, text: 'Bir sınıfa <b>kendi metodunu</b> yaz ve ona bir davranış seç.', ok: () => S.classes.some(c => c.methods.some(m => m.custom)) },
    { id: 'm21', lv: 5, text: 'Simülasyonda <b>Metot çağır</b> düğmeleriyle bir metodu elle çağır.', ok: () => ev('manual') },
    { id: 'm22', lv: 5, text: 'Final: <b>5 sınıf</b>, <b>5 ilişki</b> ve toplam <b>50+ üye</b> ile simülasyonu çalıştır.', ok: () => ev('simFull') }
  ];

  /* ---------------- durum ---------------- */
  const SAVE_KEY = 'nyp-hafta4-dino-v1';
  const fresh = () => ({ classes: [], rels: [], objects: [], events: {}, done: {}, maxLevel: 1, zoom: 1, tab: 'dino', side: 'gorev', tipVis: false, finished: false });
  let S = load() || fresh();
  const T = { connectFrom: null, form: null, flash: null, pop: null, iedit: null, quiet: false, ignoreClick: 0 };
  let root = null, D = null, SIM = null;

  function load() {
    try { const t = localStorage.getItem(SAVE_KEY); return t ? Object.assign(fresh(), JSON.parse(t)) : null; } catch (_) { return null; }
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (_) { /* depolama yoksa sorun değil */ } }

  const getC = k => S.classes.find(c => c.kind === k);
  const hasA = (c, k) => !!c && c.attrs.some(a => a.key === k);
  const hasM = (k, m) => { const c = getC(k); return !!c && c.methods.some(x => x.key === m); };
  const nA = k => { const c = getC(k); return c ? c.attrs.length : 0; };
  const nM = k => { const c = getC(k); return c ? c.methods.length : 0; };
  const named = k => { const c = getC(k); return !!c && nameCheck(c).ok; };
  const visOf = (k, key) => { const c = getC(k); const a = c && c.attrs.find(x => x.key === key); return a ? a.vis : null; };
  const relOn = key => S.rels.includes(key) && !!getC(REL[key].from) && !!getC(REL[key].to);
  const objsOf = k => S.objects.filter(o => o.kind === k);
  const ev = k => !!S.events[k];
  const cname = k => { const c = getC(k); return c && c.name.trim() ? c.name.trim() : KINDS[k].suggest; };
  const pyN = m => VIS[m.vis].py(m.key);
  const totalMembers = () => S.classes.reduce((s, c) => s + c.attrs.length + c.methods.length, 0);
  function distinctDinoColors() {
    const c = getC('dino'); if (!hasA(c, 'renk')) return 0;
    return new Set(objsOf('dino').map(o => o.v.renk)).size;
  }

  function nameCheck(c) {
    const n = (c.name || '').trim();
    if (!n) return { ok: false, msg: 'Sınıfa bir ad ver' };
    if (/\s/.test(n)) return { ok: false, msg: 'Adda boşluk olmamalı' };
    if (!/^[A-Za-zÇĞİÖŞÜçğıöşü_][A-Za-z0-9ÇĞİÖŞÜçğıöşü_]*$/.test(n)) return { ok: false, msg: 'Sadece harf, rakam ve _' };
    if (!/^[A-ZÇĞİÖŞÜ]/.test(n)) return { ok: false, msg: 'Büyük harfle başlamalı (PascalCase)' };
    if (S.classes.some(o => o !== c && (o.name || '').trim() === n)) return { ok: false, msg: 'Bu ad başka sınıfta var' };
    return { ok: true, msg: '✓ Geçerli sınıf adı' };
  }

  function attrDef(c, a) {
    if (a.custom) return { key: a.key, type: a.type, hint: 'Senin yazdığın özellik', gen: () => ({ str: 'deger', int: rint(1, 10), float: 1.5, bool: true })[a.type] };
    return KINDS[c.kind].attrs.find(x => x.key === a.key);
  }
  function methodDef(kind, m) {
    if (m.custom) return { key: m.key, anim: m.anim, say: m.key + '()!', hint: 'Senin yazdığın metot', custom: true };
    return KINDS[kind].methods.find(x => x.key === m.key);
  }
  const typeStr = t => (t === 'color' ? 'str' : t);
  const fmt = v => (typeof v === 'boolean' ? (v ? 'True' : 'False') : typeof v === 'number' ? String(Math.round(v * 10) / 10) : '"' + v + '"');

  /* ---------------- çizimler (SVG) ---------------- */
  function dinoSVG(L) {
    return `<svg class="spr" viewBox="0 0 120 96" width="${Math.round(120 * L.s)}" height="${Math.round(96 * L.s)}" style="--b:${L.color}" aria-hidden="true">
      <path class="tail fb" d="M40 54 C22 58 8 50 1 34 C5 58 22 72 46 70 Z"/>
      <rect class="leg l1 fd" x="40" y="68" width="11" height="22" rx="5"/>
      <rect class="leg l2 fd" x="60" y="68" width="11" height="22" rx="5"/>
      <path class="fd" d="M33 50 l4 -10 l5 7 l4 -11 l5 9 l5 -10 l4 9 l5 -8 l3 10 Z"/>
      <ellipse class="fb" cx="55" cy="58" rx="25" ry="19"/>
      <ellipse class="fl" cx="60" cy="64" rx="15" ry="11"/>
      <path class="fb" d="M63 52 C66 38 70 30 74 24 L88 28 C84 40 82 50 80 62 Z"/>
      <rect class="arm fd" x="77" y="53" width="6" height="12" rx="3"/>
      <rect class="jaw fb" x="76" y="27" width="32" height="11" rx="5"/>
      <rect class="fb" x="70" y="8" width="42" height="26" rx="13"/>
      <g class="eye-open"><circle cx="97" cy="18" r="5.5" fill="#fff"/><circle cx="98.5" cy="18" r="3" fill="#1C2A35"/></g>
      <path class="zz" d="M92 19 q5 3 10 0" stroke="#1C2A35" stroke-width="2" fill="none"/>
      <circle cx="108" cy="16" r="1.4" fill="#1C2A35" opacity=".5"/>
      <circle cx="90" cy="27" r="3" fill="#FF8FA3" opacity=".55"/>
      <path d="M84 33 Q96 36 108 32" stroke="#1C2A35" stroke-width="1.5" fill="none" opacity=".4"/>
    </svg>`;
  }
  function personSVG(L) {
    let hat;
    if (L.kind === 'bakici') hat = '<ellipse class="hat" cx="30" cy="15" rx="21" ry="4.5"/><path class="hat" d="M19 15 Q20 2 30 2 Q40 2 41 15 Z"/><rect x="19" y="11" width="22" height="3" fill="#1C2A35" opacity=".3"/>';
    else if (L.cap) hat = '<path class="hat" d="M17 19 a13 12 0 0 1 26 0 Z"/><rect class="hat" x="38" y="16" width="14" height="4" rx="2"/>';
    else hat = '<path d="M16 22 a14 14 0 0 1 28 0 q-7 -5 -14 -4 q-7 -1 -14 4Z" fill="#6B4A2E"/>';
    const extra = L.kind === 'bakici'
      ? '<path d="M25 47 l5 -4 l5 4 l-2 6 h-6Z" fill="#FFD64D"/>'
      : '<rect x="22" y="48" width="16" height="11" rx="3" fill="#1C2A35"/><circle cx="30" cy="53.5" r="3.4" fill="#9EC9FF"/>';
    return `<svg class="spr" viewBox="0 0 60 100" width="${Math.round(60 * L.s)}" height="${Math.round(100 * L.s)}" style="--shirt:${L.shirt};--hat:${L.hat}" aria-hidden="true">
      <rect class="leg l1" x="20" y="66" width="9" height="30" rx="4" fill="${L.pants}"/>
      <rect class="leg l2" x="31" y="66" width="9" height="30" rx="4" fill="${L.pants}"/>
      <rect class="arm a1 shirt" x="8" y="40" width="9" height="25" rx="4.5"/>
      <rect class="shirt" x="14" y="37" width="32" height="34" rx="11"/>
      <rect class="arm a2 shirt" x="43" y="40" width="9" height="25" rx="4.5"/>
      <circle cx="30" cy="24" r="13" fill="#F3C9A1"/>
      <g class="eye-open"><circle cx="25.5" cy="24" r="1.9" fill="#1C2A35"/><circle cx="34.5" cy="24" r="1.9" fill="#1C2A35"/></g>
      <path d="M25 30 q5 4 10 0" stroke="#1C2A35" stroke-width="1.6" fill="none"/>
      ${hat}${extra}
    </svg>`;
  }
  function jeepSVG(L) {
    const wheel = x => `<g class="wheel"><circle cx="${x}" cy="64" r="13" fill="#2B3440"/><circle cx="${x}" cy="64" r="5.5" fill="#C9D2DA"/><rect x="${x - 1}" y="52" width="2" height="7" fill="#C9D2DA"/></g>`;
    return `<svg class="spr ${L.lights ? 'lights-on' : ''}" viewBox="0 0 132 80" width="${Math.round(132 * L.s)}" height="${Math.round(80 * L.s)}" style="--b:${L.color}" aria-hidden="true">
      <circle cx="7" cy="46" r="8" fill="#2B3440"/>
      <path class="fb" d="M30 36 L40 12 H88 L100 36 Z"/>
      <path d="M43 32 L49 17 H70 V32 Z" fill="#D5F0FF"/>
      <path d="M74 32 V17 H85 L93 32 Z" fill="#D5F0FF"/>
      <rect class="fb" x="8" y="34" width="116" height="28" rx="9"/>
      <rect x="8" y="44" width="116" height="5" fill="#fff" opacity=".55"/>
      <rect class="fd" x="112" y="52" width="14" height="6" rx="3"/>
      <circle class="light" cx="119" cy="41" r="4.5"/>
      ${wheel(34)}${wheel(98)}
    </svg>`;
  }
  function yuvaHTML(L) {
    const trees = Array.from({ length: L.trees }, (_, i) => (i % 2 ? '🌳' : '🌴')).join('');
    return `<div class="yv ${L.mini ? 'mini' : ''}" style="--ground:${L.ground}">
      ${L.name != null ? `<div class="yv-sign">${esc(L.name)}${L.bar || ''}</div>` : ''}
      <div class="yv-trees">${trees}</div>${L.pond ? '<div class="yv-pond"></div>' : ''}<div class="yv-gate"></div>
    </div>`;
  }
  function spriteSVG(L) {
    if (L.kind === 'dino') return dinoSVG(L);
    if (L.kind === 'cip') return jeepSVG(L);
    return personSVG(L);
  }
  function lookOf(c, v, scale) {
    scale = scale || 1;
    const has = k => hasA(c, k);
    const col = (k, def) => (has(k) && COLORS[v[k]] ? COLORS[v[k]] : def);
    switch (c.kind) {
      case 'dino': { const boy = has('boy') ? clamp(+v.boy || 4, 1, 12) : 4; return { kind: 'dino', color: col('renk', '#A9B5AF'), s: scale * (0.62 + boy * 0.085) }; }
      case 'bakici': return { kind: 'bakici', shirt: '#B9A26A', hat: col('sapkaRengi', '#7D8A6A'), pants: '#5E6B4E', s: scale * 0.82 };
      case 'zyr': { const sh = col('kiyafetRengi', '#B8BBC9'); return { kind: 'zyr', shirt: sh, hat: sh, cap: has('sapkaVar') && !!v.sapkaVar, pants: '#3F5A8A', s: scale * 0.74 }; }
      case 'cip': return { kind: 'cip', color: col('renk', '#9AA3AD'), lights: has('farlarAcik') && !!v.farlarAcik, s: scale * 0.85 };
      case 'yuva': {
        const t = has('sicaklik') ? +v.sicaklik : 26;
        return {
          kind: 'yuva', name: has('ad') ? v.ad : null, trees: has('bitkiSayisi') ? clamp(+v.bitkiSayisi || 0, 0, 14) : 2,
          pond: has('gol') && !!v.gol, ground: t < 24 ? '#BFE7C9' : t > 31 ? '#F1DDA2' : '#D3EDB3',
          bar: has('temizlik') ? `<span class="sp-bar"><i style="width:${clamp(+v.temizlik, 0, 100)}%;background:${BAR.temizlik}"></i></span>` : ''
        };
      }
    }
  }
  function barsInner(c, v) {
    if (c.kind === 'yuva') return '';
    return Object.keys(BAR).filter(k => hasA(c, k)).map(k =>
      `<div class="sp-bar" title="${k}"><i style="width:${clamp(+v[k] || 0, 0, 100)}%;background:${BAR[k]}"></i></div>`).join('');
  }
  function miniIcon(kind) {
    const c = { kind, attrs: [] };
    if (kind === 'yuva') return '<svg viewBox="0 0 40 30" width="40" height="30" aria-hidden="true"><rect x="3" y="6" width="34" height="21" rx="5" fill="#D3EDB3" stroke="#B07A1E" stroke-width="2.5" stroke-dasharray="4 3"/><circle cx="28" cy="20" r="4" fill="#7FCBF0"/><path d="M11 22 v-8 M8 15 q3 -5 6 0" stroke="#2E9E5B" stroke-width="2.5" fill="none"/></svg>';
    const L = lookOf(c, {}, 0.3);
    if (kind === 'dino') L.color = KINDS.dino.color;
    if (kind === 'cip') L.color = KINDS.cip.color;
    if (kind === 'bakici') L.hat = KINDS.bakici.color;
    if (kind === 'zyr') { L.shirt = KINDS.zyr.color; L.hat = KINDS.zyr.color; L.cap = true; }
    L.s = kind === 'dino' ? 0.32 : kind === 'cip' ? 0.3 : 0.3;
    return spriteSVG(L);
  }
  function bigIcon(kind, w) {
    w = w || 150;
    if (kind === 'yuva') return `<div style="width:${w}px;height:${Math.round(w * 0.64)}px">${yuvaHTML({ name: 'Yuva', trees: 3, pond: true, ground: '#D3EDB3', mini: true })}</div>`;
    const L = lookOf({ kind, attrs: [] }, {}, 1);
    if (kind === 'dino') L.color = KINDS.dino.color;
    if (kind === 'cip') L.color = KINDS.cip.color;
    if (kind === 'bakici') L.hat = KINDS.bakici.color;
    if (kind === 'zyr') { L.shirt = KINDS.zyr.color; L.hat = KINDS.zyr.color; L.cap = true; }
    return spriteSVG(L);
  }
  const ANIMS = ['walk', 'run', 'sleep', 'roar', 'wag', 'grow', 'eat', 'jump', 'spin', 'dance', 'talk', 'drive', 'honk'];
  function animCss(a) {
    if (!a) return '';
    if (ANIMS.includes(a)) return 'a-' + a;
    if (['turbo', 'ride', 'fuel'].includes(a)) return 'a-drive';
    if (a === 'icecream') return 'a-eat';
    return 'a-talk';
  }

  /* ---------------- iskelet ---------------- */
  function shellHTML() {
    return `
    <header class="w4-top">
      <button class="btn" data-act="home">← Haftalar</button>
      <div class="w4-title"><small>4. Hafta · UML Sınıf Diyagramı</small><b>Dino Vadisi</b></div>
      <div class="levels" id="h4-levels"></div>
      <div class="score" id="h4-score" title="Her görev 10 yıldız">⭐ 0</div>
      <div class="w4-actions">
        <button class="btn" data-act="pdf" title="UML diyagramını PDF olarak indir">📄 PDF</button>
        <button class="btn" data-act="teacher" id="h4-tbtn" ${window.NYP_OGRETMEN ? '' : 'hidden'}>Öğretmen</button>
        <button class="btn" data-act="reset">↺ Sıfırla</button>
        <button class="btn lava" data-act="run">▶ Simülasyonu Başlat</button>
      </div>
    </header>
    <div class="w4-main">
      <aside class="palette">
        <div class="ptabs" id="h4-ptabs"></div>
        <div class="pbody" id="h4-pbody"></div>
        <div class="p-info" id="h4-pinfo">Bir parçanın üstüne gel; ne işe yaradığını burada gör.</div>
        <div class="legend">
          <div class="lg-h">Erişim belirleyiciler</div>
          <div><span class="vis-sym v-pub">+</span><span><b>public</b>: herkes erişir</span></div>
          <div><span class="vis-sym v-prot">#</span><span><b>protected</b>: sınıf ve alt sınıflar</span></div>
          <div><span class="vis-sym v-priv">−</span><span><b>private</b>: sadece sınıfın içi</span></div>
          <div style="color:var(--muted);font-size:12.5px">Kutudaki simgeye tıklayarak değiştir.</div>
        </div>
      </aside>
      <section class="canvas-wrap">
        <div class="connect-banner" id="h4-banner" hidden></div>
        <div class="canvas" id="h4-cv">
          <div class="canvas-sizer" id="h4-sizer">
            <div class="canvas-inner" id="h4-inner">
              <svg class="rel-svg" id="h4-rels" width="${CV_W}" height="${CV_H}"></svg>
              <div id="h4-boxes"></div>
              <div class="canvas-empty" id="h4-empty"><b>UML tuvali</b>Soldaki <b>Dinozor</b> sınıf kartını tut ve buraya sürükle. Sonra özellikleri ve metotları kutunun içine bırak.</div>
            </div>
          </div>
        </div>
        <div class="canvas-tools">
          <button data-act="zoomout" title="Uzaklaş">−</button><span id="h4-zoom">100%</span><button data-act="zoomin" title="Yakınlaş">+</button>
          <button data-act="layout" title="Kutuları düzenli yerleştir">Düzenle</button>
        </div>
      </section>
      <aside class="side">
        <div class="side-h"><h2>Canlı Önizleme</h2><small>metoda tıkla, dene</small></div>
        <div class="preview" id="h4-preview"></div>
        <div class="stabs" id="h4-stabs"></div>
        <div class="spanel" id="h4-sp"></div>
      </aside>
    </div>`;
  }

  /* ---------------- çizim (render) ---------------- */
  function renderAll(opts) {
    opts = opts || {};
    const ae = document.activeElement;
    const fid = ae && ae.id && root.contains(ae) ? ae.id : null;
    let ss = null, se = null;
    try { ss = ae.selectionStart; se = ae.selectionEnd; } catch (_) { /* yok */ }
    renderTop(); renderPalette(); renderCanvas();
    if (!opts.keepPreview) renderPreview();
    renderSide();
    if (fid) {
      const el = document.getElementById(fid);
      if (el) { el.focus({ preventScroll: true }); try { if (ss != null) el.setSelectionRange(ss, se); } catch (_) { /* sayı alanı */ } }
    }
  }

  function renderTop() {
    $('#h4-levels').innerHTML = LEVELS.map(L => {
      const ms = MISSIONS.filter(m => m.lv === L.n), d = ms.filter(m => S.done[m.id]).length;
      const st = L.n > S.maxLevel ? 'lock' : d === ms.length ? 'done' : 'on';
      return `<span class="lv-pill ${st}" title="Seviye ${L.n}: ${L.title}">${st === 'lock' ? '🔒' : st === 'done' ? '✓' : ''} ${L.n}. ${st === 'on' ? L.title : ''}</span>`;
    }).join('');
    $('#h4-score').textContent = '⭐ ' + Object.keys(S.done).length * 10 + ' / ' + MISSIONS.length * 10;
  }

  function renderPalette() {
    $('#h4-ptabs').innerHTML = KIND_ORDER.map(k => {
      const K = KINDS[k], locked = K.level > S.maxLevel;
      return `<button class="ptab ${S.tab === k ? 'on' : ''} ${locked ? 'locked' : ''}" data-act="ptab" data-kind="${k}" style="--k:${K.color};--ks:${K.soft}">
        <span class="mini">${miniIcon(k)}</span>${K.label}${locked ? '<span class="lk">🔒</span>' : ''}</button>`;
    }).join('');
    const k = S.tab, K = KINDS[k], c = getC(k);
    const body = $('#h4-pbody');
    body.style.setProperty('--k', K.color); body.style.setProperty('--ks', K.soft);
    if (K.level > S.maxLevel) {
      body.innerHTML = `<div class="p-locked"><div class="mini">${bigIcon(k, 118)}</div><b>${K.label}</b>${LEVELS[K.level - 1].n}. seviyede açılır. Önce görevleri tamamla!</div>`;
      return;
    }
    const used = (type, key) => !!c && (type === 'attr' ? c.attrs : c.methods).some(x => x.key === key);
    body.innerHTML = `
      <button class="p-class ${c ? 'placed' : ''}" data-drag="class" data-kind="${k}">
        <span class="mini">${bigIcon(k, 62)}</span>
        <span><b>${K.label}</b><span>${c ? '✓ Tuvalde' : 'Sınıf kartı · tuvale sürükle'}</span></span>
      </button>
      <p class="p-intro">${K.intro}</p>
      <h4>Özellikler <small>kutuya sürükle</small></h4>
      <div class="chips">${K.attrs.map(a => `<button class="chip ${used('attr', a.key) ? 'used' : ''}" data-drag="attr" data-kind="${k}" data-key="${a.key}">${a.key}<span class="ty">: ${typeStr(a.type)}</span></button>`).join('')}</div>
      <h4>Metotlar <small>kutuya sürükle</small></h4>
      <div class="chips">${K.methods.map(m => `<button class="chip meth ${used('meth', m.key) ? 'used' : ''}" data-drag="meth" data-kind="${k}" data-key="${m.key}">${m.key}()</button>`).join('')}</div>
      <p class="p-intro" style="font-size:12.5px">İpucu: Bir parçaya tıklamak da onu kutuya ekler.</p>`;
  }

  function rowHTML(c, type, m) {
    const V = VIS[m.vis];
    let txt;
    if (type === 'attr') {
      txt = `<span class="${m.custom ? 'cu' : ''}">${m.key}</span>: <span class="ty">${typeStr(m.type)}</span>`;
    } else {
      const d = methodDef(c.kind, m);
      const p = d && d.param ? `${d.param.name}: ${cname(REL[d.param.rel].to)}` : '';
      txt = `<span class="${m.custom ? 'cu' : ''}">${m.key}</span>(<span class="ty">${p}</span>)<span class="ty">: None</span>`;
    }
    const pop = T.pop === `${c.kind}:${type}:${m.key}` ? 'pop' : '';
    return `<div class="ub-row ${pop}" data-type="${type}" data-key="${m.key}">
      <button class="vis-sym ${V.cls}" data-act="vis" title="${V.name}: ${V.info}. Değiştirmek için tıkla.">${V.sym}</button>
      <span class="ub-txt">${txt}</span>
      <button class="x" data-act="delm" title="Kaldır">×</button></div>`;
  }
  function formHTML(c, sec) {
    if (!T.form || T.form.kind !== c.kind || T.form.sec !== sec) {
      return `<button class="ub-add" data-act="${sec === 'attr' ? 'addAttr' : 'addMeth'}">+ kendi ${sec === 'attr' ? 'özelliğin' : 'metodun'}</button>`;
    }
    const sel = sec === 'attr'
      ? `<select id="f-${c.kind}-t">${['str', 'int', 'float', 'bool'].map(t => `<option ${T.form.t === t ? 'selected' : ''}>${t}</option>`).join('')}</select>`
      : `<select id="f-${c.kind}-t">${BEHAVIORS.map(b => `<option value="${b[0]}" ${T.form.t === b[0] ? 'selected' : ''}>${b[1]}</option>`).join('')}</select>`;
    return `<div class="ub-form">
      <input id="f-${c.kind}-n" placeholder="${sec === 'attr' ? 'ozellikAdi' : 'metotAdi'}" value="${esc(T.form.n || '')}" spellcheck="false" autocomplete="off">
      ${sel}<button data-act="formOk">Ekle</button><button class="no" data-act="formNo">Vazgeç</button>
      ${T.form.err ? `<span class="err">${T.form.err}</span>` : ''}</div>`;
  }
  function boxHTML(c) {
    const K = KINDS[c.kind], nc = nameCheck(c);
    return `<div class="uml-box ${T.connectFrom === c.kind ? 'connecting' : ''}" data-kind="${c.kind}" style="left:${c.x}px;top:${c.y}px;--k:${K.color};--ks:${K.soft}">
      <div class="ub-head" data-drag="box">
        <span class="ub-icon">${miniIcon(c.kind)}</span>
        <div class="ub-namewrap">
          <span class="ub-stereo">«sınıf» · ${K.label}</span>
          <input class="ub-name" id="nm-${c.kind}" data-name="${c.kind}" value="${esc(c.name)}" placeholder="Sınıf adı yaz" spellcheck="false" autocomplete="off" aria-label="Sınıf adı">
          <span class="ub-namehint ${nc.ok ? 'ok' : 'bad'}">${nc.msg}</span>
        </div>
        <button class="ub-btn link" data-act="link" title="İlişki kur: tıkla, sonra hedef sınıfa tıkla">🔗</button>
        <button class="ub-btn" data-act="delbox" title="Sınıfı sil">✕</button>
      </div>
      <div class="ub-sec">
        ${c.attrs.map(a => rowHTML(c, 'attr', a)).join('') || '<div class="ub-empty">Özellikleri buraya bırak</div>'}
        ${formHTML(c, 'attr')}
      </div>
      <div class="ub-sec">
        ${c.methods.map(m => rowHTML(c, 'meth', m)).join('') || '<div class="ub-empty">Metotları buraya bırak</div>'}
        ${formHTML(c, 'meth')}
      </div>
    </div>`;
  }

  function renderCanvas() {
    const z = S.zoom;
    $('#h4-sizer').style.width = CV_W * z + 'px';
    $('#h4-sizer').style.height = CV_H * z + 'px';
    $('#h4-inner').style.transform = `scale(${z})`;
    $('#h4-zoom').textContent = Math.round(z * 100) + '%';
    $('#h4-boxes').innerHTML = S.classes.map(boxHTML).join('');
    $('#h4-empty').hidden = S.classes.length > 0;
    root.classList.toggle('connect-mode', !!T.connectFrom);
    const b = $('#h4-banner');
    b.hidden = !T.connectFrom;
    if (T.connectFrom) b.innerHTML = `🔗 <span>${cname(T.connectFrom)} ile ilişki kurulacak sınıfa tıkla</span><button data-act="cancelLink">Vazgeç (Esc)</button>`;
    T.pop = null;
    drawRels();
  }

  function rectOf(el) { return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; }
  function edgePt(r, tx, ty) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    const s = Math.min((r.w / 2) / Math.abs(dx || 1e-9), (r.h / 2) / Math.abs(dy || 1e-9));
    return { x: cx + dx * s, y: cy + dy * s };
  }
  function drawRels() {
    let out = `<defs><marker id="h4-arrow" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="13" markerHeight="13" orient="auto"><path d="M1 1 L11 6 L1 11" fill="none" stroke="#405563" stroke-width="2"/></marker></defs>`;
    S.rels.forEach(key => {
      const R = REL[key];
      const a = $(`.uml-box[data-kind="${R.from}"]`, root), b = $(`.uml-box[data-kind="${R.to}"]`, root);
      if (!a || !b) return;
      const ra = rectOf(a), rb = rectOf(b);
      const p1 = edgePt(ra, rb.x + rb.w / 2, rb.y + rb.h / 2), p2 = edgePt(rb, ra.x + ra.w / 2, ra.y + ra.h / 2);
      const dx = p2.x - p1.x, dy = p2.y - p1.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      let nx = -uy, ny = ux;
      if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      out += `<line class="rel-line" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" marker-end="url(#h4-arrow)"/>`;
      out += `<text class="rel-mult" x="${p1.x + ux * 24 + nx * 14}" y="${p1.y + uy * 24 + ny * 14}" text-anchor="middle" dominant-baseline="middle">${R.m1}</text>`;
      out += `<text class="rel-mult" x="${p2.x - ux * 26 + nx * 14}" y="${p2.y - uy * 26 + ny * 14}" text-anchor="middle" dominant-baseline="middle">${R.m2}</text>`;
      out += `<text class="rel-label" x="${mx + nx * 16}" y="${my + ny * 16}" text-anchor="middle" dominant-baseline="middle">${R.label}</text>`;
      out += `<g class="rel-del" data-rdel="${key}" transform="translate(${mx - nx * 16},${my - ny * 16})"><title>İlişkiyi sil</title><circle r="10"/><text text-anchor="middle" dominant-baseline="central">×</text></g>`;
    });
    $('#h4-rels').innerHTML = out;
  }

  function sampleVals(c) {
    const o = objsOf(c.kind)[0];
    const v = {};
    c.attrs.forEach(a => {
      if (o && a.key in o.v) v[a.key] = o.v[a.key];
      else { const d = attrDef(c, a); v[a.key] = demoVal(c.kind, a.key, d); }
    });
    return v;
  }
  // Önizlemede rastgele değil sabit örnek değerler göster (titreşmesin)
  function demoVal(kind, key, d) {
    const fixed = { renk: kind === 'cip' ? 'mavi' : 'yeşil', ad: kind === 'dino' ? 'Rexy' : kind === 'yuva' ? 'Volkan Vadisi' : kind === 'zyr' ? 'Deniz' : 'Ayşe', boy: 4.5, enerji: 80, aclik: 40, yakit: 70, temizlik: 70, mutluluk: 70, sapkaRengi: 'turuncu', kiyafetRengi: 'mor', sapkaVar: true, bitkiSayisi: 3, gol: true, sicaklik: 26, plaka: '34 DNO 042', farlarAcik: true };
    if (key in fixed) return fixed[key];
    return d ? d.gen() : '';
  }

  function previewFigure(c) {
    const v = sampleVals(c);
    if (c.kind === 'yuva') {
      const L = lookOf(c, v); L.mini = true;
      return `<div class="sp-body" style="width:150px;height:84px">${yuvaHTML(L)}</div>`;
    }
    const lk = LABEL_KEY[c.kind];
    const L = lookOf(c, v, c.kind === 'dino' ? 0.8 : 0.78);
    return `<div class="sp-wrap">${hasA(c, lk) ? `<div class="sp-name">${esc(v[lk])}</div>` : ''}<div class="sp-bars">${barsInner(c, v)}</div><div class="sp-body">${spriteSVG(L)}</div></div>`;
  }
  function previewTags(c) {
    const want = { dino: ['renk', 'boy', 'ad', 'enerji', 'aclik'], bakici: ['sapkaRengi', 'ad'], yuva: ['ad', 'bitkiSayisi', 'gol', 'sicaklik', 'temizlik'], cip: ['renk', 'plaka', 'farlarAcik', 'yakit'], zyr: ['kiyafetRengi', 'sapkaVar', 'ad', 'mutluluk'] }[c.kind];
    return want.map(k => `<span class="${hasA(c, k) ? '' : 'off'}" title="${hasA(c, k) ? 'Çizime yansıyor' : 'Bu özelliği eklersen çizim değişir'}">${k}</span>`).join('');
  }
  function renderPreview() {
    const box = $('#h4-preview');
    if (!S.classes.length) {
      box.innerHTML = '<div class="pv-empty">Bir sınıf oluşturduğunda burada canlanacak.<br>Eklediğin her özellik çizimi değiştirir, her metot burada denenebilir.</div>';
      return;
    }
    box.innerHTML = KIND_ORDER.map(getC).filter(Boolean).map(c => {
      const K = KINDS[c.kind];
      const priv = c.attrs.filter(a => a.vis === '-').length;
      return `<div class="pv-card" style="--k:${K.color};--ks:${K.soft}">
        <div class="pv-head"><b>${esc(cname(c.kind))}</b><span>${c.attrs.length} özellik · ${c.methods.length} metot${priv ? ` · ${priv} gizli` : ''}</span></div>
        <div class="pv-stage"><div class="holder" id="pv-${c.kind}">${previewFigure(c)}</div><div class="pv-bubble" id="pvb-${c.kind}"></div></div>
        <div class="pv-tags">${previewTags(c)}</div>
        <div class="pv-methods">${c.methods.map(m => `<button class="pv-m" data-play="${c.kind}" data-key="${m.key}">${m.key}()</button>`).join('') || '<span class="pv-nom">Metot ekleyince burada denenebilir.</span>'}</div>
      </div>`;
    }).join('');
  }

  function renderSide() {
    const nObj = S.objects.length;
    if (S.side !== 'nesne') S.side = 'gorev';
    $('#h4-stabs').innerHTML = [['gorev', 'Görevler'], ['nesne', 'Nesneler' + (nObj ? `<span class="cnt">${nObj}</span>` : '')]]
      .map(([k, l]) => `<button class="stab ${S.side === k ? 'on' : ''}" data-act="stab" data-side="${k}">${l}</button>`).join('');
    const sp = $('#h4-sp');
    sp.innerHTML = S.side === 'nesne' ? objectsHTML() : missionsHTML();
    T.flash = null;
  }

  function missionsHTML() {
    return LEVELS.map(L => {
      const ms = MISSIONS.filter(m => m.lv === L.n), d = ms.filter(m => S.done[m.id]).length;
      const locked = L.n > S.maxLevel, all = d === ms.length, cur = L.n === S.maxLevel && !all;
      const showList = !locked && (cur || !all || L.n === S.maxLevel);
      return `<div class="lv ${locked ? 'locked' : ''} ${all ? 'done' : ''} ${cur ? 'cur' : ''}">
        <div class="lv-h"><span class="n">${all ? '✓' : L.n}</span><b>${L.title}</b><span>${locked ? '🔒' : d + '/' + ms.length}</span></div>
        ${showList ? `<div class="lv-concept">${L.concept}</div><ul>${ms.map(m => `<li class="${S.done[m.id] ? 'ok' : ''} ${T.flash === m.id ? 'flash' : ''}"><span class="ck">${S.done[m.id] ? '✓' : ''}</span><span class="tx">${m.text}</span></li>`).join('')}</ul>` : ''}
      </div>`;
    }).join('');
  }

  function fieldHTML(o, c, a) {
    const id = `of-${o.id}-${a.key}`, v = o.v[a.key], V = VIS[a.vis];
    let input;
    if (a.type === 'color') input = `<select id="${id}" data-of="${o.id}" data-key="${a.key}">${CN.map(n => `<option ${n === v ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    else if (a.type === 'bool') input = `<input type="checkbox" id="${id}" data-of="${o.id}" data-key="${a.key}" ${v ? 'checked' : ''}>`;
    else if (a.type === 'int' || a.type === 'float') input = `<input type="number" id="${id}" data-of="${o.id}" data-key="${a.key}" value="${esc(v)}" step="${a.type === 'float' ? '0.1' : '1'}">`;
    else input = `<input type="text" id="${id}" data-of="${o.id}" data-key="${a.key}" value="${esc(v)}" spellcheck="false">`;
    return `<label class="ob-f" for="${id}"><span class="vis-sym ${V.cls}">${V.sym}</span><span>${a.key}</span>${input}</label>`;
  }
  function objectsHTML() {
    if (!S.classes.length) return '<p class="ob-intro">Önce bir sınıf oluştur. Sınıf bir <b>kalıp</b>tır; nesneler o kalıptan üretilir.</p>';
    const names = varNames();
    return `<p class="ob-intro">🍪 Sınıf bir kurabiye kalıbıdır, nesneler o kalıptan çıkan kurabiyeler. Aynı sınıftan <b>farklı değerlerle</b> birçok nesne üretebilirsin.</p>` +
      KIND_ORDER.map(getC).filter(Boolean).map(c => {
        const K = KINDS[c.kind], os = objsOf(c.kind);
        os.forEach(ensureVals);
        return `<div class="ob-group" style="--k:${K.color};--ks:${K.soft}">
          <div class="ob-gh"><span class="mini">${miniIcon(c.kind)}</span><b>${esc(cname(c.kind))} nesneleri (${os.length})</b><button data-act="newobj" data-kind="${c.kind}">+ Nesne üret</button></div>
          <div class="ob-list">${os.map(o => `<div class="ob-card"><div class="ob-title"><u>${names[o.id]} : ${esc(cname(c.kind))}</u><button data-act="delobj" data-oid="${o.id}" title="Nesneyi sil">×</button></div>
            <div class="ob-fields">${c.attrs.map(a => fieldHTML(o, c, a)).join('') || '<span class="ob-none">Bu sınıfın hiç özelliği yok; nesneler birbirinden farksız!</span>'}</div></div>`).join('') || '<div class="ob-none">Henüz nesne yok.</div>'}</div>
        </div>`;
      }).join('');
  }

  /* ---------------- nesne adları ve bağlantılar (simülasyon) ---------------- */
  function ascii(s) {
    return String(s).toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9_]/g, '');
  }
  function varNames() {
    const out = {}, used = {};
    CODE_ORDER.forEach(k => {
      const c = getC(k);
      objsOf(k).forEach((o, i) => {
        let base = hasA(c, 'ad') && o.v.ad ? ascii(o.v.ad) : '';
        let n;
        if (base) { if (/^\d/.test(base)) base = '_' + base; n = base; }
        else { base = ascii(KINDS[k].suggest); n = base + (i + 1); }
        let j = 2;
        while (used[n]) n = base + (j++);
        used[n] = 1; out[o.id] = n;
      });
    });
    return out;
  }
  function linkList() {
    const L = [];
    RELS.forEach(R => {
      if (!relOn(R.key)) return;
      const As = objsOf(R.from), Bs = objsOf(R.to);
      if (!As.length || !Bs.length) return;
      if (R.many) As.forEach(a => Bs.forEach(b => L.push([R, a, b])));
      else As.forEach((a, i) => L.push([R, a, Bs[i % Bs.length]]));
    });
    return L;
  }
  function pyVal(v, type) {
    if (type === 'bool') return v ? 'True' : 'False';
    if (type === 'int' || type === 'float') return String(+v || 0);
    return '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  /* ---------------- işlemler ---------------- */
  function commit(opts) { save(); evaluate(); renderAll(opts); }

  function createClass(kind, x, y) {
    const K = KINDS[kind];
    if (K.level > S.maxLevel) { toast(`${K.label} sınıfı ${K.level}. seviyede açılır.`, 'info'); return; }
    if (getC(kind)) {
      toast(`Zaten bir ${K.label} sınıfı var. Aynı sınıftan çok sayıda nesne üretebilirsin (Nesneler sekmesi).`, 'info');
      shakeBox(kind); return;
    }
    const [hx, hy] = HOME_POS[kind];
    S.classes.push({ kind, name: '', x: x == null ? hx : clamp(Math.round(x), 0, CV_W - 280), y: y == null ? hy : clamp(Math.round(y), 0, CV_H - 200), attrs: [], methods: [] });
    S.tab = kind;
    commit();
    const inp = $('#nm-' + kind);
    if (inp) { inp.focus({ preventScroll: true }); inp.closest('.uml-box').scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }
    toast(`${K.label} sınıfı oluşturuldu. Şimdi kutuya bir ad yaz (ör. ${K.suggest}).`, 'good');
  }

  function addMember(kind, type, key, targetKind) {
    const tk = targetKind || kind;
    const c = getC(tk);
    if (!c) { toast(`Önce ${KINDS[kind].label} sınıf kartını tuvale sürükle.`, 'info'); return; }
    if (tk !== kind) {
      shakeBox(tk);
      toast(`“${key}” bir ${KINDS[kind].label} ${type === 'attr' ? 'özelliği' : 'metodu'}. Bu kutu ${KINDS[tk].label} sınıfı!`, 'bad');
      return;
    }
    const list = type === 'attr' ? c.attrs : c.methods;
    if (list.some(x => x.key === key)) { toast(`${key} zaten ${cname(tk)} sınıfında var.`, 'info'); return; }
    if (type === 'attr') list.push({ key, type: KINDS[kind].attrs.find(a => a.key === key).type, vis: '+' });
    else list.push({ key, vis: '+' });
    T.pop = `${tk}:${type}:${key}`;
    commit();
    if (type === 'attr' && !S.tipVis) {
      S.tipVis = true; save();
      toast('İpucu: Satırın başındaki + simgesine tıklayarak erişimi değiştir: + public → − private → # protected', 'info', 5200);
    }
  }

  function shakeBox(kind) {
    const b = $(`.uml-box[data-kind="${kind}"]`, root);
    if (!b) return;
    b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
  }

  function tryConnect(a, b) {
    T.connectFrom = null;
    T.ignoreClick = performance.now() + 350;
    const R = RELS.find(r => (r.from === a && r.to === b) || (r.from === b && r.to === a));
    if (!R) {
      const k = [a, b].sort().join('|');
      toast((NO_REL[k] || `${KINDS[a].label} ile ${KINDS[b].label} arasında bu parkta bir ilişki yok.`) + ' İpucu: Kim kime bakar, kim nerede yaşar?', 'bad', 4200);
      renderCanvas(); return;
    }
    if (S.rels.includes(R.key)) { toast('Bu ilişki zaten kurulu.', 'info'); renderCanvas(); return; }
    S.rels.push(R.key);
    commit();
    toast(`${cname(R.from)} —${R.label}→ ${cname(R.to)} · ${R.why}`, 'good', 4600);
  }

  function newObj(kind, silent) {
    const c = getC(kind);
    if (!c) return;
    if (objsOf(kind).length >= LIMIT[kind]) { toast(`Simülasyon için en fazla ${LIMIT[kind]} ${KINDS[kind].label} nesnesi yeter.`, 'info'); return; }
    const o = { id: uid(), kind, v: {} };
    ensureVals(o);
    // aynı renkler/adlar tekrar etmesin
    const others = objsOf(kind);
    ['renk', 'kiyafetRengi', 'sapkaRengi'].forEach(k => {
      if (k in o.v) { const free = CN.filter(n => !others.some(x => x.v[k] === n)); if (free.length) o.v[k] = pick(free); }
    });
    if ('ad' in o.v && kind !== 'yuva') {
      const pool = kind === 'dino' ? DINO_NAMES : PEOPLE;
      const free = pool.filter(n => !others.some(x => x.v.ad === n)); if (free.length) o.v.ad = pick(free);
    }
    if (kind === 'yuva' && 'ad' in o.v) {
      const free = ['Volkan Vadisi', 'Palmiye Koyu', 'Eğrelti Ormanı', 'Kristal Göl'].filter(n => !others.some(x => x.v.ad === n)); if (free.length) o.v.ad = free[0];
    }
    S.objects.push(o);
    if (!silent) {
      commit();
      const nm = varNames()[o.id];
      toast(`${nm} = ${cname(kind)}(...) · yeni nesne üretildi!`, 'good');
    }
  }
  function ensureVals(o) {
    const c = getC(o.kind); if (!c) return;
    c.attrs.forEach(a => { if (!(a.key in o.v)) { const d = attrDef(c, a); o.v[a.key] = d ? d.gen() : ''; } });
  }

  function loadExample() {
    S = fresh();
    S.maxLevel = 5; S.tipVis = true;
    KIND_ORDER.forEach(k => {
      const K = KINDS[k];
      S.classes.push({
        kind: k, name: K.suggest, x: HOME_POS[k][0], y: HOME_POS[k][1],
        attrs: K.attrs.map(a => ({ key: a.key, type: a.type, vis: a.rec || '+' })),
        methods: K.methods.map(m => ({ key: m.key, vis: '+' }))
      });
    });
    S.rels = RELS.map(r => r.key);
    const counts = { dino: 3, bakici: 2, yuva: 2, cip: 1, zyr: 2 };
    Object.entries(counts).forEach(([k, n]) => { for (let i = 0; i < n; i++) newObj(k, true); });
    objsOf('dino').forEach((o, i) => { o.v.renk = ['yeşil', 'mor', 'turuncu'][i]; });
    S.zoom = 0.7;
    T.quiet = true; save(); evaluate(); T.quiet = false;
    renderAll();
    toast('Örnek çözüm yüklendi: 5 sınıf, 5 ilişki, 10 nesne.', 'good');
  }

  /* ---------------- görev değerlendirme ---------------- */
  function evaluate() {
    let changed = false;
    for (let guard = 0; guard < 8; guard++) {
      const newly = MISSIONS.filter(m => m.lv <= S.maxLevel && !S.done[m.id] && safeOk(m));
      newly.forEach(m => {
        S.done[m.id] = true; T.flash = m.id; changed = true;
        if (!T.quiet) {
          const t = strip(m.text);
          toast('⭐ +10 · ' + (t.length > 70 ? t.slice(0, 68) + '…' : t), 'star');
        }
      });
      const lvMs = MISSIONS.filter(m => m.lv === S.maxLevel);
      if (S.maxLevel < 5 && lvMs.every(m => S.done[m.id])) {
        S.maxLevel++; changed = true;
        const L = LEVELS[S.maxLevel - 1];
        if (L.unlock.length) S.tab = L.unlock[0];
        if (!T.quiet) levelUp(L);
        continue;
      }
      break;
    }
    if (!S.finished && MISSIONS.every(m => S.done[m.id])) {
      S.finished = true; changed = true;
      if (!T.quiet) setTimeout(finale, 600);
    }
    if (changed) save();
  }
  function safeOk(m) { try { return !!m.ok(); } catch (_) { return false; } }

  function levelUp(L) {
    confetti();
    const art = L.unlock.map(k => `<div style="display:inline-block;margin:0 8px">${bigIcon(k)}</div>`).join('') || '<div style="font-size:70px">🧩</div>';
    modal(`<div class="lvup-art">${art}</div><span class="tag">Seviye ${L.n} açıldı</span><h3>${L.title}</h3>
      <p>${L.concept}</p>${L.unlock.length ? `<p>Yeni sınıf${L.unlock.length > 1 ? 'lar' : ''}: <b>${L.unlock.map(k => KINDS[k].label).join(', ')}</b>. Soldaki sekmelerde seni bekliyor!</p>` : '<p>Sağdaki <b>Nesneler</b> sekmesine geç.</p>'}`,
    [{ label: 'Hadi başlayalım!', cls: 'lava', fn: () => { if (L.n === 4) { S.side = 'nesne'; save(); renderSide(); } } }]);
  }
  function finale() {
    confetti(); setTimeout(confetti, 700);
    modal(`<div class="lvup-art">${bigIcon('dino')}</div><span class="tag">22 / 22 görev</span><h3>Tebrikler, Usta Tasarımcı!</h3>
      <p>Sınıfları, erişim belirleyicileri, ilişkileri ve nesneleri kullanarak koca bir parkı tasarladın. Tasarımının PDF çıktısını almayı unutma!</p>`,
    [{ label: '📄 PDF al', fn: exportPdf }, { label: 'Kapat', cls: 'lava' }]);
  }
  function exportPdf() {
    if (!S.classes.length) { toast('Önce tuvale bir sınıf kartı sürükle.', 'info'); return; }
    if (!window.NYPPdf) { toast('PDF modülü yüklenemedi.', 'bad'); return; }
    const classes = S.classes.map(c => ({
      id: c.kind, name: cname(c.kind), x: c.x, y: c.y,
      attrs: c.attrs.map(a => ({ text: `${VIS[a.vis].sym} ${a.key}: ${typeStr(a.type)}` })),
      meths: c.methods.map(m => {
        const d = methodDef(c.kind, m);
        const p = d && d.param ? `${d.param.name}: ${cname(REL[d.param.rel].to)}` : '';
        return { text: `${VIS[m.vis].sym} ${m.key}(${p}): None` };
      })
    }));
    const rels = S.rels.filter(k => getC(REL[k].from) && getC(REL[k].to)).map(k => {
      const R = REL[k];
      return { a: R.from, b: R.to, type: 'assoc', ma: R.m1, mb: R.m2, label: R.label };
    });
    NYPPdf.exportUML({ title: 'Dino Vadisi · UML Sınıf Diyagramı', week: '4. Hafta', classes, rels, filename: 'dino-vadisi-uml' }).then(r => {
      if (!r.ok) { if (!r.cancelled) toast(r.msg || 'PDF oluşturulamadı.', 'bad'); return; }
      toast(r.pdf ? '📄 PDF indirildi!' : r.msg, r.pdf ? 'good' : 'info', 4600);
    });
  }

  /* ---------------- modal / toast / konfeti ---------------- */
  function modal(html, buttons) {
    const m = $('#nyp-modal'), card = $('#nyp-modal-card');
    card.innerHTML = html + `<div class="row">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-mb="${i}">${b.label}</button>`).join('')}</div>`;
    m.hidden = false;
    card.onclick = e => {
      const b = e.target.closest('[data-mb]'); if (!b) return;
      const B = buttons[+b.dataset.mb]; m.hidden = true; if (B.fn) B.fn();
    };
    const last = card.querySelector('.row .btn:last-child'); if (last) last.focus();
  }
  function toast(text, kind, ms) {
    const box = $('#nyp-toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = text;
    box.appendChild(t);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms || 3000);
  }
  function confetti() {
    const cols = ['#FF6A3D', '#14966E', '#3D8BFF', '#FFC83D', '#8A57E8', '#FF6FB5'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('div');
      p.className = 'confetti';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = pick(cols);
      p.style.animationDuration = rnd(1.8, 3.2) + 's';
      p.style.animationDelay = rnd(0, 0.4) + 's';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 3800);
    }
  }

  /* ---------------- sürükle-bırak ---------------- */
  function toCanvas(e) {
    const r = $('#h4-inner').getBoundingClientRect();
    return { x: (e.clientX - r.left) / S.zoom, y: (e.clientY - r.top) / S.zoom };
  }
  function makeGhost(d) {
    const g = document.createElement('div');
    const K = KINDS[d.kind];
    g.className = 'ghost';
    g.style.setProperty('--k', K.color); g.style.setProperty('--ks', K.soft);
    if (d.type === 'class') g.innerHTML = `<div class="p-class" style="background:#fff;width:230px">${'<span class="mini">' + bigIcon(d.kind, 62) + '</span>'}<span><b>${K.label}</b></span></div>`;
    else g.innerHTML = `<div class="chip ${d.type === 'meth' ? 'meth' : ''}" style="background:#fff">${d.key}${d.type === 'meth' ? '()' : ''}</div>`;
    return g;
  }
  function onDown(e) {
    if (e.button && e.button !== 0) return;
    const t = e.target;
    if (T.connectFrom) {
      const boxEl = t.closest('.uml-box');
      if (boxEl && root.contains(boxEl)) {
        e.preventDefault();
        const k = boxEl.dataset.kind;
        if (k === T.connectFrom) { T.connectFrom = null; T.ignoreClick = performance.now() + 350; renderCanvas(); }
        else tryConnect(T.connectFrom, k);
        return;
      }
    }
    const src = t.closest('[data-drag]');
    if (!src || !root.contains(src)) return;
    const type = src.dataset.drag;
    if (type === 'box') {
      if (t.closest('input,button,select')) return;
      const el = src.closest('.uml-box'), c = getC(el.dataset.kind), p = toCanvas(e);
      D = { type: 'box', kind: c.kind, offX: p.x - c.x, offY: p.y - c.y, el, moved: false };
      el.classList.add('dragging');
      e.preventDefault();
      return;
    }
    if (src.classList.contains('used')) { toast(`${src.dataset.key} zaten kutuda.`, 'info'); return; }
    if (src.classList.contains('placed')) { toast('Bu sınıf zaten tuvalde. Nesne üretmek için Nesneler sekmesine bak.', 'info'); shakeBox(src.dataset.kind); return; }
    D = { type, kind: src.dataset.kind, key: src.dataset.key, sx: e.clientX, sy: e.clientY, moved: false };
    e.preventDefault();
  }
  function onMove(e) {
    if (!D) return;
    if (D.type === 'box') {
      const p = toCanvas(e), c = getC(D.kind);
      c.x = clamp(Math.round(p.x - D.offX), 0, CV_W - 280); c.y = clamp(Math.round(p.y - D.offY), 0, CV_H - 100);
      D.el.style.left = c.x + 'px'; D.el.style.top = c.y + 'px'; D.moved = true;
      drawRels();
      return;
    }
    if (!D.moved) {
      if (Math.hypot(e.clientX - D.sx, e.clientY - D.sy) < 6) return;
      D.moved = true; D.ghost = makeGhost(D); document.body.appendChild(D.ghost);
    }
    D.ghost.style.left = e.clientX + 'px'; D.ghost.style.top = e.clientY + 'px';
    const el = document.elementFromPoint(e.clientX, e.clientY), box = el && el.closest('.uml-box');
    $$('.uml-box.drop-ok, .uml-box.drop-bad', root).forEach(b => b.classList.remove('drop-ok', 'drop-bad'));
    if (box && D.type !== 'class') box.classList.add(box.dataset.kind === D.kind ? 'drop-ok' : 'drop-bad');
  }
  function onUp(e) {
    if (!D) return;
    const d = D; D = null;
    if (d.type === 'box') { d.el.classList.remove('dragging'); if (d.moved) save(); return; }
    $$('.uml-box.drop-ok, .uml-box.drop-bad', root).forEach(b => b.classList.remove('drop-ok', 'drop-bad'));
    if (d.ghost) d.ghost.remove();
    if (!d.moved) {
      if (d.type === 'class') createClass(d.kind); else addMember(d.kind, d.type, d.key, null);
      return;
    }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (d.type === 'class') {
      if (!el || !el.closest('#h4-cv')) { toast('Sınıf kartını ortadaki tuvale bırak.', 'info'); return; }
      const p = toCanvas(e);
      createClass(d.kind, p.x - 135, p.y - 30);
      return;
    }
    const box = el && el.closest('.uml-box');
    if (!box) { toast('Parçayı bir sınıf kutusunun üstüne bırak.', 'info'); return; }
    addMember(d.kind, d.type, d.key, box.dataset.kind);
  }

  /* ---------------- tıklamalar ---------------- */
  function onClick(e) {
    if (performance.now() < T.ignoreClick) return;
    const t = e.target;
    const rdel = t.closest('[data-rdel]');
    if (rdel) {
      const key = rdel.dataset.rdel;
      S.rels = S.rels.filter(k => k !== key);
      commit(); toast(`“${REL[key].label}” ilişkisi silindi.`, 'info');
      return;
    }
    const play = t.closest('[data-play]');
    if (play) { playPreview(play.dataset.play, play.dataset.key); return; }
    const b = t.closest('[data-act]');
    if (!b || !root.contains(b)) return;
    const act = b.dataset.act;
    const box = b.closest('.uml-box'), kind = box && box.dataset.kind, c = kind && getC(kind);
    const row = b.closest('.ub-row');
    switch (act) {
      case 'home': if (window.NYP) window.NYP.home(); break;
      case 'ptab': S.tab = b.dataset.kind; save(); renderPalette(); break;
      case 'stab': S.side = b.dataset.side; save(); renderSide(); break;
      case 'vis': {
        const list = row.dataset.type === 'attr' ? c.attrs : c.methods;
        const m = list.find(x => x.key === row.dataset.key);
        m.vis = VIS_NEXT[m.vis];
        const V = VIS[m.vis];
        commit();
        toast(`${V.sym} ${V.name}: ${V.info}.`, m.vis === '-' ? 'bad' : m.vis === '#' ? 'star' : 'good', 3600);
        break;
      }
      case 'delm': {
        const key = row.dataset.key;
        if (row.dataset.type === 'attr') c.attrs = c.attrs.filter(x => x.key !== key);
        else c.methods = c.methods.filter(x => x.key !== key);
        commit();
        break;
      }
      case 'delbox':
        modal(`<h3>${esc(cname(kind))} sınıfı silinsin mi?</h3><p>Sınıfın özellikleri, metotları, ilişkileri ve bu sınıftan üretilen nesneler de silinir.</p>`,
          [{ label: 'Vazgeç' }, { label: 'Sil', cls: 'lava', fn: () => {
            S.classes = S.classes.filter(x => x.kind !== kind);
            S.rels = S.rels.filter(k => REL[k].from !== kind && REL[k].to !== kind);
            S.objects = S.objects.filter(o => o.kind !== kind);
            commit();
          } }]);
        break;
      case 'link':
        T.connectFrom = T.connectFrom === kind ? null : kind;
        renderCanvas();
        break;
      case 'cancelLink': T.connectFrom = null; renderCanvas(); break;
      case 'addAttr': case 'addMeth':
        T.form = { kind, sec: act === 'addAttr' ? 'attr' : 'meth', n: '', t: act === 'addAttr' ? 'str' : 'jump' };
        renderCanvas();
        { const i = $(`#f-${kind}-n`); if (i) i.focus(); }
        break;
      case 'formNo': T.form = null; renderCanvas(); break;
      case 'formOk': submitForm(); break;
      case 'newobj': newObj(b.dataset.kind); break;
      case 'delobj': S.objects = S.objects.filter(o => o.id !== b.dataset.oid); commit(); break;
      case 'zoomin': S.zoom = Math.min(1.4, Math.round((S.zoom + 0.1) * 10) / 10); save(); renderCanvas(); break;
      case 'zoomout': S.zoom = Math.max(0.4, Math.round((S.zoom - 0.1) * 10) / 10); save(); renderCanvas(); break;
      case 'layout': S.classes.forEach(x => { x.x = HOME_POS[x.kind][0]; x.y = HOME_POS[x.kind][1]; }); save(); renderCanvas(); break;
      case 'pdf': exportPdf(); break;
      case 'reset':
        modal('<h3>Her şey sıfırlansın mı?</h3><p>Tüm sınıflar, ilişkiler, nesneler ve kazanılan yıldızlar silinir.</p>',
          [{ label: 'Vazgeç' }, { label: 'Sıfırla', cls: 'lava', fn: () => { S = fresh(); T.connectFrom = null; T.form = null; commit(); toast('Atölye sıfırlandı. Dinozor kartıyla başla!', 'info'); } }]);
        break;
      case 'teacher':
        if (!window.NYP_OGRETMEN) break;
        modal(`<h3>Öğretmen paneli</h3><p>Derste göstermek için kısayollar. Öğrenciler kendi bilgisayarında sıfırdan başlar; her tarayıcı kendi çalışmasını saklar.</p>
          <ul><li><b>Tüm seviyeleri aç:</b> bütün sınıf kartlarını kullanıma açar, mevcut çalışma korunur.</li><li><b>Örnek çözümü yükle:</b> 5 sınıf, 5 ilişki ve 10 nesneyle hazır bir park kurar. Mevcut çalışma silinir.</li></ul>`,
          [{ label: 'Kapat' }, { label: 'Tüm seviyeleri aç', fn: () => { S.maxLevel = 5; T.quiet = true; commit(); T.quiet = false; toast('Tüm seviyeler açıldı.', 'good'); } },
            { label: 'Örnek çözümü yükle', cls: 'lava', fn: loadExample }]);
        break;
      case 'run': startSim(); break;
    }
  }

  function submitForm() {
    const f = T.form; if (!f) return;
    const c = getC(f.kind);
    const n = ($(`#f-${f.kind}-n`).value || '').trim();
    const t = $(`#f-${f.kind}-t`).value;
    f.n = n; f.t = t;
    let err = '';
    if (!n) err = 'Bir ad yaz.';
    else if (!/^[a-zçğıöşü_][A-Za-z0-9ÇĞİÖŞÜçğıöşü_]*$/.test(n)) err = 'Küçük harfle başlamalı, boşluk olmamalı (ör. kanatSayisi).';
    else if (PY_RESERVED.includes(n.toLowerCase())) err = 'Bu kelime Python’a ayrılmış, başka bir ad seç.';
    else if (c.attrs.some(a => a.key === n) || c.methods.some(m => m.key === n)) err = 'Bu ad zaten kullanılıyor.';
    if (err) { f.err = err; renderCanvas(); $(`#f-${f.kind}-n`).focus(); return; }
    if (f.sec === 'attr') c.attrs.push({ key: n, type: t, vis: '+', custom: true });
    else c.methods.push({ key: n, vis: '+', custom: true, anim: t });
    T.pop = `${f.kind}:${f.sec}:${n}`;
    T.form = null;
    commit();
    toast(f.sec === 'attr' ? `Kendi özelliğin eklendi: ${n}` : `Kendi metodun eklendi: ${n}() · simülasyonda “${BEHAVIORS.find(b => b[0] === t)[1]}” davranışını yapacak.`, 'good');
  }

  function onInput(e) {
    const t = e.target;
    if (t.dataset.name) {
      const c = getC(t.dataset.name); c.name = t.value;
      save(); evaluate(); renderAll();
      return;
    }
    if (t.dataset.of && e.type === (t.type === 'text' || t.type === 'number' ? 'input' : 'change')) {
      const o = S.objects.find(x => x.id === t.dataset.of); if (!o) return;
      const c = getC(o.kind), a = c.attrs.find(x => x.key === t.dataset.key);
      let v;
      if (a.type === 'bool') v = t.checked;
      else if (a.type === 'int') v = parseInt(t.value, 10) || 0;
      else if (a.type === 'float') v = parseFloat(t.value) || 0;
      else v = t.value;
      o.v[a.key] = v;
      save(); evaluate(); renderTop(); renderPreview();
      if (a.key === 'ad') { const names = varNames(); const card = t.closest('.ob-card'); if (card) card.querySelector('u').textContent = `${names[o.id]} : ${cname(o.kind)}`; }
    }
  }

  function playPreview(kind, key) {
    const c = getC(kind); if (!c) return;
    const m = c.methods.find(x => x.key === key); if (!m) return;
    const d = methodDef(kind, m);
    const h = $('#pv-' + kind), bub = $('#pvb-' + kind);
    if (!h) return;
    h.className = 'holder ' + animCss(d.anim);
    const yv = h.querySelector('.yv');
    if (yv) {
      const extra = { gateOpen: 'open', alarm: 'alarm', clean: 'sparkle' }[d.anim];
      if (extra) { yv.classList.add(extra); setTimeout(() => yv.classList.remove(extra), 1800); }
    }
    clearTimeout(h._t); h._t = setTimeout(() => { h.className = 'holder'; }, 1800);
    bub.textContent = `${key}() → ${d.say}`;
    bub.classList.add('show');
    clearTimeout(bub._t); bub._t = setTimeout(() => bub.classList.remove('show'), 1800);
    if (!S.events.preview) { S.events.preview = true; save(); evaluate(); renderTop(); renderSide(); }
  }

  /* =====================================================================
     SİMÜLASYON
     ===================================================================== */
  const SLOTS = [{ x: 30, y: 228, w: 360, h: 290 }, { x: 420, y: 228, w: 360, h: 290 }, { x: 810, y: 228, w: 360, h: 290 }];
  const FREE = { x: 30, y: 210, w: 1140, h: 440 };
  const STATION = { x: 1120, y: 640 }, SHOP = { x: 90, y: 640 };

  function simMissing() {
    const out = [];
    if (!named('dino')) out.push('Dinozor sınıfı oluşturulmalı ve geçerli bir adı olmalı.');
    if (!named('bakici')) out.push('Bakıcı sınıfı oluşturulmalı ve geçerli bir adı olmalı (2. seviyede açılır).');
    S.classes.forEach(c => {
      if (!nameCheck(c).ok && c.kind !== 'dino' && c.kind !== 'bakici') out.push(`${KINDS[c.kind].label} sınıfının adı geçersiz: ${nameCheck(c).msg}.`);
      if (!c.methods.length) out.push(`${cname(c.kind)} sınıfında hiç metot yok; nesneleri hareket edemez.`);
    });
    if (!S.rels.length) out.push('En az bir ilişki kurulmalı (kutudaki 🔗 düğmesi). Örnek: Bakıcı → Dinozor.');
    return out;
  }

  function startSim() {
    const miss = simMissing();
    if (miss.length) {
      modal(`<h3>Simülasyon için biraz daha tasarım lazım</h3><p>Nesnelerin canlanabilmesi için şunlar eksik:</p><ul>${miss.map(m => `<li>${m}</li>`).join('')}</ul>`, [{ label: 'Tamam', cls: 'lava' }]);
      return;
    }
    const auto = [];
    S.classes.forEach(c => { if (!objsOf(c.kind).length) { newObj(c.kind, true); auto.push(cname(c.kind)); } });
    S.objects.forEach(ensureVals);
    S.events.sim = true;
    if (S.classes.length === 5 && S.rels.length >= 5 && totalMembers() >= 50) S.events.simFull = true;
    save(); evaluate(); renderAll();
    openSim();
    if (auto.length) toast(`Nesnesi olmayan sınıflar için birer nesne üretildi: ${auto.join(', ')}`, 'info', 4200);
  }

  function simShell() {
    const deco = [['🌴', 8, 150], ['🌳', 1150, 160], ['🌴', 1160, 520], ['🌿', 400, 520], ['🌿', 790, 520], ['🌴', 6, 520], ['🪨', 600, 200]]
      .map(([e, x, y]) => `<div class="sc-deco" style="left:${x}px;top:${y}px">${e}</div>`).join('');
    const clouds = [[100, 40, 90, 0], [500, 70, 120, -20], [900, 30, 80, -40]]
      .map(([x, y, w, d]) => `<div class="sc-cloud" style="left:${x}px;top:${y}px;width:${w}px;animation-delay:${d}s"></div>`).join('');
    return `
      <div class="sim-top">
        <div class="t">Dino Vadisi <small>simülasyon · ${S.objects.length} nesne</small></div>
        <button class="btn" data-sim="pause">⏸ Duraklat</button>
        <button class="btn" data-sim="speed">Hız: 1x</button>
        <label class="sw"><input type="checkbox" id="sim-auto" checked> Otomatik davranış</label>
        <button class="btn lava" data-sim="close">✕ Diyagrama dön</button>
      </div>
      <div class="sim-main">
        <div class="sim-wrap" id="sim-wrap">
          <div class="stage" id="sim-stage">
            <div class="sc-sky"></div><div class="sc-sun"></div>${clouds}
            <svg class="sc-hills" viewBox="0 0 1200 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 100 L0 60 Q150 0 300 50 T600 40 Q700 -10 820 45 T1200 50 L1200 100Z" fill="#A6D98A"/>
              <path d="M930 100 L1000 18 L1022 30 L1044 14 L1110 100Z" fill="#C7A27A"/>
              <path d="M1000 18 L1022 30 L1044 14 Q1030 4 1022 10 Q1012 2 1000 18Z" fill="#FF8A3D"/>
            </svg>
            <div class="sc-grass"></div><div class="sc-road"></div>${deco}
            <div class="sc-spot" style="left:${STATION.x}px;top:${STATION.y - 46}px">⛽ Benzinlik</div>
            <div class="sc-spot" style="left:${SHOP.x}px;top:${SHOP.y - 46}px">🎁 Hediyelik</div>
          </div>
        </div>
        <aside class="insp" id="sim-insp"></aside>
      </div>
      <div class="sim-log" id="sim-log"><div class="lh">Konsol · metot çağrıları</div></div>`;
  }

  function openSim() {
    const ov = $('#nyp-sim');
    ov.innerHTML = simShell();
    ov.hidden = false;
    SIM = { ents: [], paused: false, speed: 1, auto: true, sel: null, raf: 0, last: performance.now(), acc: 0, slow: 0, names: varNames() };
    const stage = $('#sim-stage');
    objsOf('yuva').forEach((o, i) => addEnt(stage, o, i));
    ['dino', 'cip', 'bakici', 'zyr'].forEach(k => objsOf(k).forEach((o, i) => addEnt(stage, o, i)));
    linkList().forEach(([R, a, b]) => {
      const ea = entOf(a.id), eb = entOf(b.id); if (!ea || !eb) return;
      (ea.links[R.key] = ea.links[R.key] || []).push(eb);
      if (R.key === 'yasar') ea.home = eb;
    });
    SIM.ents.forEach(e => { if (e.kind !== 'yuva') { const p = randPt(e); e.x = p.x; e.y = p.y; } });
    if (!SIM.ents.find(e => e.kind === 'dino')) { /* olmaz ama */ }
    renderInsp();
    fitStage();
    window.addEventListener('resize', fitStage);
    log('<span class="c"># Simülasyon başladı. Her satır bir nesnenin metot çağrısı. Bir nesneye tıkla: özelliklerini gör, metotlarını elle çağır.</span>');
    if (!relOn('yasar') && objsOf('yuva').length) log('<span class="c"># Dinozor → Yuva ilişkisi yok: dinozorlar yuvalarına bağlı değil, her yerde dolaşıyor.</span>', 'warn');
    SIM.raf = requestAnimationFrame(loop);
  }

  function closeSim() {
    if (!SIM) return;
    cancelAnimationFrame(SIM.raf);
    window.removeEventListener('resize', fitStage);
    SIM = null; T.iedit = null;
    const ov = $('#nyp-sim'); ov.hidden = true; ov.innerHTML = '';
    evaluate(); renderAll();
  }

  function fitStage() {
    const wrap = $('#sim-wrap'), st = $('#sim-stage'); if (!wrap || !st) return;
    const W = wrap.clientWidth, H = wrap.clientHeight;
    const s = Math.max(0.2, Math.min((W - 24) / 1200, (H - 24) / 680));
    st.style.transform = `scale(${s})`;
    st.style.left = (W - 1200 * s) / 2 + 'px';
    st.style.top = (H - 680 * s) / 2 + 'px';
  }

  const entOf = id => SIM.ents.find(e => e.id === id);

  function addEnt(stage, o, i) {
    const c = getC(o.kind);
    const e = { id: o.id, kind: o.kind, c, v: JSON.parse(JSON.stringify(o.v)), name: SIM.names[o.id], q: [], idle: rnd(0.3, 2), dir: 1, anim: '', shownAnim: null, links: {}, jump: 0, x: 600, y: 400, lookKey: '' };
    const el = document.createElement('div');
    el.dataset.eid = o.id;
    if (o.kind === 'yuva') {
      const r = SLOTS[i % SLOTS.length];
      e.rect = { x: r.x + (i >= 3 ? 20 : 0), y: r.y + (i >= 3 ? 20 : 0), w: r.w, h: r.h };
      e.x = e.rect.x + e.rect.w / 2; e.y = e.rect.y + e.rect.h / 2 + 40;
      el.className = 'sc-region';
      Object.assign(el.style, { left: e.rect.x + 'px', top: e.rect.y + 'px', width: e.rect.w + 'px', height: e.rect.h + 'px', zIndex: 1 });
      el.innerHTML = `<div class="yv-holder" style="width:100%;height:100%"></div>
        <div class="ent-bubble" style="top:30px;bottom:auto"></div>
        <div class="ent-tag" style="position:absolute;left:12px;bottom:10px">${e.name} : ${esc(cname('yuva'))}</div>`;
      e.holder = el.querySelector('.yv-holder');
    } else {
      el.className = 'ent';
      el.innerHTML = `<div class="ent-in"><div class="ent-bubble"></div><div class="ent-tag">${e.name} : ${esc(cname(o.kind))}</div>
        <div class="sp-bars"></div><div class="ent-fig"><div class="ent-flip"></div></div><div class="ent-shadow"></div></div>`;
      e.fig = el.querySelector('.ent-fig'); e.flip = el.querySelector('.ent-flip'); e.bars = el.querySelector('.sp-bars');
    }
    e.el = el; e.bubble = el.querySelector('.ent-bubble');
    stage.appendChild(el);
    SIM.ents.push(e);
    refreshLook(e);
    return e;
  }

  function refreshLook(e) {
    if (e.kind === 'yuva') {
      const L = lookOf(e.c, e.v); const key = JSON.stringify(L);
      if (key !== e.lookKey) { e.lookKey = key; e.holder.innerHTML = yuvaHTML(L); if (e.gateOpen) e.holder.firstElementChild.classList.add('open'); }
      return;
    }
    const L = lookOf(e.c, e.v, 1); const key = JSON.stringify(L);
    if (key !== e.lookKey) { e.lookKey = key; e.flip.innerHTML = `<div class="sp-body">${spriteSVG(L)}</div>`; }
    e.bars.innerHTML = barsInner(e.c, e.v);
  }

  function say(e, text, ms) {
    const b = e.bubble; if (!b) return;
    b.textContent = text; b.classList.add('show');
    clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('show'), ms || 1700);
  }
  function ptc(x, y, emoji) {
    const st = $('#sim-stage'); if (!st) return;
    const p = document.createElement('div');
    p.className = 'ptc'; p.textContent = emoji;
    p.style.left = x + 'px'; p.style.top = y + 'px';
    st.appendChild(p); setTimeout(() => p.remove(), 1300);
  }
  const ptcE = (e, emoji) => ptc(e.x + rnd(-10, 10), e.y - (e.kind === 'dino' ? 95 : e.kind === 'cip' ? 70 : 90), emoji);
  function flash() { const st = $('#sim-stage'); const f = document.createElement('div'); f.className = 'flash'; st.appendChild(f); setTimeout(() => f.remove(), 400); }
  function log(html, cls) {
    const L = $('#sim-log'); if (!L) return;
    const d = document.createElement('div'); d.className = 'lg ' + (cls || ''); d.innerHTML = html;
    L.appendChild(d);
    while (L.children.length > 150) L.children[1].remove();
    L.scrollTop = L.scrollHeight;
  }

  function randPt(e) {
    if (e.kind === 'dino') {
      const r = e.home ? e.home.rect : FREE;
      return { x: rnd(r.x + 55, r.x + r.w - 55), y: rnd(r.y + 95, r.y + r.h - 16) };
    }
    if (e.kind === 'cip') return { x: rnd(110, 1090), y: rnd(600, 668) };
    if (e.kind === 'zyr') return { x: rnd(60, 1140), y: rnd(580, 672) };
    return { x: rnd(60, 1140), y: rnd(300, 670) };
  }
  function clampHome(e, p) {
    const r = e.home ? e.home.rect : FREE;
    return { x: clamp(p.x, r.x + 55, r.x + r.w - 55), y: clamp(p.y, r.y + 95, r.y + r.h - 16) };
  }
  function speedOf(e) {
    const h = hasA(e.c, 'hiz') ? clamp(+e.v.hiz || 5, 1, 10) : 5;
    if (e.kind === 'dino') return 40 + h * 9;
    if (e.kind === 'cip') return 90 + h * 14;
    return 70;
  }
  const W = (d, anim, extra) => Object.assign({ t: 'wait', d, anim }, extra || {});
  const MV = (p, s, anim, trail) => ({ t: 'move', x: p.x, y: p.y, s, anim, trail });
  const DO = fn => ({ t: 'do', fn });
  const face = (e, t) => { e.dir = t.x >= e.x ? 1 : -1; };

  function applyFx(e, d) {
    const ch = [];
    (d.fx || []).forEach(([k, op, val]) => {
      if (!hasA(e.c, k)) return;
      const a = e.c.attrs.find(x => x.key === k);
      const old = e.v[k];
      let nv = op === '=' ? val : Math.round(((+old || 0) + op) * 10) / 10;
      if (k in BAR) nv = clamp(nv, 0, 100);
      e.v[k] = nv;
      ch.push(`${VIS[a.vis].py(k)}: ${fmt(old)} → ${fmt(nv)}`);
    });
    return ch;
  }

  function perform(e, m, by) {
    const d = methodDef(e.kind, m);
    let target = null;
    if (d.param) {
      const list = e.links[d.param.rel] || [];
      const R = REL[d.param.rel];
      if (!relOn(R.key)) {
        log(`<span class="o">${e.name}</span>.<span class="m">${m.key}</span>(?)<span class="c">   # ⚠ ${cname(R.from)} → ${cname(R.to)} ilişkisi yok! Hangi ${KINDS[R.to].label.toLocaleLowerCase('tr')}? Kutudaki 🔗 ile bağla.</span>`, 'warn');
        say(e, '🤷 Kimi?'); e.q.push(W(1.2, 'talk')); return;
      }
      if (!list.length) {
        log(`<span class="o">${e.name}</span>.<span class="m">${m.key}</span>()<span class="c">   # ⚠ Bağlı ${KINDS[R.to].label} nesnesi yok.</span>`, 'warn');
        say(e, '🤷'); e.q.push(W(1, 'talk')); return;
      }
      target = d.anim === 'feed' ? list.slice().sort((a, b) => (+b.v.aclik || 0) - (+a.v.aclik || 0))[0] : pick(list);
    }
    const ch = applyFx(e, d);
    log(`<span class="o">${e.name}</span>.<span class="m">${pyN(m)}</span>(${target ? `<span class="o">${target.name}</span>` : ''})${ch.length ? `<span class="c">   # ${ch.join(', ')}</span>` : ''}${by ? `<span class="c">   ← ${by}</span>` : ''}`);
    say(e, d.say);
    refreshLook(e);
    behave(e, d, target);
  }

  function behave(e, d, target) {
    const q = e.q;
    switch (d.anim) {
      case 'walk': q.push(MV(randPt(e), 1, 'walk')); break;
      case 'run': q.push(MV(randPt(e), 2.2, 'run', '💨')); break;
      case 'eat': ptcE(e, pick(['🌿', '🍖', '🍉'])); q.push(W(1.6, 'eat')); break;
      case 'sleep': q.push(W(3.4, 'sleep', { every: 0.8, emoji: '💤' })); break;
      case 'roar':
        q.push(W(1.3, 'roar'));
        SIM.ents.forEach(o => {
          if (o !== e && (o.kind === 'zyr' || o.kind === 'bakici') && !o.inside && Math.hypot(o.x - e.x, o.y - e.y) < 280) {
            say(o, '😱'); if (!o.q.length || o.q[0].t !== 'jump') o.q.unshift({ t: 'jump', d: 0.5, el: 0 });
          }
        });
        break;
      case 'jump': q.push({ t: 'jump', d: 0.7, el: 0 }); break;
      case 'wag': q.push(W(1.6, 'wag')); break;
      case 'grow': q.push(W(1.1, 'grow')); break;
      case 'spin': q.push(W(1.4, 'spin')); break;
      case 'dance': q.push(W(1.8, 'dance', { every: 0.6, emoji: '🎶' })); break;
      case 'wave': ptcE(e, '👋'); q.push(W(1.4, 'talk')); break;
      case 'talk': q.push(W(1.6, 'talk')); break;
      case 'clap': q.push(W(1.4, 'talk', { every: 0.45, emoji: '👏' })); break;
      case 'icecream': ptcE(e, '🍦'); q.push(W(1.6, 'eat')); break;
      case 'photo': q.push(W(0.4, 'talk'), DO(() => { flash(); ptcE(e, '📸'); }), W(0.6, 'talk')); break;
      case 'whistle':
        ptcE(e, '🎵'); q.push(W(1.2, 'talk'));
        (e.links.bakar || []).forEach(dn => {
          if (dn.anim === 'sleep') return;
          dn.q = [MV(clampHome(dn, { x: e.x + rnd(-80, 80), y: e.y + rnd(-10, 20) }), 1.6, 'run'), DO(() => say(dn, '❗'))];
        });
        break;
      case 'drive': q.push(MV(randPt(e), 1, 'drive')); break;
      case 'turbo': q.push(MV(randPt(e), 2.4, 'drive', '🔥')); break;
      case 'honk': ptcE(e, '📢'); q.push(W(1, 'honk')); break;
      case 'music': q.push(W(2, 'talk', { every: 0.5, emoji: '🎵' })); break;
      case 'light': q.push(W(1, 'talk')); break;
      case 'stop': ptcE(e, '🛑'); q.push(W(1.2, '')); break;
      case 'fuel': q.push(MV(STATION, 1.2, 'drive'), DO(() => ptcE(e, '⛽')), W(1.2, '')); break;
      case 'gift': q.push(MV(SHOP, 1, 'walk'), DO(() => ptcE(e, '🧸')), W(1, 'talk')); break;
      case 'gateOpen': e.gateOpen = true; yvEl(e).classList.add('open'); q.push(W(1.2, '')); break;
      case 'gateClose': e.gateOpen = false; yvEl(e).classList.remove('open'); q.push(W(1.2, '')); break;
      case 'water': for (let i = 0; i < 8; i++) setTimeout(() => ptc(rnd(e.rect.x + 30, e.rect.x + e.rect.w - 30), rnd(e.rect.y + 60, e.rect.y + e.rect.h - 20), '💧'), i * 120); q.push(W(1.5, '')); break;
      case 'heat': ptc(e.x, e.y - 40, '🌡️'); q.push(W(1.2, '')); break;
      case 'plant': ptc(e.x, e.y - 40, '🌱'); q.push(W(1.2, '')); break;
      case 'alarm': { const y = yvEl(e); y.classList.remove('alarm'); void y.offsetWidth; y.classList.add('alarm'); ptc(e.x, e.y - 60, '🚨'); setTimeout(() => y.classList.remove('alarm'), 2000); q.push(W(2, '')); break; }
      case 'clean': { const y = yvEl(e); y.classList.add('sparkle'); for (let i = 0; i < 6; i++) setTimeout(() => ptc(rnd(e.rect.x + 30, e.rect.x + e.rect.w - 30), rnd(e.rect.y + 60, e.rect.y + e.rect.h - 20), '✨'), i * 140); setTimeout(() => y.classList.remove('sparkle'), 1500); q.push(W(1.5, '')); break; }
      case 'feed':
        q.push({ t: 'follow', target, dist: 52, s: 1.3, anim: 'walk', max: 9 },
          DO(() => { face(e, target); ptcE(target, '🍖'); callFrom(e, target, 'ye', 'yemVer'); }), W(0.8, 'talk'));
        break;
      case 'watch':
        q.push({ t: 'follow', target, dist: 95, s: 1, anim: 'walk', max: 9 },
          DO(() => { face(e, target); ptcE(e, '😍'); say(e, 'Vaaay! ' + target.name); }), W(1.4, 'talk'));
        break;
      case 'ride':
        q.push({ t: 'follow', target, dist: 40, s: 1.3, anim: 'walk', max: 9 }, DO(() => board(e, target)), { t: 'until', cond: () => !e.inside, max: 14 });
        break;
      case 'cleanHome': {
        const r = target.rect;
        q.push(MV({ x: r.x + r.w / 2 + rnd(-60, 60), y: r.y + r.h - 24 }, 1.2, 'walk'), DO(() => callFrom(e, target, 'temizle', 'yuvaTemizle')), W(1, 'talk'));
        break;
      }
      default: q.push(W(1.2, 'talk'));
    }
  }
  const yvEl = e => e.holder.querySelector('.yv') || e.holder;

  function callFrom(caller, target, key, viaMethod) {
    const m = target.c.methods.find(x => x.key === key);
    if (!m) {
      log(`<span class="c"># ⚠ ${target.name}.${key}() yok → ${esc(cname(target.kind))} sınıfına ${key}() metodunu ekle!</span>`, 'warn');
      say(caller, '❓'); return false;
    }
    if (m.vis === '-') {
      log(`${target.name}.__${key}()   ✖ private metot! Sadece ${esc(cname(target.kind))} sınıfının içinden çağrılabilir.`, 'err');
      say(caller, '🔒'); return false;
    }
    if (m.vis === '#') log(`<span class="c"># ⚠ _${key}() protected: dışarıdan çağrılması önerilmez.</span>`, 'warn');
    target.q = []; target.jump = 0;
    perform(target, m, `${caller.name}.${viaMethod}() içinden çağrıldı`);
    return true;
  }

  function board(keeper, jeep) {
    const jm = jeep.c.methods.find(x => x.key === 'sur');
    if (!jm) { log(`<span class="c"># ⚠ ${esc(cname('cip'))} sınıfında sur() metodu yok; ${keeper.name} cipi süremedi.</span>`, 'warn'); say(keeper, '❓'); return; }
    if (jm.vis === '-') { log(`${jeep.name}.__sur()   ✖ private metot! Bakıcı dışarıdan çağıramaz.`, 'err'); say(keeper, '🔒'); return; }
    keeper.inside = jeep; keeper.el.classList.add('inside');
    jeep.pass = jeep.pass || []; jeep.pass.push(keeper);
    jeep.q = [];
    perform(jeep, jm, `${keeper.name}.cipSur() içinden çağrıldı`);
    jeep.q.push(DO(() => unboard(jeep)));
  }
  function unboard(jeep) {
    (jeep.pass || []).forEach(p => { p.inside = null; p.el.classList.remove('inside'); p.x = clamp(jeep.x + 50, 40, 1160); p.y = jeep.y + 4; say(p, 'Ne güzel tur!'); });
    jeep.pass = [];
  }

  function nextTask(e) { e.q.shift(); if (!e.q.length) e.idle = rnd(0.5, 1.5); }

  function moveToward(e, gx, gy, sp, dt) {
    const dx = gx - e.x, dy = gy - e.y, dist = Math.hypot(dx, dy);
    if (Math.abs(dx) > 1) e.dir = dx > 0 ? 1 : -1;
    if (dist <= sp * dt) { e.x = gx; e.y = gy; return true; }
    e.x += dx / dist * sp * dt; e.y += dy / dist * sp * dt;
    return false;
  }

  function step(e, dt) {
    if (e.inside) { e.x = e.inside.x; e.y = e.inside.y; }
    const k = e.q[0];
    if (!k) {
      e.anim = '';
      if (SIM.auto) { e.idle -= dt; if (e.idle <= 0) think(e); }
      return;
    }
    switch (k.t) {
      case 'move': {
        e.anim = k.anim || 'walk';
        if (moveToward(e, k.x, k.y, speedOf(e) * k.s, dt)) nextTask(e);
        if (k.trail) { k.tt = (k.tt || 0) + dt; if (k.tt > 0.25) { k.tt = 0; ptc(e.x - e.dir * 40, e.y - 10, k.trail); } }
        break;
      }
      case 'follow': {
        const tg = k.target; e.anim = k.anim;
        k.max -= dt;
        const side = e.x < tg.x ? -1 : 1;
        const done = moveToward(e, tg.x + side * k.dist, tg.y + 2, speedOf(e) * k.s, dt);
        if (done || k.max <= 0 || tg.inside) nextTask(e);
        break;
      }
      case 'wait':
        e.anim = k.anim; k.d -= dt;
        if (k.every) { k.tt = (k.tt || 0) + dt; if (k.tt >= k.every) { k.tt = 0; ptcE(e, k.emoji); } }
        if (k.d <= 0) nextTask(e);
        break;
      case 'jump':
        e.anim = ''; k.el += dt;
        e.jump = Math.sin(Math.PI * clamp(k.el / k.d, 0, 1)) * 46;
        if (k.el >= k.d) { e.jump = 0; nextTask(e); }
        break;
      case 'do': e.q.shift(); k.fn(); if (!e.q.length) e.idle = rnd(0.5, 1.5); break;
      case 'until':
        e.anim = ''; k.max -= dt;
        if (k.cond()) nextTask(e);
        else if (k.max <= 0) { if (e.inside) unboard(e.inside); nextTask(e); }
        break;
      default: nextTask(e);
    }
  }

  function think(e) {
    const ms = e.c.methods;
    if (!ms.length) {
      e.idle = 5;
      if (!e.toldNo) { e.toldNo = true; say(e, 'Hiç metodum yok 😶', 2500); log(`<span class="c"># ${esc(cname(e.kind))} sınıfında metot yok; ${e.name} hiçbir şey yapamıyor.</span>`, 'warn'); }
      return;
    }
    const has = k => ms.find(m => m.key === k);
    let m = null;
    if (e.kind === 'dino') {
      if (hasA(e.c, 'aclik') && +e.v.aclik > 75 && has('ye')) m = has('ye');
      else if (hasA(e.c, 'enerji') && +e.v.enerji < 25 && has('uyu')) m = has('uyu');
    }
    if (e.kind === 'bakici' && has('yemVer') && (e.links.bakar || []).some(d => hasA(d.c, 'aclik') && +d.v.aclik > 60) && Math.random() < 0.7) m = has('yemVer');
    if (e.kind === 'cip' && hasA(e.c, 'yakit') && +e.v.yakit < 20 && has('yakitAl')) m = has('yakitAl');
    if (e.kind === 'yuva' && hasA(e.c, 'temizlik') && +e.v.temizlik < 30 && has('temizle')) m = has('temizle');
    if (!m) {
      const pool = ms.length > 1 ? ms.filter(x => x !== e.lastM) : ms;
      const wt = x => (['walk', 'run', 'drive', 'watch', 'feed'].includes(methodDef(e.kind, x).anim) ? 2.5 : 1);
      let r = Math.random() * pool.reduce((s, x) => s + wt(x), 0);
      m = pool.find(x => (r -= wt(x)) <= 0) || pool[0];
    }
    e.lastM = m;
    perform(e, m, null);
    if (e.kind === 'yuva') e.idle = rnd(4, 8);
  }

  function drift() {
    SIM.ents.forEach(e => {
      const v = e.v, c = e.c;
      if (e.kind === 'dino') {
        if (hasA(c, 'aclik')) { v.aclik = clamp(Math.round((+v.aclik + 1.5) * 10) / 10, 0, 100); if (v.aclik >= 90 && Math.random() < 0.15) say(e, 'Acıktım! 🍖'); }
        if (hasA(c, 'enerji') && e.anim !== 'sleep') v.enerji = clamp(Math.round((+v.enerji - 0.8) * 10) / 10, 0, 100);
      }
      if (e.kind === 'yuva' && hasA(c, 'temizlik')) v.temizlik = clamp(Math.round((+v.temizlik - 0.7) * 10) / 10, 0, 100);
      if (e.kind === 'zyr' && hasA(c, 'mutluluk')) v.mutluluk = clamp(Math.round((+v.mutluluk - 0.4) * 10) / 10, 0, 100);
    });
  }

  function draw(e) {
    if (e.kind === 'yuva') return;
    e.el.style.transform = `translate(${e.x}px, ${e.y - e.jump}px)`;
    e.el.style.zIndex = 10 + Math.round(e.y);
    e.flip.style.transform = `scaleX(${e.dir})`;
    if (e.shownAnim !== e.anim) { e.shownAnim = e.anim; e.fig.className = 'ent-fig ' + animCss(e.anim); }
  }

  function loop(now) {
    if (!SIM) return;
    const dtR = Math.min(0.05, (now - SIM.last) / 1000); SIM.last = now;
    if (!SIM.paused) {
      const dt = dtR * SIM.speed;
      SIM.ents.forEach(e => step(e, dt));
      SIM.acc += dt; if (SIM.acc >= 1) { SIM.acc -= 1; drift(); }
    }
    SIM.ents.forEach(draw);
    SIM.slow += dtR;
    if (SIM.slow > 0.25) { SIM.slow = 0; SIM.ents.forEach(refreshLook); updInsp(); }
    SIM.raf = requestAnimationFrame(loop);
  }

  /* ---- müfettiş (inspector) ---- */
  function renderInsp() {
    const box = $('#sim-insp'); if (!box || !SIM) return;
    const e = SIM.sel;
    if (!e) {
      box.innerHTML = '<div class="insp-empty">👆 Sahnedeki bir nesneye tıkla.<br><br>Özelliklerini gör, metotlarını elle çağır ve gizli (private) bilgilere dışarıdan ulaşmayı dene.</div>';
      return;
    }
    const c = e.c, K = KINDS[e.kind];
    const rels = Object.entries(e.links).map(([k, arr]) => `<div>${REL[k].label} → ${arr.map(x => `<u>${x.name}</u>`).join(', ')}</div>`).join('');
    box.innerHTML = `<h3>${e.name} : ${esc(cname(e.kind))}</h3><div class="k">${K.label} sınıfından üretilmiş bir nesne</div>
      <h4>Özellikler</h4>
      ${c.attrs.map(a => `<div class="ins-row"><span class="vis-sym ${VIS[a.vis].cls}" title="${VIS[a.vis].name}">${VIS[a.vis].sym}</span><span>${pyN(a)}</span><span class="val" id="iv-${a.key}">${esc(fmt(e.v[a.key]))}</span><button data-iset="${a.key}" title="Dışarıdan değiştirmeyi dene">✎</button>${T.iedit === a.key ? editRow(e, a) : ''}</div>`).join('') || '<div class="insp-empty">Bu sınıfın özelliği yok.</div>'}
      ${rels ? `<h4>İlişkiler</h4><div class="ins-rel">${rels}</div>` : ''}
      <h4>Metot çağır</h4>
      <div class="ins-meths" style="--k:${K.color};--ks:${K.soft}">${c.methods.map(m => `<button data-icall="${m.key}" title="${esc(methodDef(e.kind, m).hint || '')}"><span class="vs">${VIS[m.vis].sym}</span>${m.key}()</button>`).join('') || 'Metot yok.'}</div>
      <div class="ins-note"><b>Dışarıdan erişim kuralı</b><br><span class="vis-sym v-pub" style="width:20px;height:20px;font-size:13px">+</span> değiştirilebilir · <span class="vis-sym v-prot" style="width:20px;height:20px;font-size:13px">#</span> uyarı alırsın · <span class="vis-sym v-priv" style="width:20px;height:20px;font-size:13px">−</span> engellenir</div>`;
    const ie = $('#ied'); if (ie) ie.focus();
  }
  function editRow(e, a) {
    const v = e.v[a.key];
    let input;
    if (a.type === 'color') input = `<select id="ied">${CN.map(n => `<option ${n === v ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    else if (a.type === 'bool') input = `<select id="ied"><option value="1" ${v ? 'selected' : ''}>True</option><option value="0" ${!v ? 'selected' : ''}>False</option></select>`;
    else input = `<input id="ied" type="${a.type === 'str' ? 'text' : 'number'}" value="${esc(v)}" spellcheck="false">`;
    return `<div class="ins-edit">${input}<button data-iapply="${a.key}">Uygula</button></div>`;
  }
  function updInsp() {
    const e = SIM && SIM.sel; if (!e) return;
    e.c.attrs.forEach(a => { const s = document.getElementById('iv-' + a.key); if (s) s.textContent = fmt(e.v[a.key]); });
  }
  function selectEnt(e) {
    $$('#sim-stage .sel').forEach(x => x.classList.remove('sel'));
    SIM.sel = e; T.iedit = null;
    if (e) e.el.classList.add('sel');
    renderInsp();
  }
  function markEvent(k) {
    if (S.events[k]) return;
    S.events[k] = true; save(); evaluate(); renderTop(); renderSide();
  }

  function onSimClick(ev) {
    if (!SIM) return;
    const t = ev.target;
    const sb = t.closest('[data-sim]');
    if (sb) {
      const a = sb.dataset.sim;
      if (a === 'close') closeSim();
      else if (a === 'pause') { SIM.paused = !SIM.paused; sb.textContent = SIM.paused ? '▶ Devam' : '⏸ Duraklat'; }
      else if (a === 'speed') { SIM.speed = SIM.speed === 1 ? 2 : SIM.speed === 2 ? 0.5 : 1; sb.textContent = 'Hız: ' + SIM.speed + 'x'; }
      return;
    }
    const ent = t.closest('[data-eid]');
    if (ent) { selectEnt(entOf(ent.dataset.eid)); return; }
    const e = SIM.sel; if (!e) return;
    const set = t.closest('[data-iset]');
    if (set) {
      const a = e.c.attrs.find(x => x.key === set.dataset.iset);
      if (a.vis === '-') {
        const cn = esc(cname(e.kind));
        log(`>>> ${e.name}.__${a.key} = ...`);
        log(`🔒 Engellendi! __${a.key} private: sadece ${cn} sınıfının kendi metotları değiştirebilir.`, 'err');
        log(`<span class="c"># Python bu adı _${cn}__${a.key} olarak gizler (name mangling); dışarıdan ${e.name}.__${a.key} ile gerçek değere ulaşılamaz.</span>`);
        say(e, '🔒 Gizli bilgi!', 2200);
        toast(`🔒 ${a.key} private! Dışarıdan değiştirilemez; değiştirmek için sınıfın kendi metodu gerekir.`, 'bad', 4200);
        markEvent('private');
        return;
      }
      T.iedit = T.iedit === a.key ? null : a.key;
      renderInsp();
      return;
    }
    const ap = t.closest('[data-iapply]');
    if (ap) {
      const a = e.c.attrs.find(x => x.key === ap.dataset.iapply);
      const raw = $('#ied').value;
      let v;
      if (a.type === 'bool') v = raw === '1';
      else if (a.type === 'int') v = parseInt(raw, 10) || 0;
      else if (a.type === 'float') v = parseFloat(raw) || 0;
      else v = raw;
      if (a.key in BAR) v = clamp(v, 0, 100);
      e.v[a.key] = v;
      log(`>>> ${e.name}.${pyN(a)} = ${esc(pyVal(v, a.type))}`, a.vis === '#' ? 'warn' : 'ok');
      if (a.vis === '#') log(`<span class="c"># ⚠ _${a.key} protected: Python izin verir ama kural olarak yalnızca sınıf ve alt sınıfları değiştirmeli.</span>`, 'warn');
      T.iedit = null; refreshLook(e); renderInsp();
      return;
    }
    const call = t.closest('[data-icall]');
    if (call) {
      const m = e.c.methods.find(x => x.key === call.dataset.icall);
      if (m.vis === '-') {
        log(`>>> ${e.name}.__${m.key}()`);
        log(`🔒 private metot! ${m.key}() sadece ${esc(cname(e.kind))} sınıfının içinden çağrılabilir.`, 'err');
        say(e, '🔒'); markEvent('manual');
        return;
      }
      if (m.vis === '#') log(`<span class="c"># ⚠ _${m.key}() protected: dışarıdan çağırmak kurala aykırı ama Python izin verir.</span>`, 'warn');
      if (e.inside) unboard(e.inside);
      e.q = []; e.jump = 0;
      perform(e, m, 'elle çağrıldı');
      markEvent('manual');
    }
  }

  /* ---------------- dışa açık ---------------- */
  function ensureGlobals() {
    if (!$('#nyp-modal')) {
      const m = document.createElement('div'); m.className = 'modal'; m.id = 'nyp-modal'; m.hidden = true;
      m.innerHTML = '<div class="modal-card" id="nyp-modal-card" role="dialog" aria-modal="true"></div>';
      document.body.appendChild(m);
    }
    if (!$('#nyp-toasts')) { const t = document.createElement('div'); t.className = 'toasts'; t.id = 'nyp-toasts'; t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    if (!$('#nyp-sim')) { const s = document.createElement('div'); s.className = 'sim'; s.id = 'nyp-sim'; s.hidden = true; document.body.appendChild(s); }
  }

  function mount(el) {
    root = el;
    ensureGlobals();
    root.innerHTML = shellHTML();
    root.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    root.addEventListener('click', onClick);
    document.addEventListener('nyp-ogretmen', () => { const b = $('#h4-tbtn'); if (b) b.hidden = false; });
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
    root.addEventListener('pointerover', e => {
      const ch = e.target.closest('.chip');
      if (!ch) return;
      const K = KINDS[ch.dataset.kind];
      const d = ch.dataset.drag === 'attr' ? K.attrs.find(a => a.key === ch.dataset.key) : K.methods.find(m => m.key === ch.dataset.key);
      $('#h4-pinfo').innerHTML = `<b>${d.key}${ch.dataset.drag === 'attr' ? ': ' + typeStr(d.type) : '()'}</b> — ${esc(d.hint)}`;
    });
    root.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.closest('.ub-form')) { e.preventDefault(); submitForm(); }
      if (e.key === 'Enter' && e.target.classList.contains('ub-name')) e.target.blur();
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (!$('#nyp-modal').hidden) { $('#nyp-modal').hidden = true; return; }
      if (SIM) { closeSim(); return; }
      if (T.connectFrom) { T.connectFrom = null; renderCanvas(); }
      if (T.form) { T.form = null; renderCanvas(); }
    });
    const sim = $('#nyp-sim');
    sim.addEventListener('click', onSimClick);
    sim.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'ied') { const b = $('[data-iapply]'); if (b) b.click(); } });
    sim.addEventListener('change', e => { if (e.target.id === 'sim-auto' && SIM) SIM.auto = e.target.checked; });
    renderAll();
  }

  return { mount, refresh: () => renderAll() };
})();
