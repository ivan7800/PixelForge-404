import {PixelDocument,HistoryManager,imageFileToCanvas,applyAdjustments,applyFilter,clamp,drawLayerTransformed,layerPointFromDocument,documentPointFromLayer,transformedBounds,calculateHistogram,featherSelectionMask,defaultAdjustments,defaultLayerFx,defaultShapeStyle,identityWarp,identityWarpMesh,canvasToTiles,imageFileToTiles,cropCanvasRegion,cropTiledData} from './engine.js';
import {detectLocalCompute,removeBackgroundLocal} from './local-ai.js';
import {readPsdFile} from './psd-import.js';
import {isRawFile,decodeRawFile} from './raw-import.js';
import {neuralStatus,neuralSubjectMask} from './neural-ai.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const display=$('#displayCanvas'),overlay=$('#overlayCanvas'),dctx=display.getContext('2d'),octx=overlay.getContext('2d');
const stage=$('#stage'),wrap=$('#canvasWrap'),layersList=$('#layersList'),dropHint=$('#dropHint'),toastEl=$('#toast');
let doc=new PixelDocument(1200,800,'transparent'),history=new HistoryManager(32),tool='move',zoom=1,pan={x:0,y:0};
let pointerDown=false,start={x:0,y:0},last={x:0,y:0},moveOrigin=null,dirty=false,showWelcome=true,editMask=false;
let selection=null,selectionCanvasCache=null,selectionVersion=0,selectionCanvasVersion=-1,selectionEdges=[],lassoPoints=[],preview=null,marchOffset=0;
let transformGesture=null,warpGesture=null,cloneSource=null,cloneOffset=null,cloneSnapshot=null,autosaveTimer=null,restorable=null,lastPressure=1,curveDrag=-1;
let destructiveAdjustments=defaultAdjustments();

let marchTimer=null;

function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toastEl._t);toastEl._t=setTimeout(()=>toastEl.classList.remove('show'),1900)}
function active(){return doc.activeLayer}
function isRaster(layer=active()){return layer?.type==='raster'}
function isVisual(layer=active()){return ['raster','smart','text','shape','tiled'].includes(layer?.type)}
function makeCanvas(w=doc.width,h=doc.height){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function cloneCanvas(src){const c=makeCanvas(src.width,src.height);c.getContext('2d').drawImage(src,0,0);return c}
function layerThumbData(canvas){const c=document.createElement('canvas');c.width=84;c.height=64;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);const scale=Math.min(c.width/canvas.width,c.height/canvas.height),w=Math.max(1,canvas.width*scale),h=Math.max(1,canvas.height*scale);ctx.drawImage(canvas,(c.width-w)/2,(c.height-h)/2,w,h);return c.toDataURL('image/png')}
const VIEWPORT_PIXEL_THRESHOLD=24_000_000,VIEWPORT_DIM_THRESHOLD=8192,MAX_DOCUMENT_PIXELS=120_000_000,MAX_OPEN_FILE_BYTES=1_500_000_000,MAX_EXPORT_PIXELS_DESKTOP=64_000_000,MAX_EXPORT_PIXELS_MOBILE=32_000_000;
function viewportMode(){return doc.width*doc.height>VIEWPORT_PIXEL_THRESHOLD||Math.max(doc.width,doc.height)>VIEWPORT_DIM_THRESHOLD}
function currentViewRect(){const r=stage.getBoundingClientRect();return{x:doc.width/2-(r.width/2+pan.x)/zoom,y:doc.height/2-(r.height/2+pan.y)/zoom,w:r.width/zoom,h:r.height/zoom}}
function syncCanvasSize(){const giant=viewportMode();if(giant){const r=stage.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));display.width=overlay.width=w;display.height=overlay.height=h;wrap.style.width=w+'px';wrap.style.height=h+'px'}else{display.width=overlay.width=doc.width;display.height=overlay.height=doc.height;wrap.style.width=doc.width+'px';wrap.style.height=doc.height+'px'}$('#statusDoc').textContent=`${doc.width} × ${doc.height} px${giant?' · tiled viewport':''}`;for(const action of ['select-all','invert-selection']){const b=$(`[data-action="${action}"]`);if(b){b.disabled=giant;b.title=giant?'Desactivado en documentos gigantes para proteger la memoria':''}}if($('#exportWidth')){$('#exportWidth').value=doc.width;$('#exportHeight').value=doc.height;$('#exportPreset').value='custom'}invalidateSelectionCache()}
function renderComposite(){if(viewportMode())doc.compositeRegion(display,currentViewRect());else doc.composite(display)}
function renderAll(){renderComposite();renderLayers();renderTransform();syncInspectorForLayer();renderHistogram();renderOverlay();renderHistory();$('#statusLayer').textContent=`${doc.layers.length} capa${doc.layers.length===1?'':'s'}`;dropHint.classList.toggle('hidden',!showWelcome);$('#statusSelection').textContent=selection?`${countSelection()} px seleccionados`:'Sin selección'}
function renderTransform(){const rect=stage.getBoundingClientRect();if(viewportMode()){wrap.style.left='0px';wrap.style.top='0px';wrap.style.transform='none';wrap.style.width=rect.width+'px';wrap.style.height=rect.height+'px'}else{wrap.style.left=`${rect.width/2+pan.x}px`;wrap.style.top=`${rect.height/2+pan.y}px`;wrap.style.transform=`translate(${-doc.width/2}px,${-doc.height/2}px) scale(${zoom})`}$('#statusZoom').textContent=`${Math.round(zoom*100)}%`}
function refreshViewport(){if(viewportMode()){renderComposite();renderHistogram();renderOverlay()}}
function fitView(){const r=stage.getBoundingClientRect();zoom=clamp(Math.min((r.width-80)/doc.width,(r.height-80)/doc.height),.01,8);pan={x:0,y:0};renderTransform();refreshViewport()}
function screenToDoc(ev){const r=stage.getBoundingClientRect(),cx=r.width/2+pan.x,cy=r.height/2+pan.y;return{x:(ev.clientX-r.left-cx)/zoom+doc.width/2,y:(ev.clientY-r.top-cy)/zoom+doc.height/2}}
function normalized(a,b){return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)}}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function toolColor(){return $('#toolColor').value}
function toolAlpha(){return Number($('#toolOpacity').value)/100}
function toolSize(){return Number($('#toolSize').value)}
function toolHardness(){return Number($('#brushHardness').value)/100}
function brushFlow(){return Number($('#brushFlow').value)/100}
function brushSpacing(){return Number($('#brushSpacing').value)/100}
function pressureOn(){return $('#pressureEnabled').checked}
function pointerPressure(ev){return ev.pointerType!=='pen'||!pressureOn()?1:clamp(Number(ev.pressure)||.5,.05,1)}
function selectionWeight(p){if(!selection)return 1;const x=Math.floor(p.x),y=Math.floor(p.y);return x>=0&&y>=0&&x<doc.width&&y<doc.height?selection[y*doc.width+x]/255:0}
function selectionAt(p){return selectionWeight(p)>0}

async function markChange(label){dirty=true;renderAll();try{await history.push(doc,label)}catch(err){console.warn('Historial no pudo guardar el estado',err);toast('Cambio aplicado · historial limitado por memoria')}scheduleAutosave()}
function selectionChanged(){selectionVersion++;invalidateSelectionCache();selectionEdges=buildSelectionEdges();renderAll()}
function buildSelectionEdges(){if(!selection)return[];const edges=[],w=doc.width,h=doc.height,stride=Math.max(1,Math.floor(Math.max(w,h)/1200));for(let y=0;y<h;y+=stride)for(let x=0;x<w;x+=stride){const i=y*w+x;if(selection[i]<128)continue;if(x===0||y===0||x>=w-1||y>=h-1||selection[i-1]<128||selection[i+1]<128||selection[i-w]<128||selection[i+w]<128){edges.push({x,y});if(edges.length>=60000)return edges}}return edges}
function invalidateSelectionCache(){selectionCanvasCache=null;selectionCanvasVersion=-1}
function countSelection(){if(!selection)return 0;let n=0;for(const v of selection)if(v>=128)n++;return n}

