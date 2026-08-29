/* HTMLの中で「押したら呼ぶ」と書いてある処理が、本当に存在するか（全11ページ）
   ★書き残し（消した処理を呼んだまま）だと、押すたびにJSエラーが出て、
     そのあとの処理が止まる。§188で1件見つかった型。
   ★画面に最初から在るものだけでなく、あとから作られる部品の中の呼び出しも見る
     （HTMLの文字列から名前を集め、ページの中に在るかを確かめる）。
   使い方: node _check/fnexist.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs'), path=require('path');
const P=['index','kirokucho_demo','genba_map_v36','hacchu','kokkosho','camera','library',
         'zumen_sekisan','shiyo_toroku','zairyo_toroku','yougo'];
const KW=new Set(['if','for','while','switch','catch','return','function','typeof','new','try','do','else',
  'this','void','delete','in','of','instanceof','yield','await','case','throw','const','let','var']);
let NG=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const f of P){
  /* ① ソースから「on◯◯="…"」の中の関数名を集める（テンプレート文字列の中も拾える） */
  const src=fs.readFileSync(path.join(__dirname,'..',f+'.html'),'utf8');
  const names=new Set();
  const attr=/\son[a-z]+\s*=\s*(["'])([\s\S]*?)\1/g; let a;
  while((a=attr.exec(src))){
    const body=a[2];
    const re=/(^|[^.\w$'"`])([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g; let m;
    while((m=re.exec(body))){ const n=m[2]; if(!KW.has(n)) names.add(n); }
  }
  const p=await b.newPage({viewport:{width:1500,height:950}});
  p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8899/'+f+'.html',{waitUntil:'load'});
  await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}});
  await p.waitForTimeout(1500);
  /* ★書き出す書類（別タブ）の中だけで使う処理は、親のページには無くて正しい。
     ソースのどこかに定義があれば合格とする（例：nnDocBack は書類のHTMLの中で定義している）。 */
  const defined=new Set();
  [...src.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].forEach(m=>defined.add(m[1]));
  [...src.matchAll(/(?:window\.|var |let |const )([A-Za-z_$][\w$]*)\s*=\s*(?:function|\()/g)].forEach(m=>defined.add(m[1]));
  const ask=[...names].filter(n=>!defined.has(n));
  const miss=await p.evaluate((list)=>{
    const out=[];
    list.forEach(n=>{
      let v; try{ v=eval('typeof '+n); }catch(e){ v='なし'; }
      if(v!=='function') out.push(n+'('+v+')');
    });
    return out;
  }, ask);
  if(miss.length)NG++;
  console.log((miss.length?'★NG ':'○   ')+(f+'              ').slice(0,16)
    +'呼び出し'+names.size+'種（ページ内で確かめたのは'+ask.length+'種）'+(miss.length?('  存在しない: '+miss.join(', ')):''));
  await p.close();
}
await b.close();
console.log(NG?('\n★NG '+NG+'ページ'):'\n全部○');
process.exit(NG?1:0);
})();
