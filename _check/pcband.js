/* PC の現場詳細の帯（2026-11-14zx）。直す前の版（14zw）では★NG。
   ①項目名は「工事名」（工事名称ではない）・工事名と工事場所は別々の欄（上下にすき間）
   ②総数量｜請負金額、構造｜階数 のあいだに余白 ③構造・階数が帯の中に収まり、工事場所と同じ段 ④数字は 15px 以下
   ⑤選んでいるタブ・進捗のいまの段階は黄色 ⑥まだ届いていない段階は黒に近い ⑦見出しは「■請負ルート」・「ルート編集」を押すと直す窓が開く
   使い方: node _check/pcband.js [kirokucho_demo.html]   （http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html'; let NG=0;
const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d).slice(0,230):'')); if(!c)NG++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const W of [1900,1366]){
 const p=await b.newPage({viewport:{width:W,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1500);
 await p.evaluate(()=>{const x=props[0]; x.status='見積済'; goProperty(x.id);}); await p.waitForFunction(()=>!!document.querySelector('#detail.lay2 .dt1 > .dkv')&&!!document.querySelector('#detail .nnSr [data-sr=ed]'),null,{timeout:15000}).catch(()=>{});
 const m=await p.evaluate(()=>{const D=document.getElementById('detail'); const R=e=>{const r=e.getBoundingClientRect(); return {l:Math.round(r.left),r:Math.round(r.right),t:Math.round(r.top),b:Math.round(r.bottom)};};
   const mid=e=>{const g=getComputedStyle(e).backgroundImage.match(/rgb\((\d+), (\d+), (\d+)\)/g)||[]; return (g[Math.floor(g.length/2)]||'rgb(0, 0, 0)').match(/\d+/g).map(Number);};
   const nm=[...D.querySelectorAll('.dt1 > .nm > *')], kv=[...D.querySelectorAll('.dt1 > .dkv > *')], band=R(D.querySelector('.dtop'));
   const on=D.querySelector(':scope > .dmenu button.on'), rail=[...D.querySelectorAll('.dt1 > .rail.slim > span')];
   return {lab:nm[0].textContent.trim(), nm:nm.map(R), kv:kv.map(R), band, fs:parseFloat(getComputedStyle(kv[1]).fontSize), tab:mid(on), tabBf:(getComputedStyle(on,'::before').backgroundImage.match(/rgb\((\d+), (\d+), (\d+)\)/g)||[]).map(x=>x.match(/\d+/g).map(Number)),
     now:rail.filter(e=>e.classList.contains('now')).map(mid), todo:rail.filter(e=>!e.classList.contains('now')&&!e.classList.contains('past')).map(mid),
     srh:D.querySelector('.nnSr .srh > b').textContent.trim(), sum:getComputedStyle(D.querySelector('.nnSr .srh > .srsum')).display, btn:D.querySelector('.nnSr [data-sr=ed]').textContent.trim()};});
 const isY=c=>!!c&&c[0]>=235&&c[1]>=195&&c[2]<=110;
 ok(m.lab==='工事名'&&m.nm[2].t-m.nm[0].b>=3,'['+W+'] ①項目名は「工事名」・工事名と工事場所は別々の欄（上下にすき間）',{lab:m.lab,gap:m.nm[2].t-m.nm[0].b});
 ok(m.kv[2].l-m.kv[1].r>=8&&m.kv[6].l-m.kv[5].r>=8,'['+W+'] ②総数量｜請負金額、構造｜階数 のあいだに余白',[m.kv[2].l-m.kv[1].r,m.kv[6].l-m.kv[5].r]);
 ok(m.kv[4].b<=m.band.b&&m.kv[4].t>=m.band.t&&Math.abs(m.kv[4].t-m.nm[2].t)<=1&&Math.abs(m.kv[4].b-m.nm[2].b)<=1,'['+W+'] ③構造・階数が帯の中に収まり、工事場所と同じ段',{kozo:[m.kv[4].t,m.kv[4].b],basho:[m.nm[2].t,m.nm[2].b],band:[m.band.t,m.band.b]});
 ok(m.fs<=15,'['+W+'] ④総数量・請負金額の数字は 15px 以下',m.fs);
 const ty=m.tabBf.length?m.tabBf[Math.floor(m.tabBf.length/2)]:m.tab;
 ok(isY(ty)&&m.now.length===1&&isY(m.now[0]),'['+W+'] ⑤選んでいるタブ・進捗のいまの段階は黄色',{tab:ty,now:m.now[0]});
 ok(m.todo.length>=1&&m.todo.every(c=>c[0]<=70&&c[1]<=70&&c[2]<=70),'['+W+'] ⑥まだ届いていない段階は黒に近い',m.todo[0]);
 /* ★11-14zz 項目名も値も平行四辺形（左右とも斜め）・済んだ段階に ✓ を出さない・ラインは明るい緑で、上段と下段のすき間のまん中（上下の空きの差 1px 以内） */
 const z=await p.evaluate(()=>{const D=document.getElementById('detail'), d1=D.querySelector('.dt1'), zz=parseFloat(getComputedStyle(document.documentElement).zoom)||1; const cs=getComputedStyle(d1), bf=getComputedStyle(d1,'::before');
   const both=e=>{const c=getComputedStyle(e).clipPath; const m=c.match(/polygon\(([^)]*\)?[^)]*)\)/); const pts=c.replace(/^polygon\(|\)$/g,'').split(/,(?![^(]*\))/).map(s=>s.trim()); return pts.length===4&&!/^0(px)? /.test(pts[0])&&/calc|100%/.test(pts[2])&&!/^100% 100%$/.test(pts[2]);};
   const cells=[...D.querySelectorAll('.dt1 > .nm > *, .dt1 > .dkv > *')];
   const r=d1.getBoundingClientRect(), t=D.querySelector('.dt1 > .nm > b.t').getBoundingClientRect(), a=D.querySelector('.dt1 > .nm > b.a').getBoundingClientRect();
   const ly=parseFloat(cs.getPropertyValue('--ly')), lineC=(r.bottom/zz)-ly;   /* 線の中心（倍率をかける前の px） */
   return {slant:cells.filter(both).length,n:cells.length,chk:[...D.querySelectorAll('.dt1 > .rail.slim > span.past')].filter(e=>/✓/.test(getComputedStyle(e,'::before').content)).length,
     col:bf.backgroundColor,up:Math.round((lineC-t.bottom/zz)*10)/10,dn:Math.round((a.top/zz-lineC)*10)/10,rh:[...D.querySelectorAll('.dt1 > .rail.slim > span')].map(e=>Math.round(e.getBoundingClientRect().height/zz))};});
 ok(z.slant===z.n&&z.n===12,'['+W+'] ⑧項目名も値も平行四辺形（左右とも斜め＝仕切りが斜めの線）',{slant:z.slant,n:z.n});
 ok(z.chk===0&&Math.max(...z.rh)<=33,'['+W+'] ⑨進捗：済んだ段階に ✓ を出さない・札は小さく（高さ33px以下）',{chk:z.chk,rh:z.rh});
 ok(z.col==='rgb(157, 255, 196)'   /* 11-15s 本人「もう少し明るく」#5cf59b→#9dffc4 */&&Math.abs(z.up-z.dn)<=1&&z.up>=2,'['+W+'] ⑩ラインは明るい緑（#9dffc4）で、工事名と工事場所のすき間のまん中（上下の空きが同じ）',{col:z.col,up:z.up,dn:z.dn});
 await p.click('#detail .nnSr [data-sr=ed]');
 const opened=await p.waitForFunction(()=>!!document.getElementById('nnSrDet')&&document.querySelector('#detail .nnSr').classList.contains('editing'),null,{timeout:3000}).then(()=>true).catch(()=>false);
 ok(m.srh==='■請負ルート'&&m.sum==='none'&&/ルート編集/.test(m.btn)&&opened,'['+W+'] ⑦見出しは「■請負ルート」（まとめの文は出さない）・「ルート編集」を押すと直す窓が開く',{srh:m.srh,sum:m.sum,btn:m.btn,opened});
 ok(errs.length===0,'['+W+'] エラーが出ていない',errs.slice(0,2));
 await p.close(); }
await b.close();
console.log(NG?('★NG '+NG):'すべて○'); process.exit(NG?1:0);
})();
