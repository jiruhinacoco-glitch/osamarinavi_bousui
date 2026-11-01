/* 検査：現場一覧のカード（スマホモード）が1画面に5件見える（2026-11-01h・§968）
   本人「一画面で2.5現場しか見れないのはダメ。せめて5現場」→（11-01m）見本の大きさ・詳細ボタンなし・2回タップで詳細
   使い方：node _check/card5.js [kirokucho_demo.html]   ※要 http.server 8899／直す前の版では★NG
   ・iPhone 393×852 ＋ 上のノッチ47px・下のホームバー34px を引いた高さで、カードが5件まるごと見える
   ・閉じたカードの中で、文字・ボタンがカードの外や、となりの列へはみ出さない
   ・写真・元請・請負金額・利益予定額・進行度・詳細・▼開く が見えている */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
let ng=0; const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m); if(!c) ng++;};
(async()=>{const b=await chromium.launch();
const W=393,H=852-47;   /* 上帯がノッチの分だけ下がる＝一覧に使える高さは 852-47。下のホームバーの裏も一覧は続く（本人の画面写しで確認） */
const ctx=await b.newContext({viewport:{width:W,height:H},screen:{width:W,height:852},isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');}catch(e){}});
const p=await ctx.newPage(); p.on('pageerror',e=>console.log('  pageerror:',e.message.slice(0,120)));
await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(2500);
await p.evaluate(()=>showView('list'));
await p.waitForFunction(()=>document.querySelectorAll('#list .pcard .sp-more').length>=6,null,{timeout:8000}).catch(()=>{});
const r=await p.evaluate(()=>{
  const ch=document.documentElement.clientHeight, L=document.getElementById('list'), lt=L.getBoundingClientRect().top;
  const cs=[...L.querySelectorAll('.pcard')];
  const vis=cs.filter(c=>{const r=c.getBoundingClientRect(); return r.top>=lt-1&&r.bottom<=ch+1;}).length;
  const c=cs[0], cr=c.getBoundingClientRect(), q=s=>c.querySelector(s);
  const shown=s=>{const e=q(s); if(!e) return false; const r=e.getBoundingClientRect(); return r.width>4&&r.height>4&&r.bottom<=cr.bottom+1&&r.top>=cr.top-1;};
  const out=[...c.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect(); if(!r.width||!r.height) return false;
    if(e.closest('.pexist,.r3,.pshots,.pdocs,.rbot')) return false;
    return r.right>cr.right+1||r.left<cr.left-1||r.bottom>cr.bottom+1;}).map(e=>e.className).slice(0,5);
  /* 写真と文字の列が重ならない（写真の右端 ≤ 文字の左端） */
  const ph=q('.pph').getBoundingClientRect(), r1=q('.ebox[data-f="moto"]').getBoundingClientRect(), pf=q('.spsum').getBoundingClientRect(), go=q('.r3 .pdate:nth-child(4)').getBoundingClientRect();
  return {ch, lt:Math.round(lt), h:Math.round(cr.height), vis, out,
    items:['.pph','.ebox[data-f="moto"]','.spsum .horder','.spsum .spprof','.r3 .pdate:nth-child(4)','.r3 .pdate:nth-child(5)','.sp-more'].map(s=>[s,shown(s)]),
    noOverlap: ph.right<=r1.left+0.5 && ph.right<=pf.left+0.5 && r1.right<=q('.sp-more').getBoundingClientRect().left+0.5,
    sumFit: [...document.querySelectorAll('#list .pcard:not(.nnoff) > .spsum')].every(e=>e.scrollWidth<=e.clientWidth+1),
    motoFit: [...document.querySelectorAll('#list .pcard:not(.nnoff) .ebox[data-f="moto"]')].every(e=>e.scrollWidth<=e.clientWidth+1),
    goHidden: !q('.pgo')||q('.pgo').getBoundingClientRect().width===0,
    dateFit: [...c.querySelectorAll('.r3 .pdate')].filter(e=>e.getBoundingClientRect().width>0).every(e=>e.scrollWidth<=e.clientWidth+1)};
});
ok(r.vis>=5, '1画面（iPhone 393×852 のノッチを引いた高さ）にカードが5件以上まるごと見える  '+JSON.stringify({vis:r.vis,h:r.h,listTop:r.lt,ch:r.ch}));
ok(r.items.every(x=>x[1]), '閉じたカードに 写真・元請・請負金額・利益予定額・着工・完成・詳細へ が見える  '+JSON.stringify(r.items.filter(x=>!x[1])));
ok(!r.out.length, '閉じたカードの中身がカードの外へはみ出さない  '+JSON.stringify(r.out));
ok(r.noOverlap, '写真｜文字｜日付の列が重ならない');
ok(r.sumFit, '数量→請負金額→利益予定額の行が切れない');
ok(r.motoFit, '元請名が枠で切れない（長い名前は文字を小さくして入れる）  '+r.motoFit);
ok(r.goHidden, 'スマホは「詳細」ボタンを出さない（本人の指示）');
ok(r.dateFit, '着工・完成の日付が枠で切れない');
/* 2回タップで詳細へ（1回目は選ぶだけ・その場編集は開かない） */
const pid=await p.evaluate(()=>document.querySelectorAll('#list .pcard')[1].dataset.pid);
const bb=await (await p.$(`#list .pcard[data-pid="${pid}"] .spsum .horder`)).boundingBox();
const st=()=>p.evaluate(()=>{const d=document.getElementById('detail');return {sel:[...document.querySelectorAll('#list .pcard.sel')].map(c=>c.dataset.pid).join(),det:!!(d&&d.getBoundingClientRect().width>100)};});
await p.touchscreen.tap(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(400); const t1=await st();
await p.touchscreen.tap(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForFunction(()=>{const d=document.getElementById('detail');return d&&d.getBoundingClientRect().width>100;},null,{timeout:3000}).catch(()=>{}); const t2=await st();
ok(t1.sel===pid&&!t1.det, '1回目のタップは選ぶだけ（詳細へ行かない）  '+JSON.stringify(t1));
ok(!t2.det, '同じカードを2回タップしても現場詳細へは行かない（11-01u 本人：詳細へは「詳細へ」ボタンだけ）  '+JSON.stringify(t2));
const sb=await (await p.$(`#list .pcard[data-pid="${pid}"] .sp-more`)).boundingBox(); await p.touchscreen.tap(sb.x+sb.width/2,sb.y+sb.height/2);
await p.waitForFunction(()=>{const d=document.getElementById('detail');return d&&d.getBoundingClientRect().width>100;},null,{timeout:3000}).catch(()=>{});
ok((await st()).det, '「詳細へ」ボタンで現場詳細が開く');
console.log(ng?('★NG '+ng+'件'):'すべて○'); await b.close(); process.exit(0);})();
