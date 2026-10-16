import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {VRMLoaderPlugin, VRMUtils} from "@pixiv/three-vrm";
import {POSES,ROLE,EXPR,boneName} from "./poses.js?v=1792113939";
const box=document.getElementById("av"),cv=document.getElementById("avc"),lbl=document.getElementById("avl");
const fail=e=>{console.warn("avatar disabled:",e);box.classList.add("hide");window.gcAvatar=null};
const S={mode:"idle",talkUntil:0,emo:null,emoUntil:0};
// queue calls made before load
window.gcAvatar={thinking(){S.mode="thinking"},idle(){S.mode="idle"},speak(t){S.mode="idle";S.pending=t},stopTalk(){S.pending=null}};
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
loader.load("grokchan.vrm",g=>{
 const vrm=g.userData.vrm;if(!vrm)return fail("no vrm");
 VRMUtils.removeUnnecessaryVertices?.(g.scene);VRMUtils.combineSkeletons?.(g.scene);VRMUtils.rotateVRM0(vrm);
 scene.add(vrm.scene);const baseRY=vrm.scene.rotation.y;vrm.scene.traverse(o=>o.frustumCulled=false);
 const head=vrm.humanoid.getNormalizedBoneNode("head");vrm.scene.updateMatrixWorld(true);
 const hp=new THREE.Vector3();head.getWorldPosition(hp);
 cam.position.set(0,hp.y,1.45);cam.lookAt(0,hp.y-0.12,0);
 if(vrm.lookAt)vrm.lookAt.target=target;
 lbl.remove();
 // drag to rotate (mouse / one finger); double-click/tap resets
 let rotY=0,rotX=0,tgtY=0,tgtX=0,drag=null,lastTap=0;
 cv.style.touchAction="none";
 cv.addEventListener("pointerdown",e=>{if(!e.isPrimary)return;drag={x:e.clientX,y:e.clientY,ry:tgtY,rx:tgtX};cv.setPointerCapture(e.pointerId);
  if(e.pointerType!=="mouse"){const n=performance.now();if(n-lastTap<300){tgtY=tgtX=0;drag=null}lastTap=n}});
 cv.addEventListener("pointermove",e=>{if(!drag)return;e.preventDefault();tgtY=drag.ry+(e.clientX-drag.x)*0.0056;tgtX=Math.max(-0.25,Math.min(0.25,drag.rx+(e.clientY-drag.y)*0.004))});
 const end=()=>{drag=null};cv.addEventListener("pointerup",end);cv.addEventListener("pointercancel",end);
 cv.addEventListener("dblclick",()=>{tgtY=tgtX=0});
 window.gcRotate=(y,x=0)=>{tgtY=rotY=y;tgtX=rotX=x};
 const em=vrm.expressionManager,has=n=>!!em?.getExpression(n);
 const set=(n,v)=>has(n)&&em.setValue(n,v);
 const B=n=>vrm.humanoid.getNormalizedBoneNode(n);
 const Z0=[0,0,0];
 // drive every bone used by any pose (see poses.js)
 const bones={};for(const P of Object.values(POSES))for(const k in P){const n=boneName(k);if(!bones[n]){const b=B(n);if(b)bones[n]=b}}
 const norm=P=>{const o={};for(const k in P)o[boneName(k)]=P[k];return o};
 const NP={};for(const n in POSES)NP[n]=norm(POSES[n]);
 const CROSS=NP[ROLE.idle]||NP.REST;
 window.gcPose={...NP,CROSS,REST:CROSS};
 const EMOS=["happy","angry","sad","relaxed","surprised"];
 function pick(t){const s=t.toLowerCase();
  if(/baka|hmph|idiot|dummy|stupid|annoying|ugh|it'?s not like/.test(s))return "angry";
  if(/sorry|sad|miss you|lonely|unfortunately/.test(s))return "sad";
  if(/love|happy|glad|great|thank|yay|cute|proud|♥|❤|:\)|haha|hehe/.test(s))return "happy";
  if(/!\?|\?!|what\?|really\?|eh\?|whoa|wow/.test(s))return "surprised";
  return "relaxed"}
 // speak(t,manual): manual=true keeps talking until stopTalk() (driven by speech onend)
 const speak=(t,manual)=>{const now=performance.now()/1000;S.mode="idle";S.talkUntil=manual?Infinity:now+Math.min(6,Math.max(3,t.length*0.05));S.talkPose=Math.random()<0.5?ROLE.talkA:ROLE.talkB;S.emo=pick(t);S.emoUntil=manual?Infinity:S.talkUntil+2.5};
 const stopTalk=()=>{const now=performance.now()/1000;S.talkUntil=Math.min(S.talkUntil,now);S.emoUntil=Math.min(S.emoUntil,now+2)};
 window.gcAvatar={thinking(){S.mode="thinking";S.emo=null},idle(){S.mode="idle"},speak,stopTalk};
 if(S.pending)speak(S.pending);
 let nextBlink=2,blinkT=-1,th=0;const ES={};const clock=new THREE.Clock();const V=["aa","ih","ou","ee","oh"].filter(has);
 renderer.setAnimationLoop(()=>{if(document.hidden){clock.getDelta();return}const dt=Math.min(clock.getDelta(),0.1),t=clock.elapsedTime;
  const nowP=performance.now()/1000,f=window.gcForce;
  const tp=f||(nowP<S.talkUntil?S.talkPose:null);
  if(tp)S.lastPose=tp;
  th+=((tp?1:0)-th)*Math.min(1,dt*12); // ~0.25 s blend
  const A=CROSS,C=window.gcPose[S.lastPose||ROLE.talkA]||NP.HIPS,br=Math.sin(t*1.6);
  const XA=(EXPR||{})[ROLE.idle]||{},XC=(EXPR||{})[S.lastPose||ROLE.talkA]||{},bx=n=>(XA[n]||0)+((XC[n]||0)-(XA[n]||0))*th;
  for(const k in bones){const b=bones[k];if(!b)continue;const a=A[k]||Z0,c=C[k]||Z0;
   b.rotation.set(a[0]+(c[0]-a[0])*th,a[1]+(c[1]-a[1])*th,a[2]+(c[2]-a[2])*th)}
  const bc=bones.chest,bl=bones.leftUpperArm,brr=bones.rightUpperArm,bs=bones.spine||B("spine");
  if(bc)bc.rotation.x+=br*0.02;if(bl)bl.rotation.z+=br*0.015;if(brr)brr.rotation.z-=br*0.015;
  if(bs){bs.rotation.z+=Math.sin(t*0.5)*0.02;bs.rotation.y+=Math.sin(t*0.37)*0.025}
  target.position.set(cam.position.x+px*0.6,cam.position.y+py*0.4,cam.position.z);
  // blink
  if(t>nextBlink&&blinkT<0)blinkT=0;let b=0;if(blinkT>=0){blinkT+=dt;b=Math.sin(Math.min(1,blinkT/0.15)*Math.PI);if(blinkT>=0.15){blinkT=-1;nextBlink=t+2+Math.random()*3}}
  set("blink",Math.max(b,bx("blink")));["blinkLeft","blinkRight","lookUp","lookDown","lookLeft","lookRight"].forEach(n=>set(n,bx(n)));
  for(const n in {...XA,...XC})if(!EMOS.includes(n)&&!/^(aa|ih|ou|ee|oh|blink.*|look.*)$/.test(n))set(n,bx(n));
  // mouth
  const now=performance.now()/1000;V.forEach(v=>set(v,now<S.talkUntil?0:bx(v)));
  if(now<S.talkUntil&&V.length){const k=Math.floor(t*9)%3,v=["aa","ih","ou"].filter(has);const ph=(t*9)%1;set(v[k%v.length]||V[0],0.25+0.55*Math.sin(ph*Math.PI))}
  // emotion
  const e=now<S.emoUntil?S.emo:(S.mode==="thinking"?"relaxed":null);
  EMOS.forEach(n=>{if(!has(n))return;const cur=ES[n]||0;ES[n]=cur+(((n===e)?(n==="relaxed"&&S.mode==="thinking"?0.3:0.7):0)-cur)*Math.min(1,dt*6);em.setValue(n,Math.min(1,Math.max(ES[n],bx(n))))});
  rotY+=(tgtY-rotY)*Math.min(1,dt*12);rotX+=(tgtX-rotX)*Math.min(1,dt*12);vrm.scene.rotation.set(rotX,baseRY+rotY,0);
  vrm.update(dt);renderer.render(scene,cam)});
},p=>{if(p.total)document.getElementById("avp").textContent=Math.round(p.loaded/p.total*100)+"%"},fail);
}