function reorderLayerAccessible(layer,visualDirection){
  const siblings=doc.childrenOf(layer.parentId??null),i=siblings.findIndex(l=>l.id===layer.id),target=siblings[i+(visualDirection<0?1:-1)];
  if(!target)return false;const a=doc.layers.findIndex(l=>l.id===layer.id),b=doc.layers.findIndex(l=>l.id===target.id);if(a<0||b<0)return false;
  [doc.layers[a],doc.layers[b]]=[doc.layers[b],doc.layers[a]];return true;
}
function renderLayers(){
  layersList.innerHTML='';
  const roots=doc.childrenOf(null);
  const renderLevel=(items,depth=0)=>{
    [...items].reverse().forEach(layer=>{
      const item=document.createElement('div');item.className='layer-item '+layer.type+(layer.id===doc.activeLayerId?' active':'');item.dataset.id=layer.id;item.dataset.depth=String(Math.min(depth,3));item.draggable=true;
      item.setAttribute('role','option');item.tabIndex=layer.id===doc.activeLayerId?0:-1;item.setAttribute('aria-selected',String(layer.id===doc.activeLayerId));item.setAttribute('aria-label',`${layer.name}, ${layer.type}${layer.locked?', bloqueada':''}${layer.visible?'':', oculta'}`);
      let media='';
      if(['raster','smart','text','shape','tiled'].includes(layer.type)){const source=doc.renderLayerThumbnail(layer,84,64);const thumb=source?source.toDataURL('image/png'):'';media=`<div class="thumb-wrap"><img class="layer-thumb" alt="" src="${thumb}">${layer.mask?`<span class="mask-dot" title="Tiene máscara">M</span>`:''}</div>`}
      else if(layer.type==='adjustment')media='<div class="adjust-thumb" title="Capa de ajuste">◐</div>';
      else media='<div class="layer-icon group" title="Grupo">▱</div>';
      const subtype=layer.type==='smart'?'SMART':layer.type==='text'?'TEXT':layer.type==='shape'?'VECTOR':layer.type==='tiled'?'TILED':layer.type==='group'?'GROUP':layer.type==='adjustment'?'ADJ':'PIXEL';
      item.innerHTML=`<button class="layer-eye" type="button" title="Visibilidad" aria-label="${layer.visible?'Ocultar':'Mostrar'} ${escapeHtml(layer.name)}">${layer.visible?'◉':'○'}</button>${media}<div class="layer-name" title="Doble clic para renombrar">${escapeHtml(layer.name)}<small>${subtype}</small></div><button class="layer-lock" type="button" title="Bloquear" aria-label="${layer.locked?'Desbloquear':'Bloquear'} ${escapeHtml(layer.name)}">${layer.locked?'🔒':'🔓'}</button>`;
      if(layer.type==='group'){const toggle=document.createElement('button');toggle.type='button';toggle.className='group-toggle';toggle.textContent=layer.expanded===false?'▸':'▾';toggle.title='Expandir/contraer grupo';toggle.setAttribute('aria-label',`${layer.expanded===false?'Expandir':'Contraer'} ${layer.name}`);toggle.setAttribute('aria-expanded',String(layer.expanded!==false));toggle.onclick=e=>{e.stopPropagation();layer.expanded=layer.expanded===false;renderLayers()};item.querySelector('.thumb-wrap,.layer-icon')?.replaceWith(toggle)}
      const selectLayer=()=>{doc.activeLayerId=layer.id;editMask=false;cloneSource=null;cloneSnapshot=null;renderAll();layersList.querySelector(`[data-id="${CSS.escape(layer.id)}"]`)?.focus()};
      item.onclick=e=>{if(e.target.closest('.layer-eye')){layer.visible=!layer.visible;void markChange('Visibilidad');return}if(e.target.closest('.layer-lock')){layer.locked=!layer.locked;void markChange('Bloqueo de capa');return}if(e.target.closest('.group-toggle'))return;selectLayer()};
      item.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectLayer();return}if(e.altKey&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();if(reorderLayerAccessible(layer,e.key==='ArrowUp'?-1:1)){void markChange('Reordenar capas');setTimeout(()=>layersList.querySelector(`[data-id="${CSS.escape(layer.id)}"]`)?.focus(),0)}return}if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const opts=[...layersList.querySelectorAll('[role="option"]')],i=opts.indexOf(item),next=opts[i+(e.key==='ArrowUp'?-1:1)];next?.focus()}};
      item.querySelector('.layer-name').ondblclick=e=>{e.stopPropagation();const n=prompt('Nombre de capa',layer.name);if(n?.trim()){layer.name=n.trim().slice(0,120);void markChange('Renombrar capa')}};
      item.ondragstart=e=>e.dataTransfer.setData('text/plain',layer.id);item.ondragover=e=>e.preventDefault();item.ondrop=e=>{e.preventDefault();const src=e.dataTransfer.getData('text/plain'),target=layer.id;if(src===target)return;const si=doc.layers.findIndex(l=>l.id===src),ti=doc.layers.findIndex(l=>l.id===target);if(si<0||ti<0)return;const[m]=doc.layers.splice(si,1);m.parentId=layer.parentId??null;const nti=doc.layers.findIndex(l=>l.id===target);doc.layers.splice(nti,0,m);void markChange('Reordenar capas')};
      layersList.appendChild(item);
      if(layer.type==='group'&&layer.expanded!==false)renderLevel(doc.childrenOf(layer.id),depth+1);
    });
  };renderLevel(roots);
}
function syncInspectorForLayer(){
  const a=active();if(!a)return;
  $('#layerOpacity').value=Math.round(a.opacity*100);$('#blendMode').value=a.blend;
  const tiledLarge=a.type==='tiled'&&viewportMode(),maskAllowed=isVisual(a)&&!tiledLarge;$('[data-action="add-mask"]').disabled=!maskAllowed||!!a.mask;$('[data-action="toggle-mask-edit"]').disabled=!maskAllowed||!a.mask;$('[data-action="remove-mask"]').disabled=!maskAllowed||!a.mask;
  if(!a.mask)editMask=false;$('#maskModeHint').textContent=editMask?'Editando máscara · negro oculta / blanco revela':'Editando contenido';$('[data-action="toggle-mask-edit"]').classList.toggle('active',editMask);
  const tDisabled=!isVisual(a);for(const id of ['transformX','transformY','transformScaleX','transformScaleY','transformRotation'])$('#'+id).disabled=tDisabled;
  if(!tDisabled){$('#transformX').value=Math.round(a.x);$('#transformY').value=Math.round(a.y);$('#transformScaleX').value=Math.round(a.scaleX*100);$('#transformScaleY').value=Math.round(a.scaleY*100);$('#transformRotation').value=Math.round(a.rotation*180/Math.PI)}
  const vals=a.type==='adjustment'?ensureAdjustmentCurves(a.adjustments):ensureAdjustmentCurves(destructiveAdjustments);
  for(const id of ['brightness','contrast','saturation','blackPoint','gamma','whitePoint']){$('#'+id).value=vals[id];$('#'+id).nextElementSibling.value=vals[id]}
  $('[data-action="apply-adjustments"]').disabled=a.type!=='raster';$('[data-action="remove-background"]').disabled=!['raster','smart'].includes(a.type)||a.locked;
  $('[data-action="select-subject-ai"]').disabled=!isVisual(a)||a.locked||tiledLarge;
  $('[data-action="make-smart"]').disabled=a.type!=='raster';$('[data-action="rasterize-layer"]').disabled=!['smart','text','shape','tiled'].includes(a.type)||tiledLarge;
  for(const action of ['init-warp','perspective-left','perspective-right']){const b=$(`[data-action="${action}"]`);if(b)b.disabled=!isVisual(a)||tiledLarge}
  const textOn=a.type==='text';$('#textPanel').classList.toggle('disabled',!textOn);for(const id of ['textContent','textFont','textSize','textWeight','textAlign','textColor','textTracking'])$('#'+id).disabled=!textOn;if(textOn){const t=a.text;$('#textContent').value=t.content;$('#textFont').value=t.fontFamily;$('#textSize').value=t.fontSize;$('#textWeight').value=String(t.fontWeight);$('#textAlign').value=t.align;$('#textColor').value=t.color;$('#textTracking').value=t.letterSpacing||0}
  const fxOn=isVisual(a);document.querySelector('.fx-panel').classList.toggle('disabled',!fxOn);for(const id of ['fxEnabled','fxShadow','fxShadowBlur','fxShadowX','fxShadowY','fxGlow','fxGlowBlur','fxStroke','fxStrokeSize','fxStrokeColor','fxGlowColor'])$('#'+id).disabled=!fxOn;if(fxOn){a.fx={...defaultLayerFx(),...a.fx};$('#fxEnabled').checked=a.fx.enabled;$('#fxShadow').checked=a.fx.shadow;$('#fxShadowBlur').value=a.fx.shadowBlur;$('#fxShadowX').value=a.fx.shadowX;$('#fxShadowY').value=a.fx.shadowY;$('#fxGlow').checked=a.fx.glow;$('#fxGlowBlur').value=a.fx.glowBlur;$('#fxStroke').checked=a.fx.stroke;$('#fxStrokeSize').value=a.fx.strokeSize;$('#fxStrokeColor').value=a.fx.strokeColor;$('#fxGlowColor').value=a.fx.glowColor}
  $('#snapEnabled').checked=doc.grid.snap!==false;$('#gridEnabled').checked=!!doc.grid.enabled;$('#gridSize').value=doc.grid.size||50;
  const shapeOn=a.type==='shape';$('#shapePanel').classList.toggle('disabled',!shapeOn);for(const id of ['shapeKind','shapeFill','shapeStroke','shapeStrokeWidth','shapeRadius'])$('#'+id).disabled=!shapeOn;if(shapeOn){const sh={...defaultShapeStyle(),...a.shape};$('#shapeKind').value=sh.kind;$('#shapeFill').value=sh.fill;$('#shapeStroke').value=sh.stroke;$('#shapeStrokeWidth').value=sh.strokeWidth;$('#shapeRadius').value=sh.radius}
  renderCurve();
}

