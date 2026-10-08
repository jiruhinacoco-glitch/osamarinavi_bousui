/* ★2026-10-08e 現場記録帳：版名 NN_VER の定義（ページの後半）より前にダッシュボードの組み立てが走っても止まらないか（§609）
   遅い端末では読み込みの途中でブラウザが一息つき、先に予約された showView('dash')→renderDash() が
   NN_VER の定義より前に走ることがある（巡回で「NN_VER is not defined」が機械の混雑時だけ出た）。
   ここでは確実に再現するため、NN_VER を定義する <script> の直前に renderDash() を呼ぶ <script> を差し込んだコピーで開く。
   使い方: node _check/vearly.js [kirokucho_demo.html の代わりのファイル]（直す前の版では★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
const F=process.argv[2]||'kirokucho_demo.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)NG++;};
(async()=>{
  let h=fs.readFileSync(F,'utf8');
  const i=h.indexOf("const NN_VER='"); const s=h.lastIndexOf('<script',i);
  ok('NN_VER を定義する場所が見つかる', i>0&&s>0);
  h=h.slice(0,s)+"<script>try{ renderDash(); window.__early='ok'; }catch(e){ window.__early=String(e); }</script>\n"+h.slice(s);
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [n,vp] of [['PC',{viewport:{width:1440,height:900}}],['スマホ',{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}]]){
    const p=await b.newPage(vp); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.route('**/kirokucho_demo.html*',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:h}));
    await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2500);
    const early=await p.evaluate(()=>window.__early);
    ok(n+'：版名の定義より前にダッシュボードを組み立てても止まらない', early==='ok', early);
    const panels=await p.evaluate(()=>document.querySelectorAll('#dashboard .dpanel').length);
    ok(n+'：ダッシュボードの枠が出る', panels>=8, panels);
    ok(n+'：JSエラーなし', !errs.length, errs.slice(0,2));
    await p.close();
  }
  await b.close(); console.log(NG?'★NG '+NG+'件':'全部○');
})();
