importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");
firebase.initializeApp({
 apiKey:"AIzaSyBnQIuZ_ifTHDbGoqm_QyZ6gVaUEex4W_s",
 authDomain:"minha-rotina-355cc.firebaseapp.com",
 projectId:"minha-rotina-355cc",
 storageBucket:"minha-rotina-355cc.firebasestorage.app",
 messagingSenderId:"166306568283",
 appId:"1:166306568283:web:3f226c855be35dd75d877e",
 measurementId:"G-CWRLFCLVP7"
});
const messaging=firebase.messaging();
messaging.onBackgroundMessage(payload=>{
 const title=payload.notification?.title||"Minha Rotina";
 const options={body:payload.notification?.body||"Você tem um lembrete da sua rotina.",icon:"./icon-192.png",badge:"./icon-192.png",data:payload.data||{}};
 self.registration.showNotification(title,options);
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
  for(const client of list){if("focus" in client)return client.focus()}
  if(clients.openWindow)return clients.openWindow("./");
 }));
});
const CACHE="minha-rotina-firebase-v2";
const ASSETS=["./","./index.html","./style.css","./manifest.webmanifest"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",e=>{if(e.request.method==="GET"&&new URL(e.request.url).origin===location.origin)e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(()=>caches.match("./index.html"))))});
