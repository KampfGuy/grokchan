import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {VRMLoaderPlugin, VRMUtils} from "@pixiv/three-vrm";
import {POSES,ROLE,PERSONA_ROLE,boneName} from "./poses.js?v=1792118986";
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
 if(ptrs.size===1){drag={x:e.clientX,y:e.clientY,ry:tgtY,rx:rotX,t:performance.now(),moved:0}}else if(ptrs.size===2){const[a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:dist,mx:(a.x+b.x)/2,my:(a.y+b.y)/2,c:center.clone()};drag=null}});
cv.addEventListener("pointermove",e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pinch&&ptrs.size===2){const[a,b]=[...ptrs.values()];setZoom(pinch.z*pinch.d/Math.max(20,Math.hypot(a.x-b.x,a.y-b.y)));pan(pinch,(a.x+b.x)/2-pinch.mx,(a.y+b.y)/2-pinch.my)}
 else if(drag){drag.moved=Math.max(drag.moved,Math.hypot(e.clientX-drag.x,e.clientY-drag.y));if(e.shiftKey||e.buttons===2||e.buttons===4){if(!drag.p)drag.p={c:center.clone(),mx:e.clientX,my:e.clientY};pan(drag.p,e.clientX-drag.p.mx,e.clientY-drag.p.my);return}tgtY=drag.ry+(e.clientX-drag.x)*0.008;rotX=Math.max(-1.45,Math.min(1.45,drag.rx+(e.clientY-drag.y)*0.006))}});
function pan(st,dx,dy){const h=2*dist*Math.tan(cam.fov*Math.PI/360)/cv.clientHeight;const r=new THREE.Vector3().setFromMatrixColumn(cam.matrix,0),u=new THREE.Vector3().setFromMatrixColumn(cam.matrix,1);center.copy(st.c).addScaledVector(r,-dx*h).addScaledVector(u,dy*h)}
const ray=new THREE.Raycaster();cv.addEventListener("pointerup",e=>{const drag=lastDrag;lastDrag=null;if(ptrs.size||!drag||drag.moved>6||performance.now()-drag.t>350||!vrm||!tapT)return;const rc=cv.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-rc.left)/rc.width*2-1,-(e.clientY-rc.top)/rc.height*2+1),cam);const h=ray.intersectObject(vrm.scene,true)[0];if(h){center.copy(h.point);toast("Camera target set")}});
cv.addEventListener("contextmenu",e=>e.preventDefault());
let lastDrag=null;const up=e=>{if(drag)lastDrag=drag;ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(!ptrs.size)drag=null};cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
cv.addEventListener("wheel",e=>{e.preventDefault();setZoom(dist*(1+e.deltaY*0.001))},{passive:false});
let tapT=true;
function setZoom(z){dist=Math.max(0.2,Math.min(5,z));$("zoom").value=dist}
$("zoom").oninput=e=>dist=+e.target.value;$("zoom").min=0.2;$("zoom").max=5;
let home=null;
document.querySelectorAll(".vbtns button[data-v]").forEach(b=>b.onclick=()=>{tgtY=+b.dataset.v;rotX=0.05;if(home){center.copy(home);setZoom(1.6)}});
$("focus").onclick=()=>{if(!home)return;center.copy(marker.position);setZoom(sel.match(/Thumb|Index|Middle|Ring|Little|Hand/)?0.6:0.9)};
const loader=new GLTFLoader();loader.register(p=>new VRMLoaderPlugin(p));
loader.load("grokchan.vrm",g=>{vrm=g.userData.vrm;VRMUtils.removeUnnecessaryVertices?.(g.scene);VRMUtils.combineSkeletons?.(g.scene);VRMUtils.rotateVRM0(vrm);
 scene.add(vrm.scene);vrm.scene.traverse(o=>o.frustumCulled=false);vrm.scene.updateMatrixWorld(true);
 const hp=new THREE.Vector3();vrm.humanoid.getNormalizedBoneNode("hips").getWorldPosition(hp);center.set(0,hp.y+0.25,0);home=center.clone();initExtras();
 $("st").textContent="ready";loadPreset(ROLE.idle);renderUI();window.gcEditor={mirror,ROLE,view(a,z){tgtY=a;if(z)setZoom(z)},camPreset,savePicture,setExpr:(n,v)=>{expr[n]=v;renderExpr()},get expr(){return expr},fullscreen:setFS,get pose(){return pose},exportObj,importObj,setBone,loadPreset}},
 p=>{if(p.total)$("st").textContent="loading model… "+Math.round(p.loaded/p.total*100)+"%"},e=>{$("st").textContent="model failed to load";console.error(e)});
