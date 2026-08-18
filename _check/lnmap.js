const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const c=await b.newContext({viewport:{width:1600,height:900}});
  await c.addInitScript(()=>{ try{localStorage.setItem('nn_gmaps_key','DUMMY');}catch(e){} });
  const p=await c.newPage();
  await p.route('**maps.googleapis.com**', r=>r.fulfill({status:200,contentType:'application/javascript',
    body:'window.google={maps:{Map:function(){return{addListener(){},setCenter(){},setZoom(){},panTo(){},getZoom(){return 12},setMapTypeId(){},controls:[],setOptions(){}}},Marker:function(){return{addListener(){},setMap(){},setPosition(){}}},LatLng:function(a,b){this.lat=()=>a;this.lng=()=>b;},LatLngBounds:function(){return{extend(){},isEmpty(){return true}}},event:{addListenerOnce(){},trigger(){}},MapTypeId:{ROADMAP:"roadmap",HYBRID:"hybrid"},places:{Autocomplete:function(){return{addListener(){},getPlace(){return{}}}}},geometry:{spherical:{computeArea(){return 0},computeDistanceBetween(){return 0}}},drawing:{},importLibrary:()=>Promise.resolve({})}};if(window.initMap)window.initMap();'}));
  await p.goto('http://localhost:8899/genba_map_v36.html',{waitUntil:'load'});
  await p.waitForTimeout(2500);
  const d=await p.evaluate(()=>{
    const el=document.getElementById('setup'); if(el)el.style.display='none';
    const nav=document.querySelector('nav').getBoundingClientRect();
    const pn=document.getElementById('panel');
    const app=document.getElementById('app');
    return {navW:Math.round(nav.width),
            panel:pn?{l:Math.round(pn.getBoundingClientRect().left),w:Math.round(pn.getBoundingClientRect().width),d:getComputedStyle(pn).display}:null,
            app:app?{l:Math.round(app.getBoundingClientRect().left),w:Math.round(app.getBoundingClientRect().width)}:null,
            docW:document.documentElement.scrollWidth, winW:innerWidth};
  });
  console.log(JSON.stringify(d));
  await p.screenshot({path:__dirname+'/ln_map2.png'});
  await b.close();
})();
