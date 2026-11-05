/* 見た目の安全網（整理・作り直しのとき用）：主な画面を決まった条件で撮って、フォルダに保存する。
   使い方: node _check/_tools/snap.js <保存先フォルダ> [kirokucho_demo.html]
   比べる: python3 _check/_tools/snapdiff.py <前のフォルダ> <後のフォルダ>
   ★時計・乱数・動き（アニメーション）を止めて撮る（同じ版を2回撮ると差0になること）。 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const OUT=process.argv[2]||'/tmp/snap';const FILE=process.argv[3]||'kirokucho_demo.html';fs.mkdirSync(OUT,{recursive:true});
const UAP='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const UAI='Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const DEV={ph:{viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:UAP},
  phl:{viewport:{width:852,height:393},screen:{width:852,height:393},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:UAP},
  ipad:{viewport:{width:820,height:1180},screen:{width:820,height:1180},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:UAI},
  pc:{viewport:{width:2000,height:1000}},pc13:{viewport:{width:1366,height:768}}};
/* [名前, 端末, スマホ表示モード, 画面, 何をするか] */
const SHOTS=[
 ['ph_m_list','ph',1,'list'],['ph_m_dash','ph',1,'dash'],['ph_m_detail','ph',1,'detail'],['ph_m_form','ph',1,'form'],
 ['ph_i_list','ph',0,'list'],['ph_i_detail','ph',0,'detail'],
 ['phl_m_list','phl',1,'list'],
 ['ipad_list','ipad',0,'list'],['ipad_dash','ipad',0,'dash'],['ipad_detail','ipad',0,'detail'],
 ['pc_list','pc',0,'list'],['pc_dash','pc',0,'dash'],['pc_detail','pc',0,'detail'],['pc_form','pc',0,'form'],['pc_table','pc',0,'table'],
 ['pc13_list','pc13',0,'list'],['pc13_dash','pc13',0,'dash']];
(async()=>{const b=await chromium.launch();const only=process.env.ONLY;
for(const [nm,dv,mob,view] of SHOTS){ if(only&&!nm.includes(only)) continue;
 const ctx=await b.newContext({...DEV[dv],serviceWorkers:'block',reducedMotion:'reduce'});
 await ctx.addInitScript(([mob,view])=>{
   /* 時計を固定（2026-11-05 10:00）・乱数を固定 */
   const T=new Date(2026,10,5,10,0,0).getTime(), RD=Date; let off=0;
   class FD extends RD{ constructor(...a){ if(a.length) super(...a); else super(T+off); } static now(){ return T+off; } }
   window.Date=FD; let s=1; Math.random=()=>{ s=(s*16807)%2147483647; return s/2147483647; };
   document.addEventListener('DOMContentLoaded',()=>{ const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none !important; transition:none !important; caret-color:transparent !important;}'; document.head.appendChild(st); });
   try{ localStorage.clear(); if(mob) localStorage.setItem('nn_view_mode','mobile'); sessionStorage.setItem('nn_vm_view',view==='dash'?'dash':'list'); if(view==='table') localStorage.setItem('nn_record_view_v1',JSON.stringify({mode:'table'})); }catch(e){}
 },[mob,view]);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.dismiss().catch(()=>{}));
 await p.goto('http://localhost:8899/'+FILE);await p.evaluate(()=>document.fonts&&document.fonts.ready);await p.waitForTimeout(3500);
 if(view==='detail'){await p.evaluate(()=>{ if(window.nnGoDetail) nnGoDetail(props[0].id); });await p.waitForTimeout(1500);}
 if(view==='form'){await p.evaluate(()=>{ openModal(props[0].id); });await p.waitForTimeout(1500);}
 if(view==='table'){await p.evaluate(()=>{ const b=[...document.querySelectorAll('button,[role=button]')].find(x=>/表一覧/.test(x.textContent)); b&&b.click(); });await p.waitForTimeout(1500);}
 /* 2回続けて同じ絵になるまで待つ（文字合わせなどが落ち着くまで・最大8回） */
 const cdp=await ctx.newCDPSession(p);let prev=null,shot=null,k=0;
 for(;k<8;k++){ await p.waitForTimeout(700); shot=(await cdp.send('Page.captureScreenshot',{})).data; if(shot===prev) break; prev=shot; }
 fs.writeFileSync(OUT+'/'+nm+'.png',Buffer.from(shot,'base64')); if(k>=8) fs.writeFileSync(OUT+'/'+nm+'.unstable.txt','落ち着かなかった');
 if(errs.length) fs.writeFileSync(OUT+'/'+nm+'.err.txt',errs.join('\n'));
 console.log(nm,errs.length?'エラー'+errs.length:'');await ctx.close();}
await b.close();})();
