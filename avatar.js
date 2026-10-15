import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {VRMLoaderPlugin, VRMUtils} from "@pixiv/three-vrm";
const box=document.getElementById("av"),cv=document.getElementById("avc"),lbl=document.getElementById("avl");
const fail=e=>{console.warn("avatar disabled:",e);box.classList.add("hide");window.gcAvatar=null};
const S={mode:"idle",talkUntil:0,emo:null,emoUntil:0};
// queue calls made before load
window.gcAvatar={thinking(){S.mode="thinking"},idle(){S.mode="idle"},speak(t){S.mode="idle";S.pending=t}};
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
 scene.add(vrm.scene);vrm.scene.traverse(o=>o.frustumCulled=false);
 const head=vrm.humanoid.getNormalizedBoneNode("head");vrm.scene.updateMatrixWorld(true);
 const hp=new THREE.Vector3();head.getWorldPosition(hp);
 cam.position.set(0,hp.y,1.45);cam.lookAt(0,hp.y-0.12,0);
 if(vrm.lookAt)vrm.lookAt.target=target;
 lbl.remove();
 const em=vrm.expressionManager,has=n=>!!em?.getExpression(n);
 const set=(n,v)=>has(n)&&em.setValue(n,v);
 const B=n=>vrm.humanoid.getNormalizedBoneNode(n);
 const bones={lua:B("leftUpperArm"),rua:B("rightUpperArm"),lla:B("leftLowerArm"),rla:B("rightLowerArm"),sp:B("spine"),ch:B("chest"),nk:B("neck"),hd:head,lh:B("leftHand"),rh:B("rightHand")};
 const Z0=[0,0,0];
 const CROSS={lua:[-0.5,-0.8,-1.15],rua:[-0.5,0.75,1.1],lla:[0,-2.0,-1.2],rla:[0,1.9,1.05],lh:[0.3,0,0.3],rh:[0.3,0,-0.3],sp:[0,0.05,0.05],ch:[0,0.04,0.04],nk:[0,0,0.05],hd:[0,0.1,0.12]};
 const THINK={lua:[0,0,-1.2],rua:[0,0.5,0.95],lla:[0,0,-0.15],rla:[0,2.2,0.15],lh:[0,0,0],rh:[0,0,0],sp:[0,0,0],ch:[0,0,0],nk:[0,0,0],hd:[0,0,0.15]};
 window.gcPose={CROSS,THINK};
 const EMOS=["happy","angry","sad","relaxed","surprised"];
 function pick(t){const s=t.toLowerCase();
  if(/baka|hmph|idiot|dummy|stupid|annoying|ugh|it'?s not like/.test(s))return "angry";
  if(/sorry|sad|miss you|lonely|unfortunately/.test(s))return "sad";
  if(/love|happy|glad|great|thank|yay|cute|proud|♥|❤|:\)|haha|hehe/.test(s))return "happy";
  if(/!\?|\?!|what\?|really\?|eh\?|whoa|wow/.test(s))return "surprised";
  return "relaxed"}
 const speak=t=>{const now=performance.now()/1000;S.mode="idle";S.talkUntil=now+Math.min(12,Math.max(1.2,t.length*0.055));S.emo=pick(t);S.emoUntil=S.talkUntil+2.5};
 window.gcAvatar={thinking(){S.mode="thinking";S.emo=null},idle(){S.mode="idle"},speak};
 if(S.pending)speak(S.pending);
 let nextBlink=2,blinkT=-1,th=0;const clock=new THREE.Clock();const V=["aa","ih","ou","ee","oh"].filter(has);
 renderer.setAnimationLoop(()=>{if(document.hidden){clock.getDelta();return}const dt=Math.min(clock.getDelta(),0.1),t=clock.elapsedTime;
  th+=((S.mode==="thinking"?1:0)-th)*Math.min(1,dt*4);
  const P=window.gcPoseOverride||CROSS,br=Math.sin(t*1.6);
  for(const k in bones){const b=bones[k];if(!b)continue;const a=P[k]||Z0,c=THINK[k]||Z0;
   b.rotation.set(a[0]+(c[0]-a[0])*th,a[1]+(c[1]-a[1])*th,a[2]+(c[2]-a[2])*th)}
  if(bones.ch)bones.ch.rotation.x+=br*0.02;bones.lua.rotation.z+=br*0.015;bones.rua.rotation.z-=br*0.015;
  bones.sp.rotation.z+=Math.sin(t*0.5)*0.02;bones.sp.rotation.y+=Math.sin(t*0.37)*0.025;
  target.position.set(cam.position.x+px*0.6+th*0.3,cam.position.y+py*0.4+th*0.3,cam.position.z);
  // blink
  if(t>nextBlink&&blinkT<0)blinkT=0;let b=0;if(blinkT>=0){blinkT+=dt;b=Math.sin(Math.min(1,blinkT/0.15)*Math.PI);if(blinkT>=0.15){blinkT=-1;nextBlink=t+2+Math.random()*3}}
  set("blink",b);
  // mouth
  const now=performance.now()/1000;V.forEach(v=>set(v,0));
  if(now<S.talkUntil&&V.length){const k=Math.floor(t*9)%3,v=["aa","ih","ou"].filter(has);const ph=(t*9)%1;set(v[k%v.length]||V[0],0.25+0.55*Math.sin(ph*Math.PI))}
  // emotion
  const e=now<S.emoUntil?S.emo:(S.mode==="thinking"?"relaxed":null);
  EMOS.forEach(n=>{if(!has(n))return;const cur=em.getValue(n)||0;em.setValue(n,cur+(((n===e)?(n==="relaxed"&&S.mode==="thinking"?0.3:0.7):0)-cur)*Math.min(1,dt*6))});
  vrm.update(dt);renderer.render(scene,cam)});
},p=>{if(p.total)document.getElementById("avp").textContent=Math.round(p.loaded/p.total*100)+"%"},fail);
}
