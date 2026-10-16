import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {VRMLoaderPlugin, VRMUtils} from "@pixiv/three-vrm";
import {POSES,boneName} from "./poses.js?v=1792109360";
const $=id=>document.getElementById(id),D=180/Math.PI;
const toast=t=>{let e=$("toast");if(!e){e=document.createElement("div");e.id="toast";document.body.append(e)}e.textContent=t;e.style.opacity=1;clearTimeout(e._t);e._t=setTimeout(()=>e.style.opacity=0,1800)};
const FING=["Thumb","Index","Middle","Ring","Little"],SEG={Thumb:["Metacarpal","Proximal","Distal"],_:["Proximal","Intermediate","Distal"]};
const fingers=s=>FING.flatMap(f=>(SEG[f]||SEG._).map(j=>s+f+j));
const GROUPS={"Body":["hips","spine","chest","upperChest","neck","head"],"Left arm":["leftShoulder","leftUpperArm","leftLowerArm","leftHand"],"Right arm":["rightShoulder","rightUpperArm","rightLowerArm","rightHand"],
 "Left fingers":fingers("left"),"Right fingers":fingers("right"),"Legs":["leftUpperLeg","leftLowerLeg","leftFoot","leftToes","rightUpperLeg","rightLowerLeg","rightFoot","rightToes"]};
const pretty=n=>n.replace(/^(left|right)/,"").replace(/([A-Z])/g," $1").trim().replace(/^./,c=>c.toUpperCase());
// ---- state: bone name -> [x,y,z] radians ----
let pose={},hist=[],sel="rightUpperArm",group="Right arm",tag="idle",fside="both",vrm=null;
const snap=()=>JSON.stringify(pose);
const push=()=>{hist.push(snap());if(hist.length>100)hist.shift()};
// ---- three ----
const cv=$("c"),renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(30,1,0.05,30);
scene.add(new THREE.HemisphereLight(0xffeeff,0x443355,1.6));const dl=new THREE.DirectionalLight(0xffffff,1.6);dl.position.set(1,2,2);scene.add(dl);
const marker=new THREE.Mesh(new THREE.SphereGeometry(0.018,16,12),new THREE.MeshBasicMaterial({color:0xff4fa3,depthTest:false,transparent:true,opacity:.9}));marker.renderOrder=999;scene.add(marker);
let rotY=0,tgtY=0,rotX=0.05,dist=1.6,center=new THREE.Vector3(0,1.1,0);
function resize(){const w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}
new ResizeObserver(resize).observe(cv);resize();
const ptrs=new Map();let drag=null,pinch=null;
cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(ptrs.size===1)drag={x:e.clientX,y:e.clientY,ry:tgtY,rx:rotX};else if(ptrs.size===2){const[a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:dist};drag=null}});
cv.addEventListener("pointermove",e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pinch&&ptrs.size===2){const[a,b]=[...ptrs.values()];setZoom(pinch.z*pinch.d/Math.max(20,Math.hypot(a.x-b.x,a.y-b.y)))}
 else if(drag){tgtY=drag.ry+(e.clientX-drag.x)*0.008;rotX=Math.max(-0.6,Math.min(0.8,drag.rx+(e.clientY-drag.y)*0.005))}});
const up=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(!ptrs.size)drag=null};cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
cv.addEventListener("wheel",e=>{e.preventDefault();setZoom(dist*(1+e.deltaY*0.001))},{passive:false});
function setZoom(z){dist=Math.max(0.3,Math.min(3.2,z));$("zoom").value=dist}
$("zoom").oninput=e=>dist=+e.target.value;$("zoom").min=0.3;
let home=null;
document.querySelectorAll(".vbtns button[data-v]").forEach(b=>b.onclick=()=>{tgtY=+b.dataset.v;rotX=0.05;if(home){center.copy(home);setZoom(1.6)}});
$("focus").onclick=()=>{if(!home)return;center.copy(marker.position);setZoom(sel.match(/Thumb|Index|Middle|Ring|Little|Hand/)?0.6:0.9)};
const loader=new GLTFLoader();loader.register(p=>new VRMLoaderPlugin(p));
loader.load("grokchan.vrm",g=>{vrm=g.userData.vrm;VRMUtils.removeUnnecessaryVertices?.(g.scene);VRMUtils.combineSkeletons?.(g.scene);VRMUtils.rotateVRM0(vrm);
 scene.add(vrm.scene);vrm.scene.traverse(o=>o.frustumCulled=false);vrm.scene.updateMatrixWorld(true);
 const hp=new THREE.Vector3();vrm.humanoid.getNormalizedBoneNode("hips").getWorldPosition(hp);center.set(0,hp.y+0.25,0);home=center.clone();
 $("st").textContent="ready";loadPreset("REST");renderUI();window.gcEditor={get pose(){return pose},exportObj,importObj,setBone,loadPreset}},
 p=>{if(p.total)$("st").textContent="loading model… "+Math.round(p.loaded/p.total*100)+"%"},e=>{$("st").textContent="model failed to load";console.error(e)});
