/* ＋で拡大／写真なしは＋を出さず入れる入口／ドラッグ＆ドロップ／写真は詳細に飛ばない */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
const PNG='iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFElEQVR4nGP8z8Dwn4GBgYGJAQIABIsBhSlnEG4AAAAASUVORK5CYII=';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [mode,vp] of [['pc',{width:1600,height:950}],['phone',{width:393,height:852}]]){
  console.log('\n===== '+mode+' =====');
  const ctx=await b.newContext({viewport:vp, deviceScaleFactor:mode==='pc'?1:2, isMobile:mode!=='pc', hasTouch:mode!=='pc'});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(mode!=='pc') await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
  await p.evaluate(()=>{ localStorage.removeItem('nn_kirokucho_photo_v1'); });
  await p.reload(); await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1300);

  /* ② 写真なし：＋が出ない・入れる入口になっている */
  const none=await p.evaluate(()=>{
    const ph=document.querySelector('#list .pcard .pph');
    return {isNone:ph.classList.contains('none'), zoom:!!ph.querySelector('.phzoom'),
      label:!!ph.querySelector('label.phfull'), cap:ph.querySelector('.phcap').textContent.trim(),
      inp:!!ph.querySelector('input.phinp')};
  });
  ok(none.isNone && !none.zoom,'写真が無いときは＋を出さない', JSON.stringify(none));
  ok(none.label && none.inp,'写真ぜんぶが「入れる」入口（label＋input）');
  ok(/入れる/.test(none.cap),'案内が「写真を入れる」', none.cap);

  /* ④ 写真をクリックしても物件が選択されない・詳細に飛ばない */
  await p.click('#list .pcard .pph label.phfull'); await p.waitForTimeout(350);
  const st1=await p.evaluate(()=>({armed:document.querySelectorAll('#list .pcard.armed').length,
    detail:!!document.querySelector('#detail .dhead h2')}));
  await p.click('#list .pcard .pph label.phfull'); await p.waitForTimeout(500);
  const st2=await p.evaluate(()=>({armed:document.querySelectorAll('#list .pcard.armed').length,
    detail:!!document.querySelector('#detail .dhead h2')}));
  ok(st1.armed===0 && st2.armed===0,'写真タップで物件が選択されない', JSON.stringify([st1.armed,st2.armed]));
  ok(!st1.detail && !st2.detail,'2回タップしても詳細に飛ばない');

  /* 写真を入れる */
  await p.setInputFiles('#list .pcard input.phinp', {name:'t.png', mimeType:'image/png', buffer:Buffer.from(PNG,'base64')});
  await p.waitForTimeout(900);
  const has=await p.evaluate(()=>{
    const ph=document.querySelector('#list .pcard .pph');
    return {hasCls:ph.classList.contains('has'), zoom:!!ph.querySelector('.phzoom'),
      cap:ph.querySelector('.phcap').textContent.trim(),
      src:/^data:/.test(ph.querySelector('img').getAttribute('src'))};
  });
  ok(has.hasCls && has.zoom,'写真を入れると＋が出る', JSON.stringify(has));
  ok(/変える/.test(has.cap),'案内が「写真を変える」に変わる', has.cap);
  ok(has.src,'入れた写真が表示される');

  /* ① ＋で1クリック拡大 */
  await p.click('#list .pcard .pph .phzoom'); await p.waitForTimeout(400);
  const big=await p.evaluate(()=>{
    const o=document.getElementById('nnPhotoBig');
    return o? {open:true, img:/^data:/.test(o.querySelector('img').getAttribute('src')),
      cap:o.querySelector('.cap').textContent.trim().slice(0,12)}:{open:false};
  });
  ok(big.open && big.img,'＋の1クリックで拡大表示', JSON.stringify(big));
  /* ＋を押しても選択窓は開かない＆物件は選択されない */
  const armedAfter=await p.evaluate(()=>document.querySelectorAll('#list .pcard.armed').length);
  ok(armedAfter===0,'＋を押しても物件が選択されない');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!document.getElementById('nnPhotoBig')),'Escで閉じる');

  /* ③ ドラッグ＆ドロップ */
  const drop=await p.evaluate(()=>new Promise(res=>{
    const ph=document.querySelectorAll('#list .pcard .pph')[1];
    const pid=+ph.dataset.pid;
    const before=!!(window.nnPhotoOf&&nnPhotoOf(props.find(x=>x.id===pid)));
    const bin=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFElEQVR4nGP8z8Dwn4GBgYGJAQIABIsBhSlnEG4AAAAASUVORK5CYII='),c=>c.charCodeAt(0));
    const f=new File([bin],'d.png',{type:'image/png'});
    const dt=new DataTransfer(); dt.items.add(f);
    ph.dispatchEvent(new DragEvent('dragover',{bubbles:true,dataTransfer:dt}));
    const hi=ph.classList.contains('drop');
    ph.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt}));
    setTimeout(()=>res({before, hi, after:!!(window.nnPhotoOf&&nnPhotoOf(props.find(x=>x.id===pid)))}),900);
  }));
  ok(drop.hi,'ドラッグ中に枠が光る');
  ok(!drop.before && drop.after,'ドラッグ＆ドロップで写真が入る', JSON.stringify(drop));

  const of=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ok(of<=0,'横はみ出しなし', of);
  ok(errs.length===0,'JSエラーなし', errs.join('|').slice(0,180));
  await p.screenshot({path:'photo4_'+mode+'.png'});
  await ctx.close();
}
await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');})();
