const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:900}});
await p.goto('file:///home/user/osamarinavi_bousui/index.html'); await p.waitForTimeout(700);
console.log(await p.evaluate(()=>{
  const o={};
  document.querySelectorAll('.qbtn').forEach(bt=>{
    const k=bt.querySelector('.lbl').textContent.trim();
    const w=bt.querySelector('.icwrap').getBoundingClientRect();
    const i=bt.querySelector('img').getBoundingClientRect();
    o[k]={icwrap:[Math.round(w.width),Math.round(w.height)], img:[Math.round(i.width),Math.round(i.height)]};
  });
  const m=document.getElementById('menuBtn').getBoundingClientRect();
  o.menu=[Math.round(m.width),Math.round(m.height)];
  return o;
}));
// 拡大して撮る
await p.evaluate(()=>{document.querySelector('.quick').style.zoom=6;});
await p.waitForTimeout(300);
const el=await p.$('.quick'); await el.screenshot({path:'old_qbtn.png'});
await b.close();})();
