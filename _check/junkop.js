/* 端末に保存してあるデータが壊れているとき、「開ける」だけでなく
   **ふだんの操作もできるか**を見る。
   ★junkdata.js は「開けるか」までしか見ていなかったので、
     開いたあとに操作したときだけ止まる不具合（工程表・新規登録の下書き）を
     見逃していた。＝この検査はその穴をふさぐもの。
   使い方： node _check/junkop.js                                            */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const KEYS=['nn_kirokucho_sched_v2','nn_kirokucho_def_v1','nn_kirokucho_photo_v1','nn_kirokucho_faces_v1',
 'nn_kirokucho_draft_v1','nn_zumen_v1','nn_zumen_plan_v1','nn_zumen_parts_v1','nn_zumen_saves_v1',
 'nn_zumen_theme','nn_zumen_grid','nn_zumen_dims','nn_zumen_wfdim','nn_zumen_split','nn_zumen_rtblpos',
 'nn_specs_v1','nn_materials_v1','nn_lib_items','nn_lib_reuse','nn_hacchu_hist','nn_hacchu_myco',
 'nn_yougo_stars','nn_tokui_v1','nn_view_mode','kokko_view','nn_bk_last','nn_bk_snooze',
 'osamari_custom_sites','osamari_roofs','osamari_steps','osamari_photos','osamari_pos_v2',
 'osamari_roof_h','osamari_pin_alt','osamari_geo_v8','osamari_fov','osamari_panel_w'];
/* ★形の入れ違い（一覧のはずが箱・箱のはずが一覧）がいちばん多い。
   さらに「入れ物は正しいが中身の形が違う」ものも入れる（今回の2件はこれ） */
const JUNKS=[['ただの文字','"あ"'],['数字','12345'],['一覧のはずが箱','{}'],['箱のはずが一覧','[]'],
 ['中身の形ちがい','{"43":{"g":{"a":1}},"v":{"x":1},"faces":"abc","items":"あ","moto":"あ"}'],
 ['null混じり','{"43":{"g":[null,1]},"items":[null,1],"faces":[null,1],"moto":[null]}'],
 ['途中で切れた','{"items":[{"a":1},']];
const IGNORE=/Google Maps JavaScript API|ApiTargetBlockedMapError|InvalidKeyMapError/;

/* ページごとの「ふだんの操作」。中で例外が出たらそのページはNG。 */
const OPS={
 'kirokucho_demo.html': ()=>{ const o={};
   showView('zentai'); o.全体=document.querySelectorAll('#schedview .gtbl td').length>0;
   showView('jisha');  o.自社=document.querySelectorAll('#schedview .gtbl td').length>0;
   showView('dash');   o.ダッシュ=document.querySelectorAll('#dashboard .dpanel').length>0;
   showView('list');
   openModal(); o.新規=document.getElementById('modalbg').style.display!=='none';
   document.getElementById('modalbg').style.display='none';
   selectedId=props[0].id; openDetailFull(); o.詳細=document.body.classList.contains('nn-detail');
   showView('list');
   return o; },
 'zumen_sekisan.html': ()=>{ const o={};
   try{nnZMenuClose();}catch(_){}
   loadSample(); o.見本=state.polys.length>0;
   draw(); recalc(); o.数量=!!document.getElementById('sekisan');
   setTab('wari'); setTab('sect'); setTab('zu'); o.タブ=true;
   saveState(); loadState(); o.保存=state.polys.length>0;
   return o; },
 'hacchu.html': ()=>{ const o={};
   o.現場=document.querySelectorAll('.gcard,.site,[onclick*="pickGenba"]').length>=0;
   if(typeof renderGenba==='function')renderGenba();
   if(typeof showStep==='function'){showStep(1);showStep(2);showStep(1);}
   o.流れ=true; return o; },
 'library.html': ()=>{ const o={};
   const c=document.querySelector('#grid,#list,.grid,main');
   if(typeof renderGrid==='function')renderGrid(c);
   if(typeof filtered==='function')o.絞り込み=Array.isArray(filtered());
   o.一覧=document.body.innerText.length>200; return o; },
 'zairyo_toroku.html': ()=>{ const o={}; if(typeof render==='function')render();
   if(typeof openDataModal==='function'){openDataModal(); o.データ=true;
     const m=document.getElementById('dataModal'); if(m)m.style.display='none';}
   o.一覧=document.body.innerText.length>200; return o; },
 'shiyo_toroku.html': ()=>{ const o={}; if(typeof render==='function')render();
   if(typeof openDataModal==='function'){openDataModal(); o.データ=true;
     const m=document.getElementById('dataModal'); if(m)m.style.display='none';}
   o.一覧=document.body.innerText.length>200; return o; },
 'yougo.html': ()=>{ const o={}; if(typeof render==='function')render();
   if(typeof showPhrase==='function')showPhrase();
   o.一覧=document.body.innerText.length>200; return o; },
 'index.html': ()=>{ const o={};
   if(typeof nnDataOpen==='function'){nnDataOpen(); o.設定=true;
     const m=document.getElementById('nnDataBg'); if(m)m.style.display='none';}
   if(typeof nnTokuiOpen==='function'){nnTokuiOpen(); o.客先=true;
     const m=document.getElementById('nnTokuiBg'); if(m)m.style.display='none';}
   return o; },
};
let NG=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
 args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const f of Object.keys(OPS)){
  const bad=[];
  for(const [name,val] of JUNKS){
    const ctx=await b.newContext({viewport:{width:1500,height:900}});
    const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
    const errs=[]; p.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errs.push(e.message.slice(0,50)); });
    await p.addInitScript(([ks,v])=>{ try{ ks.forEach(k=>localStorage.setItem(k,v)); }catch(_){} },[KEYS,val]);
    try{ await p.goto('http://localhost:8899/'+f,{waitUntil:'load'}); }catch(_){}
    await p.waitForTimeout(1500);
    const r=await Promise.race([
      p.evaluate(fn=>{ try{ return {ok:1, v:(0,eval)('('+fn+')')()}; }
                      catch(e){ return {ok:0, v:'★'+e.message.slice(0,45)}; } }, OPS[f].toString())
       /* ★版が古いページは自分で読み直すので、その拍子に切れることがある。落とさない。 */
       .catch(e=>({ok:0, v:'★'+String(e.message||e).slice(0,45)})),
      new Promise(r=>setTimeout(()=>r({ok:0,v:'★固まった'}),15000))]);
    await p.waitForTimeout(400);
    if(!r.ok) bad.push(name+'＝'+r.v);
    else if(errs.length) bad.push(name+'＝'+errs[0]);
    await ctx.close();
  }
  if(bad.length){ NG++; console.log('★NG '+f.padEnd(22)+bad.join(' / ')); }
  else console.log('○   '+f.padEnd(22)+'保存が壊れていても、ふだんの操作ができる');
}
await b.close(); console.log('★NG'+NG);
})();
