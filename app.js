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
 md=t=>DOMPurify.sanitize(marked.parse(t.replace(/(^|[\s(])\*[ \t]+([^*\n]+?)[ \t]+\*(?=[\s.,!?)]|$)/gm,"$1*$2*")),{ALLOWED_TAGS:["p","br","strong","em","b","i","code","pre","ul","ol","li","a","blockquote","h1","h2","h3","h4","del","hr"],ALLOWED_ATTR:["href","target","rel"],ALLOWED_URI_REGEXP:/^(https?:|mailto:)/i});
}
function add(c,t,s){const row=document.createElement("div");row.className="row "+c;
 if(c!=="user"){const p=document.createElement("div");p.className="pfp sm";p.innerHTML='<img src="pfp.jpg" alt="">';p.setAttribute("aria-hidden","true");row.append(p)}
 const d=document.createElement("div");d.className="m";
 if(c==="assistant"&&md){const b=document.createElement("div");b.className="md";b.innerHTML=md(t);d.append(b)}else d.textContent=t;
 if(s){const e=document.createElement("small");e.textContent=s;d.append(e)}row.append(d);$("log").append(row);scrollLog();return row}
function scrollLog(){const l=$("log");requestAnimationFrame(()=>l.scrollTop=l.scrollHeight)}
let typingRow=null;
function setStatus(s){const e=$("status");if(!e)return;e.className="status "+(s==="online"?"":s);e.querySelector("span").textContent=s==="typing"?"typing…":s==="speaking"?"speaking…":"online"}
function showTyping(){hideTyping();typingRow=document.createElement("div");typingRow.className="row assistant";typingRow.innerHTML='<div class="pfp sm" aria-hidden="true"><img src="pfp.jpg" alt=""></div><div class="m typing" aria-label="Grok-Chan is typing"><div class="dots"><span></span><span></span><span></span></div></div>';$("log").append(typingRow);scrollLog();setStatus("typing")}
function hideTyping(){if(typingRow){typingRow.remove();typingRow=null}}
// --- voice (free Web Speech API) ---
const TTS=window.speechSynthesis||null;let ttsUnlocked=false,voice=null,jaVoice=null;
const DESKTOP=!matchMedia("(pointer:coarse)").matches;
const MODES=DESKTOP?["ja","en","off"]:["ja","off"]; // English Kokoro is desktop-only
let vmode=localStorage.getItem("gc_vmode")||(localStorage.getItem("gc_voice")==="off"?"off":"ja");if(!MODES.includes(vmode))vmode="ja";
let voiceOn=vmode!=="off";
function pickVoice(){if(!TTS)return;const all=TTS.getVoices();
 const vs=all.filter(v=>/^en/i.test(v.lang));
 const pref=[/samantha/i,/google uk english female/i,/microsoft (aria|jenny|sonia|libby|zira).*natural/i,/microsoft (aria|jenny|sonia|libby|zira)/i,/google us english/i,/karen|moira|tessa|serena|victoria|fiona|female/i];
 voice=null;for(const r of pref){const v=vs.find(v=>r.test(v.name));if(v){voice=v;break}}if(!voice&&vs.length)voice=vs[0];
 const js=all.filter(v=>/^ja/i.test(v.lang)||/日本語|japanese/i.test(v.name));
 const jp=[/kyoko/i,/o-?ren/i,/google 日本語|google japanese/i,/nanami/i,/haruka/i,/ayumi|sayaka|mizuki|female/i];
 jaVoice=null;for(const r of jp){const v=js.find(v=>r.test(v.name));if(v){jaVoice=v;break}}if(!jaVoice&&js.length)jaVoice=js[0]}
if(TTS){pickVoice();TTS.addEventListener?.("voiceschanged",pickVoice)}
const ML={ja:["🔊 JP","Voice: Japanese (tap to change)"],en:["🔊 EN","Voice: English anime (Kokoro, desktop)"],off:["🔇","Voice off"]};
function setSpk(){const[l,ti]=ML[vmode];$("spk").textContent=l;$("spk").title=ti+(vmode==="en"?(kReady?" — ready":kw?" — loading…":""):"");$("spk").setAttribute("aria-label",ti);$("spk").classList.toggle("off",vmode==="off")}
setSpk();$("spk").onclick=()=>{vmode=MODES[(MODES.indexOf(vmode)+1)%MODES.length];voiceOn=vmode!=="off";localStorage.setItem("gc_vmode",vmode);setSpk();unlockTTS();
 TTS?.cancel();kStop();vvStop();kJob=null;window.gcAvatar?.stopTalk?.()};