const clock=new THREE.Clock(),tmp=new THREE.Vector3();
renderer.setAnimationLoop(()=>{if(document.hidden)return;const dt=Math.min(clock.getDelta(),.1);rotY+=(tgtY-rotY)*Math.min(1,dt*10);
 cam.position.set(center.x+Math.sin(rotY)*Math.cos(rotX)*dist,center.y+Math.sin(rotX)*dist,center.z+Math.cos(rotY)*Math.cos(rotX)*dist);cam.lookAt(center);
 if(vrm){applyPose();applyExpr();vrm.update(dt);const n=vrm.humanoid.getNormalizedBoneNode(sel);marker.visible=!!n&&!document.body.classList.contains("fs");if(n){vrm.humanoid.update?.();n.getWorldPosition(tmp);
  const raw=vrm.humanoid.getRawBoneNode(sel);if(raw){raw.getWorldPosition(tmp)}marker.position.copy(tmp)}}
 renderer.render(scene,cam)});
function applyPose(){for(const n of Object.values(ALL)){const b=vrm.humanoid.getNormalizedBoneNode(n);if(!b)continue;const v=pose[n]||[0,0,0];b.rotation.set(v[0],v[1],v[2])}}
const ALL=Object.values(GROUPS).flat();
// ---- pose ops ----
function loadPreset(k){push();pose={};if(k!=="T"){for(const [key,v] of Object.entries(POSES[k]||{}))pose[boneName(key)]=[...v]}renderUI();toast(k==="T"?"T-pose loaded":"Loaded "+k)}
function setBone(n,i,rad){pose[n]=pose[n]||[0,0,0];pose[n][i]=rad;if(pose[n].every(v=>Math.abs(v)<1e-6))delete pose[n]}
const mir=n=>n.startsWith("left")?"right"+n.slice(4):n;
function mirror(from="left"){push();const to=from==="left"?"right":"left";for(const n of Object.keys(pose))if(n.startsWith(to))delete pose[n];for(const [n,v] of Object.entries(pose))if(n.startsWith(from))pose[to+n.slice(from.length)]=[v[0],-v[1],-v[2]];renderUI();toast(from==="left"?"Mirrored left → right":"Mirrored right → left")}
const FP={open:{},relaxed:{f:[0.25,0.25,0.2],t:[0.1,0.15,0.1]},fist:{f:[1.45,1.6,1.1],t:[0.5,0.6,0.5]},point:{f:[1.45,1.6,1.1],t:[0.5,0.6,0.5],open:["Index"]},two:{f:[1.45,1.6,1.1],t:[0.5,0.6,0.5],open:["Index","Middle"]}};
function fingerPreset(k){push();const P=FP[k];for(const s of fside==="both"?["left","right"]:[fside]){const sg=s==="left"?-1:1;
 for(const f of FING){const segs=SEG[f]||SEG._;segs.forEach((j,i)=>{const n=s+f+j;delete pose[n];if(!P.f)return;if(P.open?.includes(f))return;
  if(f==="Thumb"){const a=P.t[i];if(a)pose[n]=[0,sg*a*0.8,0]}else{const a=P.f[i];if(a)pose[n]=[0,0,sg*a]}})}}renderUI();toast("Fingers: "+k)}
// ---- export / import ----
function exportObj(){const bones={};const e=new THREE.Euler(),q=new THREE.Quaternion();
 for(const n of Object.keys(pose).sort()){const v=pose[n];e.set(v[0],v[1],v[2],"XYZ");q.setFromEuler(e);
  bones[n]={euler_deg:v.map(x=>+(x*D).toFixed(2)),quat:[q.x,q.y,q.z,q.w].map(x=>+x.toFixed(6))}}
 const ex={};for(const [k,v] of Object.entries(expr))if(v>0.001)ex[k]=+v.toFixed(3);const o={version:2,name:($("pname").value.trim()||"pose"),tag,bones};if(Object.keys(ex).length)o.expressions=ex;if(look.yaw||look.pitch)o.look={yaw:+look.yaw.toFixed(1),pitch:+look.pitch.toFixed(1)};return o}
