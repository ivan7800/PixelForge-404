const RAW_EXT=/\.(cr2|cr3|nef|arw|dng|raf|orf|rw2|pef|srw)$/i;
function makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
export function isRawFile(file){return RAW_EXT.test(file?.name||'')}
async function nativeDecode(file){try{const bmp=await createImageBitmap(file);const c=makeCanvas(bmp.width,bmp.height);c.getContext('2d').drawImage(bmp,0,0);bmp.close?.();return{canvas:c,metadata:{decoder:'browser'}}}catch{return null}}
function imageDataToCanvas(result){
  const width=result?.width,height=result?.height,data=result?.data,colors=Math.max(1,Number(result?.colors)||3),bits=Number(result?.bits)||8;
  if(!width||!height||!data?.length)throw new Error('LibRaw no devolvió píxeles válidos');const c=makeCanvas(width,height),ctx=c.getContext('2d'),img=ctx.createImageData(width,height),max=bits>8?65535:255;
  for(let p=0,i=0,j=0;p<width*height;p++,i+=4,j+=colors){const cv=k=>Math.round(((data[j+Math.min(k,colors-1)]??0)/max)*255);if(colors===1)img.data[i]=img.data[i+1]=img.data[i+2]=cv(0);else{img.data[i]=cv(0);img.data[i+1]=cv(1);img.data[i+2]=cv(2)}img.data[i+3]=255}ctx.putImageData(img,0,0);return c;
}
export async function rawRuntimeStatus(){try{const r=await fetch('./vendor/libraw/index.js',{method:'HEAD',cache:'no-store'});return{installed:r.ok,crossOriginIsolated:!!globalThis.crossOriginIsolated}}catch{return{installed:false,crossOriginIsolated:!!globalThis.crossOriginIsolated}}}
export async function decodeRawFile(file,settings={}){
  if(!isRawFile(file))throw new Error('Formato RAW no reconocido');const native=await nativeDecode(file);if(native)return native;
  let mod;try{mod=await import('../vendor/libraw/index.js')}catch{throw new Error('LibRaw-WASM no está vendorizado. Ejecuta tools/install-libraw.* antes de publicar para activar RAW profesional.')}const LibRaw=mod.default||mod.LibRaw;if(!LibRaw)throw new Error('Adaptador LibRaw-WASM inválido');
  if(!globalThis.crossOriginIsolated)throw new Error('LibRaw-WASM necesita aislamiento COOP/COEP. Recarga una vez tras instalar/activar la PWA.');
  const raw=new LibRaw();try{const bytes=new Uint8Array(await file.arrayBuffer());await raw.open(bytes,{useCameraWb:true,outputColor:1,outputBps:8,userQual:3,...settings});let metadata={};try{metadata=await raw.metadata(false)}catch{}const result=await raw.imageData();const canvas=imageDataToCanvas(result);return{canvas,metadata:{...metadata,decoder:'libraw-wasm',colors:result.colors,bits:result.bits}}}finally{try{raw.dispose?.()}catch{}}
}
