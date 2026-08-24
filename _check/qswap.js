/* ホームの右上クイック：用語集（付箋の右）と 設定（その下）の入れ替え確認 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL='file:///home/user/osamarinavi_bousui/index.html';
let ng=0;
const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };

(async()=>{
  const b=await chromium.launch({executablePath:EXE});

  for(const mode of ['pc','phone']){
    console.log('\n===== '+(mode==='pc'?'パソコン（1600x900）':'iPhone たて（393x852）')+' =====');
    const ctx = mode==='pc'
      ? await b.newContext({viewport:{width:1600,height:900}})
      : await b.newContext({viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true});
    const p=await ctx.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    if(mode==='phone') await p.addInitScript(()=>{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); });
    await p.goto(URL); await p.waitForTimeout(900);

    const r=await p.evaluate(()=>{
      const q=document.querySelector('.quick');
      const row=q.querySelector('.qrow');
      const inRow=row.querySelector('.qbtn');
      const below=q.querySelector(':scope > .qbtn');
      const rb=(el)=>{const b=el.getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)};};
      return {
        rowLbl: inRow && inRow.querySelector('.lbl').textContent.trim(),
        rowClick: inRow && inRow.getAttribute('onclick'),
        rowImg: inRow && inRow.querySelector('img') ? inRow.querySelector('img').getAttribute('src') : null,
        rowImgOK: inRow && inRow.querySelector('img') ? inRow.querySelector('img').naturalWidth>0 : false,
        belowLbl: below && below.querySelector('.lbl').textContent.trim(),
        belowClick: below && below.getAttribute('onclick'),
        belowImg: below && below.querySelector('img') ? below.querySelector('img').getAttribute('src') : null,
        belowImgOK: below && below.querySelector('img') ? below.querySelector('img').naturalWidth>0 : false,
        rowBox: inRow&&rb(inRow), belowBox: below&&rb(below),
        fusenBox: rb(q.querySelector('.fusen')),
        nQbtn: q.querySelectorAll('.qbtn').length,
        winW: innerWidth
      };
    });

    ok(r.nQbtn===2, 'ボタンは2個のまま', r.nQbtn);
    ok(r.rowLbl==='設定', '付箋の右＝設定', r.rowLbl);
    ok(/navGo\('settei'/.test(r.rowClick||''), '設定の行き先が正しい', r.rowClick);
    /* ★2026-08-24v 絵を差し替えたときはURLの後ろに版名が付く（§66の罠よけ）。
   決め打ちで比べると版を上げるたびに★NGになるので、ファイル名だけを見る。 */
    ok(/icons\/nav_settei\.png(\?|$)/.test(r.rowImg||''), '設定の絵が正しい', r.rowImg);
    ok(r.rowImgOK, '設定の絵が読める', '');
    ok(r.belowLbl==='用語集', 'その下＝用語集', r.belowLbl);
    ok(/navGo\('yougo'/.test(r.belowClick||''), '用語集の行き先が正しい', r.belowClick);
    ok(/icons\/nav_yougo\.png(\?|$)/.test(r.belowImg||''), '用語集の絵が正しい', r.belowImg);
    ok(r.belowImgOK, '用語集の絵が読める', '');
    /* ★たて画面は元から .quick が横一列（@media orientation:portrait）なので、
         上下ではなく左右で並ぶ。順番の判定は縦積みのときだけ「上下」で見る。 */
    if(r.rowBox.y !== r.belowBox.y)
      ok(r.rowBox.y < r.belowBox.y, '設定が上・用語集が下（縦積み）', r.rowBox.y+' < '+r.belowBox.y);
    else
      ok(r.rowBox.x < r.belowBox.x, '設定が左・用語集が右（横一列）', r.rowBox.x+' < '+r.belowBox.x);
    ok(Math.abs(r.rowBox.y-r.fusenBox.y) < 60, '設定が付箋と同じ段', 'y '+r.rowBox.y+' / 付箋 '+r.fusenBox.y);
    ok(r.rowBox.x+r.rowBox.w <= r.winW && r.belowBox.x+r.belowBox.w <= r.winW, '画面から はみ出していない',
       'right '+(r.rowBox.x+r.rowBox.w)+' , '+(r.belowBox.x+r.belowBox.w)+' ≦ '+r.winW);

    /* 押せるか（実クリック） */
    const hit=await p.evaluate(()=>{
      const q=document.querySelector('.quick');
      const pick=(el)=>{const b=el.getBoundingClientRect();
        const t=document.elementFromPoint(b.x+b.width/2, b.y+10);
        return t? (t.closest('.qbtn')? t.closest('.qbtn').querySelector('.lbl').textContent.trim() : 'ほか') : 'なし';};
      return {row:pick(q.querySelector('.qrow .qbtn')), below:pick(q.querySelector(':scope > .qbtn'))};
    });
    ok(hit.row==='設定', '設定の位置を押すと設定が反応', hit.row);
    ok(hit.below==='用語集', '用語集の位置を押すと用語集が反応', hit.below);

    /* 実際に設定を押すとデータ画面が開くか */
    await p.evaluate(()=>document.querySelector('.qrow .qbtn').click());
    await p.waitForTimeout(500);
    const opened=await p.evaluate(()=>!!document.querySelector('#nnDataPanel, .nndb-wrap, #nnDataWrap') ||
      /データ|書き出|読み込/.test(document.body.innerText));
    ok(opened, '設定を押すとデータの保存・復元が開く', '');

    ok(errs.length===0, 'JSエラーなし', errs.join(' / '));
    await p.screenshot({path:'/tmp/claude-0/-home-user-osamarinavi-bousui/14021813-84a1-5c50-96c6-9a3eca49d2e3/scratchpad/qswap_'+mode+'.png'});
    await ctx.close();
  }
  await b.close();
  console.log(ng? '\n★NG '+ng+'件' : '\nすべて○');
})();
