from pathlib import Path
import re,hashlib,base64
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css=(root/'css/app.css').read_text(encoding='utf-8').rstrip('\n')
boot=(root/'js/boot.js').read_text(encoding='utf-8').rstrip('\n')
core=(root/'js/app.bundle.js').read_text(encoding='utf-8').rstrip('\n')
html=re.sub(r'<style id="pf-core-style">.*?</style>',lambda _: '<style id="pf-core-style">'+css+'</style>',html,flags=re.S)
html=re.sub(r'<script id="pf-boot">.*?</script>',lambda _: '<script id="pf-boot">'+boot+'</script>',html,flags=re.S)
html=re.sub(r'<script id="pf-core">.*?</script>',lambda _: '<script id="pf-core">'+core+'</script>',html,flags=re.S)
def h(s): return base64.b64encode(hashlib.sha256(s.encode()).digest()).decode()
csp=f"default-src 'self' data: blob:; img-src 'self' data: blob:; style-src 'self' 'sha256-{h(css)}'; script-src 'self' 'sha256-{h(boot)}' 'sha256-{h(core)}' 'wasm-unsafe-eval'; connect-src 'self' data: blob:; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'"
html=re.sub(r'(<meta\s+http-equiv="Content-Security-Policy"\s+content=")[^"]*(">)',lambda m:m.group(1)+csp+m.group(2),html,count=1)
(root/'index.html').write_text(html,encoding='utf-8')
print('Rebuilt inline CSS/boot/core + CSP hashes')
