import {PixelDocument,defaultAdjustments,identityWarpMesh,canvasToTiles} from './engine.js';
import {neuralStatus,neuralSubjectMask} from './neural-ai.js';
import {readPsdFile} from './psd-import.js';
import {rawRuntimeStatus} from './raw-import.js';
const out=document.querySelector('#out'),run=document.querySelector('#run');
const line=(name,ok,detail='')=>`${ok?'✅':'❌'} ${name}${detail?' · '+detail:''}`;
function be16(n){return[(n>>8)&255,n&255]}function be32(n){return[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]}function be64(n){return[0,0,0,0,...be32(n)]}
function flatPsd(version=1,depth=8){const w=2,h=2,a=[];a.push(...new TextEncoder().encode('8BPS'),...be16(version),0,0,0,0,0,0,...be16(3),...be32(h),...be32(w),...be16(depth),...be16(3),...be32(0),...be32(0),...(version===2?be64(0):be32(0)),...be16(0));for(const plane of [[255,0,255,0],[0,255,0,255],[0,0,255,255]])for(const v of plane)depth===8?a.push(v):a.push(v,v);return new File([new Uint8Array(a)],`qa.${version===2?'psb':'psd'}`)}
async function tests(){
  const rows=[];try{
    const c=document.createElement('canvas');c.width=96;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#173b7a';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#f0643b';ctx.beginPath();ctx.ellipse(48,32,19,23,0,0,Math.PI*2);ctx.fill();
    const d=new PixelDocument(96,64,'transparent');d.layers[0].canvas.getContext('2d').drawImage(c,0,0);d.addShapeLayer('Vector',{kind:'ellipse',x:8,y:8,width:24,height:24});const a=d.addAdjustmentLayer('Curvas',defaultAdjustments());a.adjustments.curves.r=[0,32,128,220,255];d.layers[0].warpMesh=identityWarpMesh(96,64,3,3);d.layers[0].warpMesh.points[1].y=4;
    const rendered=document.createElement('canvas');rendered.width=96;rendered.height=64;d.composite(rendered);rows.push(line('Canvas + composición',!!rendered.getContext('2d')));
    const region=document.createElement('canvas');region.width=48;region.height=32;d.compositeRegion(region,{x:24,y:16,w:48,h:32});rows.push(line('Compositor por región',region.width===48&&region.height===32));
    const snap=await d.snapshot(),restored=await PixelDocument.fromSnapshot(snap);rows.push(line('Proyecto v6 serializable',restored.layers.length===3));rows.push(line('Curvas RGB independientes',Array.isArray(restored.layers.find(x=>x.type==='adjustment').adjustments.curves.r)));rows.push(line('Shape Layer vectorial',restored.layers.some(x=>x.type==='shape')));rows.push(line('Warp Mesh 3×3',restored.layers[0].warpMesh?.points?.length===9));
    const tiled=await canvasToTiles(c,16);rows.push(line('Tiled storage',tiled.tiles.length===24,`${tiled.tiles.length} tiles`));const td=new PixelDocument(96,64,'transparent',false);td.addTiledLayer('Tiled',tiled);const tr=document.createElement('canvas');tr.width=32;tr.height=32;td.compositeRegion(tr,{x:32,y:16,w:32,h:32});rows.push(line('Tiled viewport compositor',tr.width===32));
    for(const [v,depth] of [[1,8],[1,16],[2,8],[2,16]]){const psd=await readPsdFile(flatPsd(v,depth));rows.push(line(`${v===2?'PSB':'PSD'} ${depth}-bit`,psd.width===2&&psd.depth===depth))}
    const ns=await neuralStatus();rows.push(line('IA neuronal incluida',ns.ready,ns.backend));if(ns.ready){const mask=await neuralSubjectMask(c,{size:96,feather:0});const md=mask.getContext('2d').getImageData(0,0,mask.width,mask.height).data;let mn=255,mx=0;for(let i=3;i<md.length;i+=4){mn=Math.min(mn,md[i]);mx=Math.max(mx,md[i])}rows.push(line('Inferencia neuronal',mx>mn,`alpha ${mn}–${mx}`))}
    const rs=await rawRuntimeStatus();rows.push(line('LibRaw runtime',rs.installed,rs.installed?(rs.crossOriginIsolated?'instalado + COI':'instalado; falta recarga COI'):'instalable con tools/install-libraw.*'));
    rows.push(line('IndexedDB','indexedDB'in globalThis));rows.push(line('Service Worker','serviceWorker'in navigator));rows.push(line('Cross-origin isolation',crossOriginIsolated,'necesario para LibRaw pthreads'));rows.push(line('WebAssembly','WebAssembly'in globalThis));rows.push(line('WebGPU',!!navigator.gpu,'opcional HQ'));rows.push(line('Pointer Events','PointerEvent'in globalThis));rows.push(line('createImageBitmap','createImageBitmap'in globalThis));rows.push(line('OffscreenCanvas','OffscreenCanvas'in globalThis,'opcional'));
  }catch(e){console.error(e);rows.push(line('Excepción de QA',false,e.stack||e.message))}
  out.textContent=`PixelForge 404 v6 QA\n${navigator.userAgent}\n\n${rows.join('\n')}\n\nResultado: ${rows.filter(r=>r.startsWith('✅')).length}/${rows.length} checks OK`;
}
run.onclick=tests;void tests();
