from pathlib import Path
import re,json,sys,subprocess
root=Path(__file__).resolve().parents[1]
errors=[]; notes=[]
def fail(msg): errors.append(msg)
required=['index.html','css/app.css','js/boot.js','js/app.js','js/app.bundle.js','js/engine.js','js/psd-import.js','js/raw-import.js','js/neural-ai.js','manifest.webmanifest','sw.js','.nojekyll','.github/workflows/pages.yml','SECURITY.md','README.md','CHANGELOG.md','QA-MATRIX.md','AUDIT-REPORT.md','FINAL-REPORT.md','tools/build-inline.py']
for rel in required:
    if not (root/rel).exists(): fail(f'Archivo requerido ausente: {rel}')
html=(root/'index.html').read_text(encoding='utf-8')
html_scan=re.sub(r'<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>','',html,flags=re.I|re.S)
ids=re.findall(r'\bid=["\']([^"\']+)',html_scan); dup=sorted({x for x in ids if ids.count(x)>1})
if dup: fail(f'IDs duplicados: {dup}')
jsfiles=sorted((root/'js').glob('*.js')); js='\n'.join(p.read_text(encoding='utf-8') for p in jsfiles)
refs=set(re.findall(r"\$\('#([^']+)'\)",js)+re.findall(r'\$\("#([^\"]+)"\)',js)); missing=sorted(refs-set(ids))
if missing: fail(f'IDs JS ausentes: {missing}')
actions=set(re.findall(r'data-action=["\']([^"\']+)',html_scan)); app=(root/'js/app.js').read_text(encoding='utf-8')
handled=set(re.findall(r"\[data-action=[\"']([^\"']+)[\"']\]",app)); unhandled=sorted(a for a in actions if a not in handled)
if unhandled: fail(f'Acciones sin handler detectable: {unhandled}')
tools=set(re.findall(r"data-tool=[\"\']([^\"\']+)",html_scan))
if tools and "b.onclick=()=>setTool(b.dataset.tool)" not in app: fail('Herramientas sin enlace global setTool')
filters=set(re.findall(r"data-filter=[\"\']([^\"\']+)",html_scan))
if filters and "$$('[data-filter]').forEach" not in app: fail('Filtros sin handler global')
# Local HTML paths only.
for attr in re.findall(r'(?:src|href)=["\']([^"\']+)',html_scan):
    if attr.startswith(('http:','https:','data:','#','blob:')): continue
    rel=attr.split('?')[0].split('#')[0].lstrip('./')
    if rel and not (root/rel).exists(): fail(f'Ruta HTML ausente: {attr}')
# Module imports must exist.
for p in jsfiles:
    text=p.read_text(encoding='utf-8')
    for rel in re.findall(r"(?:from\s+|import\()['\"](\.{1,2}/[^'\"]+)['\"]",text):
        target=(p.parent/rel).resolve()
        if not target.exists() and not (p.name in {'raw-import.js','app.bundle.js'} and rel=='../vendor/libraw/index.js'): fail(f'Import local ausente en {p.name}: {rel}')
# Runtime must not depend on network scripts/styles.
for p in [root/'index.html',root/'sw.js',*jsfiles]:
    text=p.read_text(encoding='utf-8')
    urls=re.findall(r'https?://[^\s\"\'<>`]+',text)
    if urls: fail(f'URL externa en runtime {p.relative_to(root)}: {urls[:3]}')
# Portable stable-core policy. Critical code is embedded and authorized by CSP hashes.
if 'id="pf-core"' not in html or 'id="pf-core-style"' not in html:
    fail('index.html no contiene el núcleo autocontenido')
m_csp=re.search(r'<meta[^>]+http-equiv=["\']Content-Security-Policy["\'][^>]+content="([^"]+)"',html,re.I)
if not m_csp: fail('CSP ausente')
else:
    csp=m_csp.group(1)
    if "'unsafe-inline'" in csp or "'unsafe-eval'" in csp: fail('CSP portable contiene directivas inseguras')
    if csp.count("'sha256-")<3: fail('CSP portable no autoriza por hash CSS + boot + core')
    for d in ["object-src 'none'","base-uri 'none'"]:
        if d not in csp: fail(f'CSP no contiene: {d}')
manifest=json.loads((root/'manifest.webmanifest').read_text(encoding='utf-8'))
if manifest.get('start_url')!='./' or manifest.get('scope')!='./': fail('Manifest no usa rutas relativas compatibles con subruta')
for icon in manifest.get('icons',[]):
    if not (root/icon['src']).exists(): fail(f'Icono manifest ausente: {icon["src"]}')
sw=(root/'sw.js').read_text(encoding='utf-8'); m=re.search(r'const CORE=\[(.*?)\];',sw,re.S); assets=[]
if m: assets=re.findall(r"['\"](\./?[^'\"]+)['\"]",m.group(1))
else: fail('Lista CORE del Service Worker no detectable')
for a in assets:
    rel=a[2:] if a.startswith('./') else a
    if rel and not (root/rel).exists(): fail(f'Asset SW ausente: {a}')

