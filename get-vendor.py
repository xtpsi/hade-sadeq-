#!/usr/bin/env python3
"""ينزّل مكتبات التطبيق إلى مجلد vendor/ لتعمل بدون إنترنت. شغّله مرة واحدة والإنترنت شغّال:  python3 get-vendor.py"""
import os, re, sys, urllib.request, urllib.parse
V = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vendor')
UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36'
J = 'https://cdn.jsdelivr.net/npm/'
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r: return r.read()
def save(rel, data):
    p = os.path.join(V, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'wb').write(data); print('OK ', rel)
def urls_in(css): return [u for u in re.findall(r'url\(["\']?([^"\')]+)["\']?\)', css) if not u.startswith('data:')]
bad = 0
try:
    for name, url in {'bootstrap.rtl.min.css': J + 'bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css', 'dexie.min.js': J + 'dexie@3.2.7/dist/dexie.min.js',
                      'JsBarcode.all.min.js': J + 'jsbarcode@3.11.6/dist/JsBarcode.all.min.js', 'xlsx.full.min.js': J + 'xlsx@0.18.5/dist/xlsx.full.min.js',
                      'html5-qrcode.min.js': J + 'html5-qrcode@2.3.8/html5-qrcode.min.js'}.items():
        save(name, get(url))
    base = J + 'bootstrap-icons@1.11.3/font/'
    css = get(base + 'bootstrap-icons.min.css'); save('bootstrap-icons/bootstrap-icons.min.css', css)
    for u in set(urls_in(css.decode())):
        clean = u.split('?')[0].split('#')[0]; save('bootstrap-icons/' + os.path.normpath(clean), get(urllib.parse.urljoin(base, clean)))
    g = get('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Noto+Kufi+Arabic:wght@600;700;800&display=swap').decode()
    for u in set(urls_in(g)):
        fn = re.sub(r'[^A-Za-z0-9._-]', '_', u.split('/')[-1]); save('fonts/' + fn, get(u)); g = g.replace(u, 'fonts/' + fn)
    save('fonts.css', g.encode())
except Exception as e:
    bad = 1; print('فشل:', e, '\nتأكد من الإنترنت ثم أعد التشغيل.')
print('تم تحميل كل شي ✔  — شغّل serve.py' if not bad else '')
sys.exit(bad)
