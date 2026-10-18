/* ★§738 写真台帳：スマホ縦画面を1画面に（本人「できれば1画面内で完結。黒板設定と現場登録に無駄な隙間。選択枠に無駄な高さ。現場名の入力枠はもっと長く」）
   iPhone の縦（時計・操作バーの分を引いた高さ）393×759／430×839 と 393×852 で測る：
   ① 現場登録〜見本まで（写真なし）がスクロールなしで1画面（はみ出し 4px まで）
   ② 現場名の欄はカードの幅の 85% 以上（1行まるごと）・「記録帳引用」は「現場登録」の見出しの行（上下の真ん中が見出しの中）・保存・▲と重ならない
   ③ 黒板の選択欄の高さは 30px 以下・黒板のモデルが見えている・pageerror 0
   直す前の版では ①② が★NG。  使い方: node _check/daicho_tate1.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{ for(const [W,H] of [[393,759],[430,839],[393,852]]){ const nm=W+'×'+H;
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(([W,H])=>{Object.defineProperty(screen,'width',{get:()=>W});Object.defineProperty(screen,'height',{get:()=>H});localStorage.setItem('nn_view_mode','mobile');},[W,H]);
  await p.goto('http://localhost:8899/'+F); await p.evaluate(async()=>{ localStorage.removeItem('nn_daicho_pref_v1'); const m=await nnPhotos.load('nn_daicho_v1'); if(m) await nnPhotos.del('nn_daicho_v1',Object.keys(m)); }); await p.reload(); await p.waitForTimeout(1000);
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(700); if(await p.locator('#dbLibNew').isVisible().catch(()=>false)) await p.locator('#dbLibNew').click(); await p.waitForTimeout(300);
  await p.fill('#dbSite','サン太平レジデンス 大規模修繕（屋上・バルコニー防水）'); await p.locator('#dbRegDone').click(); await p.waitForTimeout(800);
  await p.locator('#dbBoardAsk [data-b="on"]').click(); await p.waitForTimeout(600);
  await p.waitForFunction(()=>{ const w=document.querySelector('#dbv .dbw'); return w.scrollHeight<=w.clientHeight+4; },null,{timeout:3000}).catch(()=>{});
  await p.evaluate(()=>{ document.querySelector('#dbv .dbw').scrollTop=0; }); await p.waitForTimeout(300);
  const g=await p.evaluate(()=>{ const R=s=>{ const e=document.querySelector(s); const r=e.getBoundingClientRect(); return {t:r.top,b:r.bottom,l:r.left,r:r.right,w:r.width,h:r.height}; }; const w=document.querySelector('#dbv .dbw');
    const ov=(a,c)=>a.l<c.r-1&&c.l<a.r-1&&a.t<c.b-1&&c.t<a.b-1;
    const bk=R('#dbFromBk'), f=R('#dbFold'), sv=R('#dbSaveSt'), fv=R('#dbFold .fv'), card=R('#dbGenbaCard'), site=R('#dbSite');
    return {over:Math.round(w.scrollHeight-w.clientHeight), siteR:+(site.w/card.w).toFixed(2), bkRow:(bk.t+bk.b)/2>f.t&&(bk.t+bk.b)/2<f.b, bkOv:ov(bk,sv)||ov(bk,fv),
      sel:Math.round(R('#dbBoardOn').h), kb:Math.round(R('#dbItemL').h)}; });
  ok(nm+' ① 現場登録〜見本までスクロールなしで1画面', g.over<=4, g);
  ok(nm+' ② 現場名の欄は1行まるごと（85%以上）・記録帳引用は見出しの行・保存／▲と重ならない', g.siteR>=0.85&&g.bkRow&&!g.bkOv, g);
  ok(nm+' ③ 選択欄 30px 以下・黒板のモデルが見える・pageerror 0', g.sel<=30&&g.kb>=120&&errs.length===0, {sel:g.sel,kb:g.kb,errs});
  await p.screenshot({path:'/tmp/tate1_'+W+'x'+H+'.png'}); await p.close(); }
 }catch(e){ console.log('★NG 例外 '+e.message); NG++; }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); process.exit(NG?1:0); })();
