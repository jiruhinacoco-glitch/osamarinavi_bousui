/* ★2026-09-29i 材料の製品区分とイラスト（§547）
   使い方: node _check/matill1.js [zairyo_toroku.html]
   ○/★NG：①田島の材料の製品区分が自動で付く（アスタイトM〜ハイタイトJ＝アスファルトコンパウンド、アスキング＝シール材 等・答えは手で書いた表）
          ②絵が無いうちは区分名の色札、icons/mat_asphalt_compound.png があれば絵が出る
          ③イラストを選ぶ小窓（区分に合わせる＋20種）→選んだ絵が見出しに出る→登録→開き直しても残る
          ④登録済みの材料は製品区分を変えるとすぐ保存 ⑤新規材料登録に製品区分とイラスト→保存される
          ⑥スマホ幅で横にはみ出さない ⑦JSエラーなし */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,x)=>R.push((c?'○':'★NG')+' '+n+(x!==undefined?'  '+x:''));
const F=process.argv[2]||'zairyo_toroku.html', U='http://localhost:8899/';
const EXP={M005:'asphalt_compound',M006:'asphalt_compound',M007:'asphalt_compound',M008:'asphalt_compound',M009:'seal',M001:'primer',
  M010:'roofing_sand',M014:'roofing_sand',M018:'roofing_sand',M017:'roofing',M013:'roofing',M095:'pvc_sheet',M088:'rubber_sheet',M051:'hokyofu',M054:'hokyofu',M177:'hokyofu'};   /* ★§566 テトロメッシュはメッシュ・補強布 */   /* ★§555 砂付／その他・塩ビ／ゴム */
