/* 2026-09-24h 防水工法の絵（icons/kou_*.png）を、表示される大きさに合った高画質版（icons/kq/<key>_h<高さ>.png）へ自動で差し替える。
   元の絵（最大1672px）をブラウザが28〜60pxへ一気に縮めると、線がつぶれてぼやけていた（本人：画質が非常に悪い）。
   あらかじめ Lanczos で縮めて少しだけ輪郭を立てた版を高さ32/48/64/96/128/168(192/256)で用意し、
   「画面上の実寸 × 画面の細かさ（devicePixelRatio）」以上で一番小さい版を選ぶ。全11画面が読む。 */
(function(){
 'use strict';
 const KQ={"ure_tsuki":{"a":1.4505,"h":[32,48,64,96,128,192,256]},"as":{"a":1.7768,"h":[32,48,64,96,128,192,256]},"enbi":{"a":1.7768,"h":[32,48,64,96,128,192,256]},"frp":{"a":1.3333,"h":[32,48,64,96,128,192,256]},"ure":{"a":1.3217,"h":[32,48,64,96,128,192,256]},"enbi_kikai":{"a":1.4048,"h":[32,48,64,96,128,168]},"enbi_setchaku":{"a":1.625,"h":[32,48,64,96,128,168]},"nenchaku":{"a":1.3631,"h":[32,48,64,96,128,168]},"netsu":{"a":1.5,"h":[32,48,64,96,128,168]},"torch":{"a":1.1429,"h":[32,48,64,96,128,168]},"ure_fukitsuke":{"a":1.25,"h":[32,48,64,96,128,168]},"ure_micchaku":{"a":1.2899,"h":[32,48,64,96,128,192,256]}};
 const RE=/icons\/kou_([a-z_]+?)(?:_s)?\.png/;
 function need(img,k){
  const r=img.getBoundingClientRect();if(!r.width||!r.height)return 0;
  const a=KQ[k].a,fit=getComputedStyle(img).objectFit;
  let h=r.height;
  if(fit==='contain')h=Math.min(r.height,r.width/a);
  else if(fit==='cover')h=Math.max(r.height,r.width/a);
  else if(fit==='scale-down')h=Math.min(r.height,r.width/a);
  return Math.ceil(h*(window.devicePixelRatio||1));
 }
 function fix(img){
  const src=img.getAttribute('src')||'';const m=src.match(RE);if(!m||!KQ[m[1]])return;
  const k=m[1],n=need(img,k);
  if(!n){ if(!img.dataset.kqWait){img.dataset.kqWait='1';img.addEventListener('load',()=>{delete img.dataset.kqWait;fix(img);},{once:true});setTimeout(()=>{delete img.dataset.kqWait;fix(img);},700);} return; }
  const hs=KQ[k].h,h=hs.find(x=>x>=n)||hs[hs.length-1];
  img.setAttribute('src','./icons/kq/'+k+'_h'+h+'.png');
 }
 function scan(root){ if(root.nodeType!==1)return; if(root.tagName==='IMG')fix(root); root.querySelectorAll&&root.querySelectorAll('img[src*="icons/kou_"]').forEach(fix); }
 function start(){
  scan(document.body);
  new MutationObserver(rs=>{for(const r of rs){ if(r.type==='attributes')fix(r.target); else r.addedNodes.forEach(scan); }})
   .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
 }
 if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})();
