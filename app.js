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
$("new").onclick=()=>{hist=[];$("log").innerHTML=""};
$("f").onsubmit=async e=>{e.preventDefault();const q=$("q").value.trim();if(!q)return;$("q").value="";
 hist.push({role:"user",content:q});add("user",q);const w=add("assistant","…");window.gcAvatar?.thinking();
 try{const r=await fetch(WORKER_URL+"/chat",{method:"POST",headers:{"Content-Type":"application/json","X-Access-Password":$("pw").value},body:JSON.stringify({messages:hist.slice(-20),model:$("model").value})});
  const o=await r.json();w.remove();window.gcAvatar?.idle();
  if(r.status===401){add("err","Wrong password.");hist.pop();return}
  if(!r.ok){add("err",o.error||"Error");hist.pop();return}
  hist.push({role:"assistant",content:o.reply});add("assistant",o.reply,o.model);window.gcAvatar?.speak(o.reply)}
 catch(x){w.remove();window.gcAvatar?.idle();hist.pop();add("err","Network error: "+x.message)}};
$("q").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("f").requestSubmit()}};
