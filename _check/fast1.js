/* ★2026-08-14a ①よこ向きスマホでダッシュボードが見切れない ②反応が速い
   使い方: node fast1.js        （パソコン 1600px）
           node fast1.js land   （よこ向きスマホ・ノッチ59pt を再現した _land.html） */
try{ require('./mkland')(); }catch(_){}   /* ★よこ向き用のコピー _land.html を必ず自分で用意する */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const LAND=process.argv[2]==='land';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));

(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext(LAND
    ?{viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true}
    :{viewport:{width:1600,height:900}});
  if(LAND) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const cdp=await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});   /* 実機に近づける */
  await p.goto('http://localhost:8899/'+(LAND?'_land.html':'kirokucho_demo.html'),{waitUntil:'load'});
  await p.waitForTimeout(2500);

  if(LAND){
    /* ① ノッチに隠れていないか（左右とも） */
    const g=await p.evaluate(()=>{
      const saf=59*parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nnsaf')||1);
      const bx=s=>{const e=document.querySelector(s); if(!e)return null; const r=e.getBoundingClientRect();
        return {l:+r.left.toFixed(1), r:+r.right.toFixed(1)};};
      const sb=document.querySelector('.stbar');
      return {saf:+saf.toFixed(1), vw:innerWidth,
        stbar:bx('.stbar'), kpi:bx('#dashboard .kgrp'), panel:bx('#dashboard .dpanel'),
        scroll:sb?{sw:sb.scrollWidth, cw:sb.clientWidth}:null,
        rows:sb?Math.round(sb.getBoundingClientRect().height/30):0};
    });
    console.log('よこ向き', JSON.stringify(g));
    /* ★2026-08-14j 逃げは4割に（丸ごとだと左右140pxが空白＝「無駄な余白」の指摘）。
       目安＝saf×0.42±α。広すぎ（旧・丸ごと）でも、0（丸角に食い込む）でもないこと。 */
    const lo=g.saf*0.3, hi=g.saf*0.75;
    ok('絞り込みの帯：余白は4割（広すぎず・0でもない）', g.stbar.l>=lo&&g.stbar.l<=hi, g.stbar.l+' ('+lo.toFixed(0)+'〜'+hi.toFixed(0)+')');
    ok('KPIカード：余白は4割', g.kpi.l>=lo&&g.kpi.l<=hi, String(g.kpi.l));
    ok('右端も同じだけ', (g.vw-g.stbar.r)>=lo&&(g.vw-g.stbar.r)<=hi, String(g.vw-g.stbar.r));
    ok('パネルも同じだけ', !g.panel||(g.panel.l>=lo&&g.panel.l<=hi), g.panel&&g.panel.l);
    ok('帯が横に見切れない', g.scroll.sw<=g.scroll.cw+1, JSON.stringify(g.scroll));
    /* ★2026-08-14h 期間の組を右端へ押しやる余白（288px）をやめ、チップのすぐ右に続ける。
       よこ向きでは全部が1段に収まる。 */
    const bar=await p.evaluate(()=>{
      const Z=window.nnPZ||1, sb=document.querySelector('.stbar');
      const tops=[...sb.children].map(c=>Math.round(c.getBoundingClientRect().top/Z));
      const rng=sb.querySelector('.rng'), rr=rng.getBoundingClientRect();
      const chips=[...sb.querySelectorAll('.dfil')];
      const last=chips[chips.length-1].getBoundingClientRect();
      return {h:Math.round(sb.getBoundingClientRect().height/Z), ml:getComputedStyle(rng).marginLeft,
        gap:Math.round((rr.left-last.right)/Z), rows:Math.max(...tops)-Math.min(...tops)};
    });
    console.log('絞り込みの帯', JSON.stringify(bar));
    ok('帯は1段（2段になっていない）', bar.rows<=8, JSON.stringify(bar));
    ok('帯の厚みが半分に（40px以内）', bar.h<=40, bar.h+'px');
    ok('チップと期間のあいだに大きな空白が無い', bar.gap<=20, bar.gap+'px');
    ok('右へ押しやる余白をやめた', bar.ml==='0px', bar.ml);
    const chips=await p.evaluate(()=>[...document.querySelectorAll('#dashboard .dfil button')].map(x=>x.textContent.trim()));
    console.log('チップ', JSON.stringify(chips));
    ok('チップ名から「別」を外した', chips.every(c=>!/別/.test(c)), JSON.stringify(chips));
    /* 工程表の画面も同じ */
    const sc=await p.evaluate(async()=>{ showView('sched'); await new Promise(r=>setTimeout(r,900));
      const e=document.querySelector('#schedview'); const cs=getComputedStyle(e);
      return {pl:cs.paddingLeft, pr:cs.paddingRight};});
    ok('工程表の画面にも同じ逃げ（4割）', parseFloat(sc.pl)>=20&&parseFloat(sc.pl)<=55, JSON.stringify(sc));
    await p.evaluate(()=>showView('dash')); await p.waitForTimeout(600);
  }

  /* ② 速さ */
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1400);
  const sp=await p.evaluate(()=>{
    const o={};
    let a=performance.now(); render(); o.render=Math.round(performance.now()-a);
    a=performance.now(); showView('dash'); o.dash=Math.round(performance.now()-a);
    a=performance.now(); showView('list'); o.list=Math.round(performance.now()-a);
    return o;
  });
  console.log('速さ', JSON.stringify(sp));
  ok('一覧の作り直しが 450ms 以内', sp.render<=450, sp.render+'ms');
  /* ★2026-08-16w 画面に近いカード（4件）は最初から組み立てるようにしたので、
     以前（全部後回し）より少し増えて 400ms前後。灰色の空白を出さないための代償。 */
  ok('画面の切替が 450ms 以内', sp.list<=450 && sp.dash<=450, JSON.stringify(sp));
  await p.waitForTimeout(900);
  /* 検索は打っている間は待たせない（0.12秒後にまとめて1回） */
  const q=await p.evaluate(async()=>{
    const i=document.getElementById('q');
    const a=performance.now();
    ['札','幌','市'].forEach(c=>{ i.value+=c; i.dispatchEvent(new Event('input',{bubbles:true})); });
    const typed=Math.round(performance.now()-a);
    await new Promise(r=>setTimeout(r,900));      /* ★一覧は2回に分けて組み立てるので長めに待つ */
    const n=document.querySelectorAll('#list .pcard').length;
    i.value=''; i.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(r=>setTimeout(r,900));
    return {typed, n, all:document.querySelectorAll('#list .pcard').length};
  });
  console.log('検索', JSON.stringify(q));
  ok('検索は3文字打っても待たされない（50ms以内）', q.typed<=50, q.typed+'ms');
  ok('打ち終わると絞り込まれる', q.n>0 && q.n<q.all, q.n+'件 / '+q.all+'件');

  /* 画面に映っていないカードは組み立てない指定が効いているか */
  const cv=await p.evaluate(()=>{
    /* ★2026-08-16w 後回しにするのは「画面から離れたカード（.nnoff）」だけになった。
       画面の近くのカードは必ず組み立てる（灰色の空白が見えないように）。 */
    const c=document.querySelector('#list .pcard.nnoff')||document.querySelector('#list .pcard');
    return {cv:getComputedStyle(c).contentVisibility, sz:getComputedStyle(c).containIntrinsicSize,
      offCnt:document.querySelectorAll('#list .pcard.nnoff').length,
      cards:document.querySelectorAll('#list .pcard').length,
      h:document.getElementById('list').scrollHeight};
  });
  console.log('content-visibility', JSON.stringify(cv));
  ok('画面から離れたカードは後回し（content-visibility:auto）', cv.cv==='auto', cv.cv);
  ok('後回しは「離れたカード」だけ（近くは必ず組み立てる）', cv.offCnt>0&&cv.offCnt<cv.cards, cv.offCnt+'件');
  ok('高さの目安を渡してある（スクロールバーが狂わない）', /px/.test(cv.sz||''), cv.sz);
  ok('カードは100件そろっている', cv.cards===100, String(cv.cards));
  ok('一覧の中身の高さが100件ぶん出ている（スクロールバーが正しい）', cv.h>100*180, cv.h+'px');

  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('\n'+(LAND?'【よこ向きスマホ】':'【パソコン 1600px】'));
  console.log(R.join('\n'));
  await b.close();
})();
