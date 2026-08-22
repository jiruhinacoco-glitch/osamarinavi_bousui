const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PH=process.argv.includes('ph');
let ng=0; const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:EXE,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:1600,height:900}});
if(PH)await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.waitForTimeout(1200);
// 断面タブへ
await p.evaluate(()=>setTab('sec'));
await p.waitForTimeout(1200);
const sd=await p.evaluate(()=>{
  const ids=['sd_draw','sd_edit','sd_pan','sd_undo','sd_redo','sd_zin','sd_zout','sd_cell','sd_dim','sd_sample','sd_clear','sec_3d','sec_theme'];
  const o={};
  ids.forEach(i=>{const b=document.getElementById(i); o[i]=b?{img:!!b.querySelector('img.tbi'),hasimg:b.classList.contains('hasimg'),tx:(b.querySelector('.tbtx')||{}).textContent||''}:null;});
  return o;
});
const miss=Object.keys(sd).filter(k=>!sd[k]||!sd[k].hasimg);
ok(miss.length===0,'断面バー・3Dで見る・画面に絵が付いた',miss);
ok(sd.sd_clear&&!/^[^ぁ-んァ-ヶー一-龯A-Za-z0-9]/.test(sd.sd_clear.tx||'x'),'絵が付いたら先頭の絵文字は消える',{clear:sd.sd_clear&&sd.sd_clear.tx,dim:sd.sd_dim&&sd.sd_dim.tx});
// マスの数値は残る
const cell=await p.evaluate(()=>{document.getElementById('sd_cell').click();return (document.querySelector('#sd_cell .tbtx')||{}).textContent;});
ok(/mm|m$/.test(cell||''),'▦マスは数値の文字が残る（絵が付いても）',cell);
// 押し出し（3Dタブ）
await p.evaluate(()=>setTab('d3'));
await p.waitForTimeout(2500);
const ext=await p.evaluate(()=>{const b=document.getElementById('d3ext');return b?{img:!!b.querySelector('img.tbi'),hasimg:b.classList.contains('hasimg'),tx:(b.querySelector('.tbtx')||{}).textContent||''}:null;});
ok(ext&&ext.hasimg,'3Dの「押し出し」に絵が付いた',ext);
// 押せるか（絵は当たり判定を奪わない）
const clickable=await p.evaluate(()=>{const b=document.getElementById('d3ext');const r=b.getBoundingClientRect();const Z=window.nnPZ||1;
  const el=document.elementFromPoint((r.left+r.width/2), (r.top+r.height/2)); return !!(el&&(el===b||b.contains(el)));});
ok(clickable,'絵を置いてもボタンは押せる');
// 3Dパッドは8個とも絵のまま
const pad=await p.evaluate(()=>[...document.querySelectorAll('#d3pad button')].map(b=>({id:b.id,img:!!b.querySelector('img.d3bi')})));
ok(pad.length===8&&pad.every(x=>x.img),'3Dパッドは今までどおり8個とも絵',pad.filter(x=>!x.img));
ok(errs.length===0,'JSエラーなし',errs);
await b.close(); process.exit(ng?1:0);
})();
