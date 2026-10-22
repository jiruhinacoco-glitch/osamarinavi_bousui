/* ★§743 図面・積算の3D：光「スタジオ」（既定）と学校のサンプル
   本人「動画の3Dのクオリティまで」「サンプルは実在の形（3D投影の絵の建物）に」「架台・役物がない」「背景は茶色」
   ① 「サンプル」ボタンで学校（屋根6面：校舎・塔屋・中棟・渡り廊下・体育館・玄関）・役物と設備 40個以上・パラペットは笠木付き
   ② 3Dの既定は「スタジオ」：背景は茶色の無地・太陽は標準と同じ向き（影が手前）・影を落とす
   ③ スタジオでは 窓の帯・輪郭線・落ち着いた壁（荒い模様でない）
   ④ 「標準」に切り替えると 窓・輪郭線が消え、壁の質感も元に戻る（戻せる）／もう一度スタジオで元どおり
   ⑤ 積算に役物が乗る（増し張りの巻数が 0 でない）・pageerror 0
   直す前の版では ①②③ が★NG。  使い方: node _check/studio1.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,300):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const p=await b.newPage({viewport:{width:1100,height:760}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.evaluate(()=>{ localStorage.removeItem('nn_zumen_v1'); localStorage.removeItem('nn_zumen_sky2'); }); await p.reload(); await p.waitForTimeout(1300);
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(_){} document.getElementById('tl_sample').click(); }); await p.waitForTimeout(500);
  const r1=await p.evaluate(()=>({names:state.polys.map(x=>x.name).join('/'), n:state.polys.length, parts:(state.parts||[]).length,
    kas:state.polys.every(pl=>pl.edges.every(e=>e.k!=='para'||e.kasagi))}));
  ok('① サンプル＝学校（6面）・役物と設備 40個以上・パラペットは笠木付き', r1.n===6&&/校舎/.test(r1.names)&&/体育館/.test(r1.names)&&r1.parts>=40&&r1.kas, r1);
  await p.evaluate(()=>setTab('d3')); await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:25000}); await p.waitForTimeout(3500);
  const st=()=>p.evaluate(()=>{ let edge=0, conc=0, soft=0; T.group.traverse(o=>{ if(o.userData&&o.userData.nnEdgeLine&&o.visible) edge++; if(o.isMesh&&o.material&&o.material.userData&&o.material.userData.nnStd){ if(o.material.map===nnConcTex()) conc++; else soft++; } });
    const bg=T.scene.background; return {kind:nnSkyKind(), bgCol:!!(bg&&bg.isColor), bg:bg&&bg.isColor?bg.getHexString():'', win:T.nnWinG?T.nnWinG.children.reduce((a,o)=>a+o.geometry.attributes.position.count,0):0,
      edge, conc, soft, cast:!!(T.sun&&T.sun.castShadow&&T.renderer.shadowMap.enabled), az:NN_SKY.studio&&NN_SKY.std?[NN_SKY.studio.az,NN_SKY.std.az]:null}; });
  const s1=await st();
  ok('② 既定はスタジオ：背景は茶色の無地・太陽は標準と同じ向き・影を落とす', s1.kind==='studio'&&s1.bgCol&&/^[89a][0-9a-f][5-7][0-9a-f][3-5][0-9a-f]$/.test(s1.bg)&&s1.az&&s1.az[0]===s1.az[1]&&s1.cast, s1);
  ok('③ スタジオでは窓の帯・輪郭線・落ち着いた壁', s1.win>500&&s1.edge>20&&s1.soft>0&&s1.conc===0, s1);
  await p.evaluate(()=>document.querySelector('[data-sky="std"]').click()); await p.waitForTimeout(1500); const s2=await st();
  await p.evaluate(()=>document.querySelector('[data-sky="studio"]').click()); await p.waitForTimeout(1500); const s3=await st();
  ok('④ 標準に切り替えると窓・輪郭線が消え壁も元どおり／スタジオに戻すとまた出る', s2.kind==='std'&&s2.win===0&&s2.edge===0&&s2.soft===0&&s2.conc>0&&s3.win===s1.win&&s3.edge>20&&s3.conc===0, {s2,s3});
  const r5=await p.evaluate(()=>{ const t=document.body.innerText; const m=/増し張り\s*(\d+)\s*巻/.exec(t); return {mashi:m?+m[1]:-1}; });
  ok('⑤ 積算に役物が乗る（増し張りが0でない）・pageerror 0', r5.mashi>0&&errs.length===0, {r5,errs});
 }catch(e){ console.log('★NG 例外 '+e.message); NG++; }
 await b.close(); console.log(NG?('★NG '+NG+'件'):'全部○'); process.exit(NG?1:0); })();
