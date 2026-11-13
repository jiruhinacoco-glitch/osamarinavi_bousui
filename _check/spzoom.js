/* スマホ表示の「拡大」の画面（全体の絵・屋根の番号）：縦で絵が小さくならない・指で拡大できる・横は横並び（2026-11-14i）。直す前の版では★NG。
   ・縦：絵の枠の上下に空きが無い（枠の高さ≒絵の高さ）／絵は画面の幅いっぱい／表も画面の中
   ・＋ を押すと絵が大きくなり、番号の丸は大きくならない
   ・拡大したまま番号を置くと、押した点の下に番号が来る（置いた割合を、自分で計算した値と突き合わせる）
   ・指で動かしたあとは、番号が置かれない（押したのと区別する）
   ・2本の指でつまむと拡大する
   ・横に倒すと、左に絵・右に表
   ・パソコンは今までどおり（＋－は出ない・絵は倍率1）
   使い方: node _check/spzoom.js [kirokucho_demo.html]   （http://localhost:8899 が要る） */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html'; let NG=0;
const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)NG++;};
/* 横長（16:9）の絵と屋根4つを入れる。番号はまだ置かない */
const SEED=()=>{const cv=document.createElement('canvas'); cv.width=1600; cv.height=900; const c=cv.getContext('2d'); c.fillStyle='#7aa0c8'; c.fillRect(0,0,1600,900); c.fillStyle='#fff'; for(let i=0;i<16;i++){c.fillRect(i*100,0,2,900);} for(let j=0;j<9;j++){c.fillRect(0,j*100,1600,2);}
  const url=cv.toDataURL('image/jpeg',0.8); const x=props[0]; const ko=nnKoList(x)[0].ko;
  x.areas=[['A棟：屋上',120],['A棟：塔屋',37],['B棟：屋上',80],['渡り廊下',20]].map(a=>({n:a[0],ko:ko,items:[{k:'平場',q:a[1],u:'㎡'}]}));
  window.nnPhoto2Of=()=>url; window.nnPropsSave=()=>{}; goProperty(x.id); nnRoofBig(x.id,'view');};
