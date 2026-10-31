/* 発注「②数量入力」（2026-10-31r）：スマホで1品の行が低い・入力欄が大きすぎない。 node _check/hcedit.js [hacchu.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const path=require('path'), fs=require('fs');
const file=process.argv[2]||'hacchu.html', root=path.resolve(__dirname,'..');
let ng=0; const ok=(t,c,d)=>{ console.log((c?'○ ':'★NG ')+t+' '+JSON.stringify(d)); if(!c)ng++; };
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 await p.route('https://hcedit.test/**',async r=>{let f=decodeURIComponent(new URL(r.request().url()).pathname.slice(1)); if(f==='hacchu.html')f=file;
   const q=path.resolve(root,f); if(fs.existsSync(q)) r.fulfill({path:q}); else r.fulfill({status:404,body:''});});
 await p.goto('https://hcedit.test/hacchu.html'); await p.waitForTimeout(1200);
 await p.locator('#nnPick .nnPk').first().click(); await p.waitForTimeout(500);
 await p.locator('.gstart:not([disabled])').first().click(); await p.waitForSelector('.item-tbl');
 const q=await p.evaluate(()=>({rows:[...document.querySelectorAll('.item-tbl tr')].filter(r=>!r.querySelector('th')).map(r=>Math.round(r.getBoundingClientRect().height)),
   qty:Math.round(document.querySelector('.item-tbl .qty').getBoundingClientRect().height),
   nav:Math.round((document.getElementById('nav')||document.body).getBoundingClientRect().top),
   btn:Math.round(document.querySelector('.order-actions .btn-ok').getBoundingClientRect().bottom),
   on:getComputedStyle(document.querySelector('#content .steps>div.on')).backgroundImage, ht:getComputedStyle(document.querySelector('#content .panel>h4 .httl')).color,
   frow:[...document.querySelectorAll('#content .frow')].map(r=>Math.round(r.getBoundingClientRect().height)),
   cells:(()=>{const r=document.querySelector('.item-tbl tr:not(:has(th))'); const t=[...r.children].filter(c=>!c.classList.contains('nm')&&!c.classList.contains('del')).map(c=>Math.round(c.getBoundingClientRect().top)); return t;})()}));
 ok('1品の行は70px以下',q.rows.length>0&&q.rows.every(h=>h<=70),q.rows);   /* ★2026-10-31s 本人「もっともっと高さを狭く」100→70 */
 ok('単価・数量・単位・金額が横1列',new Set(q.cells).size===1,q.cells);
 ok('数量の入力欄は40px以下',q.qty<=40,q.qty);
 ok('発注先などの行は36px以下',q.frow.every(h=>h<=36),q.frow);
 ok('「発注書を確認する」が最初の画面に入る（下のナビにかからない）',q.btn<=q.nav,[q.btn,q.nav]);
 ok('いまの段（②数量入力）はだいだい',/255, 176, 74|240, 120, 0/.test(q.on),q.on);
 ok('見出しの字は記録帳と同じ濃いえんじ',q.ht==='rgb(80, 33, 38)',q.ht);
 await b.close(); console.log(ng?'★NG '+ng:'全部○');
})();
