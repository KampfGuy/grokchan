const WORKER_URL="https://grokchan-api.kampfguy.workers.dev";
const MODELS=["nvidia/nemotron-3-super-120b-a12b:free","thinkingmachines/inkling:free","nvidia/nemotron-3.5-lightning:free","google/gemma-4-31b-it:free"];
const $=id=>document.getElementById(id);let hist=[];
MODELS.forEach(m=>$("model").add(new Option(m,m)));
$("pw").value=localStorage.getItem("gc_pw")||"";$("pw").onchange=()=>localStorage.setItem("gc_pw",$("pw").value);
const esc=t=>t.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let md=null;
if(window.marked&&window.DOMPurify){
 marked.use({gfm:true,breaks:true,renderer:{html(t){return esc(typeof t==="string"?t:t.text||t.raw||"")}}});
 DOMPurify.addHook("afterSanitizeAttributes",n=>{if(n.tagName==="A"){n.setAttribute("target","_blank");n.setAttribute("rel","noopener noreferrer")}});
 md=t=>DOMPurify.sanitize(marked.parse(t),{ALLOWED_TAGS:["p","br","strong","em","b","i","code","pre","ul","ol","li","a","blockquote","h1","h2","h3","h4","del","hr"],ALLOWED_ATTR:["href","target","rel"],ALLOWED_URI_REGEXP:/^(https?:|mailto:)/i});
}
function add(c,t,s){const d=document.createElement("div");d.className="m "+c;
 if(c==="assistant"&&md&&t!=="…"){const b=document.createElement("div");b.className="md";b.innerHTML=md(t);d.append(b)}else d.textContent=t;if(s){const e=document.createElement("small");e.textContent=s;d.append(e)}$("log").append(d);d.scrollIntoView();return d}
// --- voice (free Web Speech API) ---
const TTS=window.speechSynthesis||null;let voiceOn=localStorage.getItem("gc_voice")!=="off",ttsUnlocked=false,voice=null;
function pickVoice(){if(!TTS)return;const vs=TTS.getVoices().filter(v=>/^en/i.test(v.lang));if(!vs.length)return;
 const pref=[/samantha/i,/google uk english female/i,/microsoft (aria|jenny|sonia|libby|zira).*natural/i,/microsoft (aria|jenny|sonia|libby|zira)/i,/google us english/i,/karen|moira|tessa|serena|victoria|fiona|female/i];
 for(const r of pref){const v=vs.find(v=>r.test(v.name));if(v){voice=v;return}}voice=vs[0]}
