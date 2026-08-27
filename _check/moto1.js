/* ★2026-08-27b 元請別 成績（ダッシュボード）と「結果」タグの検証
   本人の指示「打ち合わせの前に、この元請はどうだったかを見てから行けるように」。
   ・元請ごとの件数・受注額・利益額・平均利益率が、物件データから手で計算した値と合うか
   ・予実差＝完成した現場の「実績の粗利率」−「見積のときの粗利率」（pt）
   ・手戻り＝手戻り／手直し／クレームのタグが付いた現場の数（増額ありは数えない）
   ・★読み込んだ直後から正しい数が出るか（以前はタグが間に合わず 0 のままだった）
   使い方: node _check/moto1.js  ／ スマホは node _check/moto1.js ph */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
                            :{viewport:{width:1600,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForSelector('.moto-tbl',{timeout:20000});

  /* --- ①パネルがある・列がそろっている --- */
  const head=await p.$$eval('.moto-tbl tr:first-child th',ts=>ts.map(t=>t.textContent.replace(/[▼▲]/g,'').trim()));
  ok('元請別 成績のパネルがある', head.length>0);
  ok('列は 元請/比率/実績数/受注額/利益額/平均利益率/予実差/手戻り',
     head[0]==='元請'&&/比率|大きさ/.test(head[1])&&head[2]==='実績数'&&head[3]==='受注額'
     &&head[4]==='利益額'&&head[5]==='平均利益率'&&head[6]==='予実差'&&head[7]==='手戻り', head.join('|'));

  /* --- ②数字が物件データと合う（画面の値と、こちらで別に足した値をつき合わせる） --- */
  const cmp=await p.evaluate(()=>{
    /* 検査側で独立に計算する（画面が使っている集計は呼ばない） */
    const want={};
    props.filter(x=>['kan','kou','keiyaku'].includes(x.stRaw)).forEach(x=>{
      const k=x.moto||'（元請未入力）';
      const o=(want[k]=want[k]||{n:0,order:0,profit:0,dO:0,dA:0,dB:0,teb:0});
      o.n++; o.order+=x.order; o.profit+=(x.stRaw==='kan'?x.aGro:x.bGro);
      if(x.stRaw==='kan'){ o.dO+=x.order; o.dA+=x.aGro; o.dB+=x.bGro; }
      const d=x.defects||[];
      if(d.indexOf('tebodori')>=0||d.indexOf('tenaoshi')>=0||d.indexOf('claim')>=0) o.teb++;
    });
    const num=s=>parseFloat(String(s).replace(/[^0-9.\-]/g,''))||0;
    const got=[...document.querySelectorAll('.moto-tbl tr')].slice(1).map(tr=>{
      const c=[...tr.children].map(td=>td.textContent.trim());
      return {name:c[0], n:num(c[2]), order:num(c[3]), profit:num(c[4]),
              rate:c[5]==='—'?null:num(c[5]), gap:c[6], teb:c[6]!==undefined?c[7]:''};
    });
    const bad=[];
    got.forEach(g=>{
      const w=want[g.name];
      if(!w){ bad.push(g.name+': データに無い'); return; }
      if(g.n!==w.n) bad.push(g.name+' 件数 '+g.n+'≠'+w.n);
      if(Math.abs(g.order-w.order)>1) bad.push(g.name+' 受注額 '+g.order+'≠'+w.order);
      if(Math.abs(g.profit-Math.round(w.profit))>2) bad.push(g.name+' 利益額 '+g.profit+'≠'+Math.round(w.profit));
      const wr=w.order?w.profit/w.order*100:null;
      if(wr!=null && Math.abs(g.rate-wr)>0.1) bad.push(g.name+' 利益率 '+g.rate+'≠'+wr.toFixed(1));
      const wg=w.dO?((w.dA-w.dB)/w.dO*100):null;
      const gg=g.gap==='—'?null:num(g.gap)*(/−|-/.test(g.gap)?-1:1);
      if(wg==null){ if(g.gap!=='—') bad.push(g.name+' 予実差は—のはず'); }
      else if(Math.abs(gg-wg)>0.15) bad.push(g.name+' 予実差 '+gg+'≠'+wg.toFixed(1));
      const wt=w.teb, gt=g.teb==='—'?0:num(g.teb);
      if(gt!==wt) bad.push(g.name+' 手戻り '+gt+'≠'+wt);
    });
    return {rows:got.length, want:Object.keys(want).length, bad};
  });
  ok('元請の数が合う', cmp.rows===cmp.want, cmp.rows+'行／データ'+cmp.want+'社');
  ok('件数・受注額・利益額・利益率・予実差・手戻りが全社で一致', cmp.bad.length===0, cmp.bad.slice(0,4).join(' / '));

  /* --- ③読み込んだ直後から手戻りが出ている（以前は0のままだった） --- */
  const teb=await p.evaluate(()=>[...document.querySelectorAll('.moto-tbl tr')].slice(1)
    .filter(tr=>{const t=tr.children[7]; return t && t.textContent.trim()!=='—';}).length);
  ok('読み込んだ直後から手戻りの数が出ている（0のままにならない）', teb>=2, teb+'社');

  /* --- ④並び替え・比率バー・戻す --- */
  await p.evaluate(()=>dashSortSet('moto','teb')); await p.waitForTimeout(600);
  /* ★.housort は工法別にもあるので、必ず元請のパネルの中だけを見ること */
  const s1=await p.evaluate(()=>{ const pn=document.querySelector('.moto-tbl').closest('.dpanel');
    return {first:pn.querySelector('.moto-tbl tr:nth-child(2)').children[7].textContent.trim(),
      note:pn.querySelectorAll('.housort .hsv')[0].textContent.trim(),
      bar:pn.querySelectorAll('.housort .hsv')[1].textContent.trim(),
      reset:!!pn.querySelector('.hsreset')}; });
  ok('手戻りで並べ替えると多い順が先頭に', s1.first!=='—', JSON.stringify(s1));
  ok('並び順の説明が出る', /手戻り/.test(s1.note), s1.note);
  ok('バーの対象も手戻りになる', s1.bar==='手戻り', s1.bar);
  ok('「並びを戻す」ボタンが出る', s1.reset);
  await p.evaluate(()=>motoSortReset()); await p.waitForTimeout(600);
  const s2=await p.evaluate(()=>document.querySelector('.moto-tbl').closest('.dpanel')
    .querySelectorAll('.housort .hsv')[0].textContent.trim());
  ok('戻すと既定（平均利益率の高い順）に戻る', /平均利益率/.test(s2), s2);

  /* --- ⑤列の編集ができる --- */
  const cols=await p.evaluate(()=>{ COLS.moto[6].on=false; renderDash(); return COLS.moto.length; });
  await p.waitForTimeout(700);
  const h2=await p.$$eval('.moto-tbl tr:first-child th',ts=>ts.map(t=>t.textContent.replace(/[▼▲]/g,'').trim()));
  ok('列を隠せる（予実差を外すと消える）', cols===8 && h2.indexOf('予実差')<0, h2.join('|'));
  await p.evaluate(()=>{ COLS.moto[6].on=true; renderDash(); }); await p.waitForTimeout(600);

  /* --- ⑥「結果」タグが使える --- */
  const tg=await p.evaluate(()=>{
    const has=k=>props.some(x=>(x.defects||[]).indexOf(k)>=0);
    return {tebodori:has('tebodori'),tenaoshi:has('tenaoshi'),claim:has('claim'),zougaku:has('zougaku')};
  });
  ok('結果タグ4種が現場に付いている', tg.tebodori&&tg.tenaoshi&&tg.claim&&tg.zougaku, JSON.stringify(tg));
  const zg=await p.evaluate(()=>{
    /* 増額ありだけの元請は「手戻り」に数えない */
    const only=props.filter(x=>(x.defects||[]).indexOf('zougaku')>=0
      && !['tebodori','tenaoshi','claim'].some(k=>(x.defects||[]).indexOf(k)>=0));
    if(!only.length) return 'なし';
    const mk=only[0].moto;
    const tr=[...document.querySelectorAll('.moto-tbl tr')].slice(1).find(t=>t.children[0].textContent.trim()===mk);
    return tr?mk+'→'+tr.children[7].textContent.trim():'行が無い';
  });
  ok('「増額あり」は手戻りに数えない', /→—$/.test(zg), zg);

  /* --- ⑦横にはみ出さない --- */
  const over=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ok('横にはみ出さない', over<=1, over+'px');
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log((PH?'== スマホ ==\n':'== パソコン ==\n')+R.join('\n'));
  console.log(R.some(x=>x.startsWith('★'))?'':'全部○');
  await b.close();
})();
