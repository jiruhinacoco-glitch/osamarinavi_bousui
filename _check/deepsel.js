/* 一覧の1件目を開いた「あとの画面」で、ボタンを片っぱしから押してもJSエラーが出ないか（7ページ）
   ★allbuttons は最初の画面しか見ない。ここは「何かを選んだあと」を見る。
   ★下部ナビと、ページを移るボタンは押さない（移ると測れなくなる）。
   使い方: node _check/deepsel.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const CFG=[
 ['library.html',   ['.lr2','.lrow','.card']],
 ['shiyo_toroku.html',['#list > *:not(.grp):not(h4)','#list > *']],
 ['zairyo_toroku.html',['#list > *:not(.grp):not(h4)','#list > *']],
 ['yougo.html',     ['.term','.yrow','#content .row']],
 ['hacchu.html',    ['.gitem','.gcard','.site','#gwrap > *','main .card']],
 ['camera.html',    []],
 ['kokkosho.html',  ['tbody tr']],
];
let NG=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const [f,sels] of CFG){
 const p=await b.newPage({viewport:{width:1500,height:950}});
 const errs=[]; p.on('pageerror',e=>errs.push((e&&e.stack?e.stack:String(e)).split('\n').slice(0,2).join(' | ').slice(0,180)));
 p.on('dialog',d=>d.dismiss().catch(()=>{}));
 await p.goto('http://localhost:8899/'+f,{waitUntil:'load'}); await p.waitForTimeout(1600);
 let r={opened:'-',pressed:0};
 try{ r=await p.evaluate(async(sels)=>{
   const ow=window.open; window.open=()=>({document:{open(){},write(){},close(){}},focus(){},print(){},close(){}});
   const skip=/全削除|すべて削|消去|リセット|削除/;
   try{ if(window.nnEntryPick) nnEntryPick('daicho'); }catch(e){}
   await new Promise(s=>setTimeout(s,300));
   // 一覧の1件目を開く
   let opened='';
   for(const s of sels){ const el=document.querySelector(s); if(el){ el.click(); opened=s; break; } }
   await new Promise(s=>setTimeout(s,500));
   let n=0; const seen=new Set();
   for(let i=0;i<80;i++){
     const btns=[...document.querySelectorAll('button')].filter(x=>{
       if(x.offsetParent===null) return false;
       if(skip.test(x.textContent||'')) return false;
       if(x.closest('nav')) return false;                    /* 下部ナビは別ページへ移る */
       const oc=x.getAttribute('onclick')||'';
       if(/location|navGo|nnBack|href/.test(oc)) return false; /* ページを移るものは押さない */
       return true;
     });
     const x=btns[i]; if(!x)break;
     const key=i+'|'+(x.id||'')+'|'+(x.textContent||'').trim().slice(0,10);
     if(seen.has(key))continue; seen.add(key);
     try{ x.click(); n++; }catch(e){}
     await new Promise(s=>setTimeout(s,40));
   }
   window.open=ow;
   return {opened, pressed:n};
 }, sels); }catch(e){ console.log('   （途中で移動）'+String(e.message).slice(0,60)); }
 const bad=[...new Set(errs.filter(e=>!/favicon|404/.test(e)))];
 if(bad.length)NG++;
 console.log((bad.length?'★NG ':'○   ')+(f+'                  ').slice(0,20)+'開いた:'+(r.opened||'-')+'  押した:'+r.pressed+(bad.length?('\n     '+bad.slice(0,4).join('\n     ')):''));
 await p.close();
}
await b.close();
console.log(NG?('\n★NG '+NG+'ページ'):'\n全部○');
process.exit(NG?1:0);})();
