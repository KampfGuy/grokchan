const WORKER_URL="https://grokchan-api.kampfguy.workers.dev";
const MODELS=["nvidia/nemotron-3-super-120b-a12b:free","thinkingmachines/inkling:free","nvidia/nemotron-3.5-lightning:free","google/gemma-4-31b-it:free"];
const $=id=>document.getElementById(id);let hist=[];
MODELS.forEach(m=>$("model").add(new Option(m,m)));
$("pw").value=localStorage.getItem("gc_pw")||"";$("pw").onchange=()=>localStorage.setItem("gc_pw",$("pw").value);
function add(c,t,s){const d=document.createElement("div");d.className="m "+c;d.textContent=t;if(s){const e=document.createElement("small");e.textContent=s;d.append(e)}$("log").append(d);d.scrollIntoView();return d}
$("new").onclick=()=>{hist=[];$("log").innerHTML=""};
$("f").onsubmit=async e=>{e.preventDefault();const q=$("q").value.trim();if(!q)return;$("q").value="";
 hist.push({role:"user",content:q});add("user",q);const w=add("assistant","…");
 try{const r=await fetch(WORKER_URL+"/chat",{method:"POST",headers:{"Content-Type":"application/json","X-Access-Password":$("pw").value},body:JSON.stringify({messages:hist.slice(-20),model:$("model").value})});
  const o=await r.json();w.remove();
  if(r.status===401){add("err","Wrong password.");hist.pop();return}
  if(!r.ok){add("err",o.error||"Error");hist.pop();return}
  hist.push({role:"assistant",content:o.reply});add("assistant",o.reply,o.model)}
 catch(x){w.remove();hist.pop();add("err","Network error: "+x.message)}};
$("q").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("f").requestSubmit()}};
