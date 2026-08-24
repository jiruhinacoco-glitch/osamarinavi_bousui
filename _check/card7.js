/* ★2026-08-16z カードの組み直し（①名前は枠の半分まで＋文字縮小 ②〜④行の並び）＋ピンチ拡大 */
try{ require('./mkland')(); }catch(_){}   /* ★よこ向き用のコピー _land.html を必ず自分で用意する */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const M=process.argv[2]||'land';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const vp=M==='pc'?{viewport:{width:2000,height:1010}}
      :M==='ph'?{viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true}
               :{viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true};
  const p=await b.newPage(vp);
  if(M!=='pc')await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+(M==='pc'?'kirokucho_demo.html':'_land.html'));
  await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1500);
  const d=await p.evaluate(()=>{
    document.querySelectorAll('#list .pcard.nnoff').forEach(c=>c.classList.remove('nnoff'));
    document.body.offsetHeight;
    if(window.nnTtlFitAll)nnTtlFitAll();
    const Z=window.nnPZ||1, g=e=>{const b=e.getBoundingClientRect();return{l:b.left/Z,r:b.right/Z,t:b.top/Z,b:b.bottom/Z,w:b.width/Z,h:b.height/Z};};
    const out={cut:[],overHalf:[],twoLine:[],rows:null,dk:[],overX:0};
    const cs=[...document.querySelectorAll('#list .pcard')];
    cs.forEach(c=>{
      const t=c.querySelector('.rhead .ebox.ttl'), h=c.querySelector('.rhead');
      if(t.scrollWidth>t.clientWidth+1) out.cut.push(t.textContent.slice(0,14));
      if(g(t).w > g(h).w*0.5+2) out.overHalf.push(t.textContent.slice(0,14));
      const hs=getComputedStyle(h), pad=parseFloat(hs.paddingTop)+parseFloat(hs.paddingBottom);
      const mk=Math.max(...[...h.children].map(e=>g(e).h));
      if((g(h).h-pad)>mk+3) out.twoLine.push(t.textContent.slice(0,14));
    });
    const c0=cs[0];
    const lab=r=>[...c0.querySelectorAll('.'+r+' .ebox i, .'+r+' .pdate i, .'+r+' .qsum i')].map(e=>e.textContent);
    out.rows={r1:lab('r1'), r2:lab('r2'), r3:lab('r3')};
    out.mkInR1=!!c0.querySelector('.r1 .mkchip')||!cs.some(c=>c.querySelector('.mkchip'));
    out.progInCol=!!c0.querySelector('.rprog .pprog');
    out.progAfterExist=(()=>{const row=c0.querySelector('.rprog');
      return row && row.previousElementSibling && row.previousElementSibling.classList.contains('r3');})();
    out.profitInHead=!!c0.querySelector('.rhead .pprofit');
    /* 日付ラベルの日/予定（ステータス別に1件ずつ拾う） */
    ['kan','kou','keiyaku','mit'].forEach(st=>{
      const c=cs.find(x=>x.className.indexOf('st-'+st)>=0); if(!c)return;
      out.dk.push(st+'='+[...c.querySelectorAll('.r3 .pdate i')].map(e=>e.textContent).join('/'));
    });
    out.kbn=(c0.querySelector('.r3 [data-f="kbn"]')||{}).textContent||'';
    out.overX=document.getElementById('list').scrollWidth-document.getElementById('list').clientWidth;
    out.minFs=Math.min(...cs.map(c=>parseFloat(getComputedStyle(c.querySelector('.ebox.ttl')).fontSize)));
    return out;
  });
  ok('①名前が枠からあふれる物件は0（全100件）', d.cut.length===0, d.cut.slice(0,2).join('/'));
  ok('①名前の枠は情報枠の半分まで', d.overHalf.length===0, d.overHalf.slice(0,2).join('/'));
  ok('①2行になる物件は0', d.twoLine.length===0, d.twoLine.slice(0,2).join('/'));
  ok('①長い名前は文字が小さくなる（最小フォント）', d.minFs>=8, d.minFs+'px');
  ok('②2行目＝元請・数量・（メーカー）・仕様', /^元請,数量/.test(d.rows.r1.join(','))&&d.rows.r1.includes('仕様')&&!d.rows.r1.includes('改修仕様'), d.rows.r1.join(','));
  ok('③3行目＝請負金額・単価・材料代・工賃・他', d.rows.r2.join(',')==='請負金額,単価,材料代,工賃,他', d.rows.r2.join(','));
  ok('④4行目＝住所・契約・契約/着工/完成', /^住所,契約,契約/.test(d.rows.r3.join(',')), d.rows.r3.join(','));
  ok('④契約は材工/材のみ/工のみ', /材工|材のみ|工のみ/.test(d.kbn), d.kbn);
  ok('④日/予定がステータス連動', d.dk.join(' ')==='kan=契約日/着工日/完成日 kou=契約日/着工日/完成予定 keiyaku=契約日/着工予定/完成予定 mit=契約予定/着工予定/完成予定', d.dk.join(' '));
  ok('進行度は住所の行の下（その横に不具合タグ）', d.progInCol&&d.progAfterExist);
  ok('利益予定額は現場名の行の右', d.profitInHead);
  ok('横のはみ出しなし', d.overX<=1, d.overX+'px');
  ok('JSエラーなし', errs.length===0, errs.join(' / '));

  /* ⑤ピンチ拡大しても画面が壊れない（visualViewport を拡大中の値に差し替えて resize を流す） */
  if(M!=='pc'){
    /* ★拡大中は getBoundingClientRect の値が狂う。それを実物どおりに再現する：
       表示中の画面の rect.bottom を「ずっと上（100px）」に偽装し、
       ①拡大中（vv.width が狭い）→ 高さを測り直さない＝minHeight が付かない
       ②等倍に戻す → 同じ偽装でも minHeight が付く（＝この検査は本当にバグを見分けている）
       の両方を確かめる。検査対象の fill() 自身は使わない（§117sの教訓）。 */
    const z=await p.evaluate(async()=>{
      const v=[...['dashboard','mainview','schedview']].map(id=>document.getElementById(id))
        .find(e=>e&&e.offsetParent!==null);
      const real=v.getBoundingClientRect.bind(v);
      v.getBoundingClientRect=()=>({top:0,bottom:100,left:0,right:300,width:300,height:100});
      const vv=window.visualViewport;
      const fake=sc=>Object.defineProperty(window,'visualViewport',{configurable:true,value:{
        get width(){return innerWidth/sc;}, get height(){return innerHeight/sc;},
        scale:sc, addEventListener(){}, removeEventListener(){}}});
      /* ①拡大中 */
      fake(2.4); v.style.minHeight='';
      dispatchEvent(new Event('resize')); await new Promise(r=>setTimeout(r,350));
      const zoomed=v.style.minHeight||'';
      /* ②等倍（同じ偽装のまま）＝ minHeight が付くはず */
      fake(1.0);
      dispatchEvent(new Event('resize')); await new Promise(r=>setTimeout(r,350));
      const normal=v.style.minHeight||'';
      /* あと片付け */
      v.getBoundingClientRect=real;
      Object.defineProperty(window,'visualViewport',{configurable:true,value:vv});
      v.style.minHeight=''; dispatchEvent(new Event('resize'));
      return {zoomed, normal};
    });
    ok('⑤ピンチ拡大中は高さを測り直さない（minHeight が付かない）', z.zoomed==='', JSON.stringify(z));
    ok('⑤（検算）等倍なら同じ状況で minHeight が付く＝検査は効いている', z.normal!=='', z.normal);
  }
  console.log('['+M+']'); console.log(R.join('\n'));
  await b.close();
})();
