/* 発注書（仕入業者に出す紙）の金額が合っているか
   ★数量×単価＝金額／小計＝合計／消費税＝小計の10%（四捨五入）／税込＝小計＋消費税 を
     検査側で別に計算して突き合わせる（存在チェックではなく検算・§147の型）
   使い方: node _check/hacchu3.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
const num=s=>+String(s).replace(/[^0-9.\-]/g,'')||0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1500,height:950}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/hacchu.html',{waitUntil:'load'});
await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{
  /* 明細を作って発注書を出す（画面をたどらず、データから直に） */
  const g=(typeof GENBA!=='undefined'&&GENBA.length)?GENBA[0]:null;
  const v=(typeof VENDORS!=='undefined'&&VENDORS.length)?VENDORS[0]:null;
  if(!g||!v) return {no:1};
  const lines=[{n:'改質アスファルトシート',sp:'1.0m×8m',q:36,p:7800,u:'巻'},
               {n:'プライマー',sp:'18L缶',q:3,p:12500,u:'缶'},
               {n:'シール材',sp:'320ml',q:12,p:980,u:'本'}];
  let html=''; const ow=window.open;
  window.open=()=>({document:{open(){},write(s){html+=s;},close(){}},focus(){},print(){},close(){},addEventListener(){}});
  try{ nnHacchuPDF({gid:g.id, vid:v.id, lines:lines}, 'TEST-001'); }catch(e){ return {err:String(e).slice(0,90)}; }
  window.open=ow;
  const txt=html.replace(/<[^>]+>/g,'\n').replace(/&nbsp;/g,' ');
  return {lines, txt};
});
if(r.no){ console.log('★NG 現場か仕入業者のデータが読めない'); process.exit(1); }
ok(!r.err,'発注書が作れる '+(r.err||''));
const sub=r.lines.reduce((a,l)=>a+l.q*l.p,0);
const tax=Math.round(sub*0.10), tot=sub+tax;
const yen=n=>n.toLocaleString();
console.log('     検査側の計算：小計 ¥'+yen(sub)+' ／ 消費税 ¥'+yen(tax)+' ／ 税込 ¥'+yen(tot));
r.lines.forEach((l,i)=>{
  ok(r.txt.includes(yen(l.q*l.p)), (i+1)+'行目の金額 ¥'+yen(l.q*l.p)+'（'+l.q+'×'+yen(l.p)+'）が刷られる');
});
ok(r.txt.includes(yen(sub)),'小計 ¥'+yen(sub)+' が刷られる');
ok(r.txt.includes(yen(tax)),'消費税 ¥'+yen(tax)+' が刷られる');
ok(r.txt.includes(yen(tot)),'税込合計 ¥'+yen(tot)+' が刷られる');
ok(!/NaN|undefined|Infinity/.test(r.txt),'NaN・undefined が刷られない');
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