const M=p=>p.evaluate(()=>{const o=document.getElementById('nnCap'); if(!o) return null; const vw=document.documentElement.clientWidth,vh=document.documentElement.clientHeight;
  const R=s=>{const e=o.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height};};
  const pb=o.querySelector('.pinx > b'); const zm=o.querySelector('.capzm');
  return {vw,vh,ov:R(':scope')||(()=>{const r=o.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height};})(),img:R('.capw'),area:R('.caparea'),side:R('.capside'),pin:pb?pb.getBoundingClientRect().width:0,
    zm:zm?zm.getBoundingClientRect().width:0,pins:o.querySelectorAll('.pinx').length,msg:(o.querySelector('.capmsg')||{}).textContent||''};});
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
{const ctx=await b.newContext({...devices['iPhone 13']});
 await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(e){}});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1500);
 await p.evaluate(SEED); await p.waitForFunction(()=>{const w=document.querySelector('#nnCap .capw');return w&&w.getBoundingClientRect().width>100;},null,{timeout:5000}).catch(()=>{}); await p.waitForTimeout(300);
 let m=await M(p);
 ok(m&&m.img.w>=m.vw-20,'縦：絵が画面の幅いっぱい',m&&[Math.round(m.img.w),m.vw]);
 ok(m&&m.area.h-m.img.h<=6,'縦：絵の枠の上下に空きが無い（枠の高さ−絵の高さ ≦ 6px）',m&&[Math.round(m.area.h),Math.round(m.img.h)]);
 ok(m&&m.ov.y<=1&&m.ov.h>=m.vh-1,'縦：画面いっぱいに出ている（上のヘッダーのぶんも使う）',m&&[Math.round(m.ov.y),Math.round(m.ov.h),m.vh]);
 ok(m&&m.side.h>=m.vh*0.35&&m.side.y+m.side.h<=m.vh+1,'縦：下の表が画面の35%以上の高さで、画面の中',m&&[Math.round(m.side.y),Math.round(m.side.h)]);
 ok(m&&m.zm>0,'＋ － のボタンが出ている',m&&m.zm);
 /* 番号を置く状態にして、1つ置く（倍率1） */
 await p.evaluate(()=>document.querySelector('#nnCap [data-a="place"]').click()); await p.waitForTimeout(300); m=await M(p);
 ok(/下の表/.test(m.msg),'縦：案内の言葉が「下の表」',m.msg.slice(0,40));
 await p.touchscreen.tap(m.img.x+m.img.w*0.25,m.img.y+m.img.h*0.5); await p.waitForTimeout(300);
 let a0=await p.evaluate(()=>[props[0].areas[0].px,props[0].areas[0].py]);
 ok(Math.abs(a0[0]-0.25)<0.02&&Math.abs(a0[1]-0.5)<0.03,'倍率1：押した所（左から25%・上から50%）に1番が置かれる',a0);
 const pin1=(await M(p)).pin;
 /* ＋ を2回 → 絵が大きくなる・丸はそのまま */
 const w1=(await M(p)).img.w;
 await p.evaluate(()=>{const z=document.querySelector('#nnCap .capzm [data-z="1"]'); z.click(); z.click();}); await p.waitForTimeout(300); m=await M(p);
 ok(m.img.w>w1*2.3&&m.img.w<w1*2.8,'＋ を2回押すと絵が約2.56倍になる',[Math.round(w1),Math.round(m.img.w)]);
 ok(Math.abs(m.pin-pin1)<1,'拡大しても番号の丸は大きくならない',[pin1,m.pin]);
 ok(m.pins===1,'＋ を押しても番号は置かれない',m.pins);
 /* 拡大したまま置く：枠の真ん中から右へ60px・下へ30px を押す。絵は枠の真ん中にそろっているので、割合は自分で計算できる */
 {const cx=m.area.x+m.area.w/2+60, cy=m.area.y+m.area.h/2+30; const ex=0.5+60/m.img.w, ey=0.5+30/m.img.h;
  await p.touchscreen.tap(cx,cy); await p.waitForTimeout(300);
  const a1=await p.evaluate(()=>[props[0].areas[1].px,props[0].areas[1].py]);
  ok(a1[0]!=null&&Math.abs(a1[0]-ex)<0.01&&Math.abs(a1[1]-ey)<0.015,'拡大したまま：押した点の下に2番が置かれる',{置いた:a1,計算:[+ex.toFixed(4),+ey.toFixed(4)]});
  const pp=await p.evaluate(()=>{const bs=document.querySelectorAll('#nnCap .pinx > b'); const r=bs[bs.length-1].getBoundingClientRect(); return [r.left+r.width/2,r.top+r.height/2];});
  ok(Math.abs(pp[0]-cx)<8&&pp[1]<cy+8&&pp[1]>cy-45,'置いた番号の丸が、押した点のすぐ上に見えている',{丸:pp.map(Math.round),押した:[Math.round(cx),Math.round(cy)]});}
 /* 1本の指で動かす → 絵が動き、番号は増えない */
 {const cdp=await ctx.newCDPSession(p); m=await M(p); const sx=m.area.x+m.area.w/2, sy=m.area.y+m.area.h/2;
  const T=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map((q,i)=>({x:q[0],y:q[1],id:i}))});
  await T('touchStart',[[sx,sy]]); for(let i=1;i<=6;i++) await T('touchMove',[[sx-i*15,sy]]); await T('touchEnd',[]); await p.waitForTimeout(300);
  const m2=await M(p);
  ok(m2.img.x<m.img.x-60,'拡大中に指で左へ動かすと、絵が左へ動く',[Math.round(m.img.x),Math.round(m2.img.x)]);
  ok(m2.pins===2,'指で動かしたあとは、番号が置かれない（2つのまま）',m2.pins);
  ok(m2.img.x+m2.img.w>=m2.area.x+m2.area.w-2&&m2.img.x<=m2.area.x+2,'動かしても、絵のはしより外（空き）は見えない',[Math.round(m2.img.x),Math.round(m2.img.x+m2.img.w),Math.round(m2.area.x+m2.area.w)]);
  /* － で1倍へ → 2本の指でつまんで広げる */
  await p.evaluate(()=>{const z=document.querySelector('#nnCap .capzm [data-z="-1"]'); z.click(); z.click(); z.click();}); await p.waitForTimeout(200); m=await M(p);
  ok(Math.abs(m.img.w-w1)<2,'－ で元の大きさに戻る',[Math.round(w1),Math.round(m.img.w)]);
  const y0=m.area.y+m.area.h/2;
  await T('touchStart',[[sx-30,y0],[sx+30,y0]]); for(let i=1;i<=6;i++) await T('touchMove',[[sx-30-i*10,y0],[sx+30+i*10,y0]]); await T('touchEnd',[]); await p.waitForTimeout(300);
  const m3=await M(p);
  ok(m3.img.w>w1*2.5&&m3.img.w<w1*3.5,'2本の指を 60px→180px に広げると、絵が約3倍になる',[Math.round(w1),Math.round(m3.img.w)]);
  ok(m3.pins===2,'つまんだあとも、番号は置かれない',m3.pins);}
 /* 横に倒す */
 await p.setViewportSize({width:844,height:390}); await p.waitForTimeout(700); m=await M(p);
 ok(m.side.x>=m.area.x+m.area.w-2&&Math.abs(m.side.y-m.area.y)<4,'横：左に絵・右に表',{area:[Math.round(m.area.x),Math.round(m.area.w)],side:[Math.round(m.side.x),Math.round(m.side.w)]});
 ok(m.area.h>=m.vh*0.6,'横：絵の枠が画面の高さの6割以上',[Math.round(m.area.h),m.vh]);
 ok(m.side.x+m.side.w<=m.vw+1&&m.area.y+m.area.h<=m.vh+1,'横：画面からはみ出さない',[Math.round(m.side.x+m.side.w),m.vw]);
 ok(errs.length===0,'エラーが出ていない（スマホ）',errs.slice(0,3));
 await ctx.close();}
{const ctx=await b.newContext({viewport:{width:1583,height:790}}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1500);
 await p.evaluate(SEED); await p.waitForFunction(()=>{const w=document.querySelector('#nnCap .capw');return w&&w.getBoundingClientRect().width>100;},null,{timeout:5000}).catch(()=>{}); await p.waitForTimeout(300);
 const m=await M(p);
 ok(m&&m.zm===0,'パソコン：＋ － は出ない',m&&m.zm);
 ok(m&&m.side.x>m.area.x+m.area.w-2&&m.ov.y>20&&(Math.abs(m.img.w-m.area.w)<4||Math.abs(m.img.h-m.area.h)<4),'パソコン：今までどおり（左に絵・右に表・ヘッダーの下・絵は枠に合わせた大きさ）',m&&{ovY:Math.round(m.ov.y),img:[Math.round(m.img.w),Math.round(m.img.h)],area:[Math.round(m.area.w),Math.round(m.area.h)]});
 await p.evaluate(()=>document.querySelector('#nnCap [data-a="place"]').click()); await p.waitForTimeout(200);
 const m9=await M(p);   /* 案内の帯が出て絵の位置が下がるので、測り直してから押す */
 await p.mouse.click(m9.img.x+m9.img.w*0.4,m9.img.y+m9.img.h*0.6); await p.waitForTimeout(300);
 const a=await p.evaluate(()=>[props[0].areas[0].px,props[0].areas[0].py]);
 ok(a[0]!=null&&Math.abs(a[0]-0.4)<0.01&&Math.abs(a[1]-0.6)<0.01,'パソコン：マウスで押した所に番号が置かれる',a);
 ok(errs.length===0,'エラーが出ていない（パソコン）',errs.slice(0,3));
 await ctx.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'すべて○'); process.exit(NG?1:0);
})();