const clock=new THREE.Clock(),tmp=new THREE.Vector3();
renderer.setAnimationLoop(()=>{if(document.hidden)return;const dt=Math.min(clock.getDelta(),.1);rotY+=(tgtY-rotY)*Math.min(1,dt*10);
 cam.position.set(center.x+Math.sin(rotY)*Math.cos(rotX)*dist,center.y+Math.sin(rotX)*dist,center.z+Math.cos(rotY)*Math.cos(rotX)*dist);cam.lookAt(center);
 if(vrm){applyPose();vrm.update(dt);const n=vrm.humanoid.getNormalizedBoneNode(sel);marker.visible=!!n;if(n){vrm.humanoid.update?.();n.getWorldPosition(tmp);
  const raw=vrm.humanoid.getRawBoneNode(sel);if(raw){raw.getWorldPosition(tmp)}marker.position.copy(tmp)}}
 renderer.render(scene,cam)});
function applyPose(){for(const n of Object.values(ALL)){const b=vrm.humanoid.getNormalizedBoneNode(n);if(!b)continue;const v=pose[n]||[0,0,0];b.rotation.set(v[0],v[1],v[2])}}
const ALL=Object.values(GROUPS).flat();
// ---- pose ops ----
function loadPreset(k){push();pose={};if(k!=="T"){for(const [key,v] of Object.entries(POSES[k]||{}))pose[boneName(key)]=[...v]}renderUI();toast(k==="T"?"T-pose loaded":"Loaded "+k)}
function setBone(n,i,rad){pose[n]=pose[n]||[0,0,0];pose[n][i]=rad;if(pose[n].every(v=>Math.abs(v)<1e-6))delete pose[n]}
const mir=n=>n.startsWith("left")?"right"+n.slice(4):n;
function mirror(){push();for(const n of Object.keys(pose))if(n.startsWith("right"))delete pose[n];for(const [n,v] of Object.entries(pose))if(n.startsWith("left"))pose[mir(n)]=[v[0],-v[1],-v[2]];renderUI();toast("Mirrored left → right")}
const FP={open:{},relaxed:{f:[0.25,0.25,0.2],t:[0.1,0.15,0.1]},fist:{f:[1.45,1.6,1.1],t:[0.5,0.6,0.5]},point:{f:[1.45,1.6,1.1],t:[0.5,0.6,0.5],open:["Index"]},two:{f:[1.45,1.6,1.1],t:[0.5,0.6,0.5],open:["Index","Middle"]}};
function fingerPreset(k){push();const P=FP[k];for(const s of fside==="both"?["left","right"]:[fside]){const sg=s==="left"?-1:1;
 for(const f of FING){const segs=SEG[f]||SEG._;segs.forEach((j,i)=>{const n=s+f+j;delete pose[n];if(!P.f)return;if(P.open?.includes(f))return;
  if(f==="Thumb"){const a=P.t[i];if(a)pose[n]=[0,sg*a*0.8,0]}else{const a=P.f[i];if(a)pose[n]=[0,0,sg*a]}})}}renderUI();toast("Fingers: "+k)}
// ---- export / import ----
function exportObj(){const bones={};const e=new THREE.Euler(),q=new THREE.Quaternion();
 for(const n of Object.keys(pose).sort()){const v=pose[n];e.set(v[0],v[1],v[2],"XYZ");q.setFromEuler(e);
  bones[n]={euler_deg:v.map(x=>+(x*D).toFixed(2)),quat:[q.x,q.y,q.z,q.w].map(x=>+x.toFixed(6))}}
 return{version:1,name:($("pname").value.trim()||"pose"),tag,bones}}
function importObj(o){if(!o||typeof o!=="object"||!o.bones)throw new Error("not a pose file");push();pose={};
 for(const [n,b] of Object.entries(o.bones)){if(!ALL.includes(n))continue;let v;
  if(Array.isArray(b.euler_deg))v=b.euler_deg.map(x=>(+x||0)/D);else if(Array.isArray(b.quat)){const e=new THREE.Euler().setFromQuaternion(new THREE.Quaternion(...b.quat.map(Number)),"XYZ");v=[e.x,e.y,e.z]}
  if(v&&v.every(Number.isFinite))pose[n]=v}
 if(o.name)$("pname").value=String(o.name).slice(0,40);if(["idle","talkA","talkB"].includes(o.tag)){tag=o.tag}renderUI();toast("Imported "+(o.name||"pose"))}
