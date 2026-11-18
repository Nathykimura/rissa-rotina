const $ = id => document.getElementById(id);
const STORAGE_KEY = "minha-rotina-tasks-v1";
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let notified = new Set();
const today = new Date();
const localDate = d => { const x=new Date(d.getTime()-d.getTimezoneOffset()*60000); return x.toISOString().slice(0,10); };
$("todayLabel").textContent = today.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"}).toUpperCase();
$("greeting").textContent = (today.getHours()<12?"Bom dia":today.getHours()<18?"Boa tarde":"Boa noite")+"! ✨";
$("dayPicker").value = localDate(today);
$("taskDate").value = localDate(today);

function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(tasks));render();}
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600);}
function render(){
 const day=$("dayPicker").value;
 const list=tasks.filter(t=>t.date===day).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
 $("taskList").innerHTML="";
 if(!list.length){$("taskList").innerHTML='<p class="empty">Nenhuma tarefa por aqui. Adicione a primeira! 🌱</p>';}
 list.forEach(t=>{
  const el=document.createElement("div");el.className="task"+(t.done?" done":"");
  const check=document.createElement("input");check.type="checkbox";check.checked=t.done;check.setAttribute("aria-label","Concluir "+t.title);
  check.addEventListener("change",()=>{t.done=check.checked;save();});
  const main=document.createElement("div");main.className="task-main";
  const title=document.createElement("div");title.className="task-title";title.textContent=t.title;
  const meta=document.createElement("div");meta.className="meta";meta.textContent=`${t.time} · ${t.category} · Aviso ${t.lead===0?"no horário":t.lead+" min antes"}`;
  main.append(title,meta);
  const del=document.createElement("button");del.className="delete";del.textContent="Excluir";del.addEventListener("click",()=>{tasks=tasks.filter(x=>x.id!==t.id);save();toast("Tarefa excluída.");});
  el.append(check,main,del);$("taskList").append(el);
 });
 const done=list.filter(t=>t.done).length;
 $("totalCount").textContent=list.length;$("doneCount").textContent=done;
 $("progressPct").textContent=(list.length?Math.round(done/list.length*100):0)+"%";
 const next=list.find(t=>!t.done && new Date(`${t.date}T${t.time}:00`)>new Date());
 $("nextCount").textContent=next?next.time:"—";
}
$("dayPicker").addEventListener("change",render);
$("taskForm").addEventListener("submit",e=>{
 e.preventDefault();
 const task={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title:$("taskTitle").value.trim(),date:$("taskDate").value,time:$("taskTime").value,category:$("taskCategory").value,lead:Number($("taskLead").value),done:false};
 if(!task.title||!task.date||!task.time)return;
 tasks.push(task);$("dayPicker").value=task.date;$("taskTitle").value="";save();toast("Tarefa salva neste aparelho! 🩵");
});
$("notifyBtn").addEventListener("click",async()=>{
 if(!("Notification" in window)){toast("Este navegador não oferece notificações.");return;}
 const permission=await Notification.requestPermission();
 if(permission==="granted"){toast("Permissão ativada! Deixe o app aberto para os lembretes desta versão.");new Notification("Minha Rotina",{body:"Avisos ativados neste aparelho. 🩵",icon:"icon-192.png"});}
 else toast("Permissão não concedida. Ative nas configurações do navegador.");
});
function checkReminders(){
 if(!("Notification" in window)||Notification.permission!=="granted")return;
 const now=Date.now();
 tasks.filter(t=>!t.done).forEach(t=>{
  const due=new Date(`${t.date}T${t.time}:00`).getTime()-t.lead*60000;
  const key=t.id+"-"+t.date;
  if(due<=now && due>now-60000 && !notified.has(key)){
   new Notification("Lembrete: "+t.title,{body:`Está na hora da sua tarefa (${t.time}).`,icon:"icon-192.png",tag:key});
   notified.add(key);
  }
 });
}
if("serviceWorker" in navigator && location.protocol!=="file:"){navigator.serviceWorker.register("./sw.js").catch(()=>{});}
render();checkReminders();setInterval(checkReminders,15000);
