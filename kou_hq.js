/* 2026-09-24h 防水工法の絵（icons/kou_*.png）を、表示される大きさに合った高画質版（icons/kq/<key>_h<高さ>.png）へ自動で差し替える。
   元の絵（最大1672px）をブラウザが28〜60pxへ一気に縮めると、線がつぶれてぼやけていた（本人：画質が非常に悪い）。
   あらかじめ Lanczos で縮めて少しだけ輪郭を立てた版を高さ32/48/64/96/128/168(192/256)で用意し、
   「画面上の実寸 × 画面の細かさ（devicePixelRatio）」以上で一番小さい版を選ぶ。全11画面が読む。 */
(function(){
 'use strict';
 const KQ={"ure_tsuki":{"a":1.4505,"h":[32,48,64,96,128,192,256]},"as":{"a":1.7768,"h":[32,48,64,96,128,192,256]},"enbi":{"a":1.7768,"h":[32,48,64,96,128,192,256]},"frp":{"a":1.3333,"h":[32,48,64,96,128,192,256]},"ure":{"a":1.3217,"h":[32,48,64,96,128,192,256]},"enbi_kikai":{"a":1.4048,"h":[32,48,64,96,128,168]},"enbi_setchaku":{"a":1.625,"h":[32,48,64,96,128,168]},"nenchaku":{"a":1.3631,"h":[32,48,64,96,128,168]},"netsu":{"a":1.5,"h":[32,48,64,96,128,168]},"torch":{"a":1.1429,"h":[32,48,64,96,128,168]},"ure_fukitsuke":{"a":1.25,"h":[32,48,64,96,128,168]},"ure_micchaku":{"a":1.2899,"h":[32,48,64,96,128,192,256]}};
 const RE=/icons\/kou_([a-z_]+?)(?:_s)?\.png/, RQ=/icons\/kq\/([a-z_]+)_h(\d+)\.png/;
 function need(img,k){
  const r=img.getBoundingClientRect();if(!r.width||!r.height)return 0;
  const a=KQ[k].a,fit=getComputedStyle(img).objectFit;
  let h=r.height;
  /* ★2026-09-26q 読み込み前の絵は幅が仮の値（iPhoneのSafariは細い仮の幅を持つことがある）。
     幅を「高さだけ決めて auto」にしている所（発注の現場カード）では、仮の幅から小さい版を選んで荒くなった（本人：画質が著しく悪い）。
     → 読み込み前は幅を信じず、高さで選ぶ */
  const loaded=img.complete&&img.naturalWidth>0;
  if(!loaded&&(fit==='contain'||fit==='scale-down'));
  else if(fit==='contain')h=Math.min(r.height,r.width/a);
  else if(fit==='cover')h=Math.max(r.height,r.width/a);
  else if(fit==='scale-down')h=Math.min(r.height,r.width/a);
  return Math.ceil(h*(window.devicePixelRatio||1));
 }
 /* ★2026-10-08a 「測る→差し替える」を1枚ずつくり返すと、差し替えるたびに次の絵を測る前に
    画面ぜんぶの置き場所を計算し直す（スマホで一覧を開くたびに約1秒画面が固まった）。
    plan＝測るだけ（差し替えの中身を関数で返す）。fixAll が全部測ってから、まとめて差し替える。 */
 function plan(img){
  const src=img.getAttribute('src')||'';
  if(!RQ.test(src)&&!RE.test(src))return null;
  if(hidden(img))return ()=>{ if(!later(img))fix0(img); };
  /* ★2026-09-26q 差し替えたあとで表示が大きくなった（読み込み後に幅が決まった等）ら、大きい版へ上げ直す（下げはしない） */
  const q=src.match(RQ);
  if(q&&KQ[q[1]]){ const n2=need(img,q[1]);if(!n2)return null; const hs2=KQ[q[1]].h,cur=+q[2],h2=hs2.find(x=>x>=n2)||hs2[hs2.length-1];
    return h2>cur?()=>img.setAttribute('src','./icons/kq/'+q[1]+'_h'+h2+'.png'):null; }
  const m=src.match(RE);if(!m||!KQ[m[1]])return null;
  const k=m[1],n=need(img,k);
  if(!n){ return ()=>{ if(!img.dataset.kqWait){img.dataset.kqWait='1';img.addEventListener('load',()=>{delete img.dataset.kqWait;fix(img);},{once:true});setTimeout(()=>{delete img.dataset.kqWait;fix(img);},700);} }; }
  const hs=KQ[k].h,h=hs.find(x=>x>=n)||hs[hs.length-1];
  return ()=>{ img.setAttribute('src','./icons/kq/'+k+'_h'+h+'.png');
   img.addEventListener('load',()=>fix(img),{once:true}); };   /* 読み込んで大きさが決まったら、もう一度だけ確かめる */
 }
 /* ★2026-10-08a 画面外で組み立てを後回しにしている所（content-visibility:auto の .nnoff カード等）の絵は、
    測るとその場で組み立ててしまう（100枚ぶん）。見える所に来てから（IntersectionObserver）測る。
    隠れている（display:none）絵も同じく、見えたときに測る。 */
 let io=null;
 let hidden=function(img){ try{ return !!img.checkVisibility&&!img.checkVisibility({contentVisibilityAuto:true}); }catch(_){ return false; } };
 function later(img){
  if(!('IntersectionObserver' in window))return false;
  if(!io)io=new IntersectionObserver(es=>{ const s=[]; es.forEach(e=>{ if(e.isIntersecting){ io.unobserve(e.target); s.push(e.target); } }); if(s.length)fixAll(s); },{rootMargin:'200px'});
  io.observe(img); return true;
 }
 function fixAll(imgs){ const acts=[]; for(const img of imgs){ const a=plan(img); if(a)acts.push(a); } acts.forEach(a=>a()); }
 function fix(img){ fixAll([img]); }
 function fix0(img){ const n=hidden; hidden=()=>false; try{ fix(img); }finally{ hidden=n; } }
 function pick(root,out){ if(root.nodeType!==1)return; if(root.tagName==='IMG')out.add(root); root.querySelectorAll&&root.querySelectorAll('img[src*="icons/kou_"],img[src*="icons/kq/"]').forEach(i=>out.add(i)); }
 function scan(root){ const s=new Set(); pick(root,s); fixAll(s); }
 function start(){
  scan(document.body);
  new MutationObserver(rs=>{ const s=new Set(); for(const r of rs){ if(r.type==='attributes')s.add(r.target); else r.addedNodes.forEach(n=>pick(n,s)); } if(s.size)fixAll(s); })
   .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
 }
 if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();
