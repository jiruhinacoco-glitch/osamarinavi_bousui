/* ①ツールバー：検索欄が潰れない・重なりゼロ（たて/よこ、ノッチ再現あり）
   ②ライブラリ：一覧が行形式・サムネイルが見える・タップで詳細 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const SP = '/tmp/claude-0/-home-user-osamarinavi-bousui/14021813-84a1-5c50-96c6-9a3eca49d2e3/scratchpad/';
const R = []; const ok = (n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex?'  '+ex:''));

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

  /* --- ① 現場記録帳のツールバー。よこ画面はノッチ59pxを再現するため
         env(safe-area-inset-*) を実値に置換したコピーを配信する --- */
  const src = fs.readFileSync('/home/user/osamarinavi_bousui/kirokucho_demo.html','utf8');
  fs.writeFileSync('/home/user/osamarinavi_bousui/_notch_test.html',
    src.replace(/env\(safe-area-inset-(left|right)\s*,\s*0px\)/g,'59px'));

  for (const vp of [{w:393,h:852,n:'たて',f:'kirokucho_demo.html'},{w:852,h:393,n:'よこ(ノッチ59px)',f:'_notch_test.html'}]) {
    const p = await (await browser.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage();
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    await p.goto('http://localhost:8899/'+vp.f,{waitUntil:'load'});
    await p.waitForTimeout(1400);
    await p.evaluate(()=>showView('list'));
    await p.waitForTimeout(700);
    const m = await p.evaluate(()=>{
      const r=el=>{const b=el.getBoundingClientRect();return{x:+b.x.toFixed(1),w:+b.width.toFixed(1),right:+b.right.toFixed(1)};};
      const tb=document.getElementById('toolbar'), s=tb.querySelector('.search'),
            c=document.getElementById('chips'), lc=document.getElementById('nnLC');
      const cs=getComputedStyle(tb);
      return {search:r(s), chips:r(c), chipsScroll:c.scrollWidth, lc:lc?r(lc):null,
              padL:parseFloat(cs.paddingLeft), padR:parseFloat(cs.paddingRight), tbW:tb.getBoundingClientRect().width,
              rows:new Set([...c.querySelectorAll('.stchip')].map(x=>Math.round(x.getBoundingClientRect().top))).size};
    });
    ok(vp.n+'：検索欄がつぶれない（104px以上）', m.search.w>=104, '検索'+m.search.w+'px');
    ok(vp.n+'：検索欄とチップ帯が重ならない', m.chips.x>=m.search.right-0.5, `検索right ${m.search.right} / chips x ${m.chips.x}`);
    ok(vp.n+'：件数の札が画面内', m.lc && m.lc.right<=m.tbW-m.padR+1, JSON.stringify(m.lc)+' 右余白'+m.padR);
    /* ★2026-08-17b(§131)からスマホは折り返し（2段）が正しい仕様。期待値を更新（product正・テストが古い） */
    ok(vp.n+'：チップ帯は2段以内（§131で折り返しが仕様に）', m.rows<=2, m.rows+'段');
    // メニューが1つだけ画面に出る（overflow箱にしても閉じ込められない）
    await p.dispatchEvent('#chips .dfil[data-k="defect"] button','pointerdown');
    await p.waitForTimeout(400);
    const mn = await p.evaluate(()=>{
      const vis=[...document.querySelectorAll('.dfmenu')].filter(el=>{
        const b=el.getBoundingClientRect();
        return b.width>10&&b.height>10&&b.right>0&&b.bottom>0&&b.left<innerWidth&&b.top<innerHeight;
      });
      const port=document.getElementById('nnPortal');
      const b=port?port.getBoundingClientRect():null;
      return {nVisible:vis.length, portalOK: !!(b&&b.width>10&&b.left>=0&&b.right<=innerWidth&&b.top>=0)};
    });
    ok(vp.n+'：メニューは画面内に1つだけ', mn.nVisible===1&&mn.portalOK, JSON.stringify(mn));
    await p.screenshot({path:SP+'ui2_tb_'+(vp.n.startsWith('たて')?'tate':'yoko')+'.png'});
    await p.close();
  }
  fs.unlinkSync('/home/user/osamarinavi_bousui/_notch_test.html');

  /* --- ② ライブラリ --- */
  for (const vp of [{w:393,h:852,n:'たて'},{w:852,h:393,n:'よこ'}]) {
    const p = await (await browser.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    await p.goto('http://localhost:8899/library.html',{waitUntil:'load'});
    await p.waitForTimeout(1200);
    const m = await p.evaluate(()=>{
      const rows=[...document.querySelectorAll('.lr2')];
      const r0=rows[0]?rows[0].getBoundingClientRect():null;
      const th=rows[0]?rows[0].querySelector('.l2th').getBoundingClientRect():null;
      // 画面内に何行見えるか
      const seen=rows.filter(x=>{const b=x.getBoundingClientRect();return b.top<innerHeight&&b.bottom>0;}).length;
      return {n:rows.length, cards:document.querySelectorAll('.grid .card').length,
              rowH:r0?+r0.height.toFixed(1):0, thumb:th?[+th.width.toFixed(1),+th.height.toFixed(1)]:null,
              seen, overflowX: document.documentElement.scrollWidth>innerWidth+1};
    });
    ok('ライブラリ'+vp.n+'：行形式（カード0・行8）', m.n===8&&m.cards===0, JSON.stringify({行:m.n,カード:m.cards}));
    ok('ライブラリ'+vp.n+'：サムネイルが見える大きさ', m.thumb && m.thumb[0]>=80 && m.thumb[1]>=54, 'サムネ'+JSON.stringify(m.thumb));
    ok('ライブラリ'+vp.n+'：横にはみ出さない', !m.overflowX);
    ok('ライブラリ'+vp.n+'：1画面に'+m.seen+'件見える', m.seen>=3, m.seen+'件');
    // 行をタップ → 詳細
    await p.click('.lr2');
    await p.waitForTimeout(400);
    const d = await p.evaluate(()=>({
      detail: !!document.querySelector('.detail-top'),
      title: (document.querySelector('.panel.dhead h2')||{}).textContent||'',
      back: !!document.querySelector('.back-list')}));
    ok('ライブラリ'+vp.n+'：タップで詳細が開く', d.detail&&d.title.length>3&&d.back, d.title.slice(0,20));
    await p.evaluate(()=>{detailId=null;render();});
    await p.waitForTimeout(300);
    ok('ライブラリ'+vp.n+'：戻ると一覧', await p.evaluate(()=>document.querySelectorAll('.lr2').length===8));
    if(errs.length) ok('ライブラリ'+vp.n+'：JSエラー', false, errs.join('|'));
    await p.screenshot({path:SP+'ui2_lib_'+(vp.n==='たて'?'tate':'yoko')+'.png'});
    await p.close();
  }
  console.log(R.join('\n'));
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
