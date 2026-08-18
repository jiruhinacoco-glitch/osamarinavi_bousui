const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1200,height:900}});
  const bad=[]; p.on('response',r=>{ if(r.status()>=400 && !/icon_zumen|\/def_|\/hou_/.test(r.url())) bad.push(r.status()+' '+r.url().split('/').pop()); });
  const reqs=[]; p.on('request',r=>{ if(/frame_c_/.test(r.url())) reqs.push(r.url().split('/').pop()); });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2500);
  const d=await p.evaluate(()=>{
    const e=document.querySelector('#dashboard .dpanel'), c=getComputedStyle(e,'::before');
    const cs=getComputedStyle(e);
    return {imgs:(c.backgroundImage.match(/frame_c_\w+\.png\?v=[\d\-a-z]+/g)||[]),
      size:c.backgroundSize, pad:cs.padding, br:cs.borderRadius,
      cw:parseFloat(getComputedStyle(e).getPropertyValue('--cs')||0)};
  });
  console.log('読みに行った角の絵:',[...new Set(reqs)]);
  console.log('CSSで使っている絵:',d.imgs);
  console.log('大きさ',d.size,' 余白',d.pad,' 丸み',d.br);
  console.log('404など:',bad.length?bad:'なし',' JSエラー:',errs.length?errs:'なし');
  console.log(d.imgs.length===4 && [...new Set(reqs)].length===4 && bad.length===0 && errs.length===0 ? '○ 四隅とも版名つきで読めている' : '★NG');
  await b.close();
})();
