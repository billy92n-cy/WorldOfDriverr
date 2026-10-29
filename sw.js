const C='try-again-v2',A=['./','index.html','style.css','ta.css','app.js','ta.js','ws.js','ws.css','manifest.json','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!='GET'||u.origin!=location.origin)return;
e.respondWith(caches.match(r).then(m=>{const n=fetch(r).then(x=>{if(x.ok)caches.open(C).then(c=>c.put(r,x.clone()));return x}).catch(()=>m);return m||n}))});
