/* 写真がクリックで入るか（label の既定動作が殺されていないか）＋レイアウト2点 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
await p.evaluate(()=>showView('list')); await p.waitForTimeout(1300);

/* ★label のクリックで既定動作（選択窓を開く）が打ち消されていないか */
const dflt=await p.evaluate(()=>{
  const lb=document.querySelector('#list .pcard .pph label.phhint');
  const ev=new MouseEvent('click',{bubbles:true,cancelable:true});
  const notCancelled=lb.dispatchEvent(ev);   // false = preventDefault された
  return {notCancelled, defaultPrevented:ev.defaultPrevented};
});
ok(dflt.notCancelled && !dflt.defaultPrevented,
   '帯のクリックが打ち消されていない（＝選択窓が開く）', JSON.stringify(dflt));

/* 実際にファイルを渡して差し替わる */
const png='iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFElEQVR4nGP8z8Dwn4GBgYGJAQIABIsBhSlnEG4AAAAASUVORK5CYII=';
await p.setInputFiles('#list .pcard input.phinp', {name:'t.png', mimeType:'image/png', buffer:Buffer.from(png,'base64')});
await p.waitForTimeout(900);
ok(await p.evaluate(()=>/^data:/.test(document.querySelector('#list .pcard .pph img').getAttribute('src'))),
   '選んだ写真が入る');
/* 帯を実クリックしてもカードが選択状態にならない（＝枠が選ばれない） */
await p.click('#list .pcard .pph label.phhint'); await p.waitForTimeout(300);
ok(await p.evaluate(()=>document.querySelectorAll('#list .pcard.armed').length)===0,
   '帯を押してもカードが選択されない');

/* レイアウト：物件名の上の余白／メモの位置 */
const L=await p.evaluate(()=>{
  const Z=window.nnPZ||1;
  const c=document.querySelector('#list .pcard');
  const pbd=c.querySelector('.pbd').getBoundingClientRect();
  const ttl=c.querySelector('.ttl').getBoundingClientRect();
  const tag=c.querySelector('.rtag');
  const def=tag.querySelector('.nndefrow, .dtag, span');
  const memo=tag.querySelector('.pmemo');
  return {gap:Math.round((ttl.top-pbd.top)/Z),
    memoInTag:!!memo,
    memoAfterTags: memo&&def? memo.getBoundingClientRect().left>=def.getBoundingClientRect().left : null,
    sameRow: memo&&def? Math.abs(memo.getBoundingClientRect().top-def.getBoundingClientRect().top)<26 : null,
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
});
ok(L.gap<=8,'物件名の上の余白が詰まった', L.gap+'px');
ok(L.memoInTag && L.memoAfterTags && L.sameRow,'メモが不具合タグの右に来た', JSON.stringify(L));
ok(L.overflow<=0,'横はみ出しなし', L.overflow);

/* ツールバーのアイコン4枚（図面・積算） */
const p2=await b.newPage({viewport:{width:1500,height:900}});
await p2.goto('http://localhost:8899/zumen_sekisan.html'); await p2.waitForTimeout(2000);
const ic=await p2.evaluate(()=>{
  const want=[['tl_ang','btn_ang'],['tl_draw','btn_draw'],['tl_rect','btn_rect'],['tl_pan','btn_pan']];
  return want.map(([id,f])=>{
    const b=document.getElementById(id); const im=b&&b.querySelector('img.tbi');
    return {id, on:!!(b&&b.classList.contains('hasimg')), ok:!!(im&&im.naturalWidth>0),
      txt:!!(b&&b.querySelector('.tbtx'))};
  });
});
ok(ic.every(x=>x.on&&x.ok),'角度・描画・範囲選択・移動の4アイコンが出ている', JSON.stringify(ic.map(x=>x.id+':'+x.on)));
ok(ic.every(x=>x.txt),'パソコンでは文字も残る');
await p2.screenshot({path:'photo2_tb.png'});
ok(errs.length===0,'JSエラーなし', errs.join('|').slice(0,180));
await p.screenshot({path:'photo2_pc.png'});
await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');})();
