import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
class FakeCtx{createImageData(w,h){return{width:w,height:h,data:new Uint8ClampedArray(w*h*4)}}putImageData(){}drawImage(){}clearRect(){}fillRect(){}save(){}restore(){}setTransform(){}translate(){}rotate(){}scale(){}beginPath(){}ellipse(){}moveTo(){}lineTo(){}closePath(){}fill(){}stroke(){}rect(){}roundRect(){}measureText(s){return{width:String(s).length*8}}fillText(){}createRadialGradient(){return{addColorStop(){}}}}
class FakeCanvas{constructor(){this.width=300;this.height=150;this.ctx=new FakeCtx()}getContext(){return this.ctx}toDataURL(){return'data:image/png;base64,'}}
globalThis.document={createElement(tag){if(tag==='canvas')return new FakeCanvas();return{}}};
const ok=[];const check=(name,cond,detail='')=>{ok.push({name,ok:!!cond,detail});if(!cond)process.exitCode=1};
function be16(n){return[(n>>8)&255,n&255]}function be32(n){return[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]}function be64(n){return[0,0,0,0,...be32(n)]}
function makeFlat(version=1,depth=8){const w=2,h=2,ch=3,a=[];a.push(...Buffer.from('8BPS'),...be16(version),0,0,0,0,0,0,...be16(ch),...be32(h),...be32(w),...be16(depth),...be16(3),...be32(0),...be32(0),...(version===2?be64(0):be32(0)),...be16(0));const vals=[[255,0,255,0],[0,255,0,255],[0,0,255,255]];for(const plane of vals){for(const v of plane){if(depth===8)a.push(v);else a.push(v,v)}}return new File([new Uint8Array(a)],[`test.${version===2?'psb':'psd'}`],{type:'application/octet-stream'})}

function makeLayeredPsd(){
  const header=[];header.push(...Buffer.from('8BPS'),...be16(1),0,0,0,0,0,0,...be16(4),...be32(2),...be32(2),...be16(8),...be16(3),...be32(0),...be32(0));
  const rec=[];rec.push(...be16(1));rec.push(...be32(0),...be32(0),...be32(2),...be32(2),...be16(4));for(const id of [0,1,2,-1])rec.push(...be16(id<0?65536+id:id),...be32(6));rec.push(...Buffer.from('8BIMnorm'),255,0,0,0,...be32(12),...be32(0),...be32(0),1,'L'.charCodeAt(0),0,0);for(const plane of [[255,255,255,255],[0,0,0,0],[0,0,0,0],[255,255,255,255]])rec.push(...be16(0),...plane);
  const layerInfo=[...be32(rec.length),...rec],layerMask=[...be32(layerInfo.length),...layerInfo];header.push(...layerMask,...be16(0));for(const plane of [[255,255,255,255],[0,0,0,0],[0,0,0,0],[255,255,255,255]])header.push(...plane);return new File([new Uint8Array(header)],'layered.psd');
}

const {readPsdFile}=await import(pathToFileURL(path.join(ROOT,'js/psd-import.js')));
for(const [v,d] of [[1,8],[1,16],[2,8],[2,16]]){try{const r=await readPsdFile(makeFlat(v,d));check(`PSD/PSB v${v} ${d}-bit`,r.width===2&&r.height===2&&r.depth===d&&!!r.composite)}catch(e){check(`PSD/PSB v${v} ${d}-bit`,false,e.message)}}
try{const r=await readPsdFile(makeLayeredPsd());check('PSD capa raster sintética',r.layers.length===1&&r.layers[0].name==='L')}catch(e){check('PSD capa raster sintética',false,e.message)}
const model=JSON.parse(await fs.readFile(path.join(ROOT,'models/pixelforge-neural-lite.json'),'utf8'));check('Neural Lite format',model.format==='PixelForgeNeuralLite');check('Neural Lite 12→16',model.layers?.[0]?.weights?.length===12&&model.layers[0].bias?.length===16);check('Neural Lite 16→8',model.layers?.[1]?.weights?.length===16&&model.layers[1].bias?.length===8);check('Neural Lite 8→1',model.layers?.[2]?.weights?.length===8&&model.layers[2].bias?.length===1);
const manifest=JSON.parse(await fs.readFile(path.join(ROOT,'manifest.webmanifest'),'utf8'));check('Manifest válido',manifest.name==='PixelForge 404');
const appSource=await fs.readFile(path.join(ROOT,'js/app.js'),'utf8');
const indexSource=await fs.readFile(path.join(ROOT,'index.html'),'utf8');
check('Sin click sintético para Abrir',!appSource.includes('fileInput.click()')&&!appSource.includes('[data-action=\"open\"]'));
check('Tres inputs nativos de imagen',(indexSource.match(/image-file-input/g)||[]).length>=3);
check('Carga proyecto nativa',!appSource.includes("$('#projectInput').click()"));
check('Bienvenida fuera del stage',indexSource.includes('</div>\n        <div id="dropHint" class="drop-hint">'));

for(const f of ['index.html','sw.js','js/app.js','js/engine.js','js/neural-ai.js','js/psd-import.js','js/raw-import.js','models/pixelforge-neural-lite.json']){try{await fs.access(path.join(ROOT,f));check(`Asset ${f}`,true)}catch{check(`Asset ${f}`,false)}}


const engine=await import(pathToFileURL(path.join(ROOT,'js/engine.js')));
try{
  const tileCanvas=new FakeCanvas();tileCanvas.width=512;tileCanvas.height=512;
  const cropped=engine.cropTiledData({tileSize:512,width:1024,height:1024,tiles:[{x:0,y:0,w:512,h:512,canvas:tileCanvas}]},128,128,640,640);
  check('Crop tiled conserva dimensiones',cropped.width===640&&cropped.height===640&&cropped.tileSize===512);
  check('Crop tiled genera solo tiles útiles',cropped.tiles.length>=1&&cropped.tiles.every(t=>t.x>=0&&t.y>=0&&t.x<640&&t.y<640));
}catch(e){check('Crop tiled',false,e.message)}
try{
  const restored=await engine.PixelDocument.fromSnapshot({width:2,height:2,name:'Restore',activeLayerId:'r1',layers:[{id:'r1',type:'raster',name:'Raster',visible:true,locked:false,opacity:1,blend:'source-over',x:0,y:0,scaleX:1,scaleY:1,rotation:0,canvas:null,mask:null}]});
  const target=new FakeCanvas();target.width=2;target.height=2;restored.composite(target);
  check('Snapshot restaurado conserva marca de clase PixelDocument',restored instanceof engine.PixelDocument);
}catch(e){check('Snapshot restaurado conserva marca de clase PixelDocument',false,e.message)}
try{await engine.PixelDocument.fromSnapshot({width:500000,height:2,layers:[]});check('Snapshot gigante rechazado',false)}catch{check('Snapshot gigante rechazado',true)}
try{await engine.PixelDocument.fromSnapshot({width:100,height:100,layers:Array.from({length:1001},()=>({type:'group'}))});check('Snapshot con demasiadas capas rechazado',false)}catch{check('Snapshot con demasiadas capas rechazado',true)}

console.log(ok.map(x=>`${x.ok?'PASS':'FAIL'} ${x.name}${x.detail?' :: '+x.detail:''}`).join('\n'));console.log(`\n${ok.filter(x=>x.ok).length}/${ok.length} checks OK`);