$$('[data-tool]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.tool===tool));b.onclick=()=>setTool(b.dataset.tool)});
function setTool(name){
  if(viewportMode()&&['selectRect','selectEllipse','lasso','wand'].includes(name)){toast('Selecciones globales están desactivadas en documentos gigantes para evitar agotar memoria');return false}
  if(viewportMode()&&name==='warp'&&active()?.type==='tiled'){toast('Warp de una Tiled Layer gigante requiere rasterizar una región antes');return false}
  tool=name;preview=null;lassoPoints=[];$$('[data-tool]').forEach(b=>{const on=b.dataset.tool===name;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});stage.style.cursor=({move:'move',transform:'default',warp:'crosshair',vectorShape:'crosshair',selectRect:'crosshair',selectEllipse:'crosshair',lasso:'crosshair',wand:'cell',brush:'crosshair',eraser:'crosshair',gradient:'crosshair',clone:'crosshair',heal:'crosshair',line:'crosshair',rect:'crosshair',text:'text',eyedropper:'copy',crop:'crosshair',hand:'grab',zoom:'zoom-in'})[name]||'default';$('#toleranceLabel').classList.toggle('visible',name==='wand');const brushLike=['brush','eraser'].includes(name);for(const id of ['hardnessLabel','pressureLabel','presetLabel','flowLabel','spacingLabel'])$('#'+id).classList.toggle('visible',brushLike);renderOverlay();return true}

stage.addEventListener('pointerdown',ev=>{
  if(ev.button!==0)return;try{stage.setPointerCapture(ev.pointerId)}catch{}const p=screenToDoc(ev);start=last=p;lastPressure=pointerPressure(ev);pointerDown=true;const a=active();
  if(tool==='move'&&isVisual(a)&&!a.locked)moveOrigin={x:a.x,y:a.y};
  else if(tool==='transform'&&isVisual(a)&&!a.locked){transformGesture=startTransformGesture(p);if(!transformGesture)pointerDown=false}
  else if(tool==='warp'&&isVisual(a)&&!a.locked){ensureWarp(a);warpGesture=startWarpGesture(p,a);if(!warpGesture)pointerDown=false}
  else if(['brush','eraser'].includes(tool)){if(!canPaint())return endPointer();drawStroke(p,p,lastPressure,lastPressure)}
  else if(tool==='lasso'){lassoPoints=[p];preview={type:'lasso',points:lassoPoints}}
  else if(tool==='wand'){applyMagicWand(p,ev.shiftKey,ev.altKey);endPointer()}
  else if(['clone','heal'].includes(tool)){if(!canPaint())return endPointer();if(ev.altKey){setCloneSource(p);endPointer()}else if(!cloneSource){toast('Alt+clic para fijar el origen de clonación');endPointer()}else{cloneOffset={x:cloneSource.x-p.x,y:cloneSource.y-p.y};cloneAlong(p,p,tool==='heal')}}
  else if(tool==='eyedropper'){pickColor(p);endPointer()}
  else if(tool==='text'){insertText(p);endPointer()}
  else if(tool==='zoom'){zoom=clamp(zoom*(ev.shiftKey?.8:1.25),.01,8);renderTransform();refreshViewport();endPointer()}
});
stage.addEventListener('pointermove',ev=>{
  const p=screenToDoc(ev);$('#statusCursor').textContent=`x: ${Math.round(p.x)} y: ${Math.round(p.y)}`;if(!pointerDown)return;
  if(['brush','eraser'].includes(tool)){const pr=pointerPressure(ev);drawStroke(last,p,lastPressure,pr);last=p;lastPressure=pr}
  else if(tool==='move'&&moveOrigin){const a=active(),sn=snapLayerOffset(moveOrigin.x+(p.x-start.x),moveOrigin.y+(p.y-start.y));a.x=sn.x;a.y=sn.y;renderComposite();renderOverlay()}
  else if(tool==='transform'&&transformGesture){updateTransformGesture(p);renderComposite();syncInspectorForLayer();renderOverlay()}
  else if(tool==='warp'&&warpGesture){updateWarpGesture(p);renderComposite();renderOverlay()}
  else if(tool==='hand'){const ds=docDeltaFromPoints(last,p);pan.x+=ds.x*zoom;pan.y+=ds.y*zoom;last=p;renderTransform();refreshViewport()}
  else if(tool==='lasso'){lassoPoints.push(p);preview={type:'lasso',points:lassoPoints};renderOverlay()}
  else if(['line','rect','vectorShape','crop','selectRect','selectEllipse','gradient'].includes(tool)){preview={type:tool,a:start,b:p};renderOverlay()}
  else if(['clone','heal'].includes(tool)){cloneAlong(last,p,tool==='heal');last=p}
});
stage.addEventListener('pointerup',async ev=>{
  if(!pointerDown)return;const p=screenToDoc(ev);pointerDown=false;const currentTool=tool;
  if(currentTool==='line'&&canPaint()){commitLine(start,p);await markChange('Línea')}
  else if(currentTool==='rect'&&canPaint()){commitRect(start,p);await markChange('Rectángulo')}
  else if(currentTool==='vectorShape'){commitVectorShape(start,p);await markChange('Shape Layer')}
  else if(currentTool==='gradient'&&canPaint()){commitGradient(start,p);await markChange('Degradado')}
  else if(currentTool==='crop'){const r=normalized(start,p);if(r.w>4&&r.h>4&&cropDocument(r))await markChange('Recorte')}
  else if(currentTool==='selectRect'){setRectSelection(start,p,ev.shiftKey,ev.altKey)}
  else if(currentTool==='selectEllipse'){setEllipseSelection(start,p,ev.shiftKey,ev.altKey)}
  else if(currentTool==='lasso'){if(lassoPoints.length>2)setPolygonSelection(lassoPoints,ev.shiftKey,ev.altKey);lassoPoints=[]}
  else if(['brush','eraser','move','transform','warp','clone','heal'].includes(currentTool)){
    if(currentTool==='warp'&&warpGesture)await markChange('Warp/Perspective');else if(currentTool!=='move'||moveOrigin)await markChange(currentTool==='move'?'Mover capa':currentTool==='transform'?'Transformar capa':currentTool==='clone'?'Clonar':currentTool==='heal'?'Corrector':'Pintar')}
  moveOrigin=null;transformGesture=null;warpGesture=null;preview=null;renderOverlay();
});
stage.addEventListener('pointercancel',()=>{pointerDown=false;preview=null;moveOrigin=null;transformGesture=null;warpGesture=null;renderOverlay()});
stage.addEventListener('wheel',ev=>{ev.preventDefault();if(ev.ctrlKey||ev.metaKey){zoom=clamp(zoom*(ev.deltaY<0?1.1:.9),.01,8);renderTransform();refreshViewport();renderOverlay()}else{pan.x-=ev.deltaX;pan.y-=ev.deltaY;renderTransform();refreshViewport()}},{passive:false});
function endPointer(){pointerDown=false;preview=null}
function docDeltaFromPoints(a,b){return{x:b.x-a.x,y:b.y-a.y}}
function canPaint(toolName=tool){const a=active();if(!a)return false;if(a.locked){toast('La capa está bloqueada');return false}if(editMask){if(!isVisual(a)||!a.mask){toast('Selecciona una capa visual con máscara');return false}return true}if(!isRaster(a)&&a.type!=='tiled'){toast('Para pintar el contenido usa una capa raster/tiled o rasteriza la capa');return false}if(a.type==='tiled'&&!['brush','eraser'].includes(toolName)){toast('En Tiled Layers gigantes, línea/rectángulo/degradado/clonado no se ejecutan para evitar buffers completos; usa pincel/goma o una capa raster moderada');return false}return true}

function targetCanvas(){const a=active();return editMask?a.mask:a.canvas}
function tiledTileAt(layer,tx,ty,create=true){const t=layer.tiled,tileSize=t.tileSize||512;let tile=(t.tiles||[]).find(q=>q.x===tx&&q.y===ty);if(!tile&&create){const w=Math.min(tileSize,doc.width-tx),h=Math.min(tileSize,doc.height-ty);if(w<=0||h<=0)return null;const c=document.createElement('canvas');c.width=w;c.height=h;tile={x:tx,y:ty,w,h,canvas:c};t.tiles.push(tile)}return tile}
function tiledBrushStamp(layer,p,radius,alpha){const ts=layer.tiled.tileSize||512,minX=Math.max(0,Math.floor((p.x-radius)/ts)*ts),minY=Math.max(0,Math.floor((p.y-radius)/ts)*ts),maxX=Math.min(doc.width-1,p.x+radius),maxY=Math.min(doc.height-1,p.y+radius);for(let ty=minY;ty<=maxY;ty+=ts)for(let tx=minX;tx<=maxX;tx+=ts){const tile=tiledTileAt(layer,tx,ty,true);if(!tile)continue;brushStamp(tile.canvas.getContext('2d'),{x:p.x-tx,y:p.y-ty},radius,alpha);tile._dataURLCache=null}}
function drawStroke(a,b,pressureA=1,pressureB=1){
  const l=active();if(!l||(l.type!=='tiled'&&!targetCanvas()))return;const baseStep=Math.max(1,toolSize()*brushSpacing()),steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/baseStep));
  for(let i=0;i<=steps;i++){
    const t=i/steps,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},sel=selectionWeight(p);if(sel<=0)continue;
    const pressure=pressureA+(pressureB-pressureA)*t,sizePressure=pressureOn()?.35+.65*pressure:1,alphaPressure=pressureOn()?.28+.72*pressure:1;
    const lp=layerPointFromDocument(p,l,doc.width,doc.height),radius=Math.max(.5,toolSize()/2*sizePressure),alpha=toolAlpha()*brushFlow()*alphaPressure*sel;
    if(l.type==='tiled'&&!editMask)tiledBrushStamp(l,lp,radius,alpha);else{const ctx=targetCanvas().getContext('2d');brushStamp(ctx,lp,radius,alpha)}
  }renderComposite();renderOverlay();
}
function brushStamp(ctx,p,radius,alpha){
  const hide=editMask?(tool==='eraser'||hexLuminance(toolColor())<128):tool==='eraser',color=editMask?'#ffffff':toolColor(),hard=clamp(toolHardness(),0,1);
  ctx.save();ctx.globalCompositeOperation=hide?'destination-out':'source-over';ctx.globalAlpha=clamp(alpha,0,1);ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);
  if(hard>=.995){ctx.fillStyle=hide?'#000000':color}else{const rgb=hexToRgb(hide?'#000000':color),g=ctx.createRadialGradient(p.x,p.y,radius*hard,p.x,p.y,radius);g.addColorStop(0,`rgba(${rgb.r},${rgb.g},${rgb.b},1)`);g.addColorStop(1,`rgba(${rgb.r},${rgb.g},${rgb.b},0)`);ctx.fillStyle=g}
  ctx.fill();ctx.restore();
}
function hexToRgb(hex){const n=parseInt(hex.slice(1),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255}}
function hexLuminance(hex){const n=parseInt(hex.slice(1),16);return(((n>>16)&255)*.299+((n>>8)&255)*.587+(n&255)*.114)}

function drawWithSelection(layer,drawFn){
  const target=editMask?layer.mask:layer.canvas;if(!selection){drawFn(target.getContext('2d'));return}
  const before=cloneCanvas(target),after=cloneCanvas(target);drawFn(after.getContext('2d'));const mask=selectionForLayer(layer),bctx=before.getContext('2d',{willReadFrequently:true}),actx=after.getContext('2d',{willReadFrequently:true}),a=bctx.getImageData(0,0,doc.width,doc.height),b=actx.getImageData(0,0,doc.width,doc.height),d=a.data;
  for(let i=0,p=0;i<d.length;i+=4,p++){const mix=mask[p]/255;if(!mix)continue;for(let c=0;c<4;c++)d[i+c]+= (b.data[i+c]-d[i+c])*mix}target.getContext('2d').putImageData(a,0,0);
}
function commitLine(a,b){const l=active(),la=layerPointFromDocument(a,l,doc.width,doc.height),lb=layerPointFromDocument(b,l,doc.width,doc.height);drawWithSelection(l,ctx=>{ctx.save();const hide=editMask&&hexLuminance(toolColor())<128;ctx.globalCompositeOperation=hide?'destination-out':'source-over';ctx.strokeStyle=editMask?'#fff':toolColor();ctx.globalAlpha=toolAlpha();ctx.lineWidth=toolSize();ctx.lineCap='round';ctx.beginPath();ctx.moveTo(la.x,la.y);ctx.lineTo(lb.x,lb.y);ctx.stroke();ctx.restore()})}
function commitRect(a,b){const l=active(),la=layerPointFromDocument(a,l,doc.width,doc.height),lb=layerPointFromDocument(b,l,doc.width,doc.height),r=normalized(la,lb);drawWithSelection(l,ctx=>{ctx.save();const hide=editMask&&hexLuminance(toolColor())<128;ctx.globalCompositeOperation=hide?'destination-out':'source-over';ctx.strokeStyle=editMask?'#fff':toolColor();ctx.globalAlpha=toolAlpha();ctx.lineWidth=toolSize();ctx.strokeRect(r.x,r.y,r.w,r.h);ctx.restore()})}
function commitGradient(a,b){const l=active(),la=layerPointFromDocument(a,l,doc.width,doc.height),lb=layerPointFromDocument(b,l,doc.width,doc.height);drawWithSelection(l,ctx=>{ctx.save();const g=ctx.createLinearGradient(la.x,la.y,lb.x,lb.y);if(editMask){g.addColorStop(0,hexLuminance(toolColor())<128?'rgba(255,255,255,0)':'#fff');g.addColorStop(1,hexLuminance($('#secondaryColor').value)<128?'rgba(255,255,255,0)':'#fff');ctx.globalCompositeOperation='copy'}else{g.addColorStop(0,toolColor());g.addColorStop(1,$('#secondaryColor').value)}ctx.globalAlpha=toolAlpha();ctx.fillStyle=g;ctx.fillRect(0,0,doc.width,doc.height);ctx.restore()})}
function insertText(p){const text=prompt('Texto','PixelForge 404');if(!text)return;const a=active(),parent=a?.type==='group'?a.id:a?.parentId??null,layer=doc.addTextLayer(text.slice(0,28),{content:text,fontSize:Math.max(18,toolSize()*2),color:toolColor(),fontWeight:700},{x:p.x,y:p.y},parent);layer.opacity=toolAlpha();editMask=false;void markChange('Text Layer editable')}
function pickColor(p){const x=clamp(Math.floor(p.x),0,doc.width-1),y=clamp(Math.floor(p.y),0,doc.height-1);let d;if(viewportMode()){const c=makeCanvas(1,1);doc.compositeRegion(c,{x,y,w:1,h:1});d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,1,1).data}else d=dctx.getImageData(x,y,1,1).data;const hex='#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join('');setColor(hex);toast(hex)}

function setCloneSource(p){cloneSource=p;cloneSnapshot=cloneCanvas(targetCanvas());toast(`Origen fijado · ${Math.round(p.x)}, ${Math.round(p.y)}`);renderOverlay()}
function cloneAlong(a,b,healing){const dist=Math.hypot(b.x-a.x,b.y-a.y),step=Math.max(2,toolSize()/3),n=Math.max(1,Math.ceil(dist/step));for(let i=0;i<=n;i++){const t=i/n,pt={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};cloneStamp(pt,healing)}renderComposite();renderOverlay()}
function cloneStamp(p,healing){const sw=selectionWeight(p);if(sw<=0||!cloneSnapshot||!cloneOffset)return;const l=active(),dst=layerPointFromDocument(p,l,doc.width,doc.height),srcDoc={x:p.x+cloneOffset.x,y:p.y+cloneOffset.y},src=layerPointFromDocument(srcDoc,l,doc.width,doc.height),r=Math.max(1,toolSize()/2),ctx=targetCanvas().getContext('2d');ctx.save();ctx.beginPath();ctx.arc(dst.x,dst.y,r,0,Math.PI*2);ctx.clip();ctx.globalAlpha=toolAlpha()*(healing?.55:1)*sw;ctx.drawImage(cloneSnapshot,src.x-r,src.y-r,r*2,r*2,dst.x-r,dst.y-r,r*2,r*2);ctx.restore()}

