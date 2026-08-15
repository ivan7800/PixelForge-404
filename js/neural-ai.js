const LITE_MODEL='./models/pixelforge-neural-lite.json';
const HQ_MODEL='./models/u2netp.onnx';
const ORT_WASM='./vendor/onnxruntime/ort.min.js';
const ORT_WEBGPU='./vendor/onnxruntime/ort.webgpu.min.js';

function makeCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c}
async function exists(url){try{const r=await fetch(url,{method:'HEAD',cache:'no-store'});return r.ok}catch{return false}}
let liteModelPromise=null,runtimePromise=null,sessionPromise=null;

async function loadLiteModel(){
  if(liteModelPromise)return liteModelPromise;
  liteModelPromise=fetch(LITE_MODEL,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('Modelo Neural Lite no encontrado');return r.json()}).then(m=>{
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

export async function neuralStatus(){
  const [lite,hqModel,hqRuntime,hqWebGpu]=await Promise.all([exists(LITE_MODEL),exists(HQ_MODEL),exists(ORT_WASM),navigator.gpu?exists(ORT_WEBGPU):Promise.resolve(false)]);
  return{ready:lite||(hqModel&&hqRuntime),backend:hqModel&&hqRuntime?(hqWebGpu?'onnx-webgpu':'onnx-wasm'):(lite?'neural-lite':'none'),lite,hqModel,hqRuntime,webgpu:!!navigator.gpu};
}
export async function neuralSubjectMask(canvas,options={}){
  const status=await neuralStatus();
  if(status.hqModel&&status.hqRuntime){try{const mask=await neuralHqMask(canvas,options);mask.dataset&&(mask.dataset.backend=status.backend);return mask}catch(err){console.warn('PixelForge: fallback Neural Lite tras fallo ONNX',err)}}
  if(status.lite){const mask=await neuralLiteMask(canvas,options);mask.dataset&&(mask.dataset.backend='neural-lite');return mask}
  throw new Error('No hay ningún modelo neuronal local disponible');
}
export {neuralLiteMask};
