/* ★§824 上の帯：絵の右端→題名の文字の距離が全ページ同じ・枠の左辺が絵の下に入る・右端のボタンが画面からはみ出さない（PC/スマホ・10ページ）
   使い方: node _check/hdricon.js（http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let ng=0; const res=[];
const pages=['kirokucho_demo','zumen_sekisan','genba_map_v36','hacchu','kokkosho','camera','library','shiyo_toroku','yougo','zairyo_toroku'];
(async()=>{const b=await chromium.launch();
for(const ph of [0,1]) for(const f of pages){
  const c=await b.newContext(ph?{viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:UA}:{viewport:{width:1400,height:860}});
  const p=await c.newPage(); if(ph) await p.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
  await p.goto('http://localhost:8899/'+f+'.html'); await p.waitForTimeout(1800);
  const m=await p.evaluate(()=>{ const h=document.querySelector('body > header'); const im=h.querySelector('.hicon img'), t=h.querySelector('h1 .nnTtl');
    if(!im||!t) return 'none';
    if(!im.getBoundingClientRect().width) return 'none';   /* 絵が消えている（直す前の国交省仕様のスマホ） */
    /* 絵の見えている右端（透明でない所）を画素で求める */
    const r=im.getBoundingClientRect(), tr=t.getBoundingClientRect();
    const cv=document.createElement('canvas'); const W=Math.round(r.width*2),H=Math.round(r.height*2); cv.width=W; cv.height=H; const x=cv.getContext('2d');
    // object-fit contain + right: 絵の描かれる範囲
    const nw=im.naturalWidth, nh=im.naturalHeight, sc=Math.min(W/nw,H/nh), dw=nw*sc, dh=nh*sc; x.drawImage(im,W-dw,(H-dh)/2,dw,dh);
    const d=x.getImageData(0,0,W,H).data; let right=0; for(let xx=W-1;xx>=0&&!right;xx--) for(let yy=0;yy<H;yy++) if(d[(yy*W+xx)*4+3]>40){ right=xx; break; }
    const visRight=r.left+right/2;
    /* 文字の始まり */
    const rg=document.createRange(); rg.selectNodeContents(t); const txL=rg.getBoundingClientRect().left;
    const hd=h.getBoundingClientRect(); const kids=[...h.children].filter(e=>e.offsetParent); const maxR=Math.max(...kids.map(e=>e.getBoundingClientRect().right));
    return {gap:Math.round(txL-visRight), edgeUnder:Math.round(tr.left-r.left)+'/'+Math.round(r.width), ic:[Math.round(r.width),Math.round(r.height)], hh:Math.round(hd.height), over:Math.round(maxR-document.documentElement.clientWidth)}; });
  console.log(ph?'SP':'PC', f.padEnd(15), JSON.stringify(m)); res.push([ph,f,m]);
  await c.close(); }
for(const ph of [0,1]){ const rs=res.filter(r=>r[0]===ph); const gaps=rs.map(r=>r[2].gap); const bad=rs.filter(r=>r[2]==='none'||Math.abs(r[2].gap-gaps[0])>1||r[2].over>0||r[2].gap<6||r[2].gap>14);
  const lbl=ph?'スマホ':'PC'; if(bad.length){ ng++; console.log('★NG '+lbl+' 絵→文字の距離がそろっていない／はみ出し', JSON.stringify(bad.map(r=>[r[1],r[2]]))); } else console.log('○ '+lbl+' 全ページ 絵→文字の距離 '+gaps[0]+'px・はみ出しなし'); }
console.log(ng?'★NG '+ng+'件':'全項目○');
await b.close();})();
