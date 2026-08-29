/* 保存の「1件の中の項目」が変な形でも、一覧が出て・開いて・使えるか

   ★2026-08-29a に見つけた不具合：
     §199・§210 では「並びであること」「1件ずつが箱であること」まで直したが、
     **その1件の中の項目（部位・工程・写真・注意）の形は見ていなかった**。
     ・ライブラリ … 部位（bui）が文字／欠けていると、**一覧が丸ごと0件**になる
       （見本8件まで消えて、ライブラリが使えなくなる）
     ・仕様登録 … 工程（steps）が文字／欠けていると、**その仕様を開いた瞬間に止まる**
       （画面から直すこともできない）
     どちらも、古い版のバックアップを読み込んだときなどに起こり得る。
     いまは読み込むときに「使える形」に直す（捨てずに拾う）。

   ★教訓：壊れ方の検査は「開けるか」→「一覧が出るか」→「開いて操作できるか」まで見ること。

   使い方: node _check/junkfield.js
           node _check/junkfield.js before   … 直す前のファイルと比べる
           （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const {execSync}=require('child_process');
const BEFORE=process.argv[2]==='before';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));

let LIB='library.html', SHI='shiyo_toroku.html';
if(BEFORE){
  LIB='_before_lib.html'; SHI='_before_shi.html';
  execSync('git show HEAD:library.html > '+LIB+' && git show HEAD:shiyo_toroku.html > '+SHI);
}

const LIBCASE=[
 ['部位が文字',   {id:'x1',title:'こわれ1',bui:'パラペット',kou:'トーチ工法',kbn:'改修',date:'2026-08-29'}],
 ['部位が無い',   {id:'x2',title:'こわれ2',kou:'トーチ工法',kbn:'改修',date:'2026-08-29'}],
 ['部位がnull',  {id:'x3',title:'こわれ3',bui:null,kou:'トーチ工法',kbn:'改修',date:'2026-08-29'}],
 ['工程が文字',   {id:'x4',title:'こわれ4',bui:['平場'],steps:'あ',kou:'トーチ工法',kbn:'改修',date:'2026-08-29'}],
 ['写真が文字',   {id:'x6',title:'こわれ6',bui:['平場'],photos:'p',kou:'トーチ工法',kbn:'改修',date:'2026-08-29'}],
 ['注意が数字',   {id:'x5',title:'こわれ5',bui:['平場'],caution:3,kou:'トーチ工法',kbn:'改修',date:'2026-08-29'}],
];
const SP=st=>({v:1,items:[{id:'s1',code:'T-1',name:'テスト仕様',cat:'塗膜防水',sub:'自社仕様',
  src:'自社',ap:'自社',note:'',memo:'',steps:st,createdAt:1,updatedAt:1}]});
const SHICASE=[['工程が文字',SP('あ')],['工程が無い',SP(undefined)],['工程にnull',SP([null,3])],
               ['工程が数字',SP(9)]];

(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});

  /* ---- ライブラリ：見本8件＋壊れた1件＝9件が出て、詳細も開けるか ---- */
  for(const [nm,item] of LIBCASE){
    const ctx=await b.newContext({viewport:{width:1400,height:900}});
    const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,60)));
    await p.goto('http://localhost:8899/'+LIB,{waitUntil:'load'});
    await p.evaluate(it=>localStorage.setItem('nn_lib_items',JSON.stringify([it])),item);
    await p.reload({waitUntil:'load'}); await p.waitForTimeout(1300);
    const n=await p.evaluate(()=>document.querySelectorAll('.lr2').length);
    const det=await p.evaluate(id=>{ try{ openDetail(id);
      return {ok:/こわれ/.test(document.body.innerText)}; }catch(e){ return {err:e.message.slice(0,45)}; } },item.id)
      .catch(e=>({err:String(e).slice(0,45)}));
    ok('ライブラリ '+nm+'：一覧9件・詳細が開く・JSエラーなし',
       n===9 && det.ok===true && errs.length===0, {一覧:n, 詳細:det, err:errs[0]||''});
    await ctx.close();
  }

  /* ---- 仕様登録：その仕様を開いて中身が出るか ---- */
  for(const [nm,data] of SHICASE){
    const ctx=await b.newContext({viewport:{width:1400,height:900}});
    const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,60)));
    await p.goto('http://localhost:8899/'+SHI,{waitUntil:'load'});
    await p.evaluate(d=>localStorage.setItem('nn_specs_v1',JSON.stringify(d)),data);
    await p.reload({waitUntil:'load'}); await p.waitForTimeout(1500);
    const r=await p.evaluate(()=>{ try{ showView('mine'); sel={type:'mine',id:'s1'}; render();
      return {has:/テスト仕様/.test(document.body.innerText)}; }
      catch(e){ return {err:e.message.slice(0,45)}; } }).catch(e=>({err:String(e).slice(0,45)}));
    ok('仕様登録 '+nm+'：開いて中身が出る・JSエラーなし',
       r.has===true && errs.length===0, {結果:r, err:errs[0]||''});
    await ctx.close();
  }

  console.log(R.join('\n'));
  const ng=R.filter(x=>x.startsWith('★')).length;
  console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
  if(BEFORE){ try{ execSync('rm -f _before_lib.html _before_shi.html'); }catch(_){} }
  await b.close(); process.exit(ng?1:0);
})();
