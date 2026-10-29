const J=(o,s=200,h={})=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json',...h}});
const hits=new Map(),cl=(v,a,b)=>Math.min(b,Math.max(a,+v||0));
const SYS=`Tu es le coach de prise de masse de l'utilisateur. Réponds en français, de façon claire et concise. Appuie-toi uniquement sur le CONTEXTE JSON. Si une donnée est absente ou null, dis-le : n'invente jamais de mesure. Sommeil et récupération sont déclaratifs (aucune montre connectée). Explique en une phrase le raisonnement de chaque recommandation. Aucun diagnostic médical : en cas de douleur, oriente vers un professionnel.`;
const MEAL=`Identifie les aliments visibles (mode plat) ou lis le tableau nutritionnel (mode étiquette). Réponds uniquement en JSON : {"items":[{"n":"nom en français","g":poids estimé en grammes (portion indiquée ou 100 pour une étiquette),"k100":kcal/100g,"p100":protéines/100g,"c100":glucides/100g,"f100":lipides/100g,"fb100":fibres/100g,"conf":"haute|moyenne|faible"}],"note":"incertitudes principales en une phrase"}. Ne devine pas ce qui n'est pas visible.`;
async function gem(env,body){const m=env.GEMINI_MODEL||'gemini-2.5-flash',r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},body:JSON.stringify(body)});if(r.status==429)throw 429;if(!r.ok)throw r.status;const j=await r.json();return(j.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('')}
export default{async fetch(req,env){
 const allow=env.ALLOWED_ORIGIN||'',cors={'access-control-allow-origin':allow,'access-control-allow-headers':'content-type,x-app-token','access-control-allow-methods':'POST,OPTIONS',vary:'origin'};
 if(req.method=='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(!allow||req.headers.get('origin')!==allow)return J({error:'origine refusée'},403);
 if(req.method!='POST')return J({error:'méthode'},405,cors);
 if(!env.GEMINI_API_KEY||!env.APP_TOKEN)return J({error:'serveur non configuré'},500,cors);
 if(req.headers.get('x-app-token')!==env.APP_TOKEN)return J({error:'accès refusé'},401,cors);
 const ip=req.headers.get('cf-connecting-ip')||'x',now=Date.now(),h=(hits.get(ip)||[]).filter(t=>now-t<36e5);
 if(h.length>=(+env.HOURLY_LIMIT||40))return J({error:'quota'},429,cors);h.push(now);hits.set(ip,h);
 const raw=await req.text();if(raw.length>2e6)return J({error:'requête trop volumineuse'},413,cors);
 let b;try{b=JSON.parse(raw)}catch{return J({error:'JSON invalide'},400,cors)}
 const path=new URL(req.url).pathname;
 try{
  if(path=='/chat'){const ms=Array.isArray(b.messages)?b.messages.slice(-12):[];
   if(!ms.length||ms.some(m=>!['user','model'].includes(m.role)||typeof m.text!='string'||m.text.length>2e3))return J({error:'messages invalides'},400,cors);
   const ctx=JSON.stringify(b.context||{}).slice(0,2e4);
   const text=await gem(env,{systemInstruction:{parts:[{text:SYS+'\nCONTEXTE: '+ctx}]},contents:ms.map(m=>({role:m.role,parts:[{text:m.text}]})),generationConfig:{maxOutputTokens:700,temperature:.4}});
   return J({text:text||'Je n’ai pas pu formuler de réponse.'},200,cors)}
  if(path=='/meal'){if(typeof b.image!='string'||b.image.length<100||b.image.length>15e5)return J({error:'image invalide'},400,cors);
   const t=await gem(env,{contents:[{role:'user',parts:[{text:MEAL+'\nMode : '+(b.mode=='etiquette'?'étiquette':'plat')},{inline_data:{mime_type:'image/jpeg',data:b.image}}]}],generationConfig:{responseMimeType:'application/json',maxOutputTokens:1200,temperature:.2}});
   let o;try{o=JSON.parse(t.replace(/^```(json)?|```$/g,'').trim())}catch{return J({error:'réponse illisible'},502,cors)}
   const items=(Array.isArray(o.items)?o.items:[]).slice(0,12).map(x=>({n:String(x.n||'?').slice(0,60),g:cl(x.g,0,2e3),k100:cl(x.k100,0,900),p100:cl(x.p100,0,100),c100:cl(x.c100,0,100),f100:cl(x.f100,0,100),fb100:cl(x.fb100,0,100),conf:['haute','moyenne','faible'].includes(x.conf)?x.conf:'faible'}));
   if(!items.length)return J({error:'aucun aliment reconnu'},422,cors);
   return J({items,note:String(o.note||'').slice(0,300)},200,cors)}
  return J({error:'route'},404,cors)
 }catch(e){return e==429?J({error:'quota'},429,cors):J({error:'service indisponible'},502,cors)}
}};
