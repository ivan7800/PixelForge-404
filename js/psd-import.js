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

export async function readPsdFile(file){
  if(!file||!Number.isFinite(file.size)||file.size<=0)throw new Error('Archivo PSD/PSB vacío');if(file.size>MAX_PSD_FILE_BYTES)throw new Error('PSD/PSB demasiado grande para procesarlo de forma segura en el navegador');
  const buffer=await file.arrayBuffer(),r=new Reader(buffer);if(r.str(4)!=='8BPS')throw new Error('No es un PSD/PSB válido');const version=r.u16();if(version!==1&&version!==2)throw new Error(`Versión PSD ${version} no compatible`);const psb=version===2;r.skip(6);const channels=r.u16(),height=r.u32(),width=r.u32(),depth=r.u16(),mode=r.u16();if(![8,16].includes(depth))throw new Error(`PSD ${depth}-bit no compatible: admite 8/16 bit`);if(![1,3].includes(mode))throw new Error('Solo PSD/PSB RGB o escala de grises');if(!width||!height||width>300000||height>300000||width*height>MAX_PSD_PIXELS)throw new Error('Dimensiones PSD/PSB fuera de los límites seguros');
  r.skip(r.u32());r.skip(r.u32());const layerMaskLen=readLen(r,psb),layerMaskEnd=Math.min(r.dv.byteLength,r.p+layerMaskLen);let layers=[];if(layerMaskLen){layers=await parseLayerInfo(r,layerMaskEnd,psb,width,height,depth,mode);r.seek(layerMaskEnd)}const composite=await parseComposite(r,width,height,channels,depth,mode,psb);return{width,height,depth,mode,version,psb,layers,composite};
}
