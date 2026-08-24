/* 元請に出す書類（9種）の中に、あり得ない値（NaN・undefined・[object Object]など）が
   紛れ込んでいないか。紙に出てしまうと信用に関わるので、必ず見る。
   使い方: node _check/docnan.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0;
const BAD=[[/NaN/g,'NaN'],[/undefined/g,'undefined'],[/Infinity/g,'Infinity'],
           [/\[object Object\]/g,'[object Object]'],[/null/g,'null'],[/¥-|￥-/g,'マイナスの金額']];
function judge(name, html){
  if(typeof html==='string' && html.startsWith('★')){ NG++; console.log('★NG '+name.padEnd(14)+html); return; }
  if(!html || html.length<500){ NG++; console.log('★NG '+name.padEnd(14)+'中身がほとんど無い（'+(html?html.length:0)+'文字）'); return; }
  /* 文字として見えるところだけを見る（プログラムの中の語は数えない） */
  const txt=String(html).replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<style[\s\S]*?<\/style>/g,' ')
                        .replace(/<[^>]+>/g,' ');
  const hit=[];
  BAD.forEach(([re,nm])=>{ const m=txt.match(re); if(m)hit.push(nm+'×'+m.length); });
  if(hit.length)NG++;
  console.log((hit.length?'★NG ':'○   ')+name.padEnd(14)+(hit.length?hit.join(' / '):'あり得ない値なし')+'  ('+html.length+'文字)');
}
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1500,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());

/* ── 図面・積算の6種 ── */
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1800);
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}; document.getElementById('tl_sample').click();});
await p.waitForTimeout(1200);
const r1=await p.evaluate(()=>{
  const out={};
  const grab=(name,fn)=>{
    let html=''; const _o=window.open;
    window.open=function(){ return {document:{open(){},write(h){html+=h;},close(){}},focus(){},print(){},addEventListener(){},location:{}}; };
    try{ fn(); }catch(e){ html='★'+e.message.slice(0,50); }
    window.open=_o; out[name]=html;
  };
  grab('平面図',        ()=>nnPlanPDF());
  grab('断面詳細図',    ()=>nnSectionPDF());
  grab('割付図',        ()=>nnWariPDF());
  grab('施工層構成図',  ()=>window.nnIsoPDF&&nnIsoPDF());
  grab('標準納まり詳細図',()=>window.nnDetailPDF&&nnDetailPDF({type:'tanmatsu'}));
  grab('御見積書',      ()=>window.nnMitsuPDF&&nnMitsuPDF({to:'元請テスト',title:'防水改修',place:'札幌市',
                          keihiRate:10, nebiki:0, days:30}));
  return out;
});
Object.entries(r1).forEach(([k,v])=>judge(k,v));

/* ── 現場記録帳の2種 ── */
await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2000);
const r2=await p.evaluate(()=>{
  const out={};
  const grab=(name,fn)=>{
    let html=''; const _o=window.open;
    window.open=function(){ return {document:{open(){},write(h){html+=h;},close(){}},focus(){},print(){},addEventListener(){},location:{}}; };
    try{ fn(); }catch(e){ html='★'+e.message.slice(0,50); }
    window.open=_o; out[name]=html;
  };
  const kou=props.find(x=>x.stRaw==='kou')||props[0];
  grab('工程表',   ()=>window.nnKoteiPDF&&nnKoteiPDF(kou.id));
  grab('物件報告書',()=>window.exportPDF&&exportPDF(kou.id));
  return out;
});
Object.entries(r2).forEach(([k,v])=>judge(k,v));

/* ── 発注書 ── */
await p.goto('http://localhost:8899/hacchu.html',{waitUntil:'load'}); await p.waitForTimeout(1800);
/* ★発注書は「現場を選ぶ→明細に数量を入れる→確認画面」まで進めないと作れない */
await p.evaluate(()=>{ const g=GENBA.find(x=>x.st==='施工中'); startDraft(g.id); });
await p.waitForTimeout(600);
await p.evaluate(()=>{ draft.lines.forEach((l,i)=>{ if(i<3)l.q=5; }); draft.step=3; render(); });
await p.waitForTimeout(600);
const r3=await p.evaluate(()=>{
  let html=''; const _o=window.open;
  window.open=function(){ return {document:{open(){},write(h){html+=h;},close(){}},focus(){},print(){},addEventListener(){},location:{}}; };
  try{ nnHacchuPDF(draft, draft._no); }catch(e){ html='★'+e.message.slice(0,50); }
  window.open=_o; return html;
});
judge('発注書', r3);
await b.close();
console.log('★NG'+NG);
})();
