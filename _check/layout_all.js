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
    const r=document.createRange();r.selectNodeContents(n);const rs=[...r.getClientRects()].filter(q=>q.width>1&&q.height>1);if(!rs.length)continue;if(!vis(el))continue;texts.push({el,rs,t:n.nodeValue.trim().slice(0,14)});}
  const desc=e=>{let s=e.tagName.toLowerCase();if(e.id)s+='#'+e.id;else if(e.className&&typeof e.className==='string')s+='.'+e.className.trim().split(/\s+/)[0];return s;};
  // 上に何か被さっているか（重なりを見た目で確かめる）
  const topAt=(x,y)=>document.elementFromPoint(x,y);
  const over=[];
  for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){const A=texts[i],B=texts[j];if(A.el===B.el)continue;
    for(const a of A.rs)for(const b of B.rs){const ix=Math.min(a.right,b.right)-Math.max(a.left,b.left),iy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
      if(ix>3&&iy>Math.min(a.height,b.height)*0.35){const cx=(Math.max(a.left,b.left)+Math.min(a.right,b.right))/2,cy=(Math.max(a.top,b.top)+Math.min(a.bottom,b.bottom))/2;
        if(cy<0||cy>document.documentElement.clientHeight*3)continue;
        // 片方が不透明な面の下に完全に隠れている（重ね窓の下）ものは除外：点で上にある要素が A か B の祖先/子孫なら重なり
        const t=cy>=0&&cy<document.documentElement.clientHeight?topAt(cx,cy):null;
        const hitA=t&&(A.el.contains(t)||t.contains(A.el)),hitB=t&&(B.el.contains(t)||t.contains(B.el));
        if(t&&!(hitA||hitB))continue;
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
    const extra=r.height-th;if(extra>Math.max(14,th*0.9))pad.push(desc(el)+'「'+el.textContent.trim().slice(0,10)+'」高'+Math.round(r.height)+'/字'+Math.round(th));}
  // 枠からのはみ出し：線で囲んだ枠（overflow:visible）から、中の文字が外へ出ている
  const spill=[];const seen=new Set();
  for(const T of texts){for(let e=T.el.parentElement;e&&e!==document.body;e=e.parentElement){const s=getComputedStyle(e);
      if(s.overflowX!=='visible'||s.overflowY!=='visible')break;
      if(parseFloat(s.borderRightWidth)<1||parseFloat(s.borderLeftWidth)<1)continue;
      const R=e.getBoundingClientRect();if(R.width<40)continue;
      if(T.rs.some(q=>q.right>R.right+3||q.left<R.left-3)){if(!seen.has(e)){seen.add(e);spill.push(desc(e)+'←「'+T.t+'」('+desc(T.el)+')');}}
      break;}}
  return {spill,hover:document.documentElement.scrollWidth-W,over:[...new Set(over)],clip,pad};
};
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const dev of ['pc','sp']){
    const ctx=await b.newContext(dev==='pc'?{viewport:{width:1440,height:900}}:{viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
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
      ok(!m.spill.length,tag+' 枠から文字がはみ出さない '+m.spill.slice(0,8).join(' / ')+(m.spill.length>8?' …他'+(m.spill.length-8):''));
      ok(!m.pad.length,tag+' 枠の上下に余分な余白なし '+m.pad.slice(0,8).join(' / ')+(m.pad.length>8?' …他'+(m.pad.length-8):''));
      await p.close();
    }
    await ctx.close();
  }
  await b.close();console.log(ng?'★NG '+ng+'件':'全項目○');
})();
