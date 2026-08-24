/* 端末に保存してあるデータが壊れていても、ページが開いて使えるか。
   ★保存が半分だけ書けた・別の版のデータが残っている、などは実際に起こる。
     受け止めていないと「二度と開けない」状態になり、消す手立ても無くなる（いちばん怖い失敗）。
   使い方： node _check/junkdata.js                                          */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PAGES=['index.html','kirokucho_demo.html','zumen_sekisan.html','genba_map_v36.html','hacchu.html',
 'library.html','yougo.html','kokkosho.html','camera.html','shiyo_toroku.html','zairyo_toroku.html'];
const KEYS=['nn_kirokucho_sched_v2','nn_kirokucho_def_v1','nn_kirokucho_photo_v1','nn_kirokucho_faces_v1',
 'nn_kirokucho_draft_v1','nn_zumen_v1','nn_zumen_plan_v1','nn_zumen_parts_v1','nn_zumen_saves_v1',
 'nn_zumen_theme','nn_zumen_grid','nn_zumen_dims','nn_zumen_wfdim','nn_zumen_split','nn_zumen_rtblpos',
 'nn_specs_v1','nn_materials_v1','nn_lib_items','nn_lib_reuse','nn_hacchu_hist','nn_hacchu_myco',
 'nn_yougo_stars','nn_tokui_v1','nn_view_mode','kokko_view','nn_bk_last','nn_bk_snooze',
 'osamari_custom_sites','osamari_roofs','osamari_steps','osamari_photos','osamari_pos_v2',
 'osamari_roof_h','osamari_pin_alt','osamari_gmaps_key','osamari_geo_v8','osamari_fov','osamari_panel_w'];
const JUNKS=[['こわれた文字','これはJSONではありません'],
             ['途中で切れた','{"items":[{"a":1},'],
             ['null','null'],
             ['数字','12345'],
             ['真偽','true'],
             ['ただの文字列','"あ"'],
             ['一覧のはずが箱','{}'],          /* ★形の入れ違いが実際にいちばん多い */
             ['箱のはずが一覧','[]']];
/* ★Googleの地図は「でたらめなキー」だと当然読み込めない。
   これはこちらの処理が止まったのではないので、この知らせは数えない。 */
const IGNORE=/Google Maps JavaScript API|ApiTargetBlockedMapError|InvalidKeyMapError/;
let NG=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
 args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const f of PAGES){
  const bad=[];
  for(const [name,val] of JUNKS){
    const ctx=await b.newContext({viewport:{width:1400,height:900}});
    const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
    const errs=[]; p.on('pageerror',e=>{ if(!IGNORE.test(e.message)) errs.push(e.message.slice(0,55)); });
    await p.addInitScript(([ks,v])=>{ try{ ks.forEach(k=>localStorage.setItem(k,v)); }catch(_){} },[KEYS,val]);
    let ok=true; try{ await p.goto('http://localhost:8899/'+f,{waitUntil:'load'}); }catch(_){ ok=false; }
    await p.waitForTimeout(1500);
    const r=await p.evaluate(()=>({m:document.body?document.body.innerText.replace(/\s+/g,'').length:0}))
      .catch(()=>({m:0}));
    if(!ok||r.m<50||errs.length) bad.push(name+'＝'+(errs.length?errs[0]:'中身'+r.m+'文字'));
    await ctx.close();
  }
  if(bad.length){ NG++; console.log('★NG '+f.padEnd(22)+bad.join(' / ')); }
  else console.log('○   '+f.padEnd(22)+'壊れた保存が入っていても開ける');
}
await b.close(); console.log('★NG'+NG);
})();