function importObj(o){if(!o||typeof o!=="object"||!o.bones)throw new Error("not a pose file");push();pose={};
 for(const [n,b] of Object.entries(o.bones)){if(!ALL.includes(n))continue;let v;
  if(Array.isArray(b.euler_deg))v=b.euler_deg.map(x=>(+x||0)/D);else if(Array.isArray(b.quat)){const e=new THREE.Euler().setFromQuaternion(new THREE.Quaternion(...b.quat.map(Number)),"XYZ");v=[e.x,e.y,e.z]}
  if(v&&v.every(Number.isFinite))pose[n]=v}
 expr={};if(o.expressions&&typeof o.expressions==="object")for(const [k,v] of Object.entries(o.expressions)){const n=+v;if(Number.isFinite(n))expr[k]=Math.max(0,Math.min(1,n))}look={yaw:+o.look?.yaw||0,pitch:+o.look?.pitch||0};renderExpr();
 if(o.name)$("pname").value=String(o.name).slice(0,40);if(["idle","talkA","talkB"].includes(o.tag)){tag=o.tag}renderUI();toast("Imported "+(o.name||"pose"))}
const fname=()=>"grokchan-pose-"+(($("pname").value.trim()||"pose").toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-|-$/g,"")||"pose")+".json";
const fileBlob=()=>new Blob([JSON.stringify(exportObj(),null,2)],{type:"application/json"});
function download(){const a=document.createElement("a");a.href=URL.createObjectURL(fileBlob());a.download=fname();document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);toast("Downloaded "+fname())}
async function share(){const f=new File([fileBlob()],fname(),{type:"application/json"});
 if(navigator.canShare?.({files:[f]})){try{await navigator.share({files:[f],title:fname()})}catch(e){if(e.name!=="AbortError")download()}}else{download();toast("Sharing not supported here — downloaded instead")}}
$("dl").onclick=download;$("share").onclick=share;
$("imp").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{importObj(JSON.parse(await f.text()))}catch(x){toast("Couldn't read that file: "+x.message)}e.target.value=""};
// ---- UI ----
const nice=k=>({REST:"Resting",HIPS:"Hands on hips",CHIN:"Chin"})[k]||k.charAt(0)+k.slice(1).toLowerCase();
document.querySelectorAll("#load [data-r]").forEach(b=>{const k=ROLE[b.dataset.r];b.dataset.l=k;b.textContent=nice(k)+" · "+{idle:"Idle",talkA:"Talk A",talkB:"Talk B"}[b.dataset.r]});
{const imp=document.querySelector("#load label.file");for(const [per,o] of Object.entries(PERSONA_ROLE))for(const [r,k] of Object.entries(o)){const b=document.createElement("button");b.dataset.l=k;b.dataset.per=per;b.textContent=nice(k)+" · "+{idle:"Idle",talkA:"Talk A",talkB:"Talk B"}[r]+" ("+{tsundere:"Tsundere",yandere:"Yandere",deredere:"DereDere"}[per]+")";imp.before(b)}}
document.querySelectorAll("#load [data-l]").forEach(b=>b.onclick=()=>loadPreset(b.dataset.l));
$("undo").onclick=()=>{const s=hist.pop();if(s===undefined)return toast("Nothing to undo");pose=JSON.parse(s);renderUI()};
$("resetb").onclick=()=>{push();delete pose[sel];renderUI()};$("mirror").onclick=()=>mirror("left");$("mirrorr").onclick=()=>mirror("right");
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

// ---- v2: expressions, camera, fullscreen, picture ----
let expr={},look={yaw:0,pitch:0},exprNames=[];
const STD=["happy","angry","sad","relaxed","surprised","blink","blinkLeft","blinkRight","aa","ih","ou","ee","oh"];
function applyExpr(){const em=vrm.expressionManager;if(em)for(const n of exprNames)em.setValue(n,expr[n]||0);
 if(vrm.lookAt){vrm.lookAt.target=null;vrm.lookAt.autoUpdate=false;vrm.lookAt.yaw=look.yaw;vrm.lookAt.pitch=look.pitch}}
function slider(label,min,max,step,val,on){const r=document.createElement("div");r.className="ex";r.innerHTML=`<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${val}"><output>${(+val).toFixed(step<1?2:0)}</output>`;
 const[i,o]=[r.children[1],r.children[2]];i.oninput=()=>{on(+i.value);o.textContent=(+i.value).toFixed(step<1?2:0)};return r}
