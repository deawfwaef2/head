# 测试服务器：先找 /home/user/head，再找 .cache/full，都没有就回源 GitHub raw（并缓存）——沙箱里 models/ big/ 不在工作区。用法：python3 tools/test/srv.py &  （端口 8080）
import http.server, socketserver, os, urllib.request, urllib.parse
A='/home/user/head'; B='/home/user/.cache/full'
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p=urllib.parse.unquote(path.split('?')[0].split('#')[0]).lstrip('/')
        for r in (A,B):
            f=os.path.join(r,p)
            if os.path.isfile(f): return f
        f=os.path.join(B,p)
        try:
            os.makedirs(os.path.dirname(f),exist_ok=True)
            u='https://raw.githubusercontent.com/deawfwaef2/head/main/'+urllib.parse.quote(p)
            d=urllib.request.urlopen(u,timeout=60).read(); open(f,'wb').write(d); return f
        except Exception as e:
            return os.path.join(A,p)
    def log_message(self,*a): pass
    def end_headers(self):
        self.send_header('Cache-Control','no-store'); super().end_headers()
socketserver.ThreadingTCPServer.allow_reuse_address=True
with socketserver.ThreadingTCPServer(('0.0.0.0',8080),H) as s: s.serve_forever()
