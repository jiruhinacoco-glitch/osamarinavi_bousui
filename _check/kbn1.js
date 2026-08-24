const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1600,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);
  /* 進行度がカードの枠内にあるか */
  const pr=await p.evaluate(()=>{
    const Z=window.nnPZ||1, c=document.querySelector('#list .pcard');
    const g=e=>{const b=e.getBoundingClientRect();return{t:b.top/Z,b:b.bottom/Z,l:b.left/Z,r:b.right/Z};};
    /* ★2026-08-24y 進行度バーは §130（2026-08-17a）で写真の列（.pcol）から
   本文の中（.rprog）へ移った。古い場所を見ていて丸ごと落ちていた。 */
const bar=c.querySelector('.rprog .pprog')||c.querySelector('.pprog'), card=g(c);
    const gb=g(bar);
    return {inside: gb.b<=card.b+1 && gb.t>=card.t && gb.l>=card.l && gb.r<=card.r+1,
      barW:Math.round(gb.r-gb.l), pvText:bar.querySelector('.pv').textContent};
  });
  ok('進行度バーはカードの枠内・写真の列の幅', pr.inside, JSON.stringify(pr));
  /* 契約（材工）のその場編集 */
  await p.click('#list .pcard .r3 [data-f="kbn"]'); await p.waitForTimeout(300);
  ok('契約はタップでプルダウン', await p.evaluate(()=>!!document.querySelector('#list .pcard [data-f="kbn"] select')));
  const opts=await p.evaluate(()=>[...document.querySelectorAll('#list .pcard [data-f="kbn"] select option')].map(o=>o.value).join(','));
  ok('選択肢＝材工・材のみ・工のみ', opts==='材工,材のみ,工のみ', opts);
  await p.evaluate(()=>{const s=document.querySelector('#list .pcard [data-f="kbn"] select'); s.value='工のみ';
    s.dispatchEvent(new Event('change'));});
  await p.waitForTimeout(500);
  ok('選ぶと反映される', await p.evaluate(()=>/工のみ/.test(document.querySelector('#list .pcard [data-f="kbn"]').textContent)));
  /* 長い名前を入れると文字が縮む（枠からあふれない） */
  const fit=await p.evaluate(async()=>{
    const c=document.querySelector('#list .pcard');
    const p0=props.find(x=>x.id===+c.dataset.pid);
    p0.name='いあああアイコンアイコンアイコンアイコンアイコンアむむむむむむむむむむむイコンアイコンアイコン検証用の長い名前';
    render(); await new Promise(r=>setTimeout(r,600));
    if(window.nnTtlFitAll)nnTtlFitAll();
    const t=document.querySelector('#list .pcard .ebox.ttl');
    const h=document.querySelector('#list .pcard .rhead');
    return {fs:getComputedStyle(t).fontSize, cut:t.scrollWidth>t.clientWidth+1,
      half: t.getBoundingClientRect().width <= h.getBoundingClientRect().width*0.5+2,
      oneLine: t.getBoundingClientRect().height < parseFloat(getComputedStyle(t).lineHeight)*1.6};
  });
  ok('長い名前は文字が縮んで全部入る（あふれ無し・枠は半分まで・1行）',
     !fit.cut && fit.half && fit.oneLine, JSON.stringify(fit));
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log(R.join('\n'));
  await b.close();
})();
