/* ★2026-08-30g 見出しの平行四辺形を本人のフレーム画像に差し替えた（§256）
   ・形＝icons/httl_frame.png を3分割（border-image）で使う
     左右の斜めの端は伸びず、まん中だけが伸びる＝どんな長さでも端の傾きが崩れない
   ・文字＝同梱の Noto Sans JP Black（52KB）・色 #502126・白いフチ
   使い方: node _check/httlimg.js        … パソコン
           node _check/httlimg.js ph     … スマホ たて
           node _check/httlimg.js before … 直す前（git HEAD）と見くらべる
   前提： python3 -m http.server 8899 --directory <このフォルダ> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const A=process.argv.slice(2);
const M=A.includes('ph')?'ph':'pc';
const BEFORE=A.includes('before');
const VP={pc:{width:1600,height:900}, ph:{width:393,height:852}}[M];
/* .httl を使っている10ページ（ホームには見出しタグが無い） */
let PAGES=['kirokucho_demo.html','library.html','yougo.html','shiyo_toroku.html','zairyo_toroku.html',
  'kokkosho.html','hacchu.html','camera.html','genba_map_v36.html','zumen_sekisan.html'];
if(BEFORE){ const bf=require('./mkbefore')('kirokucho_demo.html'); if(bf) PAGES=[bf]; }
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext(M==='ph'?{viewport:VP,deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:VP});
if(M==='ph') await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});
                                          Object.defineProperty(screen,'height',{get:()=>852});});
console.log('== 見出しのフレーム（'+(M==='pc'?'パソコン':'スマホ たて')+(BEFORE?'／直す前':'')+'） ==');

/* ① フレームの画像と書体のファイルが在って読める */
{
  /* ★woff2 は goto するとダウンロード扱いで落ちるので、ページの中から取りに行く */
  const p=await ctx.newPage();
  await p.goto('http://localhost:8899/');
  const r=await p.evaluate(async()=>{
    const g=async u=>{ try{ const x=await fetch(u,{cache:'no-store'});
      return {s:x.status, n:(await x.arrayBuffer()).byteLength}; }catch(e){ return {s:0,n:0}; } };
    return {img:await g('./icons/httl_frame.png'), font:await g('./fonts/notosansjp-black.woff2')};
  });
  ok(r.img.s===200 && r.img.n>5000, '① フレームの画像がある  '+Math.round(r.img.n/1024)+'KB', r.img.s);
  ok(r.font.s===200 && r.font.n<120000,
     '① 書体が同梱されていて 120KB 未満（速度の決着を守る）  '+Math.round(r.font.n/1024)+'KB', r.font.s);
  await p.close();
}

/* ② 現場記録帳のダッシュボード：見た目の中身 */
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+PAGES[0],{waitUntil:'load'}); await p.waitForTimeout(2600);
const d=await p.evaluate(()=>{
  const h=document.querySelector('#dashboard .httl')||document.querySelector('.httl');
  if(!h) return null;
  const c=getComputedStyle(h), bc=getComputedStyle(h,'::before');
  const r=h.getBoundingClientRect(), Z=window.nnPZ||1;
  return {ff:c.fontFamily, fw:c.fontWeight, col:c.color, stroke:c.webkitTextStroke||c.WebkitTextStroke,
    strokeC:c.webkitTextStrokeColor, strokeW:c.webkitTextStrokeWidth, shadow:c.textShadow,
    src:bc.borderImageSource, slice:bc.borderImageSlice, rep:bc.borderImageRepeat,
    bl:parseFloat(bc.borderLeftWidth), br:parseFloat(bc.borderRightWidth),
    bt:parseFloat(bc.borderTopWidth), bfs:bc.fontSize, fs:c.fontSize,
    tf:bc.transform, bg:bc.backgroundImage, sh:bc.boxShadow,
    w:Math.round(r.width/Z), hh:Math.round(r.height/Z)};
});
ok(!!d && /httl_frame\.png/.test(d.src), '② 平行四辺形＝本人のフレーム画像', d&&(d.src||'').slice(0,58));
ok(d && /\?v=/.test(d.src), '② 画像のURLに版名が付く（差し替えても古い絵が残らない）', d&&(d.src||'').slice(-24));
ok(d && d.slice.replace(/\s+/g,' ')==='0 500 0 150 fill',
   '② 3分割＝左150／右500（濃い緑の三角は「伸びない側」に丸ごと入る）', d&&d.slice);
