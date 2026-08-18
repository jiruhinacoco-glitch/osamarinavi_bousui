const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const p=await b.newPage({viewport:{width:1920,height:1080}});
 await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2400);
 console.log(await p.evaluate(()=>{
   const g=s=>{const e=document.querySelector(s); if(!e) return s+' : 無し';
     const c=getComputedStyle(e); return s+'  '+c.fontSize+' 太さ'+c.fontWeight+' 色'+c.color+' 「'+e.textContent.trim().slice(0,10)+'」';};
   const out=[g('.kpi h3'),g('.kpi .kh'),g('.kpi-card h3'),g('.httl'),g('.stchip.on')];
   // 見積済 の見出しらしき要素を探す
   const all=[...document.querySelectorAll('*')].filter(e=>e.children.length<=1 && /^見積済/.test(e.textContent.trim()));
   all.slice(0,4).forEach(e=>{const c=getComputedStyle(e);
     out.push('見積済<'+e.tagName+'.'+(e.className+'').slice(0,26)+'>  '+c.fontSize+' 太さ'+c.fontWeight+' 色'+c.color);});
   return out.join('\n');
 }));
 await b.close();})();
