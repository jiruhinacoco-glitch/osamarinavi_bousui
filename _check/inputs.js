/* 入力欄の「変な値」ふるい：モーダル・引き出し・詳細を開いてから全欄に入れる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BAD=['-99999','1e99','abc','0','','  ','999999999999','-0.0001','１２３','--5','1,000','０','9'.repeat(30)];
const CLICK=async(p,sel)=>{try{await p.evaluate(s=>{const e=document.querySelector(s); if(e)e.click();},sel);}catch(e){}; await p.waitForTimeout(450);};
const EVAL=async(p,code)=>{try{await p.evaluate(code);}catch(e){}; await p.waitForTimeout(450);};

const OPEN={
 'zumen_sekisan.html':async p=>{ await EVAL(p,'try{nnZMenuClose()}catch(_){}');
   await CLICK(p,'#tl_sample'); await EVAL(p,'try{if(!document.body.classList.contains("sideopen"))document.getElementById("nnSideBtn").click()}catch(_){}');
   await EVAL(p,'try{nnMitsuOpen()}catch(_){}'); },
 'kirokucho_demo.html':async p=>{ await EVAL(p,'try{openModal()}catch(_){}'); },
 'zairyo_toroku.html':async p=>{ await CLICK(p,'#list .mrow'); },
 'shiyo_toroku.html':async p=>{ await CLICK(p,'#list .mrow'); },
 'hacchu.html':async p=>{ await CLICK(p,'.glist .grow.st-kou'); await EVAL(p,'try{[...document.querySelectorAll("button")].filter(b=>/材料|明細|次へ|発注/.test(b.textContent))[0].click()}catch(_){}'); },
 'library.html':async p=>{ await CLICK(p,'.lr2,.lrow,.card'); },
 'yougo.html':async p=>{},'kokkosho.html':async p=>{ await CLICK(p,'tbody tr'); },
 'camera.html':async p=>{ await EVAL(p,'try{nnEntryPick("zumen")}catch(_){}'); },
 'index.html':async p=>{ await EVAL(p,'try{nnDataOpen()}catch(_){}'); },
 'genba_map_v36.html':async p=>{},
};

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let bad=0;
for(const f of Object.keys(OPEN)){
  const ctx=await b.newContext({viewport:{width:1600,height:900}});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,90)));
  await p.goto('http://localhost:8899/'+f,{waitUntil:'load'}); await p.waitForTimeout(1500);
  await OPEN[f](p);
  const r=await p.evaluate(BAD=>{
    const out={欄:0, 壊:[]};
    const ins=[...document.querySelectorAll('input,textarea')].filter(e=>e.offsetParent!==null&&!/file|checkbox|radio|button|submit/.test(e.type));
    out.欄=ins.length;
    ins.forEach(el=>{
      const before=el.value;
      BAD.forEach(v=>{
        try{ el.value=v;
          el.dispatchEvent(new Event('input',{bubbles:true}));
          el.dispatchEvent(new Event('change',{bubbles:true}));
          const t=document.body.innerText;
          if(/NaN|undefined|Infinity|\[object Object\]/.test(t)){
            const m=t.match(/.{0,26}(NaN|undefined|Infinity|\[object Object\]).{0,18}/);
            out.壊.push((el.id||el.name||el.className||el.placeholder||'?')+' ←"'+v+'" : '+(m?m[0].replace(/\n/g,' '):''));
          }
        }catch(e){}
      });
      try{ el.value=before; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }catch(e){}
    });
    out.壊=[...new Set(out.壊)].slice(0,8);
    return out;
  },BAD);
  const ng=r.壊.length+errs.length; bad+=ng;
  console.log((ng?'★NG ':'○   ')+f.padEnd(22)+'欄'+String(r.欄).padStart(3)+(ng?'':' 異常なし'));
  r.壊.forEach(x=>console.log('        壊 '+x));
  [...new Set(errs)].slice(0,4).forEach(x=>console.log('        JS '+x));
  await ctx.close();
}
console.log(bad?('\n合計 '+bad+' 件'):'\n全部○');
await b.close(); process.exit(bad?1:0);
})();
