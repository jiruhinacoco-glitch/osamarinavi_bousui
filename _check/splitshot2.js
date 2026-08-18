const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/user/osamarinavi_bousui/zumen_sekisan.html'); await p.waitForTimeout(1200);
await p.evaluate(()=>{ loadSample(); nnSplitToggle(); }); await p.waitForTimeout(6000);
const r=await p.evaluate(()=>{
  const tw=document.getElementById('three-wrap');
  const cv3=tw.querySelector('canvas');
  const o={hasCanvas:!!cv3};
  if(cv3){ const b=cv3.getBoundingClientRect(); o.rect=[Math.round(b.width),Math.round(b.height)];
    o.buf=[cv3.width,cv3.height];
    try{ const c2=document.createElement('canvas'); c2.width=200;c2.height=120;
      const x=c2.getContext('2d'); x.drawImage(cv3,0,0,cv3.width,cv3.height,0,0,200,120);
      const d=x.getImageData(0,0,200,120).data; const set=new Set();
      for(let i=0;i<d.length;i+=16)set.add(d[i]+'-'+d[i+1]+'-'+d[i+2]);
      o.colors=set.size; }catch(e){ o.colors='err '+e.message; } }
  o.groupN = (typeof T!=='undefined'&&T&&T.group)? T.group.children.length : -1;
  return o;
});
console.log(JSON.stringify(r), 'errs:', errs.join('|'));
await p.screenshot({path:'splitshot2.png'});
await b.close();})();