# Startup ordering regression guard: app must only boot after all top-level bindings/constants are declared.
start_pos=app.rfind('void startApp();')
curve_pos=app.find("const curveCanvas=$('#curveCanvas')")
if start_pos<0: fail('startApp no se invoca')
if curve_pos<0 or start_pos<curve_pos: fail('Arranque prematuro: startApp debe ejecutarse después de inicializar curveCanvas y bindings')
if 'verifyUiBindings();' not in app: fail('Falta autoverificación de handlers UI en el arranque')
if '<script type="module" src="js/app.js"></script>' in html: fail('index.html sigue dependiendo de ES Modules y fallará en file://')
if 'id="pf-core"' not in html: fail('index.html no embebe el bundle portable')
if "pixelforge-404-v7.0.0-final" not in sw: fail('Cache del Service Worker no fue incrementada tras el hotfix')
if "codeLike?networkFirst" not in sw: fail('Service Worker no usa network-first para código actualizable')
if "fallbackToIndex=false" not in sw or "e.request.mode==='navigate'" not in sw: fail('Fallback del Service Worker puede devolver HTML para recursos JS/CSS')
if "dataset.appReady === 'true'" not in (root/'js/boot.js').read_text(encoding='utf-8'): fail('boot.js puede confundir errores posteriores con fallo de arranque')



# Embedded portable core must match the audited source files byte-for-byte (ignoring wrapper newlines).
def embedded(tag_id, tag='script'):
    m=re.search(rf'<{tag} id=["\']{re.escape(tag_id)}["\'][^>]*>\n?(.*?)\n?</{tag}>',html,re.S)
    return m.group(1) if m else None
for tag_id,rel,tag in [('pf-boot','js/boot.js','script'),('pf-core','js/app.bundle.js','script'),('pf-core-style','css/app.css','style')]:
    got=embedded(tag_id,tag)
    expected=(root/rel).read_text(encoding='utf-8').rstrip('\n')
    if got is None: fail(f'Núcleo embebido ausente: {tag_id}')
    elif got.rstrip('\n')!=expected: fail(f'Núcleo embebido no coincide con {rel}')

# Standalone bundle regression guards. A classic script must contain no ESM declarations.
bundle=(root/'js/app.bundle.js').read_text(encoding='utf-8')
if re.search(r'(?m)^\s*(?:export|import)\s',bundle): fail('app.bundle.js contiene sintaxis ESM y romperá el arranque como script clásico')
if 'Object.create(PixelDocument.prototype)' in bundle or 'Object.create(PixelDocument.prototype)' in (root/'js/engine.js').read_text(encoding='utf-8'): fail('fromSnapshot usa Object.create y rompe métodos privados de PixelDocument')
if 'fileInput.click()' in bundle or "$('#projectInput').click()" in bundle or '[data-action=\"open\"]' in bundle:
    fail('Los selectores de archivo siguen usando click sintético')
if len(re.findall(r'image-file-input',html_scan)) < 3:
    fail('Faltan los tres selectores nativos de imagen')
if 'native-file-input' not in (root/'css/app.css').read_text(encoding='utf-8'):
    fail('Falta CSS del selector de archivo nativo')
if '</div>\n        <div id="dropHint" class="drop-hint">' not in html_scan:
    fail('dropHint no está separado del stage; puede perder eventos de puntero')
css_text=(root/'css/app.css').read_text(encoding='utf-8')
if not re.search(r'\.drop-hint\{[^}]*z-index:[^;}]+;[^}]*pointer-events:auto',css_text):
    fail('dropHint no está endurecido para recibir clics sobre el lienzo')

# JavaScript syntax.
for p in jsfiles+[root/'sw.js']:
    r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
    if r.returncode: fail(f'Sintaxis {p.name}: {r.stderr.strip()}')
# Deployment workflow pinned to current Pages actions used by this project.
workflow=(root/'.github/workflows/pages.yml').read_text(encoding='utf-8')
for action in ['actions/checkout@v6','actions/configure-pages@v6','actions/upload-pages-artifact@v5','actions/deploy-pages@v5']:
    if action not in workflow: fail(f'Workflow Pages no contiene {action}')
if 'python3 tools/qa-static.py' not in workflow or 'node tools/qa-node.mjs' not in workflow: fail('Workflow no ejecuta QA antes de desplegar')
if 'tools/install-libraw.sh' not in workflow: fail('Workflow no vendoriza LibRaw-WASM')
# Model consistency.
model=json.loads((root/'models/pixelforge-neural-lite.json').read_text(encoding='utf-8'))
if model.get('format')!='PixelForgeNeuralLite': fail('Formato Neural Lite inesperado')
# Repository hygiene.
files=[p for p in root.rglob('*') if p.is_file() and '.git' not in p.parts]
for p in files:
    if p.name.lower() in {'.ds_store','thumbs.db'} or p.suffix.lower() in {'.tmp','.bak','.swp'}: fail(f'Archivo temporal/peligroso: {p.relative_to(root)}')
notes += [f'Archivos proyecto: {len(files)}',f'HTML IDs: {len(ids)}',f'IDs duplicados: {len(dup)}',f'Referencias JS→DOM: {len(refs)}',f'IDs JS ausentes: {len(missing)}',f'Acciones HTML: {len(actions)}',f'Assets SW core: {len(assets)}',f'JS comprobados: {len(jsfiles)+1}',f'Manifest: {manifest.get("name")}']
print('\n'.join('PASS '+n for n in notes))
if errors:
    print('\n'.join('FAIL '+e for e in errors));sys.exit(1)
print('PASS QA estático completo')