const fname=()=>"grokchan-pose-"+(($("pname").value.trim()||"pose").toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-|-$/g,"")||"pose")+".json";
const fileBlob=()=>new Blob([JSON.stringify(exportObj(),null,2)],{type:"application/json"});
function download(){const a=document.createElement("a");a.href=URL.createObjectURL(fileBlob());a.download=fname();document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);toast("Downloaded "+fname())}
async function share(){const f=new File([fileBlob()],fname(),{type:"application/json"});
 if(navigator.canShare?.({files:[f]})){try{await navigator.share({files:[f],title:fname()})}catch(e){if(e.name!=="AbortError")download()}}else{download();toast("Sharing not supported here — downloaded instead")}}
$("dl").onclick=download;$("share").onclick=share;
$("imp").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{importObj(JSON.parse(await f.text()))}catch(x){toast("Couldn't read that file: "+x.message)}e.target.value=""};
// ---- UI ----
document.querySelectorAll("#load [data-l]").forEach(b=>b.onclick=()=>loadPreset(b.dataset.l));
$("undo").onclick=()=>{const s=hist.pop();if(s===undefined)return toast("Nothing to undo");pose=JSON.parse(s);renderUI()};
$("resetb").onclick=()=>{push();delete pose[sel];renderUI()};$("mirror").onclick=mirror;
document.querySelectorAll("#fpre [data-f]").forEach(b=>b.onclick=()=>fingerPreset(b.dataset.f));
document.querySelectorAll("#fside button").forEach(b=>b.onclick=()=>{fside=b.dataset.s;document.querySelectorAll("#fside button").forEach(x=>x.classList.toggle("on",x===b))});
document.querySelectorAll("#tag button").forEach(b=>b.onclick=()=>{tag=b.dataset.t;renderUI()});
function renderUI(){
 $("groups").innerHTML="";for(const g in GROUPS){const b=document.createElement("button");b.textContent=g;b.className=g===group?"on":"";b.onclick=()=>{group=g;sel=GROUPS[g].find(n=>vrm?.humanoid.getNormalizedBoneNode(n))||GROUPS[g][0];renderUI()};$("groups").append(b)}
 $("bones").innerHTML="";for(const n of GROUPS[group]){if(vrm&&!vrm.humanoid.getNormalizedBoneNode(n))continue;const b=document.createElement("button");b.textContent=pretty(n)+(pose[n]?" •":"");b.className=n===sel?"on":"";b.onclick=()=>{sel=n;renderUI()};$("bones").append(b)}
 const v=pose[sel]||[0,0,0];$("rot").innerHTML="";
 ["x","y","z"].forEach((ax,i)=>{const r=document.createElement("div");r.className="ax";const deg=+(v[i]*D).toFixed(1);
  r.innerHTML=`<b class="${ax}">${ax.toUpperCase()}</b><button aria-label="${ax} minus 1">−</button><input type="range" min="-180" max="180" step="0.1" value="${deg}" aria-label="${ax} rotation"><button aria-label="${ax} plus 1">+</button><input type="number" min="-180" max="180" step="1" value="${deg}">`;
  const[m,rg,p,num]=[r.children[1],r.children[2],r.children[3],r.children[4]];
  const setv=(d,commit)=>{d=Math.max(-180,Math.min(180,d));setBone(sel,i,d/D);rg.value=d;num.value=+d.toFixed(1)};
  rg.addEventListener("pointerdown",push);rg.addEventListener("keydown",push);rg.oninput=()=>setv(+rg.value);rg.onchange=()=>renderBonesOnly();
  num.onchange=()=>{push();setv(+num.value||0);renderBonesOnly()};
  m.onclick=()=>{push();setv(+(+rg.value-1).toFixed(1));renderBonesOnly()};p.onclick=()=>{push();setv(+(+rg.value+1).toFixed(1));renderBonesOnly()};
  $("rot").append(r)});
 document.querySelectorAll("#tag button").forEach(x=>x.classList.toggle("on",x.dataset.t===tag));
 $("st").textContent=vrm?("editing "+pretty(sel)+(sel.match(/^(left|right)/)?" ("+sel.match(/^(left|right)/)[1]+")":"")):$("st").textContent}
function renderBonesOnly(){[...$("bones").children].forEach(b=>{const n=GROUPS[group].find(x=>b.textContent.replace(" •","")===pretty(x));if(n)b.textContent=pretty(n)+(pose[n]?" •":"")})}
renderUI();
