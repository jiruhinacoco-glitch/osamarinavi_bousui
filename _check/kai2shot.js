const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1900,height:960}})).newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1600);
  await p.evaluate(()=>{ showView('list'); });
  await p.waitForTimeout(700);
  /* 写真を数枚入れた状態も見る */
  await p.evaluate(()=>{
    const C=['#7aa6d6','#d6a97a','#8fbf8a','#c98f8f','#9a8fc9'];
    const mk=(t,c)=>{const cv=document.createElement('canvas');cv.width=160;cv.height=120;
      const x=cv.getContext('2d');x.fillStyle=c;x.fillRect(0,0,160,120);
      x.fillStyle='#fff';x.font='700 22px sans-serif';x.textAlign='center';x.fillText(t,80,66);return cv.toDataURL('image/png');};
    props[0].files.push(...C.map((c,i)=>({cat:'photo',url:mk('現場'+(i+1),c),name:'写真'+(i+1),date:'2026/08/13',size:9})));
    render();
  });
  await p.waitForTimeout(600);
  await p.screenshot({path:'kai2_full.png'});
  const el=await p.$('#list .pcard'); await el.screenshot({path:'kai2_card.png'});
  await b.close(); console.log('saved');
})();
