/* §1444 記録帳の提案書をパワポ（.pptx）で出す。出来上がったファイルの中身を開いて確かめる（途中ではなく出来上がり）。
   物件1に屋根を3つ入れる（数字は手計算。当の関数は使わない）
     ①本館屋上 平場320.5＋立上り48.2／②塔屋 平場120＋立上り22.4／③庇 平場18.6 → 総数量 529.7㎡
     写真：屋根1に3枚・屋根2に1枚・番号なし1枚 ／ 全体の絵 1枚 ／ 工法の絵 3枚（屋根ごと） → 入る絵は 1×4＋3＋3＋1 ＝ 11 か所
   直す前の版は★NG。使い方: node _check/teiankp.js [kirokucho_demo.html] [保存先フォルダ]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright'); const fs=require('fs');
const F=process.argv[2]||'kirokucho_demo.html', OUT=process.argv[3]||'';
(async()=>{const b=await chromium.launch();
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const ctx=await b.newContext({viewport:{width:1500,height:900},acceptDownloads:true}); const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForFunction(()=>typeof props!=='undefined'&&props.length>0&&typeof nnRoofsOf==='function',null,{timeout:20000});
const has=await p.evaluate(()=>typeof window.nnTeianKPptx==='function'&&typeof window.nnTeianKPptxBlob==='function');
ck(has,'パワポで出す入口がある（nnTeianKPptx）');
if(!has){ console.log('★NG 1件（この先は確かめられない）'); await b.close(); return; }
ck(await p.evaluate(()=>!window.PptxGenJS),'パワポを作る部品は、押すまで読まない（ふだんの読み込みを重くしない）');
await p.evaluate(()=>{ const c=document.createElement('canvas'); c.width=800; c.height=500; const g=c.getContext('2d'); g.fillStyle='#9fb39a'; g.fillRect(0,0,800,500); g.fillStyle='#d9d4c8'; g.fillRect(120,90,360,240); g.fillRect(500,60,160,140); g.fillRect(300,360,200,70);
  const u=c.toDataURL('image/jpeg',.8), x=props.find(q=>q.id===1), ko=x.kouhou;
  x.areas=[{n:'本館屋上',ko,ex:'露出アスファルト防水',px:.375,py:.42,items:[{k:'平場',q:320.5},{k:'立上り',q:48.2},{k:'ドレン',q:4}]},
           {n:'塔屋',ko,ex:'押えコンクリート',px:.725,py:.26,items:[{k:'平場',q:120},{k:'立上り',q:22.4}]},
           {n:'庇',ko,ex:'',px:.5,py:.79,items:[{k:'平場',q:18.6}]}];
  x.files=[1,1,1,2,0].map((rf,i)=>({cat:'photo',url:u,rf,memo:'写真'+(i+1)}));
  window.nnPhoto2Of=q=>q.id===1?u:null; });
/* 本物の押し方（保存まで）で1回 */
/* 保存の名前は、押されたリンクの download（この検査のブラウザは日本語の名前を 'download' と報告するため、リンクの方を読む） */
const HOOK=()=>{ const c=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ if(this.download) window.__dl=this.download; return c.call(this); }; };
await p.evaluate(HOOK);
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:60000}), p.evaluate(()=>{ nnTeianKPptx(1); })]);
const name=await p.evaluate(()=>window.__dl||''), tmp=await dl.path(), size=fs.statSync(tmp).size;
ck(/^提案書_.+\.pptx$/.test(name),'押すと .pptx が保存される（'+name+'・'+Math.round(size/1024)+'KB）');
if(OUT) fs.copyFileSync(tmp,OUT+'/teiank.pptx');
/* 中身を開いて確かめる（zip の中の XML を読む） */
const g=await p.evaluate(async()=>{ const o=await nnTeianKPptxBlob(1), z=await JSZip.loadAsync(o.blob), names=Object.keys(z.files);
  const sl=names.filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>parseInt(a.match(/\d+/)[0])-parseInt(b.match(/\d+/)[0])), X=[];
  for(const n of sl){ const t=await z.file(n).async('string'); X.push({bad:(t.match(/<\/a:r>\s*<a:pPr/g)||[]).length, par:(t.match(/<a:t>平場 <\/a:t>/g)||[]).length, tx:(t.match(/<a:t>[^<]*<\/a:t>/g)||[]).map(q=>q.replace(/<[^>]+>/g,'')).join('|'), pic:(t.match(/<p:pic>/g)||[]).length, tbl:(t.match(/<a:tbl>/g)||[]).length,
    ell:(t.match(/prst="ellipse"/g)||[]).map((_,i)=>i).length, off:[...t.matchAll(/<p:sp>(?:(?!<\/p:sp>)[\s\S])*?<a:off x="(\d+)" y="(\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>(?:(?!<\/p:sp>)[\s\S])*?prst="ellipse"/g)].map(m=>[+m[1]+ +m[3]/2,+m[2]+ +m[4]/2]),
    img:[...t.matchAll(/<p:pic>[\s\S]*?<a:off x="(\d+)" y="(\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/g)].map(m=>[+m[1],+m[2],+m[3],+m[4]]),
    box:[...t.matchAll(/<a:off x="(-?\d+)" y="(-?\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/g)].map(m=>[+m[1],+m[2],+m[3],+m[4]])}); }
  const pr=await z.file('ppt/presentation.xml').async('string'), sz=pr.match(/<p:sldSz cx="(\d+)" cy="(\d+)"/);
  return {n:sl.length, X, W:+sz[1], H:+sz[2], media:names.filter(n=>/^ppt\/media\//.test(n)).length, slides:o.slides}; });
const EMU=36000;   /* 1mm＝36000 */
ck(g.n===4&&g.slides===4,'屋根3つ → 表紙＋3枚＝4枚のスライド（'+g.n+'枚）');
ck(Math.abs(g.W/EMU-297)<0.5&&Math.abs(g.H/EMU-210)<0.5,'スライドは A4よこ（'+(g.W/EMU).toFixed(1)+'×'+(g.H/EMU).toFixed(1)+'mm）');
const t0=g.X[0].tx;
ck(['320.5','48.2','120','22.4','18.6'].every(v=>t0.includes(v))&&t0.includes('529.7')&&t0.includes('平場 320.5㎡'),'表紙に屋根ごとの数字と 総数量＝手計算 529.7㎡');
ck(['本館屋上','塔屋','庇','露出アス','押さえコン','AS-J1'].every(v=>t0.includes(v)),'表紙に屋根の名前・改修仕様・屋根ごとの既存防水');
ck(g.X.every(x=>x.bad===0&&x.par===0),'マスの中の字が割れていない（「平場」と数字が同じ行・中の並びがパワポの決まりどおり）（割れ '+g.X.map(x=>x.bad+x.par).join(',')+'）');
ck(g.X.every(x=>x.tbl>=2),'数量・仕様は「表」として入っている＝パワポで直せる（1枚の絵ではない）（表の数 '+g.X.map(x=>x.tbl).join(',')+'）');
/* 番号の丸：絵の上の割合どおりか（絵の左上と大きさから手で割り出す） */
const I0=g.X[0].img[0], near=(a,b)=>Math.abs(a-b)<0.01, rel=g.X[0].off.map(q=>[(q[0]-I0[0])/I0[2],(q[1]-I0[1])/I0[3]]);
ck(rel.length===3&&near(rel[0][0],.375)&&near(rel[0][1],.42)&&near(rel[1][0],.725)&&near(rel[1][1],.26)&&near(rel[2][0],.5)&&near(rel[2][1],.79),'表紙の絵の上に番号の丸が3つ、置いた位置どおり（'+rel.map(q=>q[0].toFixed(3)+','+q[1].toFixed(3)).join(' ')+'）');
ck(Math.abs(I0[2]/I0[3]-800/500)<0.01,'全体の絵は縦横の比がそのまま（つぶれない）（'+(I0[2]/I0[3]).toFixed(3)+'・元 1.600）');
ck([1,2,3].every(i=>g.X[i].off.length===1),'屋根ごとのスライドの絵には、その屋根の番号だけ（'+[1,2,3].map(i=>g.X[i].off.length).join(',')+'）');
/* 絵の数：表紙1（全体）／屋根1＝全体1＋工法1＋写真3＝5／屋根2＝1＋1＋1＝3／屋根3＝1＋1＋0＝2 */
ck(g.X.map(x=>x.pic).join(',')==='1,5,3,2','写真は番号を付けた屋根のスライドにだけ入る（絵の数 '+g.X.map(x=>x.pic).join(',')+'／手計算 1,5,3,2）');
ck(g.X[1].tx.includes('320.5')&&g.X[1].tx.includes('ドレン')&&g.X[1].tx.includes('プライマー')&&g.X[1].tx.includes('写真1'),'屋根のスライドに 数量・か所・仕様の工程・写真の説明 が出る');
const out=g.X.map(x=>x.box.filter(q=>q[0]<-1||q[1]<-1||q[0]+q[2]>g.W+1||q[1]+q[3]>g.H+1).length);
ck(out.every(n=>n===0),'どの部品もスライドの外に出ていない（外に出た数 '+out.join(',')+'）');
/* ── 絵も写真も無い物件でも出る ── */
{ const r=await p.evaluate(async()=>{ const o=await nnTeianKPptxBlob(2), z=await JSZip.loadAsync(o.blob); const t=await z.file('ppt/slides/slide1.xml').async('string'); return {n:o.slides, no:t.includes('全体の絵がありません'), kb:Math.round(o.blob.size/1024)}; });
  ck(r.n===2&&r.no,'絵も写真も無い物件でも出る（2枚・「全体の絵がありません」の枠）（'+r.kb+'KB）'); }
/* ── 入口のボタン ── */
{ const n=await p.evaluate(()=>{ selectedId=1; curTab='エクスポート'; renderDetail(); return document.querySelectorAll('[onclick^="nnTeianKPptx("]').length; }); ck(n>=1,'物件の詳細（書き出し）に「パワポで保存」のボタンがある（'+n+'個）');
  const [pop]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(()=>nnTeianK(1))]); await pop.waitForSelector('#nnPpBtn',{timeout:20000});
  await pop.evaluate(HOOK); const [d2]=await Promise.all([pop.waitForEvent('download',{timeout:60000}), pop.click('#nnPpBtn')]); const n2=await pop.evaluate(()=>window.__dl||''); ck(!!d2&&/\.pptx$/.test(n2),'提案書の画面の上の「📊 パワポで保存」でも保存される（'+n2+'）'); await pop.close(); }
console.log('errors',errs.slice(0,3)); if(errs.length) NG++;
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
