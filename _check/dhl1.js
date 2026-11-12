/* スマホの詳細：見出しの「工事名」ラベルの右に工事名が並ぶ（次の行へ落ちない）§1124
   使い方：node _check/dhl1.js [ファイル名]（http://localhost:8899 が要る）
   スマホモード・一覧モードの両方で、短い名前／長い名前（2行になる）を測る。札（ステータス）は工事名より下の行 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
let ng=0; const ok=(c,t,x)=>{ if(c) console.log('○',t,x||''); else { ng++; console.log('★NG',t,x||''); } };
(async()=>{
  const b=await chromium.launch();
  for(const mode of ['mobile','ichiran']){
    const c=await b.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
    await c.addInitScript(m=>{ try{ localStorage.setItem('nn_view_mode',m); }catch(e){} },mode);
    const p=await c.newPage();
    await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
    await p.waitForFunction(()=>typeof showView==='function'&&typeof nnGoDetail==='function'&&typeof props!=='undefined'&&props.length>0);
    await p.evaluate(()=>showView('list')); await p.waitForFunction(()=>document.querySelectorAll('#list .pcard').length>0);
    for(const nm of [null,'6物件工事改修工事その6テスト 札幌市白石清掃工場 屋上防水改修工事']){
      await p.evaluate(nm=>{ const q=props[0]; if(nm) q.name=nm; nnGoDetail(q.id); },nm);
      await p.waitForFunction(()=>{ const l=document.querySelector('#detail .drh > .dhl'); return l&&l.getBoundingClientRect().width>0; });
      const r=await p.evaluate(()=>{ const R=e=>e.getBoundingClientRect(), l=R(document.querySelector('#detail .drh > .dhl')), h=R(document.querySelector('#detail .drh > h2')), s=R(document.querySelector('#detail .drh > .dst')), d=R(document.querySelector('#detail .drh'));
        return {same:h.top<l.bottom-2&&h.left>=l.right-1, right:h.right<=d.right+1, tagBelow:s.top>=h.bottom-2, hh:Math.round(h.height), lw:Math.round(l.width)}; });
      const t=(mode==='mobile'?'スマホモード':'一覧モード')+'・'+(nm?'長い名前':'短い名前');
      ok(r.same,t+'：工事名がラベルの右に並ぶ',JSON.stringify(r));
      ok(r.right&&r.tagBelow,t+'：はみ出さず、札は工事名の下の行');
    }
    await c.close();
  }
  await b.close();
  console.log(ng?('★NG '+ng+'件'):'○ すべて合格');
})();
