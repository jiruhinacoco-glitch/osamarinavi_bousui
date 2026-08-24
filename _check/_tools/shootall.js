const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const JOBS=[
 // [file, viewport, name, setup]
 ['kirokucho_demo',[393,852],'kiro_dash_p', null],
 ['kirokucho_demo',[393,852],'kiro_list_p', "showView('list')"],
 ['kirokucho_demo',[393,852],'kiro_detail_p', "showView('list');selectedId=props[1].id;openDetailFull()"],
 ['_land_kirokucho_demo',[852,393],'kiro_sched_l', "showView('zentai')"],
 ['_land_kirokucho_demo',[852,393],'kiro_detail_l', "showView('list');selectedId=props[1].id;openDetailFull()"],
 ['_land_hacchu',[852,393],'hacchu_l', null],
 ['hacchu',[393,852],'hacchu_p', null],
 ['_land_camera',[852,393],'camera_l', null],
 ['camera',[393,852],'camera_p', null],
 ['_land_library',[852,393],'library_l', null],
 ['library',[393,852],'library_p', null],
 ['_land_yougo',[852,393],'yougo_l', null],
 ['_land_kokkosho',[852,393],'kokkosho_l', null],
 ['_land_shiyo_toroku',[852,393],'shiyo_l', null],
 ['_land_zairyo_toroku',[852,393],'zairyo_l', null],
];
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const [f,v,name,setup] of JOBS){
    const ctx=await b.newContext({viewport:{width:v[0],height:v[1]},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    const p=await ctx.newPage();
    try{
      await p.goto('http://localhost:8899/'+f+'.html',{waitUntil:'load',timeout:20000});
      await p.waitForTimeout(1500);
      if(setup){ await p.evaluate(s=>eval(s), setup); await p.waitForTimeout(900); }
      await p.screenshot({path:'sa_'+name+'.png'});
      console.log('ok', name);
    }catch(e){ console.log('ERR', name, String(e).slice(0,60)); }
    await ctx.close();
  }
  await b.close();
})();