function unlockTTS(){unlockAudio();primeAudio();if(vmode==="en")initKokoro();if(!TTS||ttsUnlocked)return;try{const u=new SpeechSynthesisUtterance(" ");u.volume=0;TTS.speak(u);ttsUnlocked=true}catch(e){}}
// split "<ja>…</ja>" off the reply; tolerate a missing or unterminated tag
function splitJa(r){const m=r.match(/<ja>([\s\S]*?)(?:<\/ja>|$)/i);let en=r,ja="";
 if(m){ja=m[1].trim();en=r.slice(0,m.index)+r.slice(m.index+m[0].length)}
 en=en.replace(/<\/?ja>?/gi,"").replace(/<j?a?$/i,"").trim();
 ja=ja.replace(/<[^>]*>?/g,"").replace(/[\p{Extended_Pictographic}\uFE0F\u200d]/gu,"").trim();
 return{en:en||r.replace(/<\/?ja>/gi,"").trim(),ja}}
function plain(t){return t.replace(/```[\s\S]*?```/g," code block. ").replace(/`([^`]*)`/g,"$1").replace(/!\[[^\]]*\]\([^)]*\)/g,"").replace(/\[([^\]]*)\]\([^)]*\)/g,"$1")
 .replace(/<[^>]+>/g,"").replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm,"").replace(/(\*\*|__|\*|_|~~)(?=\S)([\s\S]*?\S)\1/g,"$2")
 .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u200d\uFE0F\u20E3]/gu,"").replace(/[*_#~|]/g,"").replace(/\s+/g," ").trim()}
// --- anime voice: Kokoro in a Web Worker, played through Web Audio with a pitch lift ---
const KV={voice:"af_heart",rate:1.12}; // playbackRate 1.13 ~ +2 semitones (cuter, slightly faster)
var kw=null,kReady=false,kFail=false,actx=null,kId=0,kSrcs=[];
function initKokoro(){if(kw||kFail||!window.Worker)return;try{kw=new Worker("tts-worker.js?v=1792106644",{type:"module"});
 kw.onmessage=({data:m})=>{if(m.type==="ready"){kReady=true;setSpk()}else if(m.type==="error"&&!kReady){kFail=true;kw.terminate();kw=null;setSpk()}else kHandle(m)};
 kw.onerror=()=>{kFail=true;kw=null;setSpk()};kw.postMessage({type:"init"})}catch(e){kFail=true}}
function unlockAudio(){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state!=="running")actx.resume();
 const b=actx.createBuffer(1,1,22050),s=actx.createBufferSource();s.buffer=b;s.connect(actx.destination);s.start()}catch(e){}}
function kStop(){kId++;if(!vvAbort)cue(false);kw?.postMessage({type:"cancel"});kSrcs.forEach(s=>{try{s.onended=null;s.stop()}catch(e){}});kSrcs=[]}
var kJob=null;
function cue(on){} // replaced by the typing bubble
function kHandle(m){const j=kJob;if(!j||m.id!==j.id)return;
 if(m.type==="error"){j.fail();return}
 if(m.type==="audio"){clearTimeout(j.to);cue(false);if(!actx||!m.audio.length){j.fail();return}
  const buf=actx.createBuffer(1,m.audio.length,m.sr);buf.copyToChannel(m.audio,0);
  const s=actx.createBufferSource();s.buffer=buf;s.playbackRate.value=KV.rate;s.connect(actx.destination);kSrcs.push(s);
  s.onended=()=>{if(j.id===kId){window.gcAvatar?.stopTalk?.();setStatus("online");kJob=null;window.gcVoiceLog?.push(["end",performance.now()])}};
  if(actx.state!=="running")actx.resume();
  j.show?.();s.start();window.gcAvatar?.speak(j.text,true);setStatus("speaking");window.gcVoiceLog?.push(["start",performance.now(),buf.duration/KV.rate])}}
function kSay(t,txt,fallback,show=()=>{}){kStop();const id=kId;cue(true);window.gcVoiceLog?.push(["gen",performance.now()]);
 kJob={id,text:t,show,fail(){if(kJob&&kJob.id===id){kJob=null;kStop();cue(false);show();window.gcVoiceLog?.push(["fallback",performance.now()]);fallback()}}};
 kJob.to=setTimeout(()=>kJob?.id===id&&kJob.fail(),25000); // too slow -> browser voice
 kw.postMessage({type:"gen",id,text:txt,voice:KV.voice})}
// --- Japanese voice: VOICEVOX:四国めたん（ツンツン） via the Worker's /tts (tts.quest) ---
const vvAudio=new Audio();vvAudio.preload="auto";vvAudio.setAttribute("playsinline","");
const SILENT="data:audio/mpeg;base64,SUQzBAAAAAAAIlRTU0UAAAAOAAADTGF2ZjYxLjcuMTAzAAAAAAAAAAAAAAD/83DAAAAAAAAAAAAASW5mbwAAAA8AAAAGAAADKQBaWlpaWlpaWlpaWlpaWlpae3t7e3t7e3t7e3t7e3t7e3ucnJycnJycnJycnJycnJycvb29vb29vb29vb29vb29vb3e3t7e3t7e3t7e3t7e3t7e3v////////////////////8AAAAATGF2YzYxLjE5AAAAAAAAAAAAAAAAJAKjAAAAAAAAAymyjycdAAAAAAAAAAAAAAAAAP/zQMQAAAADSAAAAABMQU1FMy4xMDBVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxFsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";
let vvPrimed=false,vvId=0,vvUrl=null,vvAbort=null;
function primeAudio(){if(vvPrimed)return;vvPrimed=true;try{vvAudio.src=SILENT;vvAudio.muted=true;const p=vvAudio.play();p&&p.then(()=>{vvAudio.pause();vvAudio.muted=false}).catch(()=>{vvAudio.muted=false;vvPrimed=false})}catch(e){vvPrimed=false}}
function vvStop(){vvId++;vvAbort?.abort();vvAbort=null;try{vvAudio.onplaying=vvAudio.onended=vvAudio.onerror=null;vvAudio.pause()}catch(e){}if(vvUrl){URL.revokeObjectURL(vvUrl);vvUrl=null}}
async function vvSay(t,ja,fallback,show=()=>{}){vvStop();const id=vvId,av=window.gcAvatar,L=window.gcVoiceLog;cue(true);L?.push(["vv-req",performance.now()]);
 let failed=false;const fail=why=>{if(failed||id!==vvId)return;failed=true;cue(false);show();L?.push(["vv-fail",performance.now(),why]);vvStop();fallback()};
 const ac=new AbortController();vvAbort=ac;const to=setTimeout(()=>{ac.abort();fail("timeout")},32000);
 try{const r=await fetch(WORKER_URL+"/tts",{method:"POST",signal:ac.signal,headers:{"Content-Type":"application/json","X-Access-Password":$("pw").value},body:JSON.stringify({text:ja,speaker:SPEAKER[persona]})});
  clearTimeout(to);if(id!==vvId)return;if(!r.ok||!/audio/.test(r.headers.get("content-type")||""))return fail("http "+r.status);
  const b=await r.blob();if(id!==vvId)return;vvUrl=URL.createObjectURL(b);L?.push(["vv-audio",performance.now(),b.size,r.headers.get("X-TTS-Ms")]);
  let started=false;
  vvAudio.onplaying=()=>{if(id!==vvId||started)return;started=true;cue(false);av?.speak(t,true);setStatus("speaking");L?.push(["start",performance.now()])};
  vvAudio.onended=()=>{if(id!==vvId)return;av?.stopTalk?.();setStatus("online");L?.push(["end",performance.now(),vvAudio.duration]);vvStop()};
  vvAudio.onerror=()=>fail("media error");
  vvAudio.muted=false;vvAudio.src=vvUrl;show();await vvAudio.play()}
 catch(e){clearTimeout(to);if(id===vvId)fail(e.name==="AbortError"?"timeout":"play: "+e.name)}}
// show(): reveal the reply text. With a voice, it is revealed exactly when the audio is ready.
function say(t,ja,show=()=>{}){const av=window.gcAvatar;if(TTS)TTS.cancel();kStop();vvStop();
 const txt=plain(t);if(vmode==="off"||!txt){show();av?.speak(t);return}
 if(vmode==="ja"&&ja){vvSay(t,ja,()=>{if(jaVoice)sayBrowser(t,ja,jaVoice,1.45,1.05);else sayBrowser(t,txt)},show);return}
 if(vmode==="en"&&kReady&&actx){kSay(t,txt,()=>sayBrowser(t,txt),show);return}
 show();sayBrowser(t,txt)}
function sayBrowser(t,txt,v=voice,pitch=1.2,rate=1){const av=window.gcAvatar;if(!TTS){av?.speak(t);return}
 const u=new SpeechSynthesisUtterance(txt);if(v){u.voice=v;u.lang=v.lang}else u.lang="en-US";u.pitch=pitch;u.rate=rate;
 let started=false,done=false;window.gcVoiceLog?.push(["tts",performance.now(),u.lang,v?.name||null]);
 u.onstart=()=>{started=true;av?.speak(t,true);setStatus("speaking");window.gcVoiceLog?.push(["start",performance.now()])};
 u.onend=u.onerror=()=>{if(done)return;done=true;setStatus("online");if(started)av?.stopTalk?.();else av?.speak(t);window.gcVoiceLog?.push(["end",performance.now()])};
 TTS.speak(u);
 setTimeout(()=>{if(!started&&!done){done=true;TTS.cancel();setStatus("online");av?.speak(t);window.gcVoiceLog?.push(["timer-fallback",performance.now()])}},2500)} // no voices / blocked: timer fallback
// --- personas ---
var chatGen=0;const PERSONAS=["tsundere","deredere","yandere"],SPEAKER={tsundere:6,deredere:0,yandere:4}; // VOICEVOX 四国めたん: ツンツン / あまあま / セクシー
let persona=localStorage.getItem("gc_persona");if(!PERSONAS.includes(persona))persona="tsundere";
function setPersona(p,fresh){persona=p;localStorage.setItem("gc_persona",p);document.body.dataset.persona=p;
 const seg=$("persona");seg.dataset.i=PERSONAS.indexOf(p);seg.querySelectorAll("button").forEach(b=>b.setAttribute("aria-checked",b.dataset.p===p));
 if(fresh){TTS?.cancel();kStop();vvStop();kJob=null;window.gcAvatar?.stopTalk?.();hideTyping();setStatus("online");hist=[];$("log").innerHTML="";chatGen++}}
$("persona").querySelectorAll("button").forEach(b=>b.onclick=()=>{if(b.dataset.p!==persona)setPersona(b.dataset.p,true)});
setPersona(persona,false);
$("new").onclick=()=>{setPersona(persona,true)};
$("f").onsubmit=async e=>{e.preventDefault();unlockTTS();const q=$("q").value.trim();if(!q)return;
 if(!$("pw").value){showGate();return}
 $("q").value="";autosize();
 hist.push({role:"user",content:q});add("user",q);if(TTS)TTS.cancel();kStop();vvStop();kJob=null;window.gcAvatar?.stopTalk?.();showTyping();window.gcAvatar?.thinking();const gen=chatGen;
 try{const r=await fetch(WORKER_URL+"/chat",{method:"POST",headers:{"Content-Type":"application/json","X-Access-Password":$("pw").value},body:JSON.stringify({messages:hist.slice(-20),model:$("model").value,persona})});
  const o=await r.json();if(gen!==chatGen)return;window.gcAvatar?.idle();
  if(r.status===401){hideTyping();setStatus("online");hist.pop();$("log").lastElementChild?.remove();$("q").value=q;showGate(true);return}
  if(!r.ok){hideTyping();setStatus("online");add("err",o.error||"Error");hist.pop();return}
  hist.push({role:"assistant",content:o.reply});const sp=splitJa(o.reply);
  let shown=false;const show=()=>{if(shown)return;shown=true;hideTyping();if(!$("status").classList.contains("speaking"))setStatus("online");add("assistant",sp.en,o.model)};
  say(sp.en,sp.ja,show)}
 catch(x){if(gen!==chatGen)return;hideTyping();setStatus("online");window.gcAvatar?.idle();hist.pop();add("err","Network error: "+x.message)}};
// password gate
function showGate(bad){$("gate").hidden=false;$("gerr").hidden=!bad;setTimeout(()=>$("pw").focus(),50)}
$("gf").onsubmit=e=>{e.preventDefault();const v=$("pw").value.trim();if(!v)return;localStorage.setItem("gc_pw",v);$("gate").hidden=true;unlockTTS();if($("q").value.trim())$("f").requestSubmit();else $("q").focus()};
if(!$("pw").value)showGate();
// input autosize
function autosize(){const q=$("q");q.style.height="auto";q.style.height=Math.min(q.scrollHeight,140)+"px"}
$("q").addEventListener("input",autosize);
$("q").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("f").requestSubmit()}};
window.gcVoiceLog=[];
addEventListener("pointerdown",()=>unlockTTS(),{once:true,capture:true}); // preload the voice model on the first tap
