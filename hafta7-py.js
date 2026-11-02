/* =========================================================================
   7. HAFTA — Python çalışma ortamı (Kantin Express)
   Öğrencinin dosyaları (her sınıf kendi dosyasında) tarayıcıda gerçek Python 3
   ile (Pyodide, Web Worker içinde) sırayla, aynı isim uzayında çalışır.
   "Canlıya al" komutu: kodu çalıştırır, sınıfları AST ile analiz eder, bilet
   testlerini koşar ve bir iş gününün siparişlerini olay listesi olarak üretir.
   ========================================================================= */
window.H7Py = (function () {
  'use strict';

  const BASE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  const RUN_MS = 8000;

  const WORKER = `
let py = null;
self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.cmd === 'init') {
      importScripts(m.base + 'pyodide.js');
      py = await loadPyodide({ indexURL: m.base });
      py.runPython(m.harness);
      self.postMessage({ id: m.id, ok: true });
      return;
    }
    py.globals.set('_REQ', JSON.stringify(m));
    const out = py.runPython('_dispatch(_REQ)');
    self.postMessage({ id: m.id, ok: true, data: out });
  } catch (err) {
    self.postMessage({ id: m.id, ok: false, error: String((err && err.message) || err) });
  }
};`;

  // Öğrencinin okuyabildiği ama değiştiremediği dosya: oyun motorunun kalbi.
  const SISTEM = `# sistem.py — Kantin Express'in kalbi. Bu dosya salt okunur.
#
# Dikkatli bak: burada hiç Tost, Nakit ya da Bisiklet yazmıyor!
# Motor, hangi ürünle, hangi ödemeyle, hangi kuryeyle çalıştığını BİLMİYOR.
# Sadece metodu çağırıyor; hangi kodun çalışacağına nesnenin sınıfı karar veriyor.
# Bunun adı ÇOK BİÇİMLİLİK (polymorphism).


def siparis_isle(siparis):
    tutar = siparis.toplam()            # her ürün kendi fiyat()'ını bilir
    odendi = siparis.odemeyi_al()       # her ödeme kendi ode()'sini bilir
    if not odendi:
        return {"durum": "REDDEDILDI", "tutar": tutar}
    dakika = siparis.teslim_suresi()    # her kurye kendi sure()'sini bilir
    print(siparis.odeme.fis_satiri(tutar))
    return {"durum": "TESLIM", "tutar": tutar, "dakika": dakika}
`;

  const HARNESS = String.raw`
# Kantin Express — tarayıcıdaki Python motoru (Pyodide içinde çalışır).
import ast, json, io, traceback, contextlib, random, inspect, hashlib, __future__

_MAXOUT = 20000
_ANNO = __future__.annotations.compiler_flag
_G = None
_KAYNAK = {}


class _Cap(io.StringIO):
    def write(self, s):
        if self.tell() > _MAXOUT:
            return len(s)
        return super().write(s)


class _Fail(Exception):
    pass


def _no_input(*a, **k):
    raise RuntimeError('input() bu editörde çalışmaz')


def _errinfo(e, dosya=None):
    d = {'type': type(e).__name__, 'msg': str(e), 'line': None, 'func': None, 'file': dosya}
    if isinstance(e, SyntaxError):
        d['msg'] = e.msg or str(e)
        d['line'] = e.lineno
        d['col'] = e.offset
        d['text'] = (e.text or '').rstrip()
        if e.filename in _KAYNAK:
            d['file'] = e.filename
    else:
        fr = [f for f in traceback.extract_tb(e.__traceback__) if f.filename in _KAYNAK]
        if fr:
            d['line'] = fr[-1].lineno
            d['func'] = fr[-1].name
            d['file'] = fr[-1].filename
    return d


def _yukle(files):
    """Dosyaları sırayla aynı isim uzayında çalıştırır."""
    global _G, _KAYNAK
    g = {'__name__': '__main__', 'input': _no_input}
    out = _Cap()
    errs = []
    derlendi = True
    _KAYNAK = {}
    for ad, src in files.items():
        src = src or ''
        _KAYNAK[ad] = src
        try:
            c = compile(src, ad, 'exec', flags=_ANNO, dont_inherit=True)
        except SyntaxError as e:
            errs.append(_errinfo(e, ad))
            if ad != 'deneme.py':
                derlendi = False
            continue
        try:
            with contextlib.redirect_stdout(out):
                exec(c, g)
        except SystemExit:
            errs.append({'type': 'SystemExit', 'msg': 'exit() çağrıldı', 'line': None, 'file': ad})
        except Exception as e:
            errs.append(_errinfo(e, ad))
    _G = g
    return out.getvalue(), errs, derlendi


# ---------------------------------------------------------------- AST analizi
def _vkind(v):
    if v is None:
        return ''
    if isinstance(v, ast.List) or (isinstance(v, ast.Call) and isinstance(v.func, ast.Name) and v.func.id == 'list'):
        return 'list'
    if isinstance(v, ast.Constant) and v.value is None:
        return 'none'
    if isinstance(v, ast.Call) and isinstance(v.func, ast.Name):
        return 'new:' + v.func.id
    if isinstance(v, ast.Name):
        return 'name:' + v.id
    return 'other'


def _trivial(body):
    for s in body:
        if isinstance(s, ast.Pass):
            continue
        if isinstance(s, ast.Expr) and isinstance(s.value, ast.Constant):
            continue
        return False
    return True


def _tip_kontrolu(dugum):
    """Tür sorgulayan satırı bulur: isinstance, type, hasattr ya da metne göre if."""
    for n in ast.walk(dugum):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in ('isinstance', 'type', 'hasattr'):
            return n.lineno
        if isinstance(n, ast.If) and isinstance(n.test, ast.Compare):
            for c in [n.test.left] + list(n.test.comparators):
                if isinstance(c, ast.Constant) and isinstance(c.value, str):
                    return n.lineno
    return None


def _super_var(dugum):
    for n in ast.walk(dugum):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'super':
            return True
    return False


def _analiz_dosya(src, dosya, res):
    try:
        tree = ast.parse(src)
    except Exception:
        return
    for node in tree.body:
        if not isinstance(node, ast.ClassDef):
            continue
        c = {'file': dosya, 'line': node.lineno, 'end': getattr(node, 'end_lineno', node.lineno),
             'bases': [ast.unparse(b) for b in node.bases], 'methods': {}, 'attrs': {}, 'appends': {},
             'hash': hashlib.md5(ast.dump(node).encode('utf-8')).hexdigest(),
             'tipkontrol': _tip_kontrolu(node)}
        for it in node.body:
            if not isinstance(it, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            args = [a.arg for a in it.args.args]
            decos = [ast.unparse(d) for d in it.decorator_list]
            hasself = bool(args) and args[0] == 'self'
            c['methods'][it.name] = {'line': it.lineno, 'params': args[1:] if hasself else args, 'self': hasself,
                                     'abstract': any(d.split('.')[-1] == 'abstractmethod' for d in decos),
                                     'trivial': _trivial(it.body), 'super': _super_var(it)}
            for sub in ast.walk(it):
                if isinstance(sub, ast.Assign):
                    targets, val = sub.targets, sub.value
                elif isinstance(sub, (ast.AnnAssign, ast.AugAssign)):
                    targets, val = [sub.target], sub.value
                elif isinstance(sub, ast.Call) and isinstance(sub.func, ast.Attribute) and sub.func.attr == 'append':
                    o = sub.func.value
                    if isinstance(o, ast.Attribute) and isinstance(o.value, ast.Name) and o.value.id == 'self' and sub.args and isinstance(sub.args[0], ast.Name):
                        c['appends'][o.attr] = sub.args[0].id
                    continue
                else:
                    continue
                for t in targets:
                    if isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) and t.value.id == 'self':
                        if t.attr not in c['attrs'] or it.name == '__init__':
                            c['attrs'][t.attr] = {'line': t.lineno, 'val': _vkind(val) if not isinstance(sub, ast.AugAssign) else 'aug'}
        res['classes'][node.name] = c


def _analiz(files):
    res = {'classes': {}}
    for ad, src in files.items():
        if ad not in ('sistem.py', 'deneme.py'):
            _analiz_dosya(src or '', ad, res)
    d = {'classes': {}}
    _analiz_dosya(files.get('deneme.py', '') or '', 'deneme.py', d)
    res['deneme_sinif'] = list(d['classes'].keys())
    return res


def _lint(files):
    errs = []
    for ad, src in files.items():
        try:
            ast.parse(src or '')
        except SyntaxError as e:
            e.filename = ad
            errs.append(_errinfo(e, ad))
    return {'errs': errs, 'analysis': _analiz(files)}


# ---------------------------------------------------------------- test yardımcıları
def _need(ad):
    c = _G.get(ad) if _G else None
    if not isinstance(c, type):
        raise _Fail("Kodda '%s' adında bir sınıf bulamadım." % ad)
    return c


def _chk(cond, msg):
    if not cond:
        raise _Fail(msg)


def _mk(cls, *a):
    try:
        return cls(*a)
    except TypeError as e:
        m = str(e)
        if 'abstract' in m:
            raise _Fail("%s hâlâ soyut kalmış: bir soyut metodu yazmamışsın (override)." % cls.__name__)
        if '__init__() takes' in m and 'were given' in m:
            eb = m.split('.__init__')[0]
            if eb != cls.__name__:
                raise _Fail("%s, miras aldığı %s sınıfına fazla değer gönderiyor.Miras aldığın sınıfın metodunu çağırırken self'i sen vermezsin; Python onu kendisi ekler." % (cls.__name__, eb))
        if '__init__() takes' in m or 'takes no arguments' in m or 'missing' in m:
            raise _Fail("%s, %d değerle üretilemiyor. __init__ parametrelerini bilette yazan sırayla yaz. (Python: %s)" % (cls.__name__, len(a), m))
        raise _Fail("%s üretilemedi → %s" % (cls.__name__, m))


def _yakin(a, b):
    try:
        return abs(float(a) - float(b)) < 0.011
    except (TypeError, ValueError):
        return False


def _dugum(sinif):
    for ad in _KAYNAK:
        if ad == 'sistem.py':
            continue
        try:
            for n in ast.parse(_KAYNAK.get(ad, '')).body:
                if isinstance(n, ast.ClassDef) and n.name == sinif:
                    return n
        except Exception:
            pass
    return None


def _metot_dugum(sinif, metot):
    d = _dugum(sinif)
    if d is None:
        return None
    for it in d.body:
        if isinstance(it, ast.FunctionDef) and it.name == metot:
            return it
    return None


def _kendi_yazmis(cls, metot):
    _chk(metot in vars(cls), "%s sınıfı %s() metodunu kendisi yazmalı (override)." % (cls.__name__, metot))


def _super_lazim(sinif, metot, ipucu):
    d = _metot_dugum(sinif, metot)
    _chk(d is not None and _super_var(d), ipucu)


_TESTLER = {}


def _test(ad):
    def deco(f):
        _TESTLER[ad] = f
        return f
    return deco


# ---- ürünler
@_test('urun')
def _t_urun():
    U = _need('Urun')
    u = _mk(U, 'Çay', 15)
    _chk(getattr(u, 'ad', None) == 'Çay', "Urun('Çay', 15) → ad özelliği 'Çay' olmalı.")
    _chk(getattr(u, 'taban_fiyat', None) == 15, "Urun('Çay', 15) → taban_fiyat özelliği 15 olmalı.")
    _chk(_yakin(u.fiyat(), 15), "Urun('Çay', 15).fiyat() 15 döndürmeli, %r döndürdü. (print değil return!)" % (u.fiyat(),))


@_test('tost')
def _t_tost():
    U = _need('Urun'); T = _need('Tost')
    _chk(issubclass(T, U), "Tost, Urun'dan türemeli.")
    _kendi_yazmis(T, 'fiyat')
    a = _mk(T, 'Kaşarlı', 60, True); b = _mk(T, 'Sade', 60, False)
    _chk(getattr(a, 'ad', None) == 'Kaşarlı' and getattr(a, 'taban_fiyat', None) == 60, "Tost oluşurken ad ve taban fiyat, miras aldığı sınıfın __init__ metoduna verilmeli.")
    _chk(_yakin(a.fiyat(), 75), "Ekstra kaşarlı tost: 60 + 15 = 75 bekleniyordu, %r oldu." % (a.fiyat(),))
    _chk(_yakin(b.fiyat(), 60), "Ekstra kaşarsız tost 60 kalmalı, %r oldu." % (b.fiyat(),))
    _super_lazim('Tost', 'fiyat', "Tost'un fiyat metodu taban fiyatı kendisi okumasın; fiyatı miras aldığı sınıfın fiyat metodunu çağırarak öğrensin.")


@_test('icecek')
def _t_icecek():
    U = _need('Urun'); I = _need('Icecek')
    _chk(issubclass(I, U), "Icecek, Urun'dan türemeli.")
    _kendi_yazmis(I, 'fiyat')
    _chk(_yakin(_mk(I, 'Ayran', 20, 'buyuk').fiyat(), 30), "Büyük içecek 1.5 katı olmalı: 20 → 30.")
    _chk(_yakin(_mk(I, 'Ayran', 20, 'kucuk').fiyat(), 20), "Küçük içecek taban fiyatında kalmalı: 20.")
    _chk(getattr(_mk(I, 'Ayran', 20, 'kucuk'), 'boy', None) == 'kucuk', "Icecek'in boy özelliği olmalı.")


@_test('menu')
def _t_menu():
    U = _need('Urun'); T = _need('Tost'); I = _need('Icecek'); M = _need('Menu')
    _chk(issubclass(M, U), "Menu de bir Urun olmalı (Menu, Urun'dan türemeli).")
    _kendi_yazmis(M, 'fiyat')
    m = _mk(M, 'Öğrenci', [_mk(T, 'K', 60, True), _mk(I, 'A', 20, 'buyuk')])
    _chk(getattr(m, 'ad', None) == 'Öğrenci', "Menu'nün adı ve 0 taban fiyatı, miras aldığı sınıfın __init__ metoduna verilmeli.")
    _chk(_yakin(m.fiyat(), 89.25), "(75 + 30) × 0.85 = 89.25 bekleniyordu, %r oldu." % (m.fiyat(),))
    mm = _mk(M, 'Dev', [m, _mk(U, 'Su', 10)])
    _chk(_yakin(mm.fiyat(), (89.25 + 10) * 0.85), "Menü içinde menü de çalışmalı: Menu de bir Urun, kendi fiyat()'ını bilir.")
    d = _dugum('Menu')
    _chk(d is None or _tip_kontrolu(d) is None, "Menu içinde tür kontrolü olmamalı. Her üründen fiyatını iste, gerisini nesne bilir.")


# ---- ödeme
@_test('odeme')
def _t_odeme():
    O = _need('Odeme')
    _chk(inspect.isabstract(O), "Odeme soyut olmalı: ABC'den türesin, soyut metotları @abstractmethod ile işaretlensin.")
    soy = getattr(O, '__abstractmethods__', ())
    _chk('ode' in soy and 'tur' in soy, "ode() ve tur() soyut olmalı; ikisini de @abstractmethod ile işaretle.")
    try:
        O('Ali')
    except TypeError:
        pass
    else:
        raise _Fail("Odeme('Ali') çalıştı! Soyut sınıftan nesne üretilmemeli.")

    class _D(O):
        def ode(self, tutar):
            return True

        def tur(self):
            return 'DENEME'
    d = _mk(_D, 'Ali')
    _chk(getattr(d, 'sahip', None) == 'Ali', "Odeme('Ali') → sahip özelliği olmalı.")
    _chk('fis_satiri' in vars(O), "fis_satiri(tutar) dolu bir metot olarak Odeme'de yazılmalı.")
    f = d.fis_satiri(50)
    _chk(isinstance(f, str) and 'DENEME' in f and '50' in f, "fis_satiri(50) içinde tur metodunun sonucu ve tutar geçen bir metin DÖNDÜRMELİ, %r döndü." % (f,))


@_test('nakit_kart')
def _t_nakit_kart():
    O = _need('Odeme'); N = _need('Nakit'); K = _need('Kart')
    _chk(issubclass(N, O) and issubclass(K, O), "Nakit ve Kart, Odeme'den türemeli.")
    n = _mk(N, 'A')
    _chk(n.ode(9999) is True, "Nakit her zaman ödeyebilir: ode() True döndürmeli.")
    _chk(isinstance(n.tur(), str) and n.tur(), "Nakit.tur() bir metin döndürmeli.")
    k = _mk(K, 'A', 100)
    _chk(k.ode(60) is True, "Limiti 100 olan Kart 60'ı ödeyebilmeli.")
    _chk(k.ode(60) is False, "Kalan limit 40; ikinci 60 reddedilmeli (False).")
    _chk(k.ode(40) is True, "Kalan limit 40; 40 ödenebilmeli. Reddedilen ödeme limitten düşmemeli.")
    _chk(isinstance(k.tur(), str) and k.tur() != n.tur(), "Kart.tur() Nakit'ten farklı bir metin döndürmeli.")


@_test('yemek')
def _t_yemek():
    O = _need('Odeme'); Y = _need('YemekKarti')
    _chk(issubclass(Y, O), "YemekKarti, Odeme'den türemeli.")
    y = _mk(Y, 'A', 100)
    _chk(hasattr(y, '_YemekKarti__bakiye'), "bakiye private olmalı (çift alt çizgi).")
    _chk(not hasattr(y, 'bakiye'), "bakiye'nin public bir kopyası olmamalı.")
    _chk(y.bakiye_getir() == 100, "bakiye_getir() kalan bakiyeyi döndürmeli.")
    _chk(y.ode(70) is True and y.bakiye_getir() == 30, "100 bakiyeden 70 ödenince 30 kalmalı.")
    _chk(y.ode(50) is False and y.bakiye_getir() == 30, "30 bakiyeyle 50 ödenemez: False dönmeli, bakiye değişmemeli.")
    _chk(isinstance(y.tur(), str) and y.tur(), "YemekKarti.tur() bir metin döndürmeli.")


# ---- kurye
@_test('kurye')
def _t_kurye():
    K = _need('Kurye'); B = _need('Bisiklet'); M = _need('Motor')
    _chk(inspect.isabstract(K) and 'sure' in K.__abstractmethods__, "Kurye soyut olmalı, sure() soyut metot olmalı.")
    _chk(issubclass(B, K) and issubclass(M, K), "Bisiklet ve Motor, Kurye'den türemeli.")
    b = _mk(B, 'Mert'); m = _mk(M, 'Ece')
    _chk(getattr(b, 'ad', None) == 'Mert', "Kurye('Mert') → ad özelliği olmalı.")
    _chk(_yakin(b.sure(3), 12), "Bisiklet km başına 4 dakika: 3 km → 12 dk, %r oldu." % (b.sure(3),))
    _chk(_yakin(m.sure(3), 9), "Motor km başına 2 dakika + 3 dakika park: 3 km → 9 dk, %r oldu." % (m.sure(3),))


# ---- sipariş
class _SahteOdeme:
    def __init__(self, sonuc):
        self.sonuc = sonuc
        self.gelen = None

    def ode(self, tutar):
        self.gelen = tutar
        return self.sonuc

    def tur(self):
        return 'SAHTE'

    def fis_satiri(self, tutar):
        return 'SAHTE %s' % tutar


class _SahteKurye:
    ad = 'Sahte'

    def sure(self, mesafe):
        return mesafe * 100


class _SahteUrun:
    ad = 'Sahte'

    def fiyat(self):
        return 7


@_test('siparis')
def _t_siparis():
    S = _need('Siparis')
    so = _SahteOdeme(True)
    s = _mk(S, 'Ayşe', so, _SahteKurye(), 2)
    _chk(getattr(s, 'musteri', None) == 'Ayşe' and getattr(s, 'odeme', None) is so, "Siparis(musteri, odeme, kurye, mesafe) → dört özellik de saklanmalı.")
    _chk(getattr(s, 'urunler', None) == [], "Yeni siparişin urunler listesi boş başlamalı.")
    s.ekle(_SahteUrun()); s.ekle(_SahteUrun())
    _chk(len(s.urunler) == 2, "ekle(urun) ürünü urunler listesine koymalı.")
    _chk(_yakin(s.toplam(), 14), "toplam(), her ürünün fiyat() sonucunu toplamalı: 7 + 7 = 14, %r oldu." % (s.toplam(),))
    _chk(s.odemeyi_al() is True and _yakin(so.gelen, 14), "odemeyi_al(), ödeme nesnesine toplam tutarı ödetip aldığı cevabı DÖNDÜRMELİ.")
    _chk(_mk(S, 'B', _SahteOdeme(False), _SahteKurye(), 2).odemeyi_al() is False, "Ödeme reddedilirse odemeyi_al() False döndürmeli.")
    _chk(_yakin(s.teslim_suresi(), 200), "teslim_suresi(), kuryeye mesafeyi verip aldığı süreyi döndürmeli.")
    d = _dugum('Siparis')
    if d is not None:
        sat = _tip_kontrolu(d)
        _chk(sat is None, "Cem Abi %d. satırı reddetti: Siparis türe bakmamalı (isinstance, type ya da metinle if yok)." % (sat or 0))


@_test('ogrenci')
def _t_ogrenci():
    K = _need('Kart'); G = _need('OgrenciKarti')
    _chk(issubclass(G, K), "OgrenciKarti, Kart'tan türemeli: o da bir kart.")
    _kendi_yazmis(G, 'ode')
    _kendi_yazmis(G, 'tur')
    g = _mk(G, 'A', 80)
    _chk(g.ode(100) is True, "%20 indirimle 100 TL, 80 TL eder; limiti 80 olan kart bunu ödeyebilmeli.")
    _chk(g.ode(10) is False, "Limit bitti; ikinci ödeme reddedilmeli.")
    _chk(g.tur() != _mk(K, 'A', 80).tur(), "OgrenciKarti.tur() Kart'tan farklı bir metin döndürmeli.")
    _super_lazim('OgrenciKarti', 'ode', "OgrenciKarti'nın ode metodu limit hesabını yeniden yazmasın; indirimli tutarı miras aldığı sınıfın ode metoduna versin.")


@_test('stajyer')
def _t_stajyer():
    K = _need('Kurye'); T = _need('Stajyer')
    _chk(issubclass(T, K), "Stajyer, Kurye'den türemeli.")
    t = _mk(T, 'Sen')
    _chk(_yakin(t.sure(2), 24), "Stajyer yaya: km başına 12 dakika. 2 km → 24 dk, %r oldu." % (t.sure(2),))
    _chk('bahane' in vars(T), "Stajyer'in kendine özgü bahane() metodu olmalı.")
    b = t.bahane()
    _chk(isinstance(b, str) and b.strip(), "bahane() bir metin döndürmeli (print değil return).")


@_test('drone')
def _t_drone():
    D = _need('Drone')
    if isinstance(_G.get('Kurye'), type):
        _chk(not issubclass(D, _G['Kurye']), "Drone bu sefer Kurye'den TÜREMEMELİ. Ördek gibi yürüyorsa ördektir!")
    d = _mk(D, 'Uçan-1')
    _chk(getattr(d, 'ad', None) == 'Uçan-1', "Drone('Uçan-1') → ad özelliği olmalı.")
    _chk(_yakin(d.sure(5), 6), "Drone km başına 1 dakika + 1 dakika kalkış: 5 km → 6 dk, %r oldu." % (d.sure(5),))


# ---- olaylar
@_test('olay1')
def _t_olay1():
    K = _need('KampanyaTost')
    k = _mk(K, 'Kampanya', 60)
    _chk(_yakin(k.fiyat(), 50), "KampanyaTost('Kampanya', 60).fiyat() 50 olmalı (60 − 10), %r döndü." % (k.fiyat(),))
    _chk(getattr(k, 'ad', None) == 'Kampanya', "Ürünün adı da kaybolmamalı.")


@_test('olay2')
def _t_olay2():
    B = _need('BedavaCay')
    _chk(_yakin(_mk(B, 'Çay', 20, 'kucuk').fiyat(), 0), "BedavaCay'ın fiyat()'ı 0 olmalı. Metot adı ebeveyndekiyle birebir aynı mı?")


@_test('olay3')
def _t_olay3():
    K = _need('KahvaltiMenu'); M = _need('Menu'); U = _need('Urun')
    a = _mk(K, 'Kahvaltı', [_mk(U, 'Su', 100)])
    b = _mk(M, 'Normal', [_mk(U, 'Su', 100)])
    v = a.fiyat()
    _chk(v is not None, "KahvaltiMenu.fiyat() None döndürüyor: return unutulmuş.")
    _chk(_yakin(v, b.fiyat() - 10), "Kahvaltı menüsü normal menüden 10 TL ucuz olmalı: %r bekleniyordu, %r oldu." % (b.fiyat() - 10, v))


# ---- özel metotlar
@_test('str_urun')
def _t_str_urun():
    U = _need('Urun'); T = _need('Tost')
    _chk('__str__' in vars(U), "__str__ Urun sınıfında yazılmalı; alt sınıflar miras alır.")
    s = str(_mk(T, 'Kaşarlı', 60, True))
    _chk(isinstance(s, str) and 'Kaşarlı' in s and '75' in s, "str(Tost) içinde ad ve GÜNCEL fiyat olmalı (75). Fiyatı nesnenin fiyat metodundan öğren. Şu an: %r" % (s,))


@_test('siparis_dunder')
def _t_siparis_dunder():
    S = _need('Siparis')
    s = _mk(S, 'Ayşe', _SahteOdeme(True), _SahteKurye(), 2)
    s.ekle(_SahteUrun()); s.ekle(_SahteUrun()); s.ekle(_SahteUrun())
    try:
        n = len(s)
    except TypeError:
        raise _Fail("len(siparis) çalışmıyor: __len__ yaz.")
    _chk(n == 3, "len(siparis) ürün sayısını vermeli: 3, %r oldu." % (n,))
    _chk('__str__' in vars(S), "Siparis'e __str__ yaz.")
    m = str(s)
    _chk('Ayşe' in m and '21' in m, "str(siparis) içinde müşteri adı ve toplam (21) olmalı. Şu an: %r" % (m,))


@_test('lt')
def _t_lt():
    U = _need('Urun')
    a = _mk(U, 'Pahalı', 90); b = _mk(U, 'Ucuz', 10)
    try:
        s = sorted([a, b])
    except TypeError:
        raise _Fail("sorted(urunler) çalışmıyor: Urun'a __lt__ yaz.")
    _chk(s[0] is b, "sorted() en ucuzu başa almalı: __lt__ fiyatlara göre karşılaştırmalı.")
    T = _need('Tost')
    _chk(_mk(U, 'x', 70) < _mk(T, 'y', 60, True), "Karşılaştırma fiyat metoduyla yapılmalı: 70 < 75 (ekstra kaşarlı tost). Taban fiyatı değil, fiyat metodunun sonucunu karşılaştır.")


def _testler():
    res = {}
    for k, f in _TESTLER.items():
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                f()
            res[k] = [True, '']
        except _Fail as e:
            res[k] = [False, str(e)]
        except RecursionError:
            res[k] = [False, 'Sonsuz özyineleme: bir metot kendini çağırıp duruyor. (Miras aldığın sınıfın metodunu mu çağıracaktın?)']
        except Exception as e:
            i = _errinfo(e)
            res[k] = [False, 'Çalışırken hata → %s: %s' % (type(e).__name__, e) + (' (%s, %s. satır)' % (i.get('file'), i.get('line')) if i.get('line') else '')]
    return res


# ---------------------------------------------------------------- bir iş günü
_MUSTERI = ['Ayşe', 'Mert', 'Elif', 'Can', 'Zeynep', 'Emre', 'Deniz', 'Ece', 'Kerem', 'Su', 'Bora', 'Defne', 'Yağız', 'Selin', 'Arda', 'Nehir']
_BINA = [('Mühendislik', 2), ('Kütüphane', 1), ('Yurt', 3), ('Spor Salonu', 4), ('Rektörlük', 2), ('Otopark', 5)]


def _urun_tanimlari():
    T = _G.get('Tost'); I = _G.get('Icecek'); M = _G.get('Menu')
    tan = [('Tost', lambda: T('Kaşarlı Tost', 60, True)), ('Tost', lambda: T('Sade Tost', 45, False)),
           ('Icecek', lambda: I('Çay', 15, 'kucuk')), ('Icecek', lambda: I('Ayran', 20, 'buyuk')),
           ('Menu', lambda: M('Öğrenci Menüsü', [T('Tost', 45, False), I('Ayran', 20, 'kucuk')])),
           ('KampanyaTost', lambda: _G['KampanyaTost']('Kampanyalı Tost', 60)),
           ('BedavaCay', lambda: _G['BedavaCay']('Bedava Çay', 20, 'kucuk')),
           ('KahvaltiMenu', lambda: _G['KahvaltiMenu']('Kahvaltı Menüsü', [T('Tost', 45, False), I('Çay', 15, 'kucuk')]))]
    return [(c, f) for c, f in tan if isinstance(_G.get(c), type)]


def _katalog():
    if not isinstance(_G.get('Urun'), type):
        return []
    liste = []
    for cls, f in _urun_tanimlari():
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                o = f()
                r = {'ad': str(getattr(o, 'ad', cls)), 'cls': cls, 'fiyat': round(float(o.fiyat()), 2), 'o': o}
                if '__str__' in vars(_G['Urun']):
                    r['yazi'] = str(o)
        except Exception as e:
            r = {'ad': cls, 'cls': cls, 'fiyat': None, 'err': _errinfo(e)}
        liste.append(r)
    try:
        if '__lt__' in vars(_G['Urun']):
            iyi = sorted([r for r in liste if 'o' in r], key=lambda r: r['fiyat'])
            liste = iyi + [r for r in liste if 'o' not in r]
    except Exception:
        pass
    return [{k: v for k, v in r.items() if k != 'o'} for r in liste]


def _gun(n, seed):
    gerek = ['Urun', 'Siparis', 'Odeme', 'Kurye']
    if any(not isinstance(_G.get(c), type) for c in gerek) or not callable(_G.get('siparis_isle')):
        return None
    rnd = random.Random(seed)
    urunler = _urun_tanimlari()
    if not urunler:
        return None
    odemeler = [(c, a) for c, a in [('Nakit', lambda m: (m,)), ('Kart', lambda m: (m, rnd.randint(150, 900))),
                                    ('YemekKarti', lambda m: (m, rnd.randint(40, 300))), ('OgrenciKarti', lambda m: (m, rnd.randint(100, 500)))]
                if isinstance(_G.get(c), type)]
    kuryeler = [(c, a) for c, a in [('Bisiklet', 'Mert'), ('Motor', 'Ece'), ('Stajyer', 'Sen'), ('Drone', 'Uçan-1')]
                if isinstance(_G.get(c), type)]
    if not odemeler or not kuryeler:
        return None
    S = _G.get('Siparis')
    olaylar = []
    for i in range(n):
        m = rnd.choice(_MUSTERI)
        bina, km = rnd.choice(_BINA)
        ev = {'m': m, 'bina': bina, 'km': km, 'urunler': [], 'tutar': None, 'durum': 'HATA'}
        buf = _Cap()
        try:
            with contextlib.redirect_stdout(buf):
                oc, oa = rnd.choice(odemeler)
                kc, ka = rnd.choice(kuryeler)
                ev['kurye'] = kc
                odeme = _G[oc](*oa(m))
                kurye = _G[kc](ka)
                s = S(m, odeme, kurye, km)
                bedava = False
                for _ in range(rnd.randint(1, 3)):
                    uc, uf = rnd.choice(urunler)
                    u = uf()
                    s.ekle(u)
                    ev['urunler'].append(str(getattr(u, 'ad', uc)))
                    if uc == 'BedavaCay' and u.fiyat() != 0:
                        bedava = True
                sonuc = _G['siparis_isle'](s)
                ev['tutar'] = round(float(sonuc['tutar']), 2)
                ev['durum'] = sonuc['durum']
                ev['odeme'] = str(odeme.tur())
                if sonuc['durum'] == 'TESLIM':
                    ev['dk'] = float(sonuc['dakika'])
                ev['bedava'] = bedava
        except RecursionError:
            ev['err'] = {'type': 'RecursionError', 'msg': 'maximum recursion depth exceeded', 'line': None, 'file': None}
        except Exception as e:
            ev['err'] = _errinfo(e)
        fis = buf.getvalue().strip().splitlines()
        if fis:
            ev['fis'] = fis[-1][:80]
        olaylar.append(ev)
    return olaylar


# ---------------------------------------------------------------- dağıtıcı
def _eval(files, expr):
    if _G is None or _KAYNAK != files:
        _yukle(files)
    out = _Cap()
    val = None
    err = None
    try:
        try:
            c = compile(expr, '<konsol>', 'eval', flags=_ANNO, dont_inherit=True)
            kip = 'eval'
        except SyntaxError:
            c = compile(expr, '<konsol>', 'exec', flags=_ANNO, dont_inherit=True)
            kip = 'exec'
        with contextlib.redirect_stdout(out):
            r = eval(c, _G) if kip == 'eval' else exec(c, _G)
        if kip == 'eval' and r is not None:
            val = repr(r)
    except Exception as e:
        err = _errinfo(e)
    return {'out': out.getvalue(), 'val': val, 'err': err}


def _dispatch(req):
    r = json.loads(req)
    cmd = r.get('cmd')
    files = r.get('files') or {}
    try:
        if cmd == 'lint':
            return json.dumps(_lint(files))
        if cmd == 'eval':
            return json.dumps(_eval(files, r['expr']), default=str)
        if cmd == 'deploy':
            out, errs, derlendi = _yukle(files)
            res = {'out': out, 'errs': errs, 'derlendi': derlendi, 'analysis': _analiz(files), 'tests': {}, 'katalog': [], 'gun': None}
            if derlendi:
                res['tests'] = _testler()
                res['katalog'] = _katalog()
                res['gun'] = _gun(int(r.get('n', 8)), int(r.get('seed', 1)))
            return json.dumps(res, default=str)
        return json.dumps({'fail': 'bilinmeyen komut'})
    except RecursionError:
        return json.dumps({'fail': 'Sonsuz özyineleme: bir metot kendini çağırıp duruyor.'})
    except Exception as e:
        return json.dumps({'fail': 'Beklenmeyen hata → %s: %s' % (type(e).__name__, e), 'err': _errinfo(e)}, default=str)
`;

  let worker = null, ready = null, seq = 0, status = 'idle';
  const pending = new Map(), subs = [];

  function setStatus(s) { status = s; subs.forEach(f => { try { f(s); } catch (_) { /* yok */ } }); }
  function onStatus(f) { subs.push(f); f(status); }

  function kill(reason) {
    if (worker) worker.terminate();
    worker = null; ready = null;
    pending.forEach(p => { clearTimeout(p.t); p.reject(reason || { fatal: 'Python durduruldu.' }); });
    pending.clear();
  }

  function post(msg, ms) {
    return new Promise((resolve, reject) => {
      const id = ++seq;
      const t = setTimeout(() => {
        pending.delete(id);
        kill({ timeout: true });
        setStatus('idle');
        reject({ timeout: true });
      }, ms);
      pending.set(id, { resolve, reject, t });
      worker.postMessage(Object.assign({ id }, msg));
    });
  }

  function boot() {
    if (ready) return ready;
    setStatus('loading');
    try {
      worker = new Worker(URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' })));
    } catch (e) {
      setStatus('error');
      return Promise.reject({ fatal: 'Tarayıcı Python motorunu başlatamadı (Web Worker yok).' });
    }
    worker.onmessage = e => {
      const m = e.data, p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id); clearTimeout(p.t);
      if (!m.ok) p.reject({ fatal: m.error });
      else p.resolve(m.data ? JSON.parse(m.data) : true);
    };
    worker.onerror = () => { kill({ fatal: 'Python motoru yüklenemedi. İnternet bağlantını kontrol et.' }); setStatus('error'); };
    ready = post({ cmd: 'init', base: BASE, harness: HARNESS }, 120000)
      .then(() => { setStatus('ready'); })
      .catch(e => { kill(); setStatus('error'); throw e.timeout ? { fatal: 'Python motoru çok yavaş yüklendi. Sayfayı yenileyip tekrar dene.' } : e; });
    return ready;
  }

  async function req(cmd, data, ms) {
    await boot();
    setStatus('busy');
    try { return await post(Object.assign({ cmd }, data), ms || RUN_MS); }
    finally { if (worker) setStatus('ready'); }
  }

  /* ---------------- Türkçe hata açıklamaları ----------------
     Çok biçimliliğe özgü hatalar burada; geri kalanı 5. haftanın açıklayıcısına bırakılır. */
  function explain(err, ctx) {
    const t = err.type || '', m = err.msg || '';
    const R = (title, tip) => ({ title, tip });
    if (t === 'TypeError' && /unsupported operand type\(s\) for .*'NoneType'/.test(m)) {
      return R('Bir metot sonuç döndürmemiş (None)', 'Toplamaya çalışılan değerlerden biri None. Büyük ihtimalle bir fiyat() metodunda return unutulmuş: print ekrana yazar, return sonucu geri verir.');
    }
    if (t === 'TypeError' && /'NoneType' object is not (iterable|subscriptable)/.test(m)) {
      return R('Liste bekleniyordu, None geldi', 'Bir özellik ya da metot sonucu None. __init__ içinde listeyi başlattın mı?');
    }
    if (t === 'AttributeError') {
      const x = /'(\w+)' object has no attribute '(ad|taban_fiyat|sahip|ekstra_kasar|boy)'/.exec(m);
      if (x) return R(`${x[1]} nesnesinde '${x[2]}' yok`, `${x[1]} kendi __init__'ini yazmış ama miras aldığı sınıfın __init__ metodunu çağırmamış olabilir. Alt sınıf __init__ yazınca üst sınıfınki kendiliğinden çalışmaz.`);
    }
    if (t === 'RecursionError') {
      return R('Metot kendini çağırıp duruyor', 'Override ettiğin metodun içinden aynı nesnenin aynı metodunu çağırırsan yine kendine dönersin. Miras aldığın sınıfın metodunu çağırman gerekiyor.');
    }
    if (t === 'TypeError' && /__init__\(\) takes \d+ positional arguments? but \d+ were given/.test(m)) {
      return R('__init__ fazla değer aldı', 'Miras aldığın sınıfın metodunu çağırırken self\'i sen vermezsin; Python onu kendisi ekler. Değilse nesneyi üretirken verdiğin değerlerin sayısı __init__ parametreleriyle tutmuyor.');
    }
    if (t === 'TypeError' && /super\(\) takes|super\(\): no arguments/.test(m)) {
      return R('super() yanlış yerde', 'super() yalnızca bir sınıfın metodunun içinde çalışır.');
    }
    if (window.H5Py && window.H5Py.explain) return window.H5Py.explain(err, ctx || {});
    return R(t || 'Hata', 'Hata mesajını oku; satır numarası nereye bakacağını söyler.');
  }

  return {
    SISTEM, boot, onStatus, status: () => status, explain,
    lint: files => req('lint', { files }, 5000),
    deploy: (files, n, seed) => req('deploy', { files, n, seed }),
    evaluate: (files, expr) => req('eval', { files, expr })
  };
})();
