/* =========================================================================
   6. HAFTA — Python çalışma ortamı (Masal Mahallesi)
   Öğrenci kodu tarayıcıda gerçek Python 3 ile (Pyodide, Web Worker içinde)
   çalışır. Her çalıştırmada nesnelerin anlık görüntüsü (maket için) ve
   görev testlerinin sonuçları döner. Sonsuz döngüler zaman aşımıyla durur.
   ========================================================================= */
window.H6Py = (function () {
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

  const HARNESS = String.raw`
# Masal Mahallesi — tarayıcıdaki Python motoru (Pyodide içinde çalışır).
# Öğrenci kodunu çalıştırır, sınıflarını AST ile analiz eder, nesnelerin
# anlık görüntüsünü (maket için) çıkarır ve görev testlerini koşar.
import ast, json, io, traceback, contextlib, enum, re

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
        c = {'line': node.lineno, 'end': getattr(node, 'end_lineno', node.lineno), 'bases': bases,
             'enum': is_enum, 'methods': {}, 'attrs': {}, 'lits': []}
        for it in node.body:
            if isinstance(it, (ast.FunctionDef, ast.AsyncFunctionDef)):
                args = [a.arg for a in it.args.args]
                hasself = bool(args) and args[0] == 'self'
                c['methods'][it.name] = {'line': it.lineno, 'params': args[1:] if hasself else args, 'self': hasself}
                for sub in ast.walk(it):
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


# ---------------------------------------------------------------- maket için anlık görüntü
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


def _snap():
    g = _G or {}
    enums = []
    for k, v in list(g.items()):
        if _isuser(v) and issubclass(v, enum.Enum):
            mem = [{'n': n, 'v': _plain(m.value), 'alias': m.name != n} for n, m in v.__members__.items()]
            enums.append({'name': v.__name__, 'members': mem})
    objs, ids, order = {}, {}, []

    def ref(o):
        k = id(o)
        if k in ids:
            return ids[k]
        if len(order) >= 80:
            return None
        rid = 'o%d' % (len(order) + 1)
        ids[k] = rid
        order.append(o)
        ent = {'cls': type(o).__name__, 'attrs': {}}
        objs[rid] = ent
        try:
            d = dict(vars(o))
        except TypeError:
            d = {}
        for a, v in d.items():
            ent['attrs'][a] = val(v)
        f = getattr(o, 'pencere_sayisi', None)
        if callable(f):
            buf = _Cap()
            try:
                with contextlib.redirect_stdout(buf):
                    r = f()
                ent['pencere'] = {'ok': True, 'v': val(r)}
            except Exception as e:
                ent['pencere'] = {'ok': False, 'err': '%s: %s' % (type(e).__name__, e)}
        return rid

    def val(v, d=0):
        if isinstance(v, enum.Enum):
            return {'k': 'e', 'c': type(v).__name__, 'n': v.name, 'v': _plain(v.value)}
        if v is None or isinstance(v, (bool, int, float, str)):
            return {'k': 'p', 't': type(v).__name__, 'v': _plain(v)}
        if isinstance(v, (list, tuple)) and d < 3:
            return {'k': 'l', 'i': [val(x, d + 1) for x in list(v)[:40]]}
        if _isobj(v):
            r = ref(v)
            return {'k': 'o', 'r': r, 'c': type(v).__name__} if r else {'k': 'x', 'r': '…'}
        return {'k': 'x', 'r': repr(v)[:60]}

    names = []
    for k, v in list(g.items()):
        if k.startswith('_'):
            continue
        if _isobj(v):
            names.append([k, ref(v)])
        elif isinstance(v, (list, tuple)) and any(_isobj(x) for x in v):
            names.append([k, val(v)])
    return {'enums': enums, 'objs': objs, 'vars': names}


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
    _chk(issubclass(E, enum.Enum), "%s bir Enum olmalı: class %s(Enum):  (en üstte: from enum import Enum)" % (name, name))
    al = [n for n, m in E.__members__.items() if m.name != n]
    if al:
        raise _Fail("%s.%s, %s.%s ile aynı değere sahip. Enum aynı değeri ikinci kez görünce yeni bir sabit yapmaz, "
                    "ilkine takma ad (alias) yapar. Her sabite farklı bir değer ver." % (name, al[0], name, E[al[0]].name))
    for m in E:
        _chk(_UP.fullmatch(m.name), "%s.%s: enum sabitleri BÜYÜK HARFLE ve Türkçe karakter olmadan yazılır (ör. MAVI, YESIL)." % (name, m.name))
    names = [m.name for m in E]
    if required:
        miss = [r for r in required if r not in names]
        _chk(not miss, "%s içinde şu sabit(ler) eksik: %s" % (name, ', '.join(miss)))
    _chk(len(names) >= minn, "%s içinde %d sabit var; en az %d olmalı." % (name, len(names), minn))
    return E


def _t_renk():
    R = _enum('Renk', minn=5)
    virgul = [m.name for m in R if isinstance(m.value, tuple)]
    _chk(not virgul, 'Satır sonunda virgül var: %s. Python\'da "#000CF5", yazınca değer tuple olur: (\'#000CF5\',). '
                     'Java\'daki gibi sabitleri virgülle ayırma; her satır ayrı bir atamadır. Virgülleri sil.' % ', '.join(virgul))
    for m in R:
        _chk(isinstance(m.value, str) and _HEX.fullmatch(m.value),
             'Renk.%s değeri %r bir renk kodu değil. Biçim: "#RRGGBB", ör. KIRMIZI = "#E5484D"' % (m.name, m.value))


def _t_cati():
    _enum('CatiTipi', ['UCGEN', 'DUZ', 'KUBBE'])


def _t_mevsim():
    _enum('Mevsim', ['ILKBAHAR', 'YAZ', 'SONBAHAR', 'KIS'])


def _ev(sahip='Deneme', ri=0, kat=2, ci=0):
    Ev = _need('Ev')
    R = _need('Renk')
    C = _need('CatiTipi')
    r = list(R)[ri % len(R)]
    c = list(C)[ci % len(C)]
    try:
        e = Ev(sahip, r, kat, c)
    except TypeError as ex:
        raise _Fail('Ev(sahip, renk, kat, cati) ile nesne üretilemedi → %s' % ex)
    return e, r, c


def _t_ev():
    e, r, c = _ev('Deneme', 0, 2, 0)
    for a, want in (('sahip', 'Deneme'), ('renk', r), ('kat', 2), ('cati', c)):
        _chk(hasattr(e, a), "Ev nesnesinde '%s' özelliği yok. __init__ içinde self.%s = %s yazdın mı?" % (a, a, a))
        _chk(getattr(e, a) == want, "Ev('Deneme', %s, 2, %s) üretildi ama self.%s = %r oldu. "
                                    "Parametre sırası: sahip, renk, kat, cati." % (r, c, a, getattr(e, a)))


def _all_objs(cls_name):
    found, seen = [], set()

    def walk(v, d):
        if d > 3:
            return
        if isinstance(v, (list, tuple)):
            for x in v:
                walk(x, d + 1)
            return
        if _isobj(v) and id(v) not in seen:
            seen.add(id(v))
            if type(v).__name__ == cls_name:
                found.append(v)
            try:
                d2 = vars(v)
            except TypeError:
                return
            for x in list(d2.values()):
                walk(x, d + 1)

    for k, v in list(_G.items()):
        if not k.startswith('_'):
            walk(v, 0)
    return found


def _t_nesneler():
    R = _need('Renk')
    C = _need('CatiTipi')
    evs = _all_objs('Ev')
    _chk(len(evs) >= 3, 'Nesneler bölümünde en az 3 Ev nesnesi oluştur (şu an %d).' % len(evs))
    for e in evs:
        r, c, k = getattr(e, 'renk', None), getattr(e, 'cati', None), getattr(e, 'kat', None)
        _chk(isinstance(r, R), "Bir evin rengi %r. Renk bir metin değil, Renk enum'undan bir sabit olmalı: Renk.MAVI gibi." % (r,))
        _chk(isinstance(c, C), "Bir evin çatısı %r. CatiTipi.UCGEN gibi bir sabit kullan." % (c,))
        _chk(isinstance(k, int) and not isinstance(k, bool) and 1 <= k <= 5,
             'Bir evin kat sayısı %r. Kat 1 ile 5 arasında bir tam sayı olmalı.' % (k,))
    combos = {(e.renk, e.kat, e.cati) for e in evs}
    _chk(len(combos) >= 3, 'En az 3 ev birbirinden farklı olsun: renk, kat ya da çatı değişsin.')


def _t_metot():
    e, r, c = _ev('T', 0, 4, 0)
    _chk(callable(getattr(e, 'kat_ekle', None)), 'Ev sınıfında kat_ekle() metodu yok.')
    e.kat_ekle()
    _chk(e.kat == 5, 'kat 4 iken kat_ekle() çağrıldı, kat %r oldu (5 olmalıydı).' % (e.kat,))
    e.kat_ekle()
    _chk(e.kat == 5, "kat 5 iken kat_ekle() çağrıldı, kat %r oldu. Kat 5'i geçmemeli." % (e.kat,))
    _chk(callable(getattr(e, 'boya', None)), 'Ev sınıfında boya(yeni_renk) metodu yok.')
    r2 = list(_need('Renk'))[1]
    e.boya(r2)
    _chk(e.renk is r2, 'boya(%s) çağrıldı ama renk %r oldu.' % (r2, e.renk))


def _t_pencere():
    e, r, c = _ev('T', 0, 3, 0)
    f = getattr(e, 'pencere_sayisi', None)
    _chk(callable(f), 'Ev sınıfında pencere_sayisi() metodu yok.')
    v = f()
    _chk(v is not None, 'pencere_sayisi() None döndürdü. Sonucu print etmek yerine return ile döndür.')
    _chk(v == 6, '3 katlı ev için pencere_sayisi() %r döndürdü; 6 olmalıydı (her katta 2 pencere).' % (v,))
    e1 = _ev('T', 0, 1, 0)[0]
    _chk(e1.pencere_sayisi() == 2, '1 katlı ev için pencere_sayisi() 2 döndürmeli.')


def _t_mahalle():
    A = _need('Agac')
    M = _need('Mahalle')
    Mv = _need('Mevsim')
    a = A(4)
    _chk(getattr(a, 'boy', None) == 4, 'Agac(4) üretildi ama boy %r oldu.' % (getattr(a, 'boy', None),))
    yaz = list(Mv)[0]
    m = M('Test', yaz)
    _chk(getattr(m, 'ad', None) == 'Test' and getattr(m, 'mevsim', None) is yaz,
         'Mahalle(ad, mevsim): self.ad ve self.mevsim doğru atanmadı.')
    for liste in ('evler', 'agaclar'):
        _chk(liste in vars(m) or not hasattr(m, liste),
             '%s listesi sınıfın gövdesinde tanımlanmış; bu yüzden TÜM mahalleler aynı listeyi paylaşır. '
             'Listeyi __init__ içinde self.%s = [] ile oluştur.' % (liste, liste))
    _chk(isinstance(getattr(m, 'evler', None), list) and m.evler == [], 'Yeni bir mahallede self.evler boş bir liste olmalı.')
    _chk(isinstance(getattr(m, 'agaclar', None), list) and m.agaclar == [], 'Yeni bir mahallede self.agaclar boş bir liste olmalı.')
    m2 = M('Test2', yaz)
    _chk(m2.evler is not m.evler, 'İki mahalle aynı evler listesini paylaşıyor. Listeyi sınıfın gövdesinde değil, '
                                  '__init__ içinde self.evler = [] ile oluştur.')
    e = _ev()[0]
    m.ev_ekle(e)
    _chk(len(m.evler) == 1 and m.evler[0] is e, 'ev_ekle(ev) verilen Ev nesnesini evler listesine eklemeli.')
    m.agac_dik(3)
    _chk(len(m.agaclar) == 1 and isinstance(m.agaclar[0], A) and getattr(m.agaclar[0], 'boy', None) == 3,
         'agac_dik(3) mahallenin içinde Agac(3) üretip agaclar listesine eklemeli.')


def _t_kurulum():
    Mv = _need('Mevsim')
    ms = _all_objs('Mahalle')
    _chk(ms, 'Nesneler bölümünde bir Mahalle nesnesi oluştur: Mahalle("Papatya", Mevsim.KIS)')
    m = max(ms, key=lambda x: len(getattr(x, 'evler', None) or []))
    _chk(isinstance(getattr(m, 'mevsim', None), Mv), "Mahallenin mevsimi Mevsim enum'undan bir sabit olmalı.")
    evler = getattr(m, 'evler', None) or []
    agaclar = getattr(m, 'agaclar', None) or []
    _chk(len(evler) >= 3, 'Mahallede en az 3 ev olmalı (ev_ekle ile ekle). Şu an %d.' % len(evler))
    _chk(all(type(e).__name__ == 'Ev' for e in evler), 'evler listesinde yalnızca Ev nesneleri olmalı.')
    _chk(len(agaclar) >= 2, 'Mahallede en az 2 ağaç olmalı (agac_dik ile). Şu an %d.' % len(agaclar))


_TESTS = [('renk', _t_renk), ('cati', _t_cati), ('ev', _t_ev), ('nesneler', _t_nesneler), ('metot', _t_metot),
          ('pencere', _t_pencere), ('mevsim', _t_mevsim), ('mahalle', _t_mahalle), ('kurulum', _t_kurulum)]


def _run_tests():
    R = {}
    for k, f in _TESTS:
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
            return json.dumps({'out': out, 'err': err, 'analysis': _analyze(r['code']) if comp else None,
                               'snap': snap, 'tests': _run_tests() if comp else {}}, default=str)
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
    if (window.H5Py && window.H5Py.explain) return window.H5Py.explain(err, {});
    return R(t || 'Hata', 'Hata mesajını oku; satır numarası nereye bakacağını söyler.');
  }

  return {
    boot, onStatus, status: () => status, explain,
    lint: code => req('lint', { code }, 5000),
    run: (code, ms) => req('run', { code }, ms),
    evaluate: (code, expr) => req('eval', { code, expr })
  };
})();
