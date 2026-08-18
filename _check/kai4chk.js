/* ★2026-08-14d ①項目名が消えない ②10枚の1枚目はメインと別 ③住所・改修仕様の項目名 ④着工日・完成日 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PH=process.argv[2]==='ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
    :{viewport:{width:1600,height:900}});
  if(PH) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);

  /* ① プルダウンにしても項目名が残る */
  for(const f of ['kizon','kind','kouzou','kouhou']){
    const before=await p.evaluate(ff=>{
      const box=document.querySelector('#list .pcard [data-f="'+ff+'"]');
      return box.querySelector('i')?box.querySelector('i').textContent:null;}, f);
    await p.click('#list .pcard [data-f="'+f+'"]'); await p.waitForTimeout(300);
    const r=await p.evaluate(ff=>{
      const live=document.querySelector('#list .pcard [data-f="'+ff+'"]');
      const lab=live.querySelector('i'), sel=live.querySelector('select');
      const out={after:lab?lab.textContent:null, sel:!!sel};
      if(sel)sel.blur();
      return out;}, f);
    ok('「'+before+'」の項目名がプルダウン中も残る', r.sel && r.after===before, JSON.stringify({before, ...r}));
    await p.waitForTimeout(400);
  }
  /* 入力欄でも残る */
  const before2=await p.evaluate(()=>document.querySelector('#list .pcard [data-f="moto"] i').textContent);
  await p.click('#list .pcard [data-f="moto"]'); await p.waitForTimeout(300);
  const inp=await p.evaluate(()=>{
    const live=document.querySelector('#list .pcard [data-f="moto"]');
    const o={after:live.querySelector('i')?live.querySelector('i').textContent:null, inp:!!live.querySelector('input')};
    const i=live.querySelector('input'); if(i)i.blur(); return o;});
  ok('入力欄でも項目名が残る', inp.inp && inp.after===before2, JSON.stringify({before:before2, ...inp}));
  await p.waitForTimeout(400);

  /* ② 10枚の1枚目はメインの写真と別 */
  const sh=await p.evaluate(async()=>{
    const P0=props[0];
    const cv=document.createElement('canvas'); cv.width=8; cv.height=6;
    const g=cv.getContext('2d'); g.fillStyle='#123456'; g.fillRect(0,0,8,6);
    const url=cv.toDataURL();
    P0.files.push({cat:'photo',url,name:'保管1',date:'2026/08/14',size:9});
    render(); await new Promise(z=>setTimeout(z,400));
    const card=document.querySelector('#list .pcard');
    const cover=card.querySelector('.pph img');
    const first=card.querySelector('.psh.has img');
    return {list:nnShotList(P0).length, coverSrc:(cover&&cover.src||'').slice(0,40),
      firstSrc:(first&&first.src||'').slice(0,40), same:!!(cover&&first&&cover.src===first.src)};
  });
  console.log('② 写真', JSON.stringify(sh));
  if(!PH){
    ok('10枚の1枚目がメインの写真と同じではない', sh.same===false, JSON.stringify(sh));
    ok('保管写真だけが並ぶ', sh.list===1, String(sh.list));
  }

  /* ③④ 項目名と日付 */
  const lab=await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard');
    const txt=s=>{const e=c.querySelector(s); return e?e.textContent.trim():null;};
    const dates=[...c.querySelectorAll('.pdate')].map(d=>({lb:d.querySelector('i')?d.querySelector('i').textContent:null,
      v:d.textContent.replace(d.querySelector('i')?d.querySelector('i').textContent:'','').trim()}));
    const pid=+c.dataset.pid, pr=props.find(x=>x.id===pid);
    /* 施工中（未完成）の物件も見る */
    const kou=props.find(x=>x.stRaw==='kou');
    const kc=[...document.querySelectorAll('#list .pcard')].find(x=>+x.dataset.pid===kou.id);
    const kd=kc?[...kc.querySelectorAll('.pdate')].map(d=>d.querySelector('i').textContent):null;
    return {addr:txt('[data-f="addr"] i'), kou:txt('[data-f="kouhou"] i'), m:txt('[data-f="m"] i'),
      dates, st:pr.stRaw, genba:pr.genba, kansei:pr.kansei, yotei:pr.yotei, kouLabels:kd, kouKansei:kou.kansei};
  });
  console.log('③④ 項目', JSON.stringify(lab));
  ok('住所に項目名がある', lab.addr==='住所', String(lab.addr));
  ok('工法に「仕様」の項目名がある', lab.kou==='仕様', String(lab.kou));
  ok('数量に項目名がある', lab.m==='数量', String(lab.m));
  ok('着工日がある', lab.dates.some(d=>d.lb==='着工日'), JSON.stringify(lab.dates));
  ok('完成済は「完成日」', lab.st!=='kan'||lab.dates.some(d=>d.lb==='完成日'), JSON.stringify(lab.dates));
  ok('未完成は「完成予定」', !lab.kouLabels||lab.kouLabels.includes('完成予定'), JSON.stringify(lab.kouLabels));
  ok('日付の値が入っている', lab.dates.every(d=>d.v&&d.v.length>=3), JSON.stringify(lab.dates));

  /* ★既存・区分・構造の値が枠の真ん中にあるか */
  const mid=await p.evaluate(()=>{
    const out=[];
    document.querySelectorAll('#list .pcard .pexist .ebox').forEach(box=>{
      const br=box.getBoundingClientRect();
      let tn=null; box.childNodes.forEach(n=>{ if(n.nodeType===3 && n.textContent.trim()) tn=n; });
      if(!tn)return;
      const r=document.createRange(); r.selectNodeContents(tn);
      const tr=r.getBoundingClientRect();
      out.push({lb:box.querySelector('i').textContent,
        gapTop:+(tr.top-br.top).toFixed(1), gapBottom:+(br.bottom-tr.bottom).toFixed(1),
        diff:+Math.abs((tr.top-br.top)-(br.bottom-tr.bottom)).toFixed(1)});
    });
    return out;
  });
  console.log('既存の欄の文字位置', JSON.stringify(mid.slice(0,3)));
  ok('既存・区分・構造の値が枠の真ん中', mid.length>0 && mid.every(m=>m.diff<=3), JSON.stringify(mid.slice(0,3)));

  const over=await p.evaluate(()=>{
    let n=0; document.querySelectorAll('#list .pcard').forEach(c=>{ if(c.scrollWidth>c.clientWidth+2)n++; });
    return {n, body:document.body.scrollWidth-document.body.clientWidth,
      card:Math.round(document.querySelector('#list .pcard').getBoundingClientRect().height/(window.nnPZ||1))};
  });
  ok('横はみ出し0', over.n===0 && over.body<=0, JSON.stringify(over));
  ok('カードの高さは 345px 以内', over.card<=345, over.card+'px');
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('\n'+(PH?'【スマホたて】':'【パソコン】')); console.log(R.join('\n'));
  await b.close();
})();
