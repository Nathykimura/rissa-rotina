import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, getDoc, addDoc, doc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBnQIuZ_ifTHDbGoqm_QyZ6gVaUEex4W_s",
  authDomain: "minha-rotina-355cc.firebaseapp.com",
  projectId: "minha-rotina-355cc",
  storageBucket: "minha-rotina-355cc.firebasestorage.app",
  messagingSenderId: "166306568283",
  appId: "1:166306568283:web:3f226c855be35dd75d877e",
  measurementId: "G-CWRLFCLVP7"
};
const firebaseApp=initializeApp(firebaseConfig), auth=getAuth(firebaseApp), db=getFirestore(firebaseApp);
const $=id=>document.getElementById(id);
let plannerId=null, tasks=[], stopTasks=null, currentUser=null;
const localDate=d=>{const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)};
const today=localDate(new Date()); $("dayPicker").value=today; $("taskDate").value=today;
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600)}
function authMessage(s){$("authMessage").textContent=s}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();authMessage("Entrando...");try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value)}catch(err){authMessage("Não foi possível entrar. Confira e-mail e senha. ("+err.code+")")}});
$("logoutBtn").addEventListener("click",()=>signOut(auth));
onAuthStateChanged(auth,async user=>{
 currentUser=user;
 if(stopTasks){stopTasks();stopTasks=null}
 if(!user){$("authPanel").classList.remove("hidden");$("appPanel").classList.add("hidden");$("logoutBtn").classList.add("hidden");return}
 $("authPanel").classList.add("hidden");$("appPanel").classList.remove("hidden");$("logoutBtn").classList.remove("hidden");
 $("greeting").textContent="Olá! ✨";$("syncState").textContent="...";
 try{await loadPlanner(user.uid)}catch(err){console.error(err);$("roleLabel").textContent="Não foi possível abrir a rotina. Verifique as regras e os dados do Firestore.";$("syncState").textContent="Erro";toast("Erro ao carregar o espaço compartilhado.")}
});
async function loadPlanner(uid){
 const plannerRef=doc(db,"shared_planners","rotina-da-amiga");
 const p=await getDoc(plannerRef);
 if(!p.exists()){ $("roleLabel").textContent="O espaço compartilhado ainda não foi encontrado."; throw new Error("planner-not-found") }
 const data=p.data();
 const isOwner=data.ownerUid===uid;
 const isEditor=Array.isArray(data.editorUids)&&data.editorUids.includes(uid);
 if(!isOwner&&!isEditor){$("roleLabel").textContent="Esta conta não tem acesso a este espaço.";throw new Error("not-a-member")}
 plannerId=p.id;
 $("roleLabel").textContent=(isOwner?"Você é a proprietária":"Você é administradora")+" · "+(data.name||"Rotina compartilhada");
 $("syncState").textContent="Online";
 stopTasks=onSnapshot(collection(db,"shared_planners",plannerId,"tasks"),snap=>{tasks=snap.docs.map(d=>({id:d.id,...d.data()}));$("syncState").textContent="Online";render()},err=>{$("syncState").textContent="Erro";console.error(err);toast("Falha na sincronização.")});
}
function render(){
 const day=$("dayPicker").value, list=tasks.filter(t=>t.date===day).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
 const root=$("taskList");root.replaceChildren();
 if(!list.length){const p=document.createElement("p");p.className="empty";p.textContent="Nenhuma tarefa por aqui. Adicione a primeira! 🌱";root.append(p)}
 for(const t of list){const el=document.createElement("div");el.className="task"+(t.done?" done":"");
 const check=document.createElement("input");check.type="checkbox";check.checked=!!t.done;check.setAttribute("aria-label","Concluir "+t.title);check.addEventListener("change",()=>updateDoc(doc(db,"shared_planners",plannerId,"tasks",t.id),{done:check.checked,updatedAt:serverTimestamp()}));
 const main=document.createElement("div");main.className="task-main";const title=document.createElement("div");title.className="task-title";title.textContent=t.title;
 const meta=document.createElement("div");meta.className="meta";meta.textContent=(t.time||"")+(t.endTime?"–"+t.endTime:"")+" · "+(t.category||"Outro");main.append(title,meta);
 const del=document.createElement("button");del.className="delete";del.textContent="Excluir";del.addEventListener("click",async()=>{if(confirm("Excluir esta tarefa para as duas contas?")){await deleteDoc(doc(db,"shared_planners",plannerId,"tasks",t.id));toast("Tarefa excluída.")}});
 el.append(check,main,del);root.append(el)}
 const done=list.filter(t=>t.done).length;$("totalCount").textContent=list.length;$("doneCount").textContent=done;$("progressPct").textContent=(list.length?Math.round(done/list.length*100):0)+"%";
}
$("dayPicker").addEventListener("change",render);
$("taskForm").addEventListener("submit",async e=>{e.preventDefault();if(!plannerId)return;const task={title:$("taskTitle").value.trim(),date:$("taskDate").value,time:$("taskTime").value,endTime:$("taskEnd").value||"",category:$("taskCategory").value,done:false,createdBy:currentUser.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
 if(!task.title||!task.date||!task.time)return;try{await addDoc(collection(db,"shared_planners",plannerId,"tasks"),task);$("dayPicker").value=task.date;$("taskTitle").value="";$("taskEnd").value="";toast("Tarefa compartilhada salva! 🩵")}catch(err){console.error(err);toast("Não foi possível salvar. Confira as regras do Firestore.")}});
if("serviceWorker" in navigator && location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(console.error);