function selectionCanvas(){if(selectionCanvasCache&&selectionCanvasVersion===selectionVersion)return selectionCanvasCache;const c=makeCanvas(),ctx=c.getContext('2d'),img=ctx.createImageData(doc.width,doc.height);for(let p=0,i=0;p<selection.length;p++,i+=4){img.data[i]=img.data[i+1]=img.data[i+2]=255;img.data[i+3]=selection[p]}ctx.putImageData(img,0,0);selectionCanvasCache=c;selectionCanvasVersion=selectionVersion;return c}
function selectionForLayer(layer){if(!selection)return null;const src=selectionCanvas(),out=makeCanvas(),ctx=out.getContext('2d');ctx.save();ctx.translate(doc.width/2,doc.height/2);ctx.scale(1/(layer.scaleX||1),1/(layer.scaleY||1));ctx.rotate(-(layer.rotation||0));ctx.translate(-(doc.width/2+layer.x),-(doc.height/2+layer.y));ctx.drawImage(src,0,0);ctx.restore();const d=ctx.getImageData(0,0,doc.width,doc.height).data,m=new Uint8Array(doc.width*doc.height);for(let p=0,i=3;p<m.length;p++,i+=4)m[p]=d[i];return m}
function combineSelection(next,add=false,subtract=false){const feather=Number($('#selectionFeather').value)||0;if(feather>0)next=featherSelectionMask(next,doc.width,doc.height,feather);if(!selection||(!add&&!subtract)){selection=next}else if(add){for(let i=0;i<selection.length;i++)selection[i]=Math.max(selection[i],next[i])}else if(subtract){for(let i=0;i<selection.length;i++)selection[i]=Math.round(selection[i]*(1-next[i]/255))}selectionChanged()}
function setRectSelection(a,b,add,subtract){const r=normalized(a,b),next=new Uint8Array(doc.width*doc.height),x0=clamp(Math.floor(r.x),0,doc.width),y0=clamp(Math.floor(r.y),0,doc.height),x1=clamp(Math.ceil(r.x+r.w),0,doc.width),y1=clamp(Math.ceil(r.y+r.h),0,doc.height);for(let y=y0;y<y1;y++)next.fill(255,y*doc.width+x0,y*doc.width+x1);combineSelection(next,add,subtract)}
function setEllipseSelection(a,b,add,subtract){const r=normalized(a,b),next=new Uint8Array(doc.width*doc.height),cx=r.x+r.w/2,cy=r.y+r.h/2,rx=Math.max(.5,r.w/2),ry=Math.max(.5,r.h/2),x0=clamp(Math.floor(r.x),0,doc.width),y0=clamp(Math.floor(r.y),0,doc.height),x1=clamp(Math.ceil(r.x+r.w),0,doc.width),y1=clamp(Math.ceil(r.y+r.h),0,doc.height);for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)next[y*doc.width+x]=255;combineSelection(next,add,subtract)}
function setPolygonSelection(points,add,subtract){const c=makeCanvas(),ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fill();const data=ctx.getImageData(0,0,doc.width,doc.height).data,next=new Uint8Array(doc.width*doc.height);for(let p=0,i=3;p<next.length;p++,i+=4)next[p]=data[i];combineSelection(next,add,subtract)}
function applyMagicWand(p,add,subtract){const x0=clamp(Math.floor(p.x),0,doc.width-1),y0=clamp(Math.floor(p.y),0,doc.height-1),img=dctx.getImageData(0,0,doc.width,doc.height).data,tol=Number($('#wandTolerance').value)*4.42,targetIndex=(y0*doc.width+x0)*4,target=[img[targetIndex],img[targetIndex+1],img[targetIndex+2],img[targetIndex+3]],total=doc.width*doc.height,seen=new Uint8Array(total),next=new Uint8Array(total),queue=new Int32Array(total);let head=0,tail=0;const seed=y0*doc.width+x0;queue[tail++]=seed;seen[seed]=1;
  while(head<tail){const idx=queue[head++],i=idx*4,dist=Math.hypot(img[i]-target[0],img[i+1]-target[1],img[i+2]-target[2],(img[i+3]-target[3])*.5);if(dist>tol)continue;next[idx]=255;const x=idx%doc.width,y=Math.floor(idx/doc.width);const addIdx=n=>{if(!seen[n]){seen[n]=1;queue[tail++]=n}};if(x>0)addIdx(idx-1);if(x<doc.width-1)addIdx(idx+1);if(y>0)addIdx(idx-doc.width);if(y<doc.height-1)addIdx(idx+doc.width)}combineSelection(next,add,subtract)}
$('[data-action="select-all"]').onclick=()=>{if(viewportMode())return toast('Selección global desactivada en documentos gigantes');selection=new Uint8Array(doc.width*doc.height);selection.fill(255);selectionChanged()};
$('[data-action="deselect"]').onclick=()=>{selection=null;selectionChanged()};
$('[data-action="invert-selection"]').onclick=()=>{if(viewportMode())return toast('Selección global desactivada en documentos gigantes');if(!selection){selection=new Uint8Array(doc.width*doc.height);selection.fill(255)}else for(let i=0;i<selection.length;i++)selection[i]=255-selection[i];selectionChanged()};

function startTransformGesture(p){const a=active(),tb=transformedBounds(a,doc.width,doc.height,doc);if(!tb)return null;const hit=transformHit(p,tb),orig={x:a.x,y:a.y,scaleX:a.scaleX,scaleY:a.scaleY,rotation:a.rotation},center=tb.center;if(hit==='rotate')return{type:'rotate',orig,center,startAngle:Math.atan2(p.y-center.y,p.x-center.x)};if(hit==='scale')return{type:'scale',orig,center,startDist:Math.max(1,Math.hypot(p.x-center.x,p.y-center.y))};if(hit==='move'||pointInPolygon(p,tb.points))return{type:'move',orig,start:p};return null}
function updateTransformGesture(p){const a=active(),g=transformGesture;if(!a||!g)return;if(g.type==='move'){const sn=snapLayerOffset(g.orig.x+(p.x-g.start.x),g.orig.y+(p.y-g.start.y));a.x=sn.x;a.y=sn.y}else if(g.type==='rotate'){a.rotation=g.orig.rotation+(Math.atan2(p.y-g.center.y,p.x-g.center.x)-g.startAngle)}else if(g.type==='scale'){const ratio=clamp(Math.hypot(p.x-g.center.x,p.y-g.center.y)/g.startDist,.02,20);a.scaleX=g.orig.scaleX*ratio;a.scaleY=g.orig.scaleY*ratio}}
function transformHit(p,tb){const threshold=12/zoom,pts=tb.points;for(const pt of pts)if(Math.hypot(p.x-pt.x,p.y-pt.y)<threshold)return'scale';const topMid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2},dx=topMid.x-tb.center.x,dy=topMid.y-tb.center.y,len=Math.hypot(dx,dy)||1,rot={x:topMid.x+dx/len*(32/zoom),y:topMid.y+dy/len*(32/zoom)};if(Math.hypot(p.x-rot.x,p.y-rot.y)<threshold)return'rotate';return pointInPolygon(p,pts)?'move':null}
function pointInPolygon(p,pts){let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j],intersect=((a.y>p.y)!==(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y||1e-9)+a.x);if(intersect)inside=!inside}return inside}

function renderOverlay(){
  octx.clearRect(0,0,overlay.width,overlay.height);octx.save();
  if(viewportMode()){const r=currentViewRect(),sx=overlay.width/r.w,sy=overlay.height/r.h;octx.setTransform(sx,0,0,sy,-r.x*sx,-r.y*sy)}
  if(selection)drawSelectionOverlay();
  drawGuidesOverlay();if(tool==='transform'&&isVisual(active()))drawTransformOverlay();if(tool==='warp'&&isVisual(active()))drawWarpOverlay();
  if(cloneSource&&['clone','heal'].includes(tool)){octx.strokeStyle='#ffcc66';octx.lineWidth=Math.max(1,1/zoom);octx.beginPath();octx.arc(cloneSource.x,cloneSource.y,7/zoom,0,Math.PI*2);octx.moveTo(cloneSource.x-10/zoom,cloneSource.y);octx.lineTo(cloneSource.x+10/zoom,cloneSource.y);octx.moveTo(cloneSource.x,cloneSource.y-10/zoom);octx.lineTo(cloneSource.x,cloneSource.y+10/zoom);octx.stroke()}
  if(preview)drawPreview(preview);octx.restore();
}
function drawSelectionOverlay(){
  const c=selectionCanvas();octx.save();octx.globalAlpha=.13;octx.drawImage(c,0,0);octx.globalAlpha=1;const size=Math.max(1,1.25/zoom);for(let i=0;i<selectionEdges.length;i++){const p=selectionEdges[i];octx.fillStyle=((i+marchOffset)>>2)%2?'#ffffff':'#111318';octx.fillRect(p.x,p.y,size,size)}octx.restore();
}
function drawTransformOverlay(){const tb=transformedBounds(active(),doc.width,doc.height,doc);if(!tb)return;const pts=tb.points;octx.save();octx.strokeStyle='#30d6c5';octx.fillStyle='#10131a';octx.lineWidth=Math.max(1,1.5/zoom);octx.setLineDash([]);octx.beginPath();octx.moveTo(pts[0].x,pts[0].y);for(const p of pts.slice(1))octx.lineTo(p.x,p.y);octx.closePath();octx.stroke();for(const p of pts){octx.beginPath();octx.rect(p.x-5/zoom,p.y-5/zoom,10/zoom,10/zoom);octx.fill();octx.stroke()}const topMid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2},dx=topMid.x-tb.center.x,dy=topMid.y-tb.center.y,len=Math.hypot(dx,dy)||1,rot={x:topMid.x+dx/len*(32/zoom),y:topMid.y+dy/len*(32/zoom)};octx.beginPath();octx.moveTo(topMid.x,topMid.y);octx.lineTo(rot.x,rot.y);octx.stroke();octx.beginPath();octx.arc(rot.x,rot.y,5/zoom,0,Math.PI*2);octx.fill();octx.stroke();octx.restore()}
function drawPreview(v){octx.save();octx.lineWidth=Math.max(1,1/zoom);octx.setLineDash([8/zoom,5/zoom]);octx.strokeStyle=v.type==='crop'?'#30d6c5':['selectRect','selectEllipse','lasso'].includes(v.type)?'#8fe3ff':'#f5f7ff';if(v.type==='lasso'){if(v.points.length){octx.beginPath();octx.moveTo(v.points[0].x,v.points[0].y);for(const p of v.points.slice(1))octx.lineTo(p.x,p.y);octx.stroke()}}else if(v.type==='line'||v.type==='gradient'){octx.beginPath();octx.moveTo(v.a.x,v.a.y);octx.lineTo(v.b.x,v.b.y);octx.stroke()}else{const r=normalized(v.a,v.b);if(v.type==='selectEllipse'){octx.beginPath();octx.ellipse(r.x+r.w/2,r.y+r.h/2,Math.max(.5,r.w/2),Math.max(.5,r.h/2),0,0,Math.PI*2);octx.stroke()}else octx.strokeRect(r.x,r.y,r.w,r.h)}octx.restore()}

function ensureAdjustmentCurves(a){const lin=[0,64,128,192,255],base={...defaultAdjustments(),...(a||{})};base.curves={rgb:[...(base.curves?.rgb||base.curve||lin)],r:[...(base.curves?.r||lin)],g:[...(base.curves?.g||lin)],b:[...(base.curves?.b||lin)]};base.curve=[...base.curves.rgb];return base}
function selectedCurve(){const t=toneTarget(),ch=$('#curveChannel')?.value||'rgb';t.curves=ensureAdjustmentCurves(t).curves;if(ch==='rgb')t.curve=[...t.curves.rgb];return t.curves[ch]}

