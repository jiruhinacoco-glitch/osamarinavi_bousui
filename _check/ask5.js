/* ★2026-09-04j 「きく」v3：納まりナビの登録なら何でも答える／声と同時に文字が流れる／自然な声を選ぶ ＝ §283
   使い方: node _check/ask5.js ／ node _check/ask5.js ph
   ★正解は検査側で NN_BUKKEN から独立に作る（product の関数は使わない・§117s） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
const ph=process.argv[2]==='ph'; const R=[]; const ok=(n,c,d)=>R.push((c?'○ ':'★NG ')+n+(d?'  '+d:''));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext(ph?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:1366,height:900}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/hacchu.html'); await p.waitForTimeout(600);        /* 発注履歴の見本 */
await p.goto('http://localhost:8899/index.html'); await p.waitForTimeout(900);
await p.evaluate(()=>{ window.NN_ASK_NOW='2026-07-25'; window.__spk=[]; const o=speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak=u=>{ window.__spk.push({t:u.text,lang:u.lang,rate:u.rate}); setTimeout(()=>{ try{u.onboundary&&u.onboundary({charIndex:2});}catch(_){ } },30); setTimeout(()=>{ try{u.onend&&u.onend();}catch(_){ } }, 40+u.text.length*10); }; });
await p.click('#askBtn'); await p.waitForTimeout(400);
/* 正解（独立に計算） */
const T=await p.evaluate(()=>{
  const B=window.NN_BUKKEN, b=B.find(x=>x.code==='J051'), now=new Date('2026-07-25');
  const kou=B.filter(x=>x.stk==='kou'), west=B.filter(x=>x.addr.indexOf('札幌市西区')>=0);
  const maru=B.filter(x=>x.moto==='丸彦渡辺建設'), up=maru.filter(x=>x.nb&&new Date(x.nb)>=now&&['kou','kan','keiyaku'].includes(x.stk)).sort((a,c)=>a.nb<c.nb?-1:1);
  const jul=B.filter(x=>x.nb&&x.nb.slice(0,7)==='2026-07'&&['kou','kan','keiyaku'].includes(x.stk));
  const cost=(b.a&&b.a.length?b.a:b.y).reduce((s,v)=>s+v,0);
  return {b, kouN:kou.length, westN:west.length, maruN:maru.length, nextNb:up[0]&&up[0].nb, nextName:up[0]&&up[0].name, julN:jul.length, julSum:jul.reduce((s,x)=>s+x.amt,0), profit:b.amt-cost};
});
const A=async q=>await p.evaluate(q=>NN_ASK.answer(q), q);
const jd=s=>{const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m[1]+'年'+(+m[2])+'月'+(+m[3])+'日';};
let a=await A('サン太平の入金日は？');
ok('①入金日＝物件の入金予定日（nb）', a.ok && a.head.indexOf(jd(T.b.nb))>=0, a.head);
ok('①声の文は会話の形（〜の入金予定は、〜です。）', /入金予定は、.*です。/.test(a.speak), a.speak);
ok('①根拠に支払条件・請負金額', (a.lines||[]).join('/').indexOf(T.b.sh)>=0 && (a.lines||[]).join('/').indexOf('¥'+T.b.amt.toLocaleString('ja-JP'))>=0);
a=await A('ゼネコンの丸彦渡辺建設の入金日っていつ予定だっけ？');
ok('②元請で聞く→その元請の次の入金予定', a.head.indexOf(jd(T.nextNb))>=0 && (a.lines||[])[0].indexOf(T.nextName)>=0, a.head+' / '+(a.lines||[])[0]);
a=await A('札幌市西区の現場っていつから防水工事始まるんだっけ？');
ok('③地名＋着工→その地域でこれから着工の現場の一覧', /着工の現場 \d+件/.test(a.head) && a.sub==='札幌市西区', a.head+' / '+a.sub);
a=await A('サン太平の着工日は？');
ok('④着工日（cb）', a.head.indexOf(jd(T.b.cb))>=0 && /着工/.test(a.speak), a.head);
a=await A('サン太平の完成予定は？');
ok('④完成予定（fy）', a.head.indexOf(jd(T.b.fy))>=0, a.head);
a=await A('サン太平の請負金額は？');
ok('⑤請負金額（amt）＝¥'+T.b.amt.toLocaleString('ja-JP'), a.head==='¥'+T.b.amt.toLocaleString('ja-JP'), a.head);
ok('⑤声の金額は万円・カンマなし', /\d+万円/.test(a.speak) && !/\d,\d/.test(a.speak), a.speak);
a=await A('サン太平の利益は？');
ok('⑥利益＝請負−原価', a.head.indexOf('¥'+T.profit.toLocaleString('ja-JP'))>=0, a.head);
a=await A('サン太平の工法は？');
ok('⑦工法（ko）', a.head===T.b.ko && (a.lines||[]).join('').indexOf(T.b.mk)>=0, a.head);
a=await A('施工中の現場は？');
ok('⑧一覧：施工中 '+T.kouN+'件', a.head.indexOf(T.kouN+'件')>=0 && (a.lines||[]).length>=3, a.head);
a=await A('札幌市西区の現場は？');
ok('⑧一覧：地名で絞る '+T.westN+'件', a.head.indexOf(T.westN+'件')>=0, a.head);
a=await A('丸彦渡辺建設の現場は？');
ok('⑧一覧：元請で絞る '+T.maruN+'件', a.head.indexOf(T.maruN+'件')>=0, a.head);
a=await A('今月の入金予定は？');
ok('⑨今月の入金＝'+T.julN+'件 合計', a.head.indexOf(T.julN+'件')>=0 && a.head.indexOf('¥'+T.julSum.toLocaleString('ja-JP'))>=0, a.head);
a=await A('入金日は？');
ok('⑩現場名を省いても、直前の現場（文脈）で答える', a.head.indexOf(jd(T.b.nb))>=0 || a.sub.indexOf('サン太平')>=0, a.head+' / '+a.sub);
a=await A('丸彦渡辺建設の連絡先');
ok('⑪連絡先が未登録でも電話を推測しない・支払条件だけ答える', !a.ok && /未登録/.test(a.head) && (a.lines||[]).join('').indexOf('翌々月10日振込')>=0, a.head);
a=await A('サン太平のプライマー いくら？');
ok('⑫材料の単価は今までどおり（発注履歴から）', a.ok && /^¥10,500$/.test(a.head), a.head);
a=await A('サン太平のゼッタイニナイ材 いくら？');
ok('⑫無い材料では請負金額に逃げない', /見つかりません/.test(a.head), a.head);
a=await A('てきとうな質問です');
ok('⑬どれにも当たらないときは数字を出さず、聞き方の例を出す', !a.ok && !/¥|\d年/.test(a.head), a.head);
/* 画面：声と同時に文字が流れる */
await p.evaluate(()=>{ window.__spk=[]; });
await p.fill('#nnAskIn','サン太平の入金日は？'); await p.click('#nnAskGo'); await p.waitForTimeout(220);
const mid=await p.evaluate(()=>{const c=document.querySelector('#nnAskBody .nnAns'); return {say:c.querySelector('.say').textContent.length, done:c.classList.contains('done'), speaking:c.classList.contains('speaking'), dtl:getComputedStyle(c.querySelector('.dtl')).opacity};});
ok('⑭答えの文字は声と同時に少しずつ流れる（途中で全部出ていない）', mid.speaking && !mid.done && mid.say>0 && mid.say<40, JSON.stringify(mid));
await p.waitForTimeout(2600);
const end=await p.evaluate(()=>{const c=document.querySelector('#nnAskBody .nnAns'); return {say:c.querySelector('.say').textContent, done:c.classList.contains('done'), dtl:getComputedStyle(c.querySelector('.dtl')).opacity, n:window.__spk.length, txt:window.__spk.map(x=>x.t).join(''), rates:[...new Set(window.__spk.map(x=>x.rate))]};});
ok('⑭終わると全文が出て、根拠（大きな数字・箱書き）が開く', end.done && end.dtl==='1' && end.say.length>20, JSON.stringify({done:end.done,dtl:end.dtl}));
ok('⑭声は1文ずつ（句点で切る）・全文が渡っている', end.n>=2 && end.txt===end.say, end.n+'文');
/* 声の選び方（自然な声を優先） */
const rk=await p.evaluate(()=>[{name:'Kyoko',lang:'ja-JP'},{name:'Kyoko (拡張)',lang:'ja-JP'},{name:'Siri',lang:'ja-JP'},{name:'Google 日本語',lang:'ja-JP'},{name:'Microsoft Nanami Online (Natural)',lang:'ja-JP'}].map(v=>NN_ASK._rankVoice(v)));
ok('⑮声は 拡張／Siri／Natural／Google を素のものより優先する', rk[1]>rk[0] && rk[2]>rk[0] && rk[3]>rk[0] && rk[4]>rk[0], rk.join(','));
const ch=await p.evaluate(()=>NN_ASK._chunks('入金予定は、9月14日です。あと51日です。支払条件は理事会承認後です。'));
ok('⑮文は句点で切れる', ch.length===3, JSON.stringify(ch));
/* 設定が開く・声の一覧・高品質音声の欄 */
await p.click('#nnAskSetBtn'); await p.waitForTimeout(250);
const st=await p.evaluate(()=>({on:document.querySelector('#nnAskSet').classList.contains('on'), voice:!!document.querySelector('#nnAskVoice'), key:!!document.querySelector('#nnAskKey'), rate:!!document.querySelector('#nnAskRate')}));
ok('⑯⚙で 声の選択・速さ・高品質音声（APIキー）の設定が開く', st.on&&st.voice&&st.key&&st.rate, JSON.stringify(st));
await p.click('#nnAskSetX'); await p.waitForTimeout(150);
ok('⑯設定は別の小窓（✕で閉じると質問の場に戻る）', await p.evaluate(()=>!document.getElementById('nnAskSet').classList.contains('on')));
/* 例は分野ごと */
const cats=await p.evaluate(()=>[...document.querySelectorAll('#nnAskCats button')].map(b=>b.textContent));
ok('⑰例の分野（お金・日程・現場・材料・連絡先）', cats.join(',')==='お金,日程,現場,材料,連絡先', cats.join(','));
await p.click('#nnAskCats button:nth-child(2)'); await p.waitForTimeout(150);
ok('⑰分野を押すと例が入れ替わる', (await p.evaluate(()=>document.querySelector('#nnAskEx button').textContent)).indexOf('着工')>=0);
/* ボタンの大きさ（指で押せる） */
const sz=await p.evaluate(()=>['#nnAskMic','#nnAskGo','#nnAskX','#nnAskSpk','#nnAskSetBtn'].map(s=>{const r=document.querySelector(s).getBoundingClientRect(); return Math.min(r.width,r.height);}));
ok('⑱ボタンは全部 36px以上（マイクは72px）', sz.every(x=>x>=36) && sz[0]>=64, sz.join(','));
ok('⑱横にはみ出さない', await p.evaluate(()=>document.querySelector('#nnAskBox').scrollWidth<=document.querySelector('#nnAskBox').clientWidth+1));
/* 他のページ（物件一覧をまだ読んでいない）からも、開けば読んで答える */
await p.goto('http://localhost:8899/hacchu.html'); await p.waitForTimeout(700);
await p.evaluate(()=>{ window.NN_ASK_NOW='2026-07-25'; });
const has0=await p.evaluate(()=>Array.isArray(window.NN_BUKKEN));
await p.click('#askHdBtn'); await p.waitForTimeout(900);
const a2=await A('サン太平の入金日は？');
ok('⑲発注ページ（物件一覧を読んでいない）でも、開くと読んで答える', has0===false && a2.head.indexOf(jd(T.b.nb))>=0, 'before='+has0+' '+a2.head);
ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
console.log(R.join('\n')); console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
await b.close();})();
