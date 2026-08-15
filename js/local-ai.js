import {createBackgroundRemovalMask} from './engine.js';

export const LOCAL_COMPUTE_API=1;

export async function detectLocalCompute(){
  const wasm=typeof WebAssembly==='object'&&typeof WebAssembly.instantiate==='function';
  let webgpu=false,adapterName='';
  if(navigator.gpu?.requestAdapter){
    try{const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});webgpu=!!adapter;adapterName=adapter?.info?.description||adapter?.info?.device||''}catch{}
  }
  return {wasm,webgpu,adapterName};
}

export async function removeBackgroundLocal(layer,{tolerance=28,feather=2,maxAnalysisPixels=6_000_000}={}){
  if(!layer?.canvas)throw new Error('La capa activa no contiene píxeles');
  await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
  const source=layer.canvas,pixels=source.width*source.height;
  if(pixels<=maxAnalysisPixels)return createBackgroundRemovalMask(source,{tolerance,feather});
  const scale=Math.sqrt(maxAnalysisPixels/pixels),w=Math.max(1,Math.round(source.width*scale)),h=Math.max(1,Math.round(source.height*scale));
  const small=document.createElement('canvas');small.width=w;small.height=h;const sctx=small.getContext('2d');sctx.imageSmoothingEnabled=true;sctx.imageSmoothingQuality='high';sctx.drawImage(source,0,0,w,h);
  const smallMask=createBackgroundRemovalMask(small,{tolerance,feather:Math.max(0,feather*scale)}),out=document.createElement('canvas');out.width=source.width;out.height=source.height;const octx=out.getContext('2d');octx.imageSmoothingEnabled=true;octx.imageSmoothingQuality='high';octx.drawImage(smallMask,0,0,out.width,out.height);return out;
}
