/* 書類を開いた別タブに「戻る」と「印刷」があるか（全9種）
   ★ホーム画面から起動したアプリ（PWA）にはブラウザの戻るが無い。
     戻るボタンが無い書類を開くと、二度と元の画面に帰れない（§43-2）。
   使い方: node _check/docback2.js   （先に python3 -m http.server 8899 を立てる） */
/* 書類を開いた別タブに「戻る」があるか（ホーム画面から起動したアプリにはブラウザの戻るが無い） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();
p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1800);
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}; document.getElementById('tl_sample').click();});
await p.waitForTimeout(900);
const r=await p.evaluate(()=>{
  const out={};
  const grab=(name,fn)=>{
    let html=''; const _o=window.open;
    window.open=function(){ return {document:{write(h){html+=h;},close(){}},focus(){},print(){},addEventListener(){},location:{}}; };
    let err=null; try{ fn(); }catch(e){ err=e.message.slice(0,40); }
    window.open=_o;
    out[name]= err ? ('★'+err)
      : { 戻る:/戻る/.test(html), 印刷:/印刷|PDFに保存/.test(html), 長さ:html.length };
  };
  grab('平面図',      ()=>nnPlanPDF());
  grab('断面詳細図',  ()=>nnSectionPDF());
  grab('割付図',      ()=>nnWariPDF());
  grab('施工層構成図',()=>window.nnIsoPDF&&nnIsoPDF());
  grab('標準納まり詳細図',()=>window.nnDetailPDF&&nnDetailPDF({type:'tanmatsu'}));
  grab('御見積書',    ()=>window.nnMitsuPDF&&nnMitsuPDF({to:'元請テスト',title:'防水改修',place:'—',
                        keihiRate:10, nebiki:0, yukoDays:30}));
  return out;
});
Object.entries(r).forEach(([k,v])=>{
  if(typeof v==='string'){ ng++; console.log('★NG '+k.padEnd(12)+v); return; }
  if(!(v.戻る&&v.印刷))ng++;
  console.log(((v.戻る&&v.印刷)?'○   ':'★NG ')+k.padEnd(12)+'戻る:'+(v.戻る?'あり':'なし')+' 印刷:'+(v.印刷?'あり':'なし')+' ('+v.長さ+'文字)');
});
/* 現場記録帳の書類 */
await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2200);
const k=await p.evaluate(()=>{
  const out={};
  const grab=(name,fn)=>{ let html=''; const _o=window.open;
    window.open=function(){ return {document:{write(h){html+=h;},close(){}},focus(){},print(){},addEventListener(){},location:{}}; };
    let err=null; try{ fn(); }catch(e){ err=e.message.slice(0,40); }
    window.open=_o;
    out[name]= err?('★'+err):{戻る:/戻る/.test(html), 印刷:/印刷|PDFに保存/.test(html), 長さ:html.length}; };
  grab('工程表',   ()=>window.nnKoteiPDF&&nnKoteiPDF(props[0].id));
  grab('物件報告書',()=>window.exportPDF&&exportPDF(props[0].id));
  return out;
});
Object.entries(k).forEach(([kk,v])=>{
  if(typeof v==='string'){ ng++; console.log('★NG '+kk.padEnd(12)+v); return; }
  if(!(v.戻る&&v.印刷))ng++;
  console.log(((v.戻る&&v.印刷)?'○   ':'★NG ')+kk.padEnd(12)+'戻る:'+(v.戻る?'あり':'なし')+' 印刷:'+(v.印刷?'あり':'なし')+' ('+v.長さ+'文字)');
});
/* 発注書 */
await p.goto('http://localhost:8899/hacchu.html',{waitUntil:'load'}); await p.waitForTimeout(2000);
const h=await p.evaluate(()=>{
  let html=''; const _o=window.open;
  /* 発注書は document.open() も使うので、そちらも用意する */
  window.open=function(){ return {document:{open(){},write(x){html+=x;},close(){}},focus(){},print(){},addEventListener(){},location:{}}; };
  let err=null;
  /* ★発注書は「現場を選ぶ→数量を入れる→確認」まで進めないと作れない（hacchu2.js と同じ手順） */
  try{
    const r=document.querySelector('.glist .grow.st-kou')||document.querySelector('.glist .grow');
    if(r)r.click();
    if(typeof draft!=='undefined' && draft && draft.lines && draft.lines.length){
      draft.lines[0].q=5; if(draft.lines[1])draft.lines[1].q=2; draft.step=3; render();
      if(window.nnHacchuPDF) nnHacchuPDF(draft, draft._no); else err='nnHacchuPDF が無い';
    } else err='現場を選んでも明細が作られない';
  }
  catch(e){ err=e.message.slice(0,40); }
  window.open=_o;
  return err?('★'+err):{戻る:/戻る/.test(html), 印刷:/印刷|PDFに保存/.test(html), 長さ:html.length};
});
if(typeof h==='string'){ ng++; console.log('★NG 発注書      '+h); }
else { const good=h.戻る&&h.印刷; if(!good)ng++;
  console.log((good?'○   ':'★NG ')+'発注書'.padEnd(12)+'戻る:'+(h.戻る?'あり':'なし')+' 印刷:'+(h.印刷?'あり':'なし')+' ('+h.長さ+'文字)'); }
console.log(ng?('\n★NG '+ng+'件'):'\n全部○（どの書類からも戻れる）');
await b.close(); process.exit(ng?1:0);
})();
