const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const M=process.argv[2]||'pc';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const vp=M==='pc'?{viewport:{width:2000,height:1010}}
      :{viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true};
  const p=await b.newPage(vp);
  if(M!=='pc')await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(700);
  /* ① タグの高さ：選択前後で同じ・全チップ同じ */
  const c1=await p.evaluate(()=>{
    const Z=window.nnPZ||1, hs=[...document.querySelectorAll('#toolbar .stchip')]
      .map(e=>Math.round(e.getBoundingClientRect().height/Z*10)/10);
    return {min:Math.min(...hs), max:Math.max(...hs)};
  });
  ok('①全タグの高さがそろっている', c1.max-c1.min<0.6, c1.min+'〜'+c1.max+'px');
  await p.evaluate(()=>{ listFil['kizon'].add('不明'); buildChips(); render(); });
  await p.waitForTimeout(800);
  const c2=await p.evaluate(()=>{
    const Z=window.nnPZ||1;
    const on=document.querySelector('#toolbar .stchip.on'), off=document.querySelector('#toolbar .stchip:not(.on)');
    const h=e=>Math.round(e.getBoundingClientRect().height/Z*10)/10;
    const lh=document.querySelector('.listhead'), tb=document.getElementById('toolbar');
    const card=document.querySelector('#list .pcard');
    return {on:h(on), off:h(off), lhH:h(lh),
      gapAbove:Math.round((lh.getBoundingClientRect().top-tb.getBoundingClientRect().bottom)/Z),
      gapBelow:Math.round((card.getBoundingClientRect().top-lh.getBoundingClientRect().bottom)/Z)};
  });
  ok('①選んでも高さが変わらない', Math.abs(c2.on-c2.off)<0.6, c2.on+' / '+c2.off+'px');
  /* ② 絞り込み中バーの余白 */
  ok('②絞り込み中バーの上下の余白が詰まっている（各8px以内）', c2.gapAbove<=8&&c2.gapBelow<=8,
     '上'+c2.gapAbove+'px 下'+c2.gapBelow+'px（バー'+c2.lhH+'px）');
  await p.evaluate(()=>{ listFil['kizon'].clear(); buildChips(); render(); });
  await p.waitForTimeout(700);
  /* ③④ 壊れた写真：番号が出ない・提出書類が隠れない */
  await p.evaluate(()=>{
    props[0].files.push({name:'施工前"（全景）.jpg', size:1, cat:'photo', url:'blob:https://x/dead', date:'x'});
    /* onerror を一時的に無効化して「消えずに残った」最悪の状態を作る（実機の症状の再現） */
    window._realShotBad=window.nnShotBad; window.nnShotBad=function(){};
    render();
  });
  await p.waitForTimeout(900);
  const d=await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard');
    const g=e=>{const r=e.getBoundingClientRect();return r;};
    const sh=c.querySelector('.rfiles .pshots'), dc=c.querySelector('.rfiles .pdocs');
    const iEls=[...c.querySelectorAll('.rfiles .psh i')];
    const strays=(sh.innerText||'').replace(/他/g,'').trim();
    /* 提出書類のボタンが1つでも写真マスの下に隠れていないか（elementFromPoint で見る） */
    let covered=0;
    [...c.querySelectorAll('.pdocs .doc')].forEach(el=>{
      const r=el.getBoundingClientRect();
      const hit=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
      if(!el.contains(hit)&&hit!==el) covered++;
    });
    const iInBox=iEls.every(e=>{const r=e.getBoundingClientRect(), pr=e.parentElement.getBoundingClientRect();
      return r.right<=pr.right+1 && r.bottom<=pr.bottom+1;});
    return {iCount:iEls.length, iVisible:iEls.filter(e=>e.offsetWidth>0).length, iInBox,
      strays, covered, over: sh.getBoundingClientRect().right > dc.getBoundingClientRect().left+0.5,
      sameRow: Math.abs(sh.getBoundingClientRect().top-dc.getBoundingClientRect().top)<20};
  });
  if(M==='pc'){
    /* PCは「写真N」の文字と番号が枠の中にあるのが正しい。枠の外に出ていないかで見る */
    ok('③PCの番号・文字は枠の中に収まっている', d.iInBox, d.iCount+'個');
  }else{
    ok('③スマホは番号(<i>)を最初から出力しない', d.iCount===0, d.iCount+'個');
    ok('③枠の外に文字が見えない', d.strays==='', JSON.stringify(d.strays));
  }
  ok('④提出書類のボタンが写真マスに隠れない（全ボタン押せる位置にある）', d.covered===0, d.covered+'個');
  ok('④写真の帯と提出書類が重ならない', !d.over);
  ok('④同じ行のまま', d.sameRow);
  await p.evaluate(()=>{ window.nnShotBad=window._realShotBad; props[0].files.pop(); render(); });
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('['+M+']'); console.log(R.join('\n'));
  await b.close();
})();
