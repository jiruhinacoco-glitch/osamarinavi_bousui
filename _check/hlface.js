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
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
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
      /* ★2026-11-05 §462（面選択を描画済みの実面へ統一）から、赤い面は面ごとの四角い板ではなく
         「描いた実面の三角形」を世界座標で組む（renderOrder 999・#ff4136）。辺0は x 方向に走るので
         高さ＝y の幅、天端の幅＝z の幅、面取りの斜面＝y と z の幅から求める。 */
      if(o.isMesh&&o.renderOrder===999&&o.material&&o.material.color&&o.material.color.getHex()===0xff4136){
        const bb=new THREE.Box3().setFromObject(o);
        hl={h:+(bb.max.y-bb.min.y).toFixed(4), z:+(bb.max.z-bb.min.z).toFixed(4),
            s:+Math.hypot(bb.max.y-bb.min.y,bb.max.z-bb.min.z).toFixed(4), y0:+bb.min.y.toFixed(4), y1:+bb.max.y.toFixed(4)}; }
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
ok(r.hl&&near(r.hl.z,0.02), '① 天端の赤い面＝面取りのぶん狭い 0.02m（'+(r.hl&&r.hl.z)+'）');
ok(r.box&&near(r.box.d,0.02), '① 天端の当たり判定も 0.02m（'+(r.box&&r.box.d)+'）');
r=await pick('cham');
ok(r.hl&&near(r.hl.s,0.380*Math.SQRT2,0.02), '① 面取りの斜面 '+(0.380*Math.SQRT2).toFixed(3)+'m（'+(r.hl&&r.hl.s)+'）');
r=await pick('out');
/* ★11-05 外壁の実面は地面より下（床の厚み -0.15m）から描かれている → 上端が天端（1.012m）・下端が地面以下 */
ok(r.hl&&near(r.hl.y1,1.012,0.02)&&r.hl.y0<=0.001, '① 外壁の赤い面＝足元から天端まで（'+(r.hl&&[r.hl.y0,r.hl.y1])+'）');
/* ★11-05 四角く閉じた屋根では、壁の端（小口）は角で隣の壁に埋まって見えない。§462 から
   「実面が無いものは選ばない（広い判定箱へ戻さない）」ので、赤くならないのが正しい。小口の形は endfaceposition・select3d で見ている */
r=await pick('endA');
ok(!r.hl, '① 閉じた屋根の小口（角に埋まって見えない）は赤くならない（'+JSON.stringify(r.hl)+'）');

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
r=await pick('top'); ok(r.hl&&near(r.hl.z,0.30), '② 面取り100 → 天端 0.30m（'+(r.hl&&r.hl.z)+'）');

/* ── ② 立上りを変えたら追いかける ── */
await build({h:1500,w:400,ch:100});
r=await pick('in');  ok(r.hl&&near(r.hl.h,1.40), '② 立上り1500 → 内側 1.40m（'+(r.hl&&r.hl.h)+'）');
r=await pick('out'); ok(r.hl&&near(r.hl.y1,1.512,0.02)&&r.hl.y0<=0.001, '② 立上り1500 → 外壁の上端 1.512m（'+(r.hl&&[r.hl.y0,r.hl.y1])+'）');

/* ── ② アゴありは面取りが無い ── */
await build({h:1000,w:400,ch:380,ago:1,agoD:100});
r=await pick('in');  ok(r.hl&&near(r.hl.h,1.00), '② アゴありは面取り無し → 内側 1.00m（'+(r.hl&&r.hl.h)+'）');
r=await pick('top'); ok(r.hl&&near(r.hl.z,0.40), '② アゴありは天端いっぱい 0.40m（'+(r.hl&&r.hl.z)+'）');
/* ★11-05 「アゴありの小口は195mm高い」は、閉じた屋根では小口が見えない（上の①と同じ）ので外した */

ok(errs.length===0, 'JSエラーなし（'+errs.join(' / ')+'）');
console.log('--- ★NG '+ng+' 件 ---');
await b.close();
process.exit(ng?1:0);
})();
