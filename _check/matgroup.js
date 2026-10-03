/* 材料の絵：①ルーフィング・改質アスファルトシートは名前・説明から表面の種類の絵が自動で出る（一覧・詳細）
   ②絵を選ぶ小窓は同じ仲間の絵だけ（ルーフィング→巻物の仲間、ドレン→部材の仲間）③JSエラーなし。§597
   使い方: node _check/matgroup.js [ファイル]（直す前の版では ①② が★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zairyo_toroku.html'; let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)NG++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1400,height:900}});
/* 絵のファイルがまだ無いもの（新しい表面の種類）は外されるので、1×1の仮の絵を返して「どの絵を読みに行ったか」を測る */
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
await p.route('**/icons/mat_roofing_*.png*',r=>r.fulfill({status:200,contentType:'image/png',body:PNG})); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1500);
const head=async id=>{ await p.evaluate(id=>selectAndShow({type:'cat',id}),id); await p.waitForTimeout(400); return p.evaluate(()=>{const e=document.querySelector('#d_illview .nnmi'); return e&&e.dataset.k;}); };
/* 手で決めた答え（カタログの言葉を人が読んで決めたもの） */
const EXP={M011:'roofing_adhesive',M015:'roofing_color',M014:'roofing_sand',M012:'roofing',M069:'roofing_sand',M073:'roofing_adhesive',M081:'roofing_color',M068:'roofing'};
for(const [id,want] of Object.entries(EXP)){ const k=await head(id); ok('①詳細 '+id+' の絵＝'+want, k===want, k); }
const li=await p.evaluate(()=>{const r=[...document.querySelectorAll('.mrow')].find(x=>/ストライプルーフィング/.test(x.textContent)); const im=r&&r.querySelector('.lic img'); return im?im.getAttribute('src'):null;});
ok('①一覧のストライプルーフィングも粘着層付の絵', !!li&&/mat_roofing_adhesive\.png/.test(li), li);
await head('M011'); await p.click('#d_illbtn'); await p.waitForTimeout(250);
let ks=await p.evaluate(()=>[...document.querySelectorAll('#nnMiPick .gr button')].map(b=>b.dataset.k));
ok('②ルーフィングの小窓は巻物の仲間だけ（おまかせ＋12）', ks.length===13&&ks.includes('roofing_color')&&ks.includes('pvc_sheet')&&!ks.includes('primer')&&!ks.includes('drain_tate'), ks.length);
await p.evaluate(()=>document.getElementById('nnMiPick').remove());
await head('M210'); await p.click('#d_illbtn'); await p.waitForTimeout(250);
ks=await p.evaluate(()=>[...document.querySelectorAll('#nnMiPick .gr button')].map(b=>b.dataset.k));
ok('②ドレンの小窓は部材の仲間だけ（おまかせ＋10）', ks.length===11&&ks.includes('drain_cap_tate')&&!ks.includes('roofing'), ks.length);
ok('③JSエラーなし', !errs.length, errs.slice(0,2));
await b.close(); console.log(NG?'★NG '+NG+'件':'全項目○');})();
