/* 現場マップ：屋根の輪郭（osamari_roofs）が壊れていても止まらないか
   ＋ 昔の書き方（面が1つだけ）と今の書き方（面が複数）が、これまでどおり読めるか

   ★2026-08-29c：面が文字・null だと、あとで .map／.forEach するところで止まり、
     その現場の面積が出せなくなる（§239・§240と同じ話）。
     いまは読み込むときに「使える形の面」だけを残す。
   ★点の書き方は [lat,lng,alt?] と {lat,lng,alt} の2通りある。どちらも通すこと。

   使い方: node _check/roofjunk.js
           node _check/roofjunk.js before   … 直す前のファイルと比べる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const {execSync}=require('child_process');
const BEFORE=process.argv[2]==='before';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
let FILE='genba_map_v36.html';
if(BEFORE){ FILE='_before_map.html'; execSync('git show HEAD:genba_map_v36.html > '+FILE); }

const A=[43.060,141.350], B=[43.060,141.352], C=[43.061,141.352], D=[43.061,141.350];
const FACE=[A,B,C,D];
const OBJF=[{lat:43.060,lng:141.350},{lat:43.060,lng:141.352},{lat:43.061,lng:141.352}];
const CASES=[
 /* 名前,               保存する中身,                 期待する面の数 */
 ['今の書き方（面2つ）',  {1:[FACE,FACE]},              2],
 ['今の書き方（面3つ）',  {1:[FACE,FACE,FACE]},         3],
 ['昔の書き方（面1つ）',  {1:FACE},                     1],
 ['点が{lat,lng}の昔の形',{1:OBJF},                     1],
 ['面が文字',            {1:['あいう']},                0],
 ['面が数字',            {1:[5]},                       0],
 ['面にnull（良い面は残る）',{1:[null,FACE]},            1],
 ['点が文字',            {1:[[A,'あ',C]]},              0],
 ['点がnull',           {1:[[A,null,C]]},              0],
 ['点が2つだけ',         {1:[[A,B]]},                   0],
 ['丸ごと配列',          [1,2,3],                       0],
 ['丸ごと文字',          'こわれ',                       0],
];
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [nm,data,want] of CASES){
    const ctx=await b.newContext({viewport:{width:1400,height:900}});
    const p=await ctx.newPage(); p.on('dialog',d=>d.dismiss().catch(()=>{}));
    const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,55)));
    await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
    await p.evaluate(d=>{ localStorage.setItem('osamari_gmapkey','DUMMY');
      localStorage.setItem('osamari_roofs',JSON.stringify(d)); },data);
    await p.reload({waitUntil:'load'}); await p.waitForTimeout(1900);
    const r=await p.evaluate(()=>{ const o={};
      const su=document.getElementById('setup'); if(su) su.style.display='none';
      try{ const rs=loadRoofs(); o.n=(rs[1]||[]).length; }catch(e){ o.n='ERR:'+e.message.slice(0,35); }
      /* 残った面は、面積の計算まで通せること（点は2通りの書き方がある） */
      try{ const rs=loadRoofs()[1]||[]; let a=0;
        rs.forEach(fc=>{ const pts=fc.map(q=>Array.isArray(q)?{lat:+q[0],lng:+q[1],alt:+q[2]||0}:q);
          a+=(area3dOf(pts).flat)||0; });
        o.area=Math.round(a);
      }catch(e){ o.area='ERR:'+e.message.slice(0,35); }
      try{ if(typeof renderList==='function') renderList(); o.rows=document.querySelectorAll('.site').length; }
        catch(e){ o.rows='ERR:'+e.message.slice(0,35); }
      return o; }).catch(e=>({err:String(e).slice(0,55)}));
    const good = r && r.n===want && !/ERR/.test(String(r.area)) && r.rows===100 && errs.length===0;
    ok(nm+'（面'+want+'つ）', good, {結果:r, err:errs[0]||''});
    await ctx.close();
  }
  console.log(R.join('\n'));
  const ng=R.filter(x=>x.startsWith('★')).length;
  console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
  if(BEFORE){ try{ execSync('rm -f _before_map.html'); }catch(_){} }
  await b.close(); process.exit(ng?1:0);
})();
