/* ★2026-10-13zp 写真台帳：黒板の形（本人の見本）と項目のカスタマイズ（§680）
   見本（1282×898）を実測：外の囲い 太さ10（左 x23〜32・右 x1252〜1261・上 y18〜27・下 y868〜877）／中の線 太さ5／
   最初の項目は 上：工事件名・工事場所／下：施工者 → 横線 y120〜124・220〜225・771〜775／見出しの仕切り x317〜321
   ① 見本の線の場所が白・囲いと線の間（行の中・真ん中の欄）は黒板の色（見本の座標×k で別に計算）
   ② 最初の項目は「工事件名＝現場名」「工事場所」「施工者」・見出しは列の幅に均等（施・工・者が1文字ずつ・間が広い）・工種／撮影日の見出しはない
   ③ 項目を足す：「工種＝工種」を上に足すと黒板に「工種」と「防水工事」が出る・行が増えた分の横線
   ④ 文字（現場別）は現場ごと：現場Aの工事場所を入れて現場Bへ移ると空・Aへ戻ると戻る／文字（共通）の施工者はどの現場でも同じ
   ⑤ 開き直しても項目と文字が残る（保存）
   ⑥ ↑ で並べ替え・× で消える
   ⑦ 「記録帳から引用」で工事場所に物件の住所が入る
   ⑧ 項目の欄の部品が欄からはみ出さない・pageerror 0
   ⑨ 中身の文字の自動調整（§682）：短い現場名は大きく1行／長い現場名は区切り（「（」の前）で2行・全部入る
   直す前の版では ①〜⑦ が★NG。  使い方: node _check/daicho_kokuban.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,400):'')); if(!c)NG++;};
const A='黒板試験の現場A', B='黒板試験の現場B';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); let p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await ctx.addInitScript(()=>{ try{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.setItem('nn_view_mode','mobile'); if(!sessionStorage.getItem('kb_keep')){ localStorage.removeItem('nn_daicho_pref_v1'); sessionStorage.setItem('kb_keep','1'); } }catch(e){}
    window._ft=[]; const o=CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText=function(t,x,y){ if(this.canvas.id==='dbCv1') window._ft.push({t:String(t),x:Math.round(x),y:Math.round(y),fs:parseFloat((/([\d.]+)px/.exec(this.font)||[])[1])||0,w:this.measureText(t).width}); return o.apply(this,arguments); }; });
  const open=async()=>{ await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1200); await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(600); await p.evaluate(()=>window.nnDbReg&&nnDbReg());   /* ★§700 新しく作る画面は「現場登録を完了」まで黒板設定・撮影が出ない → 完了した状態で測る */ await p.evaluate(()=>document.querySelector('#dbv .dbSide').classList.remove('closed')); };
  const setSite=async(v)=>{ await p.fill('#dbSite',v); await p.locator('#dbSite').dispatchEvent('change'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(900); };
  const draw=async()=>{ await p.evaluate(()=>{ window._ft=[]; const r=document.getElementById('dbSize'); r.dispatchEvent(new Event('input',{bubbles:true})); }); await p.waitForTimeout(700); return p.evaluate(()=>window._ft.slice()); };
  const txt=ft=>ft.map(f=>f.t).join('|');
  await open(); await setSite(A);
  /* ① */
  const t1=await p.evaluate(()=>{ const c=document.getElementById('dbCv1'), g=c.getContext('2d'), W=c.width, H=c.height, bw=Math.round(W*.42), k=bw/1282, bh=Math.round(898*k), m=Math.round(W*.02), x=W-bw-m, y=H-bh-m;
    const px=(X,Y)=>[...g.getImageData(Math.round(x+X*k),Math.round(y+Y*k),1,1).data].slice(0,3), gr=c=>c[1]>c[0]+40&&c[1]>c[2]+20&&c[1]<160;
    /* 線は細い（42% で 1〜2 画素）ので、見本の線の真ん中の前後 3k+1 画素で一番明るい点を見る */ const near=(X,Y,dx,dy)=>{ let best=[0,0,0]; const r=Math.ceil(3*k)+1; for(let d=-r;d<=r;d++){ const c=px(X+(dx?d/k:0),Y+(dy?d/k:0)); if(c[0]+c[1]+c[2]>best[0]+best[1]+best[2]) best=c; } return best; }, wh=c=>c[0]>200&&c[1]>200&&c[2]>200;
    const white={L:near(27.5,450,1,0),R:near(1256.5,450,1,0),T:near(1100,22.5,0,1),Bt:near(1100,872.5,0,1),h1:near(1200,122,0,1),h2:near(1200,222.5,0,1),h3:near(1200,773,0,1),v1:near(319,70,1,0),v2:near(319,820,1,0)};
    const green={cell1:px(1230,40),cell2:px(1230,200),mid:px(1230,300),cellB:px(1230,850),gap:px(10,450)};
    return {white,green,ok:Object.values(white).every(wh)&&Object.values(green).every(gr)}; });
  ok('① 見本の線の場所が白・行の中と真ん中の欄は黒板の色', t1.ok, t1);
  /* ② */
  let ft=await draw(); const s2=txt(ft);
  const iS=ft.findIndex(f=>f.t==='施'), sho=iS>=0?ft.slice(iS,iS+3):[]; const shoX=sho.map(f=>f.x);
  ok('② 最初は 工事件名（＝現場名）・工事場所・施工者・見出しは均等（施 工 者）・工種／撮影日の見出しなし', /工\|事\|件\|名/.test(s2)&&/工\|事\|場\|所/.test(s2)&&sho.map(f=>f.t).join('')==='施工者'&&(shoX[2]-shoX[1])>=1.3*(ft.find(f=>f.t==='件').x-ft.find(f=>f.t==='事').x)&&s2.includes(A)&&!/工種|工　種|撮影日/.test(s2), {s2:s2.slice(0,200),shoX});
  /* ③ 項目を足す（★ふだんはたたんである → 「編集」で開く） */
  const sum0=await p.evaluate(()=>({shut:document.getElementById('dbItems').classList.contains('shut'), sum:document.getElementById('dbItemSum').textContent}));    /* ★§703 項目の欄は黒板そのもの・最初から開いている */
  await p.click('#dbItemAdd');   /* ★§715 見出しの行へ移した */ await p.waitForTimeout(200);
  await p.locator('#dbItemL .ilpop .ilo',{hasText:'工種'}).click(); await p.waitForTimeout(300);   /* ★§702/703 足すと項目名の札が開く → 「工種」を選ぶ（中身は自動で工種） */
  const lab=()=>p.evaluate(()=>[...document.querySelectorAll('#dbItemL .bir .kbLt')].map(e=>e.textContent).join());
  const ivOf=t=>p.locator('#dbItemL .bir',{has:p.locator('.kbLt',{hasText:t})}).locator('.iv');
  ft=await draw(); const s3=txt(ft);
  const t3=await p.evaluate(()=>{ const c=document.getElementById('dbCv1'), g=c.getContext('2d'), W=c.width, H=c.height, bw=Math.round(W*.42), k=bw/1282, bh=Math.round(898*k), m=Math.round(W*.02), x=W-bw-m, y=H-bh-m;
    const px=(X,Y)=>[...g.getImageData(Math.round(x+X*k),Math.round(y+Y*k),1,1).data].slice(0,3), wh=c=>c[0]>200&&c[1]>200&&c[2]>200; let best=[0,0,0]; for(let d=-4;d<=4;d++){ const c=px(1200,321+d/k); if(c[0]+c[1]+c[2]>best[0]+best[1]+best[2]) best=c; } return {h3:best,wh:wh(best)}; });
  ok('③ 項目の欄（黒板）は最初から開いている（工事件名／工事場所／施工者）・「工種＝工種」を上の段に足すと黒板に「工種」「防水工事」・3本目の横線', !sum0.shut&&sum0.sum==='工事件名／工事場所／施工者'&&/工\|種/.test(s3)&&s3.includes('防水工事')&&t3.wh, {sum0,s3:s3.slice(0,200),t3});
  /* ④ 現場別と共通 */
  const its=async()=>Promise.all([ivOf('工事場所').inputValue(),ivOf('施工者').inputValue()]);   /* ★§703 黒板の中身の欄（.iv）を見出しで探す */
  await ivOf('工事場所').fill('札幌市A町1-1'); await ivOf('施工者').fill('株式会社テスト防水'); await p.evaluate(()=>document.activeElement.blur()); await p.waitForTimeout(400);
  const a1=await its(); ft=await draw(); const sa=txt(ft);
  await setSite(B); const b1=await its(); ft=await draw(); const sb=txt(ft);
  await setSite(A); const a2=await its();
  ok('④ 文字（現場別）は現場ごと・文字（共通）はどの現場でも同じ', a1[0]==='札幌市A町1-1'&&sa.includes('札幌市A町1-1')&&b1[0]===''&&!sb.includes('札幌市A町1-1')&&b1[1]==='株式会社テスト防水'&&sb.includes('株式会社テスト防水')&&a2[0]==='札幌市A町1-1', {a1,b1,a2});
  /* ⑤ 開き直し */
  await open(); await setSite(A); const r5={labels:await lab(), it:await its()};
  ok('⑤ 開き直しても項目と文字が残る', r5.labels==='工事件名,工事場所,工種,施工者'&&r5.it[0]==='札幌市A町1-1'&&r5.it[1]==='株式会社テスト防水', r5);
  /* ⑥ 並べ替えと削除 */
  /* ★§703 見出しをタップ → 札の「↑ 上へ」「消す」 */
  const o6=await lab();
  await p.locator('#dbItemL .bir').nth(2).locator('.kbX').click();   /* ★§714 「この項目を消す」はやめて、各行の右上の × で閉じる */ await p.waitForTimeout(200);
  const d6=await lab();
  ok('⑥ 行の右上の × で消える', o6==='工事件名,工事場所,工種,施工者'&&d6==='工事件名,工事場所,施工者', {o6,d6});
  /* ⑦ 記録帳から引用 */
  await p.click('#dbFromBk'); try{ await p.waitForFunction(()=>document.querySelectorAll('#dbBkL button').length>0,null,{timeout:8000}); }catch(e){}
  const bk=await p.evaluate(()=>{ const bt=document.querySelector('#dbBkL button'); const L=window.NN_BUKKEN||[]; const nm=bt?bt.textContent:''; const hit=L.find(x=>nm.indexOf(x.name)>=0); bt&&bt.click(); return {name:hit?hit.name:'',addr:hit?hit.addr:''}; });
  await p.waitForTimeout(1000); await p.evaluate(()=>document.querySelector('#dbv .dbSide').classList.remove('closed')); await p.waitForTimeout(300);
  const r7={site:await p.inputValue('#dbSite'), it:await its()};
  ok('⑦ 記録帳から引用で工事場所に物件の住所', !!bk.addr&&r7.site===bk.name&&r7.it[0]===bk.addr, {bk,r7});
  /* ⑧ */
  const t8=await p.evaluate(()=>{ const box=document.getElementById('dbItems'); if(!box) return {box:false}; const R=box.getBoundingClientRect(); const out=[...box.querySelectorAll('input,select,button')].filter(e=>{ const r=e.getBoundingClientRect(); return r.width>0&&(r.left<R.left-1||r.right>R.right+1); }).map(e=>e.className||e.id); return {box:true,out}; });
  ok('⑧ 項目の欄の部品がはみ出さない・pageerror 0', t8.box&&t8.out.length===0&&errs.length===0, {t8,errs});
  /* ⑨ ★§682 中身の文字の自動調整：短い現場名は見出しと同じ大きさ（行の高さの 58% 以上）で1行／長い現場名は「（」の前で2行に分けて全部（…なし・幅の中） */
  const kk=await p.evaluate(()=>{ const c=document.getElementById('dbCv1'); return Math.round(c.width*.42)/1282; }), RH=93.5*kk, VW=(1252-344-22)*kk;
  await setSite('発寒アパート 屋上防水改修'); let f9=await draw(); const sv=f9.find(f=>f.t==='発寒アパート 屋上防水改修');
  const LONG='サン太平レジデンス 大規模修繕工事（屋上・バルコニー・外壁防水）第2期'; await setSite(LONG); f9=await draw(); const iL=f9.findIndex(f=>LONG.startsWith(f.t)&&f.t.length>3); const l2=iL>=0?f9.slice(iL,iL+2):[];
  ok('⑨ 短い現場名は大きく1行（行の高さの58%以上）・長い現場名は「（」の前で2行に分けて全部（幅の中）', !!sv&&sv.fs>=RH*.58&&l2.length===2&&l2.map(f=>f.t).join('')===LONG&&l2[1].t.startsWith('（')&&l2.every(f=>f.w<=VW+1), {short:sv&&{fs:sv.fs,need:+(RH*.58).toFixed(1)},l2:l2.map(f=>({t:f.t,fs:f.fs,w:Math.round(f.w)})),VW:Math.round(VW)});
  await p.evaluate(()=>{ try{ localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){} });
 }catch(e){ ok('検査が途中で止まった', false, String(e).slice(0,300)); }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); })();
