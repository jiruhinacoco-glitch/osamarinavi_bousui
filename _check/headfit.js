const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  await p.goto('http://localhost:8899/_land.html'); await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1500);
  /* 物件名を省略なしにしたときに必要な幅を全100件で測る */
  console.log(JSON.stringify(await p.evaluate(()=>{
    document.querySelectorAll('#list .pcard').forEach(c=>c.classList.remove('nnoff'));
    const st=document.createElement('style');
    st.textContent='#list .pcard .rhead .ebox.ttl{flex:0 0 auto !important; overflow:visible !important; text-overflow:clip !important;}';
    document.head.appendChild(st);
    document.body.offsetHeight;
    let worst=null, list=[];
    document.querySelectorAll('#list .pcard').forEach(c=>{
      const h=c.querySelector('.rhead'); const hb=h.getBoundingClientRect();
      const need=[...h.children].reduce((s,e)=>s+e.getBoundingClientRect().width,0)+6*4;
      const over=need-hb.width;
      list.push({n:c.querySelector('.ebox.ttl').textContent, need:Math.round(need), over:Math.round(over)});
    });
    list.sort((a,b)=>b.over-a.over);
    const parts={};
    const h0=document.querySelector('#list .pcard .rhead');
    [...h0.children].forEach(e=>parts[e.className.split(' ').slice(0,2).join('.')]=Math.round(e.getBoundingClientRect().width));
    return {avail:Math.round(h0.getBoundingClientRect().width), parts, worst3:list.slice(0,3), fit:list.filter(x=>x.over<=0).length, total:list.length};
  }),null,1));
  await b.close();
})();
