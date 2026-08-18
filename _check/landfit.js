/* iPhoneよこ向き再現（env→59px置換コピー）で、一覧の幅とカードの高さを測る */
const fs=require('fs');
const src='/home/user/osamarinavi_bousui/kirokucho_demo.html';
let h=fs.readFileSync(src,'utf8');
h=h.replaceAll('env(safe-area-inset-left,0px)','59px').replaceAll('env(safe-area-inset-right,0px)','59px')
   .replaceAll('env(safe-area-inset-left)','59px').replaceAll('env(safe-area-inset-right)','59px');
const tmp='/home/user/osamarinavi_bousui/_land_test.html';
fs.writeFileSync(tmp,h);
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:852,height:393}, deviceScaleFactor:3, isMobile:true, hasTouch:true});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
await p.goto('file://'+tmp); await p.waitForTimeout(2200);
await p.evaluate(()=>showView('list')); await p.waitForTimeout(1400);
const r=await p.evaluate(()=>{
  const sc=innerWidth/980;    /* 表示倍率（layout px → pt） */
  const c=document.querySelector('#list .pcard');
  const cb=c.getBoundingClientRect();
  const ph=c.querySelector('.pph').getBoundingClientRect();
  const lc=document.getElementById('nnLC').getBoundingClientRect();
  const chips=document.getElementById('chips').getBoundingClientRect();
  const tb=document.getElementById('toolbar').getBoundingClientRect();
  const sr=document.querySelector('.search').getBoundingClientRect();
  return {sc:sc.toFixed(3),
    cardLeftPt:Math.round(cb.left*sc*100)/100? Math.round(cb.left*sc):Math.round(cb.left*sc),
    cardRightGapPt:Math.round((980-cb.right)*sc),
    cardHpt:Math.round(cb.height*sc),
    phWpt:Math.round(ph.width*sc), phHpt:Math.round(ph.height*sc),
    searchLeftPt:Math.round(sr.left*sc),
    lcOverChips: lc.left < chips.right-2 ? 'かさなり(スクロール箱)' : 'なし',
    lcRightPt: Math.round((980-lc.right)*sc),
    tbHpt:Math.round(tb.height*sc),
    overflowX: document.documentElement.scrollWidth-document.documentElement.clientWidth};
});
console.log(JSON.stringify(r,null,1));
ok(r.cardLeftPt<=40,'カードの左端が32pt以内（レイアウトpx。実寸は0.87倍＝約30pt。前は約80px）', r.cardLeftPt+'pt');
ok(r.cardRightGapPt<=40,'カードの右の余白も40px以内', r.cardRightGapPt+'pt');
ok(r.phWpt>=52,'写真の横幅が広がった（52pt以上）', r.phWpt+'pt');
ok(r.overflowX<=0,'横はみ出しなし', r.overflowX);
console.log('カードの高さ', r.cardHpt+'pt', '／写真', r.phWpt+'x'+r.phHpt+'pt', '／検索欄の左端', r.searchLeftPt+'pt', '／ツールバー高さ', r.tbHpt+'pt');
ok(errs.length===0,'JSエラーなし', errs.join(' | ').slice(0,200));
await p.screenshot({path:'landfit.png'});
await b.close(); fs.unlinkSync(tmp);
console.log(ng?'★NG '+ng+'件':'すべて○');})();
