import {initializeApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {getFirestore,collection,doc,getDoc,addDoc,updateDoc,deleteDoc,onSnapshot,serverTimestamp,writeBatch} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {getMessaging,getToken,onMessage,isSupported} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js";

const firebaseConfig={apiKey:"AIzaSyBnQIuZ_ifTHDbGoqm_QyZ6gVaUEex4W_s",authDomain:"minha-rotina-355cc.firebaseapp.com",projectId:"minha-rotina-355cc",storageBucket:"minha-rotina-355cc.firebasestorage.app",messagingSenderId:"166306568283",appId:"1:166306568283:web:3f226c855be35dd75d877e",measurementId:"G-CWRLFCLVP7"};
const VAPID_PUBLIC_KEY="BL4pDEUMlBmdFmJqyTzy4Y-S_cg2BPojo8pJsrTMtd2CJVpdYmrv5svx2OzFjBGB-lhZ22YeVTwGAQPraJLBe0s";
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const DAYS=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"],SHORT=["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];
const $=id=>document.getElementById(id);
let selectedDay=new Date().getDay(),tasks=[],plannerId="rotina-da-amiga",currentUser=null,isOwner=false,stopTasks=null,reminders=[],messaging=null;
function toast(s){const t=$("toast");t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400)}
function minutes(t){const [h,m]=t.split(":").map(Number);return h*60+m}
function authMsg(s){$("authMessage").textContent=s}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();authMsg("Entrando...");try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value)}catch(err){authMsg("Não foi possível entrar. Confira e-mail e senha.")}});
$("logoutBtn").addEventListener("click",()=>signOut(auth));
onAuthStateChanged(auth,async user=>{
 if(stopTasks){stopTasks();stopTasks=null} currentUser=user;
 $("authPanel").classList.toggle("hidden",!!user);$("appPanel").classList.toggle("hidden",!user);
 if(!user)return;
 $("accountLabel").textContent="Conectando à rotina...";
 try{const p=await getDoc(doc(db,"shared_planners",plannerId));if(!p.exists())throw Error("planner-missing");
 const d=p.data();isOwner=d.ownerUid===user.uid;const editor=Array.isArray(d.editorUids)&&d.editorUids.includes(user.uid);
 if(!isOwner&&!editor)throw Error("not-member");
 $("accountLabel").textContent=(isOwner?"Proprietária":"Administradora")+" · "+(d.name||"Rotina compartilhada");
 stopTasks=onSnapshot(collection(db,"shared_planners",plannerId,"tasks"),snap=>{tasks=snap.docs.map(x=>({id:x.id,...x.data()}));render()},err=>{console.error(err);toast("Erro ao sincronizar tarefas.")});
 updatePushButton();
 }catch(err){console.error(err);$("accountLabel").textContent=err.message==="not-member"?"Esta conta não tem acesso à rotina.":"Não foi possível abrir a rotina. Confira as regras do Firestore.";toast("Falha ao acessar a rotina compartilhada.")}
});
function render(){
 $("todayLabel").textContent="Hoje: "+DAYS[new Date().getDay()];
 $("dayTabs").innerHTML=DAYS.map((d,i)=>'<button class="day-btn '+(i===selectedDay?"active":"")+'" data-day="'+i+'" role="tab" aria-selected="'+(i===selectedDay)+'">'+SHORT[i]+'<small>'+tasks.filter(t=>t.day===i).length+' itens</small></button>').join("");
 $("dayTabs").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{selectedDay=Number(b.dataset.day);render()}));
 $("selectedDayLabel").textContent="ROTINA DE "+DAYS[selectedDay].toUpperCase();$("dayHeading").textContent=DAYS[selectedDay];
 const dayTasks=tasks.filter(t=>t.day===selectedDay).sort((a,b)=>(a.start||"").localeCompare(b.start||""));
 const done=dayTasks.filter(t=>t.done).length,pct=dayTasks.length?Math.round(done/dayTasks.length*100):0;
 $("progressText").textContent=pct+"%";$("progressBar").style.width=pct+"%";$("taskCount").textContent=dayTasks.length+" "+(dayTasks.length===1?"atividade":"atividades");$("emptyState").hidden=dayTasks.length>0;
 $("activityList").innerHTML=dayTasks.map(t=>'<article class="activity '+(t.done?"done":"")+'"><div class="time">'+escapeHtml(t.start||"")+'<br>↓ '+escapeHtml(t.end||"")+'</div><div><h3>'+escapeHtml(t.title)+'</h3><div class="meta">'+escapeHtml(t.category||"Outro")+(t.reminder?" · lembrete":"")+'</div></div><div class="actions"><button class="icon-btn complete" title="'+(t.done?"Desmarcar":"Concluir")+'" data-action="toggle" data-id="'+t.id+'">'+(t.done?"✓":"○")+'</button><button class="icon-btn" title="Excluir" data-action="delete" data-id="'+t.id+'">×</button></div></article>').join("");
 $("activityList").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>act(b.dataset.action,b.dataset.id)));
 scheduleReminders(dayTasks);
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function act(action,id){const t=tasks.find(x=>x.id===id);if(!t)return;try{if(action==="toggle")await updateDoc(doc(db,"shared_planners",plannerId,"tasks",id),{done:!t.done,updatedAt:serverTimestamp()});else if(confirm("Excluir esta atividade para as duas contas?"))await deleteDoc(doc(db,"shared_planners",plannerId,"tasks",id))}catch(e){console.error(e);toast("Não foi possível salvar a alteração.")}}
$("activityForm").addEventListener("submit",async e=>{
 e.preventDefault();const title=$("title").value.trim(),start=$("start").value,end=$("end").value;if(!title)return;
 if(minutes(end)<=minutes(start)){toast("O horário final precisa ser depois do inicial.");return}
 try{await addDoc(collection(db,"shared_planners",plannerId,"tasks"),{day:selectedDay,title,start,end,category:$("category").value,reminder:$("reminder").checked,done:false,createdBy:currentUser.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});$("activityForm").reset();$("start").value="08:30";$("end").value="09:00";toast("Atividade compartilhada salva! 🩵")}catch(err){console.error(err);toast("Não foi possível salvar. Confira as regras do Firestore.")}
});
$("copyDayBtn").addEventListener("click",async()=>{
 const prev=(selectedDay+6)%7,previous=tasks.filter(t=>t.day===prev);if(!previous.length){toast("O dia anterior está vazio.");return}
 if(tasks.some(t=>t.day===selectedDay)&&!confirm("Este dia já tem atividades. Deseja substituir tudo pelo dia anterior?"))return;
 try{const batch=writeBatch(db);tasks.filter(t=>t.day===selectedDay).forEach(t=>batch.delete(doc(db,"shared_planners",plannerId,"tasks",t.id)));previous.forEach(t=>{const ref=doc(collection(db,"shared_planners",plannerId,"tasks"));batch.set(ref,{day:selectedDay,title:t.title,start:t.start,end:t.end,category:t.category,reminder:!!t.reminder,done:false,createdBy:currentUser.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()})});await batch.commit();toast("Rotina copiada! 🩵")}catch(e){console.error(e);toast("Não foi possível copiar a rotina.")}
});
function scheduleReminders(dayTasks){reminders.forEach(clearTimeout);reminders=[];if(!("Notification"in window)||Notification.permission!=="granted")return;const now=new Date();dayTasks.filter(t=>t.reminder&&!t.done).forEach(t=>{const when=new Date();const [h,m]=t.start.split(":").map(Number);when.setHours(h,m,0,0);const delay=when-now;if(delay>0&&delay<86400000)reminders.push(setTimeout(()=>new Notification("Minha Rotina",{body:"Está na hora: "+t.title}),delay))})}
async function updatePushButton(){const btn=$("notifyBtn");if(!btn)return;if(!isOwner){btn.textContent="Notificações: ativação pela proprietária";btn.disabled=true;return}if(!("Notification" in window)){btn.textContent="Notificações não suportadas";btn.disabled=true;return}btn.disabled=false;btn.textContent=Notification.permission==="granted"?"Atualizar notificações deste aparelho":"Ativar notificações"}
$("notifyBtn").addEventListener("click",async()=>{
 const btn=$("notifyBtn");if(!currentUser||!isOwner){toast("A proprietária deve ativar no próprio celular.");return}
 try{if(!(await isSupported()))throw Error("unsupported");const permission=await Notification.requestPermission();if(permission!=="granted")throw Error("permission");
 const reg=await navigator.serviceWorker.ready;messaging=getMessaging(app);const token=await getToken(messaging,{vapidKey:VAPID_PUBLIC_KEY,serviceWorkerRegistration:reg});if(!token)throw Error("token");
 let id=localStorage.getItem("minha-rotina-device-id");if(!id){id=crypto.randomUUID();localStorage.setItem("minha-rotina-device-id",id)}
 await (await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js")).setDoc(doc(db,"shared_planners",plannerId,"devices",id),{uid:currentUser.uid,token,updatedAt:serverTimestamp(),userAgent:navigator.userAgent});
 onMessage(messaging,p=>toast((p.notification?.title||"Minha Rotina")+": "+(p.notification?.body||"Novo lembrete")));btn.textContent="Notificações ativadas";toast("Este aparelho foi cadastrado para receber notificações! 🩵")
 }catch(e){console.error(e);toast(e.message==="permission"?"Permissão não concedida.":e.message==="unsupported"?"Navegador sem suporte ao push.":"Não foi possível ativar. Verifique HTTPS e as regras do Firestore.")}
});
if("serviceWorker"in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(console.error);
