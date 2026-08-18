const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({viewport:{width:1280,height:800}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1200);
  const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex?'  '+ex:''));
  // 方眼の色（canvasの画素を読む）
  const px = await p.evaluate(()=>{
    const c=document.getElementById('cv'), x=c.getContext('2d');
    const W=c.width, H=c.height; const d=x.getImageData(0,0,W,Math.min(H,600)).data;
    // 白でない画素の色を集計
    const m={};
    for(let i=0;i<d.length;i+=4){
      const k=d[i]+','+d[i+1]+','+d[i+2];
      if(d[i]>250&&d[i+1]>250&&d[i+2]>250)continue;
      m[k]=(m[k]||0)+1;
    }
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,4);
  });
  const isBlue = px.some(([k])=>{const[r,g,b]=k.split(',').map(Number); return b>r && b>g;});
  ok('方眼が水色系（青が最大成分）', isBlue, JSON.stringify(px.slice(0,3)));
  // 夜モード
  await p.evaluate(()=>nnSetTheme('dark')); await p.waitForTimeout(400);
  const dk = await p.evaluate(()=>{
    const c=document.getElementById('cv'), x=c.getContext('2d');
    const d=x.getImageData(0,0,c.width,300).data;
    let dark=0,tot=0;
    for(let i=0;i<d.length;i+=4){ tot++; if(d[i]<80&&d[i+1]<80&&d[i+2]<90)dark++; }
    return { attr:document.documentElement.getAttribute('data-nntheme'),
             wrapBg:getComputedStyle(document.getElementById('canvaswrap')).backgroundColor,
             sideBg:getComputedStyle(document.getElementById('side')).backgroundColor,
             btnBg:getComputedStyle(document.getElementById('tl_draw')).backgroundColor,
             darkRatio:+(dark/tot).toFixed(2),
             btnTx:(document.getElementById('tl_night')||{className:''}).className };
  });
  ok('data-nntheme=dark', dk.attr==='dark');
  ok('作図面が暗い（画素の大半が暗色）', dk.darkRatio>0.8, '暗い画素 '+(dk.darkRatio*100)+'%');
  ok('右パネルも暗い', /rgb\(16, 26, 34\)/.test(dk.sideBg), dk.sideBg);
  ok('夜画面ボタンが点灯する', (dk.btnTx||'').includes('on'), dk.btnTx);   /* ★2026-08-16a */
  await p.screenshot({path:'th_dark.png'});
  // 保存されるか（再読み込み）
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(1200);
  ok('再読み込みしても夜モードのまま', await p.evaluate(()=>document.documentElement.getAttribute('data-nntheme')==='dark'));
  await p.evaluate(()=>nnSetTheme('light')); await p.waitForTimeout(300);
  await p.screenshot({path:'th_light.png'});
  ok('昼に戻せる', await p.evaluate(()=>document.documentElement.getAttribute('data-nntheme')==='light'));
  console.log(R.join('\n'));
  console.log(errs.length?'JSエラー:\n'+errs.join('\n'):'JSエラーなし');
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
