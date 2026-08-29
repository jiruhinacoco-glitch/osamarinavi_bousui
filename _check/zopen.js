/* 現場記録帳の「作成図面」→「開く →」（?open=保存ID）の流れ

   ★2026-08-29f に見つけた不具合2つ
     ①中身が使える形かを**確かめずに**書いていたので、壊れた保存を開くと
       **いま描いている図面が上書きされて消えて**いた（いちばん怖い失敗）。
     ②「入口メニューを出さない」印が、読み直し（reload）で消えていた。
       ＝保存図面を開いても、その上に入口メニューがかぶさっていた（§151の意図と違う）。

   使い方: node _check/zopen.js
           node _check/zopen.js before   … 直す前のファイルと比べる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const {execSync}=require('child_process');
const BEFORE=process.argv[2]==='before';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
let FILE='zumen_sekisan.html';
if(BEFORE){ FILE='_before_zopen.html'; execSync('git show HEAD:zumen_sekisan.html > '+FILE); }

const RING=(w,h,nm)=>({pts:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],
  edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'})), lv:0, holes:[], name:nm});
const ST ={polys:[RING(10,8,'保存した屋根')],parts:[],d3sol:[],scaleM:1,specCode:'AS-T1'};
const NOW={polys:[RING(5,5,'いま描いている屋根')],parts:[],d3sol:[],scaleM:1,specCode:'AS-T1'};

(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const run=async(nm, rec, want)=>{
    const ctx=await b.newContext({viewport:{width:1500,height:950}});
    const p=await ctx.newPage(); p.on('dialog',d=>d.dismiss().catch(()=>{}));
    const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,55)));
    await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
    await p.evaluate(([r,now])=>{ localStorage.setItem('nn_zumen_saves_v1',JSON.stringify(r?[r]:[]));
      localStorage.setItem('nn_zumen_v1',JSON.stringify(now)); },[rec,NOW]);
    await p.goto('http://localhost:8899/'+FILE+'?open='+(rec?rec.id:'ZZZ'),{waitUntil:'load'});
    await p.waitForTimeout(2300);
    const r=await p.evaluate(()=>{ const m=document.getElementById('nnZMenu');
      return {name:(state.polys[0]||{}).name||'（なし）', n:state.polys.length,
              menu:m?getComputedStyle(m).display:'なし'}; }).catch(e=>({err:String(e).slice(0,50)}));
    ok(nm, r && r.name===want.name && r.menu===want.menu && errs.length===0,
       {結果:r, ほしい:want, err:errs[0]||''});
    await ctx.close();
  };
  const DATA=JSON.stringify(ST);
  await run('正しい保存を開く：その図面が出て、入口メニューは出ない',
    {id:'zz1',name:'保存図面',date:'2026-08-29',data:DATA}, {name:'保存した屋根', menu:'none'});
  await run('data が無い保存：いまの図面は消えない',
    {id:'zz2',name:'こわれ',date:'2026-08-29'}, {name:'いま描いている屋根', menu:'block'});
  await run('data が壊れた保存：いまの図面は消えない',
    {id:'zz3',name:'こわれ2',date:'2026-08-29',data:'{こわれ'}, {name:'いま描いている屋根', menu:'block'});
  await run('data が文字の保存：いまの図面は消えない',
    {id:'zz4',name:'こわれ3',date:'2026-08-29',data:'あいう'}, {name:'いま描いている屋根', menu:'block'});
  await run('data が屋根の並びを持たない：いまの図面は消えない',
    {id:'zz5',name:'こわれ4',date:'2026-08-29',data:'{"polys":"あ"}'}, {name:'いま描いている屋根', menu:'block'});
  await run('無い番号で開く：いまの図面は消えない',
    null, {name:'いま描いている屋根', menu:'block'});

  /* ---- 「📂 開く」の一覧からも同じことを確かめる ---- */
  const openDlg=async(nm, saves, clickIdx, want)=>{
    const ctx=await b.newContext({viewport:{width:1500,height:950}});
    const p=await ctx.newPage(); p.on('dialog',d=>d.accept().catch(()=>{}));
    const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,55)));
    await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
    await p.evaluate(([sv,now])=>{ localStorage.setItem('nn_zumen_saves_v1',JSON.stringify(sv));
      localStorage.setItem('nn_zumen_v1',JSON.stringify(now)); },[saves,NOW]);
    await p.reload({waitUntil:'load'}); await p.waitForTimeout(1900);
    await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
    const o={};
    try{ await p.evaluate(()=>nnOpenDwg());
         o.rows=await p.evaluate(()=>document.querySelectorAll('#nnDwgList .rw').length); }
    catch(e){ o.rows='ERR:'+String(e).slice(0,40); }
    if(clickIdx!=null){
      try{ await p.evaluate(i=>{ const r=document.querySelectorAll('#nnDwgList .rw')[i];
        if(r) r.querySelector('.op').click(); }, clickIdx); }catch(e){ o.click='ERR'; }
      await p.waitForTimeout(2200);
      o.name=await p.evaluate(()=>(state.polys[0]||{}).name||'（なし）');
    }
    const good = o.rows===want.rows && (want.name===undefined || o.name===want.name) && errs.length===0;
    ok('📂開く '+nm, good, {結果:o, ほしい:want, err:errs[0]||''});
    await ctx.close();
  };
  await openDlg('正常を開く', [{id:'a1',name:'保存図面',date:'2026-08-29',data:DATA}], 0,
    {rows:1, name:'保存した屋根'});
  await openDlg('data が無いのを開く：いまの図面は消えない',
    [{id:'a2',name:'こわれ',date:'2026-08-29'}], 0, {rows:1, name:'いま描いている屋根'});
  await openDlg('data が文字のを開く：いまの図面は消えない',
    [{id:'a3',name:'こわれ2',date:'2026-08-29',data:'あいう'}], 0, {rows:1, name:'いま描いている屋根'});
  await openDlg('一覧にnullが混じっても出る',
    [null,{id:'a4',name:'保存図面',date:'2026-08-29',data:DATA}], null, {rows:1});
  await openDlg('名前が数字でも出る',
    [{id:'a5',name:12345,date:20260829,data:DATA}], null, {rows:1});

  /* ふつうに開いたときは、これまでどおり入口メニューが出る */
  {
    const ctx=await b.newContext({viewport:{width:1500,height:950}});
    const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,55)));
    await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'}); await p.waitForTimeout(2000);
    const m=await p.evaluate(()=>{ const e=document.getElementById('nnZMenu');
      return e?getComputedStyle(e).display:'なし'; });
    ok('ふつうに開いたら入口メニューが出る', m==='block', m);
    await ctx.close();
  }
  console.log(R.join('\n'));
  const ng=R.filter(x=>x.startsWith('★')).length;
  console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
  if(BEFORE){ try{ execSync('rm -f _before_zopen.html'); }catch(_){} }
  await b.close(); process.exit(ng?1:0);
})();
