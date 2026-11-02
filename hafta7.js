/* =========================================================================
   7. HAFTA — Kantin Express: Stajyerin İlk Günü (Çok Biçimlilik)
   Öğrenci, kampüs yemek uygulamasında staja başlar. Ekran bir masaüstü
   işletim sistemidir (KantinOS): pencereler sürüklenir, görevler ekip
   sohbetinden bilet olarak gelir.
     · Kod      → çok dosyalı editör; "Canlıya al" kodu test edip yayına alır.
     · Canlı    → sipariş uygulaması: kuryeler öğrencinin sure() sonucuna göre
                  haritada yürür, fiyatlar onun fiyat() metodundan gelir.
     · Mimari   → UML bu sefer ters yönde: öğrencinin KODUNDAN kendiliğinden çizilir.
     · İnceleme → bir ekip arkadaşının kodundaki hatalı satırlara tıklanır.
   Durum yalnızca bu sekme açıkken saklanır (sessionStorage).
   Son bilet: UML + kod + gün sonu raporu PDF'i (ad, soyad, okul no zorunlu).
   ========================================================================= */
window.Hafta7 = (function () {
  'use strict';

  /* ---------------- küçük yardımcılar ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function debounce(fn, ms) { let t; const f = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; return f; }
  const fold = s => String(s || '').toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]/g, '');
  const para = v => (v == null ? '?' : (Math.round(v * 100) / 100).toLocaleString('tr-TR'));

  /* =====================================================================
     EKİP ve İÇERİK
     ===================================================================== */
  const SAVE_KEY = 'nyp-hafta7-kantin-v2';
  const WHO = {
    cem: { ad: 'Cem Abi', rol: 'Kıdemli geliştirici', em: '🧔', c: '#BFE3FF' },
    zey: { ad: 'Zeynep', rol: 'Ürün yöneticisi', em: '👩‍💼', c: '#FFD9E8' },
    kaan: { ad: 'Kaan', rol: 'Diğer stajyer', em: '🙃', c: '#FFE9A8' },
    hkn: { ad: 'Hakan Bey', rol: 'Kurucu', em: '🕴️', c: '#D9D3FF' },
    naz: { ad: 'Nazlı', rol: 'Müşteri destek', em: '🎧', c: '#C9F2DF' },
    bot: { ad: 'DeployBot', rol: 'Otomasyon', em: '🤖', c: '#E6E6EA' }
  };
  const CHAPTERS = ['Eski kodla tanışma', 'Tek çağrı, çok davranış', 'Büyük temizlik', 'Dokunma, genişlet', '🚨 Üretim olayı', 'Python\'un kendi çok biçimliliği', 'Mesai bitiyor'];

  const ESKI = `# eski_odeme.py — 2019'dan kalma. Hâlâ canlıda. Dokunan pişman olur.

def odeme_al(tip, tutar, bakiye):
    if tip == "nakit":
        return True
    elif tip == "kart":
        return tutar <= bakiye
    elif tip == "yemek":
        return tutar <= bakiye and tutar <= 300

def fis_yaz(tip, tutar):
    if tip == "nakit":
        return "Nakit: " + str(tutar)
    elif tip == "kart":
        return "Kart: " + str(tutar)
    elif tip == "yemek":
        return "Yemek Kartı: " + str(tutar)

def komisyon(tip, tutar):
    if tip == "nakit":
        return 0
    elif tip == "kart":
        return tutar * 0.02
    elif tip == "yemek":
        return tutar * 0.05
`;
  const REVIEWS = {
    eski: {
      title: 'eski_odeme.py', by: 'cem', ask: 'Patron yarın <b>kripto ile ödeme</b> istiyor. Bu dosyada kaç ayrı yere dokunman gerekir? Her <b>dallanmanın başladığı</b> satıra tıkla.',
      code: ESKI, bad: [4, 12, 20],
      miss: 'Hepsi bu kadar değil. Tür kontrolü başka fonksiyonlarda da tekrar ediyor; her zincirin ilk satırını işaretle.',
      wrong: 'İşaretlediğin satırlardan bazıları zincirin başı değil. Her fonksiyonda tek bir satır yeterli: tip\'e ilk bakılan yer.'
    },
    kaan: {
      title: 'Kaan\'ın değişikliği · siparis.py', by: 'kaan', ask: 'Kaan <code>odemeyi_al()</code> metodunu "düzeltmiş". Hakan Bey\'in kuralını çiğneyen <b>tür kontrolü satırlarına</b> tıkla ve reddet.',
      code: `class Siparis:
    # ... (diğer metotlar aynı)

    def odemeyi_al(self):
        tutar = self.toplam()
        if isinstance(self.odeme, Nakit):
            return True
        elif isinstance(self.odeme, Kart):
            return self.odeme.ode(tutar)
        elif self.odeme.tur() == "Yemek Kartı":
            return self.odeme.ode(tutar)
        return False
`, bad: [6, 8, 10],
      miss: 'Hâlâ gözünden kaçan bir tür kontrolü var. isinstance\'ın kılık değiştirmiş hâllerine de bak.',
      wrong: 'İşaretlediğin bir satır aslında masum. Yalnızca "bu nesnenin türü ne?" diye soran satırları işaretle.'
    }
  };

  const T_ = (id, ch, type, title, o) => Object.assign({ id, ch, type, title }, o);
  const TICKETS = [
    T_('KE-01', 0, 'review', 'Eski kodun derdini gör', {
      rev: 'eski',
      say: [['hkn', 'Hoş geldin stajyer! 🎉 Burası Kantin Express: öğrenciler telefondan tost ısmarlıyor, kuryelerimiz getiriyor.'],
        ['hkn', 'Bir derdim var: geçen ay uygulamaya "yemek kartı" ile ödemeyi eklemek <b>3 gün</b> sürdü. Tek bir ödeme türü, 3 gün! Bugün bunu çözmeni istiyorum.'],
        ['cem', 'Selam, ben Cem, sana yardım edeceğim. Önce sorunu kendi gözünle gör: <b>Kod İnceleme</b> penceresinde eski ödeme kodumuz açık. Yapacağın iş, en üstteki bilette yazıyor. 👆']],
      why: 'Eski kod neden bu kadar yavaş değişiyor, bunu kendin bulacaksın. Henüz kod yazmıyorsun, sadece okuyorsun.',
      spec: ['<b>Kod İnceleme</b> penceresindeki kodu oku.', 'Her fonksiyonda ödeme türüne ilk bakılan satırı (<code>if tip == ...</code>) bul ve üstüne tıkla.', '<b>Gönder</b>\'e bas.'],
      done: [['cem', 'Aynen, <b>3 ayrı yer</b>. Yeni bir ödeme türü gelince üçünü de değiştirmek gerekiyor; birini unutursan fiş ya da komisyon yanlış çıkıyor. Hakan Bey\'in 3 günü buradan geliyor.'],
        ['cem', '<b>Çözüm şu:</b> Kimse dışarıdan "sen hangi türsün?" diye sormayacak. Her tür kendi sınıfında olacak ve kendi işini kendi metodunda yapacak.'],
        ['cem', 'Bunu ödemeye geçmeden önce daha kolay bir yerde öğrenelim: kantinin <b>ürünleri</b>. İlk iş: bütün ürünlerin ortak atası olan <code>Urun</code> sınıfını yazmak.']]
    }),
    T_('KE-02', 0, 'code', 'Urun sınıfını yaz', {
      tests: ['urun'], wiki: 'super', files: ['urunler/urun.py'],
      why: 'Kantinde satılan her şey (tost, çay, menü) birer üründür. Hepsinin ortak noktalarını taşıyan temel sınıfla başlıyoruz.',
      spec: ['<code>Urun</code> adında bir sınıf yaz.', '<code>__init__</code> metodu ürünün adını ve taban fiyatını alsın, bunları <code>ad</code> ve <code>taban_fiyat</code> adlı özelliklerde saklasın.', '<code>fiyat</code> adında bir metot ekle. Dışarıdan bilgi almasın. Şimdilik sakladığın taban fiyatı ekrana yazmasın, çağıran yere <b>geri versin</b>.', '<b>🚀 Canlıya Al</b>\'a bas.'],
      ex: [['Urun("Çay", 15).ad', '"Çay"'], ['Urun("Çay", 15).fiyat()', '15']],
      hints: ['Bu sınıfta iki metot var: nesne oluşurken çalışan __init__ ve fiyatı veren metot. Geçen haftalarda Ev sınıfını da böyle yazmıştın.', 'Aldığın değerler metot bitince kaybolmasın diye nesnenin üzerine kaydedilmeli. fiyat metodunda print kullanırsan test değeri alamaz; sonucu geri vermen gerekiyor.'],
      done: [['cem', 'Güzel, temel sınıf hazır. Şimdi asıl konu: <b>tost</b>. Tost da bir üründür ama fiyatı farklı hesaplanır.']]
    }),
    T_('KE-03', 0, 'code', 'Tost: fiyat()\'ı kendine göre yaz', {
      tests: ['tost'], wiki: 'super', files: ['urunler/tost.py'],
      say: [['zey', 'Merhaba, ben Zeynep, ürün yöneticisiyim. Tostta <b>ekstra kaşar</b> seçeneği var: isteyene 15 TL fazla. Çayda böyle bir şey yok, o yüzden bu kural Urun\'a değil, Tost\'a ait.']],
      why: 'Tost da bir Urun\'dur, yani Urun\'dan miras alır. Ama fiyatını kendine göre hesaplar. Miras aldığın metodu alt sınıfta aynı adla yeniden yazmaya override denir.',
      spec: ['<code>Tost</code> sınıfı <code>Urun</code>\'dan miras alsın.', '<code>__init__</code> metodu üç bilgi alsın: ad, taban fiyat ve ekstra kaşar (True ya da False).', 'Ad ve taban fiyatı saklama işini yeniden yazma. O iş miras aldığın sınıfta zaten var: onun <code>__init__</code> metodunu çağırıp bu iki bilgiyi ona ver. Ekstra kaşarı Urun bilmiyor, onu Tost kendisi <code>ekstra_kasar</code> özelliğinde saklasın.', '<code>fiyat</code> metodunu Tost içinde yeniden yaz: taban fiyatı miras aldığın sınıfın <code>fiyat</code> metodunu çağırarak öğren, ekstra kaşar varsa 15 ekle, sonucu geri ver.'],
      ex: [['Tost("Kaşarlı", 60, True).fiyat()', '75'], ['Tost("Sade", 60, False).fiyat()', '60']],
      hints: ['Urun\'un dosyasına dokunmana gerek yok. Tost, Urun\'daki her şeyi miras alıyor.', 'Miras aldığın sınıfın metodunu nasıl çağıracağını 📚 Wiki\'deki "super()" sayfasında, başka bir sınıf üzerinde görebilirsin.'],
      done: [['cem', 'İşte <b>override</b>: aynı metot adı, farklı davranış. <code>super()</code> da "ebeveynim bunu nasıl yapıyordu?" demek. Taban fiyatı iki kez yazmadın, ebeveynden aldın.']]
    }),
    T_('KE-04', 0, 'code', 'Icecek: başka bir fiyat()', {
      tests: ['icecek'], wiki: 'super', files: ['urunler/icecek.py'],
      say: [['zey', 'İçeceklerde kural başka: <b>büyük boy 1.5 katı</b> fiyatına satılıyor.']],
      why: 'Tost\'un yaptığının aynısını başka bir kuralla yapacaksın. Böylece aynı fiyat() çağrısı, nesneye göre farklı sonuç verecek.',
      spec: ['<code>Icecek</code> sınıfı <code>Urun</code>\'dan miras alsın.', '<code>__init__</code> metodu üç bilgi alsın: ad, taban fiyat ve boy. Boy, <code>"kucuk"</code> ya da <code>"buyuk"</code> olur. Ad ve taban fiyatı yine miras aldığın sınıfa ver, boyu kendin <code>boy</code> özelliğinde sakla.', '<code>fiyat</code> metodunu yeniden yaz: fiyatı miras aldığın sınıftan öğren. Boy büyükse 1.5 katını, değilse aynısını geri ver.'],
      ex: [['Icecek("Ayran", 20, "buyuk").fiyat()', '30.0'], ['Icecek("Ayran", 20, "kucuk").fiyat()', '20']],
      hints: ['Tost\'a çok benziyor. Dosyasına bakıp kalıbı uygula.', 'Buradaki if sorun değil: nesne kendi özelliğine bakıyor, başka bir nesnenin türüne değil.'],
      done: [['kaan', 'Selaaam, ben Kaan, diğer stajyer 🙃 Cem Abi sabah toplantısında soru soruyor, benden söylemesi. Ben dün bilemedim.']]
    }),
    T_('KE-05', 0, 'quiz', 'Sabah toplantısı: bu kod ne yazar?', {
      code: `class Urun:
    def __init__(self, ad, f):
        self.ad = ad
        self.f = f
    def fiyat(self):
        return self.f

class Tost(Urun):
    def fiyat(self):
        return super().fiyat() + 15

print(Urun("Çay", 10).fiyat(), Tost("Tost", 50).fiyat())`,
      why: 'Kod yazmadan, sadece okuyarak hangi metodun çalışacağını tahmin edeceksin.',
      spec: ['Aşağıda, sohbetteki soruyu oku.', 'Kodu <b>çalıştırmadan</b> doğru cevaba tıkla. Yanlış yaparsan neden yanlış olduğunu söyler, tekrar dene.'],
      ask: 'Cem Abi soruyor: Bu kod ekrana ne yazar?',
      opts: ['10 65', '10 50', '25 65', 'Hata verir'], a: 0,
      why_: ['Evet. Her nesne kendi sınıfının fiyat()\'ını kullanır: Urun → 10, Tost → 50 + 15.', 'Tost kendi fiyat()\'ını yazdı, ebeveynin 50\'si artı 15 döner.', 'Çay bir Urun; Tost\'un kodu ona uygulanmaz. Hangi kodun çalışacağına nesnenin sınıfı karar verir.', 'Tost __init__ yazmadığı için ebeveyninkini kullanır; hata yok.'],
      done: [['cem', 'Doğru. Şimdi bugünün en önemli sorusu geliyor.']]
    }),
    T_('KE-06', 1, 'quiz', 'Sabah toplantısı: tek döngü', {
      code: `toplam = 0
for u in [Urun("A", 10), Tost("B", 10), Urun("C", 10)]:
    toplam += u.fiyat()
print(toplam)`,
      why: 'Listede farklı sınıflardan nesneler var ama döngü türlerine bakmıyor. Sonuç ne olur?',
      spec: ['Aşağıda, sohbetteki soruyu oku ve cevapla.', 'Sınıflar bir önceki sorudakilerle aynı: Tost, fiyata 15 ekliyor.'],
      ask: 'Bu döngü ne yazdırır?',
      opts: ['30', '45', '55', 'Hata: listede farklı türler var'], a: 1,
      why_: ['Listedeki Tost kendi fiyat()\'ını kullanıyor; 10 değil 25 eder.', 'Evet! 10 + 25 + 10. u.fiyat() satırı tek ama her nesnede kendi kodu çalışıyor.', 'Tost 25 eder ama diğer ikisi düz Urun; onlara 15 eklenmez.', 'Python listesi her türü tutabilir. Önemli olan hepsinin fiyat() bilmesi.'],
      done: [['cem', '<b>Bugünün konusu bu: çok biçimlilik (polymorphism).</b> Tek satır var: <code>u.fiyat()</code>. Ama hangi kodun çalışacağına nesnenin sınıfı karar veriyor. Döngü, türleri bilmiyor; bilmesi de gerekmiyor.']]
    }),
    T_('KE-07', 1, 'code', 'Menu: içinde başka ürünler olan ürün', {
      tests: ['menu'], wiki: 'poly', files: ['urunler/menu.py'],
      say: [['zey', 'Öğrenci Menüsü çıkarıyoruz: birkaç ürün bir arada, <b>%15 indirimli</b>. Menünün kendi fiyatı yok, fiyatı içindeki ürünlerden hesaplanacak.']],
      why: 'Az önceki döngüyü gerçek bir sınıfta kullanacaksın. Menü, içindeki ürünlerin türünü bilmeden fiyatını toplayacak.',
      spec: ['<code>Menu</code> sınıfı <code>Urun</code>\'dan miras alsın: menü de bir üründür.', '<code>__init__</code> metodu iki bilgi alsın: menünün adı ve ürün nesnelerinden oluşan bir liste.', 'Menünün kendi taban fiyatı yok. Miras aldığın sınıfın <code>__init__</code> metoduna adı ve taban fiyat olarak 0 ver.', 'Ürün listesini <code>urunler</code> özelliğinde sakla.', '<code>fiyat</code> metodunu yeniden yaz: listedeki her üründen kendi fiyatını iste, hepsini topla. Toplamın %15 indirimli hâlini (<b>0.85</b> katını) geri ver.', 'Ürünün türünü soran kod yazma (<code>isinstance</code> gibi).'],
      ex: [['tost = Tost("Kaşarlı", 60, True)   # 75 TL', ''], ['ayran = Icecek("Ayran", 20, "buyuk")   # 30 TL', ''], ['Menu("Öğrenci", [tost, ayran]).fiyat()', '89.25']],
      hints: ['Liste __init__ içinde oluşturulmuyor, nesne üretilirken dışarıdan geliyor. Örneğe bak: tost ve ayran bir listeye konup Menu\'ye veriliyor.', 'KE-06\'daki döngüyü hatırla: bir toplam değişkeni, ürünleri gezen bir döngü, her adımda ürünün fiyatını toplama ekleme. İndirimi döngü bittikten sonra uygula.'],
      done: [['cem', 'Fark ettin mi? Menü de bir Urun olduğu için menünün içine menü de koyabilirsin, kod hiç değişmeden çalışır.']]
    }),
    T_('KE-08', 1, 'live', 'İlk yayın: menü telefonda', {
      fresh: true,
      say: [['hkn', 'Telefonda görmek istiyorum! 📱 Şu menüyü yayına al bakalım.']],
      why: 'Yazdığın sınıflar artık gerçek uygulamada çalışacak.',
      spec: ['Kod yazmana gerek yok. Sadece <b>🚀 Canlıya Al</b>\'a bas.', 'Sağdaki <b>Canlı</b> penceresinde <b>Menü</b> sekmesine bak: fiyatlar senin <code>fiyat()</code> metotlarından geliyor.'],
      done: [['bot', '✅ Sürüm yayında. Menü: Tost, İçecek, Menü.'], ['hkn', 'Oldu! Sıra para almada 💸'], ['cem', 'Şimdi sabahki sorunu, yani <b>ödeme</b> kodunu temizliyoruz. Aynı fikir: her ödeme türü kendi sınıfında olacak.']]
    }),
    T_('KE-09', 2, 'code', 'Odeme: bütün ödemelerin sözleşmesi', {
      tests: ['odeme'], wiki: 'soyut', files: ['odeme/odeme.py'],
      say: [['cem', 'Her ödeme türü aynı iki soruyu cevaplamak zorunda: <i>"Bu tutarı ödeyebilir misin?"</i> ve <i>"Adın ne?"</i> Ama cevap türe göre değişir. O yüzden önce kuralları koyan bir <b>soyut sınıf</b> yazıyoruz.']],
      why: 'Soyut sınıf "her ödeme bunları yapmak zorunda" der ama nasıl yapılacağını alt sınıflara bırakır. Kendisinden nesne üretilemez.',
      spec: ['<code>Odeme</code> soyut bir sınıf olsun: dosyanın başındaki import satırından gelen <code>ABC</code>\'den miras alsın.', '<code>__init__</code> metodu ödemenin sahibini alsın, <code>sahip</code> özelliğinde saklasın.', '<code>ode</code> adında soyut bir metot ekle. Ödenecek tutarı alır. Gövdesi boş kalacak; nasıl ödeneceğini alt sınıflar belirleyecek.', '<code>tur</code> adında soyut bir metot ekle. Dışarıdan bilgi almaz, gövdesi yine boş.', '<code>fis_satiri</code> adında <b>dolu</b> bir metot ekle. Tutarı alsın; ödeme türünün adını <code>tur</code> metodundan öğrensin, tutarla birleştirip metin olarak geri versin.'],
      ex: [['# Kart nesnesi için (sonraki biletlerde yazacaksın):', ''], ['kart.fis_satiri(50)', '"Kart: 50 TL"']],
      hints: ['Bir metodu soyut yapmak için üstüne özel bir işaret konur. 📚 Wiki\'deki "Soyut sözleşme" sayfasında başka bir sınıf üzerinde örneği var.', 'fis_satiri içinden aynı sınıfın tur metodunu çağıracaksın. tur burada boş görünüyor ama alt sınıflar doldurunca onlarınki çalışacak. Metni örnekteki biçimde oluştur.'],
      done: [['cem', 'Dikkat: <code>fis_satiri</code> soyut bir metodu çağırıyor. Ebeveyn iskeleti yazıyor, ayrıntıyı çocuklar dolduruyor.']]
    }),
    T_('KE-10', 2, 'quiz', 'Sabah toplantısı: soyuttan nesne', {
      code: `o = Odeme("Ali")
print(o.fis_satiri(50))`,
      say: [['kaan', 'Ben <code>Odeme</code>\'den doğrudan nesne üretip denedim, bilin bakalım ne oldu 😅']],
      why: 'Soyut sınıfın koruması nasıl çalışıyor, onu göreceksin.',
      spec: ['Aşağıda, sohbetteki soruyu oku ve cevapla.'],
      ask: 'Kaan bu kodu çalıştırınca ne olur?',
      opts: ['Boş bir fiş yazar', 'None yazar', 'TypeError: soyut sınıftan nesne üretilemez', 'İkinci satırda hata verir'], a: 2,
      why_: ['Fiş yazma aşamasına gelemez; ilk satır hata verir.', 'Oraya gelemez; ilk satır hata verir.', 'Evet. Bu bir bozukluk değil, koruma: "yarım tarif"ten yemek çıkmaz. Python hatayı en başta yakalıyor.', 'Birinci satır zaten çalışmaz: soyut metotları doldurulmamış sınıftan nesne olmaz.'],
      done: [['kaan', 'Aynen öyle oldu. Bir de "hata buldum" diye Cem Abi\'ye yazmıştım, utandım 🙃'], ['cem', 'Şimdi sözleşmeyi dolduran gerçek ödeme türlerini yazalım.']]
    }),
    T_('KE-11', 2, 'code', 'Nakit ve Kart sınıfları', {
      tests: ['nakit_kart'], wiki: 'soyut', files: ['odeme/nakit.py', 'odeme/kart.py'],
      why: 'İki gerçek ödeme türü. İkisi de Odeme\'nin sözleşmesini dolduracak ama kuralları farklı.',
      spec: ['<b>nakit.py:</b> <code>Nakit</code>, <code>Odeme</code>\'den miras alsın. <code>ode</code> metodu her tutar için <code>True</code> versin, <code>tur</code> metodu <code>"Nakit"</code> metnini versin.', '<b>kart.py:</b> <code>Kart</code>, <code>Odeme</code>\'den miras alsın. <code>__init__</code> metodu sahibi ve limiti alsın: sahibi miras aldığın sınıfa ver, limiti <code>_limit</code> özelliğinde sakla.', '<code>Kart</code>\'ın <code>ode</code> metodu: tutar limitten büyükse <code>False</code> versin. Değilse tutarı limitten düşsün ve <code>True</code> versin.', '<code>Kart</code>\'ın <code>tur</code> metodu <code>"Kart"</code> metnini versin.'],
      ex: [['k = Kart("Ali", 100)', ''], ['k.ode(60)', 'True   # 40 kaldı'], ['k.ode(60)', 'False  # yetmedi'], ['Nakit("Ali").ode(9999)', 'True']],
      hints: ['Soldaki dosya ağacından nakit.py ve kart.py arasında geçebilirsin. Nakit\'in yeni bir özelliği yok, o yüzden __init__ yazmasına gerek yok.', 'Reddedilen ödeme limitten düşmemeli: önce kontrol et, sonra çıkar.'],
      done: [['zey', 'Kantinde en çok yemek kartı kullanılıyor, onu unutmayalım!']]
    }),
    T_('KE-12', 2, 'code', 'YemekKarti sınıfı', {
      tests: ['yemek'], wiki: 'soyut', files: ['odeme/yemek_karti.py'],
      why: 'Üçüncü ödeme türü. Bu sefer bakiye gizli (private): dışarıdan kimse değiştiremesin.',
      spec: ['<code>YemekKarti</code>, <code>Odeme</code>\'den miras alsın.', '<code>__init__</code> metodu sahibi ve bakiyeyi alsın: sahibi miras aldığın sınıfa ver, bakiyeyi gizli (private) <code>__bakiye</code> özelliğinde sakla.', '<code>bakiye_getir</code> metodu kalan bakiyeyi geri versin.', '<code>ode</code> metodu: bakiye yetmiyorsa <code>False</code> versin, bakiye değişmesin. Yetiyorsa tutarı düşsün ve <code>True</code> versin.', '<code>tur</code> metodu <code>"Yemek Kartı"</code> metnini versin.'],
      ex: [['y = YemekKarti("Ali", 100)', ''], ['y.ode(70)', 'True'], ['y.bakiye_getir()', '30'], ['y.ode(50)', 'False']],
      hints: ['Kart\'a çok benziyor ama ondan miras almıyor; ikisi kardeş, ikisinin de miras aldığı sınıf Odeme.', 'Çift alt çizgiyle başlayan özellik private olur: sınıfın içinden erişilir, dışarıdan erişilemez. Bu yüzden bakiyeyi okumak için ayrı bir metot yazıyorsun.'],
      done: [['cem', 'Üç ödeme türü, hepsi aynı sözleşmeye uyuyor. Sırada teslimat var.']]
    }),
    T_('KE-13', 2, 'code', 'Kurye ailesi', {
      tests: ['kurye'], wiki: 'soyut', files: ['kurye/kurye.py', 'kurye/bisiklet.py', 'kurye/motor.py'],
      say: [['naz', 'Selam, ben Nazlı, müşteri destek. Herkes "siparişim ne zaman gelir?" diye soruyor. Bisikletli başka, motorlu başka sürede gidiyor.']],
      why: 'Ödemede yaptığının aynısı: soyut bir ata, onu dolduran gerçek sınıflar. Bu sefer kalıbı kendin kuruyorsun.',
      spec: ['<b>kurye.py:</b> <code>Kurye</code> soyut bir sınıf olsun. <code>__init__</code> metodu kuryenin adını alsın, <code>ad</code> özelliğinde saklasın. <code>sure</code> adında soyut bir metot ekle: mesafeyi alır, kaç dakika süreceğini alt sınıflar belirler.', '<b>bisiklet.py:</b> <code>Bisiklet</code>, Kurye\'den miras alsın. <code>sure</code> metodu: km başına <b>4 dakika</b>.', '<b>motor.py:</b> <code>Motor</code>, Kurye\'den miras alsın. <code>sure</code> metodu: km başına <b>2 dakika</b>, üstüne <b>3 dakika</b> park yeri arama.'],
      ex: [['Bisiklet("Mert").sure(3)', '12'], ['Motor("Ece").sure(3)', '9']],
      hints: ['Odeme\'nin aynı kalıbı. odeme/odeme.py dosyasına bakabilirsin.', 'Alt sınıflar yeni özellik eklemiyor; __init__ yazmalarına gerek yok, miras aldıkları sınıfınki kullanılır.'],
      done: [['cem', 'Parçalar hazır: ürün, ödeme, kurye. Şimdi hepsini birleştiren sınıfa geldik. Hakan Bey\'in bir kuralı var, dikkat et.']]
    }),
    T_('KE-14', 2, 'code', 'Siparis: türe bakmak yasak', {
      tests: ['siparis'], wiki: 'poly', files: ['siparis.py'],
      say: [['hkn', 'Tek kuralım var: <b>Siparis sınıfında "bu hangi ödeme türü?" diye soran tek satır görmek istemiyorum!</b> Yoksa yine 3 gün sürer.']],
      why: 'Sabahki sorunun çözümü burada. Siparis ödeme türünü bilmeyecek, sadece metodu çağıracak. İşi nesne yapacak.',
      spec: ['<code>Siparis</code> sınıfını yaz. <code>__init__</code> metodu dört bilgi alsın ve aynı adlarla özellik olarak saklasın. Sıra şöyle: <code>musteri</code>, <code>odeme</code>, <code>kurye</code>, <code>mesafe</code>. Ayrıca <code>urunler</code> adında boş bir liste oluştursun.', '<code>ekle</code> metodu: verilen ürünü listeye eklesin.', '<code>toplam</code> metodu: listedeki her üründen fiyatını isteyip toplamı geri versin.', '<code>odemeyi_al</code> metodu: siparişin ödeme nesnesinden toplam tutarı ödemesini istesin, aldığı cevabı geri versin.', '<code>teslim_suresi</code> metodu: siparişin kurye nesnesine mesafeyi verip süreyi sorsun, aldığı cevabı geri versin.', '<b>Yasak:</b> türü soran hiçbir kod (<code>isinstance</code>, <code>type</code>, metinle karşılaştıran <code>if</code>).'],
      ex: [['s = Siparis("Ayşe", Nakit("Ayşe"), Motor("Ece"), 3)', ''], ['s.ekle(Urun("Çay", 15))', ''], ['s.toplam()', '15'], ['s.odemeyi_al()', 'True'], ['s.teslim_suresi()', '9']],
      hints: ['Test, sisteme hiç görmediği sahte bir ödeme veriyor. Türe bakmıyorsan çalışır.', 'Her metot 1-3 satır. Uzuyorsa yanlış yoldasın.'],
      done: [['cem', 'Şu metotların kısalığına bak. <code>eski_odeme.py</code> 25 satırdı, burada tek satır. İş, ait olduğu sınıfa gitti.'], ['kaan', 'Ya ben de bir şey yaptım ona, bakar mısın? 🙃']]
    }),
    T_('KE-15', 2, 'review', 'Kaan\'ın değişikliğini incele', {
      rev: 'kaan',
      say: [['kaan', 'Ödemeyi "daha güvenli" yaptım, her türü tek tek kontrol ediyorum. Çok temiz oldu bence 😎']],
      why: 'Gerçek işte başkasının kodunu da okursun. Kaan, Hakan Bey\'in kuralını çiğnemiş.',
      spec: ['<b>Kod İnceleme</b> penceresinde Kaan\'ın kodunu oku.', 'Nesnenin türünü soran bütün satırlara tıkla.', '<b>Gönder</b>\'e bas.'],
      done: [['cem', 'Reddettin, doğru yaptın. Kaan\'ın kodu <b>çalışıyor</b> ama yeni bir ödeme türü gelince sona düşer, <code>False</code> döner, müşteri sebepsiz reddedilir.'], ['kaan', 'Ama çalışıyordu 😭'], ['cem', 'Çalışması yetmiyor Kaan, değişebilmesi de lazım.']]
    }),
    T_('KE-16', 2, 'live', 'İlk siparişler!', {
      fresh: true, needGun: true,
      say: [['hkn', 'Kampüs acıktı! Yayına al, ilk siparişleri izleyelim 🍽️']],
      why: 'Bütün parçalar birlikte çalışacak. Burada senin metotlarının sonucunu gözünle göreceksin.',
      spec: ['Kod yazmana gerek yok. <b>🚀 Canlıya Al</b>\'a bas.', 'Sağda <b>Harita</b>\'yı izle: kuryeler <code>sure()</code> metodunun döndürdüğü süre kadar yolda kalır.', 'Altta siparişler, ödemeler ve müşteri yorumları akar.'],
      done: [['naz', 'Siparişler akıyor! Telefon susmuyor 📞'], ['cem', 'Haritaya bak: motor bisikleti geçiyor. Çünkü <code>sure()</code> metotları farklı döndürüyor. Sistem kimin motor, kimin bisiklet olduğunu bilmiyor bile. <code>sistem.py</code>\'yi aç, oku.']]
    }),
    T_('KE-17', 3, 'code', 'OgrenciKarti (Siparis donduruldu 🧊)', {
      tests: ['ogrenci'], wiki: 'acik', freeze: true, files: ['odeme/ogrenci_karti.py'],
      say: [['zey', 'Rektörlükle anlaştık: <b>öğrenci kartına %20 indirim!</b> Yarına yetişmesi lazım.'], ['hkn', 'Bakalım bu sefer 3 gün sürecek mi 👀'], ['cem', 'Yeni kural: <b>Siparis sınıfı donduruldu 🧊</b> Tek harfine dokunursan bilet kapanmaz. Sadece yeni bir sınıf yazarak çözeceksin.']],
      why: 'İşte sabahki sınav: yeni bir ödeme türü, eski koda dokunmadan.',
      spec: ['<code>OgrenciKarti</code>, <code>Kart</code>\'tan miras alsın (o da bir kart).', '<code>ode</code> metodunu yeniden yaz: tutarın <b>0.8</b> katını hesapla, limit işini miras aldığın sınıfın <code>ode</code> metoduna bırak, onun cevabını geri ver.', '<code>tur</code> metodu <code>"Öğrenci Kartı"</code> metnini versin.', '🧊 <code>siparis.py</code> dosyasını değiştirme.'],
      ex: [['g = OgrenciKarti("Ali", 80)', ''], ['g.ode(100)', 'True   # 80 TL düştü'], ['g.ode(10)', 'False  # limit bitti']],
      hints: ['Limit hesabını yeniden yazma; Kart zaten biliyor. Yeni bir özellik de yok, __init__ yazmana gerek yok.', 'Tek satırda bitebilir: miras aldığın sınıfın ode metodunu çağır, ona indirimli tutarı ver, cevabı geri döndür.'],
      done: [['hkn', '3 satır mı?! 3 GÜN NEREDE?! 🤯'], ['cem', 'Eski kodu değiştirmeden yeni tür ekledin. Bunun adı <b>açık/kapalı ilkesi</b>: genişlemeye açık, değişikliğe kapalı. Bugünün asıl dersi bu.']]
    }),
    T_('KE-18', 3, 'code', 'Stajyer kurye: sen', {
      tests: ['stajyer'], wiki: 'acik', freeze: true, files: ['kurye/stajyer.py'],
      say: [['naz', 'Kurye kalmadı, yoğunluk var 😬'], ['hkn', 'Stajyer boş duruyor ama? 😏']],
      why: 'Yeni bir kurye türü, yine eski koda dokunmadan. Alt sınıf, ebeveyninde olmayan yeni metotlar da ekleyebilir.',
      spec: ['<code>Stajyer</code>, <code>Kurye</code>\'den miras alsın.', '<code>sure</code> metodu: yaya gidiyorsun, km başına <b>12 dakika</b>.', '<code>bahane</code> adında yeni bir metot ekle: geç kalma bahaneni metin olarak <b>geri versin</b>. Yaratıcı ol. 😄', '🧊 <code>siparis.py</code> hâlâ dondurulmuş.'],
      ex: [['Stajyer("Sen").sure(2)', '24'], ['Stajyer("Sen").bahane()', '"Asansör bozuktu abi!"']],
      hints: ['Bisiklet\'in aynısı, sadece sayı farklı. Bir de yeni metot.', 'Sistem sadece sure metodunu çağırır; bahane metodunu sen çağırmazsan çalışmaz. deneme.py\'de deneyebilirsin.'],
      done: [['naz', 'Müşteri soruyor: "Kurye neden yürüyerek geldi?" Ne diyeyim? 😅'], ['cem', 'Haritada kendini izleyebilirsin 🚶']]
    }),
    T_('KE-19', 3, 'quiz', 'Sabah toplantısı: ördek testi', {
      code: `class Drone:              # hiçbir şeyden türemiyor!
    def sure(self, km):
        return km + 1

def goster(k):
    print(k.sure(3))

goster(Drone())`,
      say: [['zey', 'Mühendislik fakültesi drone teslimat denemek istiyor 🚁 Ama drone\'un kodu başka ekipten geliyor, Kurye sınıfımızla bir akrabalığı yok.']],
      why: 'Python çok biçimlilik için kalıtım şart koşuyor mu, onu göreceksin.',
      spec: ['Aşağıda, sohbetteki soruyu oku ve cevapla.'],
      ask: '<code>Drone</code> hiçbir sınıftan türemiyor. Bu kod çalışır mı?',
      opts: ['TypeError: Drone bir Kurye değil', '4 yazar', 'None yazar', 'Çalışması için Kurye\'den türemeli'], a: 1,
      why_: ['Python tür kontrolü yapmaz; sadece metodu çağırmayı dener.', 'Evet! Python soyağacına bakmaz: "sure() biliyor musun?" Biliyorsa yeter. Buna <b>duck typing</b> denir: ördek gibi yürüyüp ördek gibi ötüyorsa ördektir. 🦆', 'sure() return ettiği için 3 + 1 = 4 yazar.', 'Python\'da şart değil. Java\'da olurdu; Python\'da değil.'],
      done: [['cem', 'Python\'da önemli olan <b>ne olduğun değil, ne yapabildiğin</b>. Şimdi bunu gerçekten yapalım.']]
    }),
    T_('KE-20', 3, 'code', 'Drone: ördek testi 🦆', {
      tests: ['drone'], wiki: 'duck', freeze: true, needGun: true, files: ['kurye/drone.py'],
      why: 'Kurye\'den türemeyen bir sınıfı sisteme sokacaksın. Sistem yalnızca sure() çağırdığı için kabul edecek.',
      spec: ['<code>Drone</code> sınıfını yaz. Bu sefer <b>hiçbir sınıftan miras almayacak</b>.', '<code>__init__</code> metodu adı alsın, <code>ad</code> özelliğinde saklasın.', '<code>sure</code> metodu mesafeyi alsın: km başına <b>1 dakika</b>, üstüne <b>1 dakika</b> kalkış.', '🧊 <code>siparis.py</code> hâlâ dondurulmuş.', '🚀 Canlıya al ve haritada 🚁\'yi ara.'],
      ex: [['Drone("Uçan-1").sure(5)', '6']],
      hints: ['Urun\'u yazarken yaptığın gibi __init__ yaz; bu sefer miras aldığın bir sınıf yok.', 'Siparis onu da kabul edecek, çünkü kuryeden sadece süresini istiyor.'],
      done: [['zey', 'Drone havada! 🚁 Rektörlük bunu çok sevdi.'], ['cem', 'Siparis\'e dokunmadın, sistem değişmedi, drone uçuyor. Biraz nefes al, öğle yemeği...'], ['bot', '🚨 UYARI: Canlıda hata oranı artıyor!']]
    }),
    T_('KE-21', 4, 'code', '🚨 Olay 1: KampanyaTost hata veriyor', {
      tests: ['olay1'], wiki: 'super', kaan: 1, needGun: true, incident: true, files: ['kaan.py'],
      say: [['naz', '🚨 Müşteriler sipariş veremiyor!'], ['kaan', 'Şey... öğle arasında <code>kaan.py</code>\'yi yayına almış olabilirim 🙃 Kampanyalı tost ekledim. Benim bilgisayarımda çalışıyordu.'], ['cem', 'Soldaki dosya ağacında <b>kaan.py</b> açıldı. Önce <b>🚀 Canlıya Al</b>\'a bas ve konsoldaki kırmızı hatayı oku. Sonra Kaan\'ın kodunu düzelt.']],
      why: 'Başkasının yazdığı hatalı kodu bulup düzelteceksin. Gerçek işin büyük kısmı budur.',
      spec: ['<b>🚀 Canlıya Al</b>\'a bas, konsoldaki hatayı oku.', '<code>kaan.py</code> içinde <code>KampanyaTost</code>\'un <code>__init__</code> metoduna bak: miras aldığı sınıfın <code>__init__</code> metodu çağrılıyor mu?', 'Eksik olanı ekle. Tost üç bilgi istiyor: ad, taban fiyat ve ekstra kaşar (bu tostta ekstra kaşar yok).'],
      ex: [['KampanyaTost("Kampanya", 60).fiyat()', '50']],
      hints: ['AttributeError: bir özellik yok. O özelliği kim oluşturacaktı?', 'Alt sınıf kendi __init__ metodunu yazınca miras aldığı sınıfınki kendiliğinden çalışmaz; onu senin çağırman gerekir. Tost\'u yazarken de aynısını yapmıştın.'],
      done: [['naz', 'Siparişler geri geldi 😮‍💨'], ['kaan', 'Özür dilerim, bir daha yapmam.'], ['bot', '🚨 YENİ UYARI: Kasada para tutmuyor.']]
    }),
    T_('KE-22', 4, 'code', '🚨 Olay 2: "Bedava" çaya para kesiliyor', {
      tests: ['olay2'], wiki: 'override', kaan: 2, incident: true, files: ['kaan.py'],
      say: [['naz', 'Bu sefer hata yok ama müşteriler sinirli: <b>"Bedava çay" dediniz, 20 TL kestiniz!</b> 😡'], ['kaan', 'Ama <code>BedavaCay</code> yazdım, 0 döndürüyor, bakın kaan.py\'de 🙃']],
      why: 'Bu sefer hata mesajı yok; en tehlikelisi de bu. Kod çalışıyor ama yanlış sonuç veriyor.',
      spec: ['<code>kaan.py</code> dosyasının altına eklenen <code>BedavaCay</code> sınıfını oku.', 'Sistem hangi metodu çağırıyor (<code>fiyat</code>)? Kaan hangi metodu yazmış? Harf harf karşılaştır.', 'Düzelt ve <b>🚀 Canlıya Al</b>\'a bas.'],
      ex: [['BedavaCay("Çay", 20, "kucuk").fiyat()', '0']],
      hints: ['Python hata vermedi çünkü Kaan\'ın yazdığı da geçerli bir metot. Sadece kimse onu çağırmıyor.', 'Metodun adında fazladan bir harf var.'],
      done: [['cem', 'En tehlikeli hata budur: <b>sessiz hata</b>. Adı bir harf farklıysa bu override değil, yeni bir metot olur; ebeveynin metodu çalışmaya devam eder.'], ['bot', '🚨 YENİ UYARI: Kahvaltı menüsü siparişleri hata veriyor.']]
    }),
    T_('KE-23', 4, 'code', '🚨 Olay 3: Kahvaltı menüsü', {
      tests: ['olay3'], wiki: 'super', kaan: 3, needGun: true, incident: true, files: ['kaan.py'],
      say: [['kaan', 'Son bir tane daha ekledim... kahvaltı menüsü... normal menüden 10 TL ucuz... 🙃'], ['hkn', 'KAAN!']],
      why: 'Hata mesajı başka bir dosyayı gösterecek ama suçlu orada değil. Hatanın asıl kaynağını bulacaksın.',
      spec: ['<b>🚀 Canlıya Al</b>\'a bas ve hatayı oku: <code>\'int\' and \'NoneType\'</code> ne demek?', '<code>kaan.py</code> içindeki <code>KahvaltiMenu.fiyat</code> metoduna bak: hesapladığı değeri geri veriyor mu?', 'Düzelt: normal menü fiyatından 10 düşülmüş değeri <b>döndürsün</b>.'],
      ex: [['KahvaltiMenu("K", [Urun("Su", 100)]).fiyat()', '75.0   # 100 × 0.85 − 10']],
      hints: ['Hata siparis.py\'de görünüyor ama oradaki kod doğru. Toplamaya None gelmiş; o None nereden çıkıyor?', 'Değer hesaplanıyor ama metottan dışarı çıkmıyor. Kaan tek bir kelimeyi unutmuş.'],
      done: [['naz', 'Şikâyetler kesildi. Teşekkürler! 🧡'], ['hkn', 'Kaan\'a söyleyin sana kahve ısmarlasın.'], ['cem', 'Üç olay, üç klasik hata: <b>super() unutmak, yanlış ad, return unutmak</b>. Şimdi biraz keyifli bir konu: Python\'un kendi çok biçimliliği.']]
    }),
    T_('KE-24', 5, 'code', '__str__: nesne kendini tanıtsın', {
      tests: ['str_urun'], wiki: 'dunder', files: ['urunler/urun.py'],
      say: [['zey', 'Bir ürünü <code>print</code> edince <code>&lt;__main__.Tost object at 0x...&gt;</code> yazıyor! Bu ne? 😱'], ['cem', '<code>print(x)</code> aslında <code>x.__str__()</code> metodunu çağırır. Sen yazmazsan bu çirkin hâli görünür. Yazınca nesne kendini istediğin gibi tanıtır.']],
      why: 'print() de çok biçimlidir: her nesneye "kendini nasıl yazarsın?" diye sorar.',
      spec: ['<code>urunler/urun.py</code> dosyasını aç.', '<code>Urun</code> sınıfına <code>__str__</code> metodunu ekle. Dışarıdan bilgi almaz.', 'Ürünün adını ve <b>güncel</b> fiyatını içeren bir metin geri versin. Güncel fiyatı taban fiyattan değil, nesnenin kendi <code>fiyat</code> metodundan öğren.', 'Yalnızca Urun\'a yaz; Tost ve diğerleri miras alır.'],
      ex: [['print(Tost("Kaşarlı", 60, True))', 'Kaşarlı (75 TL)'], ['print(Urun("Çay", 15))', 'Çay (15 TL)']],
      hints: ['__str__ de bir metot, sadece Python kendisi çağırıyor. Metni ekrana yazma, geri ver.', 'Taban fiyatı kullanırsan ekstra kaşarlı tost yanlış fiyatla görünür. Metni örnekteki biçimde oluştur.'],
      done: [['cem', 'Urun\'a tek metot yazdın, hepsi güzel göründü; çünkü <code>self.fiyat()</code> çok biçimli çalışıyor. Telefondaki menüye bak.']]
    }),
    T_('KE-25', 5, 'code', 'Siparis: len() ve print()', {
      tests: ['siparis_dunder'], wiki: 'dunder', files: ['siparis.py'],
      say: [['naz', 'Bir siparişi yazdırınca okunur bir şey görsem, kaç ürün var bilsem hayatım kurtulur.'], ['cem', 'Siparis\'in donması kalktı 🔥 Özel metot ekleyebilirsin.']],
      why: 'len() de print() gibi çalışır: nesneye sorar. Kendi sınıfına öğretebilirsin.',
      spec: ['<code>siparis.py</code> dosyasını aç.', '<code>__len__</code> metodunu ekle: siparişteki ürün sayısını geri versin.', '<code>__str__</code> metodunu ekle: müşteri adını ve toplam tutarı içeren bir metin geri versin.'],
      ex: [['len(siparis)', '3'], ['print(siparis)', 'Ayşe: 3 ürün, 120 TL']],
      hints: ['Ürünler bir listede duruyor ve liste kendi uzunluğunu biliyor.', 'Toplam tutarı yeniden hesaplama; Siparis\'in bunu yapan bir metodu zaten var.'],
      done: [['cem', '<code>len()</code> listeyi de metni de senin siparişini de ölçüyor. len() de çok biçimli.']]
    }),
    T_('KE-26', 5, 'code', '__lt__: menüyü fiyata göre sırala', {
      tests: ['lt'], wiki: 'dunder', files: ['urunler/urun.py'],
      say: [['zey', 'Menü ucuzdan pahalıya dizilsin. Öğrenci dostu! 💸']],
      why: '<code>a &lt; b</code> yazınca Python <code>a.__lt__(b)</code> çağırır. Bunu öğretirsen <code>sorted()</code> ürünlerini sıralayabilir.',
      spec: ['<code>urunler/urun.py</code> dosyasını aç.', '<code>Urun</code> sınıfına <code>__lt__</code> metodunu ekle (<i>less than</i>: küçüktür). Karşılaştırılacak diğer ürünü alır.', 'İki ürünün fiyatını <code>fiyat</code> metotlarından öğren. Bu ürünün fiyatı diğerininkinden küçükse <code>True</code>, değilse <code>False</code> sonucu geri versin.', '🚀 Canlıya al, telefondaki <b>Menü</b> sıralanacak.'],
      ex: [['Urun("Su", 10) < Urun("Tost", 60)', 'True'], ['sorted([tost, cay])', '[cay, tost]']],
      hints: ['Tek satırda bitebilir: iki ürünün fiyatını karşılaştır, karşılaştırmanın sonucunu geri ver.', 'Taban fiyatı değil, fiyat metodunun sonucunu karşılaştır; yoksa ekstra kaşarlı tost yanlış sıraya girer.'],
      done: [['zey', 'Menü sıralandı, çok güzel oldu! 😍']]
    }),
    T_('KE-27', 6, 'uml', 'Mimari panosunu oku', {
      win: 'arch',
      say: [['cem', 'Bugün hiç UML çizmedin, fark ettin mi? Ama <b>Mimari</b> penceresine bak: yazdığın kodun UML\'i kendiliğinden çizildi. Gerçek hayatta çoğu zaman böyle: önce var olan kodu okursun.']],
      why: 'Çok biçimliliğin diyagramda nasıl göründüğünü göreceksin.',
      spec: ['<b>Mimari</b> penceresinde herhangi bir kutudaki <code>fiyat()</code> satırına tıkla. Aynı metodu yazan bütün sınıflar parlayacak.', 'Parlayan kutuları say.', 'Sayıyı pencerenin üstündeki kutuya yaz, <b>Gönder</b>\'e bas.'],
      hints: ['Mimari penceresi açık değilse alttaki görev çubuğundan aç.', 'Miras alan ama kendi fiyat()\'ını yazmayan sınıflar sayılmaz; onların kutusunda fiyat() satırı görünmez.'],
      done: [['cem', 'Hepsi aynı adı taşıyor, hepsi farklı çalışıyor, sistem hiçbirini tanımıyor. Çok biçimlilik diyagramda böyle görünür.']]
    }),
    T_('KE-28', 6, 'live', '🍽️ Öğle yoğunluğu: 30 sipariş', {
      fresh: true, needGun: true, rush: true, allTests: true,
      say: [['hkn', 'Son sınav: <b>öğle yoğunluğu.</b> 30 sipariş üst üste. Tek bir hata görmek istemiyorum.'], ['naz', 'Hazırım 🎧 Kampüs aç.']],
      why: 'Bütün gün yazdığın kod birlikte çalışacak.',
      spec: ['<b>🚀 Canlıya Al</b>\'a bas: 30 sipariş gelecek.', 'Hiçbir sipariş hata vermemeli.', 'Sabahtan beri kapattığın biletlerin testleri bozulmamış olmalı.', 'Bakiyesi yetmeyen müşterinin reddedilmesi hata değildir.'],
      done: [['bot', '✅ 30/30 sipariş işlendi. Hata yok.'], ['hkn', 'Stajyer! Sabah 3 gün süren iş bugün 3 satır oldu. Ofiste konuşuluyor. 👏'], ['kaan', 'Bana da öğretir misin? 🙃']]
    }),
    T_('KE-29', 6, 'pdf', 'Mesai bitti: PDF\'ini teslim et', {
      say: [['hkn', 'Mesai bitiyor. İK senden gün sonu raporunu istiyor.'], ['cem', 'PDF\'in içinde kodundan çizilen UML, bütün kodun ve gün sonu raporun olacak. Eline sağlık, stajyer. 🥪']],
      why: 'Bugünkü çalışmanı hocana teslim edeceğin dosya.',
      spec: ['<b>📄 PDF Al</b>\'a bas.', '<b>Adını, soyadını ve okul numaranı</b> yaz.', 'İnen PDF\'i hocana teslim et.'],
      done: [['hkn', 'Yarın da bekleriz. Unvanın artık <b>Junior Developer</b>. 🥪🎓']]
    })
  ];
  const TBY = Object.fromEntries(TICKETS.map(t => [t.id, t]));

  const KAAN = {
    1: `class KampanyaTost(Tost):
    def __init__(self, ad, taban_fiyat):
        self.indirim = 10

    def fiyat(self):
        return super().fiyat() - self.indirim
`,
    2: `class BedavaCay(Icecek):
    def fiyatt(self):
        return 0
`,
    3: `class KahvaltiMenu(Menu):
    def fiyat(self):
        indirimli = super().fiyat() - 10
`
  };

  const KAAN_SINIF = { 1: 'KampanyaTost', 2: 'BedavaCay', 3: 'KahvaltiMenu' };
  const TEST_LBL = { urun: 'Urun', tost: 'Tost', icecek: 'Icecek', menu: 'Menu', odeme: 'Odeme', nakit_kart: 'Nakit + Kart', yemek: 'YemekKarti', kurye: 'Kurye ailesi', siparis: 'Siparis', ogrenci: 'OgrenciKarti', stajyer: 'Stajyer', drone: 'Drone', olay1: 'KampanyaTost', olay2: 'BedavaCay', olay3: 'KahvaltiMenu', str_urun: 'Urun.__str__', siparis_dunder: 'Siparis.__len__ + __str__', lt: 'Urun.__lt__' };

  const WIKI = [
    { k: 'override', t: 'Override', sub: 'aynı ad, farklı davranış', code:
`class Hayvan:
    def ses(self):
        return "..."

class Kedi(Hayvan):
    def ses(self):           # override: birebir aynı ad
        return "Miyav"

class Kopek(Hayvan):
    def seS(self):           # ❌ yanlış ad! override DEĞİL
        return "Hav"         #    yeni bir metot oldu

print(Kedi().ses())          # Miyav
print(Kopek().ses())         # ... (ebeveyninki çalıştı!)`, note: 'Metot adı bir harf bile farklıysa Python hata vermez; sadece override olmaz. En sinsi hatalardan biri.' },
    { k: 'super', t: 'super()', sub: 'ebeveyne sor', code:
`class Calisan:
    def __init__(self, ad, maas):
        self.ad = ad
        self.maas = maas

    def odeme(self):
        return self.maas

class Mudur(Calisan):
    def __init__(self, ad, maas, prim):
        super().__init__(ad, maas)   # ad ve maaş ebeveynin işi
        self.prim = prim             # prim benim işim

    def odeme(self):
        return super().odeme() + self.prim`, note: 'Alt sınıf __init__ yazarsa ebeveyninki KENDİLİĞİNDEN çalışmaz; super().__init__(...) ile çağırman gerekir. self.odeme() yazsaydın metot kendini çağırırdı (sonsuz döngü).' },
    { k: 'poly', t: 'Çok biçimlilik', sub: 'tek çağrı, çok davranış', code:
`sekiller = [Kare(3), Daire(2), Ucgen(4, 5)]

toplam = 0
for s in sekiller:
    toplam += s.alan()    # hangi alan()? nesne bilir.

# KÖTÜSÜ: türe bakmak
# for s in sekiller:
#     if isinstance(s, Kare): ...
#     elif isinstance(s, Daire): ...   ← yeni şekil = kod değişikliği`, note: 'isinstance ya da "türü ne?" diye soran if zinciri görürsen dur ve düşün: bu iş o nesnenin metodu olamaz mı?' },
    { k: 'soyut', t: 'Soyut sözleşme', sub: 'ABC + @abstractmethod', code:
`from abc import ABC, abstractmethod

class Bildirim(ABC):
    def __init__(self, kime):
        self.kime = kime

    @abstractmethod
    def gonder(self, metin):   # nasıl? alt sınıf bilir
        pass

    def uyar(self):            # dolu metot, soyutu çağırabilir!
        self.gonder("DİKKAT!")

class Sms(Bildirim):
    def gonder(self, metin):
        print(self.kime, "SMS:", metin)

Sms("Ali").uyar()              # Ali SMS: DİKKAT!
# Bildirim("Ali")              → TypeError!`, note: 'Ebeveyn iskeleti yazar, ayrıntıyı çocuklar doldurur. Soyut metodu yazmayan alt sınıf da soyut kalır.' },
    { k: 'acik', t: 'Açık/Kapalı', sub: 'genişlet, değiştirme', code:
`class Bildirim: ...          # DOKUNMA
class Sms(Bildirim): ...     # DOKUNMA

def herkese_gonder(liste, metin):   # DOKUNMA
    for b in liste:
        b.gonder(metin)

# Yeni tür mü geldi? Sadece yeni sınıf yaz:
class Eposta(Bildirim):
    def gonder(self, metin):
        print(self.kime, "E-POSTA:", metin)`, note: 'Genişlemeye AÇIK, değişikliğe KAPALI. Yeni özellik eklerken çalışan kodu değiştirmezsen, onu bozamazsın da.' },
    { k: 'duck', t: 'Duck typing 🦆', sub: 'ne olduğun değil, ne yaptığın', code:
`class Ordek:
    def yuz(self):
        print("Vak vak, yüzüyorum")

class Denizalti:             # akraba değil!
    def yuz(self):
        print("Bip bip, daldım")

def havuza_at(x):
    x.yuz()                  # tür sormuyor, deniyor

havuza_at(Ordek())
havuza_at(Denizalti())       # ikisi de çalışır`, note: 'Python soyağacına bakmaz. Metodu varsa çağırır, yoksa o anda AttributeError verir. Kalıtım bu yüzden Python\'da çok biçimlilik için şart değildir ama kod paylaşımı ve sözleşme için yararlıdır.' },
    { k: 'dunder', t: 'Özel metotlar', sub: '__str__, __len__, __lt__', code:
`class Playlist:
    def __init__(self, ad, sarkilar):
        self.ad = ad
        self.sarkilar = sarkilar

    def __str__(self):          # print(p) ve str(p)
        return self.ad + " listesi"

    def __len__(self):          # len(p)
        return len(self.sarkilar)

    def __lt__(self, diger):    # p1 < p2 ve sorted(...)
        return len(self) < len(diger)

p = Playlist("Yol", ["a", "b"])
print(p, len(p))                # Yol listesi 2`, note: 'print, len, <, sorted... Hepsi çok biçimli: nesneye ilgili özel metodu sorar. Kendi sınıfına yazarsan Python\'un araçları senin nesnenle de çalışır.' }
  ];
  // Her sınıf kendi dosyasında. Bu sıra aynı zamanda çalıştırma sırasıdır: ebeveyn, çocuktan önce.
  const FILE_INFO = {
    'urunler/urun.py': 'Urun', 'urunler/tost.py': 'Tost', 'urunler/icecek.py': 'Icecek', 'urunler/menu.py': 'Menu',
    'odeme/odeme.py': 'Odeme', 'odeme/nakit.py': 'Nakit', 'odeme/kart.py': 'Kart', 'odeme/yemek_karti.py': 'YemekKarti', 'odeme/ogrenci_karti.py': 'OgrenciKarti',
    'kurye/kurye.py': 'Kurye', 'kurye/bisiklet.py': 'Bisiklet', 'kurye/motor.py': 'Motor', 'kurye/stajyer.py': 'Stajyer', 'kurye/drone.py': 'Drone',
    'siparis.py': 'Siparis', 'kaan.py': null
  };
  const FILE_ORDER = Object.keys(FILE_INFO);
  const newFile = yol => {
    const ad = FILE_INFO[yol];
    const abc = ad === 'Odeme' || ad === 'Kurye' ? 'from abc import ABC, abstractmethod\n\n\n' : '\n';
    return `# ${yol}\n# ${ad} sınıfını buraya yaz. Ne yapacağın Mesajlar penceresindeki bilette, yazım örnekleri 📚 Wiki'de.\n# Diğer dosyalardaki sınıfları doğrudan kullanabilirsin; import yazmana gerek yok.\n\n${abc}`;
  };
  const DENEME = `# deneme.py — DENEME ALANI
#
# Burası senin karalama defterin. Sınıfları buraya YAZMA; her sınıfın kendi
# dosyası var (soldaki dosya ağacına bak). Burada o sınıflardan nesne üretip
# ne yaptıklarını kendi gözünle görebilirsin.
#
# Bu dosyadaki kod yayına çıkmaz, testlere de girmez. 🚀 Canlıya Al'a basınca
# çalışır ve print() çıktıları alttaki Konsol'da görünür.
#
# Denemek istediğin satırların başındaki # işaretini sil:

# t = Tost("Kaşarlı", 60, True)
# print(t.fiyat())

`;

  /* =====================================================================
     DURUM
     ===================================================================== */
  const fresh = () => ({
    v: 1, intro: false, cur: -1, done: {}, chat: [], hint: {},
    files: { 'deneme.py': DENEME }, file: 'deneme.py',
    deploys: 0, openDeploy: 0, tests: {}, analysis: null, analysisV: 0, last: null, freeze: null,
    stat: { ciro: 0, teslim: 0, red: 0, hata: 0, puan: 4.5 }, liveTab: 'map',
    win: {}, events: {}, teacherUsed: false
  });
  let S = load() || fresh();
  const T = { z: 10, shown: 0, pump: null, runBusy: false, plays: [], hiMeth: null, drag: null, teacherOk: false, revMarks: [], revMsg: '', errFile: null, errLine: null, wikiK: null };
  let root = null;

  function load() {
    try { const t = sessionStorage.getItem(SAVE_KEY); return t ? Object.assign(fresh(), JSON.parse(t)) : null; } catch (_) { return null; }
  }
  function saveNow() { try { sessionStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (_) { /* depolama yoksa sorun değil */ } }
  const save = debounce(saveNow, 300);
  const curT = () => TICKETS[S.cur] || null;
  const doneCount = () => Object.keys(S.done).length;
  const allDone = () => doneCount() >= TICKETS.length;
  const pdfOpen = () => (curT() && curT().type === 'pdf') || allDone() || T.teacherOk;
  const OGR = () => window.NYP_OGRETMEN || null;
  const filesPayload = () => {
    const o = { 'sistem.py': H7Py.SISTEM };
    FILE_ORDER.forEach(y => { if (S.files[y] != null) o[y] = S.files[y]; });
    o['deneme.py'] = S.files['deneme.py'];
    return o;
  };

  /* ---- oyun saati: her bilet mesaiyi ilerletir (09:00 → 18:00) ---- */
  function clock() {
    const m = 9 * 60 + Math.round((doneCount() / TICKETS.length) * 9 * 60);
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  /* =====================================================================
     BİLET AKIŞI
     ===================================================================== */
  function openTicket(i) {
    S.cur = i; S.openDeploy = S.deploys;
    const t = curT();
    if (!t) { saveNow(); return; }
    const prev = TICKETS[i - 1];
    if (!prev || prev.ch !== t.ch) S.chat.push({ div: CHAPTERS[t.ch] });
    (t.say || []).forEach(m => S.chat.push({ w: m[0], h: m[1] }));
    S.chat.push({ yeni: t.id });
    if (t.type === 'quiz') S.chat.push({ q: t.id });
    if (t.kaan && !new RegExp('^class ' + KAAN_SINIF[t.kaan] + '\\b', 'm').test(S.files['kaan.py'] || '')) {
      const k = S.files['kaan.py'];
      S.files['kaan.py'] = (k ? k.replace(/\s*$/, '\n\n\n') : '# kaan.py — Kaan\'ın dosyası. "Benim bilgisayarımda çalışıyordu." 🙃\n\n') + KAAN[t.kaan];
      if (S.file === 'kaan.py') ED.ta.value = S.files['kaan.py'];
    }
    (t.files || []).forEach(y => { if (S.files[y] == null) S.files[y] = newFile(y); });
    if (t.files) { switchFile(t.files[0]); openWin('code'); }
    if (t.freeze && !S.freeze) {
      const c = S.analysis && S.analysis.classes && S.analysis.classes.Siparis;
      S.freeze = c ? c.hash : null;
    }
    if (t.type === 'review') { T.revMarks = []; T.revMsg = ''; openWin('review'); }
    if (t.win) openWin(t.win);
    saveNow(); pump();
  }
  function finish(t) {
    S.done[t.id] = true;
    (t.done || []).forEach(m => S.chat.push({ w: m[0], h: m[1] }));
    toast(`🎫 ${t.id} kapandı · ${t.title}`, 'star');
    if (t.type === 'review') closeWin('review');
    openTicket(S.cur + 1);
    if (allDone()) setTimeout(finale, 2600);
  }
  // Biletin kapanma koşulları: her satır bir koşul
  function ticketRows(t) {
    const rows = [], denendi = S.deploys > S.openDeploy;
    const R = (label, ok, msg) => rows.push({ label, ok, msg });
    const tests = t.allTests ? Object.keys(TEST_LBL) : (t.tests || []);
    tests.forEach(k => {
      const r = S.tests[k];
      if (t.allTests && r && r[0]) return;
      R(TEST_LBL[k] + ' testi', !!(r && r[0]), !denendi ? '' : r ? r[1] : 'Kod derlenemedi.');
    });
    if (t.allTests && !rows.length && S.deploys > 0) R('Bütün testler', true, '');
    if (t.freeze) {
      const c = S.analysis && S.analysis.classes && S.analysis.classes.Siparis;
      R('🧊 Siparis değişmedi', !S.freeze || !c || c.hash === S.freeze, 'Cem Abi: "Siparis\'e dokunmuşsun. Yeni tür eklemek için eski sınıfı değiştirmen gerekmemeli." Siparis\'i eski hâline getir.');
    }
    if (t.fresh) R('Canlıya alındı', S.deploys > S.openDeploy, '');
    if (t.id === 'KE-08') {
      const k = (S.last && S.last.katalog) || [];
      const var_ = c => k.some(x => x.cls === c && x.fiyat != null);
      R('Tost, İçecek ve Menü fiyatlandı', var_('Tost') && var_('Icecek') && var_('Menu'), denendi ? 'Menüde görünmeyen ürün var.' : '');
    }
    if (t.needGun) {
      const L = S.last;
      R('Canlı siparişler patlamıyor', !!(L && L.gun > 0 && L.hata === 0), !denendi ? '' : !L || !L.gun ? 'Siparişler işlenemedi: Urun, Odeme, Kurye ve Siparis sınıfları kodda olmalı.' : `${L.hata} sipariş hata verdi. Konsoldaki kırmızı açıklamayı oku.`);
    }
    if (t.rush) { const L = S.last; R('30 sipariş işlendi', !!(L && L.gun >= 30), ''); }
    return rows;
  }
  const ticketOk = t => (t.type === 'code' || t.type === 'live') && ticketRows(t).every(r => r.ok);
  function advance() {
    let t = curT(), n = 0;
    while (t && ticketOk(t) && n++ < 30) { finish(t); t = curT(); }
    renderAll();
  }
  function finale() {
    confetti(); setTimeout(confetti, 700);
    modal(`<div class="w7-idcard"><div class="h">KANTİN EXPRESS</div><div class="b"><span class="p">🧑‍💻</span><div><small>Unvan</small><b>Junior Developer</b><small>Bugünkü başarı</small><i>${TICKETS.length} / ${TICKETS.length} bilet · ${S.stat.teslim} teslimat · ${para(S.stat.ciro)} TL ciro</i></div></div></div>
      <h3>Staj bitti, işe alındın! 🥪</h3>
      <p>Bugün <b>override</b>, <b>super()</b>, <b>çok biçimlilik</b>, <b>açık/kapalı ilkesi</b>, <b>duck typing</b> ve <b>özel metotlar</b> ile çalıştın. Sabah 3 gün süren iş artık 3 satır.</p>
      <p class="w7-sub">PDF'ini hocana teslim etmeyi unutma.</p>`, [{ label: 'Harika!', cls: 'w7-go' }]);
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
    card.className = 'modal-card ' + (cls || 'w7m');
    card.innerHTML = html + (buttons && buttons.length ? `<div class="row">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-mb="${i}">${b.label}</button>`).join('')}</div>` : '');
    m.hidden = false;
    card.onclick = e => {
      const b = e.target.closest('[data-mb]');
      if (b) { const B = buttons[+b.dataset.mb]; if (!B.keep) closeModal(); if (B.fn) B.fn(); }
    };
    const btns = card.querySelectorAll('.row .btn');
    const risky = buttons && buttons.length && buttons[buttons.length - 1].cls === 'lava';
    const f = risky ? btns[0] : btns[btns.length - 1];
    if (f) f.focus({ preventScroll: true });
    return card;
  }
  function closeModal() { $('#nyp-modal').hidden = true; $('#nyp-modal-card').className = 'modal-card'; }
  function toast(text, kind, ms) {
    const box = $('#nyp-toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = text;
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms || 3000);
  }
  function confetti() {
    const cols = ['#FFD35C', '#FF6B4A', '#35C2A0', '#3D8BFF', '#FF8FC4', '#1E1E24'];
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
     MASAÜSTÜ: pencereler ve görev çubuğu
     ===================================================================== */
  const WINS = {
    chat: { t: 'Mesajlar', i: '💬', x: 0, y: 0, w: 28, h: 100, open: true },
    code: { t: 'Kod', i: '⌨️', x: 28, y: 0, w: 45, h: 100, open: true },
    live: { t: 'Canlı', i: '📱', x: 73, y: 0, w: 27, h: 100, open: true },
    review: { t: 'Kod İnceleme', i: '🔍', x: 28, y: 2, w: 45, h: 96, open: false },
    board: { t: 'Biletler', i: '🎫', x: 28, y: 3, w: 60, h: 90, open: false },
    arch: { t: 'Mimari', i: '🏛️', x: 28, y: 0, w: 72, h: 100, open: false },
    wiki: { t: 'Wiki', i: '📚', x: 28, y: 2, w: 52, h: 94, open: false }
  };
  const winOf = k => { S.win[k] = S.win[k] || { x: WINS[k].x, y: WINS[k].y, w: WINS[k].w, h: WINS[k].h, open: WINS[k].open, z: 1 }; return S.win[k]; };
  const winEl = k => root.querySelector(`.w7-win[data-win="${k}"]`);
  function applyWin(k) {
    const W = winOf(k), el = winEl(k);
    el.hidden = !W.open;
    el.style.left = W.x + '%'; el.style.top = W.y + '%'; el.style.width = W.w + '%'; el.style.height = W.h + '%'; el.style.zIndex = W.z;
  }
  function focusWin(k) {
    const W = winOf(k);
    W.z = ++T.z;
    Object.keys(WINS).forEach(x => winEl(x).classList.toggle('top', x === k));
    applyWin(k); renderTaskbar(); save();
  }
  function openWin(k) {
    winOf(k).open = true;
    if (k === 'board') renderBoard();
    if (k === 'arch') renderArch();
    if (k === 'wiki') renderWiki();
    if (k === 'review') renderReview();
    focusWin(k);
    if (k === 'code') setTimeout(syncScroll, 0);
  }
  function closeWin(k) {
    const wasTop = winEl(k).classList.contains('top');
    winOf(k).open = false; applyWin(k);
    if (wasTop) {
      let best = null;
      Object.keys(WINS).forEach(x => { const w = winOf(x); if (w.open && (!best || w.z > winOf(best).z)) best = x; });
      if (best) focusWin(best);
    }
    renderTaskbar(); save();
  }
  function tile() {
    Object.keys(WINS).forEach(k => { const d = WINS[k], w = winOf(k); Object.assign(w, { x: d.x, y: d.y, w: d.w, h: d.h, open: d.open }); applyWin(k); });
    focusWin('code');
  }
  function winShell(k, body) {
    return `<section class="w7-win" data-win="${k}" aria-label="${WINS[k].t}" hidden>
      <header class="w7-wt" data-wdrag="${k}"><span class="i">${WINS[k].i}</span><b id="w7-wt-${k}">${WINS[k].t}</b><button data-act="wmin" data-k="${k}" title="Küçült" aria-label="Küçült">—</button></header>
      <div class="w7-wb">${body}</div><span class="w7-wr" data-wres="${k}" aria-hidden="true"></span></section>`;
  }
  function shellHTML() {
    return `<div class="w7-desk" id="w7-desk">
        ${winShell('chat', '<div class="w7-pin" id="w7-pin"></div><div class="w7-feed" id="w7-chat" role="log"></div><div class="w7-typing" id="w7-typing" hidden></div>')}
        ${winShell('code', codeShell())}
        ${winShell('live', liveShell())}
        ${winShell('review', '<div class="w7-rev" id="w7-rev"></div>')}
        ${winShell('board', '<div class="w7-board" id="w7-board"></div>')}
        ${winShell('arch', '<div class="w7-archtop" id="w7-archtop"></div><div class="w7-archc" id="w7-archc"></div>')}
        ${winShell('wiki', '<div class="w7-wiki" id="w7-wiki"></div>')}
      </div>
      <footer class="w7-task">
        <div class="w7-startw"><button class="w7-start" data-act="start" aria-haspopup="true">🥪 <b>Başlat</b></button>
          <div class="w7-startm" id="w7-startm" hidden>
            <div class="brand">KantinOS<small>Sürüm 7.0 · Nesne Yönelimli</small></div>
            <button data-act="help">❓ Nasıl çalışır?</button>
            <button data-act="tile">🗂️ Pencereleri düzenle</button>
            <button data-act="teacher" id="w7-tbtn" hidden>👩‍🏫 Öğretmen</button>
            <button data-act="reset" class="danger">↺ Her şeyi sıfırla</button>
            <hr><button data-act="home">⏻ Haftalara dön</button>
          </div></div>
        <nav class="w7-apps" id="w7-apps"></nav>
        <div class="w7-tray"><span class="w7-prog" id="w7-prog"></span><button class="w7-pdf" data-act="pdf" id="w7-pdfb"></button><span class="w7-clock" id="w7-clock" title="Oyun saati: her bilet mesaiyi ilerletir"></span></div>
      </footer>
      <div class="w7-boot" id="w7-boot" hidden><div class="in"><div class="lg7">🥪</div><b>KantinOS</b><div class="bar"><i></i></div><small id="w7-bootm">Tost makinesi ısınıyor…</small></div></div>`;
  }
  function renderTaskbar() {
    const top = Object.keys(WINS).find(k => winEl(k).classList.contains('top'));
    $('#w7-apps').innerHTML = Object.keys(WINS).filter(k => k !== 'review' || winOf(k).open || (curT() && curT().type === 'review')).map(k => {
      const W = winOf(k), alarm = k === 'live' && S.last && S.last.hata > 0;
      return `<button class="w7-app ${W.open ? 'open' : ''} ${top === k && W.open ? 'on' : ''} ${alarm ? 'alarm' : ''}" data-act="app" data-k="${k}"><span>${WINS[k].i}</span>${WINS[k].t}</button>`;
    }).join('');
    $('#w7-clock').textContent = '🕒 ' + clock();
    $('#w7-prog').textContent = `🎫 ${doneCount()}/${TICKETS.length}`;
    const pb = $('#w7-pdfb'), open = pdfOpen();
    pb.classList.toggle('locked', !open);
    pb.textContent = open ? '📄 PDF Al' : '🔒 PDF';
    pb.title = open ? 'UML, kod ve gün sonu raporunu PDF olarak indir' : 'PDF son bilette açılır';
  }

  /* =====================================================================
     SOHBET ve AKTİF BİLET
     ===================================================================== */
  function msgHTML(m) {
    if (m.div) return `<div class="w7-div"><span>${esc(m.div)}</span></div>`;
    if (m.q) return quizHTML(TBY[m.q]);
    if (m.yeni) return `<div class="w7-yeni">🎫 <b>Yeni bilet: ${esc(TBY[m.yeni].title)}</b><span>Ne yapacağın en üstteki kartta yazıyor. ☝️</span></div>`;
    const W = WHO[m.w];
    return `<div class="w7-msg"><span class="av" style="background:${W.c}" title="${W.rol}">${W.em}</span><div><div class="n"><b>${W.ad}</b><small>${W.rol}</small></div><div class="t">${m.h}</div></div></div>`;
  }
  function quizHTML(t) {
    const st = S.hint['q' + t.id] || [], solved = !!S.done[t.id], son = st[st.length - 1];
    return `<div class="w7-quiz" data-q="${t.id}"><div class="ask">${t.ask}</div><pre class="w7-snip">${hlBlock(t.code)}</pre>
      <div class="opts">${t.opts.map((o, i) => `<button data-qa="${i}" class="${st.includes(i) ? (i === t.a ? 'right' : 'wrong') : ''}" ${solved ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>
      ${st.length ? `<div class="why ${son === t.a ? 'ok' : 'no'}">${son === t.a ? '✓ ' : '✗ '}${t.why_[son]}</div>` : ''}</div>`;
  }
  function pump() {
    if (T.pump || T.shown >= S.chat.length) return;
    const next = S.chat[T.shown], ty = $('#w7-typing');
    const go = () => {
      T.pump = null; ty.hidden = true;
      const box = $('#w7-chat'), d = document.createElement('div');
      d.innerHTML = msgHTML(S.chat[T.shown]);
      while (d.firstChild) box.appendChild(d.firstChild);
      T.shown++;
      box.scrollTop = box.scrollHeight;
      pump();
    };
    if (next.w) {
      ty.hidden = false; ty.textContent = `${WHO[next.w].ad} yazıyor…`;
      T.pump = setTimeout(go, Math.min(1100, 350 + next.h.length * 3));
    } else T.pump = setTimeout(go, 150);
  }
  function renderChat() {
    const box = $('#w7-chat');
    box.innerHTML = S.chat.slice(0, T.shown).map(msgHTML).join('');
    box.scrollTop = box.scrollHeight;
    pump();
  }
  function refreshQuiz(id) {
    const el = root.querySelector(`.w7-quiz[data-q="${id}"]`);
    if (el) el.outerHTML = quizHTML(TBY[id]);
  }
  function renderPin() {
    const t = curT(), box = $('#w7-pin');
    if (!t) {
      box.innerHTML = S.cur < 0 ? '' : '<div class="w7-tk done"><div class="tt"><span class="id">🎉</span><b>Bütün biletler kapandı</b></div><div class="bd">Mesai bitti. Eline sağlık!</div></div>';
      return;
    }
    const rows = ticketRows(t), hints = t.hints || [], shown = S.hint[t.id] || 0;
    const act = [];
    if (t.type === 'review') act.push('<button class="btn w7-go sm" data-act="showrev">🔍 İncelemeyi aç</button>');
    if (t.type === 'uml') act.push('<button class="btn w7-go sm" data-act="showarch">🏛️ Mimari\'yi aç</button>');
    if (t.type === 'pdf') act.push('<button class="btn w7-go sm" data-act="pdf">📄 PDF Al</button>');
    if (t.type === 'code' || t.type === 'live') act.push('<button class="btn w7-go sm" data-act="deploy">🚀 Canlıya Al</button>');
    if (shown < hints.length) act.push(`<button class="btn sm" data-act="hint">💡 Cem Abi'ye sor (${hints.length - shown})</button>`);
    if (t.wiki) act.push(`<button class="btn sm" data-act="wikigo" data-k="${t.wiki}">📚 Wiki</button>`);
    box.innerHTML = `<div class="w7-tk ${t.incident ? 'inc' : ''}"><div class="tt"><span class="id">${t.id}</span><b>${esc(t.title)}</b></div>
      <div class="sec why"><b>Neden?</b> ${t.why}</div>
      ${t.files ? `<div class="sec nere"><b>Dosya:</b> ${t.files.map(y => `<button class="w7-fbtn ${S.file === y ? 'on' : ''}" data-act="file" data-k="${y}">📄 ${y}</button>`).join(' ')}</div>` : ''}
      <div class="sec"><b>Yapılacaklar</b><ol>${t.spec.map(x => `<li>${x}</li>`).join('')}</ol></div>
      ${t.wiki && t.type === 'code' ? '<div class="sec">Python\'da nasıl yazıldığını unuttuysan <b>📚 Wiki</b>\'de başka bir sınıf üzerinde örneği var.</div>' : ''}
      ${t.ex ? `<div class="sec"><b>Böyle çalışmalı</b><pre class="w7-ex">${t.ex.map(e => hlBlock(e[0]) + (e[1] ? `\n<span class="ar">→ ${esc(e[1])}</span>` : '')).join('\n')}</pre></div>` : ''}
            ${rows.length ? `<ul class="ck">${rows.map(r => `<li class="${r.ok ? 'ok' : 'no'}"><i>${r.ok ? '✓' : '○'}</i><span>${esc(r.label)}${!r.ok && r.msg ? `<small>${esc(r.msg)}</small>` : ''}</span></li>`).join('')}</ul>` : ''}
      ${shown ? `<div class="hints">${hints.slice(0, shown).map(h => `<div>🧔 ${esc(h)}</div>`).join('')}</div>` : ''}
      <div class="ac">${act.join('')}</div></div>`;
  }
  function renderBoard() {
    const col = (title, cls, list) => `<div class="w7-col ${cls}"><h4>${title}<small>${list.length}</small></h4>${list.map(t => `<div class="w7-card ${t.incident ? 'inc' : ''}"><small>${t.id}</small><b>${esc(t.title)}</b></div>`).join('') || '<p class="none">Boş</p>'}</div>`;
    const c = curT(), later = TICKETS.filter((t, i) => i > S.cur);
    $('#w7-board').innerHTML = `<div class="w7-sprint"><b>Bugünün işi</b><span>${CHAPTERS.map((n, i) => `<i class="${c && c.ch === i ? 'on' : (!c || i < c.ch) ? 'ok' : ''}">${esc(n)}</i>`).join('')}</span></div>
      <div class="w7-cols">${col('Sırada', 'todo', later.slice(0, 4))}${col('Sende', 'doing', c ? [c] : [])}${col('Bitti', 'finished', TICKETS.filter(t => S.done[t.id]).reverse())}</div>
      ${later.length > 4 ? `<p class="w7-sub">…ve ${later.length - 4} bilet daha. Kaan bugün ne yapacak, kim bilir. 🙃</p>` : ''}`;
  }

  /* ---- kod inceleme penceresi ---- */
  function renderReview() {
    const t = curT(), box = $('#w7-rev');
    if (!t || t.type !== 'review') { box.innerHTML = '<p class="w7-empty">Şu an bekleyen kod incelemesi yok. ☕</p>'; return; }
    const R = REVIEWS[t.rev], lines = highlightPy(R.code.replace(/\n$/, ''));
    $('#w7-wt-review').textContent = 'Kod İnceleme · ' + R.title;
    box.innerHTML = `<div class="w7-revh"><span class="av" style="background:${WHO[R.by].c}">${WHO[R.by].em}</span><div>${R.ask}</div></div>
      <div class="w7-revc">${lines.map((h, i) => `<button class="${T.revMarks.includes(i + 1) ? 'mark' : ''}" data-rl="${i + 1}"><i>${i + 1}</i><code>${h || ' '}</code></button>`).join('')}</div>
      <div class="w7-revf"><span>${T.revMarks.length} satır işaretli</span>${T.revMsg ? `<em>${T.revMsg}</em>` : ''}<button class="btn w7-go" data-act="revsend">Gönder</button></div>`;
  }
  function reviewSend() {
    const t = curT(); if (!t || t.type !== 'review') return;
    const R = REVIEWS[t.rev], M = T.revMarks;
    const wrong = M.some(x => !R.bad.includes(x)), miss = R.bad.some(x => !M.includes(x));
    if (wrong) T.revMsg = R.wrong; else if (miss) T.revMsg = R.miss;
    if (wrong || miss) { renderReview(); return; }
    T.revMsg = ''; finish(t); renderAll();
  }
  function quizAnswer(id, i) {
    const t = TBY[id];
    if (!t || S.done[id]) return;
    const k = 'q' + id;
    S.hint[k] = (S.hint[k] || []).concat([i]);
    if (i === t.a && curT() === t) { S.done[id] = true; refreshQuiz(id); delete S.done[id]; finish(t); renderAll(); }
    else { refreshQuiz(id); saveNow(); }
  }
  /* =====================================================================
     KOD PENCERESİ
     ===================================================================== */
  const LH = 21;
  const ED = { ta: null, hl: null, gut: null, cur: 1, lint: {}, hist: [], hi: -1 };
  const SNIPS = [['self.', 'self.'], ['def', 'def |(self):'], ['__init__', 'def __init__(self|):'], ['super().__init__()', 'super().__init__(|)'], ['super().', 'super().'], ['@abstractmethod', '@abstractmethod'], ['[ ]', '[|]'], ['return', 'return '], ['_', '_'], ['__', '__']];
  const RO = { 'sistem.py': () => H7Py.SISTEM, 'eski_odeme.py': () => ESKI };
  const CRUMB = { 'sistem.py': 'Salt okunur. Uygulamanın motoru: sınıflarını nasıl kullandığına bak.', 'eski_odeme.py': 'Salt okunur. 2019\'dan kalma eski kod; karşılaştırmak için duruyor.', 'deneme.py': 'Deneme alanı: nesne üret, dene. Yayına çıkmaz.', 'kaan.py': 'Kaan\'ın kodu. Düzeltmek senin işin. 🙃' };

  function codeShell() {
    return `<div class="w7-ebar">
        <button class="w7-deploy" data-act="deploy" id="w7-deploy">🚀 Canlıya Al <kbd>Ctrl</kbd><kbd>Enter</kbd></button>
        <ol class="w7-pipe" id="w7-pipe"><li data-p="derle">Derle</li><li data-p="test">Testler</li><li data-p="canli">Canlı</li></ol>
        <span class="w7-pys" id="w7-pys"></span>
      </div>
      <div class="w7-ide">
        <nav class="w7-tree" id="w7-tree" aria-label="Dosyalar"></nav>
        <div class="w7-edw">
          <div class="w7-crumb" id="w7-crumb"></div>
          <div class="w7-snips" id="w7-snips">${SNIPS.map((s, i) => `<button data-snip="${i}" tabindex="-1">${esc(s[0])}</button>`).join('')}</div>
          <div class="w7-ed">
            <div class="w7-gut" id="w7-gut" aria-hidden="true"></div>
            <div class="w7-edc"><pre class="w7-hl" id="w7-hl" aria-hidden="true"></pre><textarea id="w7-ta" spellcheck="false" wrap="off" autocapitalize="off" autocomplete="off" aria-label="Python kodu"></textarea></div>
            <div class="w7-chip" id="w7-chip" hidden></div>
          </div>
        </div>
      </div>
      <div class="w7-con">
        <div class="w7-conh"><b>Konsol</b><button data-act="clearcon">Temizle</button></div>
        <div class="w7-cout" id="w7-cout"><div class="w7-cl info">🚀 Canlıya Al: kodun derlenir, testlerden geçer, yayına çıkar. print() çıktıları ve hatalar burada.</div></div>
        <label class="w7-repl"><span>&gt;&gt;&gt;</span><input id="w7-repl" placeholder='Bir ifade dene: Tost("K", 60, True).fiyat()' spellcheck="false" autocomplete="off"></label>
      </div>`;
  }
  const PY_TOK = /(#[^\n]*)|("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|[rRbBuUfF]{0,2}"(?:[^"\\\n]|\\.)*"?|[rRbBuUfF]{0,2}'(?:[^'\\\n]|\\.)*'?)|(@[A-Za-z_][\w.]*)|\b(class|def|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|pass|import|from|as|try|except|finally|raise|with|lambda|break|continue|global|nonlocal|yield|del|assert)\b|\b(self|super)\b|\b(print|len|range|isinstance|issubclass|list|dict|str|int|float|bool|max|min|sum|abs|round|type|hasattr|getattr|sorted|ABC|abstractmethod)\b|\b(\d+(?:\.\d+)?)\b|(?<=\bclass\s+)([A-Za-z_ÇĞİÖŞÜçğıöşü][\wÇĞİÖŞÜçğıöşü]*)|(?<=\bdef\s+)([A-Za-z_ÇĞİÖŞÜçğıöşü][\wÇĞİÖŞÜçğıöşü]*)/g;
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
  const readOnly = () => !!RO[S.file];
  const curText = () => (readOnly() ? RO[S.file]() : S.files[S.file]);
  function renderTabs() {
    const item = (y, ad, cls) => `<button class="f ${S.file === y ? 'on' : ''} ${cls || ''}" data-act="file" data-k="${y}" title="${y}">${ad}</button>`;
    const klasor = (d, em) => {
      const list = FILE_ORDER.filter(y => y.startsWith(d + '/') && S.files[y] != null);
      return list.length ? `<div class="d">${em} ${d}/</div>` + list.map(y => item(y, y.slice(d.length + 1), 'in')).join('') : '';
    };
    const buz = S.freeze && curT() && curT().freeze ? ' 🧊' : '';
    $('#w7-tree').innerHTML = klasor('urunler', '🍽️') + klasor('odeme', '💳') + klasor('kurye', '🛵') +
      (S.files['siparis.py'] != null ? item('siparis.py', 'siparis.py' + buz) : '') +
      (S.files['kaan.py'] != null ? item('kaan.py', 'kaan.py', 'hot') : '') +
      '<hr>' + item('deneme.py', '✏️ deneme.py') + item('sistem.py', '🔒 sistem.py', 'ro') + item('eski_odeme.py', '🔒 eski_odeme.py', 'ro');
    const y = S.file, ad = FILE_INFO[y];
    $('#w7-crumb').innerHTML = `<b>${y}</b> <span>${CRUMB[y] || (ad ? ad + ' sınıfı burada.' : '')}</span>`;
  }
  function switchFile(k) {
    S.file = k; ED.ta.value = curText(); ED.ta.readOnly = readOnly(); ED.ta.scrollTop = 0; ED.ta.scrollLeft = 0; ED.cur = 1;
    $('#w7-snips').hidden = readOnly();
    renderTabs(); hlRender(); save();
  }
  function hlRender() {
    const lines = highlightPy(ED.ta.value);
    const bad = T.errFile === S.file ? T.errLine : ED.lint[S.file];
    ED.hl.innerHTML = lines.map((h, i) => `<div class="${i + 1 === bad ? 'err' : ''}${i + 1 === ED.cur ? ' cur' : ''}">${h || ' '}</div>`).join('') + '<div> </div>';
    ED.gut.innerHTML = lines.map((_, i) => `<div class="${i + 1 === bad ? 'err' : ''}${i + 1 === ED.cur ? ' cur' : ''}">${i + 1}</div>`).join('') + '<div></div>';
    syncScroll();
  }
  function syncScroll() { ED.hl.scrollTop = ED.ta.scrollTop; ED.hl.scrollLeft = ED.ta.scrollLeft; ED.gut.scrollTop = ED.ta.scrollTop; }
  function updateCur() {
    const n = ED.ta.value.slice(0, ED.ta.selectionStart).split('\n').length;
    if (n === ED.cur) return;
    [ED.hl, ED.gut].forEach(el => { const a = el.children[ED.cur - 1], b = el.children[n - 1]; if (a) a.classList.remove('cur'); if (b) b.classList.add('cur'); });
    ED.cur = n;
  }
  function insertText(text) {
    const ta = ED.ta; ta.focus();
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (_) { ok = false; }
    if (!ok) { ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end'); onEdInput(); }
  }
  const lineStart = pos => ED.ta.value.lastIndexOf('\n', pos - 1) + 1;
  function mapLines(fn) {
    const ta = ED.ta, v = ta.value, s = lineStart(ta.selectionStart);
    let e = ta.selectionEnd; if (e > ta.selectionStart && v[e - 1] === '\n') e--;
    let e2 = v.indexOf('\n', e); if (e2 < 0) e2 = v.length;
    const out = fn(v.slice(s, e2).split('\n')).join('\n');
    ta.setSelectionRange(s, e2); insertText(out);
    ta.setSelectionRange(s, s + out.length);
  }
  function onEdKey(e) {
    const ta = ED.ta, mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === 'Enter') { e.preventDefault(); deploy(); return; }
    if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveNow(); toast('Otomatik kaydediliyor zaten 😉', 'info', 1600); return; }
    if (readOnly()) return;
    if (mod && e.key === '/') {
      e.preventDefault();
      mapLines(ls => { const all = ls.filter(l => l.trim()).every(l => /^\s*#/.test(l)); return ls.map(l => (!l.trim() ? l : all ? l.replace(/^(\s*)# ?/, '$1') : l.replace(/^(\s*)/, '$1# '))); });
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) mapLines(ls => ls.map(l => l.replace(/^ {1,4}/, '')));
      else if (ta.value.slice(ta.selectionStart, ta.selectionEnd).includes('\n')) mapLines(ls => ls.map(l => '    ' + l));
      else insertText(' '.repeat(4 - ((ta.selectionStart - lineStart(ta.selectionStart)) % 4)));
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !mod) {
      e.preventDefault();
      const before = ta.value.slice(lineStart(ta.selectionStart), ta.selectionStart);
      let ind = (/^ */.exec(before) || [''])[0].length;
      const tr = before.trim();
      if (/:\s*(#.*)?$/.test(tr)) ind += 4;
      else if (/^(return\b|pass$|break$|continue$|raise\b)/.test(tr)) ind = Math.max(0, ind - 4);
      insertText('\n' + ' '.repeat(ind));
      return;
    }
    if (e.key === 'Backspace' && ta.selectionStart === ta.selectionEnd && !mod) {
      const before = ta.value.slice(lineStart(ta.selectionStart), ta.selectionStart);
      if (before.length && /^ +$/.test(before)) {
        e.preventDefault();
        const n = before.length % 4 || 4;
        ta.setSelectionRange(ta.selectionStart - n, ta.selectionStart);
        try { if (!document.execCommand('delete')) throw 0; } catch (_) { ta.setRangeText('', ta.selectionStart, ta.selectionEnd, 'end'); onEdInput(); }
      }
    }
  }
  function onEdInput() {
    if (readOnly()) return;
    S.files[S.file] = ED.ta.value; save();
    if (T.errFile === S.file) { T.errFile = null; T.errLine = null; }
    ED.lint[S.file] = null;
    hlRender(); updateCur(); lintSoon();
  }
  function gotoLine(file, n) {
    if (file && (S.files[file] != null || RO[file]) && file !== S.file) switchFile(file);
    openWin('code');
    const v = ED.ta.value.split('\n'); n = clamp(n, 1, v.length);
    let s = 0; for (let i = 0; i < n - 1; i++) s += v[i].length + 1;
    ED.ta.focus(); ED.ta.setSelectionRange(s, s + v[n - 1].length);
    ED.ta.scrollTop = Math.max(0, (n - 4) * LH);
    syncScroll(); updateCur();
  }
  const lintSoon = debounce(async () => {
    if (H7Py.status() !== 'ready') return;
    const snap = JSON.stringify(S.files);
    try {
      const r = await H7Py.lint(filesPayload());
      if (snap !== JSON.stringify(S.files)) return;
      ED.lint = {};
      (r.errs || []).forEach(e => { if (e.file) ED.lint[e.file] = e.line; });
      const chip = $('#w7-chip'), er = (r.errs || []).find(e => e.file === S.file);
      chip.hidden = !er;
      if (er) { chip.textContent = `⚠ ${er.line}. satır: ${H7Py.explain(er, ctxErr()).title}`; chip.dataset.line = er.line; }
      S.analysis = r.analysis; S.analysisV++;
      if (winOf('arch').open) renderArch();
      hlRender();
    } catch (_) { /* motor meşgul */ }
  }, 900);

  /* ---- konsol ve canlıya alma ---- */
  const ctxErr = () => ({ abstractByDesign: n => ['Odeme', 'Kurye'].includes(n) });
  function conAdd(html, cls) {
    const box = $('#w7-cout');
    const d = document.createElement('div'); d.className = 'w7-cl ' + (cls || ''); d.innerHTML = html;
    box.appendChild(d);
    while (box.children.length > 300) box.firstChild.remove();
    box.scrollTop = box.scrollHeight;
  }
  function errHTML(err, pre) {
    const x = H7Py.explain(err, ctxErr());
    const yer = err.line ? ` <button class="w7-goto" data-goto="${esc(err.file || '')}:${err.line}">${esc(err.file || '')} ${err.line}. satır</button>` : '';
    return `<div class="t">✖ ${pre || ''}${esc(x.title)}${yer}</div><div class="tip">${esc(x.tip)}</div><div class="raw">${esc(err.type)}: ${esc(err.msg)}${err.text ? `<br><code>${esc(err.text)}</code>` : ''}</div>`;
  }
  function pipe(step, state) {
    const li = root.querySelector(`.w7-pipe [data-p="${step}"]`);
    if (li) li.className = state || '';
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function deploy() {
    if (T.runBusy) return;
    T.runBusy = true;
    const btn = $('#w7-deploy'); btn.disabled = true;
    saveNow(); stopPlays();
    ['derle', 'test', 'canli'].forEach(s => pipe(s, ''));
    pipe('derle', 'run');
    conAdd(`<span>🚀 Canlıya alınıyor · sürüm #${S.deploys + 1}</span>`, 'sep');
    T.errFile = null; T.errLine = null;
    const t = curT();
    try {
      const r = await H7Py.deploy(filesPayload(), t && t.rush ? 30 : 8, Math.floor(Math.random() * 1e9));
      if (r.fail) { pipe('derle', 'bad'); conAdd('⚠ ' + esc(r.fail), 'warnl'); return; }
      if (r.out) conAdd(esc(r.out.replace(/\n$/, '')), 'out');
      r.errs.forEach(e => conAdd(errHTML(e), 'err'));
      const first = r.errs.find(e => e.file !== 'deneme.py') || null;
      if (first) { T.errFile = first.file || null; T.errLine = first.line; }
      hlRender();
      if (!r.derlendi) {
        pipe('derle', 'bad');
        if (first && first.file && first.file !== S.file) switchFile(first.file);
        conAdd('🤖 Sürüm yayına çıkmadı: kod derlenemedi.', 'warnl');
        return;
      }
      pipe('derle', first ? 'warn' : 'ok');
      S.deploys++;
      S.analysis = r.analysis; S.analysisV++;
      S.tests = r.tests || {};
      if (r.analysis && r.analysis.deneme_sinif && r.analysis.deneme_sinif.length) conAdd(`⚠️ deneme.py içinde sınıf var (${esc(r.analysis.deneme_sinif.join(', '))}). Sınıflar kendi dosyasında olmalı; deneme.py yayına çıkmaz.`, 'warnl');
      await wait(220);
      pipe('test', 'run');
      await wait(260);
      const curOk = !t || !(t.tests || []).length || t.tests.every(k => S.tests[k] && S.tests[k][0]);
      const geri = TICKETS.filter(x => S.done[x.id] && (x.tests || []).some(k => S.tests[k] && !S.tests[k][0]));
      pipe('test', !curOk ? 'bad' : geri.length ? 'warn' : 'ok');
      if (!curOk) conAdd(`🧪 ${esc(t.id)} testleri henüz geçmedi; ayrıntı Mesajlar penceresindeki bilette.`, 'warnl');
      geri.forEach(x => conAdd(`⚠️ ${esc(x.id)} (${esc(x.title)}) geri bozuldu: ${esc(((x.tests || []).map(k => S.tests[k]).find(v => v && !v[0]) || [])[1] || '')}`, 'warnl'));
      S.last = { katalog: r.katalog || [], gun: r.gun ? r.gun.length : 0, hata: r.gun ? r.gun.filter(e => e.err).length : 0 };
      renderMenu();
      const herr = r.gun && r.gun.find(e => e.err);
      if (herr) conAdd(errHTML(herr.err, 'Canlıda: '), 'err');
      pipe('canli', !r.gun && !(r.katalog || []).length ? '' : (S.last.hata ? 'bad' : 'ok'));
      if (r.gun) playDay(r.gun, t && t.rush);
      else if ((r.katalog || []).length) { S.liveTab = 'menu'; renderLiveTabs(); }
      advance();
      saveNow();
    } catch (e) {
      pipe('derle', 'bad');
      if (e && e.timeout) conAdd('⏱ Kod 8 saniyede bitmedi. Sonsuz döngü ya da kendini çağıran bir metot olabilir. Python yeniden başlatılıyor.', 'warnl');
      else conAdd('⚠ ' + esc((e && e.fatal) || String(e)), 'warnl');
    } finally {
      T.runBusy = false; btn.disabled = false; setPyStatus(H7Py.status());
    }
  }
  async function replRun(expr) {
    if (!expr.trim()) return;
    ED.hist.push(expr); ED.hi = ED.hist.length;
    conAdd(`<span class="p">&gt;&gt;&gt;</span> ${esc(expr)}`, 'in');
    try {
      const r = await H7Py.evaluate(filesPayload(), expr);
      if (r.out) conAdd(esc(r.out.replace(/\n$/, '')), 'out');
      if (r.err) conAdd(errHTML(r.err), 'err');
      else if (r.val != null) {
        const obj = /^<__main__\.(\w+) object at/.exec(r.val);
        conAdd(esc(r.val) + (obj ? ` <small>← bir ${esc(obj[1])} nesnesi. Güzel görünmesi için __str__ lazım.</small>` : ''), 'val');
      }
    } catch (e) { conAdd(e && e.timeout ? '⏱ Zaman aşımı.' : '⚠ ' + esc((e && e.fatal) || String(e)), 'warnl'); }
  }
  function setPyStatus(s) {
    const el = $('#w7-pys'); if (!el) return;
    el.className = 'w7-pys ' + s;
    el.textContent = { idle: '⚪ Python bekliyor', loading: '⏳ Python yükleniyor…', ready: '🟢 Python hazır', busy: '⚙️ Çalışıyor…', error: '🔴 Python yüklenemedi (internet?)' }[s] || s;
    const b = $('#w7-deploy'); if (b && !T.runBusy) b.disabled = s === 'loading' || s === 'busy';
  }

  /* =====================================================================
     CANLI: telefon, harita, menü
     ===================================================================== */
  const BINA = { 'Mühendislik': [300, 40], 'Kütüphane': [190, 60], 'Yurt': [345, 120], 'Spor Salonu': [310, 195], 'Rektörlük': [180, 185], 'Otopark': [55, 200] };
  const KANTIN = [70, 105];
  const KURYE_EM = { Bisiklet: '🚲', Motor: '🛵', Stajyer: '🚶', Drone: '🚁' };
  const URUN_EM = { Tost: '🥪', Icecek: '🥤', Menu: '🍱', KampanyaTost: '🏷️', BedavaCay: '🍵', KahvaltiMenu: '🍳' };
  const YORUM = {
    hizli: ['Uçarak geldi resmen 🔥', 'Tost hâlâ sıcak!', 'Dersten çıkmadan geldi 👏', 'Beş yıldız, bir de kahve ısmarlarım.'],
    orta: ['Fena değil.', 'Geldi, yedim, doydum.', 'Çayı biraz soğumuş ama olsun.'],
    yavas: ['Tost soğudu, mezun olacaktım 😭', 'Kurye yürüyerek mi geldi?!', 'Sipariş verdim, dönem bitti.', 'Bahanesi güzeldi ama tost buz.'],
    red: ['Kartım reddedildi, ay sonu işte 😅', 'Bakiye yetmedi, simit yiyeceğim.'],
    bedava: ['"Bedava" dediniz, para kestiniz! 😡'],
    hata: ['Uygulama patladı, AÇIM!! 😡', 'Hata verdi, kantine yürüyorum.']
  };
  function liveShell() {
    const b = Object.entries(BINA).map(([n, p]) => `<g><rect x="${p[0] - 24}" y="${p[1] - 15}" width="48" height="30" rx="5" class="bd"/><text x="${p[0]}" y="${p[1] + 27}" class="lb">${n}</text></g>`).join('');
    return `<div class="w7-phone">
      <div class="w7-ph-top"><b>🥪 Kantin Express</b><span id="w7-rate">⭐ 4.5</span></div>
      <div class="w7-ph-tabs" id="w7-ltabs"></div>
      <div class="w7-ph-map" id="w7-map"><svg viewBox="0 0 400 240" aria-hidden="true">
          <path class="yol" d="M70 105 H300 V40 M190 105 V60 M300 105 H345 V120 M300 105 V195 M180 105 V185 M70 105 V200 H55"/>${b}
          <rect x="${KANTIN[0] - 30}" y="${KANTIN[1] - 20}" width="60" height="40" rx="7" class="kn"/><text x="${KANTIN[0]}" y="${KANTIN[1] + 7}" class="ke">🥪</text><text x="${KANTIN[0] + 34}" y="${KANTIN[1] - 24}" class="lb b">KANTİN</text>
        </svg><div id="w7-riders"></div></div>
      <div class="w7-ph-menu" id="w7-menu" hidden></div>
      <div class="w7-stats"><div><b id="w7-s-ciro">0</b><small>TL ciro</small></div><div><b id="w7-s-tes">0</b><small>teslimat</small></div><div><b id="w7-s-red">0</b><small>reddedilen</small></div><div class="er"><b id="w7-s-err">0</b><small>hata</small></div></div>
      <div class="w7-orders" id="w7-orders"><p class="w7-empty">Henüz sipariş yok. Kampüs bekliyor. 🍽️</p></div></div>`;
  }
  function renderLiveTabs() {
    $('#w7-ltabs').innerHTML = [['map', '🗺️ Harita'], ['menu', '📋 Menü']].map(([k, l]) => `<button class="${S.liveTab === k ? 'on' : ''}" data-act="ltab" data-k="${k}">${l}</button>`).join('');
    $('#w7-map').hidden = S.liveTab !== 'map';
    $('#w7-menu').hidden = S.liveTab !== 'menu';
  }
  function renderMenu() {
    const box = $('#w7-menu'), k = (S.last && S.last.katalog) || [];
    if (!k.length) { box.innerHTML = '<p class="w7-empty">Menü boş. Ürün sınıflarını yaz ve canlıya al.</p>'; return; }
    box.innerHTML = k.map(u => (u.err
      ? `<div class="w7-mi bad"><span>💥</span><div><b>${esc(u.ad)}</b><small>${esc(H7Py.explain(u.err, ctxErr()).title)}</small></div><em>?</em></div>`
      : `<div class="w7-mi"><span>${URUN_EM[u.cls] || '🍽️'}</span><div><b>${esc(u.ad)}</b><small><code>${esc(u.yazi || u.cls + '.fiyat()')}</code></small></div><em>${para(u.fiyat)} TL</em></div>`)).join('');
  }
  function updStats() {
    const s = S.stat;
    $('#w7-s-ciro').textContent = para(s.ciro); $('#w7-s-tes').textContent = s.teslim; $('#w7-s-red').textContent = s.red; $('#w7-s-err').textContent = s.hata;
    $('#w7-rate').textContent = '⭐ ' + s.puan.toFixed(1);
  }
  function stopPlays() { T.plays.forEach(clearTimeout); T.plays = []; $('#w7-riders').innerHTML = ''; }
  function orderRow(ev) {
    const box = $('#w7-orders');
    if (box.querySelector('.w7-empty')) box.innerHTML = '';
    const d = document.createElement('div');
    const ok = ev.durum === 'TESLIM', hata = !!ev.err;
    const yorum = hata ? pick(YORUM.hata) : ev.bedava ? pick(YORUM.bedava) : !ok ? pick(YORUM.red) : ev.dk > 25 ? pick(YORUM.yavas) : ev.dk < 10 ? pick(YORUM.hizli) : pick(YORUM.orta);
    d.className = 'w7-ord ' + (hata ? 'bad' : (!ok || ev.bedava) ? 'rej' : '');
    d.innerHTML = `<div class="a"><b>${esc(ev.m)}</b> → ${esc(ev.bina)} <span>${KURYE_EM[ev.kurye] || '📦'}${ok ? ' ' + Math.round(ev.dk) + ' dk' : ''}</span></div>
      <div class="b">${esc(ev.urunler.join(' + ') || '…')}${ev.tutar != null ? ` · <b>${para(ev.tutar)} TL</b>` : ''}${ev.odeme ? ` · ${esc(ev.odeme)}` : ''}</div>
      <div class="c">${hata ? '💥 ' + esc(H7Py.explain(ev.err, ctxErr()).title) : (!ok ? '❌ Ödeme reddedildi · ' : '') + esc(yorum)}</div>`;
    box.prepend(d);
    while (box.children.length > 40) box.lastChild.remove();
  }
  function rider(ev, speed) {
    const box = $('#w7-riders'), to = BINA[ev.bina];
    if (!to || ev.durum !== 'TESLIM') return;
    const el = document.createElement('span');
    el.className = 'w7-rider'; el.textContent = KURYE_EM[ev.kurye] || '📦';
    const pos = p => ({ left: (p[0] / 400) * 100 + '%', top: (p[1] / 240) * 100 + '%' });
    box.appendChild(el);
    const dur = clamp(ev.dk * 150 * speed, 500, 6500);
    const a = el.animate([Object.assign({ opacity: 1 }, pos(KANTIN)), Object.assign({ opacity: 1, offset: 0.97 }, pos(to)), Object.assign({ opacity: 0 }, pos(to))], { duration: dur, easing: 'linear', fill: 'forwards' });
    a.onfinish = () => el.remove();
  }
  function playDay(evs, rush) {
    const gap = rush ? 260 : 750;
    if (S.liveTab !== 'map') { S.liveTab = 'map'; renderLiveTabs(); }
    evs.forEach((ev, i) => {
      T.plays.push(setTimeout(() => {
        const s = S.stat;
        if (ev.err) { s.hata++; s.puan = clamp(s.puan - 0.25, 1, 5); }
        else if (ev.durum === 'TESLIM') { s.teslim++; s.ciro += ev.bedava ? 0 : ev.tutar; s.puan = clamp(s.puan + (ev.bedava ? -0.2 : ev.dk > 25 ? -0.04 : ev.dk < 10 ? 0.06 : 0.01), 1, 5); }
        else s.red++;
        orderRow(ev); rider(ev, rush ? 0.45 : 1); updStats();
        save();
      }, i * gap));
    });
  }

  /* =====================================================================
     MİMARİ: UML'yi öğrencinin KODUNDAN çiz
     ===================================================================== */
  const INFER = (name, CC) => {
    const f = fold(name), base = f.replace(/(ler|lar)$/, '');
    return Object.keys(CC).find(n => fold(n) === f || fold(n) === base) || null;
  };
  function archModel() {
    const CC = (S.analysis && S.analysis.classes) || {};
    const rels = [];
    const vis = n => (/^__.*__$/.test(n) ? '+ ' + n : /^__/.test(n) ? '- ' + n.slice(2) : /^_/.test(n) ? '# ' + n.slice(1) : '+ ' + n);
    const classes = Object.keys(CC).map(n => {
      const c = CC[n], roles = {};
      c.bases.forEach(b => { if (CC[b] && b !== n) rels.push({ a: n, b, type: 'gen', ma: '', mb: '', role: '' }); });
      Object.keys(c.attrs).forEach(at => {
        const v = c.attrs[at].val || '';
        let to = null, type = 'assoc', mb = '1';
        if (v.startsWith('new:') && CC[v.slice(4)]) { to = v.slice(4); type = 'comp'; }
        else if (v.startsWith('name:')) { to = INFER(v.slice(5), CC); if (to && /(ler|lar)$/.test(fold(v.slice(5)))) { type = 'agg'; mb = '0..*'; } }
        else if (v === 'list' && c.appends[at]) { to = INFER(c.appends[at], CC); type = 'agg'; mb = '0..*'; }
        if (to && to !== n) { rels.push({ a: n, b: to, type, ma: '', mb, role: at }); roles[at] = 1; }
      });
      const attrs = Object.keys(c.attrs).filter(a => !roles[a]).map(a => ({ text: vis(a) }));
      const meths = Object.keys(c.methods).filter(m => m !== '__init__').map(m => ({ key: m, text: vis(m) + '(' + c.methods[m].params.join(', ') + ')', abstract: c.methods[m].abstract }));
      const abs = Object.values(c.methods).some(m => m.abstract);
      return { id: n, name: n, stereo: abs ? 'abstract' : null, abstract: abs, attrs, meths };
    });
    // Yerleşim: kalıtım ağacı yukarıdan aşağı
    const byId = Object.fromEntries(classes.map(c => [c.id, c]));
    classes.forEach(c => {
      const longest = Math.max(c.name.length * 1.2, c.stereo ? 11 : 0, ...c.attrs.concat(c.meths).map(l => l.text.length));
      c.w = Math.round(Math.max(130, longest * 7.9 + 28));
      c.ah = c.attrs.length ? c.attrs.length * 20 + 10 : 16;
      c.hd = 40 + (c.stereo ? 17 : 0);
      c.h = c.hd + c.ah + (c.meths.length ? c.meths.length * 20 + 10 : 16);
      c.kids = []; c.parent = null;
    });
    rels.filter(r => r.type === 'gen').forEach(r => { const k = byId[r.a]; if (!k.parent) { k.parent = r.b; byId[r.b].kids.push(k); } });
    const roots = classes.filter(c => !c.parent);
    const span = c => { c.span = c.kids.length ? Math.max(c.w, c.kids.reduce((s, k) => s + span(k), 0) + (c.kids.length - 1) * 34) : c.w; return c.span; };
    // Siparis ortada, ürünler solda, ödemeler sağda, kuryeler altında: ilişki çizgileri kutuların arkasından geçmesin
    const yerlestir = (kok, x, y) => {
      span(kok);
      const depthH = {}, rowY = {};
      let yy = y;
      const walk = (c, d) => { depthH[d] = Math.max(depthH[d] || 0, c.h); c.d = d; c.kids.forEach(k => walk(k, d + 1)); };
      walk(kok, 0);
      Object.keys(depthH).sort((p, q) => p - q).forEach(d => { rowY[d] = yy; yy += depthH[d] + 70; });
      const place = (c, cx) => {
        c.x = Math.round(cx + (c.span - c.w) / 2); c.y = rowY[c.d];
        const tot = c.kids.reduce((t, k) => t + k.span, 0) + (c.kids.length - 1) * 34;
        let kx = cx + (c.span - tot) / 2;
        c.kids.forEach(k => { place(k, kx); kx += k.span + 34; });
      };
      place(kok, x);
      return { right: x + kok.span, bottom: yy - 70 };
    };
    const USTTE = ['Urun', 'Siparis', 'Odeme'];
    let x = 30, alt = 30, maxX = 0;
    USTTE.forEach(n => {
      const c = byId[n];
      if (!c || c.parent) return;
      const r = yerlestir(c, x, 30);
      x = r.right + 70; alt = Math.max(alt, r.bottom); maxX = Math.max(maxX, r.right);
    });
    const altta = roots.filter(c => !USTTE.includes(c.id)).sort((p, q) => (q.id === 'Kurye') - (p.id === 'Kurye'));
    let ax = 30, bitis = alt;
    altta.forEach((c, i) => {
      span(c);
      if (i === 0 && c.id === 'Kurye' && byId.Siparis && !byId.Siparis.parent) ax = Math.max(30, byId.Siparis.x + byId.Siparis.w / 2 - c.span / 2);
      const r = yerlestir(c, ax, alt + 80);
      ax = r.right + 60; bitis = Math.max(bitis, r.bottom); maxX = Math.max(maxX, r.right);
    });
    return { classes, rels, W: maxX + 30, H: bitis + 40 };
  }
  function archSVG(M) {
    const G = NYPPdf.geom, rects = Object.fromEntries(M.classes.map(c => [c.id, { x: c.x, y: c.y, w: c.w, h: c.h }])), pc = {};
    const hi = T.hiMeth;
    let edges = '';
    M.rels.forEach(r => {
      const k = [r.a, r.b].sort().join('|'), n = pc[k] = (pc[k] || 0) + 1;
      const off = n === 1 ? 0 : (n % 2 ? 1 : -1) * Math.ceil((n - 1) / 2) * 18;
      const g = G.edge(rects[r.a], rects[r.b], off), d = G.decorate(g, r.type), L = G.labels(g, r.type);
      const pts = sh => sh.pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      edges += `<g class="w7-e"><line x1="${d.s.x}" y1="${d.s.y}" x2="${d.e.x}" y2="${d.e.y}"/>${d.shapes.map(sh => `<${sh.closed ? 'polygon' : 'polyline'} class="${sh.fill}" points="${pts(sh)}"/>`).join('')}${r.type !== 'gen' ? `<text class="m" x="${L.mb.x}" y="${L.mb.y}">${esc(r.mb)}</text><text class="r" x="${L.role.x}" y="${L.role.y}">${esc(r.role)}</text>` : ''}</g>`;
    });
    const boxes = M.classes.map(c => {
      const lit = hi && c.meths.some(m => m.key === hi);
      const line = (l, i, y0, click) => `<text x="${c.x + 10}" y="${y0 + 19 + 20 * i}" class="ln ${l.abstract ? 'abs' : ''} ${click ? 'mt' : ''} ${click && hi === l.key ? 'on' : ''}" ${click ? `data-meth="${esc(l.key)}"` : ''}>${esc(l.text)}</text>`;
      return `<g class="w7-b ${c.stereo ? 'abs' : ''} ${lit ? 'lit' : ''}">
        <rect class="f" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}"/><rect class="hd" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.hd}"/><rect class="o" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}"/>
        <line x1="${c.x}" x2="${c.x + c.w}" y1="${c.y + c.hd}" y2="${c.y + c.hd}"/><line x1="${c.x}" x2="${c.x + c.w}" y1="${c.y + c.hd + c.ah}" y2="${c.y + c.hd + c.ah}"/>
        ${c.stereo ? `<text class="s7" x="${c.x + c.w / 2}" y="${c.y + 17}">«abstract»</text>` : ''}<text class="nm" x="${c.x + c.w / 2}" y="${c.y + (c.stereo ? 37 : 27)}">${esc(c.name)}</text>
        ${c.attrs.map((l, i) => line(l, i, c.y + c.hd, false)).join('')}${c.meths.map((l, i) => line(l, i, c.y + c.hd + c.ah, true)).join('')}</g>`;
    }).join('');
    const w = Math.max(M.W, 600), h = Math.max(M.H, 300);
    return `<svg class="w7-arch" viewBox="0 0 ${w} ${h}" width="${Math.round(w * 0.8)}" height="${Math.round(h * 0.8)}">${edges}${boxes}</svg>`;
  }
  function renderArch() {
    const box = $('#w7-archc'), M = archModel();
    if (!M.classes.length) {
      $('#w7-archtop').innerHTML = '';
      box.innerHTML = '<p class="w7-empty">Henüz sınıf yok. Bir sınıf yazınca burada kendiliğinden belirecek. ✨</p>';
      return;
    }
    const hi = T.hiMeth;
    $('#w7-archtop').innerHTML = `<div><b>Kodundan çizildi.</b> Yazdıkça değişir. Bir metot satırına tıkla: aynı metodu yazan sınıflar parlasın.</div>
      <div class="lg"><span>${M.classes.length} sınıf</span><span>${M.rels.length} ilişki</span>${hi ? `<span class="hi"><code>${esc(hi)}()</code> parladı <button data-act="unhi" aria-label="Temizle">✕</button></span>` : ''}</div>
      ${curT() && curT().type === 'uml' ? `<label class="w7-umlq">🎫 Kaç sınıf kendi <code>fiyat()</code> metodunu yazmış? <input id="w7-umla" type="number" min="0" inputmode="numeric"><button class="btn w7-go sm" data-act="umla">Gönder</button></label>` : ''}`;
    box.innerHTML = archSVG(M);
  }

  /* ---- wiki ---- */
  function renderWiki() {
    const W = WIKI.find(x => x.k === T.wikiK) || WIKI[0];
    $('#w7-wiki').innerHTML = `<nav>${WIKI.map(x => `<button class="${x.k === W.k ? 'on' : ''}" data-act="wiki" data-k="${x.k}"><b>${x.t}</b><small>${x.sub}</small></button>`).join('')}</nav>
      <article><h3>${W.t}</h3><p class="w7-sub">Örnekler bilerek başka konulardan. Kalıbı anla, kendi sınıfına uyarla.</p><pre class="w7-snip big">${hlBlock(W.code)}</pre><p class="w7-wnote">${W.note}</p></article>`;
  }

  /* =====================================================================
     PDF, YARDIM, ÖĞRETMEN
     ===================================================================== */
  function reportSVG() {
    const s = S.stat, M = archModel();
    const card = (x, v, l, c) => `<rect x="${x}" y="110" width="255" height="140" rx="14" fill="${c}" stroke="#1E1E24" stroke-width="3"/><text x="${x + 127}" y="185" text-anchor="middle" font-size="46" font-weight="800" fill="#1E1E24" font-family="sans-serif">${esc(v)}</text><text x="${x + 127}" y="222" text-anchor="middle" font-size="20" fill="#1E1E24" font-family="sans-serif">${esc(l)}</text>`;
    const sat = CHAPTERS.map((n, i) => {
      const list = TICKETS.filter(t => t.ch === i), tam = list.every(t => t.type === 'pdf' || S.done[t.id]);
      return `<text x="60" y="${330 + i * 36}" font-size="21" fill="#1E1E24" font-family="sans-serif">${tam ? '✓' : '○'}  ${esc(n.replace('🚨 ', ''))}</text><text x="1120" y="${330 + i * 36}" text-anchor="end" font-size="21" fill="#55555F" font-family="sans-serif">${list.length} bilet</text>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1180" height="600" viewBox="0 0 1180 600"><rect width="1180" height="600" fill="#FFF9EC"/><text x="60" y="72" font-size="38" font-weight="800" fill="#1E1E24" font-family="sans-serif">Kantin Express · Gün Sonu Raporu</text>
      ${card(60, para(s.ciro), 'TL ciro', '#FFD35C')}${card(335, s.teslim, 'teslimat', '#9BE8D2')}${card(610, s.puan.toFixed(1), 'müşteri puanı', '#FFC2D9')}${card(885, M.classes.length, 'sınıf', '#BFE3FF')}${sat}</svg>`;
  }
  function exportPdf() {
    if (!pdfOpen()) {
      modal(`<div class="w7-art">🔒</div><h3>PDF son bilette açılır</h3><p>Önce kalan <b>${TICKETS.length - 1 - doneCount()}</b> bileti kapatmalısın. İK, mesai bitmeden rapor almıyor. 😄</p>`, [{ label: 'Tamam', cls: 'w7-go' }]);
      return;
    }
    if (!window.NYPPdf) { toast('PDF modülü yüklenemedi.', 'bad'); return; }
    const M = archModel();
    if (!M.classes.length) { toast('Kodda henüz sınıf yok.', 'info'); return; }
    const code = FILE_ORDER.filter(y => S.files[y] != null).map(y => `# ---------- ${y} ----------\n` + S.files[y].replace(/^(\s*#[^\n]*\n)+\s*/, '').replace(/\s*$/, '')).join('\n\n\n');
    const classes = M.classes.map(c => ({ id: c.id, name: c.name, stereo: c.stereo, abstract: c.abstract, x: c.x, y: c.y, attrs: c.attrs.map(l => ({ text: l.text })), meths: c.meths.map(l => ({ text: l.text, abstract: l.abstract })) }));
    NYPPdf.exportUML({
      title: 'Kantin Express · UML Sınıf Diyagramı', week: '7. Hafta', classes, rels: M.rels, code, require: true, filename: 'kantin-express',
      scene: { svg: reportSVG(), title: 'Gün sonu raporu', pageTitle: 'Gün Sonu', heading: 'Bugün ne yaptım?', story: [`Bugün ${S.done['KE-29'] ? doneCount() : doneCount() + 1} bilet kapattım, ${S.stat.teslim} siparişi teslim ettim.`, 'Sistemin kalbine hiç dokunmadan yeni ödeme ve kurye türleri ekledim: nesneler kendi işini biliyor, motor hiçbirini tanımıyor.'] }
    }).then(r => {
      if (!r.ok) { if (!r.cancelled) toast(r.msg || 'PDF oluşturulamadı.', 'bad'); return; }
      toast(r.pdf ? '📄 PDF indirildi!' : r.msg, r.pdf ? 'good' : 'info', 4600);
      const t = curT();
      if (t && t.type === 'pdf') { finish(t); renderAll(); }
    });
  }
  function help() {
    modal(`<h3>🥪 KantinOS'a hoş geldin!</h3>
      <p>Bugün Kantin Express'te stajyersin. Burası bir işletim sistemi gibi çalışıyor: pencereleri başlığından tutup taşı, köşesinden boyutlandır, alttaki çubuktan aç/kapat.</p>
      <ul class="w7-how">
        <li><b>💬 Mesajlar:</b> Görevin her zaman en üstteki kartta yazar: neden, hangi dosya, neler yapılacak ve sonuç nasıl görünmeli. Altında ekip sohbet eder.</li>
        <li><b>⌨️ Kod:</b> Python'u sen yazarsın. Her sınıfın kendi dosyası var; bilet açılınca doğru dosya kendiliğinden açılır. <b>🚀 Canlıya Al</b> (<kbd>Ctrl</kbd>+<kbd>Enter</kbd>) kodunu derler, test eder, yayına alır.</li>
        <li><b>📱 Canlı:</b> Uygulaman! Fiyatlar senin metotlarından gelir, kuryeler senin hesapladığın sürede yürür.</li>
        <li><b>🏛️ Mimari:</b> Bu sefer UML çizmiyorsun: kodundan kendiliğinden çiziliyor.</li>
        <li><b>📚 Wiki:</b> Takıldığında bak; ya da biletteki <b>💡 Cem Abi'ye sor</b>.</li>
      </ul>
      <p class="w7-sub">⚠️ Sayfayı yenilersen kaldığın yerden devam edersin, ama <b>sekmeyi kapatırsan her şey silinir</b>. Son bilette PDF'ini alıp teslim edeceksin.</p>`,
    [{ label: 'İşe başla!', cls: 'w7-go', fn: () => { S.intro = true; saveNow(); if (S.cur < 0) { openTicket(0); renderAll(); } } }], 'w7m wide');
  }
  function example() {
    const o = OGR();
    try { return o && o.hafta7 ? JSON.parse(decodeURIComponent(escape(atob(o.hafta7)))) : null; } catch (_) { return null; }
  }
  function teacher() {
    if (!T.teacherOk) {
      const card = modal(`<h3>👩‍🏫 Öğretmen</h3><p>Öğretmen kodunu gir.</p><input type="password" id="w7-pin-in" class="w7-in" autocomplete="off" placeholder="öğretmen kodu">`,
        [{ label: 'Vazgeç' }, { label: 'Giriş', cls: 'w7-go', keep: true, fn: () => {
          if (OGR() && $('#w7-pin-in').value.trim() === OGR().pin) { T.teacherOk = true; S.teacherUsed = true; renderTaskbar(); teacher(); }
          else { $('#w7-pin-in').value = ''; toast('Kod yanlış.', 'bad'); }
        } }]);
      const i = $('#w7-pin-in', card); i.focus();
      i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); card.querySelector('.row .btn:last-child').click(); } });
      return;
    }
    modal(`<h3>👩‍🏫 Öğretmen paneli</h3><p>Derste göstermek için kısayollar. Öğrenci kopyasında bu panel yok.</p>
      <ul><li><b>Örnek kod:</b> çözüm kodunu bütün dosyalara yükler (mevcut kod silinir). Sonra 🚀 Canlıya Al.</li><li><b>Bileti geç:</b> şu anki bileti kapatır.</li><li><b>Sona git:</b> PDF biletine kadar hepsini kapatır.</li></ul>`,
    [{ label: 'Kapat' },
      { label: 'Bileti geç', fn: () => { const t = curT(); if (t) { finish(t); renderAll(); } } },
      { label: 'Sona git', fn: () => { while (curT() && curT().type !== 'pdf') finish(curT()); T.shown = S.chat.length; clearTimeout(T.pump); T.pump = null; $('#w7-typing').hidden = true; renderChat(); renderAll(); } },
      { label: 'Örnek kod', cls: 'w7-go', fn: () => { const x = example(); if (!x) { toast('Örnek bulunamadı.', 'bad'); return; } Object.assign(S.files, x.files); switchFile('urunler/urun.py'); saveNow(); toast('Örnek kod yüklendi. 🚀 Canlıya Al!', 'good'); } }], 'w7m wide');
    $('#nyp-modal-card .row .btn').focus({ preventScroll: true });
  }
  function resetAll() {
    modal('<h3>Her şey sıfırlansın mı?</h3><p>Kodun, biletlerin ve bugünkü ciro silinir. Sabah 09:00\'a dönersin.</p>',
      [{ label: 'Vazgeç' }, { label: 'Sıfırla', cls: 'lava', fn: () => {
        stopPlays(); const w = S.win; S = fresh(); S.win = w; S.intro = true;
        T.shown = 0; clearTimeout(T.pump); T.pump = null; T.revMarks = []; T.errFile = null;
        $('#w7-typing').hidden = true; $('#w7-chat').innerHTML = ''; $('#w7-cout').innerHTML = '';
        $('#w7-orders').innerHTML = '<p class="w7-empty">Henüz sipariş yok. Kampüs bekliyor. 🍽️</p>';
        ['derle', 'test', 'canli'].forEach(s => pipe(s, ''));
        switchFile('deneme.py'); openTicket(0); renderAll(); toast('Yeni gün, yeni tost.', 'info');
      } }]);
  }

  /* =====================================================================
     OLAYLAR ve BAĞLAMA
     ===================================================================== */
  function renderAll() {
    renderPin(); renderTaskbar(); renderLiveTabs(); renderMenu(); updStats(); renderTabs();
    if (winOf('board').open) renderBoard();
    if (winOf('review').open) renderReview();
    if (winOf('arch').open) renderArch();
    winEl('live').classList.toggle('alarm', !!(S.last && S.last.hata));
    saveNow();
  }
  function onClick(e) {
    const t = e.target;
    const menu = $('#w7-startm');
    if (!menu.hidden && !t.closest('.w7-startw')) menu.hidden = true;
    const rl = t.closest('[data-rl]');
    if (rl) { const n = +rl.dataset.rl, i = T.revMarks.indexOf(n); if (i >= 0) T.revMarks.splice(i, 1); else T.revMarks.push(n); T.revMsg = ''; renderReview(); return; }
    const qa = t.closest('[data-qa]');
    if (qa) { quizAnswer(qa.closest('[data-q]').dataset.q, +qa.dataset.qa); return; }
    const mt = t.closest('[data-meth]');
    if (mt) { T.hiMeth = T.hiMeth === mt.dataset.meth ? null : mt.dataset.meth; renderArch(); return; }
    const g = t.closest('[data-goto]');
    if (g) { const [f, l] = g.dataset.goto.split(':'); gotoLine(f, +l); return; }
    const sn = t.closest('[data-snip]');
    if (sn) { if (!readOnly()) { const s = SNIPS[+sn.dataset.snip][1], c = s.indexOf('|'), txt = s.replace('|', ''); insertText(txt); if (c >= 0) { const p = ED.ta.selectionStart - (txt.length - c); ED.ta.setSelectionRange(p, p); } } return; }
    if (t.closest('#w7-chip')) { gotoLine(null, +$('#w7-chip').dataset.line); return; }
    const b = t.closest('[data-act]'); if (!b) return;
    const k = b.dataset.k;
    if (b.closest('#w7-startm')) menu.hidden = true;
    switch (b.dataset.act) {
      case 'start': menu.hidden = !menu.hidden; break;
      case 'home': stopPlays(); saveNow(); if (window.NYP) window.NYP.home(); break;
      case 'help': help(); break;
      case 'tile': tile(); break;
      case 'teacher': if (OGR()) teacher(); break;
      case 'reset': resetAll(); break;
      case 'wmin': closeWin(k); break;
      case 'app': { if (winOf(k).open && winEl(k).classList.contains('top')) closeWin(k); else openWin(k); break; }
      case 'showrev': openWin('review'); break;
      case 'showarch': openWin('arch'); break;
      case 'deploy': deploy(); break;
      case 'pdf': exportPdf(); break;
      case 'file': switchFile(k); break;
      case 'clearcon': $('#w7-cout').innerHTML = ''; break;
      case 'ltab': S.liveTab = k; renderLiveTabs(); save(); break;
      case 'hint': { const c = curT(); if (c) { S.hint[c.id] = (S.hint[c.id] || 0) + 1; renderPin(); saveNow(); } break; }
      case 'wikigo': T.wikiK = k; openWin('wiki'); break;
      case 'wiki': T.wikiK = k; renderWiki(); break;
      case 'revsend': reviewSend(); break;
      case 'unhi': T.hiMeth = null; renderArch(); break;
      case 'umla': umlAnswer(); break;
    }
  }
  function umlAnswer() {
    const t = curT(); if (!t || t.type !== 'uml') return;
    const CC = (S.analysis && S.analysis.classes) || {};
    const need = Object.keys(CC).filter(n => CC[n].methods.fiyat).length;
    if (parseInt($('#w7-umla').value, 10) === need) { closeWin('arch'); finish(t); renderAll(); }
    else toast('Cem Abi: "Bir daha say." Mimari\'de fiyat() satırına tıkla, parlayan kutuları say.', 'bad', 4200);
  }
  function onDown(e) {
    const w = e.target.closest('.w7-win');
    if (w && !w.classList.contains('top')) focusWin(w.dataset.win);
    const dr = e.target.closest('[data-wdrag]'), rs = e.target.closest('[data-wres]');
    if (e.target.closest('button') || (!dr && !rs) || root.clientWidth < 1100) return;
    const k = (dr || rs).dataset[dr ? 'wdrag' : 'wres'], W = winOf(k), d = $('#w7-desk').getBoundingClientRect();
    T.drag = { k, res: !!rs, sx: e.clientX, sy: e.clientY, x: W.x, y: W.y, w: W.w, h: W.h, dw: d.width, dh: d.height };
    root.classList.add('dragging');
    e.preventDefault();
  }
  function onMove(e) {
    const D = T.drag; if (!D) return;
    const W = winOf(D.k), dx = ((e.clientX - D.sx) / D.dw) * 100, dy = ((e.clientY - D.sy) / D.dh) * 100;
    if (D.res) { W.w = clamp(D.w + dx, 20, 100 - W.x); W.h = clamp(D.h + dy, 25, 100 - W.y); }
    else { W.x = clamp(D.x + dx, -W.w + 12, 95); W.y = clamp(D.y + dy, 0, 94); }
    applyWin(D.k);
  }
  function onUp() { if (T.drag) { T.drag = null; root.classList.remove('dragging'); save(); } }
  function onKeyGlobal(e) {
    if (!root || root.hidden || e.key !== 'Escape') return;
    if (!$('#nyp-modal').hidden) { closeModal(); return; }
    $('#w7-startm').hidden = true;
  }
  function bootAnim() {
    const b = $('#w7-boot'); b.hidden = false;
    const said = ['Tost makinesi ısınıyor…', 'Kaan\'ın değişiklikleri geri alınıyor…', 'Çay demleniyor…'];
    let i = 0;
    const iv = setInterval(() => { i++; if (said[i]) $('#w7-bootm').textContent = said[i]; }, 550);
    setTimeout(() => {
      clearInterval(iv); b.hidden = true;
      if (!S.intro) help();
    }, 1700);
  }
  function mount(el) {
    root = el;
    ensureGlobals();
    root.innerHTML = shellHTML();
    ED.ta = $('#w7-ta'); ED.hl = $('#w7-hl'); ED.gut = $('#w7-gut');
    Object.keys(WINS).forEach(applyWin);
    let top = 'code', tz = winOf('code').z;
    Object.keys(WINS).forEach(k => { if (winOf(k).open && winOf(k).z > tz) { tz = winOf(k).z; top = k; } T.z = Math.max(T.z, winOf(k).z); });
    root.addEventListener('click', onClick);
    root.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    document.addEventListener('keydown', onKeyGlobal);
    ED.ta.addEventListener('keydown', onEdKey);
    ED.ta.addEventListener('input', onEdInput);
    ED.ta.addEventListener('scroll', syncScroll);
    ['keyup', 'click', 'select'].forEach(k => ED.ta.addEventListener(k, updateCur));
    $('#w7-repl').addEventListener('keydown', e => {
      const i = e.target;
      if (e.key === 'Enter') { e.preventDefault(); const v = i.value; i.value = ''; replRun(v); }
      else if (e.key === 'ArrowUp' && ED.hist.length) { e.preventDefault(); ED.hi = Math.max(0, ED.hi - 1); i.value = ED.hist[ED.hi] || ''; }
      else if (e.key === 'ArrowDown' && ED.hist.length) { e.preventDefault(); ED.hi = Math.min(ED.hist.length, ED.hi + 1); i.value = ED.hist[ED.hi] || ''; }
    });
    H7Py.onStatus(setPyStatus);
    const showT = () => { const b = $('#w7-tbtn'); if (b) b.hidden = !OGR(); };
    showT(); document.addEventListener('nyp-ogretmen', showT);
    T.shown = S.chat.length;
    switchFile(S.file);
    focusWin(top);
    renderChat(); renderAll();
    bootAnim();
    setTimeout(() => { H7Py.boot().then(() => lintSoon()).catch(() => { /* durum çipi gösterir */ }); }, 900);
  }
  function refresh() { renderAll(); syncScroll(); }

  function heroArt() {
    return `<div class="w7-hart">
      <div class="w7-hwin a"><header><i></i><i></i><b>Mesajlar</b></header><div class="m"><span>🕴️</span><p>Yeni ödeme türü <b>3 gün</b> sürdü. Neden?!</p></div><div class="m"><span>🧔</span><p>Çünkü nesne kendi işini bilmiyor.</p></div></div>
      <div class="w7-hwin b"><header><i></i><i></i><b>menu.py</b></header><pre><span class="kw">for</span> u <span class="kw">in</span> urunler:
    t += u.<span class="fn">fiyat</span>()
<span class="cm"># hangi fiyat()?
# nesne bilir.</span></pre></div>
      <div class="w7-hwin c"><header><i></i><i></i><b>Canlı</b></header><div class="r"><span>🥪</span><span class="d">······</span><span>🛵</span></div><div class="r"><span>🥪</span><span class="d">··</span><span>🚶</span></div><div class="r"><span>🥪</span><span class="d">········</span><span>🚁</span></div></div>
    </div>`;
  }

  return { mount, refresh, heroArt };
})();