if(TTS){pickVoice();TTS.addEventListener?.("voiceschanged",pickVoice)}
function setSpk(){$("spk").textContent=voiceOn?"🔊":"🔇";$("spk").title=voiceOn?(kReady?"Voice on (anime voice)":kw?"Voice on (loading anime voice…)":"Voice on"):"Voice off";$("spk").setAttribute("aria-pressed",voiceOn);$("spk").classList.toggle("off",!voiceOn)}
setSpk();$("spk").onclick=()=>{voiceOn=!voiceOn;localStorage.setItem("gc_voice",voiceOn?"on":"off");setSpk();unlockTTS();if(!voiceOn){TTS?.cancel();kStop();kJob=null;window.gcAvatar?.stopTalk?.()}};
function unlockTTS(){unlockAudio();if(voiceOn)initKokoro();if(!TTS||ttsUnlocked)return;try{const u=new SpeechSynthesisUtterance(" ");u.volume=0;TTS.speak(u);ttsUnlocked=true}catch(e){}}
function plain(t){return t.replace(/```[\s\S]*?```/g," code block. ").replace(/`([^`]*)`/g,"$1").replace(/!\[[^\]]*\]\([^)]*\)/g,"").replace(/\[([^\]]*)\]\([^)]*\)/g,"$1")
 .replace(/<[^>]+>/g,"").replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm,"").replace(/(\*\*|__|\*|_|~~)(?=\S)([\s\S]*?\S)\1/g,"$2")
 .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u200d\uFE0F\u20E3]/gu,"").replace(/[*_#~|]/g,"").replace(/\s+/g," ").trim()}
// --- anime voice: Kokoro in a Web Worker, played through Web Audio with a pitch lift ---
const KV={voice:"af_heart",rate:1.12}; // playbackRate 1.13 ~ +2 semitones (cuter, slightly faster)
var kw=null,kReady=false,kFail=false,actx=null,kId=0,kSrcs=[];
function initKokoro(){if(kw||kFail||!window.Worker)return;try{kw=new Worker("tts-worker.js?v=1792103606",{type:"module"});
 kw.onmessage=({data:m})=>{if(m.type==="ready"){kReady=true;setSpk()}else if(m.type==="error"&&!kReady){kFail=true;kw.terminate();kw=null;setSpk()}else kHandle(m)};
 kw.onerror=()=>{kFail=true;kw=null;setSpk()};kw.postMessage({type:"init"})}catch(e){kFail=true}}
function unlockAudio(){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state!=="running")actx.resume();
 const b=actx.createBuffer(1,1,22050),s=actx.createBufferSource();s.buffer=b;s.connect(actx.destination);s.start()}catch(e){}}
function kStop(){kId++;cue(false);kw?.postMessage({type:"cancel"});kSrcs.forEach(s=>{try{s.onended=null;s.stop()}catch(e){}});kSrcs=[]}
var kJob=null;
function cue(on){const e=$("vcue");if(e)e.hidden=!on}
function kHandle(m){const j=kJob;if(!j||m.id!==j.id)return;
 if(m.type==="error"){j.fail();return}
 if(m.type==="audio"){clearTimeout(j.to);cue(false);if(!actx||!m.audio.length){j.fail();return}
  const buf=actx.createBuffer(1,m.audio.length,m.sr);buf.copyToChannel(m.audio,0);
  const s=actx.createBufferSource();s.buffer=buf;s.playbackRate.value=KV.rate;s.connect(actx.destination);kSrcs.push(s);
  s.onended=()=>{if(j.id===kId){window.gcAvatar?.stopTalk?.();kJob=null;window.gcVoiceLog?.push(["end",performance.now()])}};
  if(actx.state!=="running")actx.resume();
  s.start();window.gcAvatar?.speak(j.text,true);window.gcVoiceLog?.push(["start",performance.now(),buf.duration/KV.rate])}}
function kSay(t,txt,fallback){kStop();const id=kId;cue(true);window.gcVoiceLog?.push(["gen",performance.now()]);
 kJob={id,text:t,fail(){if(kJob&&kJob.id===id){kJob=null;kStop();cue(false);window.gcVoiceLog?.push(["fallback",performance.now()]);fallback()}}};
 kJob.to=setTimeout(()=>kJob?.id===id&&kJob.fail(),25000); // too slow -> browser voice
 kw.postMessage({type:"gen",id,text:txt,voice:KV.voice})}
function say(t){const av=window.gcAvatar;if(TTS)TTS.cancel();kStop();
 const txt=plain(t);if(!voiceOn||!txt){av?.speak(t);return}
 if(kReady&&actx){kSay(t,txt,()=>sayBrowser(t,txt));return}
 sayBrowser(t,txt)}
function sayBrowser(t,txt){const av=window.gcAvatar;if(!TTS){av?.speak(t);return}
 const u=new SpeechSynthesisUtterance(txt);if(voice){u.voice=voice;u.lang=voice.lang}else u.lang="en-US";u.pitch=1.2;u.rate=1;
 let started=false,done=false;
 u.onstart=()=>{started=true;av?.speak(t,true)};
 u.onend=u.onerror=()=>{if(done)return;done=true;if(started)av?.stopTalk?.();else av?.speak(t)};
 TTS.speak(u);
 setTimeout(()=>{if(!started&&!done){done=true;TTS.cancel();av?.speak(t)}},2500)} // no voices / blocked: timer fallback
$("new").onclick=()=>{hist=[];$("log").innerHTML=""};
$("f").onsubmit=async e=>{e.preventDefault();unlockTTS();const q=$("q").value.trim();if(!q)return;$("q").value="";
 hist.push({role:"user",content:q});add("user",q);if(TTS)TTS.cancel();kStop();kJob=null;window.gcAvatar?.stopTalk?.();const w=add("assistant","…");window.gcAvatar?.thinking();
 try{const r=await fetch(WORKER_URL+"/chat",{method:"POST",headers:{"Content-Type":"application/json","X-Access-Password":$("pw").value},body:JSON.stringify({messages:hist.slice(-20),model:$("model").value})});
  const o=await r.json();w.remove();window.gcAvatar?.idle();
  if(r.status===401){add("err","Wrong password.");hist.pop();return}
  if(!r.ok){add("err",o.error||"Error");hist.pop();return}
  hist.push({role:"assistant",content:o.reply});add("assistant",o.reply,o.model);say(o.reply)}
 catch(x){w.remove();window.gcAvatar?.idle();hist.pop();add("err","Network error: "+x.message)}};
$("q").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("f").requestSubmit()}};
window.gcVoiceLog=[];
addEventListener("pointerdown",()=>unlockTTS(),{once:true,capture:true}); // preload the voice model on the first tap