function commitVectorShape(a,b){
  const r=normalized(a,b);if(r.w<2||r.h<2){toast('Dibuja una forma de al menos 2 px');return}
  const kind=$('#shapeKind')?.value||'rect';
  doc.addShapeLayer(`Forma ${doc.layers.filter(l=>l.type==='shape').length+1}`,{
    ...defaultShapeStyle(),kind,x:r.x,y:r.y,width:r.w,height:r.h,
    fill:$('#shapeFill')?.value||toolColor(),stroke:$('#shapeStroke')?.value||$('#secondaryColor').value,
    strokeWidth:Number($('#shapeStrokeWidth')?.value)||0,radius:Number($('#shapeRadius')?.value)||0
  });
  renderAll();
}
function ensureWarp(layer){
  if(!layer.warpMesh?.points?.length){
    const mesh=identityWarpMesh(doc.width,doc.height,3,3);
    if(layer.warp?.length===4){const q=layer.warp;for(let y=0;y<3;y++)for(let x=0;x<3;x++){const u=x/2,v=y/2,lerp=(a,b,t)=>a+(b-a)*t;mesh.points[y*3+x]={x:lerp(lerp(q[0].x,q[1].x,u),lerp(q[3].x,q[2].x,u),v),y:lerp(lerp(q[0].y,q[1].y,u),lerp(q[3].y,q[2].y,u),v)}}}
    layer.warpMesh=mesh;layer.warp=null;
  }
  return layer.warpMesh;
}
function warpDisplayPoints(layer){return ensureWarp(layer).points.map(p=>documentPointFromLayer(p,layer,doc.width,doc.height))}
function startWarpGesture(p,layer){
  const pts=warpDisplayPoints(layer),threshold=16/zoom;let best=-1,dist=Infinity;
  pts.forEach((q,i)=>{const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<dist){dist=d;best=i}});
  return dist<=threshold?{index:best}:null;
}
function updateWarpGesture(p){
  const a=active();if(!a||!warpGesture)return;const local=layerPointFromDocument(p,a,doc.width,doc.height),mesh=ensureWarp(a);mesh.points[warpGesture.index]={x:clamp(local.x,-doc.width*2,doc.width*3),y:clamp(local.y,-doc.height*2,doc.height*3)};
}
function drawWarpOverlay(){
  const a=active();if(!isVisual(a))return;const mesh=ensureWarp(a),pts=warpDisplayPoints(a),{cols,rows}=mesh,idx=(x,y)=>y*cols+x;octx.save();octx.strokeStyle='#ffcc66';octx.fillStyle='#10131a';octx.lineWidth=Math.max(1,1.2/zoom);
  for(let y=0;y<rows;y++){octx.beginPath();for(let x=0;x<cols;x++){const p=pts[idx(x,y)];x?octx.lineTo(p.x,p.y):octx.moveTo(p.x,p.y)}octx.stroke()}
  for(let x=0;x<cols;x++){octx.beginPath();for(let y=0;y<rows;y++){const p=pts[idx(x,y)];y?octx.lineTo(p.x,p.y):octx.moveTo(p.x,p.y)}octx.stroke()}
  for(let i=0;i<pts.length;i++){const p=pts[i];octx.beginPath();octx.arc(p.x,p.y,5.5/zoom,0,Math.PI*2);octx.fill();octx.stroke()}octx.restore();
}
$('#warpGrid').oninput=e=>{$('#warpGridValue').textContent=`${e.target.value}×${e.target.value}`;const a=active();if(isVisual(a)){a.warpGrid=Number(e.target.value);renderComposite();renderOverlay()}};
$('[data-action="init-warp"]').onclick=()=>{const a=active();if(!isVisual(a))return toast('Selecciona una capa visual');if(a.type==='tiled'&&viewportMode())return toast('Warp global sobre Tiled Layer gigante está bloqueado para evitar un canvas completo');a.warpMesh=identityWarpMesh(doc.width,doc.height,3,3);a.warp=null;setTool('warp');void markChange('Activar Warp Mesh')};
$('[data-action="reset-warp"]').onclick=()=>{const a=active();if(!isVisual(a))return;a.warp=null;a.warpMesh=null;renderAll();void markChange('Reset Warp')};
function perspectivePreset(dir){const a=active();if(!isVisual(a))return;const m=ensureWarp(a),amount=doc.width*.08;for(let y=0;y<m.rows;y++){const t=y/(m.rows-1),left=y*m.cols,right=left+m.cols-1;if(dir<0){m.points[left].x+=amount*(1-Math.abs(t-.5));m.points[right].x-=amount*.2*(1-Math.abs(t-.5))}else{m.points[right].x-=amount*(1-Math.abs(t-.5));m.points[left].x+=amount*.2*(1-Math.abs(t-.5))}}renderAll();void markChange('Perspectiva')}
$('[data-action="perspective-left"]').onclick=()=>perspectivePreset(-1);$('[data-action="perspective-right"]').onclick=()=>perspectivePreset(1);

async function initNeuralStatus(){
  const el=$('#neuralStatus');if(!el)return;try{const st=await neuralStatus();el.textContent=st.ready?`IA neuronal local lista · ${st.backend||'local'}`:'IA neuronal no disponible';el.classList.toggle('ready',!!st.ready)}catch(err){el.textContent='IA neuronal preparada · assets opcionales no instalados'}
}
$('[data-action="select-subject-ai"]').onclick=async()=>{
  const a=active();if(!isVisual(a)||a.locked)return toast('Selecciona una capa visual desbloqueada');if(a.type==='tiled'&&viewportMode())return toast('IA de máscara global desactivada en Tiled Layers gigantes; evita reconstruir la imagen completa');const btn=$('[data-action="select-subject-ai"]'),old=btn.textContent;btn.disabled=true;btn.textContent='Inferencia…';
  try{const src=doc.renderLayerSource(a),mask=await neuralSubjectMask(src);a.mask=mask;editMask=false;await markChange('Seleccionar sujeto IA');toast('Máscara neuronal aplicada localmente')}catch(err){console.error(err);toast(err?.message||'No se pudo ejecutar la IA local')}finally{btn.textContent=old;btn.disabled=false;void initNeuralStatus()}
};

function toneTarget(){const a=active();if(a?.type==='adjustment'){a.adjustments=ensureAdjustmentCurves(a.adjustments);return a.adjustments}destructiveAdjustments=ensureAdjustmentCurves(destructiveAdjustments);return destructiveAdjustments}
function renderHistogram(){const c=$('#histogramCanvas');if(!c)return;const ctx=c.getContext('2d'),hist=calculateHistogram(display,128),w=c.width,h=c.height,mode=$('#histogramMode')?.value||'rgb';ctx.clearRect(0,0,w,h);ctx.fillStyle='#080a0f';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#202635';ctx.lineWidth=1;for(let i=1;i<4;i++){const y=Math.round(i*h/4)+.5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}const plot=(arr,color,alpha=.6)=>{const max=Math.max(1,...arr);ctx.beginPath();ctx.moveTo(0,h);for(let i=0;i<arr.length;i++){const x=i/(arr.length-1)*(w-1),v=Math.sqrt(arr[i]/max),y=h-v*(h-3);ctx.lineTo(x,y)}ctx.lineTo(w,h);ctx.closePath();ctx.fillStyle=color.replace('1)',`${alpha})`);ctx.fill();ctx.strokeStyle=color;ctx.stroke()};if(mode==='rgb'){plot(hist.r,'rgba(255,95,120,1)',.2);plot(hist.g,'rgba(48,214,197,1)',.2);plot(hist.b,'rgba(124,92,255,1)',.2)}else if(mode==='r')plot(hist.r,'rgba(255,95,120,1)',.38);else if(mode==='g')plot(hist.g,'rgba(48,214,197,1)',.38);else if(mode==='b')plot(hist.b,'rgba(124,92,255,1)',.38);else plot(hist.luma,'rgba(143,227,255,1)',.38)}
function renderCurve(){const c=$('#curveCanvas');if(!c)return;const ctx=c.getContext('2d'),w=c.width,h=c.height,vals=selectedCurve(),ch=$('#curveChannel')?.value||'rgb',color={rgb:'#8fe3ff',r:'#ff5f78',g:'#30d6c5',b:'#7c5cff'}[ch];ctx.clearRect(0,0,w,h);ctx.fillStyle='#080a0f';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#202635';ctx.lineWidth=1;for(let i=1;i<4;i++){const x=i*w/4,y=i*h/4;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}ctx.strokeStyle='#475168';ctx.beginPath();ctx.moveTo(0,h-1);ctx.lineTo(w-1,0);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<5;i++){const x=i*(w-1)/4,y=(h-1)-(vals[i]/255)*(h-1);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();for(let i=0;i<5;i++){const x=i*(w-1)/4,y=(h-1)-(vals[i]/255)*(h-1);ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fillStyle=i===curveDrag?'#ffffff':color;ctx.fill();ctx.strokeStyle='#0b0d12';ctx.stroke()}}
function curveEventValue(ev){const c=$('#curveCanvas'),r=c.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width*c.width,y=(ev.clientY-r.top)/r.height*c.height,index=clamp(Math.round(x/(c.width-1)*4),0,4),value=clamp(Math.round(255*(1-y/(c.height-1))),0,255);return{index,value}}
const curveCanvas=$('#curveCanvas');curveCanvas.addEventListener('pointerdown',ev=>{try{curveCanvas.setPointerCapture(ev.pointerId)}catch{}const v=curveEventValue(ev);curveDrag=v.index;selectedCurve()[curveDrag]=v.value;syncLegacyRgbCurve();renderCurve();if(active()?.type==='adjustment'){renderComposite();renderHistogram()}});curveCanvas.addEventListener('pointermove',ev=>{if(curveDrag<0)return;const v=curveEventValue(ev);selectedCurve()[curveDrag]=v.value;syncLegacyRgbCurve();renderCurve();if(active()?.type==='adjustment'){renderComposite();renderHistogram()}});curveCanvas.addEventListener('pointerup',()=>{if(curveDrag<0)return;curveDrag=-1;renderCurve();if(active()?.type==='adjustment')void markChange('Editar curva por canal')});curveCanvas.addEventListener('pointercancel',()=>{curveDrag=-1;renderCurve()});let curveKeyboardIndex=2;curveCanvas.addEventListener('keydown',ev=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(ev.key))return;ev.preventDefault();if(ev.key==='ArrowLeft')curveKeyboardIndex=Math.max(0,curveKeyboardIndex-1);else if(ev.key==='ArrowRight')curveKeyboardIndex=Math.min(4,curveKeyboardIndex+1);else{const c=selectedCurve();if(ev.key==='ArrowUp')c[curveKeyboardIndex]=clamp(c[curveKeyboardIndex]+2,0,255);if(ev.key==='ArrowDown')c[curveKeyboardIndex]=clamp(c[curveKeyboardIndex]-2,0,255);if(ev.key==='Home')c[curveKeyboardIndex]=0;if(ev.key==='End')c[curveKeyboardIndex]=255;syncLegacyRgbCurve();if(active()?.type==='adjustment')void markChange('Editar curva con teclado')}curveDrag=curveKeyboardIndex;renderCurve();curveCanvas.setAttribute('aria-label',`Curva tonal · punto ${curveKeyboardIndex+1} de 5 · valor ${selectedCurve()[curveKeyboardIndex]}`)});curveCanvas.addEventListener('blur',()=>{curveDrag=-1;renderCurve()});
function syncLegacyRgbCurve(){const t=toneTarget();if(t.curves)t.curve=[...t.curves.rgb]}
$('#curveChannel').onchange=()=>renderCurve();
$('[data-action="reset-curve"]').onclick=()=>{const c=selectedCurve();c.splice(0,c.length,0,64,128,192,255);syncLegacyRgbCurve();renderCurve();if(active()?.type==='adjustment')void markChange('Reset curva por canal')};
$('[data-action="auto-levels"]').onclick=()=>{const source=isRaster(active())?active().canvas:display,hist=calculateHistogram(source),arr=hist.luma,total=arr.reduce((a,b)=>a+b,0);if(!total)return toast('No hay píxeles para analizar');const low=total*.005,high=total*.995;let acc=0,black=0,white=255;for(let i=0;i<256;i++){acc+=arr[i];if(acc>=low){black=i;break}}acc=0;for(let i=0;i<256;i++){acc+=arr[i];if(acc>=high){white=i;break}}const t=toneTarget();t.blackPoint=black;t.whitePoint=Math.max(black+1,white);t.gamma=1;syncInspectorForLayer();if(active()?.type==='adjustment')void markChange('Auto niveles');else toast('Auto niveles preparados · pulsa Aplicar a píxeles')};
async function initLocalCompute(){const el=$('#localComputeStatus');try{const cap=await detectLocalCompute();el.textContent=`WebGPU ${cap.webgpu?'disponible':'no disponible'} · WebAssembly ${cap.wasm?'disponible':'no disponible'} · recorte local activo`;el.title=cap.adapterName||''}catch{el.textContent='Recorte local activo · aceleración no detectada'}}
$('[data-action="remove-background"]').onclick=async()=>{const a=active();if(!['raster','smart'].includes(a?.type)||a.locked)return toast('Selecciona una capa raster o Smart desbloqueada');const btn=$('[data-action="remove-background"]');btn.disabled=true;const old=btn.textContent;btn.textContent='Analizando…';try{const generated=await removeBackgroundLocal(a,{tolerance:Number($('#bgTolerance').value),feather:Number($('#bgFeather').value)});if(a.mask){const ctx=a.mask.getContext('2d');ctx.save();ctx.globalCompositeOperation='destination-in';ctx.drawImage(generated,0,0);ctx.restore()}else a.mask=generated;editMask=false;await markChange('Eliminar fondo local');toast('Máscara de fondo creada')}catch(err){console.error(err);toast('No se pudo analizar el fondo')}finally{btn.textContent=old;btn.disabled=false;syncInspectorForLayer()}};

