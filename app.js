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
 TTS?.cancel();kStop();kJob=null;window.gcAvatar?.stopTalk?.()};
function unlockTTS(){unlockAudio();if(vmode==="en")initKokoro();if(!TTS||ttsUnlocked)return;try{const u=new SpeechSynthesisUtterance(" ");u.volume=0;TTS.speak(u);ttsUnlocked=true}catch(e){}}
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
function initKokoro(){if(kw||kFail||!window.Worker)return;try{kw=new Worker("tts-worker.js?v=1792105798",{type:"module"});
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
function say(t,ja){const av=window.gcAvatar;if(TTS)TTS.cancel();kStop();
 const txt=plain(t);if(vmode==="off"||!txt){av?.speak(t);return}
 if(vmode==="ja"&&ja&&jaVoice){sayBrowser(t,ja,jaVoice,1.45,1.05);return}
 if(vmode==="en"&&kReady&&actx){kSay(t,txt,()=>sayBrowser(t,txt));return}
 sayBrowser(t,txt)}
function sayBrowser(t,txt,v=voice,pitch=1.2,rate=1){const av=window.gcAvatar;if(!TTS){av?.speak(t);return}
 const u=new SpeechSynthesisUtterance(txt);if(v){u.voice=v;u.lang=v.lang}else u.lang="en-US";u.pitch=pitch;u.rate=rate;
 let started=false,done=false;window.gcVoiceLog?.push(["tts",performance.now(),u.lang,v?.name||null]);
 u.onstart=()=>{started=true;av?.speak(t,true);window.gcVoiceLog?.push(["start",performance.now()])};
 u.onend=u.onerror=()=>{if(done)return;done=true;if(started)av?.stopTalk?.();else av?.speak(t);window.gcVoiceLog?.push(["end",performance.now()])};
 TTS.speak(u);
 setTimeout(()=>{if(!started&&!done){done=true;TTS.cancel();av?.speak(t);window.gcVoiceLog?.push(["timer-fallback",performance.now()])}},2500)} // no voices / blocked: timer fallback
$("new").onclick=()=>{hist=[];$("log").innerHTML=""};
$("f").onsubmit=async e=>{e.preventDefault();unlockTTS();const q=$("q").value.trim();if(!q)return;$("q").value="";
 hist.push({role:"user",content:q});add("user",q);if(TTS)TTS.cancel();kStop();kJob=null;window.gcAvatar?.stopTalk?.();const w=add("assistant","…");window.gcAvatar?.thinking();
 try{const r=await fetch(WORKER_URL+"/chat",{method:"POST",headers:{"Content-Type":"application/json","X-Access-Password":$("pw").value},body:JSON.stringify({messages:hist.slice(-20),model:$("model").value})});
  const o=await r.json();w.remove();window.gcAvatar?.idle();
  if(r.status===401){add("err","Wrong password.");hist.pop();return}
  if(!r.ok){add("err",o.error||"Error");hist.pop();return}
  hist.push({role:"assistant",content:o.reply});const sp=splitJa(o.reply);add("assistant",sp.en,o.model);say(sp.en,sp.ja)}
 catch(x){w.remove();window.gcAvatar?.idle();hist.pop();add("err","Network error: "+x.message)}};
$("q").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("f").requestSubmit()}};
window.gcVoiceLog=[];
addEventListener("pointerdown",()=>unlockTTS(),{once:true,capture:true}); // preload the voice model on the first tap
