/* 図面・積算：「保存」「保存済データを開く」「⋯ その他」を開いたとき、色の差 2.5 未満の文字が無いか（§1297）。PC・iPhone 13。
   明るい画面（既定）／ TH=dark で暗い画面。直す前の版では「保存する」ボタン（白地に白い文字）で★NG。使い方: [TH=dark] node _check/dlgread.js [ファイル] */
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
const c=await b.newContext(o);await c.addInitScript(TH=>localStorage.setItem('nn_zumen_theme',TH),process.env.TH||'light');const p=await c.newPage();
await p.goto('http://localhost:8899/'+F);await p.waitForTimeout(1200);
await p.click('.zmPk[data-pick="zu"]');await p.waitForTimeout(600);await p.click('.zmGoB[data-go="zu"]');await p.waitForTimeout(800);await p.evaluate(()=>{ const x=document.querySelector('#nnHajime.on [data-h="ten"]'); if(x) x.click(); });   /* §1429 はじめ方をえらぶ窓＝頂点打ち（今までのかき方）を選ぶ */await p.evaluate('loadSample()');
for(const t of ['save','open','more']){await p.evaluate(()=>{document.querySelectorAll('.modal,.dlg,[role=dialog]').forEach(()=>{});try{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))}catch(_){}});
 await p.evaluate(t=>{const id={save:'tl_save',open:'tl_open'}[t];if(id){const e=document.getElementById(id);e&&e.click();}else{const e=[...document.querySelectorAll('button')].filter(x=>x.offsetParent).find(x=>/その他/.test(x.textContent||''));e&&e.click();}},t);await p.waitForTimeout(1500);
 let r=[];for(let k=0;k<6;k++){r=r.concat(await p.evaluate(MEAS));await p.evaluate(k=>{const s=[...document.querySelectorAll('aside,#side,.panel,#nnHelp .card,#nnHelp')].find(x=>x.offsetParent&&x.scrollHeight>x.clientHeight+20);if(s)s.scrollTop+=s.clientHeight*0.8;},k);await p.waitForTimeout(250);}r=[...new Set(r)];if(r.length){NG++;console.log('★NG',tag,t,r.length+'件');r.slice(0,200).forEach(x=>console.log('   ',x));}else console.log('○',tag,t);}
await c.close();}
await b.close();console.log(NG?'★NG '+NG:'全部○');})();