function cropDocument(r){
  const x=clamp(Math.round(r.x),0,doc.width-1),y=clamp(Math.round(r.y),0,doc.height-1),w=clamp(Math.round(r.w),1,doc.width-x),h=clamp(Math.round(r.h),1,doc.height-y);
  const advanced=l=>isVisual(l)&&(Math.abs(l.x||0)>.001||Math.abs(l.y||0)>.001||Math.abs(l.rotation||0)>.0001||Math.abs((l.scaleX||1)-1)>.0001||Math.abs((l.scaleY||1)-1)>.0001||!!l.mask||!!l.fx?.enabled||l.warp?.length===4||l.warpMesh?.points?.length>=4);
  if(viewportMode()&&doc.layers.some(l=>l.type==='tiled'&&advanced(l))){toast('Recorte bloqueado: una Tiled Layer gigante tiene transformaciones/máscaras. Rasteriza una región primero.');return false}
  let rasterized=0;for(const l of doc.layers){
    if(!isVisual(l))continue;
    if(advanced(l)){rasterized++;
      const c=doc.renderLayerRegion(l,{x,y,w,h},w,h);l.type='raster';l.canvas=c;l.tiled=undefined;l.text=undefined;l.shape=undefined;l.smart=undefined;l.mask=null;l.warp=undefined;l.warpMesh=undefined;l.fx=defaultLayerFx();l.x=l.y=l.rotation=0;l.scaleX=l.scaleY=1;continue
    }
    if(['raster','smart'].includes(l.type)&&l.canvas)l.canvas=cropCanvasRegion(l.canvas,x,y,w,h);
    else if(l.type==='tiled'&&l.tiled)l.tiled=cropTiledData(l.tiled,x,y,w,h);
    else if(l.type==='shape'&&l.shape){l.shape={...l.shape,x:(l.shape.x||0)-x,y:(l.shape.y||0)-y,points:Array.isArray(l.shape.points)?l.shape.points.map(p=>({x:p.x-x,y:p.y-y})):l.shape.points}}
    else if(l.type==='text'){l.x=(l.x||0)-x;l.y=(l.y||0)-y}
  }
  doc.width=w;doc.height=h;doc.guides.vertical=(doc.guides.vertical||[]).map(v=>v-x).filter(v=>v>=0&&v<=w);doc.guides.horizontal=(doc.guides.horizontal||[]).map(v=>v-y).filter(v=>v>=0&&v<=h);selection=null;syncCanvasSize();fitView();renderAll();if(rasterized)toast(`Recorte aplicado · ${rasterized} capa(s) transformada(s) rasterizadas para conservar su aspecto`);return true
}

