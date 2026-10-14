/* ★2026-10-13zg 写真台帳：黒板の画質・表の線・LINE へ送る（本人・§673）
   ① 黒板の表（工事名・工種・撮影日）に「上の線」と「右の線」がある（線の場所は camera.html と別にここで計算）
   ② 大きく見る：黒板つきの絵は 画面に写る長い辺×画素の細かさ×2 以上で描く（640×480 の写真でも指で広げて黒板がにじまない）
   ③ スマホ「送る」：共有画面へ渡すのは**ファイルだけ**（題名・本文を付けると LINE が「一部の項目を転送できませんでした」）・写真の長い辺 2400 画素以上
   ④ スマホ「印刷・PDF」：本物の PDF ファイル（application/pdf・%PDF で始まる）をファイルだけで共有画面へ。pdfinfo で 1 ページ・A4、
      pdftoppm で絵にして、写真の枠に写真の色・表の見出しに灰色（出来上がりを測る）
   ⑤ スマホ「Excel」：ファイルだけを共有画面へ（題名なし）
   ⑥ 作るのに時間がかかって共有画面が断られた（NotAllowedError）ら「送る」ボタンが出て、押すと共有画面が開く
   ⑦ pageerror 0
   直す前の版では ①〜⑥ が★NG。  使い方: node _check/daicho_send.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright'); const fs=require('fs'), cp=require('child_process'), os=require('os'), path=require('path');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
const SITE='送る試験の現場';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){}
    window.print=()=>{ window._printed=(window._printed||0)+1; }; window._sh=[]; window._deny=0;
    navigator.canShare=()=>true; navigator.share=(d)=>{ window._sh.push({keys:Object.keys(d), files:(d.files||[]).map(f=>f)}); if(window._deny>0){ window._deny--; const e=new Error('x'); e.name='NotAllowedError'; return Promise.reject(e); } return Promise.resolve(); }; });
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200);
  await p.evaluate(async(SITE)=>{ if(!window.nnPhotos) return; const m=await nnPhotos.load('nn_daicho_v1'); if(m) await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===SITE)); },SITE);
  /* ① 黒板の表の線：写真がまだ無いときの見本（右下・42%・緑）。canvas の幅から線の場所を別に計算 */
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(800);
  const t1=await p.evaluate(()=>{ const c=document.getElementById('dbCv1'), g=c.getContext('2d'), W=c.width, H=c.height;
    /* ★§680 黒板は本人の見本（1282×898）の形：外の囲いは 上 y18〜27・右 x1252〜1261（見本の座標×k） */
    const bw=Math.round(W*.42), k=bw/1282, bh=Math.round(898*k), m=Math.round(W*.02), x=W-bw-m, y=H-bh-m;
    const px=(X,Y)=>[...g.getImageData(Math.round(X),Math.round(Y),1,1).data].slice(0,3), lt=c=>c[0]>200&&c[1]>200&&c[2]>200;
    const top=[.3,.6,.85].map(f=>px(x+bw*f,y+22.5*k)), right=[100,450,800].map(v=>px(x+1256.5*k,y+v*k)), mid=px(x+1200*k,y+60*k);
    return {W,top,right,mid,ok:top.every(lt)&&right.every(lt)&&!lt(mid)}; });
  ok('① 黒板の表に上の線と右の線がある（線の上は白・すぐ内側は黒板の色）', t1.ok, t1);
  /* 写真を3枚入れる（640×480・外 #3060c0・真ん中 #c0d0f0） */
  await p.fill('#dbSite',SITE); await p.locator('#dbSite').dispatchEvent('change'); await p.waitForTimeout(400);
  const mk=(w,h)=>p.evaluate(([w,h])=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); g.fillStyle='#3060c0'; g.fillRect(0,0,w,h); g.fillStyle='#c0d0f0'; g.fillRect(w*.12,h*.15,w*.76,h*.7); return c.toDataURL('image/png'); },[w,h]);
  const fl=[]; for(let i=0;i<3;i++) fl.push({name:'s'+i+'.png',mimeType:'image/png',buffer:Buffer.from((await mk(640,480)).split(',')[1],'base64')});
  await p.setInputFiles('#dbPickIn',fl);
  try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length===3,null,{timeout:15000}); }catch(e){}
  /* ② 大きく見る */
  await p.evaluate(()=>document.querySelector('#dbGrid .tile canvas').click()); await p.waitForTimeout(800);
  const t2=await p.evaluate(()=>{ const cv=document.getElementById('dbViewCv'), r=cv.getBoundingClientRect(); return {cw:cv.width, ch:cv.height, need:Math.round(Math.max(r.width,r.height)*devicePixelRatio*2)}; });
  await p.evaluate(()=>document.getElementById('dbViewX').click());
  ok('② 大きく見る：黒板つきの絵は 画面の長い辺×画素の細かさ×2 以上（写真は 640 画素）', Math.max(t2.cw,t2.ch)>=t2.need&&Math.abs(t2.cw/t2.ch-4/3)<0.01, t2);
  /* ③ 送る */
  await p.evaluate(()=>{ window._sh=[]; document.getElementById('dbShare').click(); });
  try{ await p.waitForFunction(()=>window._sh.length>0,null,{timeout:15000}); }catch(e){}
  const t3=await p.evaluate(async()=>{ const s=window._sh[0]; if(!s) return {none:true}; const f=s.files[0], im=new Image(); im.src=URL.createObjectURL(f); await im.decode().catch(()=>{}); return {keys:s.keys, n:s.files.length, type:f.type, w:im.naturalWidth, h:im.naturalHeight}; });
  ok('③ 送る：共有画面へはファイルだけ（題名・本文なし）・3枚・JPEG・長い辺 2400 画素以上', !t3.none&&t3.keys.join()==='files'&&t3.n===3&&t3.type==='image/jpeg'&&Math.max(t3.w,t3.h)>=2400, t3);
  /* ④ PDF */
  await p.evaluate(()=>{ window._sh=[]; window._printed=0; document.getElementById('dbPrintBtn').click(); });
  try{ await p.waitForFunction(()=>{ const g=document.getElementById('dbRevGo'); return g&&!g.disabled&&document.getElementById('dbRev').classList.contains('on'); },null,{timeout:30000}); }catch(e){} await p.click('#dbRevGo');
  try{ await p.waitForFunction(()=>window._sh.length>0||window._printed>0,null,{timeout:20000}); }catch(e){}
  await p.waitForTimeout(300);
  const t4=await p.evaluate(async()=>{ const s=window._sh[0]; if(!s) return {none:true,printed:window._printed}; const f=s.files[0]; const u=new Uint8Array(await f.arrayBuffer()); let b=''; for(let i=0;i<u.length;i+=8192) b+=String.fromCharCode.apply(null,u.subarray(i,i+8192));
    return {keys:s.keys, n:s.files.length, type:f.type, name:f.name, b64:btoa(b)}; });
  let t4b={};
  if(!t4.none){ const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nnpdf-')), pf=path.join(dir,'a.pdf'); fs.writeFileSync(pf,Buffer.from(t4.b64,'base64'));
    const head=fs.readFileSync(pf).slice(0,5).toString('latin1');
    let info=''; try{ info=cp.execFileSync('pdfinfo',[pf]).toString(); }catch(e){ info='ERR '+e.message; }
    try{ cp.execFileSync('pdftoppm',['-r','50','-png','-f','1','-l','1',pf,path.join(dir,'pg')]); }catch(e){}
    const png=fs.readdirSync(dir).find(n=>/^pg.*\.png$/.test(n));
    let px=null; if(png){ px=JSON.parse(cp.execFileSync('python3',['-c',`
import sys,json
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB'); W,H=im.size; k=W/210.0
def P(xm,ym): return list(im.getpixel((int(round(xm*k)),int(round(ym*k)))))
# 紙の左上から：余白12mm・行の上 14+n*86mm・写真の真ん中 (3+54, 3+38)・見出し (3+108+5+10, 3+6)
print(json.dumps({'size':[W,H],'photo':[P(12+57,12+14+n*86+41) for n in range(3)],'head':[P(12+126,12+14+n*86+9) for n in range(3)]}))`,path.join(dir,png)]).toString()); }
    t4b={head, pages:(info.match(/Pages:\s+(\d+)/)||[])[1], size:(info.match(/Page size:\s+([^\n]+)/)||[])[1], px}; }
  const blue=c=>c&&c[2]>c[0]+40, gray=c=>c&&Math.abs(c[0]-232)<14&&Math.abs(c[1]-232)<14&&Math.abs(c[2]-232)<14;
  ok('④ PDF：本物の PDF ファイルをファイルだけで共有画面へ・1ページ A4・写真の枠に写真・表の見出しに灰色', !t4.none&&t4.keys.join()==='files'&&t4.type==='application/pdf'&&/\.pdf$/.test(t4.name)&&t4b.head==='%PDF-'&&t4b.pages==='1'&&/595\.28 x 841\.89/.test(t4b.size||'')&&t4b.px&&t4b.px.photo.every(blue)&&t4b.px.head.every(gray), {none:t4.none,printed:t4.printed,keys:t4.keys,type:t4.type,name:t4.name,t4b});
  /* ⑤ Excel */
  await p.evaluate(()=>{ window._sh=[]; document.getElementById('dbXlsBtn').click(); });
  try{ await p.waitForFunction(()=>{ const g=document.getElementById('dbRevGo'); return g&&!g.disabled&&document.getElementById('dbRev').classList.contains('on'); },null,{timeout:30000}); }catch(e){} await p.click('#dbRevGo');
  try{ await p.waitForFunction(()=>window._sh.length>0,null,{timeout:30000}); }catch(e){}
  const t5=await p.evaluate(()=>{ const s=window._sh[0]; return s?{keys:s.keys, type:s.files[0].type, name:s.files[0].name}:{none:true}; });
  ok('⑤ Excel：ファイルだけを共有画面へ（題名なし）・xlsx', !t5.none&&t5.keys.join()==='files'&&/spreadsheetml/.test(t5.type)&&/\.xlsx$/.test(t5.name), t5);
  /* ⑥ 断られたら「送る」ボタン */
  await p.evaluate(()=>{ window._sh=[]; window._deny=1; document.getElementById('dbShare').click(); });
  try{ await p.waitForFunction(()=>{ const b=document.getElementById('dbSendNow'); return b&&b.style.display!=='none'; },null,{timeout:15000}); }catch(e){}
  const t6a=await p.evaluate(()=>{ const b=document.getElementById('dbSendNow'); if(!b) return {btn:false}; const r=b.getBoundingClientRect(); return {btn:b.style.display!=='none', inView:r.left>=0&&r.right<=document.documentElement.clientWidth&&r.bottom<=document.documentElement.clientHeight, txt:b.textContent}; });
  if(t6a.btn) await p.click('#dbSendNow'); await p.waitForTimeout(300);
  const t6b=await p.evaluate(()=>({n:window._sh.length, keys:(window._sh[1]||{}).keys, files:((window._sh[1]||{}).files||[]).length, hidden:(document.getElementById('dbSendNow')||{style:{}}).style.display==='none'}));
  ok('⑥ 共有画面が断られたら「送る」ボタン（画面の中）・押すとファイルだけでもう一度開く', t6a.btn&&t6a.inView&&t6b.n===2&&t6b.keys.join()==='files'&&t6b.files===3&&t6b.hidden, {t6a,t6b});
  await p.evaluate(async(SITE)=>{ const m=await nnPhotos.load('nn_daicho_v1'); if(m) await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===SITE)); },SITE);
  ok('⑦ pageerror 0', errs.length===0, errs);
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
