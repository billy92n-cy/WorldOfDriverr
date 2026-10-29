const XF=`Farine de blé|364|10|76|1|3
Sucre|400|0|100|0|0
Cacao en poudre|228|20|58|14|33
Myrtilles|57|0.7|14|0.3|2.4
Fraises|32|0.7|7.7|0.3|2
Mangue|60|0.8|15|0.4|1.6
Ananas|50|0.5|13|0.1|1.4
Lait d’avoine|46|1|6.7|1.5|0.8
Crème fraîche|292|2.4|2.8|30|0
Mozzarella|254|18|2.2|19|0
Parmesan|392|36|0|28|0
Crevettes cuites|99|24|0|0.3|0
Poivron|26|1|6|0.2|2
Courgette|17|1.2|3.1|0.3|1
Champignons|22|3|3.3|0.3|1
Oignon|40|1.1|9.3|0.1|1.7
Maïs|86|3.2|19|1.2|2.7
Tortilla de blé|310|8|52|7|3
Pain burger|270|9|49|4|2.5
Dattes|282|2.5|75|0.4|8
Graines de chia|486|17|42|31|34
Beurre d’amande|614|21|19|56|10
Cottage cheese|98|11|3.4|4.3|0
Lait de coco|197|2|3|21|0
Sirop d’érable|260|0|67|0|0
Houmous|177|8|14|10|6
Feta|264|14|4|21|0
Concombre|15|0.7|3.6|0.1|0.5
Semoule cuite|112|3.8|23|0.2|1.4
Boulgour cuit|83|3|19|0.2|4.5
Raisins secs|299|3|79|0.5|3.7
Noix de cajou|553|18|30|44|3.3
Compote sans sucre|42|0.3|10|0.1|1.2`,RC=`Petit-déj|Porridge protéiné banane|Flocons d’avoine 80,Lait demi-écrémé 300,Whey 30,Banane 120
Petit-déj|Pancakes protéinés|Flocons d’avoine 70,Œuf entier 120,Banane 120,Whey 30,Beurre 10
Petit-déj|Omelette jambon fromage|Œuf entier 180,Emmental 30,Jambon blanc 60,Beurre 8
Petit-déj|Tartines avocat œuf|Pain complet 100,Avocat 80,Œuf entier 110,Huile d’olive 5
Petit-déj|Bowl skyr myrtilles|Skyr 250,Flocons d’avoine 50,Miel 15,Myrtilles 80,Amandes 20
Petit-déj|Overnight oats chia|Flocons d’avoine 70,Lait demi-écrémé 200,Yaourt grec 100,Graines de chia 15,Fraises 100
Petit-déj|Œufs brouillés et toast|Œuf entier 180,Pain complet 80,Beurre 10,Tomate 80
Petit-déj|Crêpes banane avoine|Flocons d’avoine 60,Banane 120,Œuf entier 60,Lait entier 100
Petit-déj|Fromage blanc aux noix|Fromage blanc 0 % 250,Noix 25,Miel 15,Pomme 120
Shakers|Shaker prise de masse classique|Lait entier 400,Whey 30,Banane 120,Flocons d’avoine 60,Beurre de cacahuète 25
Shakers|Shaker chocolat cacahuète|Lait entier 350,Whey 30,Cacao en poudre 10,Beurre de cacahuète 30,Banane 100
Shakers|Shaker fraise banane|Lait demi-écrémé 350,Whey 30,Fraises 150,Banane 100,Flocons d’avoine 40
Shakers|Shaker mangue ananas|Lait demi-écrémé 300,Whey 30,Mangue 120,Ananas 100,Yaourt grec 100
Shakers|Shaker dattes avoine|Lait entier 350,Whey 30,Dattes 40,Banane 100,Flocons d’avoine 40
Shakers|Shaker avoine myrtille|Lait d’avoine 350,Whey 30,Myrtilles 100,Flocons d’avoine 50,Miel 10
Shakers|Shaker amande chocolat|Lait demi-écrémé 350,Whey 30,Beurre d’amande 25,Chocolat noir 70 % 15,Banane 100
Shakers|Shaker vanille chia|Lait entier 350,Whey 30,Graines de chia 15,Banane 100,Miel 10
Shakers|Shaker skyr fruits rouges|Lait demi-écrémé 250,Skyr 150,Fraises 100,Myrtilles 60,Miel 10
Shakers|Shaker tropical coco|Lait de coco 100,Lait demi-écrémé 250,Whey 30,Mangue 100,Banane 80
Plats|Bowl poulet riz avocat|Poulet cuit 180,Riz cuit 250,Avocat 70,Maïs 60,Huile d’olive 10
Plats|Pâtes bolognaise|Pâtes cuites 300,Bœuf haché 5 % cru 150,Sauce tomate 150,Oignon 50,Parmesan 15
Plats|Saumon patate douce brocoli|Saumon cuit 150,Patate douce 250,Brocoli cuit 150,Huile d’olive 10
Plats|Wrap poulet fromage|Tortilla de blé 100,Poulet cuit 150,Emmental 30,Tomate 80,Crème fraîche 20
Plats|Chili con carne|Bœuf haché 5 % cru 150,Haricots rouges cuits 200,Sauce tomate 150,Riz cuit 200,Poivron 80
Plats|Curry de pois chiches|Pois chiches cuits 250,Lait de coco 100,Riz cuit 200,Épinards cuits 100,Oignon 50
Plats|Burger maison|Pain burger 90,Bœuf haché 5 % cru 150,Emmental 25,Tomate 60,Oignon 30
Plats|Risotto poulet champignons|Riz cuit 300,Poulet cuit 150,Champignons 120,Parmesan 20,Crème fraîche 30
Plats|Quinoa dinde légumes|Quinoa cuit 250,Dinde cuite 170,Courgette 120,Poivron 80,Huile d’olive 10
Plats|Pâtes froides au thon|Pâtes cuites 300,Thon au naturel 120,Maïs 60,Tomate 100,Huile d’olive 10
Plats|Crevettes semoule poivrons|Semoule cuite 250,Crevettes cuites 180,Poivron 100,Courgette 100,Huile d’olive 10
Plats|Gratin pommes de terre jambon|Pomme de terre cuite 350,Jambon blanc 100,Crème fraîche 50,Emmental 40
Plats|Cabillaud boulgour légumes|Cabillaud cuit 180,Boulgour cuit 250,Courgette 120,Huile d’olive 10
Plats|Tofu sauté riz brocoli|Tofu ferme 200,Riz cuit 250,Brocoli cuit 120,Carotte crue 80,Huile d’olive 10
Plats|Lasagnes express|Pâtes cuites 250,Bœuf haché 5 % cru 130,Sauce tomate 150,Mozzarella 60
Plats|Salade poulet feta quinoa|Poulet cuit 150,Feta 50,Concombre 100,Tomate 100,Quinoa cuit 150,Huile d’olive 10
Collations|Toast cacahuète banane|Pain complet 80,Beurre de cacahuète 25,Banane 100
Collations|Yaourt grec miel noix|Yaourt grec 200,Miel 15,Noix 25
Collations|Houmous et crudités|Houmous 80,Carotte crue 100,Concombre 100,Pain complet 50
Collations|Mix énergie|Amandes 30,Noix de cajou 20,Raisins secs 25,Chocolat noir 70 % 15
Collations|Cottage cheese ananas|Cottage cheese 200,Ananas 120,Graines de chia 10
Collations|Œufs durs et avocat|Œuf entier 120,Avocat 70,Pain complet 50
Collations|Wrap jambon fromage|Tortilla de blé 70,Jambon blanc 60,Emmental 25
Collations|Skyr compote amandes|Skyr 200,Compote sans sucre 100,Amandes 20
Desserts|Mug cake protéiné|Farine de blé 40,Whey 30,Œuf entier 60,Lait demi-écrémé 60,Cacao en poudre 8
Desserts|Brownie protéiné|Chocolat noir 70 % 60,Œuf entier 120,Farine de blé 40,Sucre 30,Beurre 30,Whey 30
Desserts|Cookies avoine chocolat|Flocons d’avoine 80,Banane 100,Chocolat noir 70 % 30,Beurre de cacahuète 20
Desserts|Mousse au chocolat|Chocolat noir 70 % 80,Œuf entier 120,Sucre 15
Desserts|Yaourt glacé fruits rouges|Yaourt grec 200,Fraises 100,Myrtilles 80,Miel 15
Desserts|Pudding chia chocolat|Lait entier 250,Graines de chia 35,Cacao en poudre 10,Sirop d’érable 15
Desserts|Banana bread protéiné|Banane 200,Farine de blé 80,Œuf entier 120,Whey 30,Noix 20
Desserts|Crème skyr vanille miel|Skyr 250,Miel 20,Amandes 15
Desserts|Crumble pomme avoine|Compote sans sucre 200,Flocons d’avoine 40,Beurre 15,Sucre 10
Desserts|Glace banane cacao|Banane 200,Cacao en poudre 10,Lait demi-écrémé 50,Beurre de cacahuète 20`,CAT=`xinc|Développé incliné haltères|press|Banc à 30°, haltères à hauteur de poitrine, poussée verticale.|pec,del,tri|Banc trop vertical;Coudes écartés;Rebond en bas|pec|gym|inclinedumbbellpress
xfly|Écarté haltères ou poulie|press|Coudes légèrement fléchis, ouvre en arc, serre les pectoraux.|pec,del|Coudes tendus;Charge trop lourde;Épaules qui montent|pec|gym|dumbbellflyes,cablecrossover
xdsp|Développé épaules haltères|press|Assis dos calé, pousse du niveau des oreilles vers le haut.|del,tri|Dos cambré;Amplitude réduite;Haltères trop avancés|del|gym|dumbbellshoulderpress,seateddumbbellpress
xlat|Élévations latérales|curl|Coudes fléchis, monte à l’horizontale, descente lente.|del|Élan du buste;Poignets au-dessus des coudes;Charge trop lourde|del|gym|sidelateralraise,lateralraise
xrear|Oiseau arrière d’épaule|pull|Buste penché, ouvre les bras en arc, omoplates serrées.|del,dos|Élan;Trapèzes qui haussent;Dos arrondi|del|gym|bentoverdumbbellreversefly,reversefly
xfp|Face pull|pull|Poulie haute, tire vers le front, coudes hauts, pause 1 s.|del,dos|Charge trop lourde;Coudes bas;Buste qui recule|del|gym|facepull
xpd|Tirage poitrine|pull|Poitrine sortie, tire la barre vers le haut du torse.|dos,bic|Barre derrière la nuque;Élan;Épaules hautes|dos|gym|widegriplatpulldown,latpulldown
xcr|Tirage horizontal poulie|pull|Dos droit, tire vers le ventre, serre les omoplates.|dos,bic|Dos arrondi;Balancement;Épaules en avant|dos|gym|seatedcablerows,cablerow
xdl|Soulevé de terre|squat|Barre près des tibias, dos plat, pousse le sol, verrouille les hanches.|dos,fes,isc|Dos arrondi;Barre loin du corps;Hanches qui montent trop tôt|dos|gym|barbelldeadlift
xsh|Haussements d’épaules|pull|Haltères le long du corps, monte les épaules droit, pause en haut.|dos|Rotation des épaules;Charge trop lourde;Tête en avant|dos|gym|dumbbellshrug,barbellshrug
xham|Curl marteau|curl|Prise neutre, coudes fixes, montée contrôlée.|bic|Élan;Coudes qui avancent;Poignets cassés|bic|gym|hammercurls,dumbbellalternatebicepcurl
xinclc|Curl incliné|curl|Banc incliné, bras en arrière, étirement complet en bas.|bic|Épaules qui avancent;Demi-amplitude;Élan|bic|gym|inclinedumbbellcurl,alternateinclinedumbbellcurl
xsk|Barre au front|curl|Coudes fixes vers le plafond, descends vers le front.|tri|Coudes qui s’écartent;Charge trop lourde;Dos cambré|tri|gym|lyingtricepspress,ezbarskullcrusher
xpush|Pushdown triceps poulie|curl|Coudes collés, extension complète, épaules immobiles.|tri|Épaules qui participent;Coudes écartés;Charge trop lourde|tri|gym|tricepspushdown
xlp|Presse à cuisses|squat|Pieds largeur d’épaules, descends à 90°, ne verrouille pas les genoux.|qua,fes|Bassin qui décolle;Genoux qui rentrent;Amplitude courte|jam|gym|legpress
xlc|Leg curl|squat|Hanches plaquées, plie les genoux, retour lent.|isc|Bassin qui se soulève;Élan;Amplitude réduite|jam|gym|lyinglegcurls,seatedlegcurl
xle|Leg extension|squat|Dos calé, extension complète, pause en haut.|qua|Élan;Charge trop lourde;Genoux qui bougent|jam|gym|legextensions
xht|Hip thrust|squat|Haut du dos sur le banc, pousse les hanches, serre les fessiers.|fes,isc|Dos cambré;Pieds trop loin;Menton qui monte|jam|gym|barbellhipthrust,hipthrust
xcc|Crunch à la poulie|press|Dos arrondi, enroule le buste vers le bassin, souffle en bas.|abs|Tirer avec les bras;Hanches qui bougent;Trop lourd|abs|gym|cablecrunch,crunch
xhl|Relevés de jambes suspendu|pull|Suspendu, relève les jambes en basculant le bassin.|abs|Balancement;Pas de bascule du bassin;Jambes qui retombent|abs|gym|hangingleg
xpl|Gainage planche|push|Corps aligné, abdos et fessiers contractés, respire.|abs|Bassin qui creuse;Fesses en l’air;Nuque cassée|abs|home|plank
xgl|Pont fessier|squat|Pieds près des fesses, pousse les talons, serre en haut.|fes,isc|Dos cambré;Pieds trop loin;Hanches qui basculent|jam|home|glutebridge,barbellglutebridge
xdpu|Pompes diamant|push|Mains rapprochées, coudes près du corps, descente contrôlée.|tri,pec|Coudes écartés;Bassin qui tombe;Demi-amplitude|tri|home|closetriceppushup,diamondpushup
xcru|Crunch|press|Mains aux tempes, enroule les épaules, bas du dos plaqué.|abs|Tirer sur la nuque;Élan;Menton collé|abs|home|crunches,crunch
xsup|Superman|pull|Sur le ventre, lève bras et jambes, pause 2 s.|dos,fes|Nuque en arrière;Élan;Amplitude forcée|dos|home|superman
xbs|Squat poids du corps|squat|Pieds largeur d’épaules, descends sous les genoux, talons au sol.|qua,fes|Genoux qui rentrent;Talons qui décollent;Buste penché|jam|home|bodyweightsquat,squat`;
(()=>{'use strict';
const d=document,H={pec:'Pectoraux',dos:'Dos',del:'Épaules',bic:'Biceps',tri:'Triceps',jam:'Jambes',abs:'Abdos'};
/* aliments */
XF.split('\n').forEach(l=>{const a=l.split('|');FOODS.push([a[0],+a[1],+a[2],+a[3],+a[4],+a[5]])});
/* recettes */
const CC={'Petit-déj':'#ffc857',Shakers:'#b794ff',Plats:'#ff8a5c',Collations:'#5eea9a',Desserts:'#ff7eb6'};
REC.forEach(x=>x[2]=x[2]||'Plats');
RC.split('\n').forEach(l=>{const[c,n,i]=l.split('|');REC.push([n,i.split(',').map(s=>{const m=s.trim().match(/^(.*) (\d+)$/);return[m[1],+m[2]]}),c])});
let rc='Tous';const fav=()=>S.rfav=S.rfav||[];
const item=(x,i)=>{const m=recM(x),f=fav().includes(x[0]);return `<div class=rcp style="--c:${CC[x[2]]||'#e8cf94'}"><div class=rh onclick="rcT(this)"><div><b>${esc(x[0])}</b><small>${x[2]} · ${x[1].length} ingrédients</small></div><span class=kc>${nf(m.k)}<i>kcal</i></span></div><div class=mc><em style="--m:#ff8a5c">${r(m.p)} P</em><em style="--m:#6db6ff">${r(m.c)} G</em><em style="--m:#ffc857">${r(m.f)} L</em></div><div class=rd hidden><p>${x[1].map(([n,g])=>g+' g '+n.toLowerCase()).join(' · ')}</p><div class=rb><button onclick="rcA(${i},.75)">× 0,75</button><button class=pr onclick="rcA(${i},1)">Ajouter</button><button onclick="rcA(${i},1.5)">× 1,5</button><button onclick="rcF(${i})">${f?'★':'☆'}</button></div></div></div>`};
const list=()=>{const q=nz(((d.querySelector('#rq')||{}).value||'').trim()),e=d.querySelector('#rl');if(!e)return;const l=REC.map((x,i)=>[x,i]).filter(([x])=>(rc=='Tous'||(rc=='Favoris'?fav().includes(x[0]):x[2]==rc))&&(!q||nz(x[0]).includes(q)));e.innerHTML=l.map(([x,i])=>item(x,i)).join('')||'<p>Aucune recette.</p>'};
window.rcT=e=>{const n=e.parentNode.querySelector('.rd');n.hidden=!n.hidden};window.rcL=list;
window.rcC=(c,b)=>{rc=c;d.querySelectorAll('#rcs button').forEach(x=>x.classList.toggle('on',x==b));list()};
window.rcF=i=>{const n=REC[i][0],f=fav(),k=f.indexOf(n);k<0?f.push(n):f.splice(k,1);save();hz('tap');list()};
window.rcA=(i,k)=>{REC[i][1].forEach(([n,g])=>logF(FD(n),g*k));save();hz('meal');const y=scrollY;R();scrollTo(0,y)};
const rsec=()=>`<h2>Recettes · ${REC.length}</h2><div class=chips2 id=rcs>${['Tous','Favoris',...Object.keys(CC)].map(c=>`<button class="${c==rc?'on':''}" onclick="rcC('${c}',this)">${c}</button>`).join('')}</div><input id=rq placeholder="Rechercher une recette" oninput=rcL() style="margin-bottom:18px"><div id=rl>${REC.map((x,i)=>[x,i]).filter(([x])=>rc=='Tous'||x[2]==rc).map(([x,i])=>item(x,i)).join('')}</div>`;
const n0=V.nutri;V.nutri=()=>n0().replace(/<h2>Recettes<\/h2>[\s\S]*?(?=<h2>Historique)/,rsec());
/* exercices */
const CM={},GM={bench:'pec',ohp:'del',ext:'tri',pull:'dos',row:'dos',curl:'bic',sq:'jam',rdl:'jam',lunge:'jam',pu:'pec',pike:'del',dip:'tri',hpu:'dos',hrow:'dos',hcurl:'bic',hsq:'jam',hlu:'jam',hrd:'jam'};
for(const k in GM)CM[k]={g:GM[k],eq:/^h|^(pu|pike|dip)$/.test(k)?'home':'gym'};
CAT.split('\n').forEach(l=>{const a=l.split('|');EX[a[0]]=[a[1],a[2],a[3]];MU[a[0]]=a[4];ER[a[0]]=a[5];CM[a[0]]={g:a[6],eq:a[7]};WQ[a[0]]=a[8].split(',')});
window.dflt=(id,i)=>CM[id]&&CM[id].g=='abs'?{id,s:3,r:'12-20'}:i?{id,s:3,r:'8-12'}:{id,s:4,r:'6-8'};
const TPL=[['g','Pecs & triceps','#ff8a5c','bench,xinc,xfly,xsk,xpush'],['g','Dos & biceps','#6db6ff','pull,row,xcr,xham,curl'],['g','Épaules & bras','#c3a6ff','ohp,xlat,xrear,xham,xsk'],['g','Jambes complètes','#5eea9a','sq,xlp,rdl,xlc,xle'],['g','Haut du corps','#ffc857','bench,row,ohp,xpd,curl,ext'],['g','Full body','#ff7eb6','sq,bench,row,ohp,xht'],['g','Dos & arrière','#4fd1c5','xdl,xpd,xcr,xfp,xsh'],['g','Abdos & gainage','#f6e05e','xhl,xcc,xpl,xcru'],['h','Pompes & triceps','#ff8a5c','pu,xdpu,dip,pike'],['h','Dos maison & biceps','#6db6ff','hpu,hrow,hcurl,xsup'],['h','Jambes maison','#5eea9a','hsq,hlu,hrd,xgl,xbs'],['h','Full body maison','#ff7eb6','hsq,pu,hrow,pike,xpl'],['h','Abdos & gainage','#f6e05e','xpl,xcru,xgl']].map(a=>({e:a[0],n:a[1],c:a[2],x:a[3].split(',')}));
window.TPL=TPL;window.CM=CM;window.seanceUI=()=>{const P=prog(),n=S.wk.length%P.length,d0=P[n],g=S.p.pl=='g'?'g':'h';return `<header><small>Entraînement</small><h1>Séance</h1></header><div class="c"><small>Recommandée aujourd’hui</small><b class=big>${d0.n}</b><p>${d0.ex.map(e=>EX[e.id][0]).join(' · ')}</p><button class=b onclick=wsStart(${n})>Démarrer cette séance</button><button class=g onclick="cpPre(${n})">Modifier les exercices</button></div><h2>Séances prêtes</h2><div class=tpg>${TPL.map((t,i)=>t.e==g?`<button class=tp style="--c:${t.c}" onclick="tplGo(${i})"><b>${t.n}</b><small>${t.x.length} exercices</small></button>`:'').join('')}</div><h2>Composer ma séance</h2><div class=c><p>Choisis chaque exercice toi-même, parmi ${Object.keys(CM).length} mouvements, et dans l’ordre que tu veux.</p><button class=b onclick="cpOpen('start',[])">Choisir mes exercices</button></div>`};
window.cpPre=n=>cpOpen('start',prog()[n].ex.map(e=>e.id),prog()[n].n);window.tplGo=i=>cpOpen('start',TPL[i].x,TPL[i].n);
let CP;
function cp(){let o=d.querySelector('#cp');if(!o)o=d.body.appendChild(Object.assign(d.createElement('div'),{id:'cp'}));const ids=Object.keys(CM).filter(id=>(CP.g=='all'||CM[id].g==CP.g)&&(CP.eq=='all'||CM[id].eq==CP.eq)),t={start:'Ma séance',swap:'Remplacer par…',add:'Ajouter…'}[CP.m];
o.innerHTML=`<div class=cph><button class=wi onclick=cpX()>✕</button><b>${t}</b>${CP.m=='start'?`<button class=wi style="background:var(--gold);color:#1a1405" onclick=cpGo()>Démarrer (${CP.sel.length})</button>`:'<span></span>'}</div><div class=chips2>${[['all','Tout'],...Object.entries(H)].map(([k,l])=>`<button class="${CP.g==k?'on':''}" onclick="cpS('g','${k}')">${l}</button>`).join('')}</div><div class=chips2>${[['all','Salle + maison'],['gym','Salle'],['home','Maison']].map(([k,l])=>`<button class="${CP.eq==k?'on':''}" onclick="cpS('eq','${k}')">${l}</button>`).join('')}</div>${ids.map(id=>`<button class="cpi ${CP.sel.includes(id)?'on':''}" onclick="cpT('${id}')"><span><b>${EX[id][0]}</b><small>${H[CM[id].g]} · ${CM[id].eq=='gym'?'Salle':'Maison'}</small></span><i>${CP.sel.includes(id)?CP.sel.indexOf(id)+1:'+'}</i></button>`).join('')}`}
window.cpOpen=(m,pre,nm)=>{CP={m,sel:pre||[],nm:nm||'Séance perso',g:m=='swap'?CM[wsCur()].g:'all',eq:'all'};cp()};
window.cpS=(k,v)=>{CP[k]=v;cp()};window.cpX=()=>{const o=d.querySelector('#cp');o&&o.remove()};
window.cpT=id=>{if(CP.m=='swap'){cpX();wsRep(id);return}if(CP.m=='add'){cpX();wsApp(id);return}const k=CP.sel.indexOf(id);k<0?CP.sel.push(id):CP.sel.splice(k,1);hz('tap');const y=(d.querySelector('#cp')||{}).scrollTop;cp();d.querySelector('#cp').scrollTop=y};
window.cpGo=()=>{if(!CP.sel.length)return;if(S.cur&&!confirm('Remplacer la séance en cours ?'))return;S.cur={i:0,ex:{},t0:Date.now(),cx:{n:CP.nm,ex:CP.sel.map((id,i)=>dflt(id,i))}};save();cpX();openWS()};
/* coach */
window.qa=q=>{const i=d.querySelector('#cm');if(i){i.value=q;send()}};
V.coach=()=>{const t=T(),sw=slope(21),k=avgFood('k'),n7=S.wk.filter(w=>w.d>=ago(6)).length,on=!!(S.cfg.url&&S.cfg.tok),tl=(l,v,s,c)=>`<div class=tl style="--c:${c}"><small>${l}</small><b>${v}</b><small>${s}</small></div>`,loc=coachLocal().replace(/^<h1>.*?<\/p>/,'');
return `<header><small>${on?'Coach en ligne':'Analyse sur ton téléphone'}</small><h1>Coach</h1></header><div class=tls>${tl('Poids / sem.',sw==null?'—':(sw>0?'+':'')+r(sw,2)+' kg','tendance',"#6db6ff")}${tl('Calories',k?nf(k):'—','objectif '+nf(t.k),'#ff8a5c')}${tl('Séances',n7,'7 derniers jours','#5eea9a')}</div><h2>Demander au coach</h2><div class=qc>${['Pourquoi je stagne ?','Que manger ce soir ?','Ajuste mes calories','Bilan de ma semaine'].map(q=>`<button onclick="qa('${q}')">${q}</button>`).join('')}</div><div class="c cht"><div class=chat id=ch>${S.chat.map(m=>`<div class="bb${m.role=='user'?' u':''}${m.err?' e':''}">${esc(m.text)}</div>`).join('')||'<p>Pose une question : le coach s’appuie sur tes vraies données.</p>'}${busy?'<p>Le coach réfléchit…</p>':''}</div><div class=s><input id=cm placeholder="Ta question" style="text-align:left;width:100%" onkeydown="event.key==\'Enter\'&&send()"><button class=k style="background:var(--gold);color:#1a1405;border:0" onclick=send()>${svg(IC.up)}</button></div></div><h2>Analyse de tes données</h2><div class=ins>${loc}</div><h2>Réglages</h2><details class=c><summary>Mémoire du coach (${S.mem.length})</summary>${S.mem.map((m,i)=>`<div class=row><span>${esc(m)}</span><button class=del onclick=memDel(${i})>Retirer</button></div>`).join('')}<div class=s><input id=mi placeholder="Ex. : épaule droite sensible" style="text-align:left;width:100%"><button class=g style="width:auto" onclick=memAdd()>Ajouter</button></div></details><details class=c><summary>Connexion au coach en ligne</summary><label>Adresse du serveur<input value="${esc(S.cfg.url)}" placeholder="https://…workers.dev" onchange="cfg('url',this.value)"></label><label style="margin-top:14px">Code d’accès<input type=password value="${esc(S.cfg.tok)}" onchange="cfg('tok',this.value)"></label><button class=g onclick="S.chat=[];save();R()">Effacer la conversation</button></details>`};
const R0=window.R;window.R=function(){R0();d.body.dataset.tab=S.p?S.tab:'home';const c=d.querySelector('#ch');c&&(c.scrollTop=c.scrollHeight)};
R();
})();
