/* 元請に渡る書類9種に、打ち込んだ文字がそのまま入っていないか
   ★「A&B工務店」のような社名や、備考に < を書いただけで表が崩れ、
     後ろが丸ごと消えることがある（実際に物件報告書で起きていた）。
   使い方： node _check/escdoc.js                                            */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
/* いたずらな文字（& < > " ' を全部入れる） */
const EVIL='"><img src=x onerror=alert(1)><b>A&B</b>\'';
const RAW=/<img\s+src=x/i;                 /* 逃がしそこねると、これが生で入る */
const stub=`(function(){var h='';window.__h=function(){return h;};
  window.open=function(){return {document:{open:function(){},write:function(s){h+=s;},close:function(){}},
   focus:function(){},print:function(){},addEventListener:function(){},location:{}};};
  window.__clr=function(){h='';};})()`;
let NG=0;
const say=(ok,label,extra)=>{ if(!ok)NG++; console.log((ok?'○   ':'★NG ')+label+(extra?'  '+extra:'')); };

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
 args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});

/* ── 図面・積算の6種 ── */
{ const p=await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push((''+e).slice(0,55)));
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1500);
  await p.evaluate(()=>{try{nnZMenuClose(); loadSample();}catch(_){}});
  const r=await p.evaluate(([EV,stub])=>{
    const out={};
    try{ localStorage.setItem('nn_zumen_plan_v1', JSON.stringify(
      {ken:EV,basho:EV,moto:EV,sakusei:EV,zban:EV,kita:'up',kami:'A3'})); }catch(_){}
    state.polys[0].name=EV;
    const orig=window.open; (0,eval)(stub);
    ['nnPlanPDF','nnDetailPDF','nnSectionPDF','nnIsoPDF','nnWariPDF'].forEach(f=>{
      window.__clr();
      try{ window[f](); }catch(e){ out[f]='★'+e.message.slice(0,30); return; }
      const h=window.__h();
      out[f]= /<img\s+src=x/i.test(h) ? '★生のタグ' : (h.length>500?'ok':'空'); });
    window.__clr();
    try{ window.nnMitsuPDF({keihiRate:0.1,nebiki:0,to:EV,ken:EV,basho:EV,yuko:30});
      out.nnMitsuPDF=/<img\s+src=x/i.test(window.__h())?'★生のタグ':'ok'; }
    catch(e){ out.nnMitsuPDF='★'+e.message.slice(0,30); }
    window.open=orig; return out;
  },[EVIL,stub]);
  Object.entries(r).forEach(([k,v])=>say(v==='ok','図面 '+k, v));
  say(!errs.length,'図面 JSエラーなし', errs[0]||'');
  await p.close(); }

/* ── 現場記録帳の2種 ── */
{ const p=await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push((''+e).slice(0,55)));
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(1500);
  const r=await p.evaluate(([EV,stub])=>{ const o={};
    const s=props.find(x=>x.status==='施工中');
    ['name','addr','moto','tantou','shiire','ko','spec','maker','tb'].forEach(k=>{ if(k in s) s[k]=EV; });
    if(Array.isArray(s.roofs)&&s.roofs[0]) s.roofs[0].n=EV;
    const orig=window.open; (0,eval)(stub);
    ['nnKoteiPDF','exportPDF'].forEach(f=>{ window.__clr();
      if(typeof window[f]!=='function'){ o[f]='無し'; return; }
      try{ window[f](s.id); }catch(e){ o[f]='★'+e.message.slice(0,30); return; }
      const h=window.__h();
      o[f]=/<img\s+src=x/i.test(h)?'★生のタグ':(h.length>500?'ok':'空'); });
    window.open=orig;
    try{ render(); o.一覧=document.querySelectorAll('#list .pcard').length>0?'ok':'★空'; }
    catch(e){ o.一覧='★'+e.message.slice(0,30); }
    return o; },[EVIL,stub]);
  Object.entries(r).forEach(([k,v])=>say(v==='ok','記録帳 '+k, v));
  say(!errs.length,'記録帳 JSエラーなし', errs[0]||'');
  await p.close(); }

/* ── 発注書 ── */
{ const p=await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push((''+e).slice(0,55)));
  await p.goto('http://localhost:8899/hacchu.html'); await p.waitForTimeout(1500);
  const r=await p.evaluate(([EV,stub])=>{ const o={};
    try{ if(typeof GENBA!=='undefined'&&GENBA[0]){ GENBA[0].name=EV; GENBA[0].moto=EV; } }catch(_){}
    try{ if(typeof VENDORS!=='undefined'&&VENDORS[0]){ VENDORS[0].name=EV; VENDORS[0].tanto=EV; } }catch(_){}
    try{ if(typeof myCo!=='undefined'){ myCo.co=EV; myCo.tanto=EV; } }catch(_){}
    const orig=window.open; (0,eval)(stub); window.__clr();
    try{ const g=(typeof GENBA!=='undefined'&&GENBA[0])?GENBA[0]:null;
      const v=(typeof VENDORS!=='undefined'&&VENDORS[0])?VENDORS[0]:null;
      window.nnHacchuPDF({gid:g?g.id:'',vid:v?v.id:'',lines:[{n:EV,sp:EV,q:1,u:'枚',p:100}]}, EV);
      o.発注書=/<img\s+src=x/i.test(window.__h())?'★生のタグ':'ok';
    }catch(e){ o.発注書='★'+e.message.slice(0,32); }
    window.open=orig; return o; },[EVIL,stub]);
  Object.entries(r).forEach(([k,v])=>say(v==='ok','発注 '+k, v));
  say(!errs.length,'発注 JSエラーなし', errs[0]||'');
  await p.close(); }

await b.close(); console.log('★NG'+NG);
})();
