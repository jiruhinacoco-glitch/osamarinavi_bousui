/* スマホモード・縦向きのカード（.spn＝PCと同じ項目のカード §1123）の検査
   使い方：node _check/spcard1.js [ファイル名]   （http://localhost:8899 が要る）
   ①縦：新しいカードが出ている・高さ 215〜235px・一覧に 2.3〜2.7 枚
   ②縦：100枚ぜんぶで字のはみ出し 0（実測）
   ③縦：PCと同じ見出し13個・写真/写真2〜6/資料 がカードの中に見えている
   ④縦：字の欄は押しても選ぶだけ・▼の欄は選ぶ箱が出る・「詳細」で詳細が開く
   ⑤横向き：新しいカードは出ず、前のカードのまま ／ PC：新しいカードを作らない */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html', URL='http://localhost:8899/'+FILE;
let ng=0; const ok=(c,t,x)=>{ if(c) console.log('○',t,x||''); else { ng++; console.log('★NG',t,x||''); } };
async function open(b,vw,vh,phone){
  const c=await b.newContext(phone?{viewport:{width:vw,height:vh},screen:{width:vw,height:vh},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:vw,height:vh}});
  if(phone) await c.addInitScript(()=>{ try{ localStorage.setItem('nn_view_mode','mobile'); }catch(e){} });
  const p=await c.newPage(); p._errs=[]; p.on('pageerror',e=>p._errs.push(e.message));
  await p.goto(URL,{waitUntil:'load'});
  await p.waitForFunction(()=>typeof showView==='function');
  await p.evaluate(()=>showView('list'));
  await p.waitForFunction(()=>document.querySelectorAll('#list .pcard').length>=50,null,{timeout:15000});
  await p.waitForTimeout(600);
  return [c,p];
}
(async()=>{
  const b=await chromium.launch();
  { const [c,p]=await open(b,390,844,true);
    const r=await p.evaluate(()=>{
      const cs=[...document.querySelectorAll('#list .pcard')], L=document.getElementById('list').getBoundingClientRect();
      const vis=e=>{ if(!e) return false; const q=e.getBoundingClientRect(); return q.width>2&&q.height>2&&getComputedStyle(e).visibility!=='hidden'; };
      const c0=cs[0], c1=cs[1], spn=c0.querySelector(':scope > .spn');
      const h=c0.getBoundingClientRect().height, pitch=c1.getBoundingClientRect().top-c0.getBoundingClientRect().top;
      cs.forEach(c=>c.classList.remove('nnoff'));
      const ov=[]; cs.forEach(c=>{ c.querySelectorAll(':scope > .spn :is(.v,.ebox,.l,.a,.t,.s,.x,.m,.c,.h,i,.status)').forEach(e=>{ /* ★2026-11-14za 縦のはみ出しは scrollHeight で測らない。書体（Zen Kaku 系）は「字の入れ物」が字の大きさの約1.45倍あり、行の高さを字と同じにしてある欄では
           字が欄に収まっていても scrollHeight だけが 2〜3px 大きく出る（ゆるく傾けた書体 NNSlant を入れて、こちらのブラウザでも実機と同じ書体になり表に出た）。
           → 実際の字の行数 × 字の大きさ が、欄の高さを超えるかで測る（2行に折れて欄からあふれた、を捕まえる） */
        const VOV=(e)=>{ if(e.children.length) return false; const t=e.firstChild; if(!t||t.nodeType!==3||!t.textContent.trim()) return false; const r=document.createRange(); r.selectNodeContents(e); const tops=new Set([...r.getClientRects()].filter(x=>x.width>0).map(x=>Math.round(x.top))); return tops.size*parseFloat(getComputedStyle(e).fontSize) > e.clientHeight+1.5; };
        if(e.scrollWidth>e.clientWidth+1||VOV(e)) ov.push(c.dataset.pid+':'+e.className+':'+e.textContent.slice(0,10)); }); });
      const hd=spn?[...spn.querySelectorAll('.sptb .h')].map(e=>e.textContent):[];
      const cb=c0.getBoundingClientRect(), inside=e=>{ if(!vis(e)) return false; const q=e.getBoundingClientRect(); return q.left>=cb.left-1&&q.right<=cb.right+1&&q.top>=cb.top-1&&q.bottom<=cb.bottom+1; };
      const hs=cs.map(c=>Math.round(c.getBoundingClientRect().height));
      return {spn:vis(spn),h,pitch,per:(L.height-15)/pitch,ov,hd,ph:inside(c0.querySelector('.pph')),sh:inside(c0.querySelector('.pshots')),nsh:c0.querySelectorAll('.pshots .psh').length,dc:inside(c0.querySelector('.pdocn')),ndc:[...c0.querySelectorAll('.pdocn .dc')].filter(vis).length,
        old:[...c0.querySelectorAll('.rhead,.sp-more,.sproofs,.spsum')].filter(vis).length, hmin:Math.min(...hs), hmax:Math.max(...hs)};
    });
    ok(r.spn,'①縦：新しいカード（.spn）が出ている');
    ok(r.hmin>=215&&r.hmax<=235,'①縦：カードの高さ 215〜235px','最小'+r.hmin+' 最大'+r.hmax);
    ok(r.per>=2.3&&r.per<=2.7,'①縦：一覧に見える枚数 2.3〜2.7','='+(r.per||0).toFixed(2));
    ok(r.old===0,'①縦：前のカードの部品は出ていない','残り'+r.old);
    /* ★2026-11-14zq 一覧の背景は詳細と同じ濃い緑・背景の上の字（件数）は明るい・選んでいるカードの枠は黄色（オレンジではない） */
    { const z=await p.evaluate(()=>{ const lum=c=>{const m=c.match(/[\d.]+/g).map(Number); return Math.round(0.299*m[0]+0.587*m[1]+0.114*m[2]);}; const L=document.getElementById('list'), T=document.getElementById('toolbar'), n=document.getElementById('nnLC'), s=document.querySelector('#list .pcard.sel');
        const tb=(getComputedStyle(T).backgroundImage.match(/rgb\((\d+), (\d+), (\d+)\)/)||[]).slice(1).map(Number);
        return {list:lum(getComputedStyle(L).backgroundColor),tool:tb.length?Math.round(0.299*tb[0]+0.587*tb[1]+0.114*tb[2]):255,cnt:n?lum(getComputedStyle(n).color):0,sel:s?getComputedStyle(s).borderTopColor.match(/\d+/g).map(Number):null}; });
      ok(z.list<=60&&z.tool<=70&&z.cnt>=200,'⑥縦：一覧の背景が濃い色（詳細と同じ濃い緑）・件数の字は明るい',z);
      ok(!!z.sel&&z.sel[0]>=235&&z.sel[1]>=195&&z.sel[2]<=110,'⑥縦：選んでいるカードの枠が黄色',z.sel); }
    ok(r.ov.length===0,'②縦：字のはみ出し 0（100枚）',r.ov.slice(0,6).join(' / '));
    const WANT=['請負種別','元請名','請負体制','協力業者','請負単価','請負金額','予定利益額・率','屋根数','計画日数','残り日数','計画人工','現在人工'];
    ok(WANT.every(w=>r.hd.includes(w))&&r.hd.length===13,'③縦：表の見出しがPCと同じ13個',r.hd.length+'個');
    ok(r.ph,'③縦：写真がカードの中に見えている');
    ok(r.sh&&r.nsh===5,'③縦：写真2〜6（5マス）がカードの中に見えている','マス'+r.nsh);
    ok(r.dc&&r.ndc===6,'③縦：資料（6つ）がカードの中に見えている','資料'+r.ndc);
    if(!r.spn){ ok(false,'④縦：押したときの動き（新しいカードが無いので測れない）'); } else {
    /* スマホの取り決め（§11-01）：字の欄は押しても直さない（選ぶだけ）。▼の欄・詳細・資料は動く */
    await p.tap('#list .pcard:nth-of-type(2) > .spn .ebox.nm'); await p.waitForTimeout(400);
    const e1=await p.evaluate(()=>({inp:!!document.querySelector('#list .pcard > .spn .ebox.nm input'), sel:document.querySelectorAll('#list .pcard')[1].classList.contains('sel')}));
    ok(!e1.inp&&e1.sel,'④縦：工事名を押すと選ぶだけ（その場で直す箱は開かない）',JSON.stringify(e1));
    await p.tap('#list .pcard:nth-of-type(2) > .spn .ebox.kd');
    const e2=await p.waitForFunction(()=>!!document.querySelector('#list .pcard > .spn .ebox.kd select'),null,{timeout:3000}).then(()=>true,()=>false);
    ok(e2,'④縦：工事種別▾ を押すと選ぶ箱が出る');
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    await p.tap('#list .pcard:nth-of-type(2) > .spn .status.stsel');
    const e3=await p.waitForFunction(()=>!!document.querySelector('#list .pcard > .spn .status.stsel select'),null,{timeout:3000}).then(()=>true,()=>false);
    ok(e3,'④縦：ステータス▾ を押すと選ぶ箱が出る');
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    await p.tap('#list .pcard:nth-of-type(2) > .spn .spgo');
    const dt=await p.waitForFunction(()=>document.getElementById('mainview').classList.contains('show-detail'),null,{timeout:4000}).then(()=>true,()=>false);
    ok(dt,'④縦：「詳細」で詳細が開く');
    }
    ok(p._errs.length===0,'縦：エラーなし',p._errs.slice(0,2).join(' / '));
    await c.close(); }
  { const [c,p]=await open(b,844,390,true);
    const r=await p.evaluate(()=>{ const c0=document.querySelector('#list .pcard'), s=c0.querySelector(':scope > .spn'), rh=c0.querySelector('.rhead');
      return {spn:!!s&&s.getBoundingClientRect().height>0, rh:!!rh&&rh.getBoundingClientRect().height>0, h:c0.getBoundingClientRect().height}; });
    ok(!r.spn&&r.rh,'⑤横向き：新しいカードは出ず、前のカードのまま','高さ'+Math.round(r.h));
    await c.close(); }
  { const [c,p]=await open(b,1920,1080,false);
    const r=await p.evaluate(()=>({n:document.querySelectorAll('#list .pcard > .spn').length, pcxn:!!document.querySelector('#list .pcard .pcxn')}));
    ok(r.n===0&&r.pcxn,'⑤PC：新しいカードを作らない（PCの表はそのまま）','.spn '+r.n);
    await c.close(); }
  await b.close();
  console.log(ng?('★NG '+ng+'件'):'○ すべて合格');
})();
