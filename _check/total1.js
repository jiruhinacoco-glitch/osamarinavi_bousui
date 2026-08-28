/* 画面の積算の合計と、御見積書（元請に出す紙）の合計が食い違っていないか
   ★片方にだけ足すと「画面の金額」と「紙の金額」が違う見積書ができる（§224の注意）
   ★数量は紙のうえで検算できるよう小数1位に丸めてから単価を掛けるので、
     0.1%ほどのずれは正しい（§147）。
   使い方: node _check/total1.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1500,height:950}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(800);
const r=await p.evaluate(async()=>{
  const E=(h,w,x)=>Object.assign({k:'para',h:h,w:w},x||{});
  state.polys=[
   {name:'屋根①',lv:0,spec:'AS-T1',pts:[{x:0,y:0},{x:24,y:0},{x:24,y:16},{x:0,y:16}],
    edges:[E(300,250,{kasagi:1}),E(400,300,{kasagi:1,ago:1,agoD:120}),E(300,250,{kasagi:1}),E(300,250,{kasagi:1})],holes:[]},
   {name:'屋根②',lv:0,spec:'X-2',pts:[{x:24,y:0},{x:38,y:0},{x:38,y:16},{x:24,y:16}],
    edges:[E(300,250),E(300,250),E(300,250),E(300,250)],holes:[]}
  ];
  commit();
  const tor=(typeof nnToriaiList==='function')?nnToriaiList():[];
  if(tor.length) try{ nnTorSet(tor[0],'mikiri'); }catch(e){}
  nnStamp('dakki',1); await new Promise(s=>setTimeout(s,220)); nnPlaceAtGrid(5,5); nnPlaceAtGrid(9,5);
  commit(); recalc();
  const num=s=>+String(s).replace(/[^0-9.\-]/g,'')||0;
  const scr=[...document.querySelectorAll('#sekisan table tr')]
    .map(tr=>[...tr.children].map(td=>td.textContent.trim()))
    .filter(x=>x.length>=4 && /[0-9]/.test(x[x.length-1]));
  const scrTotal=scr.reduce((a,x)=>a+num(x[x.length-1]),0);
  const ed=nnEstimateData();
  const all=ed.rows.concat(ed.parts||[]);
  const edTotal=all.reduce((a,x)=>a+Math.round(x.q*10)/10*x.p,0);
  /* 御見積書の紙にも同じ数字が出るか（合計の文字を拾う） */
  let html=''; const ow=window.open;
  window.open=()=>({document:{open(){},write(s){html+=s;},close(){}},focus(){},print(){},close(){}});
  try{ nnMitsuPDF({keihiRate:0, nebiki:0}); }catch(e){ html='ERR '+e.message; }
  window.open=ow;
  return {scrRows:scr.length, edRows:all.length, scrTotal, edTotal:Math.round(edTotal),
    parts:(ed.parts||[]).length, paper:html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,4000)};
});
console.log('     画面 '+r.scrRows+'行 ¥'+r.scrTotal.toLocaleString()+' ／ 見積 '+r.edRows+'行 ¥'+r.edTotal.toLocaleString());
ok(r.parts>0,'役物が見積にも入っている ('+r.parts+'種)');
ok(r.scrRows===r.edRows,'画面と見積の行数が同じ ('+r.scrRows+'／'+r.edRows+')');
const diff=Math.abs(r.scrTotal-r.edTotal)/Math.max(1,r.scrTotal);
ok(diff<0.005,'合計が一致（丸めのずれ '+(diff*100).toFixed(3)+'%）');
const yen=Math.round(r.edTotal).toLocaleString();
ok(r.paper.includes(yen)||r.paper.includes(String(Math.round(r.edTotal))),'紙にも同じ税抜合計が刷られる ('+yen+')');
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