ok(d && d.rep==='stretch' && d.bt===0, '② まん中だけを伸ばす（上下は切らない）', d&&(d.rep+' / 上'+d.bt));
ok(d && d.tf==='none' && d.bg==='none' && d.sh==='none',
   '② CSSで描いていた skew・地・影はやめた', d&&(d.tf+'/'+d.bg+'/'+d.sh));
/* ★em は「その要素の font-size」が基準。現場記録帳には昔の「●」印の
   .httl::before{font-size:9px} が残っていて、inherit を書かないと端が半分になる。 */
ok(d && d.bfs===d.fs, '② 端の幅の基準＝見出しの文字の大きさ（font-size:inherit）', d&&(d.bfs+' / 文字'+d.fs));
ok(d && Math.abs(d.br/parseFloat(d.fs)-4.4)<0.15 && Math.abs(d.bl/parseFloat(d.fs)-1.35)<0.15,
   '② 端の幅＝右4.4em・左1.35em（画像の自然な縮尺とほぼ同じ）', d&&{右:d.br,左:d.bl});
ok(d && /NNHead/.test(d.ff), '② 書体は同梱の NNHead（Noto Sans JP Black）', d&&d.ff.slice(0,26));
ok(d && d.fw==='900', '② 太さは900', d&&d.fw);
ok(d && d.col==='rgb(80, 33, 38)', '② 文字の色＝#502126（本人の絵の実測）', d&&d.col);
ok(d && /rgb\(255, 255, 255\)/.test(d.strokeC) && parseFloat(d.strokeW)>=0.7,
   '② フチは白（本人の絵の実測）', d&&(d.strokeC+' '+d.strokeW));
ok(d && d.shadow==='none', '② 昔の白い下影は消した（フチと二重にならない）', d&&d.shadow);

/* ③ 実際に描かれた絵：枠の茶色・地の3色・濃い緑の三角が出ているか（画素で見る） */
const pix=await p.evaluate(async()=>{
  const h=document.querySelector('#dashboard .httl')||document.querySelector('.httl');
  const r=h.getBoundingClientRect();
  return {x:r.x, y:r.y, w:r.width, h:r.height};
});
if(pix){
  const shot=await p.screenshot({clip:{x:Math.max(0,pix.x),y:Math.max(0,pix.y),width:pix.w,height:pix.h}});
  const {execSync}=require('child_process'); const fs=require('fs');
  fs.writeFileSync('/tmp/_httlpix.png', shot);
  const out=execSync(`python3 - <<'PY'
from PIL import Image
import numpy as np
a=np.array(Image.open('/tmp/_httlpix.png').convert('RGB')).astype(int)
def near(c,t,tol=42): return abs(c[0]-t[0])<tol and abs(c[1]-t[1])<tol and abs(c[2]-t[2])<tol
brown=mint=dark=0
for y in range(a.shape[0]):
    for x in range(a.shape[1]):
        c=a[y,x]
        if near(c,(80,33,38),46): brown+=1
        elif near(c,(191,237,209),22): mint+=1
        elif near(c,(106,200,149),26): dark+=1
print(brown,mint,dark,a.shape[1],a.shape[0])
PY`).toString().trim().split(/\s+/).map(Number);
  const [brown,mint,dark,W,H]=out;
  ok(brown>W*0.8, '③ 濃い茶の枠が描かれている（上下の辺ぶん）  '+brown+'画素', {W,H});
  ok(mint>W*3,   '③ 明るいミントの地が描かれている  '+mint+'画素');
  ok(dark>60,    '③ 濃い緑の三角が右端に出ている  '+dark+'画素');
}

/* ④ 長さの違う見出しでも、端の傾きが変わらない（＝端が伸びていない） */
const slant=await p.evaluate(()=>{
  const hs=[...document.querySelectorAll('#dashboard .httl')];
  if(hs.length<2) return null;
  const s=hs.map(h=>{ const r=h.getBoundingClientRect();
    const bc=getComputedStyle(h,'::before');
    return {w:Math.round(r.width), cap:Math.round(parseFloat(bc.borderLeftWidth)+parseFloat(bc.borderRightWidth))}; });
  return {min:Math.min(...s.map(x=>x.w)), max:Math.max(...s.map(x=>x.w)),
          cap:s[0].cap, tight:s.filter(x=>x.cap>=x.w).length};
});
ok(slant && slant.tight===0,
   '④ どの見出しも端がつぶれない（端の合計 < 見出しの幅）', slant);
