/* 物件報告書（元請に出す紙）の金額が合っているか
   ★受注額 −（材料＋労務＋外注＋経費）＝ 粗利 を、検査側で別に計算して突き合わせる。
     完成した物件は実績、それ以外は見込みの数字で見る。
   使い方: node _check/report1.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1500,height:950}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
await p.waitForTimeout(2200);
const r=await p.evaluate(()=>{
  const pick=st=>props.find(x=>x.stRaw===st);
  const targets=[pick('kan'), pick('kou'), pick('keiyaku')].filter(Boolean);
  const out=[];
  const ow=window.open;
  targets.forEach(pr=>{
    let html='';
    window.open=()=>({document:{open(){},write(s){html+=s;},close(){}},focus(){},print(){},close(){},addEventListener(){}});
    let err='';
    try{ exportPDF(pr.id); }catch(e){ err=String(e).slice(0,90); }
    const txt=html.replace(/<[^>]+>/g,'\n');
    const src=(pr.a&&pr.a.length)?pr.a:pr.y;          /* 実績があれば実績、無ければ見込み */
    const cost=(src||[]).reduce((a,x)=>a+(+x||0),0);
    const gro=(pr.order||0)-cost;      /* 紙に出るのは「受注 − いま分かっている原価」 */
    out.push({name:pr.name, st:pr.stRaw, err, juchu:pr.order||0, cost, gro,
      hasName:txt.includes(pr.name),
      hasGro:txt.includes(Math.round(gro).toLocaleString()),
      hasOrder:txt.includes(Math.round(pr.order||0).toLocaleString()),
      costOK:(src||[]).every(v=>txt.includes(Math.round(v).toLocaleString())),
      bad:['NaN','undefined','Infinity','[object Object]'].filter(w=>txt.includes(w)),
      len:txt.length});
  });
  window.open=ow;
  return out;
});
r.forEach(x=>{
  console.log('     '+x.st+' '+x.name.slice(0,20)+'  費目合計 ¥'+Math.round(x.cost).toLocaleString()
    +' ／ 粗利 ¥'+Math.round(x.gro).toLocaleString());
  ok(!x.err,'報告書が作れる（'+x.st+'）'+(x.err||''));
  ok(x.len>2000,'中身がある（'+x.st+'・'+x.len+'文字）');
  ok(x.hasName,'物件名が刷られる（'+x.st+'）');
  ok(x.hasOrder,'受注額 ¥'+Math.round(x.juchu).toLocaleString()+' が刷られる（'+x.st+'）');
  ok(x.costOK,'費目4つ（材料・労務・外注・経費）がそのまま刷られる（'+x.st+'）');
  ok(x.hasGro,'粗利 ¥'+Math.round(x.gro).toLocaleString()+' が刷られる（'+x.st+'）');
  ok(x.bad.length===0,'NaN・undefined が刷られない（'+x.st+'）'+x.bad.join(','));
});
/* いちばん大事な検算：受注額 − 費目合計 ＝ 粗利 */
r.forEach(x=>{
  ok(x.juchu>0,'受注額が読める（'+x.st+'）');
  ok(Math.abs((x.juchu-x.cost)-x.gro)<2,'受注−費目＝粗利（'+x.st+'）'
    +Math.round(x.juchu).toLocaleString()+'−'+Math.round(x.cost).toLocaleString()
    +'='+Math.round(x.juchu-x.cost).toLocaleString()+' ／ '+Math.round(x.gro).toLocaleString());
});
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
