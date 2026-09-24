/* 全11画面×PC/スマホ：文字の重なり・文字の見切れ・横はみ出し・枠の上下の余分な余白を実測
   使い方: node _check/layout_all.js [ページ名...]   SHOT=dir で画面画像も保存 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ALL=['index','kirokucho_demo','zumen_sekisan','genba_map_v36','hacchu','kokkosho','camera','library','shiyo_toroku','yougo','zairyo_toroku'];
const pages=process.argv.slice(2).length?process.argv.slice(2):ALL;
let ng=0; const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m); if(!c)ng++;};
const MEASURE=()=>{
  const vis=el=>{for(let e=el;e&&e.nodeType===1;e=e.parentElement){const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false;}return true;};
  const W=document.documentElement.clientWidth;
  const texts=[];const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let n;while((n=tw.nextNode())){if(!n.nodeValue.trim())continue;const el=n.parentElement;if(!el||/^(SCRIPT|STYLE|NOSCRIPT|OPTION|TEXTAREA)$/.test(el.tagName))continue;
    const r=document.createRange();r.selectNodeContents(n);let rs=[...r.getClientRects()].filter(q=>q.width>1&&q.height>1);if(!rs.length)continue;if(!vis(el))continue;
    /* スクロール枠・overflow:hidden の枠で見えていない部分は重なりに数えない（枠で切った後の見えている範囲だけ） */
    let cl={left:-1e9,top:-1e9,right:1e9,bottom:1e9};
    for(let e=el;e&&e!==document.body;e=e.parentElement){const s=getComputedStyle(e);if(s.overflowX!=='visible'||s.overflowY!=='visible'){const R=e.getBoundingClientRect();cl={left:Math.max(cl.left,R.left),top:Math.max(cl.top,R.top),right:Math.min(cl.right,R.right),bottom:Math.min(cl.bottom,R.bottom)};}}
    const vr=rs.map(q=>({left:Math.max(q.left,cl.left),top:Math.max(q.top,cl.top),right:Math.min(q.right,cl.right),bottom:Math.min(q.bottom,cl.bottom)})).map(q=>Object.assign(q,{width:q.right-q.left,height:q.bottom-q.top})).filter(q=>q.width>1&&q.height>1);
    texts.push({el,rs,vr,t:n.nodeValue.trim().slice(0,14)});}
  const desc=e=>{let s=e.tagName.toLowerCase();if(e.id)s+='#'+e.id;else if(e.className&&typeof e.className==='string')s+='.'+e.className.trim().split(/\s+/)[0];return s;};
  // 上に何か被さっているか（重なりを見た目で確かめる）
  const topAt=(x,y)=>document.elementFromPoint(x,y);
  const over=[];
  for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){const A=texts[i],B=texts[j];if(A.el===B.el)continue;
    for(const a of A.vr)for(const b of B.vr){const ix=Math.min(a.right,b.right)-Math.max(a.left,b.left),iy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
      if(ix>3&&iy>Math.min(a.height,b.height)*0.35){const cx=(Math.max(a.left,b.left)+Math.min(a.right,b.right))/2,cy=(Math.max(a.top,b.top)+Math.min(a.bottom,b.bottom))/2;
        if(cy<0||cy>document.documentElement.clientHeight*3)continue;
        // 片方が不透明な面の下に完全に隠れている（重ね窓の下）ものは除外：点で上にある要素が A か B の祖先/子孫なら重なり
        const t=cy>=0&&cy<document.documentElement.clientHeight?topAt(cx,cy):null;
        const hitA=t&&(A.el.contains(t)||t.contains(A.el)),hitB=t&&(B.el.contains(t)||t.contains(B.el));
        if(t&&!(hitA||hitB))continue;
        /* 片方が丸ごと別の窓の下に隠れている（入口画面の下のツールバーなど）なら、見た目の重なりではない */
        const VA=document.documentElement.clientWidth*document.documentElement.clientHeight;
        const own=(T,q)=>{const x=(q.left+q.right)/2,y=(q.top+q.bottom)/2;if(y<0||y>document.documentElement.clientHeight||x<0||x>document.documentElement.clientWidth)return true;const h=topAt(x,y);if(!h)return true;if(T.el.contains(h)||h.contains(T.el))return true;
          /* 上にあるのが画面の4割以上をおおう窓（入口画面・重ね窓）なら「隠れている」。小さな部品が乗っているなら重なり */
          for(let e=h;e&&e!==document.body;e=e.parentElement){const p=getComputedStyle(e).position;if(p==='fixed'||p==='absolute'){const R=e.getBoundingClientRect();if(R.width*R.height>VA*0.4)return false;}}
          return true;};
        if(!own(A,a)&&!own(A,A.vr[0]))continue; if(!own(B,b)&&!own(B,B.vr[0]))continue;
        over.push(`「${A.t}」(${desc(A.el)})×「${B.t}」(${desc(B.el)}) @${Math.round(cx)},${Math.round(cy)}`);}
    }}
  // 見切れ
  const clip=[];
  for(const el of document.querySelectorAll('body *')){if(!el.firstChild||el.children.length>3)continue;const s=getComputedStyle(el);
    if(!/hidden|clip/.test(s.overflowX+s.overflowY))continue;if(s.textOverflow==='ellipsis')continue;if(!vis(el))continue;
    const own=[...el.childNodes].some(c=>c.nodeType===3&&c.nodeValue.trim());if(!own)continue;
    if(el.scrollWidth>el.clientWidth+2&&el.clientWidth>0&&/hidden|clip/.test(s.overflowX)||el.scrollHeight>el.clientHeight+3&&el.clientHeight>0&&/hidden|clip/.test(s.overflowY))clip.push(desc(el)+'「'+el.textContent.trim().slice(0,14)+'」'+el.scrollWidth+'/'+el.clientWidth+'×'+el.scrollHeight+'/'+el.clientHeight);}
  // 枠の上下の余分な余白（ボタン・札・入力）
  const pad=[];
  for(const el of document.querySelectorAll('button,.btn,[class*="tag"],[class*="chip"],[class*="badge"],a[class],label[class],select')){if(!vis(el))continue;const r=el.getBoundingClientRect();if(r.height<14||r.height>90||r.width<10)continue;
    if(el.querySelector('img,svg,canvas'))continue;const txt=el.tagName==='SELECT'?null:el;let th=0;
    if(txt){const rg=document.createRange();rg.selectNodeContents(el);const rs=[...rg.getClientRects()].filter(q=>q.width>1);if(!rs.length)continue;th=Math.max(...rs.map(q=>q.bottom))-Math.min(...rs.map(q=>q.top));}else continue;
    /* 余白＝上下の padding と、中身より枠が高いぶん（min-height など）。枠線の太さは余白に数えない */
    const cs=getComputedStyle(el),bw=parseFloat(cs.borderTopWidth)+parseFloat(cs.borderBottomWidth);
    const extra=r.height-th-bw;if(extra>Math.max(12,th*0.8))pad.push(desc(el)+'「'+el.textContent.trim().slice(0,10)+'」高'+Math.round(r.height)+'/字'+Math.round(th));}
  // 枠からのはみ出し：線で囲んだ枠（overflow:visible）から、中の文字が外へ出ている
  const spill=[];const seen=new Set();
  for(const T of texts){for(let e=T.el.parentElement;e&&e!==document.body;e=e.parentElement){const s=getComputedStyle(e);
      if(s.overflowX!=='visible'||s.overflowY!=='visible')break;
      if(parseFloat(s.borderRightWidth)<1||parseFloat(s.borderLeftWidth)<1)continue;
      const R=e.getBoundingClientRect();if(R.width<40)continue;
      if(T.rs.some(q=>q.right>R.right+3||q.left<R.left-3)){if(!seen.has(e)){seen.add(e);spill.push(desc(e)+'←「'+T.t+'」('+desc(T.el)+')');}}
      break;}}
  // 親の枠で文字が切れる（overflow:hidden の親からはみ出した文字。…で省略しているものは除く）
  const cut=[];const seenC=new Set();
  for(const T of texts){for(let e=T.el;e&&e!==document.body;e=e.parentElement){const s=getComputedStyle(e);
      if(s.overflowX==='visible'&&s.overflowY==='visible')continue;
      if(/auto|scroll/.test(s.overflowX+s.overflowY))break;
      if(s.textOverflow==='ellipsis'||getComputedStyle(T.el).textOverflow==='ellipsis')break;
      if(s.webkitLineClamp&&s.webkitLineClamp!=='none')break;
      const R=e.getBoundingClientRect();if(R.width<20||R.height<8)break;
      /* 丸ごと枠の外＝閉じた引き出し（わざと隠している）。一部だけ外に出ているものが「切れている」 */
      if(T.rs.some(q=>(q.right>R.right+2&&q.left<R.right-2)||(q.left<R.left-2&&q.right>R.left+2))&&!seenC.has(T.el)){seenC.add(T.el);cut.push('「'+T.t+'」('+desc(T.el)+')が'+desc(e)+'で切れる');}
      break;}}
  return {cut,spill,hover:document.documentElement.scrollWidth-W,over:[...new Set(over)],clip,pad};
};
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  /* pc＝PC／sp＝スマホ縦／spl＝スマホ横。DEV=sp,spl のように絞れる */
  const DEVS=(process.env.DEV||'pc,sp,spl').split(',');
  const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
  for(const dev of DEVS){
    const ctx=await b.newContext(dev==='pc'?{viewport:{width:1440,height:900}}:
      {viewport:dev==='spl'?{width:852,height:393}:{width:+(process.env.W||393),height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:UA});
    /* VM=mobile：現場記録帳・国交省などの「スマホ表示」で測る。W=375 のように幅も変えられる */
    if(process.env.VM==='mobile')await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
    for(const pg of pages){
      const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
      try{await p.goto('http://localhost:8899/'+pg+'.html',{waitUntil:'load',timeout:30000});}catch(e){errs.push('load '+e.message.slice(0,60));}
      await p.waitForTimeout(1500);
      const m=await p.evaluate(MEASURE);
      if(process.env.SHOT)await p.screenshot({path:`${process.env.SHOT}/${pg}_${dev}.png`});
      const tag=`[${dev}] ${pg}`;
      ok(!errs.length,tag+' 実行エラーなし '+errs.join(' | '));
      ok(m.hover<=1,tag+' 横はみ出しなし '+m.hover+'px');
      ok(!m.over.length,tag+' 文字の重なりなし '+m.over.slice(0,8).join(' / ')+(m.over.length>8?' …他'+(m.over.length-8):''));
      ok(!m.clip.length,tag+' 文字の見切れなし '+m.clip.slice(0,8).join(' / ')+(m.clip.length>8?' …他'+(m.clip.length-8):''));
      ok(!m.cut.length,tag+' 文字が親の枠で切れない '+m.cut.slice(0,8).join(' / ')+(m.cut.length>8?' …他'+(m.cut.length-8):''));
      ok(!m.spill.length,tag+' 枠から文字がはみ出さない '+m.spill.slice(0,8).join(' / ')+(m.spill.length>8?' …他'+(m.spill.length-8):''));
      ok(!m.pad.length,tag+' 枠の上下に余分な余白なし '+m.pad.slice(0,8).join(' / ')+(m.pad.length>8?' …他'+(m.pad.length-8):''));
      await p.close();
    }
    await ctx.close();
  }
  await b.close();console.log(ng?'★NG '+ng+'件':'全項目○');
})();
