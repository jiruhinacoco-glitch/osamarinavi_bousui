/* 屋根・部位の内訳（faces）が変な形でも、現場一覧が出て・編集フォームが開くか
   ＋ ふつうの動き（見本・保存分・わざと空にしたもの）が変わっていないか

   ★2026-08-29c に見つけた不具合：
     `nnFaceList` は保存された値をそのまま返していたので、
     中身が文字だと呼び出し側の `.forEach`／`.map` で止まっていた。
     止まる場所が**現場一覧の組み立ての中**なので、**一覧が丸ごと出なくなる**。
     `faces_sample.js` は現場記録帳と現場マップの両方が読むので、影響は2ページ。

   使い方: node _check/facesjunk.js
           node _check/facesjunk.js before   … 直す前のファイルと比べる
           （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const {execSync}=require('child_process');
const BEFORE=process.argv[2]==='before';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
if(BEFORE){ execSync('cp faces_sample.js _faces_now.js && git show HEAD:faces_sample.js > faces_sample.js'); }

const JUNK=[['内訳が文字','あいう'],['内訳が数字',5],['内訳が箱',{n:'あ'}],
            ['内訳にnullだけ',[null,3]],['内訳に文字が混じる',[{n:'平場',ko:'X-1',sp:'X-1',q:100},'あ',null]]];

(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});

  /* 内訳を持っている物件の名前を1つ拾う */
  let NAME=null;
  {
    const ctx=await b.newContext({viewport:{width:1500,height:950}});
    const p=await ctx.newPage(); await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
    await p.waitForTimeout(1900);
    NAME=await p.evaluate(()=>{ const k=Object.keys(window.NN_FACES||{});
      for(const n of k){ if(props.some(x=>x.name===n)) return n; } return k[0]||null; });
    ok('見本の内訳を持つ物件がある', !!NAME, NAME);
    await ctx.close();
  }

  const run=async(nm,data,expect)=>{
    const ctx=await b.newContext({viewport:{width:1500,height:950}});
    const p=await ctx.newPage(); p.on('dialog',d=>d.dismiss().catch(()=>{}));
    const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,55)));
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
    await p.evaluate(d=>{ if(d===null) localStorage.removeItem('nn_kirokucho_faces_v1');
      else localStorage.setItem('nn_kirokucho_faces_v1',JSON.stringify(d)); },data);
    await p.reload({waitUntil:'load'}); await p.waitForTimeout(2000);
    const r=await p.evaluate(n=>{
      const q=props.find(x=>x.name===n); const o={};
      try{ o.list=(showView('list'),'出た'); }catch(e){ o.list='ERR:'+e.message.slice(0,40); }
      try{ o.qty=window.nnQtyCell(q).replace(/<[^>]*>/g,'').slice(0,40); }catch(e){ o.qty='ERR:'+e.message.slice(0,40); }
      try{ o.row=window.nnFaceRow(q).length; }catch(e){ o.row='ERR:'+e.message.slice(0,40); }
      try{ openModal(q.id); o.form='開けた'; }catch(e){ o.form='ERR:'+e.message.slice(0,40); }
      try{ o.n=(window.nnFaceList(n)||[]).length; }catch(e){ o.n='ERR'; }
      return o; }, NAME).catch(e=>({err:String(e).slice(0,60)}));
    const noErr = r && r.list==='出た' && !/ERR/.test(String(r.qty)) && !/ERR/.test(String(r.row))
                  && r.form==='開けた' && errs.length===0;
    ok(nm, noErr && (expect===undefined || r.n===expect), {結果:r, err:errs[0]||''});
    await ctx.close();
  };

  /* ① ふつうの動き（変えていないこと） */
  await run('保存なし：見本の内訳がそのまま使える', null, undefined);
  await run('正しい保存：その内訳が使える', {[NAME]:[{n:'A',ko:'X-1',sp:'X-1',q:10},{n:'B',ko:'X-1',sp:'X-1',q:20}]}, 2);
  await run('わざと空にした：見本に戻らない', {[NAME]:[]}, 0);
  /* ② 壊れた形（止まらないこと） */
  for(const [nm,v] of JUNK) await run('壊れた保存 '+nm, {[NAME]:v}, undefined);
  await run('丸ごと配列', [1,2,3], undefined);
  await run('丸ごと文字', 'こわれ', undefined);

  console.log(R.join('\n'));
  const ng=R.filter(x=>x.startsWith('★')).length;
  console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
  if(BEFORE){ try{ execSync('mv _faces_now.js faces_sample.js'); }catch(_){} }
  await b.close(); process.exit(ng?1:0);
})();
