(()=>{'use strict';
const d=document,B='https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/',nrm=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
const Q={bench:['barbellbenchpressmediumgrip','barbellbenchpress','benchpress'],ohp:['standingmilitarypress','barbellshoulderpress','militarypress'],ext:['tricepsextension','overheadtricepsextension'],pull:['pullups','pullup','chinup'],row:['bentoverbarbellrow','barbellrow'],curl:['barbellcurl'],sq:['barbellfullsquat','barbellsquat','squat'],rdl:['romaniandeadlift'],lunge:['bulgariansplitsquat','splitsquat','lunge'],pu:['declinepushup','pushups','pushup'],pike:['pikepushup','pushups','pushup'],dip:['benchdips','dips'],hpu:['invertedrow','inverted'],hrow:['onearmdumbbellrow','dumbbellrow'],hcurl:['dumbbellbicepscurl','bicepscurl','curl'],hsq:['gobletsquat'],hlu:['bodyweightwalkinglunge','walkinglunge','lunge'],hrd:['singlelegdeadlift','romaniandeadlift']};
window.WQ=Q;const has=x=>x.images&&x.images.length;
function pick(db,id){const qs=Q[id]||[];for(const q of qs){const n=db.find(x=>nrm(x.name)==q&&has(x));if(n)return n}for(const q of qs){const m=db.filter(x=>has(x)&&nrm(x.name).includes(q)).sort((a,b)=>a.name.length-b.name.length);if(m.length)return m[0]}return null}
window.__wsPick=pick;
let dbP;const DBU=B+'dist/exercises.json';
const loadDB=()=>dbP||(dbP=(async()=>{try{const c=await caches.open('ta-media');let r=await c.match(DBU);if(!r){r=await fetch(DBU);if(!r.ok)throw 0;await c.put(DBU,r.clone())}return await r.json()}catch(e){dbP=null;return[]}})());
const W={e:0,sel:null,rt:0,tm:null,mv:{},info:{}};
const $q=s=>d.querySelector(s),el=()=>$q('#ws')||d.body.appendChild(Object.assign(d.createElement('div'),{id:'ws'}));
const P=()=>S.cur.cx||prog()[S.cur.i],rsOf=e=>e.s==4?120:90,lo=e=>+e.r.split('-')[0],hi=e=>+e.r.split('-')[1];
const ens=()=>P().ex.forEach(e=>{if(!S.cur.ex[e.id])S.cur.ex[e.id]=Array.from({length:e.s},()=>({kg:sug(e.id,hi(e)),r:'',ok:0}))});
const cnt=()=>{let t=0,n=0;P().ex.forEach(e=>S.cur.ex[e.id].forEach(s=>{t++;if(s.ok)n++}));return[n,t]};
const mm=t=>Math.floor(t/60)+':'+String(t%60).padStart(2,'0');
/* lecteur : 2 images (départ/arrivée) en fondu ; secours vectoriel */
async function media(id,box){const x=EX[id];box.className='mv ld';if(W.mv[id]){box.innerHTML=W.mv[id];box.className='mv'+(W.ps?' ps':'');return}
 const fb=cap=>{box.className='mv';box.innerHTML=`<div class=fbk>${mus(id)}<span>Démonstration indisponible</span></div>`;W.mv[id]=box.innerHTML};
 try{const db=await loadDB(),m=pick(db,id);if(!m)return fb('Animation de secours');
  const u=m.images.slice(0,2).map(p=>B+'exercises/'+p);
  await Promise.all(u.map(s=>new Promise((ok,ko)=>{const i=new Image();i.onload=ok;i.onerror=ko;i.src=s})));
  W.info[id]=m;const h=`<div class=mf>${u.map(s=>`<img src="${s}" alt="${esc(x[0])}" loading=eager>`).join('')}</div><span class=cp>${esc(m.name)}</span><button class=pp onclick="wsPause()" aria-label="Pause ou lecture">${W.ps?'▶':'❚❚'}</button>`;
  if($q('#mv')&&box.isConnected){box.innerHTML=h;box.className='mv'+(W.ps?' ps':'')}W.mv[id]=h}catch(e){fb('Animation de secours')}}
window.wsPause=()=>{W.ps=!W.ps;const b=$q('#mv');b.classList.toggle('ps',W.ps);const p=b.querySelector('.pp');if(p)p.textContent=W.ps?'▶':'❚❚';for(const k in W.mv)W.mv[k]=W.mv[k].replace(/>(▶|❚❚)</,'>'+(W.ps?'▶':'❚❚')+'<')};
function view(){const w=el();w.hidden=false;ens();const e=P().ex[W.e],x=EX[e.id],ss=S.cur.ex[e.id],jn=ss.findIndex(s=>!s.ok),j=W.sel!=null?W.sel:(jn<0?ss.length-1:jn),s=ss[j],L=last(e.id),[n,t]=cnt();
 if(!s.r)s.r=(L&&L[j]?L[j].r:lo(e));save();
 w.innerHTML=`<div class=wh><button onclick=wsClose() aria-label="Réduire">✕</button><div><b>${esc(P().n)}</b><small>${n}/${t} séries · <span id=wt></span></small></div><button onclick=wsEnd()>Fin</button></div>
<div class=wp>${P().ex.map((v,i)=>`<i class="${i==W.e?'on':''}" onclick=wsGo(${i}) style="--p:${S.cur.ex[v.id].filter(q=>q.ok).length/S.cur.ex[v.id].length}"></i>`).join('')}</div><div class=mv id=mv></div>
<div class=wb><div style="display:flex;gap:10px;align-items:center"><div style="flex:1"><h2>${x[0]}</h2><small>Série ${j+1}/${ss.length} · objectif ${e.r} rép.</small></div><button class=wi onclick=wsInfo()>Fiche</button><button class=wi onclick="cpOpen('swap')">Changer</button></div>
${L?`<small>Dernière fois : ${L.map(q=>q.kg+'×'+q.r).join(' · ')}</small>`:'<small>Première fois sur cet exercice : aucune référence.</small>'}
<div class=dots>${ss.map((q,i)=>`<button class="${q.ok?'ok':''} ${i==j?'cu':''}" onclick=wsSel(${i})>${i+1}</button>`).join('')}</div>
<div class=st><div><small>Charge (kg)</small><b id=vk>${s.kg||0}</b><div class=r><button onclick="wsA('kg',-2.5)">−</button><button onclick="wsA('kg',2.5)">+</button></div></div><div><small>Répétitions</small><b id=vr>${s.r}</b><div class=r><button onclick="wsA('r',-1)">−</button><button onclick="wsA('r',1)">+</button></div></div></div></div>
<div class=wf id=wf></div>`;w.querySelector('.wb').insertAdjacentHTML('beforeend','<button class=g onclick="cpOpen(\'add\')">+ Ajouter un exercice</button>');foot(j,s);media(e.id,$q('#mv'));tickT()}
function foot(j,s){const f=$q('#wf');if(!f)return;if(W.rt>Date.now()){f.innerHTML=`<div class=rp id=rp><small>Récupération</small><div class=rc id=rc></div><div class=bar><i id=rb></i></div><div class=rr><button onclick="wsR(-15)">−15 s</button><button onclick="wsR(15)">+15 s</button><button onclick=wsSkip()>Passer</button></div></div>`;tickR()}else f.innerHTML=`<button class=v onclick=wsOk(this)>${s.ok?'Mettre à jour la série':'Valider la série'}</button>`}
function tickT(){const t=$q('#wt');if(t&&S.cur)t.textContent=mm(Math.round((Date.now()-(S.cur.t0||Date.now()))/1e3))}
function tickR(){const l=Math.max(0,Math.ceil((W.rt-Date.now())/1e3)),c=$q('#rc');tickT();if(c){c.textContent=mm(l);$q('#rb').style.width=(100*l/W.rd)+'%'}if(l<=0&&W.rt){W.rt=0;S.cur&&(S.cur.rt=0);save();hz('rest');window.beep&&beep();const r=$q('#rp');r&&r.classList.add('fl');setTimeout(()=>{const e=P().ex[W.e],ss=S.cur.ex[e.id];foot(0,ss[ss.findIndex(q=>!q.ok)<0?0:ss.findIndex(q=>!q.ok)])},700)}}
const loop=()=>{clearInterval(W.tm);W.tm=setInterval(()=>{if(!S.cur||$q('#ws').hidden)return;W.rt?tickR():tickT()},250)};
d.addEventListener('visibilitychange',()=>{if(!d.hidden&&S.cur&&W.rt)tickR()});
const cur=()=>{const e=P().ex[W.e],ss=S.cur.ex[e.id],jn=ss.findIndex(s=>!s.ok);return{e,ss,j:W.sel!=null?W.sel:(jn<0?ss.length-1:jn)}};
window.wsA=(k,v)=>{const{ss,j}=cur(),s=ss[j];s[k]=Math.max(0,+((+s[k]||0)+v).toFixed(1));save();$q(k=='kg'?'#vk':'#vr').textContent=s[k];hz('tap')};
window.wsSel=i=>{W.sel=i;W.rt=0;view()};window.wsGo=i=>{W.e=i;W.sel=null;view()};
window.wsSkip=()=>{W.rt=0;S.cur.rt=0;save();view()};window.wsR=v=>{W.rt=Math.max(Date.now()+1e3,W.rt+v*1e3);W.rd=Math.max(W.rd,Math.ceil((W.rt-Date.now())/1e3));S.cur.rt=W.rt;save();tickR()};
window.wsOk=b=>{const{e,ss,j}=cur(),s=ss[j];if(!(s.r>0)){b.animate([{transform:'translateX(-5px)'},{transform:'translateX(5px)'},{transform:'none'}],200);return}
 const was=s.ok;s.ok=1;save();hz('ok');if(window.bub){const q=b.getBoundingClientRect();bub(q.left+q.width/2,q.top+q.height/2,10,70)}
 const[n,t]=cnt();if(n==t){wsEnd(1);return}W.sel=null;
 if(!was){if(ss.every(q=>q.ok)){const nx=P().ex.findIndex((v,i)=>i>W.e&&S.cur.ex[v.id].some(q=>!q.ok));W.e=nx>=0?nx:P().ex.findIndex(v=>S.cur.ex[v.id].some(q=>!q.ok));hz('step')}
  W.rd=rsOf(e);W.rt=Date.now()+W.rd*1e3;S.cur.rt=W.rt;save()}view()};
window.wsInfo=()=>{const e=P().ex[W.e],x=EX[e.id],m=W.info[e.id],o=d.createElement('div');o.className='wr';
 o.innerHTML=`<button class=wi onclick="this.parentNode.remove()" style="float:right">Fermer</button><h1>${x[0]}</h1>${mus(e.id)}<p class=cue>${x[2]}</p><h2>Erreurs fréquentes</h2><ul>${(ER[e.id]||'').split(';').filter(Boolean).map(a=>`<li>${a}</li>`).join('')}</ul>${m&&m.instructions?`<h2>Exécution détaillée (source en anglais)</h2><ol>${m.instructions.slice(0,6).map(a=>`<li>${esc(a)}</li>`).join('')}</ol><small>Images : Free Exercise DB (domaine public).</small>`:'<small>Démonstration indisponible : animation de secours affichée.</small>'}`;el().append(o)};
window.wsClose=()=>{el().hidden=true;R()};
window.wsEnd=auto=>{if(!S.cur)return;const[n,t]=cnt();if(!n){alert('Valide au moins une série.');return}if(!auto&&n<t&&!confirm(`Terminer maintenant ? ${t-n} série(s) non faites seront ignorées.`))return;
 let vol=0,sets=0;const best=[];P().ex.forEach(e=>{const a=S.cur.ex[e.id].filter(q=>q.ok&&q.r);sets+=a.length;a.forEach(q=>vol+=(q.kg||0)*q.r);if(a.length){const b=a.reduce((m,q)=>q.kg*(1+q.r/30)>m.kg*(1+m.r/30)?q:m);best.push(`${EX[e.id][0]} : ${b.kg}×${b.r}`)}});
 const dur=Math.round((Date.now()-(S.cur.t0||Date.now()))/6e4),nm=P().n;let b0;try{b0=JSON.stringify(prs())}catch(x){}
 clearInterval(W.tm);W.rt=0;fin();S.wk.length&&(S.wk[S.wk.length-1].day=nm,save());let pr=0;try{pr=b0!==JSON.stringify(prs())}catch(x){}
 const w=el();w.hidden=false;w.innerHTML=`<div class=wr style="position:static;background:none"><h1>${pr?'Nouveau record 🏆':'Séance terminée'}</h1><small>${esc(nm)} · ${dur} min</small><div class=g2><div class=c><small>Volume</small><b class=big>${nf(vol)} kg</b></div><div class=c><small>Séries validées</small><b class=big>${sets}</b></div></div><h2>Meilleures séries</h2><ul>${best.map(a=>`<li>${esc(a)}</li>`).join('')}</ul><button class=b onclick="wsClose()">Terminer</button></div>`;W.e=0;W.sel=null;W.mv={}};
window.openWS=()=>{if(!S.cur)return;if(!S.cur.t0)S.cur.t0=Date.now();W.rt=S.cur.rt>Date.now()?S.cur.rt:0;W.rd=W.rt?Math.max(1,Math.ceil((W.rt-Date.now())/1e3)):90;W.e=Math.max(0,P().ex.findIndex(v=>S.cur.ex[v.id]&&S.cur.ex[v.id].some(q=>!q.ok)));W.sel=null;view();loop()};
window.wsStart=i=>{go(i);S.cur.t0=Date.now();save();openWS()};
window.wsCancel=()=>{if(confirm('Abandonner la séance en cours ?')){S.cur=null;save();clearInterval(W.tm);R()}};
const t0=window.train;window.train=function(){if(S.cur){const[n,t]=cnt();return `<h1>Séance</h1><div class="c on"><small>En cours</small><b class=big>${esc(P().n)}</b><div class=bar><i style="width:${100*n/t}%"></i></div><small>${n}/${t} séries validées · sauvegarde automatique</small><button class=b onclick=openWS()>Reprendre la séance</button><button class=g onclick=wsCancel()>Abandonner</button></div>`}return seanceUI()};V.train=window.train;
const cxe=()=>{if(!S.cur.cx)S.cur.cx=JSON.parse(JSON.stringify(prog()[S.cur.i]))};window.wsCur=()=>P().ex[W.e].id;
window.wsRep=id=>{cxe();const o=S.cur.cx.ex[W.e];if(S.cur.cx.ex.some(v=>v.id==id))return;delete S.cur.ex[o.id];o.id=id;W.sel=null;W.rt=0;save();view()};
window.wsApp=id=>{cxe();if(S.cur.cx.ex.some(v=>v.id==id))return;S.cur.cx.ex.push(dflt(id,S.cur.cx.ex.length));W.e=S.cur.cx.ex.length-1;W.sel=null;save();view()};
if(S.p&&S.cur){S.tab='train';R();openWS()}else R();
})();
