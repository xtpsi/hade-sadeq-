#!/usr/bin/env python3
"""خادم محلي للتطبيق.  http:  python3 serve.py      |  https:  python3 serve.py --cert cert.pem --key key.pem"""
import argparse, http.server, os, socket, ssl
ap = argparse.ArgumentParser(); ap.add_argument('--port', type=int, default=8443); ap.add_argument('--cert'); ap.add_argument('--key'); a = ap.parse_args()
os.chdir(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json'}
    def end_headers(self):
        p = self.path.split('?')[0]
        if p.endswith('/') or p.endswith(('.html', 'sw.js', 'manifest.json')): self.send_header('Cache-Control', 'no-cache')  # ليصل التحديث فوراً
        super().end_headers()
srv = http.server.ThreadingHTTPServer(('0.0.0.0', a.port), H); https = bool(a.cert and a.key)
if https:
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); ctx.load_cert_chain(a.cert, a.key); srv.socket = ctx.wrap_socket(srv.socket, server_side=True)
try: s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); ip = s.getsockname()[0]
except Exception: ip = 'IP-الجهاز'
print(f"افتح من الجوال: {'https' if https else 'http'}://{ip}:{a.port}/")
if not https: print('تنبيه: بدون HTTPS لن تعمل الكاميرا ولا وضع عدم الاتصال ولا التثبيت على الجوال (راجع README).')
srv.serve_forever()
