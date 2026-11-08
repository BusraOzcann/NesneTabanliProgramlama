/* =========================================================================
   8. HAFTA — Python çalışma ortamı (Kronos Ajansı)
   Öğrenci kodu tarayıcıda gerçek Python 3 ile (Pyodide, Web Worker içinde)
   çalışır. Her çalıştırmada nesnelerin anlık görüntüsü (3D sahne için) ve
   görev testlerinin sonuçları döner. Değişiklik taleplerinde, talepler
   açıldığı andaki sınıf kaynakları (base) gönderilir: eski sınıflar
   değişmiş mi diye bakılır. Sonsuz döngüler zaman aşımıyla durur.
   ========================================================================= */
window.H8Py = (function () {
  'use strict';

  const BASE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  const RUN_MS = 6000;

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

  const HARNESS = String.raw`# Kronos Ajansı — tarayıcıdaki Python motoru (Pyodide içinde çalışır).
# Öğrenci kodunu çalıştırır, sınıflarını AST ile analiz eder, nesnelerin
# anlık görüntüsünü (3D sahne için) çıkarır ve görev testlerini koşar.
import ast, json, io, traceback, contextlib, enum, re, inspect, abc

_SRC = '<kodun>'
_MAXOUT = 20000
_G = None
_LAST = {'code': None}


class _Cap(io.StringIO):
    def write(self, s):
        if self.tell() > _MAXOUT:
            return len(s)
        return super().write(s)


class _Fail(Exception):
    pass


def _no_input(*a, **k):
    raise RuntimeError('input() bu editörde çalışmaz')


def _errinfo(e):
    d = {'type': type(e).__name__, 'msg': str(e), 'line': None, 'func': None}
    if isinstance(e, SyntaxError):
        d['msg'] = e.msg or str(e)
        d['line'] = e.lineno
        d['col'] = e.offset
        d['text'] = (e.text or '').rstrip()
    else:
        fr = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == _SRC]
        if fr:
            d['line'] = fr[-1].lineno
            d['func'] = fr[-1].name
    return d


def _exec(code):
    global _G
    g = {'__name__': '__main__', 'input': _no_input}
    out = _Cap()
    err = None
    try:
        c = compile(code, _SRC, 'exec')
    except SyntaxError as e:
        _G = g
        _LAST['code'] = code
        return '', _errinfo(e), False
    try:
        with contextlib.redirect_stdout(out):
            exec(c, g)
    except SystemExit:
        err = {'type': 'SystemExit', 'msg': 'exit() çağrıldı', 'line': None}
    except Exception as e:
        err = _errinfo(e)
    _G = g
    _LAST['code'] = code
    return out.getvalue(), err, True


# ---------------------------------------------------------------- AST analizi
def _analyze(src):
    try:
        tree = ast.parse(src)
    except Exception:
        return None
    res = {'classes': {}}
    for node in tree.body:
        if not isinstance(node, ast.ClassDef):
            continue
        bases = [ast.unparse(b) for b in node.bases]
        is_enum = any(b.split('.')[-1] in ('Enum', 'IntEnum', 'StrEnum') for b in bases)
        c = {'line': node.lineno, 'end': getattr(node, 'end_lineno', node.lineno), 'bases': bases, 'enum': is_enum,
             'methods': {}, 'attrs': {}, 'lits': [], 'src': ast.unparse(node), 'calls': []}
        for it in node.body:
            if isinstance(it, (ast.FunctionDef, ast.AsyncFunctionDef)):
                args = [a.arg for a in it.args.args]
                hasself = bool(args) and args[0] == 'self'
                decos = [ast.unparse(d) for d in it.decorator_list]
                c['methods'][it.name] = {'line': it.lineno, 'params': args[1:] if hasself else args, 'self': hasself,
                                         'abstract': any(d.split('.')[-1] == 'abstractmethod' for d in decos)}
                for sub in ast.walk(it):
                    if it.name == '__init__' and isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name):
                        c['calls'].append(sub.func.id)
                    if isinstance(sub, ast.Assign):
                        targets = sub.targets
                    elif isinstance(sub, (ast.AnnAssign, ast.AugAssign)):
                        targets = [sub.target]
                    else:
                        continue
                    for t in targets:
                        for tt in (t.elts if isinstance(t, (ast.Tuple, ast.List)) else [t]):
                            if isinstance(tt, ast.Attribute) and isinstance(tt.value, ast.Name) and tt.value.id == 'self':
                                if tt.attr not in c['attrs']:
                                    c['attrs'][tt.attr] = {'line': tt.lineno, 'in': it.name}
            elif isinstance(it, (ast.Assign, ast.AnnAssign)):
                targets = it.targets if isinstance(it, ast.Assign) else [it.target]
                for t in targets:
                    if isinstance(t, ast.Name):
                        if is_enum:
                            c['lits'].append(t.id)
                        elif t.id not in c['attrs']:
                            c['attrs'][t.id] = {'line': t.lineno, 'in': '<sınıf>'}
        res['classes'][node.name] = c
    return res


def _lint(code):
    try:
        ast.parse(code)
    except SyntaxError as e:
        return {'ok': False, 'err': _errinfo(e)}
    return {'ok': True, 'analysis': _analyze(code)}


# ---------------------------------------------------------------- yardımcılar
def _isuser(t):
    return isinstance(t, type) and getattr(t, '__module__', '') == '__main__'


def _isobj(v):
    return _isuser(type(v)) and not isinstance(v, (type, enum.Enum))


def _plain(v):
    if v is None or isinstance(v, (bool, int, float)):
        return v
    if isinstance(v, str):
        return v[:80]
    return repr(v)[:80]


def _mro(t):
    return [k.__name__ for k in t.__mro__ if _isuser(k)]


def _isa(o, name):
    return any(k.__name__ == name for k in type(o).__mro__)


def _call(o, meth, *a):
    f = getattr(o, meth, None)
    if not callable(f):
        if meth in getattr(o, '__dict__', {}):
            return None, ("self.%s = ... satırı %s() metodunu EZDİ. Python'da alan ve metot aynı adı paylaşamaz (Java'dan farklı!). "
                          "Alana başka ad ver (self._%s) ya da metotta doğrudan sabiti döndür" % (meth, meth, meth))
        return None, None
    buf = _Cap()
    try:
        with contextlib.redirect_stdout(buf):
            return f(*a), None
    except Exception as e:
        return None, '%s: %s' % (type(e).__name__, e)


def _walk_objs():
    found, seen = [], set()

    def walk(v, d):
        if d > 4:
            return
        if isinstance(v, (list, tuple)):
            for x in v:
                walk(x, d + 1)
            return
        if _isobj(v) and id(v) not in seen:
            seen.add(id(v))
            found.append(v)
            try:
                d2 = vars(v)
            except TypeError:
                return
            for x in list(d2.values()):
                walk(x, d + 1)

    for k, v in list((_G or {}).items()):
        if not k.startswith('_'):
            walk(v, 0)
    return found


def _objs_of(name):
    return [o for o in _walk_objs() if _isa(o, name)]


# ---------------------------------------------------------------- 3D için anlık görüntü
def _snap():
    g = _G or {}
    enums = []
    for k, v in list(g.items()):
        if _isuser(v) and issubclass(v, enum.Enum):
            enums.append({'name': v.__name__, 'members': [{'n': n, 'v': _plain(m.value), 'alias': m.name != n} for n, m in v.__members__.items()]})
    classes = {}
    for k, v in list(g.items()):
        if _isuser(v) and not issubclass(v, enum.Enum):
            classes[v.__name__] = {'mro': _mro(v), 'abstract': bool(inspect.isabstract(v))}
    objs, ids, order = {}, {}, []

    def val(v, d=0):
        if isinstance(v, enum.Enum):
            return {'k': 'e', 'c': type(v).__name__, 'n': v.name, 'v': _plain(v.value)}
        if v is None or isinstance(v, (bool, int, float, str)):
            return {'k': 'p', 't': type(v).__name__, 'v': _plain(v)}
        if isinstance(v, (list, tuple)) and d < 3:
            return {'k': 'l', 'i': [val(x, d + 1) for x in list(v)[:60]]}
        if _isobj(v):
            r = ref(v)
            return {'k': 'o', 'r': r, 'c': type(v).__name__} if r else {'k': 'x', 'r': '…'}
        return {'k': 'x', 'r': repr(v)[:60]}

    def ref(o):
        k = id(o)
        if k in ids:
            return ids[k]
        if len(order) >= 300:
            return None
        rid = 'o%d' % (len(order) + 1)
        ids[k] = rid
        order.append(o)
        ent = {'cls': type(o).__name__, 'mro': _mro(type(o)), 'attrs': {}, 'calc': {}}
        objs[rid] = ent
        try:
            d = dict(vars(o))
        except TypeError:
            d = {}
        for a, v in d.items():
            ent['attrs'][a] = val(v)
        for m in ('gok', 'zemin', 'hava', 'yil_metni', 'get_yil', 'aciklama', 'hareket_et', 'isik', 'ses', 'get_paradoks'):
            if callable(getattr(o, m, None)) and not inspect.isabstract(type(o)):
                r, e = _call(o, m)
                ent['calc'][m] = {'err': e} if e else val(r)
        if callable(getattr(o, 'yolculuk_suresi', None)):
            r, e = _call(o, 'yolculuk_suresi', 1000)
            ent['calc']['yolculuk_suresi'] = {'err': e} if e else val(r)
        if callable(getattr(o, 'zaman_cizelgesi', None)):
            r, e = _call(o, 'zaman_cizelgesi')
            ent['calc']['zaman_cizelgesi'] = {'err': e} if e else val(r)
        return rid

    names = []
    for k, v in list(g.items()):
        if k.startswith('_'):
            continue
        if _isobj(v):
            names.append([k, ref(v)])
        elif isinstance(v, (list, tuple)) and any(_isobj(x) for x in v):
            names.append([k, val(v)])
    for o in _walk_objs():
        ref(o)
    return {'enums': enums, 'classes': classes, 'objs': objs, 'vars': names}


# ---------------------------------------------------------------- görev testleri
_HEX = re.compile(r'#[0-9A-Fa-f]{6}')
_UP = re.compile(r'[A-Z][A-Z0-9_]*')


def _need(name):
    c = _G.get(name) if _G else None
    if not isinstance(c, type):
        raise _Fail("Kodda '%s' adında bir sınıf bulamadım." % name)
    return c


def _chk(cond, msg):
    if not cond:
        raise _Fail(msg)


def _enum(name, required=None, minn=0):
    E = _need(name)
    _chk(issubclass(E, enum.Enum), "%s bir Enum olmalı: class %s(Enum):  (en üstte: from enum import Enum, auto)" % (name, name))
    vir = [m.name for m in E if isinstance(m.value, tuple)]
    _chk(not vir, "%s içinde satır sonunda virgül var: %s. Python'da virgül değeri tuple yapar; virgülleri sil." % (name, ', '.join(vir)))
    al = [n for n, m in E.__members__.items() if m.name != n]
    if al:
        raise _Fail("%s.%s, %s.%s ile aynı değerde. Enum aynı değeri ikinci kez görünce yeni sabit yapmaz, takma ad (alias) yapar. "
                    "Her sabite farklı bir değer ver (ya da auto() kullan)." % (name, al[0], name, E[al[0]].name))
    for m in E:
        _chk(_UP.fullmatch(m.name), "%s.%s: enum sabitleri BÜYÜK HARFLE ve Türkçe karakter olmadan yazılır." % (name, m.name))
    names = [m.name for m in E]
    if required:
        miss = [r for r in required if r not in names]
        _chk(not miss, "%s içinde şu sabit(ler) eksik: %s" % (name, ', '.join(miss)))
    _chk(len(names) >= minn, "%s içinde %d sabit var; en az %d olmalı." % (name, len(names), minn))
    return E


def _abstract(name, meths):
    C = _need(name)
    _chk(inspect.isabstract(C), "%s soyut olmalı: class %s(ABC): ve soyut metotların üstünde @abstractmethod." % (name, name))
    miss = [m for m in meths if m not in getattr(C, '__abstractmethods__', ())]
    _chk(not miss, "%s içinde şu metot(lar) soyut olmalı (@abstractmethod): %s" % (name, ', '.join(miss)))
    return C


def _concrete_subs(base):
    return [v for v in list(_G.values()) if _isuser(v) and v is not base and issubclass(v, base) and not inspect.isabstract(v)]


def _test_era():
    C = _need('Cag')
    G, Z, H = _need('Gokyuzu'), _need('Zemin'), _need('Hava')

    class _DenemeCag(C):
        def gok(self):
            return list(G)[0]

        def zemin(self):
            return list(Z)[0]

        def hava(self):
            return list(H)[0]
    return _DenemeCag


def _t_enumlar():
    M = _enum('Malzeme', minn=6)
    for m in M:
        _chk(isinstance(m.value, str) and _HEX.fullmatch(m.value),
             'Malzeme.%s değeri %r bir renk kodu değil. Biçim: "#RRGGBB", ör. ALTIN = "#E8B830"' % (m.name, m.value))
    _enum('Gokyuzu', minn=3)
    _enum('Zemin', minn=3)
    _enum('Hava', minn=3)


def _t_cag():
    _abstract('Cag', ['gok', 'zemin', 'hava'])
    T = _test_era()
    try:
        o = T('Deneme', -2560)
    except TypeError as ex:
        raise _Fail('Cag(ad, yil) ile alt sınıf nesnesi üretilemedi → %s' % ex)
    _chk(getattr(o, 'ad', None) == 'Deneme', "Cag.__init__ içinde self.ad = ad yazılmalı.")
    _chk('_Cag__yil' in vars(o), "yil private olmalı: __init__ içinde self.__yil = yil yaz (iki alt çizgi).")
    _chk(not hasattr(o, 'yil'), "Nesnede public bir 'yil' özelliği de var; yıl yalnızca self.__yil olarak saklanmalı.")
    r, e = _call(o, 'get_yil')
    _chk(e is None and r == -2560, "get_yil() private yılı döndürmeli (şu an: %s)." % (e or repr(r)))
    r, e = _call(o, 'yil_metni')
    _chk(e is None and r == 'MÖ 2560', "yil_metni(): yıl -2560 ise 'MÖ 2560' döndürmeli (şu an: %s)." % (e or repr(r)))
    r, e = _call(T('Deneme', 1453), 'yil_metni')
    _chk(e is None and r == 'MS 1453', "yil_metni(): yıl 1453 ise 'MS 1453' döndürmeli (şu an: %s)." % (e or repr(r)))


def _t_ilk_cag():
    C = _need('Cag')
    G, Z, H = _need('Gokyuzu'), _need('Zemin'), _need('Hava')
    eras = [o for o in _objs_of('Cag') if not type(o).__name__.startswith('_')]
    _chk(eras, "Cag'dan türeyen somut bir sınıf yaz (ör. class AntikMisir(Cag):) ve ondan bir nesne üret: misir = AntikMisir(\"Antik Mısır\", -2560)")
    for o in eras:
        for m, E in (('gok', G), ('zemin', Z), ('hava', H)):
            r, e = _call(o, m)
            _chk(e is None and isinstance(r, E), "%s.%s() bir %s sabiti döndürmeli (şu an: %s)." % (type(o).__name__, m, E.__name__, e or repr(r)))


def _t_yapi():
    Y = _abstract('Yapi', ['aciklama'])
    M = _need('Malzeme')
    subs = _concrete_subs(Y)
    _chk(len(subs) >= 3, "Yapi'dan türeyen en az 3 somut sınıf yaz (şu an %d)." % len(subs))
    objs = [o for o in _objs_of('Yapi')]
    kinds = {type(o).__name__ for o in objs}
    _chk(len(kinds) >= 3, "En az 3 farklı yapı türünden nesne üret (şu an %d tür)." % len(kinds))
    for o in objs:
        _chk(isinstance(getattr(o, 'malzeme', None), M), "%s nesnesinin malzemesi bir Malzeme sabiti olmalı (şu an %r)." % (type(o).__name__, getattr(o, 'malzeme', None)))
        if not hasattr(o, 'yukseklik'):
            try:
                alanlar = ', '.join(vars(o)) or 'hiç alan yok'
            except TypeError:
                alanlar = '?'
            raise _Fail("%s nesnesinde 'yukseklik' alanı hiç oluşmamış (nesnenin alanları: %s). Yazımı kontrol et (ü değil u: yukseklik) ve alt sınıfın __init__'i super().__init__(malzeme, yukseklik) çağırsın." % (type(o).__name__, alanlar))
        y = getattr(o, 'yukseklik', None)
        _chk(isinstance(y, int) and not isinstance(y, bool) and 1 <= y <= 40, "%s yüksekliği 1 ile 40 arasında bir tam sayı olmalı (şu an %r)." % (type(o).__name__, y))
        r, e = _call(o, 'aciklama')
        _chk(e is None and isinstance(r, str) and r.strip(), "%s.aciklama() boş olmayan bir metin döndürmeli." % type(o).__name__)
    T = _test_era()
    era = T('Deneme', 100)
    _chk(isinstance(getattr(era, 'yapilar', None), list) and era.yapilar == [], "Yeni bir çağın yapilar listesi boş olmalı (__init__ içinde self.yapilar = []).")
    _chk(T('Deneme2', 1).yapilar is not era.yapilar, "yapilar listesi tüm çağlarda ortak. Listeyi __init__ içinde oluştur.")
    sonuc = [_call(era, 'yapi_ekle', objs[0])[0] for _ in range(13)]
    _chk(sonuc[:12] == [True] * 12, "yapi_ekle() kapasite dolmadıysa yapıyı ekleyip True döndürmeli.")
    _chk(sonuc[12] is False and len(era.yapilar) == 12, "Bir çağda en fazla 12 yapı olabilir: 13. yapıda yapi_ekle() False döndürmeli ve eklememeli.")


def _composites():
    out = []
    an = _analyze(_LAST['code'] or '') or {'classes': {}}
    for o in _objs_of('Yapi'):
        kids = []
        try:
            vs = list(vars(o).values())
        except TypeError:
            vs = []
        for v in vs:
            for x in (v if isinstance(v, (list, tuple)) else [v]):
                if _isobj(x) and _isa(x, 'Yapi'):
                    kids.append(x)
        calls = set()
        for k in type(o).__mro__:
            c = an['classes'].get(k.__name__)
            if c:
                calls.update(c['calls'])
        if len(kids) >= 2 and any(type(x).__name__ in calls for x in kids):
            out.append(o)
    return out


def _t_bilesik():
    comp = _composites()
    _chk(comp, "Bileşik bir yapı yaz: __init__ içinde KENDİ parçalarını üreten bir Yapi alt sınıfı "
               "(ör. Kale, __init__ içinde self.kuleler = [Kule(...), ...] üretir). En az 2 parça olsun ve ondan bir nesne üret.")
    full = [e for e in _objs_of('Cag') if len(getattr(e, 'yapilar', []) or []) >= 5]
    _chk(full, "Bir çağa en az 5 yapı ekle (yapi_ekle ile).")
    ids = {id(x) for x in comp}
    _chk(any(any(id(y) in ids for y in e.yapilar) for e in full), "Bileşik yapın, 5 yapılı çağın içinde olsun.")


def _t_canli():
    Ca = _abstract('Canli', ['ses'])
    Hm = _abstract('Hareketli', ['hareket_et'])
    Is = _abstract('Isiklandirilabilir', ['isik'])
    HT = _enum('HareketTipi', minn=3)
    T = _test_era()
    era = T('Deneme', 1)
    _chk(isinstance(getattr(era, 'canlilar', None), list) and era.canlilar == [], "Cag.__init__ içinde self.canlilar = [] olmalı.")
    _chk(callable(getattr(era, 'canli_ekle', None)), "Cag sınıfında canli_ekle(canli) metodu yok.")
    in_era = {id(c) for e in _objs_of('Cag') for c in (getattr(e, 'canlilar', []) or [])}
    ok = [o for o in _objs_of('Canli') if isinstance(o, Hm) and id(o) in in_era]
    _chk(len({type(o).__name__ for o in ok}) >= 2, "En az 2 farklı canlı türü hem Canli hem Hareketli olsun ve bir çağın canlilar listesine eklensin (canli_ekle).")
    for o in ok:
        r, e = _call(o, 'hareket_et')
        _chk(e is None and isinstance(r, HT), "%s.hareket_et() bir HareketTipi sabiti döndürmeli (şu an: %s)." % (type(o).__name__, e or repr(r)))
        r, e = _call(o, 'ses')
        _chk(e is None and isinstance(r, str), "%s.ses() bir metin döndürmeli." % type(o).__name__)


def _t_isik():
    Is = _need('Isiklandirilabilir')
    M = _need('Malzeme')
    in_era = {id(y) for e in _objs_of('Cag') for y in (getattr(e, 'yapilar', []) or [])}
    ok = [o for o in _objs_of('Yapi') if isinstance(o, Is) and id(o) in in_era]
    _chk(ok, "Hem Yapi hem Isiklandirilabilir olan bir sınıf yaz (ör. class Fener(Yapi, Isiklandirilabilir):) ve onu bir çağa ekle.")
    for o in ok:
        r, e = _call(o, 'isik')
        _chk(e is None and isinstance(r, M), "%s.isik() bir Malzeme sabiti döndürmeli (ışığın rengi)." % type(o).__name__)


def _t_ajans():
    A = _need('ZamanAjansi')
    ajs = _objs_of('ZamanAjansi')
    _chk(ajs, 'Bir ZamanAjansi nesnesi üret: ajans = ZamanAjansi("Kronos")')
    a = max(ajs, key=lambda x: len(getattr(x, 'caglar', []) or []))
    cs = getattr(a, 'caglar', None)
    _chk(isinstance(cs, list), "ZamanAjansi.__init__ içinde self.caglar = [] olmalı.")
    _chk(len(cs) >= 3, "Ajansa en az 3 çağ ekle (cag_ekle ile). Şu an %d." % len(cs))
    _chk(len({type(c).__name__ for c in cs}) >= 3, "Ajanstaki 3 çağ, 3 FARKLI çağ sınıfından olsun.")
    combos = {(_call(c, 'gok')[0], _call(c, 'zemin')[0], _call(c, 'hava')[0]) for c in cs}
    _chk(len(combos) >= 2, "Çağların gökyüzü, zemin ve havası birbirinin aynısı olmasın.")
    r, e = _call(a, 'zaman_cizelgesi')
    _chk(e is None and isinstance(r, list), "zaman_cizelgesi() bir liste döndürmeli (şu an: %s)." % (e or repr(r)))
    beklenen = sorted(cs, key=lambda c: c.get_yil())
    _chk(len(r) == len(cs) and all(x is y for x, y in zip(r, beklenen)),
         "zaman_cizelgesi() çağları yıla göre eskiden yeniye sıralı döndürmeli. İpucu: sorted(self.caglar, key=lambda c: c.get_yil())")


def _t_turizm():
    Z = _abstract('ZamanAraci', ['yolculuk_suresi'])
    aracs = [o for o in _objs_of('ZamanAraci')]
    kinds = {}
    for o in aracs:
        kinds.setdefault(type(o).__name__, o)
    _chk(len(kinds) >= 2, "ZamanAraci'dan türeyen en az 2 farklı araçtan nesne üret.")
    sure = {}
    for n, o in kinds.items():
        r, e = _call(o, 'yolculuk_suresi', 1000)
        _chk(e is None and isinstance(r, int), "%s.yolculuk_suresi(1000) bir tam sayı döndürmeli (şu an: %s)." % (n, e or repr(r)))
        sure[n] = r
    _chk(len(set(sure.values())) >= 2, "Farklı araçların yolculuk süresi farklı hesaplanmalı (şu an hepsi %s)." % list(sure.values())[0])
    Gz = _need('Gezgin')
    g = Gz('Deneme')
    _chk('_Gezgin__paradoks' in vars(g) and not hasattr(g, 'paradoks'), "Gezgin'in paradoks puanı private olmalı: self.__paradoks = 0")
    _chk(_call(g, 'get_paradoks')[0] == 0, "Yeni gezginin paradoks puanı 0 olmalı (get_paradoks()).")
    _call(g, 'paradoks_ekle', 150)
    _chk(_call(g, 'get_paradoks')[0] == 100, "Paradoks puanı 100'ü geçmemeli: paradoks_ekle(150) sonrası 100 olmalı.")
    _call(g, 'paradoks_ekle', -500)
    _chk(_call(g, 'get_paradoks')[0] == 0, "Paradoks puanı 0'ın altına inmemeli.")
    turs = _objs_of('Tur')
    _chk(turs, "Bir Tur nesnesi üret: Tur(cag, arac) ve gezgin_ekle ile gezgin ekle.")
    ok = [t for t in turs if _isa(getattr(t, 'cag', None), 'Cag') and _isa(getattr(t, 'arac', None), 'ZamanAraci')
          and len([x for x in (getattr(t, 'gezginler', []) or []) if _isa(x, 'Gezgin')]) >= 1]
    _chk(ok, "Tur nesnesinde self.cag bir Cag, self.arac bir ZamanAraci olmalı ve gezginler listesinde en az 1 Gezgin bulunmalı.")


def _unchanged(base):
    an = _analyze(_LAST['code'] or '') or {'classes': {}}
    bozuk = [n for n, s in base.items() if n not in an['classes'] or an['classes'][n]['src'] != s]
    _chk(not bozuk, "Talep YENİ sınıflar ekleyerek çözülmeli; eski sınıfları değiştirdin: %s. Değişikliği geri al (Ctrl+Z)." % ', '.join(bozuk))


def _new_classes(base, root):
    return [v for v in list(_G.values()) if _isuser(v) and v.__name__ not in base and _isa_cls(v, root) and not inspect.isabstract(v)]


def _isa_cls(t, name):
    return any(k.__name__ == name for k in t.__mro__)


def _t_t1(base):
    _unchanged(base)
    yeni = _new_classes(base, 'ZamanAraci')
    _chk(yeni, "Yeni bir ZamanAraci alt sınıfı yaz (ör. class Isinlayici(ZamanAraci):).")
    objs = [o for o in _objs_of('ZamanAraci') if type(o) in yeni]
    _chk(objs, "Yeni aracından bir nesne üret.")
    for yf in (10, 5000):
        r, e = _call(objs[0], 'yolculuk_suresi', yf)
        _chk(e is None and r == 0, "Işınlayıcı anında gider: yolculuk_suresi(%d) 0 döndürmeli (şu an: %s)." % (yf, e or repr(r)))


def _t_t2(base):
    _unchanged(base)
    yeni = [v for v in _new_classes(base, 'Canli') if _isa_cls(v, 'Hareketli') and _isa_cls(v, 'Isiklandirilabilir')]
    _chk(yeni, "Hem Canli, hem Hareketli, hem de Isiklandirilabilir olan YENİ bir sınıf yaz (ör. AtesBocegi).")
    in_era = {id(c) for e in _objs_of('Cag') for c in (getattr(e, 'canlilar', []) or [])}
    _chk(any(type(o) in yeni and id(o) in in_era for o in _objs_of('Canli')), "Yeni canlından bir nesne üretip bir çağa ekle (canli_ekle).")


def _t_t3(base, base_gok):
    _unchanged(base)
    G = _need('Gokyuzu')
    yeni_gok = [m for m in G if m.name not in base_gok]
    _chk(yeni_gok, "Gokyuzu enum'una YENİ bir sabit ekle (enum'a ekleme yapmak serbest).")
    yeni = _new_classes(base, 'Cag')
    _chk(yeni, "Yeni bir çağ sınıfı yaz.")
    ajs = _objs_of('ZamanAjansi')
    ids = {id(c) for a in ajs for c in (getattr(a, 'caglar', []) or [])}
    ok = [o for o in _objs_of('Cag') if type(o) in yeni and id(o) in ids and _call(o, 'gok')[0] in yeni_gok]
    _chk(ok, "Yeni çağ, yeni gökyüzü sabitini kullansın (gok() onu döndürsün) ve ajansa eklensin.")


_TESTS = [('enumlar', _t_enumlar), ('cag', _t_cag), ('ilk_cag', _t_ilk_cag), ('yapi', _t_yapi), ('bilesik', _t_bilesik),
          ('canli', _t_canli), ('isik', _t_isik), ('ajans', _t_ajans), ('turizm', _t_turizm)]


def _run_tests(base, base_gok):
    R = {}
    tests = list(_TESTS)
    if base is not None:
        tests += [('t1', lambda: _t_t1(base)), ('t2', lambda: _t_t2(base)), ('t3', lambda: _t_t3(base, base_gok or []))]
    for k, f in tests:
        buf = _Cap()
        try:
            with contextlib.redirect_stdout(buf):
                f()
            R[k] = [True, '']
        except _Fail as e:
            R[k] = [False, str(e)]
        except RecursionError:
            R[k] = [False, 'Sonsuz özyineleme: bir metot kendini çağırıp duruyor.']
        except Exception as e:
            R[k] = [False, 'Test sırasında hata → %s: %s' % (type(e).__name__, e)]
    return R


# ---------------------------------------------------------------- dağıtıcı
def _eval(code, expr):
    pre = None
    if _G is None or code != _LAST['code']:
        o, e, comp = _exec(code)
        pre = {'out': o, 'err': e}
    out = _Cap()
    val = None
    err = None
    try:
        try:
            c = compile(expr, '<konsol>', 'eval')
            mode = 'eval'
        except SyntaxError:
            c = compile(expr, '<konsol>', 'exec')
            mode = 'exec'
        with contextlib.redirect_stdout(out):
            r = eval(c, _G) if mode == 'eval' else exec(c, _G)
        if mode == 'eval' and r is not None:
            val = repr(r)
    except Exception as e:
        err = _errinfo(e)
    return {'pre': pre, 'out': out.getvalue(), 'val': val, 'err': err}


def _dispatch(req):
    r = json.loads(req)
    cmd = r.get('cmd')
    try:
        if cmd == 'lint':
            return json.dumps(_lint(r['code']))
        if cmd == 'eval':
            return json.dumps(_eval(r['code'], r['expr']), default=str)
        out, err, comp = _exec(r['code'])
        if cmd == 'run':
            snap = None
            if comp:
                try:
                    snap = _snap()
                except Exception:
                    snap = None
            return json.dumps({'out': out, 'err': err, 'analysis': _analyze(r['code']) if comp else None, 'snap': snap,
                               'tests': _run_tests(r.get('base'), r.get('baseGok')) if comp else {}}, default=str)
        return json.dumps({'fail': 'bilinmeyen komut'})
    except RecursionError:
        return json.dumps({'fail': 'Sonsuz özyineleme: bir metot kendini çağırıp duruyor.'})
    except Exception as e:
        return json.dumps({'fail': 'Beklenmeyen hata → %s: %s' % (type(e).__name__, e)}, default=str)
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
     Enum'a özgü hatalar burada; geri kalanı 5. haftanın açıklayıcısına (H5Py.explain) bırakılır. */
  function explain(err, ctx) {
    ctx = ctx || {};
    const t = err.type || '', m = err.msg || '';
    const enums = ctx.enums || [];
    const R = (title, tip) => ({ title, tip });
    let x;
    if ((t === 'TypeError' || t === 'AttributeError') && /'tuple'/.test(m)) {
      return R('Bir değer tuple olmuş: satır sonunda virgül mü var?', 'Python\'da x = 1, yazınca x sayı değil, tek elemanlı bir tuple olur: (1,). Bu değeri atadığın satırın sonundaki virgülü sil. Hata çoğu zaman virgüllü satırda değil, değerin kullanıldığı satırda görünür; bir üst satırlara da bak.');
    }
    if (t === 'NameError' && (x = /name '(Enum|auto)' is not defined/.exec(m))) {
      return R(`'${x[1]}' tanımlı değil`, 'Dosyanın en üstünde şu satır olmalı: from enum import Enum, auto');
    }
    if (t === 'AttributeError' && (x = /type object '([^']+)' has no attribute '([^']+)'/.exec(m)) && enums.includes(x[1])) {
      const lits = (ctx.lits && ctx.lits[x[1]]) || [];
      const tr = /[ÇĞİÖŞÜçğıöşü]/.test(x[2]) ? ` "${x[2]}" içinde Türkçe harf var; sabit adlarında Türkçe harf kullanmıyoruz.` : '';
      return R(`${x[1]} içinde ${x[2]} diye bir sabit yok`, `Enum yalnızca tanımladığın sabitleri tanır; yazım hatası burada hemen yakalanır.${tr}${lits.length ? ' Tanımlı sabitler: ' + lits.join(', ') + '.' : ''}`);
    }
    if (t === 'AttributeError' && /'str' object has no attribute '(name|value)'/.test(m)) {
      return R('Bu bir metin, enum sabiti değil', '.name ve .value yalnızca enum sabitlerinde vardır. Değeri "mavi" gibi bir metin değil, Renk.MAVI gibi bir sabit olarak ver.');
    }
    if (t === 'AttributeError' && /cannot reassign member|cannot (?:set|delete) attribute|Cannot reassign members/i.test(m)) {
      return R('Enum sabiti değiştirilemez', 'Enum sabitleri programın sonuna kadar aynı kalır. Renk.MAVI\'ye yeni değer atanamaz. Farklı bir renk gerekiyorsa enum\'a yeni bir sabit ekle.');
    }
    if (t === 'ValueError' && (x = /(.+) is not a valid (\w+)/.exec(m))) {
      return R(`${x[2]} içinde bu değerde bir sabit yok`, `${x[2]}(${x[1]}) yazınca Python DEĞERİ ${x[1]} olan sabiti arar. Sabite adıyla ulaşmak için ${x[2]}.SABIT_ADI yaz.`);
    }
    if (t === 'TypeError' && /reuse key|already defined as/i.test(m)) {
      return R('Aynı sabit adı iki kez yazılmış', 'Bir enum içinde her sabit adı yalnızca bir kez kullanılabilir.');
    }
    if (t === 'TypeError' && (x = /Can't instantiate abstract class (\w+)/.exec(m))) {
      return (ctx.isAbstract && ctx.isAbstract(x[1]))
        ? R(`${x[1]} soyut: ondan nesne üretilmez`, `${x[1]} bir şablon. Nesneyi onun somut alt sınıflarından üret (ör. AntikMisir(...), Piramit(...)).`)
        : R(`${x[1]} hâlâ soyut kalmış`, `${x[1]}, üst sınıfındaki ya da arayüzündeki bir @abstractmethod metodunu yazmamış. Hata mesajındaki metot adını ${x[1]} içinde aynı adla yaz: ${m.replace(/^.*(?:methods?|implementation for abstract methods?) /, '')}`);
    }
    if (window.H5Py && window.H5Py.explain) return window.H5Py.explain(err, {});
    return R(t || 'Hata', 'Hata mesajını oku; satır numarası nereye bakacağını söyler.');
  }

  return {
    boot, onStatus, status: () => status, explain,
    lint: code => req('lint', { code }, 5000),
    run: (code, ms, base, baseGok) => req('run', { code, base: base || null, baseGok: baseGok || null }, ms),
    evaluate: (code, expr) => req('eval', { code, expr })
  };
})();
