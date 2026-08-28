/* ★2026-08-28e 工程（ガント）の日付が、全100物件でおかしくならないか。
   巡回で見つけた2つの不具合を二度と起こさないための検査。
   ①「2026-09 着工予定」のような“文字の予定”を日付として読もうとして
     工程がぜんぶ NaN-NaN-NaN になっていた（100件中36件）。
     その物件は工程タブに棒が1本も出ず、工程表PDFに NaN が92個 刷られていた。
   ②工期が短い現場で「終わりが開始より前」の逆さまの棒ができていた（31件）。
   使い方: node _check/gantt2.js  ／  node _check/gantt2.js before */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BEFORE=process.argv[2]==='before';
const FILE=BEFORE? '_before_k.html' : 'kirokucho_demo.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  if(BEFORE){ const fs=require('fs'), {execSync}=require('child_process');
    fs.writeFileSync('/home/user/osamarinavi_bousui/_before_k.html',
      execSync('git show HEAD:kirokucho_demo.html')); }
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1600,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(2400);
  await p.evaluate(()=>{ window.open=()=>({document:{open(){},write(h){window.__last=(window.__last||'')+h;},
    close(){}},focus(){},print(){},closed:false,addEventListener(){}}); });

  const g=await p.evaluate(()=>{
    const nan=[], rev=[], err=[]; let n=0;
    props.forEach(pp=>{
      try{ ensureGantt(pp); ensureMotoGantt(pp); }catch(e){ err.push(pp.code+' '+e.message); return; }
      (pp.gantt||[]).concat(pp.motoGantt||[]).forEach(r=>{ n++;
        const a=new Date(r.start), z=new Date(r.end);
        if(isNaN(a)||isNaN(z)) nan.push(pp.code+' '+r.name);
        else if(z<a) rev.push(pp.code+' '+r.name+' '+r.start+'〜'+r.end);
      });
    });
    return {n, nan, rev, err};
  });
  ok('全物件の工程が作れる（落ちない）', g.err.length===0, g.err.slice(0,2).join(' / '));
  ok('日付が読めない工程が無い（'+g.n+'本）', g.nan.length===0, g.nan.length+'本 '+g.nan.slice(0,3).join(' / '));
  ok('終わりが開始より前の工程が無い', g.rev.length===0, g.rev.length+'本 '+g.rev.slice(0,3).join(' / '));

  /* 文字の予定（2026-09 着工予定）でも、その月の工程になっているか */
  const t=await p.evaluate(()=>{
    const pp=props.find(x=>/着工予定/.test(String(x.yotei)));
    if(!pp) return {skip:1};
    return {code:pp.code, yotei:pp.yotei, rows:(pp.gantt||[]).map(r=>r.start+'〜'+r.end)};
  });
  ok('「◯年◯月 着工予定」でもちゃんとした日付になる',
     t.skip || (t.rows||[]).every(x=>!/NaN/.test(x)), JSON.stringify(t).slice(0,110));

  /* 工程表PDFに NaN が出ない（状態のちがう4物件で） */
  const pdf=await p.evaluate(async()=>{
    const codes=['J057','J002','J064','J106']; let nan=0, len=0;
    for(const c of codes){ const pp=props.find(x=>x.code===c); if(!pp)continue;
      window.__last=null; try{ nnKoteiPDF(pp.id); }catch(e){ return {err:e.message}; }
      await new Promise(r=>setTimeout(r,500));
      const s=window.__last||''; len+=s.length; nan+=(s.match(/NaN/g)||[]).length; }
    return {nan, len};
  });
  ok('工程表PDFに NaN が出ない', pdf.nan===0, (pdf.nan||0)+'個 '+(pdf.err||''));
  ok('工程表PDFがちゃんと作られる', (pdf.len||0)>20000, (pdf.len||0)+'文字');

  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  console.log((BEFORE?'【直す前】':'【いま】')+'\n'+R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
