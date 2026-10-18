/* =========================================================================
   5. HAFTA — Python çalışma ortamı
   Öğrenci kodu tarayıcıda gerçek Python 3 ile (Pyodide, Web Worker içinde)
   çalışır. Sonsuz döngüler zaman aşımıyla durdurulur. Hata mesajları
   öğrencinin anlayacağı Türkçe açıklamalara çevrilir.
   ========================================================================= */
window.H5Py = (function () {
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

  const HARNESS = String.raw`# Vize Zindanı — tarayıcıdaki Python motoru (Pyodide içinde çalışır).
# Öğrenci kodunu çalıştırır, sınıflarını AST ile analiz eder, brif testlerini
# koşar ve arenadaki savaşı olay listesi olarak üretir.
import ast, json, io, traceback, contextlib, random, inspect

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
        if isinstance(s, ast.Raise):
            continue
        return False
    return True


def _analyze(src):
    try:
        tree = ast.parse(src)
    except Exception:
        return None
    res = {'classes': {}}
    for node in tree.body:
        if not isinstance(node, ast.ClassDef):
            continue
        c = {'line': node.lineno, 'end': getattr(node, 'end_lineno', node.lineno),
             'bases': [ast.unparse(b) for b in node.bases], 'methods': {}, 'attrs': {}}
        for it in node.body:
            if isinstance(it, (ast.FunctionDef, ast.AsyncFunctionDef)):
                args = [a.arg for a in it.args.args]
                decos = [ast.unparse(d) for d in it.decorator_list]
                hasself = bool(args) and args[0] == 'self'
                c['methods'][it.name] = {
                    'line': it.lineno, 'params': args[1:] if hasself else args, 'self': hasself,
                    'abstract': any(d.split('.')[-1] == 'abstractmethod' for d in decos),
                    'trivial': _trivial(it.body)}
                for sub in ast.walk(it):
                    if isinstance(sub, ast.Assign):
                        targets, val = sub.targets, sub.value
                    elif isinstance(sub, (ast.AnnAssign, ast.AugAssign)):
                        targets, val = [sub.target], sub.value
                    else:
                        continue
                    for t in targets:
                        for tt in (t.elts if isinstance(t, (ast.Tuple, ast.List)) else [t]):
                            if isinstance(tt, ast.Attribute) and isinstance(tt.value, ast.Name) and tt.value.id == 'self':
                                if tt.attr not in c['attrs'] or (it.name == '__init__' and c['attrs'][tt.attr]['in'] != '__init__'):
                                    c['attrs'][tt.attr] = {'line': tt.lineno, 'in': it.name,
                                                           'val': _vkind(val) if isinstance(sub, (ast.Assign, ast.AnnAssign)) else 'aug'}
            elif isinstance(it, (ast.Assign, ast.AnnAssign)):
                targets = it.targets if isinstance(it, ast.Assign) else [it.target]
                for t in targets:
                    if isinstance(t, ast.Name) and t.id not in c['attrs']:
                        c['attrs'][t.id] = {'line': t.lineno, 'in': '<sınıf>', 'val': _vkind(it.value)}
        res['classes'][node.name] = c
    return res


def _lint(code):
    try:
        ast.parse(code)
    except SyntaxError as e:
        return {'ok': False, 'err': _errinfo(e)}
    return {'ok': True, 'analysis': _analyze(code)}


# ---------------------------------------------------------------- test yardımcıları
def _need(name):
    c = _G.get(name) if _G else None
    if not isinstance(c, type):
        raise _Fail("Kodda '%s' adında bir sınıf bulamadım." % name)
    return c


def _chk(cond, msg):
    if not cond:
        raise _Fail(msg)


def _can(o):
    f = getattr(o, 'get_can', None)
    if f is None:
        raise _Fail("get_can() metodu yok.")
    return f()


def _safe_can(o):
    try:
        v = o.get_can()
        return v if isinstance(v, (int, float)) else 0
    except Exception:
        return 0


def _mk(cls, *a):
    try:
        return cls(*a)
    except TypeError as e:
        m = str(e)
        if 'abstract' in m:
            meths = m.split('method')[-1].strip(" s'")
            raise _Fail("%s hâlâ soyut: %s metodunu bu sınıfta yazmamışsın (override). (%s)" % (cls.__name__, meths, m))
        raise _Fail("%s(%s) üretilemedi → %s" % (cls.__name__, ', '.join(repr(x) for x in a), m))


def _tmp_sub(K):
    class _Deneme(K):
        def saldir(self, hedef):
            pass

        def iyilestir(self, hedef):
            pass
    _Deneme.__name__ = 'Deneme'
    return _Deneme


_TESTS = {}


def _test(name):
    def deco(f):
        _TESTS[name] = f
        return f
    return deco


# ---- 1. seviye
@_test('abstract')
def _t_abstract():
    K = _need('Karakter')
    _chk(inspect.isabstract(K), "Karakter soyut değil: ABC'den türemeli ve saldir() @abstractmethod ile işaretlenmeli.")
    _chk('saldir' in getattr(K, '__abstractmethods__', ()), "Karakter'in soyut metodu saldir() olmalı (@abstractmethod).")
    try:
        K('x', 10, 1)
    except TypeError:
        return
    raise _Fail("Karakter('x', 10, 1) çalıştı! Soyut sınıftan nesne üretilememeliydi.")


@_test('private')
def _t_private():
    K = _need('Karakter')
    s = _mk(_tmp_sub(K), 'Test', 100, 10)
    _chk(getattr(s, 'ad', None) == 'Test', "ad public olmalı ve __init__'te ad parametresiyle doldurulmalı.")
    _chk(hasattr(s, '_Karakter__can'), "can private olmalı (Python'da adı çift alt çizgiyle başlar) ve Karakter'in __init__'inde doldurulmalı.")
    _chk(not hasattr(s, 'can') and not hasattr(s, '_can'), "can'ın public ya da protected bir kopyası da var; can sadece private olmalı.")
    _chk(getattr(s, '_guc', None) == 10, "guc protected olmalı (tek alt çizgi) ve __init__'te guc parametresiyle doldurulmalı.")


@_test('kmeth')
def _t_kmeth():
    K = _need('Karakter')
    s = _mk(_tmp_sub(K), 'Test', 100, 10)
    _chk(_can(s) == 100, "Karakter(.., 100, ..) için get_can() 100 döndürmeliydi, %r döndü." % _can(s))
    s.hasar_al(30)
    _chk(_can(s) == 70, "hasar_al(30) sonrası can 100 → 70 olmalıydı, %r oldu." % _can(s))
    _chk(s.hayatta_mi() == True, "Can 70 iken hayatta_mi() True döndürmeli.")
    s.hasar_al(500)
    _chk(_can(s) == 0, "hasar_al(500) sonrası can 0 olmalıydı (eksiye inmemeli), %r oldu." % _can(s))
    _chk(s.hayatta_mi() == False, "Can 0 iken hayatta_mi() False döndürmeli.")


@_test('savasci')
def _t_savasci():
    K = _need('Karakter'); S = _need('Savasci')
    _chk(issubclass(S, K), "Savasci, Karakter'den türemeli (kalıtım).")
    s = _mk(S, 'A', 100, 12)
    h = _mk(_tmp_sub(K), 'Hedef', 80, 5)
    s.saldir(h)
    _chk(_can(h) == 68, "Gücü 12 olan Savaşçı saldırınca hedefin canı 80 → 68 olmalıydı, %r oldu." % _can(h))


@_test('canavar')
def _t_canavar():
    K = _need('Karakter'); C = _need('Canavar')
    _chk(issubclass(C, K), "Canavar, Karakter'den türemeli (kalıtım).")
    c = _mk(C, 'B', 100, 9)
    h = _mk(_tmp_sub(K), 'Hedef', 50, 5)
    c.saldir(h)
    _chk(_can(h) == 41, "Gücü 9 olan Canavar saldırınca hedefin canı 50 → 41 olmalıydı, %r oldu." % _can(h))


# ---- 2. seviye
@_test('arayuz')
def _t_arayuz():
    I = _need('Iyilestirebilir')
    _chk(inspect.isabstract(I) and 'iyilestir' in I.__abstractmethods__,
         "Iyilestirebilir bir arayüz olmalı: ABC'den türesin, iyilestir() soyut (@abstractmethod) olsun.")
    extra = [n for n, v in vars(I).items() if callable(v) and not n.startswith('__') and n not in I.__abstractmethods__]
    _chk(not extra, "Arayüzde dolu (somut) metot olmaz: %s" % ', '.join(extra))
    try:
        I()
    except TypeError:
        return
    raise _Fail("Iyilestirebilir() ile nesne üretilebildi; arayüzden nesne üretilmemeli.")


@_test('cankazan')
def _t_cankazan():
    K = _need('Karakter')
    s = _mk(_tmp_sub(K), 'T', 100, 10)
    _chk(hasattr(s, 'can_kazan'), "Karakter'de can_kazan(miktar) metodu yok.")
    s.hasar_al(40)
    s.can_kazan(15)
    _chk(_can(s) == 75, "Can 60 iken can_kazan(15) sonrası 75 olmalıydı, %r oldu." % _can(s))


@_test('iksir')
def _t_iksir():
    I = _need('Iyilestirebilir'); X = _need('Iksir'); K = _need('Karakter')
    _chk(issubclass(X, I), "Iksir, Iyilestirebilir arayüzünü gerçekleştirmeli.")
    _chk(not issubclass(X, K), "Iksir bir Karakter olmamalı 😄 (iksir saldıramaz, canı yok!)")
    x = _mk(X, 'Çay', 25)
    _chk(getattr(x, 'ad', None) == 'Çay' and getattr(x, 'miktar', None) == 25, "Iksir('Çay', 25) → ad ve miktar public özellikler olmalı.")
    k = _mk(_tmp_sub(K), 'T', 100, 10)
    k.hasar_al(50)
    x.iyilestir(k)
    _chk(_can(k) == 75, "Miktarı 25 olan iksir, canı 50 olan karakteri 75'e çıkarmalıydı, %r oldu." % _can(k))


@_test('sifaci')
def _t_sifaci():
    I = _need('Iyilestirebilir'); F = _need('Sifaci'); K = _need('Karakter')
    _chk(issubclass(F, K), "Sifaci bir Karakter olmalı (kalıtım).")
    _chk(issubclass(F, I), "Sifaci, Iyilestirebilir arayüzünü de gerçekleştirmeli (iki ebeveyn).")
    f = _mk(F, 'Ş', 100, 10)
    k = _mk(_tmp_sub(K), 'T', 100, 10)
    k.hasar_al(50)
    f.iyilestir(k)
    _chk(_can(k) == 70, "Gücü 10 olan Şifacı, gücünün 2 katı (20) iyileştirmeli: 50 → 70 bekleniyordu, %r oldu." % _can(k))
    h = _mk(_tmp_sub(K), 'H', 50, 1)
    f.saldir(h)
    _chk(_can(h) == 45, "Gücü 10 olan Şifacı saldırınca gücünün yarısı (10 // 2 = 5) hasar vermeli: 50 → 45 bekleniyordu, %r oldu." % _can(h))


# ---- 3. seviye
@_test('envanter')
def _t_envanter():
    E = _need('Envanter'); X = _need('Iksir'); K = _need('Karakter')
    e = _mk(E)
    _chk(getattr(e, 'iksirler', None) == [], "Envanter() üretilince iksirler boş bir liste olmalı.")
    T = _tmp_sub(K)
    a = _mk(T, 'A', 100, 10); b = _mk(T, 'B', 100, 10)
    _chk(isinstance(getattr(a, 'envanter', None), E), "Her karakterin envanter özelliği bir Envanter nesnesi olmalı (bileşim: karakter doğarken envanteri de doğar).")
    _chk(a.envanter is not b.envanter, "İki karakter AYNI envanteri paylaşıyor! Bileşimde her bütünün kendi parçası olur.")
    x1 = _mk(X, 'Çay', 20); x2 = _mk(X, 'Ayran', 10)
    e.iksir_ekle(x1); e.iksir_ekle(x2)
    _chk(len(e.iksirler) == 2, "iksir_ekle iki kez çağrılınca iksirler listesinde 2 iksir olmalı.")
    r = e.iksir_al()
    _chk(r is x1 or r is x2, "iksir_al() envanterdeki bir iksiri döndürmeli.")
    _chk(len(e.iksirler) == 1, "iksir_al() verdiği iksiri listeden çıkarmalı.")
    e.iksir_al()
    _chk(e.iksir_al() is None, "Envanter boşken iksir_al() None döndürmeli (hata vermemeli).")


@_test('silah')
def _t_silah():
    W = _need('Silah'); K = _need('Karakter'); S = _need('Savasci')
    w = _mk(W, 'Annenin Terliği', 12)
    _chk(getattr(w, 'ad', None) == 'Annenin Terliği' and getattr(w, 'hasar', None) == 12, "Silah('Annenin Terliği', 12) → ad ve hasar public özellikler olmalı.")
    s = _mk(S, 'A', 100, 10)
    _chk(hasattr(s, 'silah') and s.silah is None, "Karakter doğduğunda silahı yoktur: silah özelliği None ile başlamalı (0..1).")
    s.silah_kusan(w)
    _chk(s.silah is w, "silah_kusan(silah) karakterin silah özelliğine o silahı koymalı.")
    h = _mk(_tmp_sub(K), 'H', 100, 5)
    s.saldir(h)
    _chk(_can(h) == 78, "Silahlı savaşçı (güç 10 + silah 12) 22 hasar vermeli: 100 → 78 bekleniyordu, %r oldu." % _can(h))
    h2 = _mk(_tmp_sub(K), 'H2', 100, 5)
    _mk(S, 'B', 100, 10).saldir(h2)
    _chk(_can(h2) == 90, "Silahsız savaşçı sadece gücü kadar (10) vurmalı: 100 → 90 bekleniyordu, %r oldu." % _can(h2))


# ---- 4. seviye
@_test('lonca')
def _t_lonca():
    L = _need('Lonca'); K = _need('Karakter')
    l = _mk(L, 'Kod Çetesi')
    _chk(getattr(l, 'ad', None) == 'Kod Çetesi', "Lonca('Kod Çetesi') → ad public özellik olmalı.")
    _chk(getattr(l, 'uyeler', None) == [], "Yeni loncanın uyeler listesi boş başlamalı.")
    T = _tmp_sub(K)
    for i in range(4):
        r = l.uye_ekle(_mk(T, 'U%d' % i, 100, 10))
        _chk(r is True, "uye_ekle başarılı olunca True döndürmeli (%d. üye)." % (i + 1))
    r = l.uye_ekle(_mk(T, 'Fazla', 100, 10))
    _chk(len(l.uyeler) == 4, "Loncada en fazla 4 üye olmalı; 5. üye eklendi!")
    _chk(r is False, "5. üye eklenemeyince uye_ekle False döndürmeli.")


def _find_lonca():
    L = _need('Lonca')
    c = [v for k, v in _G.items() if isinstance(v, L) and not k.startswith('_')]
    if not c:
        raise _Fail("Kodunun deneme alanında bir Lonca nesnesi üretip üyelerini eklemelisin.")
    return max(c, key=lambda l: len(getattr(l, 'uyeler', None) or []))


def _rules(l):
    v = []
    us = list(getattr(l, 'uyeler', None) or [])
    if len(us) > 4:
        v.append('Loncada %d üye var, en fazla 4 olmalı.' % len(us))
    for u in us:
        n = getattr(u, 'ad', '?')
        c = _safe_can(u); g = getattr(u, '_guc', 0) or 0
        if c > 150:
            v.append('%s: can %s > 150 😄 Bu kadar can ancak vize haftası 12 saat uyuyunca olur.' % (n, c))
        if g > 25:
            v.append('%s: guc %s > 25. Hocaya rüşvet mi verdin? 😄' % (n, g))
        w = getattr(u, 'silah', None)
        if w is not None and (getattr(w, 'hasar', 0) or 0) > 20:
            v.append('%s: silah hasarı %s > 20. Annenin terliği bile o kadar vurmaz.' % (n, getattr(w, 'hasar', 0)))
        env = getattr(u, 'envanter', None)
        ik = list(getattr(env, 'iksirler', None) or []) if env is not None else []
        if len(ik) > 3:
            v.append('%s: envanterde %d iksir var, en fazla 3.' % (n, len(ik)))
        for x in ik:
            if (getattr(x, 'miktar', 0) or 0) > 40:
                v.append('%s: %s iksiri %s iyileştiriyor, en fazla 40.' % (n, getattr(x, 'ad', '?'), getattr(x, 'miktar', 0)))
    return v


@_test('kurulum')
def _t_kurulum():
    K = _need('Karakter'); I = _need('Iyilestirebilir')
    l = _find_lonca()
    us = list(getattr(l, 'uyeler', None) or [])
    _chk(len(us) >= 3, "Loncanda en az 3 üye olmalı (şu an %d)." % len(us))
    _chk(all(isinstance(u, K) for u in us), "Loncadaki herkes bir Karakter olmalı.")
    _chk(any(isinstance(u, I) for u in us), "Loncanda iyileştirebilen biri (Iyilestirebilir) olmalı.")
    _chk(any(getattr(u, 'silah', None) is not None for u in us), "Loncanda en az bir üyenin elinde silah olmalı (silah_kusan).")
    _chk(any(getattr(getattr(u, 'envanter', None), 'iksirler', None) for u in us), "En az bir üyenin envanterinde iksir olmalı (iksir_ekle).")
    v = _rules(l)
    _chk(not v, 'Arena kuralı: ' + ' · '.join(v))


# ---- 5. seviye
_BRIEF = ('Karakter', 'Savasci', 'Sifaci', 'Canavar')


@_test('ozel')
def _t_ozel():
    K = _need('Karakter')
    l = _find_lonca()
    base = set(vars(_mk(_tmp_sub(K), 'x', 1, 1)).keys())
    found = None
    for u in getattr(l, 'uyeler', None) or []:
        c = type(u)
        if c.__name__ in _BRIEF or not isinstance(u, K):
            continue
        found = (u, c)
        break
    _chk(found is not None, "Loncanda kendi icat ettiğin bir sınıftan (Karakter'den türeyen, brifte olmayan) bir üye yok.")
    u, c = found
    _chk('saldir' in vars(c), "%s kendi saldir() metodunu yazmalı (override)." % c.__name__)
    own_m = [n for n, v in vars(c).items() if callable(v) and not n.startswith('__') and n != 'saldir']
    _chk(own_m, "%s sınıfının kendine özgü en az bir metodu daha olmalı." % c.__name__)
    own_a = [k for k in vars(u).keys() if k not in base]
    _chk(own_a, "%s sınıfının kendine özgü en az bir özelliği olmalı (Karakter'de olmayan)." % c.__name__)


def _run_tests():
    res = {}
    for k, f in _TESTS.items():
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                f()
            res[k] = [True, '']
        except _Fail as e:
            res[k] = [False, str(e)]
        except RecursionError:
            res[k] = [False, 'Sonsuz özyineleme: bir metot kendini çağırıp duruyor.']
        except Exception as e:
            info = _errinfo(e)
            res[k] = [False, 'Test çalışırken hata → %s: %s' % (type(e).__name__, e), info.get('line')]
    return res


# ---------------------------------------------------------------- arena
_MON = {
    1: [('Yoklama Hayaleti', 70, 9, 'ghost', 'hayalet', ['Yoklama! Burada mısın?', 'Devamsızlıktan kalırsın!', 'İmza atan arkadaşın yok mu?']),
        ('Sürpriz Quiz Goblini', 85, 10, 'goblin', 'goblin', ['Kağıtları çıkarın!', 'Sürpriiiz!', 'Telefonlar kapalı!'])],
    2: [('Deadline Golemi', 330, 18, 'golem', 'golem', ['Saat 23:59!', 'Teslim süresi doldu!', 'Sistem kapandı!'])],
    3: [('Bütünleme Ejderhası', 1000, 34, 'dragon', 'ejderha', ['Bütünlemede görüşürüz!', 'Harf notun FF!', 'Yaz okulu seni bekler!'])],
}


def _varnames():
    m = {}
    for k, v in _G.items():
        if k.startswith('_') or isinstance(v, type) or callable(v):
            continue
        m.setdefault(id(v), k)
    return m


def _desc(o, var, side, sprite):
    c = type(o)
    I = _G.get('Iyilestirebilir')
    w = getattr(o, 'silah', None)
    env = getattr(o, 'envanter', None)
    ik = list(getattr(env, 'iksirler', None) or []) if env is not None else []
    return {'var': var, 'ad': str(getattr(o, 'ad', '?')), 'cls': c.__name__,
            'chain': [b.__name__ for b in c.__mro__ if b is not object and b.__name__ != 'ABC'],
            'heal': bool(isinstance(I, type) and isinstance(o, I)),
            'silah': [str(getattr(w, 'ad', '')), getattr(w, 'hasar', 0)] if w is not None else None,
            'iksir': [str(getattr(x, 'ad', '')) for x in ik],
            'can': _safe_can(o), 'guc': getattr(o, '_guc', None), 'side': side, 'sprite': sprite}


def _roster():
    l = _find_lonca()
    names = _varnames()
    us = list(getattr(l, 'uyeler', None) or [])
    return {'lonca': str(getattr(l, 'ad', '')), 'var': names.get(id(l), 'lonca'),
            'uyeler': [_desc(u, names.get(id(u)) or 'lonca.uyeler[%d]' % i, 'h', None) for i, u in enumerate(us)],
            'rules': _rules(l)}


def _arena(kat, seed):
    rnd = random.Random(seed)
    K = _need('Karakter')
    l = _find_lonca()
    heroes = list(getattr(l, 'uyeler', None) or [])
    if not heroes:
        raise _Fail('Loncanda hiç üye yok.')
    for u in heroes:
        if not isinstance(u, K):
            raise _Fail('Loncadaki %r bir Karakter değil.' % (u,))
    viol = _rules(l)
    if viol:
        return {'ok': False, 'rules': viol}
    C = _need('Canavar')
    spec = _MON[kat]
    mons = [_mk(C, s[0], s[1], s[2]) for s in spec]
    ents = heroes + mons
    nh = len(heroes)
    names = _varnames()
    var = [names.get(id(o)) or 'lonca.uyeler[%d]' % i for i, o in enumerate(heroes)] + [s[4] for s in spec]
    desc = [_desc(o, var[i], 'h' if i < nh else 'm', None if i < nh else spec[i - nh][3]) for i, o in enumerate(ents)]
    mx = [max(1, d['can']) for d in desc]
    idx = {id(o): i for i, o in enumerate(ents)}
    I = _G.get('Iyilestirebilir')
    I = I if isinstance(I, type) else None
    ev = []
    off = set()

    def hp(o):
        return _safe_can(o)

    def alive(o):
        return hp(o) > 0 and idx[id(o)] not in off

    def act(actor, kind, fn, target, call, say=None):
        before = [hp(o) for o in ents]
        buf = _Cap()
        err = None
        try:
            with contextlib.redirect_stdout(buf):
                fn()
        except RecursionError:
            err = {'type': 'RecursionError', 'msg': 'maximum recursion depth exceeded', 'line': None}
        except Exception as e:
            err = _errinfo(e)
        after = [hp(o) for o in ents]
        e = {'t': kind, 'a': idx[id(actor)], 'g': idx.get(id(target)) if target is not None else None, 'call': call,
             'out': [s[:140] for s in buf.getvalue().splitlines()[:3]],
             'd': {str(i): [before[i], after[i]] for i in range(len(ents)) if before[i] != after[i]}}
        if say:
            e['say'] = say
        if err:
            e['err'] = err
            off.add(idx[id(actor)])
        ev.append(e)
        return err is None

    def ended():
        return not [h for h in heroes if alive(h)] or not [m for m in mons if alive(m)]

    rounds = 0
    for tur in range(1, 31):
        rounds = tur
        ev.append({'t': 'round', 'n': tur})
        for o in ents:
            if ended():
                break
            if not alive(o):
                continue
            H = [h for h in heroes if alive(h)]
            M = [m for m in mons if alive(m)]
            i = idx[id(o)]
            v = var[i]
            if i < nh:
                env = getattr(o, 'envanter', None)
                ik = getattr(env, 'iksirler', None) if env is not None else None
                if hp(o) < 0.4 * mx[i] and ik:
                    def f(o=o, env=env):
                        x = env.iksir_al()
                        if x is not None:
                            x.iyilestir(o)
                    act(o, 'potion', f, o, '%s.envanter.iksir_al().iyilestir(%s)' % (v, v))
                    continue
                if I is not None and isinstance(o, I):
                    hurt = [h for h in H if hp(h) < 0.6 * mx[idx[id(h)]]]
                    if hurt:
                        t = min(hurt, key=lambda h: hp(h) / mx[idx[id(h)]])
                        act(o, 'heal', lambda o=o, t=t: o.iyilestir(t), t, '%s.iyilestir(%s)' % (v, var[idx[id(t)]]))
                        continue
                t = rnd.choice(M)
                ok = act(o, 'atk', lambda o=o, t=t: o.saldir(t), t, '%s.saldir(%s)' % (v, var[idx[id(t)]]))
                w = getattr(o, 'silah', None)
                if ok and w is not None and 'terlik' in str(getattr(w, 'ad', '')).lower() and alive(t) and rnd.random() < 0.25:
                    dmg = int(getattr(w, 'hasar', 0) or 0)
                    act(o, 'crit', lambda t=t, dmg=dmg: t.hasar_al(dmg), t, '%s.hasar_al(%d)  # 🩴 KRİTİK TERLİK!' % (var[idx[id(t)]], dmg))
            else:
                s = spec[i - nh]
                t = rnd.choice(H)
                act(o, 'atk', lambda o=o, t=t: o.saldir(t), t, '%s.saldir(%s)' % (v, var[idx[id(t)]]),
                    rnd.choice(s[5]) if rnd.random() < 0.55 else None)
        if ended():
            break
        boss = mons[0]
        if kat == 3 and tur % 3 == 0 and alive(boss):
            ev.append({'t': 'aoe', 'a': idx[id(boss)], 'say': 'ALEV! Herkes bütünlemeye! 🔥'})
            for h in [h for h in heroes if alive(h)]:
                act(boss, 'burn', lambda h=h: h.hasar_al(14), h, '%s.hasar_al(14)  # 🔥 ejderha alevi' % var[idx[id(h)]])
                off.discard(idx[id(boss)])
        if kat == 2 and tur % 4 == 0 and alive(boss) and hasattr(boss, 'can_kazan'):
            act(boss, 'buff', lambda b=boss: b.can_kazan(40), boss, 'golem.can_kazan(40)  # Hoca deadline\'ı uzattı!', 'Deadline uzatıldı! 😈')
            off.discard(idx[id(boss)])
        if ended():
            break
    win = None
    if not [m for m in mons if alive(m)]:
        win = True
    elif not [h for h in heroes if alive(h)]:
        win = False
    return {'ok': True, 'ents': desc, 'ev': ev, 'win': win, 'rounds': rounds, 'max': mx}


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
            return json.dumps({'out': out, 'err': err, 'analysis': _analyze(r['code']) if comp else None,
                               'tests': _run_tests() if comp else {}}, default=str)
        if not comp or err:
            return json.dumps({'out': out, 'err': err, 'fail': 'Kodun hatasız çalışmalı; önce Kodla sekmesinde hatayı düzelt.'})
        if cmd == 'roster':
            return json.dumps(_roster(), default=str)
        if cmd == 'arena':
            return json.dumps(_arena(int(r.get('kat', 1)), int(r.get('seed', 1))), default=str)
        return json.dumps({'fail': 'bilinmeyen komut'})
    except _Fail as e:
        return json.dumps({'fail': str(e)})
    except RecursionError:
        return json.dumps({'fail': 'Sonsuz özyineleme: bir metot kendini çağırıp duruyor.'})
    except Exception as e:
        return json.dumps({'fail': 'Beklenmeyen hata → %s: %s' % (type(e).__name__, e), 'err': _errinfo(e)}, default=str)`;

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

  /* ---------------- Türkçe hata açıklamaları ---------------- */
  // err: { type, msg, line, func, text } → { title, tip }
  function explain(err, ctx) {
    ctx = ctx || {};
    const t = err.type || '', m = err.msg || '';
    let r;
    const R = (title, tip) => ({ title, tip });
    if (t === 'SyntaxError' || t === 'IndentationError' || t === 'TabError') {
      if (/expected ':'/.test(m)) r = R('İki nokta (:) eksik', 'class, def, if, elif, else, for ve while satırları iki nokta üst üste ile biter.');
      else if (/expected an indented block/.test(m)) r = R('Girinti bekleniyordu', 'class/def/if satırından sonraki satır 4 boşluk içeride olmalı. Gövdeyi henüz yazmadıysan oraya pass yaz.');
      else if (/unexpected indent/.test(m)) r = R('Beklenmeyen girinti', 'Bu satır gereksiz yere içeride. Bir üstteki satırla aynı hizaya getir.');
      else if (/unindent does not match/.test(m)) r = R('Girinti hizası tutmuyor', 'Boşluk sayıların tutarsız. Hep 4\'ün katı kadar boşluk kullan (Tab tuşu 4 boşluk ekler).');
      else if (t === 'TabError') r = R('Tab ve boşluk karışmış', 'Girintide Tab ve boşluk karışık kullanılmış. Satırı silip Tab tuşuyla yeniden girintile.');
      else if (/unterminated string|EOL while scanning/.test(m)) r = R('Tırnak kapanmamış', 'Bir metin "..." ya da \'...\' ile açılıp kapanmamış.');
      else if (/unterminated triple-quoted/.test(m)) r = R('Üçlü tırnak kapanmamış', '""" ile açtığın açıklamayı yine """ ile kapat.');
      else if (/was never closed/.test(m)) r = R('Parantez kapanmamış', 'Açtığın (, [ ya da { işaretini kapatmayı unuttun. Hata bazen bir sonraki satırda görünür.');
      else if (/unmatched|does not match opening/.test(m)) r = R('Parantezler eşleşmiyor', 'Fazladan bir kapanan parantez var ya da yanlış türde kapatılmış.');
      else if (/invalid character/.test(m)) r = R('Geçersiz karakter', 'Word ya da WhatsApp\'tan kopyalanan “akıllı tırnak” veya garip bir simge olabilir. Tırnakları klavyeden yeniden yaz.');
      else if (/cannot assign to function call/.test(m)) r = R('Metoda değer atanamaz', 'Sol tarafta bir metot çağrısı var. Karşılaştırma için == kullan, değer atamak için bir özellik adı yaz.');
      else if (/invalid syntax\. Perhaps you forgot a comma/.test(m)) r = R('Virgül eksik olabilir', 'Parametreler ya da liste elemanları arasında virgül unutulmuş olabilir.');
      else if (/'return' outside function/.test(m)) r = R('Metot dışında return', 'return sadece bir def\'in içinde olur. Girintiyi kontrol et.');
      else if (/Missing parentheses in call to 'print'/.test(m)) r = R('print parantezsiz', 'Python 3\'te print bir fonksiyondur: print("merhaba")');
      else r = R('Yazım (sözdizimi) hatası', 'Python bu satırı anlayamadı. Eksik parantez, tırnak, iki nokta ya da yanlış yazılmış bir kelime olabilir. Bir önceki satıra da bak.');
    } else if (t === 'NameError') {
      const n = (/name '([^']+)' is not defined/.exec(m) || [])[1] || '';
      if (n === 'ABC' || n === 'abstractmethod') r = R(`'${n}' tanımlı değil`, 'Dosyanın en üstünde şu satır olmalı: from abc import ABC, abstractmethod');
      else if (n === 'self') r = R('self tanımlı değil', 'self sadece bir metodun içinde vardır ve metodun ilk parametresi olmalıdır: def metot(self, ...)');
      else if (/^(true|false|none)$/.test(n)) r = R(`'${n}' tanımlı değil`, 'Python\'da True, False ve None büyük harfle başlar.');
      else if (/^[A-ZÇĞİÖŞÜ]/.test(n)) r = R(`'${n}' diye bir sınıf yok`, 'Sınıf adını doğru yazdın mı (büyük/küçük harf, Türkçe karakter)? Sınıf, kullanıldığı satırdan ÖNCE tanımlanmış olmalı.');
      else r = R(`'${n}' tanımlı değil`, err.func && err.func !== '<module>' ? `Bir metodun içindesin (${err.func}). Nesnenin özelliğini kastediyorsan başına self. koy: self.${n}` : 'Bu adla bir değişken oluşturulmamış ya da yazımı farklı. Büyük/küçük harfe dikkat.');
    } else if (t === 'AttributeError') {
      let x;
      if ((x = /'(\w+)' object has no attribute '_(\w+)__(\w+)'/.exec(m))) {
        r = x[1] === x[2]
          ? R(`self.__${x[3]} hiç oluşturulmamış`, `__init__ içinde self.__${x[3]} = ... yazdın mı? Adı doğru mu?`)
          : R(`🔒 __${x[3]} private!`, `__${x[3]} başka bir sınıfta (ya da üst sınıfta) private tanımlanmış. Private özelliğe ALT SINIF bile dışarıdan ulaşamaz. O sınıfa bir metot ekleyip (ör. get_${x[3]}() ya da ${x[3]}_kazan()) onu çağır.`);
      } else if ((x = /'NoneType' object has no attribute '(\w+)'/.exec(m))) {
        r = R(`None üzerinde .${x[1]} kullanıldı`, 'Bir değişken None (boş). 0..1 ilişkilerde önce "if x is not None:" diye kontrol et; ya da bir metot return yazmayı unutmuş olabilir.');
      } else if ((x = /type object '(\w+)' has no attribute '(\w+)'/.exec(m))) {
        r = R(`${x[1]} sınıfında ${x[2]} yok`, `Sınıfın kendisi üzerinden erişiyorsun. Önce nesne üret (x = ${x[1]}(...)) ve x.${x[2]} kullan; ya da adı kontrol et.`);
      } else if ((x = /'(\w+)' object has no attribute '(\w+)'/.exec(m))) {
        r = R(`${x[1]} nesnesinde '${x[2]}' yok`, `__init__ içinde self.${x[2]} = ... yazıldı mı? Metotsa sınıfta def ${x[2]}(self, ...) var mı? Private ise adı __${x[2]} olarak saklanır. UML'deki adla kodu karşılaştır.`);
      } else r = R('Özellik/metot bulunamadı', 'Nesnede olmayan bir şeye erişildi.');
    } else if (t === 'TypeError') {
      let x;
      if ((x = /Can't instantiate abstract class (\w+)(?: with abstract methods?| without an implementation for abstract methods?) (.+)$/.exec(m))) {
        const cls = x[1], meths = x[2].replace(/'/g, '');
        r = ctx.abstractByDesign && ctx.abstractByDesign(cls)
          ? R(`${cls} soyut: ondan nesne üretilmez`, `${cls} bir şablon (soyut sınıf/arayüz). Nesneyi onun alt sınıflarından üret. Bu hatayı görmen aslında soyutluğun çalıştığını gösteriyor! 🎉`)
          : R(`${cls} hâlâ soyut kalmış`, `${cls} sınıfı ${meths}() metodunu yazmamış (override etmemiş). Üst sınıftaki soyut metodu ${cls} içinde aynı adla yazmalısın.`);
      } else if ((x = /(\w+)\.__init__\(\) missing (\d+) required positional arguments?: (.+)$/.exec(m)) || (x = /(\w+)\(\) missing (\d+) required positional arguments?: (.+)$/.exec(m))) {
        r = R('Eksik argüman', `${x[1]}(...) çağrılırken ${x[3].replace(/'/g, '')} verilmemiş. Parantez içine tüm parametreleri sırasıyla yaz.`);
      } else if ((x = /(\w+(?:\.\w+)?)\(\) takes (\d+) positional arguments? but (\d+) (?:were|was) given/.exec(m))) {
        r = +x[2] + 1 === +x[3] || +x[2] === 0
          ? R(`${x[1]}() fazla argüman aldı`, 'Metot tanımında self\'i unutmuş olabilirsin: def metot(self, parametre). Python nesneyi otomatik olarak ilk parametreye koyar.')
          : R(`${x[1]}() yanlış sayıda argüman`, `${x[2]} argüman beklerken ${x[3]} verildi (self dahil). Tanım ile çağrıyı karşılaştır.`);
      } else if ((x = /(\w+)\(\) takes no arguments/.exec(m))) {
        r = R(`${x[1]}'in __init__ metodu yok`, '__init__ yazılmamış ya da adı yanlış (iki alt çizgi: __init__, ikisi de önde ve sonda).');
      } else if (/unsupported operand type\(s\)/.test(m) || /can only concatenate str/.test(m)) {
        r = R('Uyumsuz tipler', 'Metin (str) ile sayı (int) doğrudan toplanmaz/çıkarılmaz. Değerlerin tiplerini kontrol et; print içinde virgül kullanabilirsin.');
      } else if (/'(\w+)' object is not callable/.test(m)) {
        r = R('Çağrılamayan şey çağrıldı', 'Parantezle çağırdığın şey bir metot değil, bir değer. Bir özellik ile metot aynı adı taşıyor olabilir (ör. self.can ve def can()).');
      } else if (/'NoneType' object is not (subscriptable|iterable)/.test(m)) {
        r = R('None üzerinde liste işlemi', 'Liste olması gereken bir değişken None. __init__ içinde boş liste ile başlattın mı?');
      } else r = R('Tip hatası', 'Bir değer beklenmeyen tipte ya da bir metot yanlış çağrıldı.');
    } else if (t === 'RecursionError') r = R('Sonsuz özyineleme', 'Bir metot kendini çağırıp duruyor (ör. get_can içinde yine get_can çağırmak).');
    else if (t === 'ZeroDivisionError') r = R('Sıfıra bölme', 'Bir sayıyı 0\'a böldün.');
    else if (t === 'IndexError') r = R('Liste sınırı aşıldı', 'Listede olmayan bir sıraya eriştin. Liste boş olabilir: önce len(liste) kontrol et.');
    else if (t === 'KeyError') r = R('Sözlükte anahtar yok', 'Sözlükte olmayan bir anahtar istendi.');
    else if (t === 'ValueError') r = R('Geçersiz değer', 'Bir işlem uygun olmayan bir değer aldı (ör. listede olmayan bir elemanı remove etmek).');
    else if (t === 'RuntimeError' && /input\(\)/.test(m)) r = R('input() kullanılamaz', 'Bu editörde klavyeden veri alınamaz; değerleri doğrudan koda yaz.');
    else r = R(t || 'Hata', 'Hata mesajını oku; satır numarası nereye bakacağını söyler.');
    return r;
  }

  return {
    boot, onStatus, status: () => status, explain,
    lint: code => req('lint', { code }, 5000),
    run: code => req('run', { code }),
    evaluate: (code, expr) => req('eval', { code, expr }),
    roster: code => req('roster', { code }),
    arena: (code, kat, seed) => req('arena', { code, kat, seed }, 15000)
  };
})();
