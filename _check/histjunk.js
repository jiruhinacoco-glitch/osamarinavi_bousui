/* 発注：履歴の現場・業者が一覧から消えていても、履歴の画面が開けるか

   ★2026-08-29e に見つけた不具合：
     発注履歴は現場・業者を「番号」だけで覚えている。
     現場の一覧（hacchu_sites.js）は §105 のとおり**現場記録帳から作り直す**ので、
     物件を消したり名前を変えたりすると、その番号が一覧から消える。
     すると **過去の発注が1件あるだけで、発注履歴の画面が開けなくなっていた**
     （`g.st` を読んだところで止まる）。壊れたデータではなく、ふつうに使っていて起こる。
     明細（lines）が並びでないとき、業者が消えたときも同じ。

   ★教訓：番号で覚えているものは、その番号が**あとから消えることがある**。
     見つからないときに止まるのではなく、名前を出して先へ進めること。

   使い方: node _check/histjunk.js
           node _check/histjunk.js before   … 直す前のファイルと比べる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const {execSync}=require('child_process');
const BEFORE=process.argv[2]==='before';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
let FILE='hacchu.html';
if(BEFORE){ FILE='_before_hacchu.html'; execSync('git show HEAD:hacchu.html > '+FILE); }

const OK={id:'h1',gid:'J051',vid:'v1',no:'H-001',date:'2026-08-29',due:'2026-08-31',via:'mail',
          lines:[{ref:'m1',n:'材料A',sp:'16kg/缶',u:'缶',q:10,p:1000,lock:true}], note:''};
const C=(o)=>[Object.assign({},OK,o)];
const CASES=[
 ['正常',                 [OK],                    true],
 ['現場が一覧から消えた',    C({gid:'ZZZ'}),          false],
 ['業者が一覧から消えた',    C({vid:'ZZZ'}),          true],
 ['明細が文字',            C({lines:'あ'}),         true],
 ['明細が無い',            C({lines:undefined}),    true],
 ['明細にnull',           C({lines:[null,{n:'A',q:1,p:1}]}), true],
 ['履歴にnullが混じる',     [null,OK],               true],
];
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [nm,data,canReorder] of CASES){
    const ctx=await b.newContext({viewport:{width:1400,height:900}});
    const p=await ctx.newPage(); p.on('dialog',d=>d.dismiss().catch(()=>{}));
    const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,55)));
    await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
    await p.evaluate(d=>localStorage.setItem('nn_hacchu_hist',JSON.stringify(d)),data);
    await p.reload({waitUntil:'load'}); await p.waitForTimeout(1600);
    const r=await p.evaluate(()=>{ const o={};
      try{ showView('hist'); o.hist='開けた'; o.rows=document.querySelectorAll('.hrow').length; }
        catch(e){ o.hist='ERR:'+e.message.slice(0,40); }
      try{ const h=history[0]; viewHist(h.id); o.sheet='見られた'; }catch(e){ o.sheet='ERR:'+e.message.slice(0,40); }
      try{ const h=history[0]; nnHacchuPDF(h,h.no); o.pdf='出た'; }catch(e){ o.pdf='ERR:'+e.message.slice(0,40); }
      try{ const h=history[0]; reorder(h.id);
           o.re=(typeof draft!=='undefined'&&draft)?'作れた':'作らず（案内を出した）'; }
        catch(e){ o.re='ERR:'+e.message.slice(0,40); }
      return o; }).catch(e=>({err:String(e).slice(0,55)}));
    const noErr = r && !/ERR/.test(JSON.stringify(r)) && r.rows===1 && errs.length===0;
    const reOK = canReorder ? (r&&r.re==='作れた') : (r&&r.re==='作らず（案内を出した）');
    ok(nm, noErr && reOK, {結果:r, err:errs[0]||''});
    await ctx.close();
  }
  console.log(R.join('\n'));
  const ng=R.filter(x=>x.startsWith('★')).length;
  console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
  if(BEFORE){ try{ execSync('rm -f _before_hacchu.html'); }catch(_){} }
  await b.close(); process.exit(ng?1:0);
})();
