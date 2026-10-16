import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {VRMLoaderPlugin, VRMUtils} from "@pixiv/three-vrm";
import {POSES,ROLE,EXPR,boneName,roleFor,poseFor} from "./poses.js?v=1792138673";
const box=document.getElementById("av"),cv=document.getElementById("avc"),lbl=document.getElementById("avl");
const fail=e=>{console.warn("avatar disabled:",e);box.classList.add("hide");window.gcAvatar=null};
const S={mode:"idle",talkUntil:0,emo:null,emoUntil:0};
// queue calls made before load
window.gcAvatar={thinking(){S.mode="thinking"},idle(){S.mode="idle"},speak(t){S.mode="idle";S.pending=t},stopTalk(){S.pending=null},setCharacter(id){window.gcWantChar=id},preload(){}};
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});}catch(e){fail(e)}
if(renderer){
const mob=matchMedia("(pointer:coarse)").matches;renderer.setPixelRatio(Math.min(devicePixelRatio,mob?2:1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(30,1,0.1,20);
scene.add(new THREE.HemisphereLight(0xffeeff,0x443355,1.6));const dl=new THREE.DirectionalLight(0xffffff,1.6);dl.position.set(1,2,2);scene.add(dl);
const target=new THREE.Object3D();scene.add(target);
function resize(){const w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}
new ResizeObserver(resize).observe(cv);resize();
let px=0,py=0;const pt=e=>{const t=e.touches?e.touches[0]:e;if(!t)return;px=t.clientX/innerWidth*2-1;py=-(t.clientY/innerHeight*2-1)};
addEventListener("pointermove",pt,{passive:true});addEventListener("touchstart",pt,{passive:true});addEventListener("touchmove",pt,{passive:true});
const loader=new GLTFLoader();loader.register(p=>new VRMLoaderPlugin(p));
// ---- lazy multi-character models ----
const cache={},Z0=[0,0,0],EMOS=["happy","angry","sad","relaxed","surprised"];
let C=null,want=null; // current character runtime
const CAST=window.CAST||[{id:"kanya",model:"grokchan.vrm"}];
const allBones=new Set();for(const P of Object.values(POSES))for(const k in P)allBones.add(boneName(k));
function build(id,vrm){VRMUtils.removeUnnecessaryVertices?.(vrm.scene);VRMUtils.combineSkeletons?.(vrm.scene);VRMUtils.rotateVRM0(vrm);
 vrm.scene.traverse(o=>o.frustumCulled=false);const baseRY=vrm.scene.rotation.y;
 const B=n=>vrm.humanoid.getNormalizedBoneNode(n);const bones={};for(const n of allBones){const b=B(n);if(b)bones[n]=b}
 vrm.scene.updateMatrixWorld(true);const hp=new THREE.Vector3();B("head").getWorldPosition(hp);
 const em=vrm.expressionManager,has=n=>!!em?.getExpression(n);
 const NP={};for(const n in POSES)NP[n]=poseFor(id,n);
 return{id,vrm,baseRY,bones,B,headY:hp.y,em,has,NP,V:["aa","ih","ou","ee","oh"].filter(has),ES:{}}}
function load(id){if(cache[id])return cache[id];const c=CAST.find(x=>x.id===id)||CAST[0];
 cache[id]=new Promise((res,rej)=>loader.load(c.model,g=>{const v=g.userData.vrm;v?res(build(c.id,v)):rej("no vrm")},
  p=>{if(want===id&&p.total){const e=document.getElementById("avp");if(e)e.textContent=Math.round(p.loaded/p.total*100)+"%"}},e=>{delete cache[id];rej(e)}));
 return cache[id]}
function frame(rt){cam.position.set(0,rt.headY,1.45);cam.lookAt(0,rt.headY-0.12,0)}
async function setCharacter(id){want=id;if(C?.id===id)return;box.classList.add("loading");lbl.hidden=false;
 try{const rt=await load(id);if(want!==id)return;
  if(C)scene.remove(C.vrm.scene);C=rt;scene.add(rt.vrm.scene);frame(rt);if(rt.vrm.lookAt)rt.vrm.lookAt.target=target;
  window.gcPose={...rt.NP,CROSS:rt.NP[roleFor(id,"idle")]||rt.NP.REST};S.lastPose=null;
  box.classList.remove("loading");lbl.hidden=true;box.classList.add("ready");window.gcCharLoaded=id;
 }catch(e){if(want===id){console.warn(e);lbl.querySelector("span").textContent="Couldn't load this character"}}}
// drag to rotate (mouse / one finger); double-click/tap resets
let rotY=0,rotX=0,tgtY=0,tgtX=0,drag=null,lastTap=0;
cv.style.touchAction="none";
cv.addEventListener("pointerdown",e=>{if(!e.isPrimary)return;drag={x:e.clientX,y:e.clientY,ry:tgtY,rx:tgtX};cv.setPointerCapture(e.pointerId);
 if(e.pointerType!=="mouse"){const n=performance.now();if(n-lastTap<300){tgtY=tgtX=0;drag=null}lastTap=n}});
cv.addEventListener("pointermove",e=>{if(!drag)return;e.preventDefault();tgtY=drag.ry+(e.clientX-drag.x)*0.0056;tgtX=Math.max(-0.25,Math.min(0.25,drag.rx+(e.clientY-drag.y)*0.004))});
const end=()=>{drag=null};cv.addEventListener("pointerup",end);cv.addEventListener("pointercancel",end);
cv.addEventListener("dblclick",()=>{tgtY=tgtX=0});
window.gcRotate=(y,x=0)=>{tgtY=rotY=y;tgtX=rotX=x};
function pick(t){const s=t.toLowerCase();
 if(/baka|hmph|idiot|dummy|stupid|annoying|ugh|it'?s not like/.test(s))return "angry";
 if(/sorry|sad|miss you|lonely|unfortunately/.test(s))return "sad";
 if(/love|happy|glad|great|thank|yay|cute|proud|♥|❤|:\)|haha|hehe/.test(s))return "happy";
 if(/!\?|\?!|what\?|really\?|eh\?|whoa|wow/.test(s))return "surprised";
 return "relaxed"}
const curId=()=>C?.id||want||"kanya";
const speak=(t,manual)=>{const now=performance.now()/1000,id=curId();S.mode="idle";S.talkUntil=manual?Infinity:now+Math.min(6,Math.max(3,t.length*0.05));S.talkPose=Math.random()<0.5?roleFor(id,"talkA"):roleFor(id,"talkB");window.gcTalkPose=S.talkPose;S.emo=id==="koyuki"&&pick(t)!=="sad"?"relaxed":pick(t);S.emoUntil=manual?Infinity:S.talkUntil+2.5};
const stopTalk=()=>{const now=performance.now()/1000;S.talkUntil=Math.min(S.talkUntil,now);S.emoUntil=Math.min(S.emoUntil,now+2)};
window.gcAvatar={thinking(){S.mode="thinking";S.emo=null},idle(){S.mode="idle"},speak,stopTalk,setCharacter,preload:id=>load(id).catch(()=>{})};
setCharacter(window.gcWantChar||"kanya").then(()=>{if(S.pending)speak(S.pending)});
let nextBlink=2,blinkT=-1,th=0;const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{if(document.hidden){clock.getDelta();return}const dt=Math.min(clock.getDelta(),0.1),t=clock.elapsedTime;
 if(!C){return}
 const {vrm,bones,B,em,has,NP,V,ES,id}=C;const set=(n,v)=>has(n)&&em.setValue(n,v);
 const nowP=performance.now()/1000,f=window.gcForce;
 const tp=f||(nowP<S.talkUntil?S.talkPose:null);
 if(tp)S.lastPose=tp;
 th+=((tp?1:0)-th)*Math.min(1,dt*12); // ~0.25 s blend
 const idleN=roleFor(id,"idle"),A=window.gcPose.CROSS||NP[idleN],Cp=window.gcPose[S.lastPose||roleFor(id,"talkA")]||NP.HIPS,br=Math.sin(t*1.6);
 const XA=(EXPR||{})[idleN]||{},XC=(EXPR||{})[S.lastPose||roleFor(id,"talkA")]||{},bx=n=>(XA[n]||0)+((XC[n]||0)-(XA[n]||0))*th;
 for(const k in bones){const b=bones[k];const a=A[k]||Z0,c=Cp[k]||Z0;
  b.rotation.set(a[0]+(c[0]-a[0])*th,a[1]+(c[1]-a[1])*th,a[2]+(c[2]-a[2])*th)}
 const bc=bones.chest,bl=bones.leftUpperArm,brr=bones.rightUpperArm,bs=bones.spine;
 if(bc)bc.rotation.x+=br*0.02;if(bl)bl.rotation.z+=br*0.015;if(brr)brr.rotation.z-=br*0.015;
 if(bs){bs.rotation.z+=Math.sin(t*0.5)*0.02;bs.rotation.y+=Math.sin(t*0.37)*0.025}
 target.position.set(cam.position.x+px*0.6,cam.position.y+py*0.4,cam.position.z);
 if(t>nextBlink&&blinkT<0)blinkT=0;let b=0;if(blinkT>=0){blinkT+=dt;b=Math.sin(Math.min(1,blinkT/0.15)*Math.PI);if(blinkT>=0.15){blinkT=-1;nextBlink=t+2+Math.random()*3}}
 set("blink",Math.max(b,bx("blink")));["blinkLeft","blinkRight","lookUp","lookDown","lookLeft","lookRight"].forEach(n=>set(n,bx(n)));
 for(const n in {...XA,...XC})if(!EMOS.includes(n)&&!/^(aa|ih|ou|ee|oh|blink.*|look.*)$/.test(n))set(n,bx(n));
 const now=performance.now()/1000;V.forEach(v=>set(v,now<S.talkUntil?0:bx(v)));
 if(now<S.talkUntil&&V.length){const k=Math.floor(t*9)%3,v=["aa","ih","ou"].filter(has);const ph=(t*9)%1;set(v[k%v.length]||V[0],0.25+0.55*Math.sin(ph*Math.PI))}
 const e=now<S.emoUntil?S.emo:(S.mode==="thinking"?"relaxed":null);
 EMOS.forEach(n=>{if(!has(n))return;const cur=ES[n]||0;ES[n]=cur+(((n===e)?(n==="relaxed"&&S.mode==="thinking"?0.3:(id==="koyuki"?0.35:0.7)):0)-cur)*Math.min(1,dt*6);em.setValue(n,Math.min(1,Math.max(ES[n],bx(n))))});
 rotY+=(tgtY-rotY)*Math.min(1,dt*12);rotX+=(tgtX-rotX)*Math.min(1,dt*12);vrm.scene.rotation.set(rotX,C.baseRY+rotY,0);
 vrm.update(dt);renderer.render(scene,cam)});
}
