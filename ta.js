(()=>{'use strict';
const d=document,rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
/* ---- HAPTIQUE : vibrate() si dispo (Android/Chrome) ; sinon astuce <input switch> (Safari iOS 17.4+, non vérifiée sur appareil) ---- */
const can=typeof navigator.vibrate=='function';
const P={tap:[8],ok:[18],rest:[30,70,30],pr:[20,50,20,50,90],meal:[16,40,16],step:[10],end:[40,70,40,70,140]};
let lb;const tick=()=>{try{if(!lb){lb=d.createElement('label');lb.setAttribute('aria-hidden','true');lb.style.cssText='position:fixed;left:-99px;top:0;opacity:0;pointer-events:none';const i=d.createElement('input');i.type='checkbox';i.setAttribute('switch','');lb.append(i);d.body.append(lb)}lb.click()}catch(e){}};
const hz=k=>{const p=P[k]||P.tap;if(can){navigator.vibrate(p);return}let t=0;p.forEach((v,i)=>{if(i%2==0)setTimeout(tick,t);t+=v})};
window.hz=hz;
let ac;addEventListener('pointerdown',()=>{try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();ac.state=='suspended'&&ac.resume()}catch(e){}});
window.beep=()=>beep();const beep=()=>{try{const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=880;g.gain.value=.07;o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.16)}catch(e){}};
/* ---- bulles ---- */
const bub=(x,y,n,s)=>{if(rm)return;for(let i=0;i<n;i++){const b=d.createElement('i');b.className='bb2';const a=Math.random()*6.28,r=s*(.5+Math.random());b.style.cssText=`left:${x}px;top:${y}px;width:${6+Math.random()*8}px;height:${6+Math.random()*8}px`;d.body.append(b);b.animate([{transform:'translate(-50%,-50%) scale(.4)',opacity:.9},{transform:`translate(calc(-50% + ${Math.cos(a)*r}px),calc(-50% + ${Math.sin(a)*r-20}px)) scale(1)`,opacity:0}],{duration:650+Math.random()*300,easing:'cubic-bezier(.2,.8,.2,1)'}).onfinish=()=>b.remove()}};
window.bub=bub;d.addEventListener('pointerdown',e=>{const t=e.target.closest&&e.target.closest('button,.it,.c,label.g');if(t){bub(e.clientX,e.clientY,4,34);if(t.matches('nav button,.seg button'))hz('tap')}},{passive:true});
/* ---- branchement sur les fonctions existantes de app.js ---- */
const wrap=(n,f)=>{const o=window[n];if(typeof o=='function')window[n]=function(...a){const pre=f.pre&&f.pre(a);const r=o.apply(this,a);try{(f.post||f)(a,r,pre)}catch(e){}return r}};
wrap('ok',(a)=>{const s=S.cur&&S.cur.ex[a[0]]&&S.cur.ex[a[0]][a[1]];if(s&&s.ok&&s.r){hz('ok');const b=a[3].getBoundingClientRect();bub(b.left+b.width/2,b.top+b.height/2,9,60)}});
wrap('skip',{pre:()=>{const t=d.querySelector('#tm');return t&&!t.hidden&&t.querySelector('span').textContent=='0:00'},post:(a,r,end)=>{if(end){hz('rest');beep();d.querySelector('#tm').animate([{boxShadow:'0 0 0 0 #e8cf94'},{boxShadow:'0 0 0 22px #e8cf9400'}],700)}}});
wrap('mpOk',()=>hz('meal'));
wrap('shAdd',()=>hz('meal'));
wrap('tab',()=>hz('step'));
wrap('fin',{pre:()=>{try{return JSON.stringify(prs())}catch(e){}},post:(a,r,b)=>{if(S.cur)return;let pr=0;try{pr=b!==JSON.stringify(prs())}catch(e){}hz(pr?'pr':'end');if(pr)setTimeout(()=>hz('end'),600)}});
/* ---- générique d'entrée ---- */
if(!sessionStorage.getItem('ti')){try{sessionStorage.setItem('ti',1)}catch(e){}
const el=d.createElement('div');el.id='ti';el.setAttribute('role','img');el.setAttribute('aria-label','TRY AGAIN');
el.innerHTML=`<svg viewBox="0 0 300 260" width="230"><defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8ecc8"/><stop offset="1" stop-color="#b8903f"/></linearGradient></defs>
<circle class="r" cx="150" cy="120" r="78" pathLength="100"/>
<g class="bl"><rect x="92" y="117" width="116" height="6" rx="3"/><rect x="98" y="92" width="11" height="56" rx="4"/><rect x="112" y="102" width="9" height="36" rx="3"/><rect x="191" y="92" width="11" height="56" rx="4"/><rect x="179" y="102" width="9" height="36" rx="3"/></g>
<circle class="m" style="--d:1.5s" cx="228" cy="66" r="6" fill="#f8ecc8"/><circle class="m" style="--d:1.65s" cx="150" cy="198" r="6" fill="#7fb7ff"/><circle class="m" style="--d:1.8s" cx="72" cy="66" r="6" fill="#ff9e6b"/></svg>
<div class="w">TRY AGAIN</div><svg class="sg" viewBox="0 0 220 24" width="170"><path d="M6 16C40 6 70 22 110 13S180 6 214 12"/></svg>`;
d.body.append(el);
const end=()=>{if(!el.isConnected)return;el.classList.add('out');setTimeout(()=>el.remove(),650)};
el.onclick=end;setTimeout(end,rm?1200:5000)}
})();
