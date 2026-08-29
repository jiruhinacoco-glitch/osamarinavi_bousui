/* 長い工事名・場所・元請・作成者・図面番号を入れても、
   元請に出す紙の枠から文字が飛び出さないか。

   ★2026-08-29a に見つけた不具合：
     表題欄（下の横帯）は入力した文字をそのまま刷っていたので、
     工事名が長いと右の欄から飛び出し、紙の外まで 106mm 伸びていた。
     いまは A.fit で枠に入る長さまで切る（入らない分は「…」）。
   ★確かめ方：SVGを実DOMに描いて getComputedTextLength() で実幅を測る。
     文字数から見当をつけるのではなく、実際に描いた幅で見ること。

   使い方: node _check/longtext.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const FILE=process.argv[2]||'zumen_sekisan.html';
const LONG='札幌市中央区北七条西二十八丁目 三井不動産レジデンシャル管理組合法人 大規模修繕工事 第2期 屋上防水改修工事（A棟B棟C棟一括）';
const DOCS=[['平面図','nnPlanPDF'],['断面詳細図','nnSectionPDF'],['割付図','nnWariPDF'],
            ['施工層構成図','nnIsoPDF'],['標準納まり詳細図','nnDetailPDF']];
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1400,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
  await p.evaluate(L=>localStorage.setItem('nn_zumen_plan_v1',JSON.stringify(
    {title:L,addr:L,client:L,author:L,no:'NN-'+L,north:'up',paper:'a3'})),LONG);
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(1500);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ window.open=function(){ return {document:{write(h){window.__svg=(window.__svg||'')+h;},
    close(){}},addEventListener(){},focus(){},print(){}};}; });
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(800);

  let cutAll=0;
  for(const [nm,fn] of DOCS){
    const r=await p.evaluate(f=>{
      window.__svg=null;
      try{ if(f==='nnDetailPDF') window.nnDetailPDF({type:'coat_para',H:300,slab:150,cant:75,ins:0,spec:'AS-T1'});
           else window[f](); }catch(e){ return {err:e.message}; }
      const h=window.__svg||''; const m=h.match(/<svg[\s\S]*?<\/svg>/); if(!m) return {err:'SVGが出ない'};
      const d=document.createElement('div'); d.style.cssText='position:fixed;left:-99999px;top:0';
      d.innerHTML=m[0]; document.body.appendChild(d);
      const sv=d.querySelector('svg'); const vb=(sv.getAttribute('viewBox')||'').split(/\s+/).map(Number);
      const W=vb[2]||0;
      const over=[]; let cut=0, worst=0;
      d.querySelectorAll('text').forEach(t=>{
        const s=t.textContent||'';
        if(/…/.test(s)) cut++;
        let len=0; try{ len=t.getComputedTextLength(); }catch(_){ return; }
        if(!len || /rotate/.test(t.getAttribute('transform')||'')) return;
        const x=+t.getAttribute('x')||0, an=t.getAttribute('text-anchor')||'start';
        let x0=x; if(an==='middle') x0=x-len/2; else if(an==='end') x0=x-len;
        const o=Math.max(0,-x0,x0+len-W);
        if(o>0.6){ over.push(s.slice(0,20)+'(+'+o.toFixed(1)+'mm)'); if(o>worst) worst=o; }
      });
      d.remove(); return {W,over,cut,worst:+worst.toFixed(1)};
    },fn);
    if(r.err){ ok(nm+'：書類が出る', false, r.err); continue; }
    ok(nm+'：紙(幅'+r.W+'mm)から文字が飛び出さない', r.over.length===0,
       r.over.length?('+'+r.worst+'mm  '+r.over.slice(0,3).join(' / ')):'');
    cutAll+=r.cut;
  }
  ok('長い文字は「…」で切られている', cutAll>0, cutAll+'か所');
  ok('JSエラーなし', errs.length===0, errs[0]||'');
  console.log(R.join('\n'));
  const ng=R.filter(x=>x.startsWith('★')).length;
  console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
  await b.close(); process.exit(ng?1:0);
})();
