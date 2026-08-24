const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const p=await b.newPage({viewport:{width:1920,height:1080}});
 await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2400);
 console.log(await p.evaluate(()=>{
   const Z=window.nnPZ||1, out=[];
   const kgh=[...document.querySelectorAll('.kgh')][0];
   // 「見積済」の文字だけの幅を測る（Range で文字ノードの箱を取る）
   const meas=(el,label)=>{
     const t=[...el.childNodes].find(n=>n.nodeType===3 && n.textContent.trim());
     const r=document.createRange(); r.selectNodeContents(t||el);
     const b=r.getBoundingClientRect(); const c=getComputedStyle(el);
     out.push(label+'  指定'+c.fontSize+' 太さ'+c.fontWeight+'  実際の行の高さ'+(b.height/Z).toFixed(1)+'px  「'+(t?t.textContent:el.textContent).trim().slice(0,10)+'」');
   };
   if(kgh) meas(kgh,'見積済の帯(.kgh)');
   meas(document.querySelector('.httl'),'見出し(.httl)  ');
   out.push('zoom='+Z);
   return out.join('\n');
 }));
 await b.close();})();
