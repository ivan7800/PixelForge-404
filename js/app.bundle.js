/* PixelForge 404 standalone bundle - generated from audited modules. */
(()=>{
'use strict';
const PFEngine=(()=>{
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const uid=()=>globalThis.crypto?.randomUUID?.()||`id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const cloneCanvas=src=>{const c=makeCanvas(src.width,src.height);c.getContext('2d').drawImage(src,0,0);return c};
const VISUAL_TYPES=new Set(['raster','smart','text','shape','tiled']);
const defaultAdjustments=()=>({brightness:0,contrast:0,saturation:0,blackPoint:0,gamma:1,whitePoint:255,curve:[0,64,128,192,255],curves:{rgb:[0,64,128,192,255],r:[0,64,128,192,255],g:[0,64,128,192,255],b:[0,64,128,192,255]}});
const defaultLayerFx=()=>({enabled:false,shadow:false,shadowColor:'#000000',shadowOpacity:.55,shadowBlur:18,shadowX:8,shadowY:10,glow:false,glowColor:'#7c5cff',glowOpacity:.55,glowBlur:20,stroke:false,strokeColor:'#ffffff',strokeSize:2});
const defaultTextStyle=()=>({content:'Texto',fontFamily:'system-ui',fontSize:72,fontWeight:700,fontStyle:'normal',color:'#f5f7ff',align:'left',lineHeight:1.15,letterSpacing:0});
const defaultShapeStyle=()=>({kind:'rect',x:120,y:120,width:360,height:240,radius:24,fill:'#7c5cff',stroke:'#f5f7ff',strokeWidth:3,points:[]});
const identityWarp=(w=1,h=1)=>[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
const identityWarpMesh=(w=1,h=1,cols=3,rows=3)=>({cols,rows,points:Array.from({length:cols*rows},(_,i)=>{const x=i%cols,y=Math.floor(i/cols);return{x:x/(cols-1)*w,y:y/(rows-1)*h}})});

function baseLayer(type,name){return{id:uid(),type,name,parentId:null,visible:true,locked:false,opacity:1,blend:'source-over',x:0,y:0,scaleX:1,scaleY:1,rotation:0,mask:null,fx:defaultLayerFx()}}

class PixelDocument{
  constructor(width=1200,height=800,bg='transparent',initialize=true){
    this.width=width;this.height=height;this.layers=[];this.activeLayerId=null;this.name='Sin título';
    this.guides={vertical:[],horizontal:[]};this.grid={enabled:false,size:50,snap:true};
    if(initialize)this.addLayer('Fondo',bg);
  }
  createCanvas(){return makeCanvas(this.width,this.height)}
  makeRasterLayer(name=`Capa ${this.layers.length+1}`,fill='transparent'){
    const canvas=this.createCanvas(),ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(fill!=='transparent'){ctx.fillStyle=fill;ctx.fillRect(0,0,this.width,this.height)}
    return {...baseLayer('raster',name),canvas};
  }
  addLayer(name=`Capa ${this.layers.length+1}`,fill='transparent',parentId=null){const layer=this.makeRasterLayer(name,fill);layer.parentId=parentId;this.layers.push(layer);this.activeLayerId=layer.id;return layer}
  addSmartLayer(name='Smart Layer',canvas=null,parentId=null){const layer={...baseLayer('smart',name),canvas:canvas?cloneCanvas(canvas):this.createCanvas(),smart:{sourceName:name,createdAt:Date.now()}};layer.parentId=parentId;this.layers.push(layer);this.activeLayerId=layer.id;return layer}
  addTextLayer(name='Texto',text={},position={x:0,y:0},parentId=null){const layer={...baseLayer('text',name),canvas:null,text:{...defaultTextStyle(),...text}};layer.parentId=parentId;layer.x=Number(position.x)||0;layer.y=Number(position.y)||0;this.layers.push(layer);this.activeLayerId=layer.id;return layer}
  addShapeLayer(name='Forma',shape={},parentId=null){const layer={...baseLayer('shape',name),canvas:null,shape:{...defaultShapeStyle(),...shape}};layer.parentId=parentId;this.layers.push(layer);this.activeLayerId=layer.id;return layer}
  addTiledLayer(name='Tiled Layer',tiled={},parentId=null){const layer={...baseLayer('tiled',name),canvas:null,tiled:{tileSize:512,width:this.width,height:this.height,tiles:[],...tiled}};layer.parentId=parentId;this.layers.push(layer);this.activeLayerId=layer.id;return layer}
  addGroup(name='Grupo',parentId=null){const layer={...baseLayer('group',name),canvas:null,expanded:true};layer.parentId=parentId;this.layers.push(layer);this.activeLayerId=layer.id;return layer}
  addAdjustmentLayer(name='Ajuste',adjustments={},parentId=null){const layer={...baseLayer('adjustment',name),canvas:null,adjustments:normalizeAdjustments(adjustments)};layer.parentId=parentId;this.layers.push(layer);this.activeLayerId=layer.id;return layer}
  get activeLayer(){return this.layers.find(l=>l.id===this.activeLayerId)||this.layers.at(-1)}
  childrenOf(parentId=null){return this.layers.filter(l=>(l.parentId??null)===(parentId??null))}
  descendantsOf(id){const result=[];const walk=pid=>{for(const l of this.childrenOf(pid)){result.push(l);if(l.type==='group')walk(l.id)}};walk(id);return result}
  removeLayer(id=this.activeLayerId){if(this.layers.length<=1)return false;const i=this.layers.findIndex(l=>l.id===id);if(i<0)return false;const layer=this.layers[i];if(layer.type==='group'){for(const child of this.childrenOf(layer.id))child.parentId=layer.parentId??null}this.layers.splice(i,1);this.activeLayerId=this.layers[Math.max(0,i-1)]?.id||this.layers.at(-1)?.id;return true}
  duplicateLayer(id=this.activeLayerId){
    const src=this.layers.find(l=>l.id===id);if(!src)return null;const idMap=new Map();
    const cloneOne=s=>{const n=cloneLayerData(s);n.id=uid();n.name=`${s.name} copia`;idMap.set(s.id,n.id);return n};
    const clones=[cloneOne(src)];if(src.type==='group')for(const d of this.descendantsOf(src.id))clones.push(cloneOne(d));
    for(const c of clones){const original=[src,...this.descendantsOf(src.id)].find(x=>idMap.get(x.id)===c.id);if(original?.parentId&&idMap.has(original.parentId))c.parentId=idMap.get(original.parentId)}
    const subtreeIds=new Set([src.id,...this.descendantsOf(src.id).map(x=>x.id)]);let insertAt=Math.max(...[...subtreeIds].map(x=>this.layers.findIndex(l=>l.id===x)))+1;this.layers.splice(insertAt,0,...clones);this.activeLayerId=clones[0].id;return clones[0]
  }
  addMask(id=this.activeLayerId,fill='white'){const layer=this.layers.find(l=>l.id===id);if(!layer||!VISUAL_TYPES.has(layer.type))return false;const mask=this.createCanvas(),ctx=mask.getContext('2d',{willReadFrequently:true});if(fill==='white'){ctx.fillStyle='#fff';ctx.fillRect(0,0,this.width,this.height)}layer.mask=mask;return true}
  removeMask(id=this.activeLayerId){const l=this.layers.find(x=>x.id===id);if(!l?.mask)return false;l.mask=null;return true}
  convertToSmart(id=this.activeLayerId){const l=this.layers.find(x=>x.id===id);if(!l||l.type!=='raster')return false;l.type='smart';l.smart={sourceName:l.name,createdAt:Date.now()};return true}
  rasterize(id=this.activeLayerId){const l=this.layers.find(x=>x.id===id);if(!l||!VISUAL_TYPES.has(l.type)||l.type==='raster')return false;const rendered=this.renderLayer(l);l.type='raster';l.canvas=rendered;l.text=undefined;l.smart=undefined;l.mask=null;l.fx=defaultLayerFx();l.x=l.y=l.rotation=0;l.scaleX=l.scaleY=1;return true}
  composite(target){const ctx=target.getContext('2d');ctx.clearRect(0,0,target.width,target.height);this.#compositeLevel(target,null)}
  #compositeLevel(target,parentId){for(const layer of this.childrenOf(parentId)){if(!layer.visible)continue;if(layer.type==='group'){const groupCanvas=makeCanvas(target.width,target.height);this.#compositeLevel(groupCanvas,layer.id);const tctx=target.getContext('2d');tctx.save();tctx.globalAlpha=layer.opacity;tctx.globalCompositeOperation=layer.blend;tctx.drawImage(groupCanvas,0,0);tctx.restore();continue}if(layer.type==='adjustment'){this.#applyAdjustmentComposite(target,layer);continue}const rendered=this.renderLayer(layer);const tctx=target.getContext('2d');tctx.save();tctx.globalAlpha=layer.opacity;tctx.globalCompositeOperation=layer.blend;tctx.drawImage(rendered,0,0);tctx.restore()}}
  compositeRegion(target,region={x:0,y:0,w:this.width,h:this.height}){const r=normalizeRegion(region,this.width,this.height),ctx=target.getContext('2d');ctx.clearRect(0,0,target.width,target.height);this.#compositeRegionLevel(target,null,r)}
  #compositeRegionLevel(target,parentId,region){for(const layer of this.childrenOf(parentId)){if(!layer.visible)continue;if(layer.type==='group'){const groupCanvas=makeCanvas(target.width,target.height);this.#compositeRegionLevel(groupCanvas,layer.id,region);const tctx=target.getContext('2d');tctx.save();tctx.globalAlpha=layer.opacity;tctx.globalCompositeOperation=layer.blend;tctx.drawImage(groupCanvas,0,0);tctx.restore();continue}if(layer.type==='adjustment'){applyAdjustmentToSizedComposite(target,layer);continue}const rendered=renderLayerRegionCanvas(this,layer,region,target.width,target.height),tctx=target.getContext('2d');tctx.save();tctx.globalAlpha=layer.opacity;tctx.globalCompositeOperation=layer.blend;tctx.drawImage(rendered,0,0);tctx.restore()}}
  renderLayerSource(layer){if(layer.type==='text')return renderTextCanvas(layer,this.width,this.height);if(layer.type==='shape')return renderShapeCanvas(layer,this.width,this.height);if(layer.type==='tiled')return renderTiledCanvas(layer,this.width,this.height);if(layer.canvas)return cloneCanvas(layer.canvas);return this.createCanvas()}
  renderLayerThumbnail(layer,maxW=84,maxH=64){return renderLayerRegionCanvas(this,layer,{x:0,y:0,w:this.width,h:this.height},maxW,maxH,{thumbnail:true})}
  renderLayerRegion(layer,region,outW=Math.max(1,Math.round(region.w)),outH=Math.max(1,Math.round(region.h))){return renderLayerRegionCanvas(this,layer,normalizeRegion(region,this.width,this.height),outW,outH)}
  renderLayer(layer){let source=this.renderLayerSource(layer);if(layer.warpMesh?.points?.length>=4)source=warpCanvasMesh(source,layer.warpMesh,this.width,this.height);else if(layer.warp?.length===4)source=warpCanvasToQuad(source,layer.warp,this.width,this.height,Math.max(8,Number(layer.warpGrid)||18));const out=this.createCanvas(),ctx=out.getContext('2d');drawLayerTransformed(ctx,source,layer,this.width,this.height);if(layer.mask){let maskSource=layer.mask;if(layer.warpMesh?.points?.length>=4)maskSource=warpCanvasMesh(maskSource,layer.warpMesh,this.width,this.height);else if(layer.warp?.length===4)maskSource=warpCanvasToQuad(maskSource,layer.warp,this.width,this.height,Math.max(8,Number(layer.warpGrid)||18));const mask=this.createCanvas(),mctx=mask.getContext('2d');drawLayerTransformed(mctx,maskSource,layer,this.width,this.height);ctx.save();ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);ctx.restore()}return applyLayerEffects(out,layer.fx,this.width,this.height)}
  #applyAdjustmentComposite(target,layer){applyAdjustmentToSizedComposite(target,layer)}
  resize(width,height){const oldW=this.width,oldH=this.height;this.width=width;this.height=height;for(const l of this.layers){if(l.canvas){const c=makeCanvas(width,height);c.getContext('2d').drawImage(l.canvas,0,0,oldW,oldH,0,0,oldW,oldH);l.canvas=c}if(l.mask){const m=makeCanvas(width,height);m.getContext('2d').drawImage(l.mask,0,0,oldW,oldH,0,0,oldW,oldH);l.mask=m}}this.guides.vertical=this.guides.vertical.filter(x=>x<=width);this.guides.horizontal=this.guides.horizontal.filter(y=>y<=height)}
  async snapshot(){return{width:this.width,height:this.height,name:this.name,activeLayerId:this.activeLayerId,guides:this.guides,grid:this.grid,layers:await Promise.all(this.layers.map(async l=>{const tiled=l.tiled?{...l.tiled,tiles:await Promise.all((l.tiled.tiles||[]).map(async t=>({x:t.x,y:t.y,w:t.w,h:t.h,dataURL:t.canvas?(t._dataURLCache||(t._dataURLCache=await canvasToDataURL(t.canvas))):t.dataURL||null})))}:undefined;return{...l,fx:{...defaultLayerFx(),...l.fx},text:l.text?{...defaultTextStyle(),...l.text}:undefined,shape:l.shape?{...defaultShapeStyle(),...l.shape}:undefined,tiled,adjustments:l.adjustments?normalizeAdjustments(l.adjustments):undefined,canvas:l.canvas?await canvasToDataURL(l.canvas):null,mask:l.mask?await canvasToDataURL(l.mask):null}}))}}
  static async fromSnapshot(data){if(!data||!Number.isInteger(data.width)||!Number.isInteger(data.height)||!Array.isArray(data.layers))throw new Error('Snapshot inválido');if(data.width<1||data.height<1||data.width>300000||data.height>300000||data.width*data.height>120_000_000)throw new Error('Documento fuera de los límites seguros');if(data.layers.length>1000)throw new Error('Demasiadas capas en el proyecto');const doc=new PixelDocument(data.width,data.height,'transparent',false);doc.name=String(data.name||'Proyecto').slice(0,160);doc.activeLayerId=data.activeLayerId;doc.guides={vertical:[...(data.guides?.vertical||[])],horizontal:[...(data.guides?.horizontal||[])]};doc.grid={enabled:!!data.grid?.enabled,size:clamp(Number(data.grid?.size)||50,4,500),snap:data.grid?.snap!==false};doc.layers=[];for(const raw of data.layers){const type=raw.type||'raster';let canvas=null,mask=null,tiled=raw.tiled?{...raw.tiled,tiles:[]}:undefined;if(['raster','smart'].includes(type)){canvas=makeCanvas(doc.width,doc.height);if(raw.canvas)await drawDataURL(canvas,raw.canvas)}if(type==='tiled'&&raw.tiled){for(const rt of raw.tiled.tiles||[]){const c=makeCanvas(rt.w||raw.tiled.tileSize||512,rt.h||raw.tiled.tileSize||512);if(rt.dataURL)await drawDataURL(c,rt.dataURL);tiled.tiles.push({...rt,canvas:c})}}if(raw.mask){mask=makeCanvas(doc.width,doc.height);await drawDataURL(mask,raw.mask)}doc.layers.push({...raw,type,parentId:raw.parentId??null,canvas,mask,tiled,scaleX:Number.isFinite(raw.scaleX)?raw.scaleX:1,scaleY:Number.isFinite(raw.scaleY)?raw.scaleY:1,rotation:Number.isFinite(raw.rotation)?raw.rotation:0,x:Number.isFinite(raw.x)?raw.x:0,y:Number.isFinite(raw.y)?raw.y:0,fx:{...defaultLayerFx(),...raw.fx},text:type==='text'?{...defaultTextStyle(),...raw.text}:undefined,shape:type==='shape'?{...defaultShapeStyle(),...raw.shape}:undefined,adjustments:type==='adjustment'?normalizeAdjustments(raw.adjustments):undefined})}if(!doc.layers.length)doc.addLayer('Fondo','transparent');if(!doc.layers.some(l=>l.id===doc.activeLayerId))doc.activeLayerId=doc.layers.at(-1)?.id;return doc}
}


function normalizeRegion(region,w,h){const x=Number(region?.x)||0,y=Number(region?.y)||0,rw=Math.max(1,Number(region?.w)||w),rh=Math.max(1,Number(region?.h)||h);return{x,y,w:rw,h:rh}}
function setRegionTransform(ctx,region,outW,outH){const sx=outW/region.w,sy=outH/region.h;ctx.setTransform(sx,0,0,sy,-region.x*sx,-region.y*sy)}
function applyLayerTransformToContext(ctx,layer,w,h){ctx.translate(w/2+(layer.x||0),h/2+(layer.y||0));ctx.rotate(layer.rotation||0);ctx.scale(layer.scaleX||1,layer.scaleY||1);ctx.translate(-w/2,-h/2)}
function regionInLayerSpace(region,layer,w,h){const pts=[{x:region.x,y:region.y},{x:region.x+region.w,y:region.y},{x:region.x+region.w,y:region.y+region.h},{x:region.x,y:region.y+region.h}].map(p=>layerPointFromDocument(p,layer,w,h));return{x:Math.min(...pts.map(p=>p.x)),y:Math.min(...pts.map(p=>p.y)),r:Math.max(...pts.map(p=>p.x)),b:Math.max(...pts.map(p=>p.y))}}
function drawShapePath(ctx,s){ctx.beginPath();if(s.kind==='ellipse')ctx.ellipse(s.x+s.width/2,s.y+s.height/2,Math.abs(s.width/2),Math.abs(s.height/2),0,0,Math.PI*2);else if(s.kind==='line'){ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+s.width,s.y+s.height)}else if(s.kind==='polygon'&&Array.isArray(s.points)&&s.points.length>1){ctx.moveTo(s.points[0].x,s.points[0].y);for(const p of s.points.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath()}else{const r=Math.max(0,Math.min(Number(s.radius)||0,Math.abs(s.width)/2,Math.abs(s.height)/2));if(ctx.roundRect)ctx.roundRect(s.x,s.y,s.width,s.height,r);else ctx.rect(s.x,s.y,s.width,s.height)}}
function drawShapeDirect(ctx,layer){const s={...defaultShapeStyle(),...layer.shape};ctx.save();ctx.fillStyle=s.fill||'transparent';ctx.strokeStyle=s.stroke||'transparent';ctx.lineWidth=Math.max(0,Number(s.strokeWidth)||0);drawShapePath(ctx,s);if(s.kind!=='line'&&s.fill&&s.fill!=='transparent')ctx.fill();if(s.strokeWidth>0&&s.stroke&&s.stroke!=='transparent')ctx.stroke();ctx.restore()}
function drawTextDirect(ctx,layer){const t={...defaultTextStyle(),...layer.text};ctx.save();ctx.fillStyle=t.color;ctx.textBaseline='top';ctx.textAlign=t.align;ctx.font=`${t.fontStyle} ${t.fontWeight} ${Math.max(4,t.fontSize)}px ${safeFont(t.fontFamily)}`;const lines=String(t.content??'').split('\n'),measure=line=>ctx.measureText(line).width+Math.max(0,line.length-1)*(t.letterSpacing||0),maxWidth=Math.max(1,...lines.map(measure)),x=t.align==='center'?maxWidth/2:t.align==='right'?maxWidth:0;let y=0;for(const line of lines){if(t.letterSpacing)drawSpacedText(ctx,line,x,y,t.letterSpacing,t.align);else ctx.fillText(line,x,y);y+=t.fontSize*t.lineHeight}ctx.restore()}
function drawTiledDirect(ctx,layer,localRegion=null){for(const tile of layer.tiled?.tiles||[]){if(localRegion&&(tile.x+tile.w<localRegion.x||tile.y+tile.h<localRegion.y||tile.x>localRegion.r||tile.y>localRegion.b))continue;if(tile.canvas)ctx.drawImage(tile.canvas,tile.x,tile.y);else if(tile._img?.complete)ctx.drawImage(tile._img,tile.x,tile.y)}}
function drawLayerDirectRegion(ctx,doc,layer,region,outW,outH){ctx.save();setRegionTransform(ctx,region,outW,outH);applyLayerTransformToContext(ctx,layer,doc.width,doc.height);if(layer.type==='tiled')drawTiledDirect(ctx,layer,regionInLayerSpace(region,layer,doc.width,doc.height));else if(layer.type==='text')drawTextDirect(ctx,layer);else if(layer.type==='shape')drawShapeDirect(ctx,layer);else if(layer.canvas)ctx.drawImage(layer.canvas,0,0);ctx.restore()}
function renderLayerRegionCanvas(doc,layer,region,outW,outH,options={}){const out=makeCanvas(outW,outH);if(layer.warpMesh?.points?.length>=4||layer.warp?.length===4){const full=doc.renderLayer(layer),ctx=out.getContext('2d');ctx.drawImage(full,region.x,region.y,region.w,region.h,0,0,outW,outH);return out}drawLayerDirectRegion(out.getContext('2d'),doc,layer,region,outW,outH);if(layer.mask){const mask=makeCanvas(outW,outH),mctx=mask.getContext('2d');mctx.save();setRegionTransform(mctx,region,outW,outH);applyLayerTransformToContext(mctx,layer,doc.width,doc.height);mctx.drawImage(layer.mask,0,0);mctx.restore();const ctx=out.getContext('2d');ctx.save();ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);ctx.restore()}return applyLayerEffects(out,layer.fx,outW,outH)}
function applyAdjustmentToSizedComposite(target,layer){const source=cloneCanvas(target),adjusted=makeCanvas(target.width,target.height),actx=adjusted.getContext('2d');actx.filter=adjustmentFilter(layer.adjustments);actx.drawImage(source,0,0);actx.filter='none';applyToneControls(adjusted,layer.adjustments);const tctx=target.getContext('2d');if(layer.opacity>=.999&&layer.blend==='source-over'){tctx.clearRect(0,0,target.width,target.height);tctx.drawImage(adjusted,0,0);return}tctx.save();tctx.globalAlpha=layer.opacity;tctx.globalCompositeOperation=layer.blend;tctx.drawImage(adjusted,0,0);tctx.restore()}

function cloneLayerData(src){return{...src,fx:{...defaultLayerFx(),...src.fx},text:src.text?{...src.text}:undefined,shape:src.shape?{...src.shape,points:Array.isArray(src.shape.points)?src.shape.points.map(p=>({...p})):[]}:undefined,smart:src.smart?{...src.smart}:undefined,tiled:src.tiled?{...src.tiled,tiles:(src.tiled.tiles||[]).map(t=>({...t,canvas:t.canvas?cloneCanvas(t.canvas):null}))}:undefined,adjustments:src.adjustments?normalizeAdjustments(src.adjustments):undefined,canvas:src.canvas?cloneCanvas(src.canvas):null,mask:src.mask?cloneCanvas(src.mask):null}}
function normalizeCurves(curves,legacy){const lin=[0,64,128,192,255],src=curves||{};return{rgb:normalizeCurve(src.rgb||legacy||lin),r:normalizeCurve(src.r||lin),g:normalizeCurve(src.g||lin),b:normalizeCurve(src.b||lin)}}
function normalizeAdjustments(a={}){const base=defaultAdjustments();return{...base,...a,curve:normalizeCurve(a.curve),curves:normalizeCurves(a.curves,a.curve)}}
function renderShapeCanvas(layer,w,h){const c=makeCanvas(w,h),ctx=c.getContext('2d'),s={...defaultShapeStyle(),...layer.shape};ctx.save();ctx.fillStyle=s.fill||'transparent';ctx.strokeStyle=s.stroke||'transparent';ctx.lineWidth=Math.max(0,Number(s.strokeWidth)||0);ctx.beginPath();if(s.kind==='ellipse')ctx.ellipse(s.x+s.width/2,s.y+s.height/2,Math.abs(s.width/2),Math.abs(s.height/2),0,0,Math.PI*2);else if(s.kind==='line'){ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+s.width,s.y+s.height)}else if(s.kind==='polygon'&&Array.isArray(s.points)&&s.points.length>1){ctx.moveTo(s.points[0].x,s.points[0].y);for(const p of s.points.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath()}else{const r=Math.max(0,Math.min(Number(s.radius)||0,Math.abs(s.width)/2,Math.abs(s.height)/2));if(ctx.roundRect)ctx.roundRect(s.x,s.y,s.width,s.height,r);else ctx.rect(s.x,s.y,s.width,s.height)}if(s.kind!=='line'&&s.fill&&s.fill!=='transparent')ctx.fill();if(s.strokeWidth>0&&s.stroke&&s.stroke!=='transparent')ctx.stroke();ctx.restore();return c}
function renderTiledCanvas(layer,w,h){const c=makeCanvas(w,h),ctx=c.getContext('2d');for(const tile of layer.tiled?.tiles||[]){if(tile.canvas)ctx.drawImage(tile.canvas,tile.x,tile.y);else if(tile.dataURL){const img=tile._img;if(img?.complete)ctx.drawImage(img,tile.x,tile.y)}}return c}
function renderTextCanvas(layer,w,h){const c=makeCanvas(w,h),ctx=c.getContext('2d'),t={...defaultTextStyle(),...layer.text};ctx.save();ctx.fillStyle=t.color;ctx.textBaseline='top';ctx.textAlign=t.align;ctx.font=`${t.fontStyle} ${t.fontWeight} ${Math.max(4,t.fontSize)}px ${safeFont(t.fontFamily)}`;const lines=String(t.content??'').split('\n'),measure=line=>ctx.measureText(line).width+Math.max(0,line.length-1)*(t.letterSpacing||0),maxWidth=Math.max(1,...lines.map(measure)),x=t.align==='center'?maxWidth/2:t.align==='right'?maxWidth:0;let y=0;for(const line of lines){if(t.letterSpacing){drawSpacedText(ctx,line,x,y,t.letterSpacing,t.align)}else ctx.fillText(line,x,y);y+=t.fontSize*t.lineHeight}ctx.restore();return c}
function safeFont(font){return String(font||'system-ui').replace(/[;{}]/g,'')}
function drawSpacedText(ctx,text,x,y,spacing,align){const widths=[...text].map(ch=>ctx.measureText(ch).width),total=widths.reduce((a,b)=>a+b,0)+Math.max(0,text.length-1)*spacing;let px=align==='center'?x-total/2:align==='right'?x-total:x;const prev=ctx.textAlign;ctx.textAlign='left';[...text].forEach((ch,i)=>{ctx.fillText(ch,px,y);px+=widths[i]+spacing});ctx.textAlign=prev}
function tintCanvas(src,color){const c=makeCanvas(src.width,src.height),ctx=c.getContext('2d');ctx.drawImage(src,0,0);ctx.globalCompositeOperation='source-in';ctx.fillStyle=color;ctx.fillRect(0,0,c.width,c.height);return c}
function applyLayerEffects(src,fx,w,h){const f={...defaultLayerFx(),...fx};if(!f.enabled||(!f.shadow&&!f.glow&&!f.stroke))return src;const out=makeCanvas(w,h),ctx=out.getContext('2d');if(f.shadow){ctx.save();ctx.globalAlpha=f.shadowOpacity;ctx.shadowColor=f.shadowColor;ctx.shadowBlur=f.shadowBlur;ctx.shadowOffsetX=f.shadowX;ctx.shadowOffsetY=f.shadowY;ctx.drawImage(tintCanvas(src,f.shadowColor),0,0);ctx.restore()}if(f.glow){ctx.save();ctx.globalAlpha=f.glowOpacity;ctx.shadowColor=f.glowColor;ctx.shadowBlur=f.glowBlur;ctx.drawImage(tintCanvas(src,f.glowColor),0,0);ctx.restore()}if(f.stroke&&f.strokeSize>0){const colored=tintCanvas(src,f.strokeColor),s=Math.max(1,Math.round(f.strokeSize));ctx.save();for(let y=-s;y<=s;y++)for(let x=-s;x<=s;x++)if(x*x+y*y<=s*s)ctx.drawImage(colored,x,y);ctx.restore()}ctx.drawImage(src,0,0);return out}

function drawLayerTransformed(ctx,canvas,layer,w,h){if(!canvas)return;ctx.save();ctx.translate(w/2+(layer.x||0),h/2+(layer.y||0));ctx.rotate(layer.rotation||0);ctx.scale(layer.scaleX||1,layer.scaleY||1);ctx.translate(-w/2,-h/2);ctx.drawImage(canvas,0,0);ctx.restore()}
function layerPointFromDocument(point,layer,w,h){let x=point.x-(w/2+(layer.x||0)),y=point.y-(h/2+(layer.y||0));const r=-(layer.rotation||0),cr=Math.cos(r),sr=Math.sin(r),rx=x*cr-y*sr,ry=x*sr+y*cr;return{x:rx/(layer.scaleX||1)+w/2,y:ry/(layer.scaleY||1)+h/2}}
function documentPointFromLayer(point,layer,w,h){let x=(point.x-w/2)*(layer.scaleX||1),y=(point.y-h/2)*(layer.scaleY||1);const r=layer.rotation||0,cr=Math.cos(r),sr=Math.sin(r);return{x:x*cr-y*sr+w/2+(layer.x||0),y:x*sr+y*cr+h/2+(layer.y||0)}}
function getAlphaBounds(canvas){if(!canvas)return null;const ctx=canvas.getContext('2d',{willReadFrequently:true}),{width:w,height:h}=canvas,data=ctx.getImageData(0,0,w,h).data;let minX=w,minY=h,maxX=-1,maxY=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(data[(y*w+x)*4+3]>5){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}}return maxX<0?null:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}}
function transformedBounds(layer,w,h,doc=null){if(!layer||layer.type==='group'||layer.type==='adjustment')return null;let source=layer.canvas;if(['text','shape'].includes(layer.type)&&doc)source=doc.renderLayerThumbnail(layer,256,256);const b=layer.type==='tiled'?{x:0,y:0,w,h}:(source?getAlphaBounds(source):null)||{x:0,y:0,w,h},pts=[{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}].map(p=>documentPointFromLayer(p,layer,w,h));return{points:pts,center:documentPointFromLayer({x:b.x+b.w/2,y:b.y+b.h/2},layer,w,h),local:b}}

function adjustmentFilter({brightness=0,contrast=0,saturation=0}={}){return `brightness(${Math.max(0,100+(Number(brightness)||0))}%) contrast(${Math.max(0,100+(Number(contrast)||0))}%) saturate(${Math.max(0,100+(Number(saturation)||0))}%)`}
function canvasToDataURL(canvas,type='image/png',quality=.92){return Promise.resolve(canvas.toDataURL(type,quality))}
function drawDataURL(canvas,url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{canvas.getContext('2d').drawImage(img,0,0);resolve()};img.onerror=reject;img.src=url})}
async function imageFileToCanvas(file){try{if('createImageBitmap'in window){const bitmap=await createImageBitmap(file);const c=makeCanvas(bitmap.width,bitmap.height);c.getContext('2d').drawImage(bitmap,0,0);bitmap.close?.();return c}}catch{}const url=URL.createObjectURL(file);try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const c=makeCanvas(img.naturalWidth,img.naturalHeight);c.getContext('2d').drawImage(img,0,0);resolve(c)};img.onerror=reject;img.src=url})}finally{URL.revokeObjectURL(url)}}
async function imageFileToTiles(file,tileSize=512){const bmp=await createImageBitmap(file),tiles=[];try{for(let y=0;y<bmp.height;y+=tileSize)for(let x=0;x<bmp.width;x+=tileSize){const w=Math.min(tileSize,bmp.width-x),h=Math.min(tileSize,bmp.height-y),c=makeCanvas(w,h);c.getContext('2d').drawImage(bmp,x,y,w,h,0,0,w,h);tiles.push({x,y,w,h,canvas:c})}return{tileSize,width:bmp.width,height:bmp.height,tiles}}finally{bmp.close?.()}}

class HistoryManager{constructor(limit=32){this.limit=limit;this.undoStack=[];this.redoStack=[];this.suspended=false}async push(doc,label='Cambio'){if(this.suspended)return;const snap=await doc.snapshot();this.undoStack.push({label,snap,at:Date.now()});if(this.undoStack.length>this.limit)this.undoStack.shift();this.redoStack=[]}async undo(){if(this.undoStack.length<=1)return null;const cur=this.undoStack.pop();this.redoStack.push(cur);return PixelDocument.fromSnapshot(this.undoStack.at(-1).snap)}async redo(){if(!this.redoStack.length)return null;const next=this.redoStack.pop();this.undoStack.push(next);return PixelDocument.fromSnapshot(next.snap)}async reset(doc){this.undoStack=[];this.redoStack=[];await this.push(doc,'Inicio')}entries(){return this.undoStack.map((e,i)=>({label:e.label,at:e.at,current:i===this.undoStack.length-1}))}}

function normalizeCurve(curve){const fallback=[0,64,128,192,255];if(!Array.isArray(curve)||curve.length!==5)return fallback;return curve.map((v,i)=>clamp(Number.isFinite(Number(v))?Number(v):fallback[i],0,255))}
function curveValue(v,curve){const c=normalizeCurve(curve),x=clamp(v,0,255),seg=Math.min(3,Math.floor(x/64)),x0=seg*64,x1=seg===3?255:(seg+1)*64,t=(x-x0)/(x1-x0||1);return c[seg]+(c[seg+1]-c[seg])*t}
function levelValue(v,black=0,gamma=1,white=255){const b=clamp(Number(black)||0,0,254),w=clamp(Number(white)||255,b+1,255),g=clamp(Number(gamma)||1,.1,5),n=clamp((v-b)/(w-b),0,1);return 255*Math.pow(n,1/g)}
function applyToneControls(canvas,opts={},selection=null){const {blackPoint=0,gamma=1,whitePoint=255}=opts,curves=normalizeCurves(opts.curves,opts.curve),ctx=canvas.getContext('2d',{willReadFrequently:true}),img=ctx.getImageData(0,0,canvas.width,canvas.height),d=img.data,original=selection?new Uint8ClampedArray(d):null;for(let i=0,p=0;i<d.length;i+=4,p++){const mix=selection?selection[p]/255:1;if(!mix)continue;for(let c=0;c<3;c++){let v=levelValue(d[i+c],blackPoint,gamma,whitePoint);v=curveValue(v,curves.rgb);v=curveValue(v,[curves.r,curves.g,curves.b][c]);d[i+c]=original?original[i+c]+(v-original[i+c])*mix:v}}ctx.putImageData(img,0,0);return canvas}
function applyAdjustments(canvas,opts={},selection=null){const {brightness=0,contrast=0,saturation=0,blackPoint=0,gamma=1,whitePoint=255}=opts,curves=normalizeCurves(opts.curves,opts.curve),ctx=canvas.getContext('2d',{willReadFrequently:true}),img=ctx.getImageData(0,0,canvas.width,canvas.height),d=img.data,original=new Uint8ClampedArray(d),bv=Number(brightness)*2.55,cv=(259*(Number(contrast)+255))/(255*(259-Number(contrast))),sat=(Number(saturation)+100)/100;for(let i=0,p=0;i<d.length;i+=4,p++){const mix=selection?selection[p]/255:1;if(!mix)continue;let r=d[i]+bv,g=d[i+1]+bv,b=d[i+2]+bv;r=cv*(r-128)+128;g=cv*(g-128)+128;b=cv*(b-128)+128;const gray=.299*r+.587*g+.114*b;r=gray+(r-gray)*sat;g=gray+(g-gray)*sat;b=gray+(b-gray)*sat;const vals=[r,g,b];for(let c=0;c<3;c++){let v=levelValue(vals[c],blackPoint,gamma,whitePoint);v=curveValue(v,curves.rgb);v=curveValue(v,[curves.r,curves.g,curves.b][c]);d[i+c]=original[i+c]+(clamp(v,0,255)-original[i+c])*mix}}ctx.putImageData(img,0,0)}
function applyFilter(canvas,type,selection=null){const original=cloneCanvas(canvas),filtered=cloneCanvas(canvas),ctx=filtered.getContext('2d',{willReadFrequently:true});if(type==='blur'){const temp=cloneCanvas(filtered);ctx.clearRect(0,0,filtered.width,filtered.height);ctx.filter='blur(4px)';ctx.drawImage(temp,0,0);ctx.filter='none'}else if(type==='pixelate'){const temp=makeCanvas(1,1),scale=Math.max(1,Math.floor(Math.min(filtered.width,filtered.height)/80));temp.width=Math.max(1,Math.floor(filtered.width/scale));temp.height=Math.max(1,Math.floor(filtered.height/scale));const t=temp.getContext('2d');t.imageSmoothingEnabled=false;t.drawImage(filtered,0,0,temp.width,temp.height);ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,filtered.width,filtered.height);ctx.drawImage(temp,0,0,temp.width,temp.height,0,0,filtered.width,filtered.height);ctx.imageSmoothingEnabled=true}else{const img=ctx.getImageData(0,0,filtered.width,filtered.height),d=img.data;if(type==='sharpen')sharpen(ctx,img,filtered.width,filtered.height);else if(type==='denoise')denoise(ctx,img,filtered.width,filtered.height);else{for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];if(type==='grayscale'){const v=.299*r+.587*g+.114*b;d[i]=d[i+1]=d[i+2]=v}else if(type==='sepia'){d[i]=clamp(.393*r+.769*g+.189*b,0,255);d[i+1]=clamp(.349*r+.686*g+.168*b,0,255);d[i+2]=clamp(.272*r+.534*g+.131*b,0,255)}else if(type==='invert'){d[i]=255-r;d[i+1]=255-g;d[i+2]=255-b}}ctx.putImageData(img,0,0)}}if(!selection){canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);canvas.getContext('2d').drawImage(filtered,0,0);return}const out=canvas.getContext('2d',{willReadFrequently:true}),a=original.getContext('2d').getImageData(0,0,canvas.width,canvas.height),b=filtered.getContext('2d').getImageData(0,0,canvas.width,canvas.height),d=a.data;for(let i=0,p=0;i<d.length;i+=4,p++){const mix=selection[p]/255;if(!mix)continue;for(let c=0;c<4;c++)d[i+c]=d[i+c]+(b.data[i+c]-d[i+c])*mix}out.putImageData(a,0,0)}
function sharpen(ctx,img,w,h){const src=img.data,out=new Uint8ClampedArray(src),k=[0,-1,0,-1,5,-1,0,-1,0];for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){for(let c=0;c<3;c++){let sum=0,ki=0;for(let ky=-1;ky<=1;ky++)for(let kx=-1;kx<=1;kx++)sum+=src[((y+ky)*w+(x+kx))*4+c]*k[ki++];out[(y*w+x)*4+c]=clamp(sum,0,255)}}ctx.putImageData(new ImageData(out,w,h),0,0)}
function denoise(ctx,img,w,h){const src=img.data,out=new Uint8ClampedArray(src);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=(y*w+x)*4,l=p-4,r=p+4,u=p-w*4,d=p+w*4;for(let c=0;c<3;c++)out[p+c]=(src[p+c]*4+src[l+c]+src[r+c]+src[u+c]+src[d+c])/8}ctx.putImageData(new ImageData(out,w,h),0,0)}
function calculateHistogram(canvas,bins=256){const data=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data,r=new Uint32Array(bins),g=new Uint32Array(bins),b=new Uint32Array(bins),luma=new Uint32Array(bins),scale=(bins-1)/255;for(let i=0;i<data.length;i+=4){if(data[i+3]===0)continue;const ri=Math.round(data[i]*scale),gi=Math.round(data[i+1]*scale),bi=Math.round(data[i+2]*scale),li=Math.round((.299*data[i]+.587*data[i+1]+.114*data[i+2])*scale);r[ri]++;g[gi]++;b[bi]++;luma[li]++}return{r,g,b,luma,max:Math.max(1,...luma)}}
function featherSelectionMask(mask,w,h,radius=0){const r=clamp(Math.round(Number(radius)||0),0,80);if(!r)return new Uint8Array(mask);const src=makeCanvas(w,h),sctx=src.getContext('2d'),img=sctx.createImageData(w,h);for(let p=0,i=0;p<mask.length;p++,i+=4){img.data[i]=img.data[i+1]=img.data[i+2]=255;img.data[i+3]=mask[p]}sctx.putImageData(img,0,0);const out=makeCanvas(w,h),octx=out.getContext('2d');octx.filter=`blur(${r}px)`;octx.drawImage(src,0,0);octx.filter='none';const d=octx.getImageData(0,0,w,h).data,result=new Uint8Array(w*h);for(let p=0,i=3;p<result.length;p++,i+=4)result[p]=d[i];return result}
function createBackgroundRemovalMask(canvas,{tolerance=28,feather=2}={}){const w=canvas.width,h=canvas.height,ctx=canvas.getContext('2d',{willReadFrequently:true}),data=ctx.getImageData(0,0,w,h).data,total=w*h,visited=new Uint8Array(total),background=new Uint8Array(total),queue=new Int32Array(total);let head=0,tail=0;const sample=[],sx=Math.max(1,Math.floor(w/32)),sy=Math.max(1,Math.floor(h/32));for(let x=0;x<w;x+=sx){sample.push(x,(h-1)*w+x)}for(let y=0;y<h;y+=sy){sample.push(y*w,y*w+w-1)}let rr=0,gg=0,bb=0,aa=0,n=0;for(const p of sample){const i=p*4;if(data[i+3]<8)continue;rr+=data[i];gg+=data[i+1];bb+=data[i+2];aa+=data[i+3];n++}const ref=n?[rr/n,gg/n,bb/n,aa/n]:[255,255,255,255],maxDist=18+clamp(Number(tolerance)||0,0,100)*3.8,neighborLimit=Math.max(20,maxDist*.42),distRef=p=>{const i=p*4;return Math.hypot(data[i]-ref[0],data[i+1]-ref[1],data[i+2]-ref[2],(data[i+3]-ref[3])*.25)},distPair=(a,b)=>{const i=a*4,j=b*4;return Math.hypot(data[i]-data[j],data[i+1]-data[j+1],data[i+2]-data[j+2])},seed=p=>{if(visited[p])return;visited[p]=1;if(data[p*4+3]<8||distRef(p)<=maxDist){background[p]=1;queue[tail++]=p}};for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x)}for(let y=0;y<h;y++){seed(y*w);seed(y*w+w-1)}while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w),neighbors=[];if(x>0)neighbors.push(p-1);if(x<w-1)neighbors.push(p+1);if(y>0)neighbors.push(p-w);if(y<h-1)neighbors.push(p+w);for(const q of neighbors){if(visited[q])continue;visited[q]=1;if(data[q*4+3]<8||(distRef(q)<=maxDist*1.35&&distPair(p,q)<=neighborLimit)){background[q]=1;queue[tail++]=q}}}const mask=new Uint8Array(total);for(let p=0;p<total;p++)mask[p]=background[p]?0:255;const softened=featherSelectionMask(mask,w,h,feather),out=makeCanvas(w,h),octx=out.getContext('2d'),img=octx.createImageData(w,h);for(let p=0,i=0;p<softened.length;p++,i+=4){img.data[i]=img.data[i+1]=img.data[i+2]=255;img.data[i+3]=softened[p]}octx.putImageData(img,0,0);return out}


function warpCanvasMesh(source,mesh,outW=source.width,outH=source.height){
  const cols=Math.max(2,Math.round(mesh?.cols||3)),rows=Math.max(2,Math.round(mesh?.rows||3)),pts=mesh?.points;
  if(!Array.isArray(pts)||pts.length!==cols*rows)return cloneCanvas(source);
  const out=makeCanvas(outW,outH),ctx=out.getContext('2d');
  function tri(s0,s1,s2,d0,d1,d2){const den=s0.x*(s1.y-s2.y)+s1.x*(s2.y-s0.y)+s2.x*(s0.y-s1.y);if(Math.abs(den)<1e-8)return;const a=(d0.x*(s1.y-s2.y)+d1.x*(s2.y-s0.y)+d2.x*(s0.y-s1.y))/den,b=(d0.y*(s1.y-s2.y)+d1.y*(s2.y-s0.y)+d2.y*(s0.y-s1.y))/den,c=(d0.x*(s2.x-s1.x)+d1.x*(s0.x-s2.x)+d2.x*(s1.x-s0.x))/den,d=(d0.y*(s2.x-s1.x)+d1.y*(s0.x-s2.x)+d2.y*(s1.x-s0.x))/den,e=(d0.x*(s1.x*s2.y-s2.x*s1.y)+d1.x*(s2.x*s0.y-s0.x*s2.y)+d2.x*(s0.x*s1.y-s1.x*s0.y))/den,f=(d0.y*(s1.x*s2.y-s2.x*s1.y)+d1.y*(s2.x*s0.y-s0.x*s2.y)+d2.y*(s0.x*s1.y-s1.x*s0.y))/den;ctx.save();ctx.beginPath();ctx.moveTo(d0.x,d0.y);ctx.lineTo(d1.x,d1.y);ctx.lineTo(d2.x,d2.y);ctx.closePath();ctx.clip();ctx.setTransform(a,b,c,d,e,f);ctx.drawImage(source,0,0);ctx.restore()}
  const idx=(x,y)=>y*cols+x;
  for(let y=0;y<rows-1;y++)for(let x=0;x<cols-1;x++){
    const sx0=x/(cols-1)*source.width,sx1=(x+1)/(cols-1)*source.width,sy0=y/(rows-1)*source.height,sy1=(y+1)/(rows-1)*source.height;
    const s00={x:sx0,y:sy0},s10={x:sx1,y:sy0},s11={x:sx1,y:sy1},s01={x:sx0,y:sy1};
    const d00=pts[idx(x,y)],d10=pts[idx(x+1,y)],d11=pts[idx(x+1,y+1)],d01=pts[idx(x,y+1)];
    tri(s00,s10,s11,d00,d10,d11);tri(s00,s11,s01,d00,d11,d01);
  }
  ctx.setTransform(1,0,0,1,0,0);return out;
}
function warpCanvasToQuad(source,quad,outW=source.width,outH=source.height,grid=18){const out=makeCanvas(outW,outH),ctx=out.getContext('2d'),q=(quad&&quad.length===4)?quad:identityWarp(source.width,source.height),lerp=(a,b,t)=>a+(b-a)*t,bilerp=(u,v)=>({x:lerp(lerp(q[0].x,q[1].x,u),lerp(q[3].x,q[2].x,u),v),y:lerp(lerp(q[0].y,q[1].y,u),lerp(q[3].y,q[2].y,u),v)});function tri(s0,s1,s2,d0,d1,d2){const den=s0.x*(s1.y-s2.y)+s1.x*(s2.y-s0.y)+s2.x*(s0.y-s1.y);if(Math.abs(den)<1e-8)return;const a=(d0.x*(s1.y-s2.y)+d1.x*(s2.y-s0.y)+d2.x*(s0.y-s1.y))/den,b=(d0.y*(s1.y-s2.y)+d1.y*(s2.y-s0.y)+d2.y*(s0.y-s1.y))/den,c=(d0.x*(s2.x-s1.x)+d1.x*(s0.x-s2.x)+d2.x*(s1.x-s0.x))/den,d=(d0.y*(s2.x-s1.x)+d1.y*(s0.x-s2.x)+d2.y*(s1.x-s0.x))/den,e=(d0.x*(s1.x*s2.y-s2.x*s1.y)+d1.x*(s2.x*s0.y-s0.x*s2.y)+d2.x*(s0.x*s1.y-s1.x*s0.y))/den,f=(d0.y*(s1.x*s2.y-s2.x*s1.y)+d1.y*(s2.x*s0.y-s0.x*s2.y)+d2.y*(s0.x*s1.y-s1.x*s0.y))/den;ctx.save();ctx.beginPath();ctx.moveTo(d0.x,d0.y);ctx.lineTo(d1.x,d1.y);ctx.lineTo(d2.x,d2.y);ctx.closePath();ctx.clip();ctx.setTransform(a,b,c,d,e,f);ctx.drawImage(source,0,0);ctx.restore()}for(let gy=0;gy<grid;gy++)for(let gx=0;gx<grid;gx++){const u0=gx/grid,u1=(gx+1)/grid,v0=gy/grid,v1=(gy+1)/grid,s00={x:u0*source.width,y:v0*source.height},s10={x:u1*source.width,y:v0*source.height},s11={x:u1*source.width,y:v1*source.height},s01={x:u0*source.width,y:v1*source.height},d00=bilerp(u0,v0),d10=bilerp(u1,v0),d11=bilerp(u1,v1),d01=bilerp(u0,v1);tri(s00,s10,s11,d00,d10,d11);tri(s00,s11,s01,d00,d11,d01)}ctx.setTransform(1,0,0,1,0,0);return out}
function cropCanvasRegion(canvas,x,y,w,h){const out=makeCanvas(Math.max(1,w),Math.max(1,h));out.getContext('2d').drawImage(canvas,x,y,w,h,0,0,w,h);return out}
function cropTiledData(tiled,x,y,w,h){const tileSize=Math.max(64,Number(tiled?.tileSize)||512),out={tileSize,width:w,height:h,tiles:[]},src=tiled?.tiles||[];for(let oy=0;oy<h;oy+=tileSize)for(let ox=0;ox<w;ox+=tileSize){const tw=Math.min(tileSize,w-ox),th=Math.min(tileSize,h-oy),c=makeCanvas(tw,th),ctx=c.getContext('2d');let used=false;const sx0=x+ox,sy0=y+oy,sx1=sx0+tw,sy1=sy0+th;for(const t of src){const ix0=Math.max(sx0,t.x),iy0=Math.max(sy0,t.y),ix1=Math.min(sx1,t.x+t.w),iy1=Math.min(sy1,t.y+t.h);if(ix1<=ix0||iy1<=iy0||!t.canvas)continue;ctx.drawImage(t.canvas,ix0-t.x,iy0-t.y,ix1-ix0,iy1-iy0,ix0-sx0,iy0-sy0,ix1-ix0,iy1-iy0);used=true}if(used)out.tiles.push({x:ox,y:oy,w:tw,h:th,canvas:c})}return out}
async function canvasToTiles(canvas,tileSize=512){const tiles=[];for(let y=0;y<canvas.height;y+=tileSize)for(let x=0;x<canvas.width;x+=tileSize){const w=Math.min(tileSize,canvas.width-x),h=Math.min(tileSize,canvas.height-y),c=makeCanvas(w,h);c.getContext('2d').drawImage(canvas,x,y,w,h,0,0,w,h);tiles.push({x,y,w,h,canvas:c})}return{tileSize,width:canvas.width,height:canvas.height,tiles}}

return {clamp,uid,defaultAdjustments,defaultLayerFx,defaultTextStyle,defaultShapeStyle,identityWarp,identityWarpMesh,PixelDocument,HistoryManager,drawLayerTransformed,layerPointFromDocument,documentPointFromLayer,getAlphaBounds,transformedBounds,adjustmentFilter,canvasToDataURL,drawDataURL,imageFileToCanvas,imageFileToTiles,applyToneControls,applyAdjustments,applyFilter,calculateHistogram,featherSelectionMask,createBackgroundRemovalMask,warpCanvasMesh,warpCanvasToQuad,cropCanvasRegion,cropTiledData,canvasToTiles};
})();
const PFLocalAI=(()=>{
const {createBackgroundRemovalMask}=PFEngine;
const LOCAL_COMPUTE_API=1;

async function detectLocalCompute(){
  const wasm=typeof WebAssembly==='object'&&typeof WebAssembly.instantiate==='function';
  let webgpu=false,adapterName='';
  if(navigator.gpu?.requestAdapter){
    try{const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});webgpu=!!adapter;adapterName=adapter?.info?.description||adapter?.info?.device||''}catch{}
  }
  return {wasm,webgpu,adapterName};
}

async function removeBackgroundLocal(layer,{tolerance=28,feather=2,maxAnalysisPixels=6_000_000}={}){
  if(!layer?.canvas)throw new Error('La capa activa no contiene píxeles');
  await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
  const source=layer.canvas,pixels=source.width*source.height;
  if(pixels<=maxAnalysisPixels)return createBackgroundRemovalMask(source,{tolerance,feather});
  const scale=Math.sqrt(maxAnalysisPixels/pixels),w=Math.max(1,Math.round(source.width*scale)),h=Math.max(1,Math.round(source.height*scale));
  const small=document.createElement('canvas');small.width=w;small.height=h;const sctx=small.getContext('2d');sctx.imageSmoothingEnabled=true;sctx.imageSmoothingQuality='high';sctx.drawImage(source,0,0,w,h);
  const smallMask=createBackgroundRemovalMask(small,{tolerance,feather:Math.max(0,feather*scale)}),out=document.createElement('canvas');out.width=source.width;out.height=source.height;const octx=out.getContext('2d');octx.imageSmoothingEnabled=true;octx.imageSmoothingQuality='high';octx.drawImage(smallMask,0,0,out.width,out.height);return out;
}

return {LOCAL_COMPUTE_API,detectLocalCompute,removeBackgroundLocal};
})();
const PFPsd=(()=>{
const TILE_SIZE=512;
const TILED_THRESHOLD=24_000_000;
const MAX_PSD_PIXELS=120_000_000,MAX_LAYER_PIXELS=120_000_000,MAX_PSD_FILE_BYTES=1_500_000_000;
const BLENDS={norm:'source-over','mul ':'multiply',scrn:'screen',over:'overlay',dark:'darken',lite:'lighten',diff:'difference',hLit:'hard-light',sLit:'soft-light',div :'color-dodge',idiv:'color-burn'};

function makeCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c}
class Reader{
  constructor(buffer){this.dv=new DataView(buffer);this.u8a=new Uint8Array(buffer);this.p=0}
  need(n){if(this.p+n>this.dv.byteLength)throw new Error('PSD/PSB truncado')}
  u8(){this.need(1);return this.dv.getUint8(this.p++)}
  i16(){this.need(2);const v=this.dv.getInt16(this.p,false);this.p+=2;return v}
  u16(){this.need(2);const v=this.dv.getUint16(this.p,false);this.p+=2;return v}
  i32(){this.need(4);const v=this.dv.getInt32(this.p,false);this.p+=4;return v}
  u32(){this.need(4);const v=this.dv.getUint32(this.p,false);this.p+=4;return v}
  u64(){this.need(8);const v=this.dv.getBigUint64(this.p,false);this.p+=8;if(v>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('PSB demasiado grande para este navegador');return Number(v)}
  str(n){this.need(n);let s='';for(let i=0;i<n;i++)s+=String.fromCharCode(this.u8());return s}
  bytes(n){this.need(n);const a=this.u8a.slice(this.p,this.p+n);this.p+=n;return a}
  skip(n){this.need(n);this.p+=n}
  seek(pos){if(pos<0||pos>this.dv.byteLength)throw new Error('Offset PSD inválido');this.p=pos}
}
function readLen(r,psb){return psb?r.u64():r.u32()}
function packBits(src,expected){const out=new Uint8Array(expected);let si=0,oi=0;while(si<src.length&&oi<expected){let n=src[si++];if(n>127)n-=256;if(n>=0){const count=n+1;out.set(src.subarray(si,Math.min(src.length,si+count)),oi);si+=count;oi+=count}else if(n>=-127){const count=1-n,v=src[si++];out.fill(v,oi,Math.min(expected,oi+count));oi+=count}}return out}
async function inflate(bytes){if(!globalThis.DecompressionStream)throw new Error('PSD ZIP requiere DecompressionStream en este navegador');const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));return new Uint8Array(await new Response(stream).arrayBuffer())}
function undoPrediction8(bytes,width,height){const out=new Uint8Array(bytes);for(let y=0;y<height;y++){const off=y*width;for(let x=1;x<width;x++)out[off+x]=(out[off+x]+out[off+x-1])&255}return out}
function to8(bytes,depth,pixels){if(depth===8)return bytes.subarray(0,pixels);const out=new Uint8Array(pixels);for(let i=0;i<pixels;i++)out[i]=bytes[i*2]??0;return out}
async function decodeChannelPayload(r,length,width,height,depth,psb){
  if(length<2)throw new Error('Canal PSD inválido');const start=r.p,compression=r.u16(),bytesPerSample=depth===16?2:1,rowBytes=width*bytesPerSample,expected=rowBytes*height;let raw;
  if(compression===0){raw=r.bytes(Math.min(expected,length-2));if(raw.length<expected){const pad=new Uint8Array(expected);pad.set(raw);raw=pad}}
  else if(compression===1){const lenBytes=(psb?4:2)*height,rowLens=[];for(let y=0;y<height;y++)rowLens.push(psb?r.u32():r.u16());const chunks=new Uint8Array(expected);let off=0;for(const n of rowLens){const decoded=packBits(r.bytes(n),rowBytes);chunks.set(decoded,off);off+=rowBytes}raw=chunks}
  else if(compression===2||compression===3){const consumed=r.p-start,payload=r.bytes(Math.max(0,length-consumed));raw=await inflate(payload);if(compression===3){if(depth!==8)throw new Error('Predicción ZIP de 16 bits aún no compatible');raw=undoPrediction8(raw,width,height)}}
  else throw new Error(`Compresión PSD ${compression} no compatible`);
  r.seek(start+length);return to8(raw,depth,width*height);
}
function unicodeNameFromBlock(bytes){try{const r=new Reader(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),n=r.u32();let s='';for(let i=0;i<n&&r.p+2<=r.dv.byteLength;i++)s+=String.fromCharCode(r.u16());return s.replace(/\0/g,'').trim()}catch{return''}}
function parseLayerExtra(r,end,psb){
  const maskLen=r.u32();r.skip(maskLen);const blendLen=r.u32();r.skip(blendLen);const nameStart=r.p,nameLen=r.u8();let name='';for(let i=0;i<nameLen;i++)name+=String.fromCharCode(r.u8());const consumed=r.p-nameStart,pad=(4-(consumed%4))%4;r.skip(pad);let unicode='',sectionType=null;
  while(r.p+12<=end){const sig=r.str(4),key=r.str(4);if(sig!=='8BIM'&&sig!=='8B64')break;const longLen=psb&&sig==='8B64',len=longLen?r.u64():r.u32(),blockStart=r.p,blockEnd=Math.min(end,blockStart+len);if(key==='luni')unicode=unicodeNameFromBlock(r.u8a.slice(blockStart,blockEnd));else if(key==='lsct'&&len>=4)sectionType=r.dv.getUint32(blockStart,false);r.seek(blockEnd);if(len%2&&r.p<end)r.skip(1)}
  r.seek(end);return{name:(unicode||name||'Capa').trim(),sectionType};
}
function channelToRgba(width,height,channels,mode){const total=width*height,out=new Uint8ClampedArray(total*4),r=channels.get(0),g=channels.get(1),b=channels.get(2),a=channels.get(-1);for(let p=0,i=0;p<total;p++,i+=4){if(mode===1){const v=r?.[p]??0;out[i]=out[i+1]=out[i+2]=v}else{out[i]=r?.[p]??0;out[i+1]=g?.[p]??out[i];out[i+2]=b?.[p]??out[i]}out[i+3]=a?.[p]??255}return out}
function buildCanvas(docW,docH,rect,channels,mode){const c=makeCanvas(docW,docH),lw=Math.max(0,rect.right-rect.left),lh=Math.max(0,rect.bottom-rect.top);if(!lw||!lh)return c;const tmp=makeCanvas(lw,lh),ctx=tmp.getContext('2d'),img=ctx.createImageData(lw,lh);img.data.set(channelToRgba(lw,lh,channels,mode));ctx.putImageData(img,0,0);c.getContext('2d').drawImage(tmp,rect.left,rect.top);return c}
function buildTiles(docW,docH,rect,channels,mode,tileSize=TILE_SIZE){const lw=Math.max(0,rect.right-rect.left),lh=Math.max(0,rect.bottom-rect.top),rgba=channelToRgba(lw,lh,channels,mode),tiles=[];if(!lw||!lh)return{tileSize,width:docW,height:docH,tiles};const x0=Math.max(0,rect.left),y0=Math.max(0,rect.top),x1=Math.min(docW,rect.right),y1=Math.min(docH,rect.bottom);for(let ty=Math.floor(y0/tileSize)*tileSize;ty<y1;ty+=tileSize)for(let tx=Math.floor(x0/tileSize)*tileSize;tx<x1;tx+=tileSize){const tw=Math.min(tileSize,docW-tx),th=Math.min(tileSize,docH-ty),c=makeCanvas(tw,th),ctx=c.getContext('2d'),img=ctx.createImageData(tw,th);for(let y=Math.max(ty,y0);y<Math.min(ty+th,y1);y++)for(let x=Math.max(tx,x0);x<Math.min(tx+tw,x1);x++){const sp=((y-rect.top)*lw+(x-rect.left))*4,dp=((y-ty)*tw+(x-tx))*4;img.data[dp]=rgba[sp];img.data[dp+1]=rgba[sp+1];img.data[dp+2]=rgba[sp+2];img.data[dp+3]=rgba[sp+3]}ctx.putImageData(img,0,0);tiles.push({x:tx,y:ty,w:tw,h:th,canvas:c})}return{tileSize,width:docW,height:docH,tiles}}
function mapBlend(key){return BLENDS[key]||'source-over'}

async function parseLayerInfo(r,sectionEnd,psb,docW,docH,depth,mode){
  const layerInfoLen=readLen(r,psb);if(!layerInfoLen)return[];const layerEnd=Math.min(sectionEnd,r.p+layerInfoLen);let count=r.i16();if(count<0)count=-count;const records=[];
  for(let i=0;i<count;i++){
    const rect={top:r.i32(),left:r.i32(),bottom:r.i32(),right:r.i32()},channelCount=r.u16(),channelDefs=[];for(let c=0;c<channelCount;c++)channelDefs.push({id:r.i16(),length:readLen(r,psb)});const sig=r.str(4);if(sig!=='8BIM')throw new Error('Firma de capa PSD inválida');const blendKey=r.str(4),opacity=r.u8()/255,clipping=r.u8(),flags=r.u8();r.u8();const extraLen=r.u32(),extraEnd=Math.min(layerEnd,r.p+extraLen),extra=parseLayerExtra(r,extraEnd,psb);records.push({rect,channelDefs,blendKey,opacity,visible:(flags&2)===0,name:extra.name,sectionType:extra.sectionType,channels:new Map()})
  }
  for(const rec of records){const lw=Math.max(0,rec.rect.right-rec.rect.left),lh=Math.max(0,rec.rect.bottom-rec.rect.top);if(lw>300000||lh>300000||lw*lh>MAX_LAYER_PIXELS)throw new Error('Capa PSD/PSB fuera de los límites seguros');for(const def of rec.channelDefs){if(!lw||!lh){r.skip(def.length);continue}rec.channels.set(def.id,await decodeChannelPayload(r,def.length,lw,lh,depth,psb))}}
  r.seek(layerEnd);const useTiles=docW*docH>TILED_THRESHOLD||Math.max(docW,docH)>8192,layers=[];for(const rec of records){if(rec.sectionType===3)continue;const common={name:rec.name,opacity:rec.opacity,visible:rec.visible,blend:mapBlend(rec.blendKey)};if(useTiles)layers.push({...common,tiled:buildTiles(docW,docH,rec.rect,rec.channels,mode)});else layers.push({...common,canvas:buildCanvas(docW,docH,rec.rect,rec.channels,mode)})}return layers;
}
async function parseComposite(r,width,height,channelsCount,depth,mode,psb){if(r.p>=r.dv.byteLength)return null;const compression=r.u16(),bytesPerSample=depth===16?2:1,rowBytes=width*bytesPerSample,planes=[];
  if(compression===0){for(let c=0;c<channelsCount;c++)planes.push(to8(r.bytes(rowBytes*height),depth,width*height))}
  else if(compression===1){const rowLens=Array.from({length:channelsCount},()=>Array.from({length:height},()=>psb?r.u32():r.u16()));for(let c=0;c<channelsCount;c++){const raw=new Uint8Array(rowBytes*height);let off=0;for(let y=0;y<height;y++){raw.set(packBits(r.bytes(rowLens[c][y]),rowBytes),off);off+=rowBytes}planes.push(to8(raw,depth,width*height))}}
  else if(compression===2||compression===3){let raw=await inflate(r.bytes(r.dv.byteLength-r.p));if(compression===3&&depth!==8)throw new Error('Composite ZIP predictor 16-bit no compatible');const planeBytes=rowBytes*height;for(let c=0;c<channelsCount;c++){let part=raw.subarray(c*planeBytes,(c+1)*planeBytes);if(compression===3)part=undoPrediction8(part,width,height);planes.push(to8(part,depth,width*height))}}
  else throw new Error(`Compresión composite PSD ${compression} no compatible`);
  const map=new Map();if(mode===1){map.set(0,planes[0]);if(planes[1])map.set(-1,planes[1])}else{map.set(0,planes[0]);map.set(1,planes[1]);map.set(2,planes[2]);if(planes[3])map.set(-1,planes[3])}const rect={top:0,left:0,bottom:height,right:width};if(width*height>TILED_THRESHOLD||Math.max(width,height)>8192)return{tiled:buildTiles(width,height,rect,map,mode)};return{canvas:buildCanvas(width,height,rect,map,mode)};
}

async function readPsdFile(file){
  if(!file||!Number.isFinite(file.size)||file.size<=0)throw new Error('Archivo PSD/PSB vacío');if(file.size>MAX_PSD_FILE_BYTES)throw new Error('PSD/PSB demasiado grande para procesarlo de forma segura en el navegador');
  const buffer=await file.arrayBuffer(),r=new Reader(buffer);if(r.str(4)!=='8BPS')throw new Error('No es un PSD/PSB válido');const version=r.u16();if(version!==1&&version!==2)throw new Error(`Versión PSD ${version} no compatible`);const psb=version===2;r.skip(6);const channels=r.u16(),height=r.u32(),width=r.u32(),depth=r.u16(),mode=r.u16();if(![8,16].includes(depth))throw new Error(`PSD ${depth}-bit no compatible: admite 8/16 bit`);if(![1,3].includes(mode))throw new Error('Solo PSD/PSB RGB o escala de grises');if(!width||!height||width>300000||height>300000||width*height>MAX_PSD_PIXELS)throw new Error('Dimensiones PSD/PSB fuera de los límites seguros');
  r.skip(r.u32());r.skip(r.u32());const layerMaskLen=readLen(r,psb),layerMaskEnd=Math.min(r.dv.byteLength,r.p+layerMaskLen);let layers=[];if(layerMaskLen){layers=await parseLayerInfo(r,layerMaskEnd,psb,width,height,depth,mode);r.seek(layerMaskEnd)}const composite=await parseComposite(r,width,height,channels,depth,mode,psb);return{width,height,depth,mode,version,psb,layers,composite};
}

return {readPsdFile};
})();
const PFRaw=(()=>{
const RAW_EXT=/\.(cr2|cr3|nef|arw|dng|raf|orf|rw2|pef|srw)$/i;
function makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function isRawFile(file){return RAW_EXT.test(file?.name||'')}
async function nativeDecode(file){try{const bmp=await createImageBitmap(file);const c=makeCanvas(bmp.width,bmp.height);c.getContext('2d').drawImage(bmp,0,0);bmp.close?.();return{canvas:c,metadata:{decoder:'browser'}}}catch{return null}}
function imageDataToCanvas(result){
  const width=result?.width,height=result?.height,data=result?.data,colors=Math.max(1,Number(result?.colors)||3),bits=Number(result?.bits)||8;
  if(!width||!height||!data?.length)throw new Error('LibRaw no devolvió píxeles válidos');const c=makeCanvas(width,height),ctx=c.getContext('2d'),img=ctx.createImageData(width,height),max=bits>8?65535:255;
  for(let p=0,i=0,j=0;p<width*height;p++,i+=4,j+=colors){const cv=k=>Math.round(((data[j+Math.min(k,colors-1)]??0)/max)*255);if(colors===1)img.data[i]=img.data[i+1]=img.data[i+2]=cv(0);else{img.data[i]=cv(0);img.data[i+1]=cv(1);img.data[i+2]=cv(2)}img.data[i+3]=255}ctx.putImageData(img,0,0);return c;
}
async function rawRuntimeStatus(){try{const r=await fetch('./vendor/libraw/index.js',{method:'HEAD',cache:'no-store'});return{installed:r.ok,crossOriginIsolated:!!globalThis.crossOriginIsolated}}catch{return{installed:false,crossOriginIsolated:!!globalThis.crossOriginIsolated}}}
async function decodeRawFile(file,settings={}){
  if(!isRawFile(file))throw new Error('Formato RAW no reconocido');const native=await nativeDecode(file);if(native)return native;
  let mod;try{mod=await import('../vendor/libraw/index.js')}catch{throw new Error('LibRaw-WASM no está vendorizado. Ejecuta tools/install-libraw.* antes de publicar para activar RAW profesional.')}const LibRaw=mod.default||mod.LibRaw;if(!LibRaw)throw new Error('Adaptador LibRaw-WASM inválido');
  if(!globalThis.crossOriginIsolated)throw new Error('LibRaw-WASM necesita aislamiento COOP/COEP. Recarga una vez tras instalar/activar la PWA.');
  const raw=new LibRaw();try{const bytes=new Uint8Array(await file.arrayBuffer());await raw.open(bytes,{useCameraWb:true,outputColor:1,outputBps:8,userQual:3,...settings});let metadata={};try{metadata=await raw.metadata(false)}catch{}const result=await raw.imageData();const canvas=imageDataToCanvas(result);return{canvas,metadata:{...metadata,decoder:'libraw-wasm',colors:result.colors,bits:result.bits}}}finally{try{raw.dispose?.()}catch{}}
}

return {isRawFile,rawRuntimeStatus,decodeRawFile};
})();
const PFNeural=(()=>{
const LITE_MODEL='./models/pixelforge-neural-lite.json';
const LITE_MODEL_DATA={"format":"PixelForgeNeuralLite","version":1,"trained_on":"synthetic foreground/background shapes","validation_mean_iou":0.990924552163112,"features":["r","g","b","dr","dg","db","distance","saturation","edge","x","y","center_prior"],"mean":[0.47516515851020813,0.48467493057250977,0.4568060636520386,0.004679621662944555,0.008706307969987392,0.005470165517181158,0.13229487836360931,0.6381731033325195,0.020707011222839355,-0.0003382065915502608,0.0011025272542610765,0.45330971479415894],"std":[0.2671058475971222,0.25432470440864563,0.2559985816478729,0.13491851091384888,0.12519074976444244,0.12474305182695389,0.17907173931598663,0.21216371655464172,0.024708449840545654,0.5827248096466064,0.5839434266090393,0.20366379618644714],"layers":[{"weights":[[-0.13677753508090973,0.8583287000656128,0.6401733756065369,-0.4394514858722687,0.5546090006828308,-0.9563040733337402,0.485628604888916,-0.37964749336242676,0.29798558354377747,0.08638861775398254,0.2922372817993164,0.30753615498542786,-0.07603879272937775,-0.2683166563510895,-1.126347303390503,-0.6395014524459839],[-0.2941027879714966,0.8732976913452148,-1.2863332033157349,-0.43956026434898376,0.6867881417274475,-0.4700075089931488,0.3484417498111725,-0.2751048505306244,-1.0289090871810913,-0.18986479938030243,0.11556492745876312,0.3128541111946106,0.18419517576694489,0.5792524218559265,-0.8171817660331726,-0.5558511018753052],[0.0321817621588707,-1.0638737678527832,0.49935340881347656,-0.4683462679386139,-0.5646677017211914,-0.4620039463043213,0.42567384243011475,-1.1125643253326416,0.13022270798683167,0.05099445581436157,0.09537367522716522,-0.23173081874847412,0.20400840044021606,1.089140772819519,-0.34448549151420593,-0.32598504424095154],[-0.34037670493125916,-0.2967654764652252,0.05298919975757599,0.019629692658782005,-0.36387068033218384,0.38950878381729126,0.5290471911430359,-0.34090569615364075,-0.09638750553131104,-0.6316462755203247,-1.043442726135254,0.7047770619392395,-0.04198978468775749,-0.2848052382469177,-0.7842288613319397,-0.016175273805856705],[-0.24164535105228424,-0.05914336070418358,0.4446916878223419,-0.03043566271662712,-0.32784825563430786,0.6175000071525574,0.15330617129802704,-0.2730081379413605,0.13930058479309082,-0.08841140568256378,0.4993670880794525,-0.23074482381343842,-0.027297470718622208,0.3108559250831604,0.7268721461296082,-0.2576904892921448],[-0.7491677403450012,0.285804808139801,-0.05305149033665657,-0.21637260913848877,-0.22740758955478668,0.31923943758010864,0.8866721987724304,-0.3622729778289795,0.5805663466453552,1.005786418914795,-0.1281038075685501,-1.3431801795959473,-0.1079050824046135,-0.26816752552986145,-0.7095694541931152,0.30015042424201965],[1.4266945123672485,-0.8675327897071838,-0.5290369391441345,-0.5091949701309204,-0.23419691622257233,-0.11743531376123428,0.7850450873374939,-0.17874962091445923,-0.05637748911976814,0.4801747798919678,0.8502972722053528,1.2994552850723267,-0.985320508480072,-0.48913106322288513,0.42148274183273315,0.1900799423456192],[0.07673180103302002,-0.0838136151432991,-0.28861287236213684,0.5538016557693481,-0.4372161030769348,-0.511133074760437,-0.033721309155225754,0.0001376126892864704,-0.04630787670612335,-0.07954729348421097,0.4817013442516327,-0.10035031288862228,0.09632477164268494,-0.3577668368816376,-0.011962787248194218,0.4058222472667694],[-0.032764073461294174,-0.20228053629398346,-0.21670053899288177,-0.19315113127231598,0.7390115261077881,-0.4790407717227936,-0.2162598967552185,-0.23893174529075623,0.7165105938911438,0.512353777885437,0.018124474212527275,0.8933268785476685,0.6128283143043518,-0.9128112196922302,-0.4184979200363159,0.023022299632430077],[-0.06360499560832977,0.31283053755760193,-0.26219090819358826,0.13020330667495728,0.7215027809143066,-0.7532495260238647,0.239843487739563,0.28356990218162537,-0.21423004567623138,-0.3174734115600586,0.03347443789243698,-0.20446468889713287,-0.47841930389404297,0.48265933990478516,0.06689684838056564,0.08931881189346313],[0.22668731212615967,-0.10647425800561905,-0.15367792546749115,-0.2879636585712433,-0.29469355940818787,0.9193130135536194,-0.2815324366092682,-0.4108085632324219,0.4524400532245636,0.10561095178127289,-0.2770734429359436,0.12189168483018875,0.5223466753959656,-0.932031512260437,-0.17227843403816223,0.4410524070262909],[0.9595977663993835,0.01563059166073799,-0.2743154764175415,-0.8175269961357117,-0.6800917983055115,-0.33531010150909424,0.5242711305618286,-0.8931052684783936,-0.25290054082870483,0.27077701687812805,0.003994926810264587,0.4687923789024353,1.0658444166183472,-0.03300612419843674,-0.25579097867012024,-0.348545640707016]],"bias":[0.27138689160346985,0.3584544062614441,0.4046326279640198,0.18991494178771973,0.40966007113456726,0.5871347188949585,-0.1509089469909668,0.3137879967689514,0.03981218487024307,-0.28929099440574646,-0.03541648015379906,-0.009534727782011032,0.6132117509841919,0.3810308873653412,0.019312556833028793,-0.05395225062966347],"activation":"relu"},{"weights":[[-0.05045223608613014,0.19173045456409454,0.7596461772918701,1.018139362335205,-0.05933614447712898,0.44604015350341797,0.03566097468137741,0.2879209518432617],[0.737235426902771,0.2889687418937683,-0.3931145668029785,-0.12036143988370895,0.3448825180530548,0.3889411389827728,0.18372763693332672,-0.1353083997964859],[0.6796234250068665,-0.12908051908016205,-0.31872236728668213,0.16135792434215546,0.3392314612865448,-0.36861181259155273,-0.5563567876815796,-0.24298590421676636],[0.05226770043373108,-0.4264082610607147,-0.7498441338539124,0.15773610770702362,0.44096997380256653,-0.34218746423721313,-0.6673271059989929,-0.0911741852760315],[0.6516546607017517,0.10311653465032578,-0.08734297752380371,0.26100918650627136,0.49732428789138794,-0.24514535069465637,-0.09803386777639389,-0.251097708940506],[0.8666552901268005,-0.397615909576416,0.4759775996208191,-0.36011528968811035,0.34235262870788574,0.20304985344409943,-0.14383433759212494,0.06380661576986313],[-0.7362116575241089,0.10578389465808868,0.4025186002254486,0.019188351929187775,-0.3861359655857086,0.19999700784683228,0.33127087354660034,1.1135889291763306],[0.3241995573043823,-0.8097270727157593,0.30508050322532654,-0.5596042275428772,0.5422216653823853,-0.29156938195228577,-0.20968438684940338,0.17056022584438324],[0.4479212164878845,0.815533459186554,0.5927830338478088,-0.3362785577774048,0.2851385474205017,-0.0035441801883280277,0.4960521161556244,0.023889830335974693],[-0.7633413672447205,0.30996760725975037,0.7215773463249207,0.3830598294734955,-0.4299347698688507,-0.09795334190130234,0.0716947689652443,0.11952787637710571],[-0.4733501076698303,0.10632111877202988,0.873220682144165,0.484260618686676,-0.3558723032474518,0.1353772133588791,-0.5482854843139648,0.7537500858306885],[-0.4019201993942261,-0.3400697410106659,0.25659066438674927,0.38491907715797424,-0.39791032671928406,0.7435137629508972,-0.598304271697998,0.7123958468437195],[0.9319047331809998,-0.6266880631446838,-0.5039969086647034,-0.5126727819442749,0.38324475288391113,-0.521966814994812,-0.0318521223962307,-0.460391640663147],[0.6810184717178345,-0.11930367350578308,0.027652082964777946,-0.6401526927947998,0.9781844019889832,0.29778724908828735,-0.174065962433815,-0.43342941999435425],[-0.1653866469860077,-0.5262480974197388,0.09889578074216843,0.39177337288856506,0.7230069637298584,0.5527175068855286,0.26642748713493347,0.5103307366371155],[0.17521750926971436,0.33472922444343567,0.20578382909297943,0.25404831767082214,0.21265272796154022,-0.360358327627182,0.1605653166770935,-0.1724274903535843]],"bias":[0.45014551281929016,-0.0863630473613739,-0.14453478157520294,-0.0956101045012474,0.3040461540222168,-0.1442348062992096,-0.08461172133684158,-0.04942626878619194],"activation":"relu"},{"weights":[[-1.0441843271255493],[0.12483718991279602],[0.36771443486213684],[0.6998850107192993],[-0.7061070203781128],[0.2580755352973938],[0.6209956407546997],[0.6915314793586731]],"bias":[-0.2259349226951599],"activation":"sigmoid"}]};
const HQ_MODEL='./models/u2netp.onnx';
const ORT_WASM='./vendor/onnxruntime/ort.min.js';
const ORT_WEBGPU='./vendor/onnxruntime/ort.webgpu.min.js';

function makeCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c}
async function exists(url){try{const r=await fetch(url,{method:'HEAD',cache:'no-store'});return r.ok}catch{return false}}
let liteModelPromise=null,runtimePromise=null,sessionPromise=null;

async function loadLiteModel(){
  if(liteModelPromise)return liteModelPromise;
  // Neural Lite is embedded so AI still works in file:// and when index.html is opened from a temporary ZIP folder.
  liteModelPromise=Promise.resolve(LITE_MODEL_DATA).then(m=>{
    if(m?.format!=='PixelForgeNeuralLite'||!Array.isArray(m.layers)||m.layers.length!==3)throw new Error('Modelo Neural Lite inválido');
    return m;
  });
  return liteModelPromise;
}

function sigmoid(x){return x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x))}
function dense(input,layer,relu=true){
  const W=layer.weights,b=layer.bias,out=new Float32Array(b.length);
  for(let j=0;j<b.length;j++){let s=b[j];for(let i=0;i<input.length;i++)s+=input[i]*W[i][j];out[j]=relu?Math.max(0,s):s}
  return out;
}
function robustBorderRgb(data,w,h){
  const vals=[[],[],[]],step=Math.max(1,Math.floor(Math.min(w,h)/48));
  const add=(x,y)=>{const i=(y*w+x)*4;if(data[i+3]<8)return;vals[0].push(data[i]/255);vals[1].push(data[i+1]/255);vals[2].push(data[i+2]/255)};
  for(let x=0;x<w;x+=step){add(x,0);add(x,h-1)}for(let y=0;y<h;y+=step){add(0,y);add(w-1,y)}
  return vals.map(a=>{if(!a.length)return 1;a.sort((x,y)=>x-y);return a[Math.floor(a.length/2)]});
}
function hsvSat(r,g,b){const mx=Math.max(r,g,b),mn=Math.min(r,g,b);return mx<=1e-6?0:(mx-mn)/mx}
function luma(data,w,x,y){const i=(y*w+x)*4;return(.299*data[i]+.587*data[i+1]+.114*data[i+2])/255}
function featureVector(data,w,h,x,y,bg,mean,std){
  const i=(y*w+x)*4,r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255,dr=r-bg[0],dg=g-bg[1],db=b-bg[2];
  const xm=w>1?x/(w-1)*2-1:0,ym=h>1?y/(h-1)*2-1:0;
  const xl=Math.max(0,x-1),xr=Math.min(w-1,x+1),yu=Math.max(0,y-1),yd=Math.min(h-1,y+1);
  const edge=(Math.abs(luma(data,w,xr,y)-luma(data,w,xl,y))+Math.abs(luma(data,w,x,yd)-luma(data,w,x,yu)))*.5;
  const center=Math.max(0,1-Math.hypot(xm,ym)/Math.SQRT2);
  const f=[r,g,b,dr,dg,db,Math.hypot(dr,dg,db)/Math.sqrt(3),hsvSat(r,g,b),edge,xm,ym,center];
  for(let k=0;k<f.length;k++)f[k]=(f[k]-mean[k])/(std[k]||1);
  return f;
}
function closeSmallHoles(alpha,w,h){
  const out=new Uint8ClampedArray(alpha);if(w<3||h<3)return out;
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=y*w+x;if(alpha[p]>=128)continue;let n=0;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)if(xx||yy)n+=alpha[(y+yy)*w+x+xx]>=128;if(n>=6)out[p]=Math.max(out[p],180)}
  return out;
}
async function neuralLiteMask(canvas,{size=288,feather=1.25}={}){
  const model=await loadLiteModel(),scale=Math.min(1,size/Math.max(canvas.width,canvas.height)),w=Math.max(24,Math.round(canvas.width*scale)),h=Math.max(24,Math.round(canvas.height*scale));
  const small=makeCanvas(w,h),ctx=small.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0,w,h);
  const img=ctx.getImageData(0,0,w,h),data=img.data,bg=robustBorderRgb(data,w,h),alpha=new Uint8ClampedArray(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const p=y*w+x,i=p*4;if(data[i+3]<8){alpha[p]=0;continue}
    let v=featureVector(data,w,h,x,y,bg,model.mean,model.std);v=dense(v,model.layers[0]);v=dense(v,model.layers[1]);v=dense(v,model.layers[2],false);
    let prob=sigmoid(v[0]);prob=Math.max(0,Math.min(1,(prob-.18)/.70));alpha[p]=Math.round(prob*255);
  }
  const cleaned=closeSmallHoles(alpha,w,h),maskSmall=makeCanvas(w,h),mctx=maskSmall.getContext('2d'),outImg=mctx.createImageData(w,h);
  for(let p=0,i=0;p<cleaned.length;p++,i+=4){outImg.data[i]=outImg.data[i+1]=outImg.data[i+2]=255;outImg.data[i+3]=cleaned[p]}mctx.putImageData(outImg,0,0);
  const mask=makeCanvas(canvas.width,canvas.height),o=mask.getContext('2d');o.imageSmoothingEnabled=true;o.imageSmoothingQuality='high';if(feather>0)o.filter=`blur(${Math.max(.2,feather)}px)`;o.drawImage(maskSmall,0,0,mask.width,mask.height);o.filter='none';return mask;
}

async function loadRuntime(){
  if(globalThis.ort)return globalThis.ort;if(runtimePromise)return runtimePromise;
  runtimePromise=(async()=>{let src=ORT_WASM;if(navigator.gpu&&await exists(ORT_WEBGPU))src=ORT_WEBGPU;return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=()=>{if(!globalThis.ort)return reject(new Error('ONNX Runtime no inicializó'));try{globalThis.ort.env.wasm.wasmPaths='./vendor/onnxruntime/'}catch{}resolve(globalThis.ort)};s.onerror=()=>reject(new Error('ONNX Runtime HQ no instalado'));document.head.appendChild(s)})})();
  return runtimePromise;
}
async function hqSession(model=HQ_MODEL){if(sessionPromise)return sessionPromise;sessionPromise=(async()=>{const ort=await loadRuntime(),providers=navigator.gpu?['webgpu','wasm']:['wasm'];try{return await ort.InferenceSession.create(model,{executionProviders:providers,graphOptimizationLevel:'all'})}catch{return ort.InferenceSession.create(model,{executionProviders:['wasm'],graphOptimizationLevel:'all'})}})();return sessionPromise}
async function neuralHqMask(canvas,{model=HQ_MODEL,size=320}={}){
  const ort=await loadRuntime(),sess=await hqSession(model),small=makeCanvas(size,size),ctx=small.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0,size,size);
  const d=ctx.getImageData(0,0,size,size).data,tensor=new Float32Array(3*size*size),mean=[.485,.456,.406],std=[.229,.224,.225];for(let p=0;p<size*size;p++)for(let c=0;c<3;c++)tensor[c*size*size+p]=(d[p*4+c]/255-mean[c])/std[c];
  const feeds={[sess.inputNames[0]]:new ort.Tensor('float32',tensor,[1,3,size,size])},out=await sess.run(feeds),arr=out[sess.outputNames[0]].data;let min=Infinity,max=-Infinity;for(const v of arr){if(v<min)min=v;if(v>max)max=v}const range=Math.max(1e-6,max-min),maskSmall=makeCanvas(size,size),mctx=maskSmall.getContext('2d'),im=mctx.createImageData(size,size);for(let p=0;p<size*size;p++){const v=Math.max(0,Math.min(1,(arr[p]-min)/range)),i=p*4;im.data[i]=im.data[i+1]=im.data[i+2]=255;im.data[i+3]=Math.round(v*255)}mctx.putImageData(im,0,0);const mask=makeCanvas(canvas.width,canvas.height),o=mask.getContext('2d');o.imageSmoothingEnabled=true;o.imageSmoothingQuality='high';o.drawImage(maskSmall,0,0,mask.width,mask.height);return mask;
}

async function neuralStatus(){
  const portable=!/^https?:$/i.test(location.protocol);
  const [hqModel,hqRuntime,hqWebGpu]=portable?[false,false,false]:await Promise.all([exists(HQ_MODEL),exists(ORT_WASM),navigator.gpu?exists(ORT_WEBGPU):Promise.resolve(false)]);
  const lite=true;
  return{ready:true,backend:hqModel&&hqRuntime?(hqWebGpu?'onnx-webgpu':'onnx-wasm'):'neural-lite',lite,hqModel,hqRuntime,webgpu:!!navigator.gpu};
}
async function neuralSubjectMask(canvas,options={}){
  const status=await neuralStatus();
  if(status.hqModel&&status.hqRuntime){try{const mask=await neuralHqMask(canvas,options);mask.dataset&&(mask.dataset.backend=status.backend);return mask}catch(err){console.warn('PixelForge: fallback Neural Lite tras fallo ONNX',err)}}
  if(status.lite){const mask=await neuralLiteMask(canvas,options);mask.dataset&&(mask.dataset.backend='neural-lite');return mask}
  throw new Error('No hay ningún modelo neuronal local disponible');
}

return {neuralStatus,neuralSubjectMask};
})();

const {PixelDocument,HistoryManager,imageFileToCanvas,applyAdjustments,applyFilter,clamp,drawLayerTransformed,layerPointFromDocument,documentPointFromLayer,transformedBounds,calculateHistogram,featherSelectionMask,defaultAdjustments,defaultLayerFx,defaultShapeStyle,identityWarp,identityWarpMesh,canvasToTiles,imageFileToTiles,cropCanvasRegion,cropTiledData}=PFEngine;
const {detectLocalCompute,removeBackgroundLocal}=PFLocalAI;
const {readPsdFile}=PFPsd;
const {isRawFile,decodeRawFile}=PFRaw;
const {neuralStatus,neuralSubjectMask}=PFNeural;

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
const imageFileInputs=$$('.image-file-input');imageFileInputs.forEach(input=>input.addEventListener('change',async()=>{const f=input.files?.[0];try{if(f)await openImageFile(f)}finally{input.value=''}}));
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
  }catch(err){console.error(err);const ext=(file?.name?.split('.').pop()||'').toLowerCase();if(ext==='heic'||ext==='heif')toast('No se pudo decodificar HEIC/HEIF en este Safari. En Fotos usa Compartir → Guardar en Archivos como JPEG, o cambia Cámara → Formatos → Más compatible.');else toast(err?.message?`No se pudo abrir: ${err.message.slice(0,110)}`:'No se pudo abrir la imagen')}
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

const PERSISTENCE_AVAILABLE=(()=>{try{return /^https?:$/i.test(location.protocol)&&!!globalThis.indexedDB}catch{return false}})();
function openDb(){if(!PERSISTENCE_AVAILABLE)return Promise.reject(new DOMException('Persistencia no disponible en este modo','NotSupportedError'));return new Promise((resolve,reject)=>{const req=indexedDB.open('PixelForge404',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('state'))req.result.createObjectStore('state',{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function idbGet(id){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('state','readonly'),req=tx.objectStore('state').get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close()})}
async function idbPut(value){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(value);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)})}
async function idbDelete(id){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').delete(id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)})}
function scheduleAutosave(){clearTimeout(autosaveTimer);if(!PERSISTENCE_AVAILABLE){$('#autosaveStatus').textContent='Modo portable · sin autoguardado';return}$('#autosaveStatus').textContent='Cambios pendientes…';autosaveTimer=setTimeout(()=>void saveAutosave(),viewportMode()?2800:900)}
async function saveAutosave(){try{const snapshot=await doc.snapshot();await idbPut({id:'latest',savedAt:Date.now(),document:snapshot});$('#autosaveStatus').textContent='Guardado local';$('#autosaveStatus').title=new Date().toLocaleString()}catch(err){console.error(err);$('#autosaveStatus').textContent='Autoguardado no disponible'}}
async function checkRestore(){if(!PERSISTENCE_AVAILABLE){$('#autosaveStatus').textContent='Modo portable · sin autoguardado';return}try{restorable=await idbGet('latest');if(!restorable?.document)return;const when=new Date(restorable.savedAt);$('#restoreMeta').textContent=`${restorable.document.name||'Proyecto'} · ${restorable.document.width}×${restorable.document.height} · ${when.toLocaleString()}`;$('#restoreDialog').showModal()}catch(err){console.warn('No se pudo comprobar el autoguardado',err)}}
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

})();
