/* 工程表PDF（バーチャート）の棒の位置と長さが、日付どおりか
   ★棒の長さ ÷ 日数 は、どの工程でも同じ（1日ぶんの幅）になるはず。
     棒の左端の差 ÷ 開始日の差 も同じ値になるはず。
   使い方: node _check/kotei2.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1500,height:950}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
await p.waitForTimeout(2200);
const r=await p.evaluate(()=>{
  const pr=props.find(x=>x.stRaw==='kou');
  let html=''; const ow=window.open;
  window.open=()=>({document:{open(){},write(s){html+=s;},close(){}},focus(){},print(){},close(){},addEventListener(){}});
  let err=''; try{ nnKoteiPDF(pr.id); }catch(e){ err=String(e).slice(0,110); }
  window.open=ow;
  const rects=(html.match(/<rect[^>]*>/g)||[]).map(t=>{
    const g=n=>{const m=t.match(new RegExp(n+'="([-0-9.]+)"')); return m?+m[1]:null;};
    const f=(t.match(/fill="([^"]+)"/)||[])[1]||'';
    return {x:g('x'), w:g('width'), y:g('y'), h:g('height'), fill:f, rx:g('rx')};
  });
  const D=s=>{const m=String(s).match(/(\d{4})-(\d{2})-(\d{2})/); return m?Date.UTC(+m[1],+m[2]-1,+m[3])/864e5:null;};
  const rows=(pr.gantt||[]).map(g=>({name:g.name, a:D(g.start), b:D(g.end)}))
    .filter(x=>x.a!=null&&x.b!=null);
  return {err, html:html.length, rects, rows, name:pr.name};
});
ok(!r.err,'工程表PDFが作れる '+(r.err||''));
ok(r.rows.length>=4,'自社工程が4本以上ある ('+r.rows.length+')');
/* 自社の工程の棒（緑）を拾う。日数の多い順に並べて、行の順と突き合わせる */
const bars=r.rects.filter(x=>x.rx===0.8 && /#3a9e52|#1e5c3a/i.test(x.fill) && x.w>0);
console.log('     棒の数 '+bars.length+' ／ 工程 '+r.rows.length+'本');
ok(bars.length>=r.rows.length,'工程の数だけ棒がある ('+bars.length+'≧'+r.rows.length+')');
/* 上から順に並べる＝行の順 */
bars.sort((a,b)=>a.y-b.y);
const use=bars.slice(0,r.rows.length);
const cw=use.map((bar,i)=>{ const dd=r.rows[i].b-r.rows[i].a+1; return bar.w/dd; });
const cw0=cw[0];
cw.forEach((v,i)=>{
  ok(Math.abs(v-cw0)/cw0<0.02, (i+1)+'本目「'+r.rows[i].name+'」の長さが日数どおり（1日＝'
    +v.toFixed(3)+'mm ／ 基準'+cw0.toFixed(3)+'mm・'+(r.rows[i].b-r.rows[i].a+1)+'日）');
});
/* 左端の差 ÷ 開始日の差 も同じ値になるはず */
for(let i=1;i<use.length;i++){
  const dx=use[i].x-use[0].x, dd=r.rows[i].a-r.rows[0].a;
  if(dd===0){ ok(Math.abs(dx)<0.3, (i+1)+'本目：開始日が同じなら左端も同じ'); continue; }
  ok(Math.abs(dx/dd-cw0)/cw0<0.03, (i+1)+'本目の左端が開始日どおり（'+(dx/dd).toFixed(3)+'／'+cw0.toFixed(3)+'）');
}
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
