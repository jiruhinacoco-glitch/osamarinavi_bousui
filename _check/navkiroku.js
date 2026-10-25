/* 下のメニュー「現場記録帳」の絵（icons/nav_kiroku.png・_on.png）に、上端の黒・白の細い線が無いか（2026-10-25k・本人「なぞの白い線」）
   ①上から8行に、不透明な暗い画素（明るさ80未満）が横に30個以上並ぶ行が無い（手帳の輪郭の黒は数画素なので数えない）
   ②角が丸い（左上の角 (1,1) が透明）③全11ページの img に ?v=（同じ名前の差し替えなので） ④絵の大きさ 218×168
   使い方: node _check/navkiroku.js [絵の場所のフォルダ]（直す前の絵では①が★NG） */
const fs=require('fs'), path=require('path');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const DIR=process.argv[2]||'icons';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
(async()=>{const b=await chromium.launch(); const p=await b.newPage();
for(const f of ['nav_kiroku.png','nav_kiroku_on.png']){
  const data='data:image/png;base64,'+fs.readFileSync(path.join(DIR,f)).toString('base64');
  const r=await p.evaluate(async src=>{ const im=new Image(); im.src=src; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height;
    const g=c.getContext('2d'); g.drawImage(im,0,0); const d=g.getImageData(0,0,c.width,c.height).data; let worst=0;
    for(let y=0;y<8;y++){ let run=0,best=0; for(let x=0;x<c.width;x++){ const i=(y*c.width+x)*4, lum=(d[i]+d[i+1]+d[i+2])/3; if(d[i+3]>200&&lum<80){ run++; best=Math.max(best,run);} else run=0; } worst=Math.max(worst,best); }
    return {w:c.width,h:c.height,dark:worst,corner:d[(1*c.width+1)*4+3]}; },data);
  ok(r.dark<30,f+' ①上端に暗い横線が無い（最長の並び '+r.dark+'画素）');
  ok(r.corner<20,f+' ②角が丸い（左上の角が透明）',r.corner);
  ok(r.w===218&&r.h===168,f+' ④大きさ218×168',[r.w,r.h]);
}
await b.close();
const pages=['index','kirokucho_demo','zumen_sekisan','genba_map_v36','hacchu','kokkosho','camera','library','shiyo_toroku','yougo','zairyo_toroku'];
const miss=pages.filter(n=>{ const s=fs.readFileSync(n+'.html','utf8'); return !/k==='kiroku'\?'\?v=[0-9a-z-]+'/.test(s); });
ok(!miss.length,'③全11ページのメニューの絵に ?v= が付いている',miss);
console.log(ng?'★NG '+ng+'件':'全項目○');})().catch(e=>{console.log('★NG 実行エラー '+String(e.message||e).split('\n')[0]);process.exit(1);});