ok(slant && slant.max/slant.min>1.4,
   '④ 長さが1.4倍以上ちがう見出しで確かめている', slant&&Math.round(slant.max/slant.min*100)/100);
ok(errs.length===0, '④ JSエラーなし  '+errs.slice(0,2).join(' / '));
await p.close();

/* ⑤ 10ページ全部：見出しがフレーム画像になっている・つぶれない・はみ出さない */
if(!BEFORE){
  let bad=[], none=[], tight=0, tot=0;
  for(const f of PAGES){
    const q=await ctx.newPage(); q.on('dialog',e=>e.accept());
    try{
      await q.goto('http://localhost:8899/'+f,{waitUntil:'load'}); await q.waitForTimeout(2100);
      await q.evaluate(()=>{try{nnZMenuClose()}catch(_){}});
      await q.evaluate(()=>{const r=document.querySelector('#list li,#list .row,.lr2,tbody tr'); if(r)r.click();});
      await q.waitForTimeout(600);
      const r=await q.evaluate(()=>{
        const hs=[...document.querySelectorAll('.httl')].filter(h=>h.getBoundingClientRect().width>1);
        const img=hs.length?/httl_frame/.test(getComputedStyle(hs[0],'::before').borderImageSource):null;
        let t=0;
        hs.forEach(h=>{ const rc=h.getBoundingClientRect(), bc=getComputedStyle(h,'::before');
          if(parseFloat(bc.borderLeftWidth)+parseFloat(bc.borderRightWidth)>=rc.width) t++; });
        return {n:hs.length, img, tight:t, ov:document.documentElement.scrollWidth-innerWidth,
                css:!!document.getElementById('nn-httl-img')};
      });
      tot+=r.n; tight+=r.tight;
      if(!r.css) none.push(f);
      if(r.n>0 && !r.img) bad.push(f);
      if(r.ov>1) bad.push(f+'(はみ出し'+r.ov+')');
    }catch(e){ bad.push(f+' ERR'); }
    await q.close();
  }
  ok(none.length===0, '⑤ 10ページ全部に指定が入っている', none);
  ok(bad.length===0,  '⑤ 見出しはどのページでもフレーム画像・横にはみ出さない', bad);
  ok(tight===0,       '⑤ 端がつぶれる見出しは1つも無い（'+tot+'個を確認）', tight);
}

/* ⑥ ★2026-08-31b 見出しに出る字が、絞り込んだ書体に全部入っているか
   （入っていない字は端末の書体で出て**その字だけ細く見える**。
     実際に「平」「矩」が抜けていて指摘を受けた）
   見分け方：canvas で 'NNHead, monospace' と 'monospace' の幅を比べる。
   書体に無い字は monospace に落ちるので**幅がぴたり一致**する。 */
{
  const q=await b.newPage();
  await q.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await q.waitForTimeout(1800);
  /* 画面に出ている見出しの字を全部集める（入口メニューのカード名も含む） */
  const cs=await q.evaluate(()=>{
    const txt=[...document.querySelectorAll('.httl')].map(e=>e.textContent).join('');
    /* 漢字・かなだけ。絵文字（📐など）は日本語の書体に無くて当たり前なので数えない */
    return [...new Set(txt)].filter(c=>{const n=c.codePointAt(0);
      return c.trim() && n>0x2e80 && n<0xf000; }).join('');
  });
  await q.close();
  /* ★ブラウザでは per文字の有無が調べられない（document.fonts.check は
     「その書体が使えるか」しか答えず、幅くらべも漢字は全部 全角で同じ幅になる）。
     woff2 の中の文字一覧（cmap）を直に見るのが確実。 */
  {
    const {execFileSync}=require('child_process');
    const py=`
import sys
from fontTools.ttLib import TTFont
cm=TTFont('fonts/notosansjp-black.woff2').getBestCmap()
print(''.join(c for c in sys.argv[1] if ord(c) not in cm))`;
    let out='';
    try{ out=execFileSync('python3',['-c',py,cs],{cwd:process.cwd(),encoding:'utf-8'}).trim(); }
    catch(e){ out='ERR '+e.message; }
    ok(out==='', '⑥ 見出しの字が全部この書体に入っている（'+[...cs].length
       +'字を確認。抜けているとその字だけ端末の書体になって細く見える）', out);
  }
}
await b.close();
console.log(ng?('★NG '+ng+'件'):'全部○');
process.exit(ng?1:0);
})();