function setColor(v){$('#toolColor').value=v;$('#mainColor').value=v;$('#hexColor').value=v}
$('#toolColor').oninput=e=>setColor(e.target.value);$('#mainColor').oninput=e=>setColor(e.target.value);$('#hexColor').onchange=e=>{if(/^#[0-9a-f]{6}$/i.test(e.target.value))setColor(e.target.value);else e.target.value=toolColor()};
$('#toolSize').oninput=e=>$('#toolSizeValue').textContent=e.target.value;$('#toolOpacity').oninput=e=>$('#toolOpacityValue').textContent=e.target.value+'%';$('#brushHardness').oninput=e=>$('#brushHardnessValue').textContent=e.target.value+'%';$('#brushFlow').oninput=e=>$('#brushFlowValue').textContent=e.target.value+'%';$('#brushSpacing').oninput=e=>$('#brushSpacingValue').textContent=e.target.value+'%';$('#selectionFeather').oninput=e=>$('#selectionFeatherValue').textContent=e.target.value+' px';$('#exportQuality').oninput=e=>$('#exportQualityValue').textContent=e.target.value+'%';$('#wandTolerance').oninput=e=>$('#wandToleranceValue').textContent=e.target.value;
$('#histogramMode').onchange=renderHistogram;
for(const id of ['bgTolerance','bgFeather'])$('#'+id).oninput=e=>e.target.nextElementSibling.value=e.target.value;
for(const id of ['brightness','contrast','saturation','blackPoint','gamma','whitePoint']){const input=$('#'+id);input.oninput=e=>{e.target.nextElementSibling.value=e.target.value;const t=toneTarget();t[id]=Number(e.target.value);if(active()?.type==='adjustment'){renderComposite();renderHistogram()}};input.onchange=()=>{if(active()?.type==='adjustment')void markChange('Editar capa de ajuste')}}

function resetSelectionState(){selection=null;selectionChanged()}
async function newDocument(w=1200,h=800,bg='transparent'){try{doc=new PixelDocument(w,h,bg);destructiveAdjustments=defaultAdjustments();dirty=false;showWelcome=false;editMask=false;cloneSource=null;history.limit=viewportMode()?6:32;await history.reset(doc);syncCanvasSize();fitView();selection=null;renderAll();scheduleAutosave();toast('Documento creado')}catch(err){console.error(err);toast('No se pudo crear el documento')}}
$$('[data-action="new"]').forEach(b=>b.onclick=()=>$('#newDialog').showModal());$('#createDoc').onclick=e=>{e.preventDefault();void newDocument(clamp(Number($('#newWidth').value)||1200,32,8192),clamp(Number($('#newHeight').value)||800,32,8192),$('#newBg').value);$('#newDialog').close()};
const imageFileInputs=$$('.image-file-input');imageFileInputs.forEach(input=>input.addEventListener('change',()=>{const f=input.files?.[0];if(f)void openImageFile(f);input.value=''}));
async function openImageFile(file){
  try{
    if(!file||file.size<=0)throw new Error('Archivo vacío');if(file.size>MAX_OPEN_FILE_BYTES)throw new Error('Archivo demasiado grande para abrirlo de forma segura');
    const ext=(file.name.split('.').pop()||'').toLowerCase();let openedLabel='Imagen abierta';
    if(ext==='psd'||ext==='psb'){
      const psd=await readPsdFile(file);doc=new PixelDocument(psd.width,psd.height,'transparent',false);
      for(const src of psd.layers){let l;if(src.tiled)l=doc.addTiledLayer(src.name||'Capa PSD',src.tiled);else{l=doc.addLayer(src.name||'Capa PSD','transparent');if(src.canvas)l.canvas.getContext('2d').drawImage(src.canvas,0,0)}l.opacity=src.opacity??1;l.visible=src.visible!==false;l.blend=src.blend||'source-over'}
      if(!doc.layers.length){if(psd.composite?.tiled)doc.addTiledLayer('PSD compuesto',psd.composite.tiled);else{const l=doc.addLayer('PSD compuesto','transparent');if(psd.composite?.canvas||psd.composite)l.canvas.getContext('2d').drawImage(psd.composite.canvas||psd.composite,0,0)}}
      doc.name=file.name.replace(/\.[^.]+$/,'');openedLabel=`${ext.toUpperCase()} importado · ${doc.layers.length} capas · ${psd.depth||8} bit`;
    }else if(isRawFile(file)){
      const decoded=await decodeRawFile(file),c=decoded.canvas;if(c.width*c.height>MAX_DOCUMENT_PIXELS)throw new Error('RAW supera el límite seguro de 120 MP');doc=new PixelDocument(c.width,c.height,'transparent',false);if(c.width*c.height>VIEWPORT_PIXEL_THRESHOLD||Math.max(c.width,c.height)>VIEWPORT_DIM_THRESHOLD)doc.addTiledLayer(file.name,await canvasToTiles(c,512));else{const l=doc.addLayer(file.name,'transparent');l.canvas.getContext('2d').drawImage(c,0,0)}doc.name=file.name.replace(/\.[^.]+$/,'');openedLabel=`RAW revelado localmente · ${decoded.metadata?.decoder||'decoder RAW'}${viewportMode()?' · tiled':''}`;
    }else{
      let dims=null;try{const bmp=await createImageBitmap(file);dims={width:bmp.width,height:bmp.height};bmp.close?.()}catch{}
      const pixels=(dims?.width||0)*(dims?.height||0);if(dims&&(pixels>MAX_DOCUMENT_PIXELS||dims.width>300000||dims.height>300000))throw new Error('Imagen fuera de los límites seguros');
      if(dims&&pixels>VIEWPORT_PIXEL_THRESHOLD){const tiled=await imageFileToTiles(file,512);doc=new PixelDocument(tiled.width,tiled.height,'transparent',false);doc.addTiledLayer(file.name,tiled);openedLabel='Imagen grande abierta directamente en tiles'}
      else{const c=await imageFileToCanvas(file);doc=new PixelDocument(c.width,c.height,'transparent');const l=doc.layers[0];l.name=file.name;l.canvas.getContext('2d').drawImage(c,0,0)}
      doc.name=file.name.replace(/\.[^.]+$/,'');
    }
    if(!doc.layers.length)doc.addTiledLayer('Vacía',{tileSize:512,width:doc.width,height:doc.height,tiles:[]});
    destructiveAdjustments=defaultAdjustments();dirty=false;showWelcome=false;editMask=false;selection=null;cloneSource=null;history.limit=viewportMode()?6:32;await history.reset(doc);syncCanvasSize();fitView();renderAll();scheduleAutosave();toast(openedLabel)
  }catch(err){console.error(err);toast(err?.message?`No se pudo abrir: ${err.message.slice(0,110)}`:'No se pudo abrir la imagen')}
}
stage.addEventListener('dragover',e=>{e.preventDefault();stage.classList.add('dragging')});stage.addEventListener('dragleave',()=>stage.classList.remove('dragging'));stage.addEventListener('drop',e=>{e.preventDefault();stage.classList.remove('dragging');const f=[...e.dataTransfer.files].find(f=>f.type.startsWith('image/')||/\.(psd|psb|cr2|cr3|nef|arw|dng|raf|orf|rw2|pef|srw)$/i.test(f.name));if(f)void openImageFile(f)});window.addEventListener('paste',e=>{const f=[...e.clipboardData.files].find(f=>f.type.startsWith('image/'));if(f)void openImageFile(f)});

$('[data-action="add-layer"]').onclick=()=>{const a=active(),parent=a?.type==='group'?a.id:a?.parentId??null;viewportMode()?doc.addTiledLayer(`Capa tiled ${doc.layers.length+1}`,{tileSize:512,width:doc.width,height:doc.height,tiles:[]},parent):doc.addLayer(undefined,'transparent',parent);editMask=false;void markChange('Nueva capa')};$('[data-action="add-group"]').onclick=()=>{const current=active(),parent=current?.parentId??null,g=doc.addGroup('Grupo',parent);if(current&&current.id!==g.id)current.parentId=g.id;editMask=false;void markChange('Crear grupo')};$('[data-action="make-smart"]').onclick=()=>{if(doc.convertToSmart()){editMask=false;void markChange('Convertir a Smart Layer')}else toast('Selecciona una capa raster')};$('[data-action="rasterize-layer"]').onclick=()=>{if(active()?.type==='tiled'&&viewportMode())return toast('Rasterizar una Tiled Layer gigante agotaría memoria; exporta una copia o trabaja por tiles');if(doc.rasterize()){editMask=false;void markChange('Rasterizar capa')}else toast('Esta capa ya es raster')};$('[data-action="duplicate-layer"]').onclick=()=>{doc.duplicateLayer();editMask=false;void markChange('Duplicar capa')};$('[data-action="delete-layer"]').onclick=()=>{if(doc.removeLayer()){editMask=false;void markChange('Eliminar capa')}else toast('Debe quedar al menos una capa')};
$('#layerOpacity').onchange=e=>{const a=active();if(!a)return;a.opacity=Number(e.target.value)/100;void markChange('Opacidad de capa')};$('#blendMode').onchange=e=>{const a=active();if(!a)return;a.blend=e.target.value;void markChange('Modo de fusión')};
$('[data-action="add-mask"]').onclick=()=>{if(active()?.type==='tiled'&&viewportMode())return toast('Las máscaras globales de Tiled Layers gigantes están desactivadas por seguridad de memoria');if(doc.addMask()){editMask=true;setColor('#000000');void markChange('Añadir máscara')}};$('[data-action="remove-mask"]').onclick=()=>{if(doc.removeMask()){editMask=false;void markChange('Quitar máscara')}};$('[data-action="toggle-mask-edit"]').onclick=()=>{if(active()?.mask){editMask=!editMask;renderAll()}};

$('[data-action="add-adjustment"]').onclick=()=>{const src=ensureAdjustmentCurves(toneTarget()),adjustments={...src,curve:[...src.curve],curves:{rgb:[...src.curves.rgb],r:[...src.curves.r],g:[...src.curves.g],b:[...src.curves.b]}};{const a=active(),parent=a?.type==='group'?a.id:a?.parentId??null;doc.addAdjustmentLayer('Ajuste tonal',adjustments,parent);}editMask=false;void markChange('Capa de ajuste')};
$('[data-action="apply-adjustments"]').onclick=()=>{const l=active();if(!isRaster(l)||l.locked)return toast('Selecciona una capa de píxeles desbloqueada');applyAdjustments(l.canvas,{...destructiveAdjustments,curve:[...destructiveAdjustments.curve]},selectionForLayer(l));resetAdjustments();void markChange('Ajustes destructivos')};
function resetAdjustments(){destructiveAdjustments=defaultAdjustments();syncInspectorForLayer();renderCurve(destructiveAdjustments.curve)}$('[data-action="reset-adjustments"]').onclick=()=>{if(active()?.type==='adjustment'){active().adjustments=defaultAdjustments();void markChange('Reset capa de ajuste')}else resetAdjustments();renderComposite();renderHistogram()};
$$('[data-filter]').forEach(b=>b.onclick=()=>{const l=active();if(!isRaster(l)||l.locked)return toast('Selecciona una capa de píxeles desbloqueada');applyFilter(l.canvas,b.dataset.filter,selectionForLayer(l));void markChange(`Filtro ${b.dataset.filter}`)});

function updateTransformFromInputs(){const a=active();if(!isVisual(a)||a.locked)return;a.x=Number($('#transformX').value)||0;a.y=Number($('#transformY').value)||0;a.scaleX=(Number($('#transformScaleX').value)||100)/100;a.scaleY=(Number($('#transformScaleY').value)||100)/100;a.rotation=(Number($('#transformRotation').value)||0)*Math.PI/180;void markChange('Transformación numérica')}
for(const id of ['transformX','transformY','transformScaleX','transformScaleY','transformRotation'])$('#'+id).onchange=updateTransformFromInputs;
$('[data-action="reset-transform"]').onclick=()=>{const a=active();if(!isVisual(a))return;a.x=a.y=a.rotation=0;a.scaleX=a.scaleY=1;void markChange('Reset transformación')};$('[data-action="flip-x"]').onclick=()=>{const a=active();if(!isVisual(a))return;a.scaleX*=-1;void markChange('Voltear horizontal')};$('[data-action="flip-y"]').onclick=()=>{const a=active();if(!isVisual(a))return;a.scaleY*=-1;void markChange('Voltear vertical')};


const BRUSH_PRESETS={hard:{size:24,hardness:100,flow:100,spacing:22},soft:{size:48,hardness:15,flow:45,spacing:18},pencil:{size:4,hardness:100,flow:100,spacing:14},ink:{size:12,hardness:92,flow:100,spacing:12},marker:{size:36,hardness:70,flow:35,spacing:16},airbrush:{size:70,hardness:0,flow:18,spacing:12},pixel:{size:8,hardness:100,flow:100,spacing:100}};
$('#brushPreset').onchange=e=>{const p=BRUSH_PRESETS[e.target.value];if(!p)return;$('#toolSize').value=p.size;$('#toolSizeValue').textContent=p.size;$('#brushHardness').value=p.hardness;$('#brushHardnessValue').textContent=p.hardness+'%';$('#brushFlow').value=p.flow;$('#brushFlowValue').textContent=p.flow+'%';$('#brushSpacing').value=p.spacing;$('#brushSpacingValue').textContent=p.spacing+'%'};
function snapLayerOffset(x,y){if(doc.grid.snap===false)return{x,y};const threshold=10/zoom,snap=(coord,axis,max)=>{const candidates=[0,max/2,max,...(doc.guides?.[axis]||[])];if(doc.grid.enabled){const size=Math.max(4,Number(doc.grid.size)||50);candidates.push(Math.round(coord/size)*size)}let best=coord,dist=threshold;for(const c of candidates){const d=Math.abs(coord-c);if(d<dist){dist=d;best=c}}return best};return{x:snap(doc.width/2+x,'vertical',doc.width)-doc.width/2,y:snap(doc.height/2+y,'horizontal',doc.height)-doc.height/2}}
function drawGuidesOverlay(){octx.save();const lw=Math.max(.6,1/zoom);if(doc.grid?.enabled){const size=Math.max(4,Number(doc.grid.size)||50);octx.strokeStyle='rgba(120,130,160,.22)';octx.lineWidth=lw;for(let x=size;x<doc.width&&x/size<300;x+=size){octx.beginPath();octx.moveTo(x,0);octx.lineTo(x,doc.height);octx.stroke()}for(let y=size;y<doc.height&&y/size<300;y+=size){octx.beginPath();octx.moveTo(0,y);octx.lineTo(doc.width,y);octx.stroke()}}octx.strokeStyle='rgba(48,214,197,.9)';octx.lineWidth=lw;for(const x of doc.guides?.vertical||[]){octx.beginPath();octx.moveTo(x,0);octx.lineTo(x,doc.height);octx.stroke()}for(const y of doc.guides?.horizontal||[]){octx.beginPath();octx.moveTo(0,y);octx.lineTo(doc.width,y);octx.stroke()}octx.restore()}
$('[data-action="guide-v-center"]').onclick=()=>{doc.guides.vertical=[...new Set([...(doc.guides.vertical||[]),Math.round(doc.width/2)])];void markChange('Guía vertical')};
$('[data-action="guide-h-center"]').onclick=()=>{doc.guides.horizontal=[...new Set([...(doc.guides.horizontal||[]),Math.round(doc.height/2)])];void markChange('Guía horizontal')};
$('[data-action="clear-guides"]').onclick=()=>{doc.guides={vertical:[],horizontal:[]};void markChange('Limpiar guías')};
$('#snapEnabled').onchange=e=>{doc.grid.snap=e.target.checked;void markChange('Snapping')};$('#gridEnabled').onchange=e=>{doc.grid.enabled=e.target.checked;void markChange('Rejilla')};$('#gridSize').onchange=e=>{doc.grid.size=clamp(Number(e.target.value)||50,4,500);void markChange('Tamaño de rejilla')};
function renderHistory(){const el=$('#historyList');if(!el)return;el.innerHTML='';history.entries().slice().reverse().forEach((entry,revIndex)=>{const idx=history.undoStack.length-1-revIndex,b=document.createElement('button');b.className='history-entry'+(entry.current?' current':'');b.innerHTML=`<span class="history-dot"></span><span>${escapeHtml(entry.label)}</span>`;b.onclick=async()=>{if(idx===history.undoStack.length-1)return;const target=history.undoStack[idx];history.undoStack=history.undoStack.slice(0,idx+1);history.redoStack=[];doc=await PixelDocument.fromSnapshot(target.snap);editMask=false;selection=null;selectionEdges=[];syncCanvasSize();renderAll();scheduleAutosave();toast(`Historial: ${target.label}`)};el.appendChild(b)})}
$('[data-action="snapshot-history"]').onclick=async()=>{await history.push(doc,'Snapshot manual');renderHistory();toast('Snapshot creado')};
const textBindings={textContent:'content',textFont:'fontFamily',textSize:'fontSize',textWeight:'fontWeight',textAlign:'align',textColor:'color',textTracking:'letterSpacing'};for(const [id,key] of Object.entries(textBindings)){const el=$('#'+id);el.oninput=()=>{const a=active();if(a?.type!=='text')return;a.text[key]=['fontSize','fontWeight','letterSpacing'].includes(key)?Number(el.value):el.value;renderComposite();renderOverlay()};el.onchange=()=>{if(active()?.type==='text')void markChange('Editar texto')}}
const shapeBindings={shapeKind:['kind','value'],shapeFill:['fill','value'],shapeStroke:['stroke','value'],shapeStrokeWidth:['strokeWidth','number'],shapeRadius:['radius','number']};for(const [id,[key,kind]] of Object.entries(shapeBindings)){const el=$('#'+id);const update=()=>{const a=active();if(a?.type!=='shape')return;a.shape={...defaultShapeStyle(),...a.shape};a.shape[key]=kind==='number'?Number(el.value):el.value;renderComposite();renderOverlay()};el.oninput=update;el.onchange=()=>{update();if(active()?.type==='shape')void markChange('Editar Shape Layer')}}
const fxBindings={fxEnabled:['enabled','checked'],fxShadow:['shadow','checked'],fxShadowBlur:['shadowBlur','number'],fxShadowX:['shadowX','number'],fxShadowY:['shadowY','number'],fxGlow:['glow','checked'],fxGlowBlur:['glowBlur','number'],fxStroke:['stroke','checked'],fxStrokeSize:['strokeSize','number'],fxStrokeColor:['strokeColor','value'],fxGlowColor:['glowColor','value']};for(const [id,[key,kind]] of Object.entries(fxBindings)){const el=$('#'+id);const update=()=>{const a=active();if(!isVisual(a))return;a.fx={...defaultLayerFx(),...a.fx};a.fx[key]=kind==='checked'?el.checked:kind==='number'?Number(el.value):el.value;renderComposite();renderOverlay()};el.oninput=update;el.onchange=()=>{update();if(isVisual(active()))void markChange('Layer FX')}}
function syncExportMeta(){const w=Number($('#exportWidth').value)||doc.width,h=Number($('#exportHeight').value)||doc.height,mobile=matchMedia('(max-width:760px),(pointer:coarse)').matches,maxPixels=mobile?MAX_EXPORT_PIXELS_MOBILE:MAX_EXPORT_PIXELS_DESKTOP,mp=(w*h/1_000_000).toFixed(1),est=Math.round(w*h*4/1024/1024);$('#exportMeta').textContent=`${w} × ${h}px · ${mp} MP · ~${est} MB RGBA${w*h>maxPixels?' · SUPERA EL LÍMITE SEGURO':' · copia escalada'}`}
const exportPresets={instagram:[1080,1080],story:[1080,1920],youtube:[1280,720],iphone:[1290,2796],fhd:[1920,1080]};$('#exportPreset').onchange=e=>{const p=exportPresets[e.target.value];if(p){$('#exportWidth').value=p[0];$('#exportHeight').value=p[1]}syncExportMeta()};$('#exportWidth').oninput=()=>{$('#exportPreset').value='custom';syncExportMeta()};$('#exportHeight').oninput=()=>{$('#exportPreset').value='custom';syncExportMeta()};

$('[data-action="fit"]').onclick=fitView;$('[data-action="actual-size"]').onclick=()=>{zoom=1;pan={x:0,y:0};renderTransform();refreshViewport();renderOverlay()};
$('[data-action="undo"]').onclick=async()=>{const prev=await history.undo();if(prev){doc=prev;editMask=false;selection=null;selectionEdges=[];syncCanvasSize();renderAll();scheduleAutosave();toast('Deshacer')}};$('[data-action="redo"]').onclick=async()=>{const next=await history.redo();if(next){doc=next;editMask=false;selection=null;selectionEdges=[];syncCanvasSize();renderAll();scheduleAutosave();toast('Rehacer')}};

$('[data-action="save-project"]').onclick=async()=>{const btn=$('[data-action="save-project"]'),old=btn.textContent;btn.disabled=true;btn.textContent='Guardando…';try{const data=await doc.snapshot(),blob=new Blob([JSON.stringify({format:'PixelForge404',version:6,document:data})],{type:'application/json'});downloadBlob(blob,`${doc.name||'proyecto'}.p404`);dirty=false;toast('Proyecto guardado')}catch(err){console.error(err);toast('No se pudo guardar el proyecto')}finally{btn.disabled=false;btn.textContent=old}};
const projectInput=$('#projectInput');projectInput.addEventListener('change',async()=>{const f=projectInput.files?.[0];if(!f)return;try{if(f.size>512*1024*1024)throw new Error('Proyecto demasiado grande');const data=JSON.parse(await f.text());if(data.format!=='PixelForge404'||!data.document)throw new Error('Formato inválido');doc=await PixelDocument.fromSnapshot(data.document);destructiveAdjustments=defaultAdjustments();dirty=false;showWelcome=false;editMask=false;selection=null;history.limit=viewportMode()?6:32;await history.reset(doc);syncCanvasSize();fitView();renderAll();scheduleAutosave();toast(`Proyecto v${data.version||1} cargado`)}catch(err){console.error(err);toast('Proyecto no válido')}projectInput.value=''});
$('[data-action="export"]').onclick=()=>{syncExportMeta();$('#exportDialog').showModal()};$('#doExport').onclick=e=>{e.preventDefault();const w=clamp(Number($('#exportWidth').value)||doc.width,1,16384),h=clamp(Number($('#exportHeight').value)||doc.height,1,16384),mobile=matchMedia('(max-width:760px),(pointer:coarse)').matches,maxPixels=mobile?MAX_EXPORT_PIXELS_MOBILE:MAX_EXPORT_PIXELS_DESKTOP;if(w*h>maxPixels)return toast(`Exportación demasiado grande · máximo seguro ${Math.floor(maxPixels/1_000_000)} MP en este dispositivo`);try{const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(!ctx)throw new Error('Canvas no disponible');if($('#exportFormat').value==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h)}doc.compositeRegion(c,{x:0,y:0,w:doc.width,h:doc.height});c.toBlob(blob=>{if(!blob)return toast('No se pudo codificar la imagen');const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[$('#exportFormat').value];downloadBlob(blob,`${doc.name||'pixelforge'}-${w}x${h}.${ext}`);toast('Imagen exportada')},$('#exportFormat').value,Number($('#exportQuality').value)/100);$('#exportDialog').close()}catch(err){console.error(err);toast('Exportación cancelada por límite del navegador')}};
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

window.addEventListener('keydown',e=>{const tag=e.target.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;const k=e.key.toLowerCase();if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();(e.shiftKey?$('[data-action="redo"]'):$('[data-action="undo"]')).click();return}if((e.ctrlKey||e.metaKey)&&k==='s'){e.preventDefault();$('[data-action="save-project"]').click();return}if((e.ctrlKey||e.metaKey)&&k==='a'){e.preventDefault();$('[data-action="select-all"]').click();return}if((e.ctrlKey||e.metaKey)&&k==='d'){e.preventDefault();$('[data-action="deselect"]').click();return}const map={v:'move',f:'transform',p:'warp',u:'vectorShape',m:'selectRect',o:'selectEllipse',q:'lasso',w:'wand',b:'brush',e:'eraser',g:'gradient',s:'clone',j:'heal',l:'line',r:'rect',t:'text',i:'eyedropper',c:'crop',h:'hand',z:'zoom'};if(map[k])setTool(map[k])});
function setInspectorOpen(open){const panel=$('#inspectorPanel'),backdrop=$('#inspectorBackdrop'),btn=$('[data-action="inspector"]');panel.classList.toggle('open',open);backdrop.hidden=!open;btn?.setAttribute('aria-expanded',String(open));if(open&&matchMedia('(max-width:760px)').matches)panel.querySelector('button,input,select,textarea')?.focus({preventScroll:true})}
$('[data-action="inspector"]').setAttribute('aria-expanded','false');$('[data-action="inspector"]').onclick=()=>setInspectorOpen(!$('#inspectorPanel').classList.contains('open'));$('[data-action="close-inspector"]').onclick=()=>setInspectorOpen(false);$('#inspectorBackdrop').onclick=()=>setInspectorOpen(false);window.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#inspectorPanel').classList.contains('open'))setInspectorOpen(false)});window.addEventListener('resize',()=>{if(innerWidth>760)setInspectorOpen(false);if(viewportMode())syncCanvasSize();renderTransform();refreshViewport();renderOverlay()});window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});