function renderExpr(){const box=$("exprs");if(!box||!vrm)return;box.innerHTML="";
 for(const n of exprNames)box.append(slider(n,0,1,0.01,expr[n]||0,v=>expr[n]=v));
 box.append(slider("look ↔",-30,30,1,look.yaw,v=>look.yaw=v),slider("look ↕",-25,25,1,look.pitch,v=>look.pitch=v))}
const boneW=n=>{const b=vrm.humanoid.getRawBoneNode(n)||vrm.humanoid.getNormalizedBoneNode(n);return b?b.getWorldPosition(new THREE.Vector3()):null};
function camPreset(k){if(!vrm)return;vrm.scene.updateMatrixWorld(true);const head=boneW("head"),hips=boneW("hips");
 if(k==="head"){center.copy(head).add(new THREE.Vector3(0,0.06,0));setZoom(0.95);setFov(25);rotX=0.05;tgtY=0}
 else if(k==="full"){center.set(0,hips.y*0.95,0);setZoom(3.2);setFov(30);rotX=0.08;tgtY=0}
 else if(k==="threeq"){center.copy(head).lerp(hips,0.45);setZoom(1.9);setFov(28);rotX=0.12;tgtY=0.6}
 else if(k==="focushead"){center.copy(head).add(new THREE.Vector3(0,0.06,0))}}
function setFov(f){cam.fov=f;cam.updateProjectionMatrix();if($("fov")){$("fov").value=f;$("fov").nextElementSibling.textContent=Math.round(f)+"°"}}
function setFS(on){document.body.classList.toggle("fs",on);const d=document.documentElement;
 if(on){if(d.requestFullscreen&&!document.fullscreenElement)d.requestFullscreen().catch(()=>{})}else if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
 setTimeout(resize,60)}
document.addEventListener("fullscreenchange",()=>{if(!document.fullscreenElement&&document.body.classList.contains("fs")){document.body.classList.remove("fs");setTimeout(resize,60)}});
async function savePicture(opt){opt=opt||{};const bg=opt.bg??$("picbg").value,col=opt.color??$("piccol").value,sq=opt.square??$("picsq").checked,long=opt.size??+$("picsize").value;
 const w0=cv.clientWidth,h0=cv.clientHeight;let W,H;if(sq){W=H=long}else if(w0>=h0){W=long;H=Math.round(long*h0/w0)}else{H=long;W=Math.round(long*w0/h0)}
 const pr=renderer.getPixelRatio(),mv=marker.visible,ob=scene.background,asp=cam.aspect;
 marker.visible=false;scene.background=bg==="solid"?new THREE.Color(col):null;renderer.setPixelRatio(1);renderer.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix();
 renderer.render(scene,cam);const blob=await new Promise(r=>cv.toBlob(r,"image/png"));
 marker.visible=mv;scene.background=ob;renderer.setPixelRatio(pr);cam.aspect=asp;resize();
 const name="grokchan-"+(($("pname").value.trim()||"picture").toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-|-$/g,"")||"picture")+".png";
 window.gcLastPic={name,size:blob.size,W,H};if(opt.noSave)return blob;
 const f=new File([blob],name,{type:"image/png"});
 if(opt.share!==false&&navigator.canShare?.({files:[f]})){try{await navigator.share({files:[f],title:name});return blob}catch(e){if(e.name==="AbortError")return blob}}
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);toast(`Saved ${W}×${H} PNG`);return blob}
function initExtras(){const em=vrm.expressionManager;const all=em?(em.expressions||[]).map(e=>e.expressionName):[];
 exprNames=[...STD.filter(n=>all.includes(n)),...all.filter(n=>!STD.includes(n)&&!/^(look(Up|Down|Left|Right)|neutral)$/.test(n))];renderExpr()}
document.querySelectorAll("[data-cam]").forEach(b=>b.onclick=()=>camPreset(b.dataset.cam));
$("fov").oninput=e=>setFov(+e.target.value);$("tapt").onchange=e=>tapT=e.target.checked;
$("exreset").onclick=()=>{expr={};look={yaw:0,pitch:0};renderExpr()};
$("fsbtn").onclick=()=>setFS(true);$("fsx").onclick=()=>setFS(false);
$("cap").onclick=()=>savePicture();$("savepic").onclick=()=>savePicture();
$("picbg").onchange=e=>$("piccol").disabled=e.target.value!=="solid";
