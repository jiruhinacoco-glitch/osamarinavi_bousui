/* 現場記録帳：物件詳細の8つのタブで、画面にあるボタンを片っぱしから押してもJSエラーが出ないか
   ★ふつうの「ボタン総当たり」（allbuttons）は最初の画面しか見ない。
     詳細を開いたあとの画面はここで見る。
   ★押すたびに「いま画面にあるボタン」を取り直すこと。
     まとめて集めてから押すと、途中の描き直しで古いボタンを押してしまい、
     product は正しいのに★NGが出る（実際に出た）。
   使い方: node _check/deeptabs.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1500,height:950}});
const errs=[]; p.on('pageerror',e=>errs.push((e&&e.stack?e.stack:String(e)).split('\n').slice(0,2).join(' | ').slice(0,180)));
p.on('dialog',d=>d.dismiss().catch(()=>{}));
await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
await p.waitForTimeout(2200);
/* 完成済・施工中・見積済 の3件で見る */
const ids=await p.evaluate(()=>{
  const pick=st=>{const q=props.find(x=>x.stRaw===st); return q?q.id:null;};
  return [pick('kan'), pick('kou'), pick('mit')].filter(x=>x!=null);
});
let total=0;
for(const id of ids){
  const r=await p.evaluate(async(id)=>{
    const ow=window.open; window.open=()=>({document:{open(){},write(){},close(){}},focus(){},print(){},close(){}});
    const skip=/全削除|すべて削除|消去|リセット/;
    let n=0; const seen=new Set();
    selectedId=id; showView('list'); openDetailFull();
    for(const t of TABS){
      setTab(t); await new Promise(s=>setTimeout(s,150));
      for(let i=0;i<40;i++){
        const btns=[...document.querySelectorAll('#detail button')]
          .filter(x=>x.offsetParent!==null && !skip.test(x.textContent||''));
        const x=btns[i]; if(!x)break;
        const key=t+'|'+i+'|'+(x.textContent||'').trim().slice(0,10);
        if(seen.has(key))continue; seen.add(key);
        x.click(); n++;
        await new Promise(s=>setTimeout(s,55));
        const mb=document.getElementById('modalbg');
        if(mb && getComputedStyle(mb).display!=='none'){
          try{ closeModal(); }catch(e){ mb.style.display='none'; }
          await new Promise(s=>setTimeout(s,80));
        }
        if(!document.getElementById('mainview').classList.contains('show-detail')){
          openDetailFull(); setTab(t); await new Promise(s=>setTimeout(s,120));
        }
      }
    }
    window.open=ow;
    return n;
  }, id);
  total+=r;
  console.log('     物件 '+id+'：'+r+'個のボタンを押した');
}
ok(total>200,'8タブ×3物件で十分な数を押せた ('+total+'個)');
const bad=[...new Set(errs.filter(e=>!/favicon|404/.test(e)))];
ok(bad.length===0,'JSエラーなし'+(bad.length?'\n     '+bad.slice(0,5).join('\n     '):''));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