function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open('PixelForge404',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('state'))req.result.createObjectStore('state',{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function idbGet(id){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('state','readonly'),req=tx.objectStore('state').get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close()})}
async function idbPut(value){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(value);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)})}
async function idbDelete(id){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').delete(id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)})}
function scheduleAutosave(){clearTimeout(autosaveTimer);$('#autosaveStatus').textContent='Cambios pendientes…';autosaveTimer=setTimeout(()=>void saveAutosave(),viewportMode()?2800:900)}
async function saveAutosave(){try{const snapshot=await doc.snapshot();await idbPut({id:'latest',savedAt:Date.now(),document:snapshot});$('#autosaveStatus').textContent='Guardado local';$('#autosaveStatus').title=new Date().toLocaleString()}catch(err){console.error(err);$('#autosaveStatus').textContent='Autoguardado no disponible'}}
async function checkRestore(){try{restorable=await idbGet('latest');if(!restorable?.document)return;const when=new Date(restorable.savedAt);$('#restoreMeta').textContent=`${restorable.document.name||'Proyecto'} · ${restorable.document.width}×${restorable.document.height} · ${when.toLocaleString()}`;$('#restoreDialog').showModal()}catch(err){console.warn('No se pudo comprobar el autoguardado',err)}}
$('#restoreSession').onclick=async e=>{e.preventDefault();if(!restorable)return;try{doc=await PixelDocument.fromSnapshot(restorable.document);destructiveAdjustments=defaultAdjustments();showWelcome=false;dirty=false;selection=null;editMask=false;history.limit=viewportMode()?6:32;await history.reset(doc);syncCanvasSize();fitView();renderAll();$('#restoreDialog').close();toast('Sesión recuperada')}catch(err){console.error(err);toast('No se pudo recuperar la sesión')}};
$('#discardRestore').onclick=()=>{void idbDelete('latest');restorable=null};

function verifyUiBindings(){
  const missing=[];
  for(const el of $$('[data-action]'))if(typeof el.onclick!=='function')missing.push(`acción:${el.dataset.action}`);
  for(const el of $$('[data-tool]'))if(typeof el.onclick!=='function')missing.push(`herramienta:${el.dataset.tool}`);
  for(const el of $$('[data-filter]'))if(typeof el.onclick!=='function')missing.push(`filtro:${el.dataset.filter}`);
  for(const [id,prop] of [['createDoc','onclick'],['doExport','onclick'],['restoreSession','onclick'],['discardRestore','onclick']]){
    const el=$('#'+id);if(!el||typeof el[prop]!=='function')missing.push(`${id}:${prop}`);
  }
  if(!imageFileInputs.length||imageFileInputs.some(el=>!el.matches('input[type=\"file\"]')))missing.push('image-file-input');
  if(!projectInput||!projectInput.matches('input[type=\"file\"]'))missing.push('projectInput');
  if(missing.length)throw new Error(`Controles sin enlazar: ${[...new Set(missing)].slice(0,12).join(', ')}`);
  return true;
}

async function startApp(){
  try{
    history.limit=viewportMode()?6:32;
    await history.reset(doc);
    syncCanvasSize();
    fitView();
    renderAll();
    verifyUiBindings();
    if(!marchTimer)marchTimer=setInterval(()=>{if(selection){marchOffset=(marchOffset+1)%12;renderOverlay()}},180);
    void checkRestore();
    void initLocalCompute();
    void initNeuralStatus();
    if('serviceWorker' in navigator&&location.protocol.startsWith('http')){
      navigator.serviceWorker.register('./sw.js').then(()=>{
        if(!crossOriginIsolated){
          const reload=()=>{if(sessionStorage.getItem('pf404-coi-reload')==='1')return;sessionStorage.setItem('pf404-coi-reload','1');location.reload()};
          if(navigator.serviceWorker.controller)setTimeout(reload,180);else navigator.serviceWorker.addEventListener('controllerchange',reload,{once:true});
        }else sessionStorage.removeItem('pf404-coi-reload');
      }).catch(err=>console.warn('Service Worker no disponible',err));
    }
    document.documentElement.dataset.appReady='true';
  }catch(err){
    console.error('PixelForge no pudo inicializarse',err);
    document.documentElement.dataset.appReady='false';
    toast('Error al iniciar PixelForge · revisa la consola');
  }
}

void startApp();