/* 1x1の本物のPNG */
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:1400,height:900}});
 await ctx.route('**/icons/mat_asphalt_compound.png*',r=>r.fulfill({status:200,contentType:'image/png',body:PNG}));
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U+F); await p.evaluate(()=>localStorage.removeItem('nn_materials_v1')); await p.reload(); await p.waitForTimeout(1200);
 const view=async id=>{ await p.evaluate(id=>selectAndShow({type:'cat',id}),id); await p.waitForTimeout(300);
   return p.evaluate(()=>{ const v=document.querySelector('#d_illview .nnmi'); return v?{k:v.dataset.k, noimg:v.classList.contains('noimg'), img:!!(v.querySelector('img')&&v.querySelector('img').naturalWidth>0), txt:v.innerText.trim()}:null; }); };
 for(const id of Object.keys(EXP)){ const v=await view(id); ok(`①${id} の製品区分＝${EXP[id]}`, v&&v.k===EXP[id], v&&v.k); }
 let v=await view('M005'); ok('②絵のファイルがあれば絵が出る（アスファルトコンパウンド）', v&&v.img&&!v.noimg, JSON.stringify(v));
 v=await view('M019'); ok('②絵が無いうちは区分名の色札（緩衝・絶縁シート）', v&&v.noimg&&v.txt.includes('緩衝'), JSON.stringify(v));   /* ★§566 プライマーは絵が入ったので、まだ絵の無い区分で見る */
 /* ⑩ 前に保存した「合成高分子シート」は塩ビ／ゴムに読み替える（画面が止まらない） */
 await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('nn_materials_v1')||'{"v":1,"items":[]}');
   d.items=(d.items||[]).filter(x=>x.catalogId!=='M088'); d.items.push({id:'old88',catalogId:'M088',maker:'田島ルーフィング',n:'プラストシートB1.2',s:'プラストシートB1.2',c1:'合成高分子系ルーフィングシート防水',c2:'加硫ゴム系ルーフィングシート',ou:'巻',cv:1,cu:'巻',price:null,kubun:'polymer_sheet',ill:'polymer_sheet'});
   localStorage.setItem('nn_materials_v1',JSON.stringify(d)); });
 await p.reload(); await p.waitForTimeout(1200);
 const lg=await view('M088');
 ok('⑩古い保存（合成高分子シート）はゴムシートに読み替え', lg&&lg.k==='rubber_sheet', lg&&lg.k);
 /* ⑧ 一覧の行の頭に絵（アスタイトM）・絵の無い行は空欄 ⑨ 大分類別などの一覧が手前に見える（§551） */
 const li=await p.evaluate(()=>{ const rows=[...document.querySelectorAll('.mrow')]; const a=rows.find(x=>x.querySelector('.nm')&&x.querySelector('.nm').textContent.trim()==='アスタイトM');
   const q=rows.find(x=>x.querySelector('.nm')&&x.querySelector('.nm').textContent.trim()==='リベース');
   const im=a&&a.querySelector('.lic img'); return {a:!!(im&&im.complete&&im.naturalWidth>0), q:!!(q&&q.querySelector('.lic img')&&q.querySelector('.lic img').naturalWidth>0)}; });
 ok('⑧一覧のアスタイトMの左に絵・絵の無い材料は空欄', li.a&&!li.q, JSON.stringify(li));
 for(const lb of ['大分類別','中分類別']){
   const vis=await p.evaluate(async lb=>{ const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===lb); b.click(); await new Promise(r=>setTimeout(r,300));
     const m=document.querySelector('.menu.open'); if(!m) return 'なし'; const r=m.getBoundingClientRect(); const t=document.elementFromPoint(r.left+r.width/2, r.top+Math.min(40,r.height/2));
     const v=!!(t&&m.contains(t)); b.click(); await new Promise(r=>setTimeout(r,200)); return v; },lb);
   ok('⑨「'+lb+'」の一覧が手前に見える', vis===true, vis); }
 /* ③ 選ぶ → 登録 → 開き直し */
 await view('M006'); await p.click('#d_illbtn'); await p.waitForTimeout(200);
 const nb=await p.evaluate(()=>document.querySelectorAll('#nnMiPick .gr button').length);
 ok('③イラストの小窓：区分に合わせる＋20種', nb===21, nb);
 await p.click('#nnMiPick .gr button[data-k="drain"]'); await p.waitForTimeout(200);
 v=await p.evaluate(()=>document.querySelector('#d_illview .nnmi').dataset.k);
 ok('③選んだ絵が見出しに出る（ドレン）', v==='drain', v);
 await p.evaluate(()=>saveDetail()); await p.waitForTimeout(200);
 await p.reload(); await p.waitForTimeout(1200);
 const saved=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('nn_materials_v1')); const it=d.items.find(x=>x.catalogId==='M006'); return it?{ill:it.ill,kubun:it.kubun}:null; });
 v=await view('M006');
 ok('③登録すると保存され、開き直しても選んだ絵', saved&&saved.ill==='drain'&&v&&v.k==='drain', JSON.stringify({saved,k:v&&v.k}));
 /* ④ 登録済み：製品区分を変えるとすぐ保存 */
 await p.selectOption('#d_kubun','tomaku').catch(()=>p.evaluate(()=>nnMiDetailKubun('tomaku'))); await p.waitForTimeout(300);
 const k4=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('nn_materials_v1')); return d.items.find(x=>x.catalogId==='M006').kubun; });
 ok('④登録済みは製品区分を変えるとすぐ保存', k4==='tomaku', k4);
 /* ⑤ 新規材料登録 */
 await p.evaluate(()=>nnMatNew()); await p.waitForTimeout(400);
 const f5=await p.evaluate(()=>({kb:document.querySelectorAll('#rg_kubun option').length, btn:!!document.getElementById('rg_illbtn')}));
 ok('⑤新規材料登録に製品区分（自動＋20）とイラストの欄', f5.kb===21&&f5.btn, JSON.stringify(f5));
 await p.evaluate(()=>{ const s=(id,v)=>{const e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}));};
   s('rg_mname','テスト塗膜材'); s('rg_kubun','tomaku'); });
 await p.click('#rg_illbtn'); await p.waitForTimeout(200); await p.click('#nnMiPick .gr button[data-k="topcoat"]'); await p.waitForTimeout(200);
 await p.click('#nnReg .ok'); await p.waitForTimeout(400);
 const it5=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('nn_materials_v1')); const it=d.items.find(x=>x.n==='テスト塗膜材'); return it?{kubun:it.kubun,ill:it.ill}:null; });
 ok('⑤保存すると製品区分とイラストが入る', it5&&it5.kubun==='tomaku'&&it5.ill==='topcoat', JSON.stringify(it5));
 /* ⑥ スマホ幅 */
 const ph=await (await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true})).newPage(); ph.on('pageerror',e=>errs.push('sp:'+e.message));
 await ph.goto(U+F); await ph.waitForTimeout(1200); await ph.evaluate(()=>selectAndShow({type:'cat',id:'M005'})); await ph.waitForTimeout(400);
 const ov=await ph.evaluate(()=>{ const d=document.documentElement; const r=document.querySelector('.kbrow'); const rr=r&&r.getBoundingClientRect();
   return {sw:d.scrollWidth, cw:d.clientWidth, right:rr?Math.round(rr.right):null}; });
 ok('⑥スマホ幅で横にはみ出さない', ov.sw<=ov.cw+1&&ov.right!==null&&ov.right<=ov.cw+1, JSON.stringify(ov));
 await ph.screenshot({path:process.env.SP?process.env.SP+'/matill_sp.png':'/tmp/matill_sp.png'});
 await p.evaluate(()=>selectAndShow({type:'cat',id:'M005'})); await p.waitForTimeout(300);
 await p.screenshot({path:process.env.SP?process.env.SP+'/matill_pc.png':'/tmp/matill_pc.png'});
 ok('⑦JSエラーなし', errs.length===0, errs.join(' / ').slice(0,300));
 await b.close(); console.log(R.join('\n'));
})();
