/* タップ発光が「押した場所」に出るか（倍率つきの大きいモニターで確認） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
const PAGES=['kirokucho_demo','index','zumen_sekisan','library','yougo'];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const W of [1600,2000,2560]){
  console.log('\n===== 画面幅 '+W+'px =====');
  for(const pg of PAGES){
    const ctx=await b.newContext({viewport:{width:W,height:950}});
    const p=await ctx.newPage();
    await p.goto('http://localhost:8899/'+pg+'.html'); await p.waitForTimeout(1800);
    const r=await p.evaluate(()=>{
      const X=Math.round(innerWidth*0.30), Y=Math.round(innerHeight*0.40);
      document.dispatchEvent(new PointerEvent('pointerdown',{clientX:X,clientY:Y,bubbles:true,button:0,pointerType:'mouse'}));
      const el=document.querySelector('.tapfx');
      if(!el)return null;
      const b=el.getBoundingClientRect();
      return {Z:+(window.nnPZ||1).toFixed(2), want:[X,Y],
        got:[Math.round(b.left+b.width/2), Math.round(b.top+b.height/2)]};
    });
    if(!r){ console.log('  '+pg+': 発光なし'); continue; }
    const dx=Math.abs(r.got[0]-r.want[0]), dy=Math.abs(r.got[1]-r.want[1]);
    ok(dx<=6&&dy<=6, pg+'：押した場所に光る（倍率'+r.Z+'）', '狙い'+r.want+' 実際'+r.got+' ズレ'+dx+','+dy);
    await ctx.close();
  }
}
await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');})();
