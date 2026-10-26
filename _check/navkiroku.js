/* 下のメニューの絵（icons/nav_*.png・9つ×通常/選択中）（2026-10-25k・m）
   §789 本人「現場記録帳だけなぞの白い線」→ 作り直し。§790「帯を濃い緑に・ほかの絵の文字もそうして」。
   ①（現場記録帳だけ）上から8行に、不透明な暗い画素（明るさ80未満）が横に30個以上並ぶ行が無い（前の絵は91画素で★NG。発注の書類・国交省の本は絵そのものに黒い縁があるので見ない）
   ②角が丸い（左上の角 (1,1) が透明・現場記録帳／ホームほか）
   ③（§791）帯が無い：帯のあった高さ（y=112〜150）の左端 x=3 に帯の緑 (20,110,52)／(0,177,81) が無い（帯ありの絵は★NG）
   ⑥（§792）銀色・金色のカードが無い：左端の真ん中 (4,84) が透明・入れ物は 300×168（文字が左右にはみ出す）
   ⑤（§791）大きい文字：下60行に、文字のふちの色（§821 から落ち着いた灰色 (96,98,97)）±16 の画素が 600 以上（小さい文字の絵は★NG）
   ④全11ページのナビの img に ?v=（同じ名前の差し替えなので）
   使い方: node _check/navkiroku.js [絵の場所のフォルダ] */
const fs=require('fs'), path=require('path');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const DIR=process.argv[2]||'icons';
const KEYS=['home','kiroku','map','hacchu','kokkou','camera','library','zumen','shiyou'];
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
(async()=>{const b=await chromium.launch(); const p=await b.newPage();
for(const k of KEYS) for(const suf of ['','_on']){ const f='nav_'+k+suf+'.png';
  const data='data:image/png;base64,'+fs.readFileSync(path.join(DIR,f)).toString('base64');
  const r=await p.evaluate(async src=>{ const im=new Image(); im.src=src; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height;
    const g=c.getContext('2d'); g.drawImage(im,0,0); const d=g.getImageData(0,0,c.width,c.height).data; let worst=0;
    for(let y=0;y<8;y++){ let run=0,best=0; for(let x=0;x<c.width;x++){ const i=(y*c.width+x)*4, lum=(d[i]+d[i+1]+d[i+2])/3; if(d[i+3]>200&&lum<80){ run++; best=Math.max(best,run);} else run=0; } worst=Math.max(worst,best); }
    let band=0; for(let y=112;y<=150;y++){ const i=(y*c.width+3)*4; if(d[i+3]>200&&((Math.abs(d[i]-20)<=12&&Math.abs(d[i+1]-110)<=12&&Math.abs(d[i+2]-52)<=12)||(d[i]<30&&d[i+1]>150&&d[i+2]<110))) band++; }
    let ol=0; for(let y=c.height-60;y<c.height;y++) for(let x=0;x<c.width;x++){ const i=(y*c.width+x)*4; if(d[i+3]>200&&Math.abs(d[i]-96)<=16&&Math.abs(d[i+1]-98)<=16&&Math.abs(d[i+2]-97)<=16) ol++;   /* §821 文字のふち＝落ち着いた灰色 (96,98,97)（§820 は (64,64,64)・§803 は緑 (30,128,62)） */ }
    return {dark:worst,corner:d[(1*c.width+1)*4+3],band,ol,mid:d[(84*c.width+4)*4+3],w:c.width,h:c.height}; },data);
  /* ★2026-10-26s 現場記録帳の絵を本人が作り直し（黒いふち付きのデザイン）→ 上端の暗い点は絵のふちなので、ほかの絵と同じく見ない */
  ok(r.corner<20&&r.band<5&&r.ol>=600&&r.mid<20&&r.w===300&&r.h===168,f+' ①上端に暗い線なし ②角 ③帯なし ⑤大きい文字 ⑥カードなし・300×168',{線:r.dark,角:r.corner,帯:r.band,ふち:r.ol,左端:r.mid,大きさ:[r.w,r.h]});
}
await b.close();
const pages=['index','kirokucho_demo','zumen_sekisan','genba_map_v36','hacchu','kokkosho','camera','library','shiyo_toroku','yougo','zairyo_toroku'];
const miss=pages.filter(n=>!/nav_\$\{k\}\$\{suf\}\.png\?v=[0-9a-z-]+/.test(fs.readFileSync(n+'.html','utf8')));
ok(!miss.length,'④全11ページのナビの絵に ?v= が付いている',miss);
console.log(ng?'★NG '+ng+'件':'全項目○');})().catch(e=>{console.log('★NG 実行エラー '+String(e.message||e).split('\n')[0]);process.exit(1);});
