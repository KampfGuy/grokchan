// Runs Kokoro-82M (Apache-2.0) fully in the browser via kokoro-js + ONNX/WASM. Free, no server.
import {KokoroTTS} from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
let tts=null,cur=0;
const load=async()=>{if(tts)return;tts=await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX",{dtype:"q8",device:"wasm"});};
self.onmessage=async({data:m})=>{
 try{
  if(m.type==="init"){await load();postMessage({type:"ready"});return}
  if(m.type==="cancel"){cur=-1;return}
  if(m.type==="gen"){await load();cur=m.id;
   const parts=m.text.match(/[^.!?…]+[.!?…]*\s*/g)||[m.text];
   // merge tiny fragments so prosody stays natural
   const chunks=[];for(const p of parts){if(chunks.length&&(chunks[chunks.length-1].length<25))chunks[chunks.length-1]+=p;else chunks.push(p)}
   // generate the whole reply first, then send one buffer so playback has no gaps
   const outs=[];let sr=24000,n=0;
   for(const c of chunks){if(cur!==m.id)return;const t=c.trim();if(!t)continue;
    const a=await tts.generate(t,{voice:m.voice||"af_heart",speed:m.speed||1});sr=a.sampling_rate;outs.push(a.audio);n+=a.audio.length+Math.round(sr*0.12)}
   if(cur!==m.id)return;
   const all=new Float32Array(n);let o=0;for(const a of outs){all.set(a,o);o+=a.length+Math.round(sr*0.12)} // short natural pause between sentences
   postMessage({type:"audio",id:m.id,audio:all,sr},[all.buffer]);
  }
 }catch(e){postMessage({type:"error",id:m.id,error:String(e&&e.message||e)})}
};
