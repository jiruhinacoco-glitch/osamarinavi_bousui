/* 現場マップの「書き出し用3D図面ビューア」が、
   このサイトに同梱してある three.js で動くか（＝電波が弱くても開けるか）。
   ★2026-08-24ab まで、このビューアだけ外の置き場（cdnjs）から部品を読んでいたので、
     圏外では「3Dの部品を読み込めませんでした」で何も見られなかった。
   使い方： node _check/vwthree.js                                            */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
let NG=0;
const ok=(t,c,x)=>{ if(!c)NG++; console.log((c?'○   ':'★NG ')+t+(x!==undefined?'  '+JSON.stringify(x).slice(0,120):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
 args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1200,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{
  const la=43.06, lo=141.35, d=0.00005;
  try{ localStorage.setItem('osamari_roofs', JSON.stringify({'1':[[[la,lo],[la,lo+d*2],[la+d,lo+d*2],[la+d,lo]]]}));
       localStorage.setItem('osamari_gmaps_key','DUMMY'); }catch(_){}
});
await p.route('**maps.googleapis.com**', r=>r.fulfill({status:200,contentType:'application/javascript',
  body:'window.google={maps:{importLibrary:()=>Promise.resolve({})}};'}));
await p.goto('http://localhost:8899/genba_map_v36.html',{waitUntil:'load'});
await p.waitForTimeout(1500);
const html=await p.evaluate(()=>{
  let cap=null;
  const ov=window.openViewerOverlay, dl=window.download;
  window.openViewerOverlay=function(h){ cap=h; }; window.download=function(){};
  try{ rise.savedId='1'; lastFace=null; exportFace('html'); }catch(e){ return 'ERR:'+e.message; }
  window.openViewerOverlay=ov; window.download=dl;
  return cap;
});
ok('3D図面のHTMLを書き出せる', !!html && !String(html).startsWith('ERR'), html?String(html).slice(0,40):html);
if(!html || String(html).startsWith('ERR')){ await b.close(); console.log('★NG'+NG); return; }
ok('同梱の three.js を読む指定になっている', /vendor\/three\.min\.js/.test(html));

const FILE='/home/user/osamarinavi_bousui/_vwtest.html';
fs.writeFileSync(FILE, html);
const p2=await ctx.newPage();
const errs=[]; p2.on('pageerror',e=>errs.push(e.message.slice(0,90)));
const reqs=[]; p2.on('request',r=>{ if(/three\.min\.js/.test(r.url())) reqs.push(r.url()); });
/* 何をどれだけ描いたかを記録する。
   ★three.js の描画の命令は部品の中に直接ぶら下がっているので、そこに細工しても効かない。
     いちばん下の「絵を描け」の命令（drawElements / drawArrays）を数えるのが確実。 */
await p2.addInitScript(()=>{
  window.__drawn={calls:0};
  [window.WebGLRenderingContext, window.WebGL2RenderingContext].forEach(function(C){
    if(!C||!C.prototype)return;
    ['drawElements','drawArrays'].forEach(function(m){
      const f=C.prototype[m]; if(!f)return;
      C.prototype[m]=function(){ window.__drawn.calls++; return f.apply(this,arguments); };
    });
  });
});
await p2.goto('http://localhost:8899/_vwtest.html',{waitUntil:'load'});
await p2.waitForTimeout(2500);
/* ★見張りを付けたあとに1回描かせる（このビューアは「動いたときだけ描く」作り） */
try{ await p2.click('#bIso'); }catch(_){}
await p2.waitForTimeout(1200);
const r=await p2.evaluate(()=>({
  canvas:!!document.querySelector('canvas'),
  three:(typeof THREE!=='undefined')?(THREE.REVISION||'?'):'なし',
  err:(document.getElementById('err')||{style:{}}).style.display,
  drawn:window.__drawn||{calls:0,meshes:0}
}));
ok('同梱の three.js が読めた（外の置き場を見に行っていない）',
   reqs.length>0 && reqs.every(u=>u.indexOf('localhost:8899')>=0), reqs);
ok('three.js の版は同梱のもの', r.three==='159', r.three);
ok('「読み込めませんでした」の画面が出ていない', r.err!=='flex', r.err);
ok('絵を描く箱がある', r.canvas);
ok('実際に絵を描いている（描く命令が3回以上）', r.drawn.calls>=3, r.drawn);
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
try{ fs.unlinkSync(FILE); }catch(_){}
await b.close();
console.log('★NG'+NG);
})();
