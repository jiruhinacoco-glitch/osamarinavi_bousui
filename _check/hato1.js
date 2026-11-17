/* 役物の見本「鳩小屋」5つの型と「たての角（面取り・丸み）」（§1306）。
   ①5つの型：防水・入隅・端末・開口まわり・配管の根元を、検査の中で寸法から自分で計算した値と照合
   ②たての角：角形を丸み120にすると、周り＝2(W+D)−(8−2π)R・天端＝WD−(4−π)R² に（形から出した面積が1%以内）／面取りも同様
   ③PC・iPhone 13 で 型の切替・入力欄の切れ・横はみ出し・JSエラー0
   使い方: node _check/hato1.js [kadai_mihon.html]   前提: python3 -m http.server 8899 */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kadai_mihon.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const near=(a,b,t)=>Math.abs(a-b)<=(t||0.011);
/* 検算（寸法から自分で） */
function calc(d){ const W=d.W/1e3,D=d.D/1e3,H=d.H/1e3, per=2*(W+D), ar=W*D, ko=!!d.koshi, Hb=ko?d.Hb/1e3:0, Bo=ko?d.Bo/1e3:0;
  const Wb=W+2*Bo, Db=D+2*Bo, perK=2*(Wb+Db), cover=d.cap===2;
  const hp=(d.hp===3&&d.cap!==1)?0:d.hp, kino=hp===3;
  const hb=cover?0:((hp===0||kino)?(ko?0:Math.min(d.up,d.H)/1e3):H);
  let wp=(ko?perK*Hb+(cover?Wb*Db:Math.max(0,Wb*Db-ar)):0)+per*hb;
  if((hp===2||kino)&&d.cap===1){ const O=d.O/1e3, TC=d.TC/1e3, cw=W+2*O, cd=D+2*O; wp+=cw*cd+(cw*cd-ar)+2*(cw+cd)*TC; }   /* 笠（キノコ）：天端＋下面＋鼻 */
  if(d.op===3){ const ow=d.ow/1e3, oh=d.oh/1e3; wp-=ow*Math.max(0,Math.min(hb,0.15+oh)-0.15); }
  return {wp, iri:ko?perK:per, tl:(cover||hp===2)?0:per, tc:kino?per:0, op:(d.op>0&&d.op<4)?2*(d.ow+d.oh)/1e3:0, pipes:d.op===4?d.np:0}; }
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [tag,opt] of [['PC',{viewport:{width:1366,height:820}}],['iPhone',{...devices['iPhone 13']}]]){
  const p=await (await b.newContext(opt)).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(1500);
  const has=await p.$('#cats button[data-c="hato"]'); ok(!!has, tag+' 「鳩小屋」のタブがある'); if(!has){ continue; }
  await p.click('#cats button[data-c="hato"]'); await p.waitForTimeout(300);
  const ids=await p.$$eval('#types button',bs=>bs.map(x=>x.dataset.t)); ok(ids.length>=5, tag+' 鳩小屋の型が5つ以上', ids);
  for(const id of ids){
   await p.click('#types button[data-t="'+id+'"]'); await p.waitForTimeout(400);
   const r=await p.evaluate(()=>{ const q=partOf(), d=JSON.parse(JSON.stringify(P())), t=document.getElementById('qty').innerText;
     const W=document.documentElement.clientWidth, cut=[...document.querySelectorAll('#form input,#form button')].filter(e=>{ const z=e.getBoundingClientRect(); return z.width>0&&(z.right>W+0.5||z.left<-0.5); }).length;
     const lay=document.getElementById('dimLay'), V=document.getElementById('view').getBoundingClientRect(), sp=lay?[...lay.children].filter(x=>x.style.display!=='none'):[];
     const dimOk=sp.length>0&&sp.some(x=>x.textContent==='幅 '+d.W)&&sp.some(x=>x.textContent==='奥行 '+d.D)&&sp.some(x=>x.textContent==='本体の高さ '+d.H);
     return {q, d, t, cut, sx:document.documentElement.scrollWidth-W, dims:sp.length, dimOk}; });
   const c=calc(r.d), get=(re)=>+((r.t.match(re)||[0,'NaN'])[1]);
   const tcap=get(/端末（笠の下[^）]*）\s*([\d.]+)/), iri=get(/平場との入隅\s*([\d.]+)/), tl=get(/端末（[^）]*）\s*([\d.]+)/), opm=get(/開口まわりの処理[^\d]*([\d.]+)/), pip=get(/配管の根元の処理\s*(\d+)/);
   ok(near(r.q.addM2,c.wp)&&near(iri,c.iri)&&(c.tl?near(tl,c.tl):!/端末（/.test(r.t))&&(c.op?near(opm,c.op):true)&&(c.pipes?pip===c.pipes:true)&&(c.tc?near(tcap,c.tc):true)&&r.dims>=3&&r.dimOk,
      tag+' 【'+id+'】防水・入隅・端末・開口・配管が寸法からの計算と一致・寸法（幅・奥行・高さ）が3Dに出ている', {防水:[r.q.addM2,+c.wp.toFixed(3)], 入隅:[iri,c.iri], 端末:[tl,c.tl], 笠下:[tcap,c.tc], 開口:[opm,c.op], 配管:[pip,c.pipes], 寸法の札:r.dims});
   ok(r.cut===0&&r.sx<=0, tag+' 【'+id+'】入力欄が切れず、横にはみ出さない', {cut:r.cut, sx:r.sx});
  }
  /* ② たての角 */
  await p.click('#cats button[data-c="kiso"]'); await p.waitForTimeout(200); await p.click('#types button[data-t="kaku"]'); await p.waitForTimeout(200);
  for(const [vc,lab] of [[2,'丸み'],[1,'面取り']]){
   await p.click('#form button[data-k="vc"][data-v="'+vc+'"]'); await p.waitForTimeout(200);
   await p.fill('#n_VR','120'); await p.dispatchEvent('#n_VR','input'); await p.waitForTimeout(300);
   const r=await p.evaluate(()=>{ const d=P(), q=kisoQty(d); return {d:{W:d.W,D:d.D,H:d.H,VR:d.VR,wrap:d.wrap}, per:q.per, side:q.side, top:q.top, name:partOf().name}; });
   const W=r.d.W/1e3, D=r.d.D/1e3, H=r.d.H/1e3, R=r.d.VR/1e3;
   const per=2*(W+D)-(vc===2?(8-2*Math.PI)*R:(8-4*Math.SQRT2)*R), top=W*D-(vc===2?(4-Math.PI)*R*R:2*R*R);
   ok(near(r.per,per,0.002)&&Math.abs(r.top-top)/top<0.01&&Math.abs(r.side-per*H)/(per*H)<0.01&&r.name.indexOf('たて角'+lab+'120')>=0,
      tag+' ②たての角（'+lab+'120）：周り・天端・立上りが式どおり、名前に付く', {周り:[+r.per.toFixed(4),+per.toFixed(4)], 天端:[+r.top.toFixed(4),+top.toFixed(4)], 立上り:[+r.side.toFixed(4),+(per*H).toFixed(4)], name:r.name});
  }
  ok(errs.length===0, tag+' ③JSエラーなし', errs.slice(0,2));
 }
 console.log(ng?'★NG '+ng+'件':'全部○'); await b.close(); process.exit(ng?1:0);
})();
