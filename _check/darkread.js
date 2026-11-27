/* 図面・積算：暗い画面（🌙）で、文字と背景の色の差（読みやすさ）が 2.5 未満の文字が無いか。PC・iPhone 13 × 平面図／割付図／断面図／3D（§1292）
   ★「下地（構造体）」の見出し（.httl）は平行四辺形の絵の上の文字なので除く。直す前の版では 屋根の表・戻る/進む・材料の見出しで★NG
   使い方: node _check/darkread.js [ファイル] */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const MEAS=()=>{
 const P=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const a=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return {r:a[0],g:a[1],b:a[2],a:a.length>3?a[3]:1};};
 const L=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)};
 const bgOf=e=>{let q=e;while(q&&q.nodeType===1){const s=getComputedStyle(q);if(s.backgroundImage&&s.backgroundImage!=='none')return null;const c=P(s.backgroundColor);if(c&&c.a>0.6)return c;q=q.parentElement;}return null;};
 const out=[];const seen=new Set();
 const cand=[...document.querySelectorAll('input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=color]),select,textarea')];
 const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=tw.nextNode())){if(n.nodeValue.trim().length>0&&n.parentElement)cand.push(n.parentElement);}
 for(const e of cand){if(seen.has(e))continue;seen.add(e);if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')continue;
  const r=e.getBoundingClientRect();if(r.width<4||r.height<4||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)continue;
  const s=getComputedStyle(e);if(s.visibility==='hidden'||+s.opacity<0.3)continue;
  if(/^(SCRIPT|STYLE|OPTION)$/.test(e.tagName)||e.closest('.httl'))continue;
  const fg=P(s.color);const bg=bgOf(e);if(!fg||!bg)continue;
  const l1=L(fg),l2=L(bg);const cr=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
  if(cr<2.5){let id='';let q=e;while(q&&!id){id=q.id;q=q.parentElement;}out.push((cr).toFixed(2)+' #'+id+' '+e.tagName+'.'+(typeof e.className==='string'?e.className.split(' ')[0]:'')+' 「'+(e.value||e.textContent||'').trim().slice(0,12)+'」 fg'+s.color+' bg'+JSON.stringify(bg));}
 }return out;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const F=process.argv[2]||'zumen_sekisan.html';let NG=0;
for(const [tag,o] of [['pc',{viewport:{width:1366,height:768}}],['sp',{...devices['iPhone 13'],deviceScaleFactor:1}]]){
const c=await b.newContext(o);await c.addInitScript(()=>localStorage.setItem('nn_zumen_theme','dark'));const p=await c.newPage();
await p.goto('http://localhost:8899/'+F);await p.waitForTimeout(1200);
await p.click('.zmPk[data-pick="zu"]');await p.waitForTimeout(600);await p.evaluate(()=>{ if(document.body.classList.contains('nn-zmenu')){ const g=document.querySelector('.zmGoB[data-go="zu"]'); if(g) g.click(); } });   /* ★2026-11-27 §1452 看板「平面図作成」はすぐ図面へ進む（設定の画面は通らない）。まだ入口に居るときだけ押す */await p.waitForTimeout(800);await p.evaluate(()=>{ const x=document.querySelector('#nnHajime.on [data-h="ten"]'); if(x) x.click(); });   /* §1429 はじめ方をえらぶ窓＝頂点打ち（今までのかき方）を選ぶ */await p.evaluate('loadSample()');
for(const t of ['zu','wf','sec','d3']){await p.evaluate(t=>setTab(t),t);await p.waitForTimeout(t==='d3'?3000:1200);
 const r=await p.evaluate(MEAS);if(r.length){NG++;console.log('★NG',tag,t,r.length+'件');r.slice(0,40).forEach(x=>console.log('   ',x));}else console.log('○',tag,t);}
await c.close();}
await b.close();console.log(NG?'★NG '+NG:'全部○');})();
