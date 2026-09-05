/* 選んだ面の見せ方（§298）
   ① 赤い面が「いまの形」と合っているか（面取りのぶん 内側は低く・天端は狭い）
   ② 面取り・立上り・アゴを変えたら追いかけるか
   ③ 選んだ面のまわりに黄色い細い線が出るか
   使い方： node _check/hlface.js  ／ 直す前と比べる： node _check/hlface.js _before.html */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m)=>{ if(!c)ng++; console.log((c?'○':'★NG')+' '+m); };
const near=(a,b,t)=>Math.abs(a-b)<=(t||0.006);
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/'+FILE);
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.waitForTimeout(700);

async function build(ed){
  await p.evaluate((E)=>{
    state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],
      edges:[0,1,2,3].map(()=>Object.assign({k:'para'},E)), lv:0, name:'屋根①'}];
    saveState(); setTab('d3');
  }, ed);
  await p.waitForTimeout(1800);
}
/* 選んだ面の 赤い板の大きさ／黄色い線の本数／当たり判定の箱の大きさ */
async function pick(F){
  return await p.evaluate((F)=>{
    try{ pick3(null); }catch(_){}
    pick3({p:0,r:-1,e:0,f:F});
    let hl=null, lines=0, box=null;
    T.scene.traverse(o=>{
      if(o.userData&&o.userData.face===F&&o.geometry){ o.geometry.computeBoundingBox();
        const bb=o.geometry.boundingBox;
        hl={w:+(bb.max.x-bb.min.x).toFixed(4), h:+(bb.max.y-bb.min.y).toFixed(4)}; }
      if(o.type==='LineSegments'&&o.material&&o.material.color&&o.material.color.getHex()===0xffd400) lines++;
      if(o.userData&&o.userData.pick&&o.userData.pick.f===F&&o.scale)
        box={w:+o.scale.x.toFixed(4), h:+o.scale.y.toFixed(4), d:+o.scale.z.toFixed(4)};
    });
    return {hl:hl, lines:lines, box:box};
  }, F);
}

/* ── ① 面取り380・立上り1000・天端400 ── */
await build({h:1000,w:400,ch:380});
let r=await pick('in');
ok(r.hl&&near(r.hl.h,0.62), '① 立上りの内側の赤い面＝面取りのぶん低い 0.62m（'+(r.hl&&r.hl.h)+'）');
ok(r.box&&near(r.box.h,0.62), '① 内側の当たり判定も 0.62m（'+(r.box&&r.box.h)+'）');
r=await pick('top');
ok(r.hl&&near(r.hl.h,0.02), '① 天端の赤い面＝面取りのぶん狭い 0.02m（'+(r.hl&&r.hl.h)+'）');
ok(r.box&&near(r.box.d,0.02), '① 天端の当たり判定も 0.02m（'+(r.box&&r.box.d)+'）');
r=await pick('cham');
ok(r.hl&&near(r.hl.h,0.380*Math.SQRT2,0.02), '① 面取りの斜面 '+(0.380*Math.SQRT2).toFixed(3)+'m（'+(r.hl&&r.hl.h)+'）');
r=await pick('out');
ok(r.hl&&near(r.hl.h,1.02,0.03), '① 外壁の赤い面＝足元から天端まで 1.02m（'+(r.hl&&r.hl.h)+'）');
r=await pick('endA');
ok(r.hl&&near(r.hl.w,0.40,0.01)&&near(r.hl.h,1.00,0.01), '① 小口は壁の断面の形（0.40×1.00）');

/* ── ③ 黄色い線 ── */
r=await pick('in');
ok(r.lines===1, '③ 選ぶと黄色い線が1本出る（'+r.lines+'）');
const off=await p.evaluate(()=>{ pick3(null); let n=0;
  T.scene.traverse(o=>{ if(o.type==='LineSegments'&&o.material&&o.material.color&&o.material.color.getHex()===0xffd400)n++; });
  return n; });
ok(off===0, '③ 解除すると黄色い線も消える（'+off+'）');

/* ── ② 面取りを小さくしたら追いかける ── */
await build({h:1000,w:400,ch:100});
r=await pick('in');  ok(r.hl&&near(r.hl.h,0.90), '② 面取り100 → 内側 0.90m（'+(r.hl&&r.hl.h)+'）');
r=await pick('top'); ok(r.hl&&near(r.hl.h,0.30), '② 面取り100 → 天端 0.30m（'+(r.hl&&r.hl.h)+'）');

/* ── ② 立上りを変えたら追いかける ── */
await build({h:1500,w:400,ch:100});
r=await pick('in');  ok(r.hl&&near(r.hl.h,1.40), '② 立上り1500 → 内側 1.40m（'+(r.hl&&r.hl.h)+'）');
r=await pick('out'); ok(r.hl&&near(r.hl.h,1.52,0.03), '② 立上り1500 → 外壁 1.52m（'+(r.hl&&r.hl.h)+'）');

/* ── ② アゴありは面取りが無い ── */
await build({h:1000,w:400,ch:380,ago:1,agoD:100});
r=await pick('in');  ok(r.hl&&near(r.hl.h,1.00), '② アゴありは面取り無し → 内側 1.00m（'+(r.hl&&r.hl.h)+'）');
r=await pick('top'); ok(r.hl&&near(r.hl.h,0.40), '② アゴありは天端いっぱい 0.40m（'+(r.hl&&r.hl.h)+'）');
r=await pick('endA');
ok(r.hl&&near(r.hl.h,1.195,0.02), '② アゴありの小口は195mm高い（'+(r.hl&&r.hl.h)+'）');

ok(errs.length===0, 'JSエラーなし（'+errs.join(' / ')+'）');
console.log('--- ★NG '+ng+' 件 ---');
await b.close();
process.exit(ng?1:0);
})();
