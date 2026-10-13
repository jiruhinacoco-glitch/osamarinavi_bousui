/* ★2026-10-13zf 写真台帳：Excel で書き出す（§672・本人「PDF 以外に Excel 出力。レイアウト綺麗に」）
   PC で横長・縦長の写真をまぜて4枚（＝2ページ）入れ、「📊 Excel」で出たファイルを調べる：
   ① 写真0枚では押せない・押すと .xlsx が出る（名前は「写真台帳_現場名_日付.xlsx」）
      ★検査ブラウザ（Linux の headless Chromium）は日本語のファイル名を「download」に置き換えるので、名前はアプリが付けた名前（window._nnXlsName）で見る
   ② 用紙：A4（paperSize 9）・たて・余白 12mm・横は1ページに収める（fitToWidth 1・fitToHeight 0）・印刷範囲 A〜I・目盛線なし・改ページは3枚ごと（4枚なら1か所）
   ③ 寸法（Excel の数え方：幅 w → (7w+5)px・96dpi）：列の合計 186mm（±1）・写真の列は 27mm×4・1ページの行の高さの合計は A4 の印刷範囲 273mm 以下
   ④ 文字：写真ごとに No.／工事名／工種／撮影日／部位／作業内容（入れた値と同じ）
   ⑤ 写真：4枚・四すみが写真の枠（B〜E 列・その写真の段の6行）の中・縦横比が元の絵と同じ（2% 以内）・左右と上下の余白が同じ（1mm 以内＝真ん中）
   ⑥ 出来上がり（LibreOffice で PDF にして画素で測る）：2ページ・A4・1ページ目の1枚目（横長）と2枚目（縦長）の写真が灰色の枠の真ん中（左右のすき間の差 1.5mm 以内）
   ⑦ pageerror 0
   直す前の版では ①〜⑥ が★NG（Excel のボタンが無い）。
   使い方: node _check/daicho_xls.js [camera.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const {execFileSync}=require('child_process'); const fs=require('fs'); const os=require('os'); const path=require('path');
const F=process.argv[2]||'camera.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,320):'')); if(!c)NG++;};
const SITE='エクセル検査 マンション';
const DIR=fs.mkdtempSync(path.join(os.tmpdir(),'nnxls-')); const XL=path.join(DIR,'out.xlsx');
const PY=String.raw`
import sys, json, zipfile, re
from openpyxl import load_workbook
p=sys.argv[1]; wb=load_workbook(p); ws=wb.active
mm=lambda w:((7*w+5)/96*25.4)
z0=zipfile.ZipFile(p); sx=z0.read('xl/worksheets/sheet1.xml').decode('utf8')
cw={}
for a,b,w in re.findall(r'<col min="(\d+)" max="(\d+)" width="([\d.]+)"', sx):
    for c in range(int(a),int(b)+1): cw[c]=float(w)
cols=[cw.get(c,8.43) for c in range(1,10)]   # 列の幅は XML から直接（openpyxl は min〜max でまとめた列を先頭の列にしか付けない）
ps=ws.page_setup; pm=ws.page_margins
rows=[(r, (ws.row_dimensions[r].height or 15)*25.4/72) for r in range(1, ws.max_row+1)]
breaks=[b.id for b in ws.row_breaks.brk]
texts={}
for r in range(1, ws.max_row+1):
    g=ws.cell(r,7).value; h=ws.cell(r,8).value
    if g is not None: texts.setdefault(str(g),[]).append('' if h is None else str(h))
z=zipfile.ZipFile(p); dr=[n for n in z.namelist() if n.startswith('xl/drawings/drawing') and n.endswith('.xml')]
anc=[]
for n in dr:
    x=z.read(n).decode('utf8')
    for a in re.findall(r'<xdr:twoCellAnchor.*?</xdr:twoCellAnchor>', x, re.S):
        f=re.search(r'<xdr:from><xdr:col>(\d+)</xdr:col><xdr:colOff>(\d+)</xdr:colOff><xdr:row>(\d+)</xdr:row><xdr:rowOff>(\d+)</xdr:rowOff></xdr:from>', a)
        t=re.search(r'<xdr:to><xdr:col>(\d+)</xdr:col><xdr:colOff>(\d+)</xdr:colOff><xdr:row>(\d+)</xdr:row><xdr:rowOff>(\d+)</xdr:rowOff></xdr:to>', a)
        anc.append([int(v) for v in f.groups()]+[int(v) for v in t.groups()])
print(json.dumps({'cols':[round(mm(w),2) for w in cols],'paper':ps.paperSize,'orient':ps.orientation,'fitW':ps.fitToWidth,'fitH':ps.fitToHeight,'fit':ws.sheet_properties.pageSetUpPr.fitToPage if ws.sheet_properties.pageSetUpPr else None,
  'marg':[round(pm.left*25.4,1),round(pm.right*25.4,1),round(pm.top*25.4,1),round(pm.bottom*25.4,1)],'area':ws.print_area,'grid':ws.sheet_view.showGridLines,'breaks':breaks,
  'rows':[[r,round(h,3)] for r,h in rows],'texts':texts,'anc':anc,'imgs':len([n for n in z.namelist() if n.startswith('xl/media/') and re.search(r'\.(jpe?g|png)$',n)])}, ensure_ascii=False))
`;
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{
  const ctx=await b.newContext({viewport:{width:1440,height:900},acceptDownloads:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{ localStorage.removeItem('nn_daicho_pref_v1'); }catch(e){} window.confirm=()=>true; });
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1500);
  await p.evaluate(async(SITE)=>{ if(!window.nnPhotos) return; const m=await nnPhotos.load('nn_daicho_v1'); if(m) await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===SITE)); },SITE);
  await p.locator('.nnEnCard',{hasText:'写真台帳'}).click(); await p.waitForTimeout(800);
  await p.fill('#dbSite',SITE); await p.locator('#dbSite').dispatchEvent('change'); await p.waitForTimeout(400);
  const dis0=await p.evaluate(()=>{ const b=document.getElementById('dbXlsBtn'); return b?b.disabled:null; });
  const mk=async(col,w,h)=>{ const d=await p.evaluate(([col,w,h])=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,w,h);return c.toDataURL('image/jpeg',.92);},[col,w,h]); return {name:'a.jpg',mimeType:'image/jpeg',buffer:Buffer.from(d.split(',')[1],'base64')}; };
  await p.setInputFiles('#dbPickIn',[await mk('#e07020',1600,1200),await mk('#2060e0',900,1200),await mk('#70a020',1600,1200),await mk('#a040c0',900,1200)]);
  try{ await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length>=4,null,{timeout:15000}); }catch(e){} await p.waitForTimeout(800);
  const VALS=[['屋上','高圧洗浄'],['パラペット','プライマー塗布'],['屋上','補強メッシュ貼り付け　ウレタン塗膜防水材 1層目'],['ドレン','改修用ドレン取付']];
  await p.evaluate((VALS)=>{ document.querySelectorAll('#dbGrid .tile').forEach((t,i)=>{ const a=t.querySelector('.part'), w=t.querySelector('.work'); a.value=VALS[i][0]; a.dispatchEvent(new Event('change')); w.value=VALS[i][1]; w.dispatchEvent(new Event('change')); }); },VALS);
  await p.waitForTimeout(500);
  const exp=await p.evaluate(()=>[...document.querySelectorAll('#dbGrid .tile')].map(t=>{ const c=t.querySelector('canvas'); return {date:t.querySelector('.date').value}; }));
  let file=null, name='';
  if(dis0===false||dis0===true){ try{ const [dl]=await Promise.all([p.waitForEvent('download',{timeout:40000}), p.click('#dbXlsBtn')]); await dl.saveAs(XL); file=XL; name=await p.evaluate(()=>window._nnXlsName||''); }catch(e){} }
  const today=await p.evaluate(()=>{ const d=new Date(); return d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2); });
  ok('① 写真0枚では押せない・押すと .xlsx が出る・名前は「写真台帳_現場名_日付.xlsx」', dis0===true&&!!file&&fs.statSync(file).size>1000&&name==='写真台帳_'+SITE+'_'+today+'.xlsx', {dis0,name,size:file?fs.statSync(file).size:0});
  if(!file){ ok('② 以降：ファイルが無い', false); ok('⑦ pageerror 0', errs.length===0, errs); throw 0; }
  const X=JSON.parse(execFileSync('python3',['-c',PY,file]).toString());
  /* ② */
  ok('② 用紙：A4・たて・余白 12mm・横は1ページ・印刷範囲 A〜I・目盛線なし・改ページは3枚ごと（1か所）', X.paper===9&&X.orient==='portrait'&&X.fitW===1&&X.fitH===0&&X.fit===true&&X.marg.every(m=>Math.abs(m-12)<0.2)&&/^'?.*'?!?\$?A\$?1:\$?I\$?\d+$/.test(String(X.area).split('!').pop())&&X.grid===false&&X.breaks.length===1,
    {paper:X.paper,orient:X.orient,fitW:X.fitW,fitH:X.fitH,fit:X.fit,marg:X.marg,area:X.area,grid:X.grid,breaks:X.breaks});
  /* ③ */
  const tot=X.cols.reduce((a,c)=>a+c,0); const pageRows=X.rows.filter(([r])=>r<=X.breaks[0]); const pageH=pageRows.reduce((a,[r,h])=>a+h,0);
  ok('③ 列の合計 186mm・写真の列は 27mm×4・1ページの高さ 273mm 以下', Math.abs(tot-186)<=1&&X.cols.slice(1,5).every(c=>Math.abs(c-27)<0.3)&&pageH<=273, {tot:+tot.toFixed(1),photo:X.cols.slice(1,5),pageH:+pageH.toFixed(1)});
  /* ④ 自分で作った答え：撮影日は和暦（今日）。工事名・工種・部位・作業内容は入れた値 */
  const T=X.texts; const tw=(k)=>T[k]||[];
  const r4={no:tw('No.'),site:tw('工事名'),kind:tw('工種'),day:tw('撮影日'),part:tw('部位'),work:tw('作業内容')};
  const ok4=r4.no.join(',')==='1,2,3,4'&&r4.site.every(s=>s===SITE)&&r4.kind.every(s=>s==='防水工事')&&r4.day.every(s=>/^令和\d+年\d+月\d+日$/.test(s))&&r4.part.join(',')===VALS.map(v=>v[0]).join(',')&&r4.work.join('|')===VALS.map(v=>v[1]).join('|');
  ok('④ 文字：No.・工事名・工種・撮影日・部位・作業内容が入れた値どおり', ok4, r4);
  /* ⑤ 写真の四すみ（EMU・1mm=36000）→ mm。列の左端は自分で計算（A=3mm、B〜E=27mm ずつ） */
  const colL=[0]; X.cols.forEach((c,i)=>colL.push(colL[i]+c)); const rowT={}; let acc=0; X.rows.forEach(([r,h])=>{ rowT[r]=acc; acc+=h; });
  const xmm=(c,o)=>colL[c]+o/36000, ymm=(r,o)=>rowT[r+1]+o/36000;
  const pics=X.anc.map(a=>({x0:xmm(a[0],a[1]),y0:ymm(a[2],a[3]),x1:xmm(a[4],a[5]),y1:ymm(a[6],a[7]),c0:a[0],c1:a[4],r0:a[2],r1:a[6]}));
  const want=[4/3,0.75,4/3,0.75];
  const r5=pics.map((q,i)=>{ const w=q.x1-q.x0, h=q.y1-q.y0; const boxL=colL[1], boxR=colL[5]; return {asp:+(w/h).toFixed(3), lr:+((q.x0-boxL)-(boxR-q.x1)).toFixed(2), inCols:q.c0>=1&&q.c1<=4, w:+w.toFixed(1), h:+h.toFixed(1)}; });
  ok('⑤ 写真：4枚・四すみが写真の枠（B〜E 列）の中・縦横比が元の絵と同じ・左右の余白が同じ（1mm 以内）', X.imgs===4&&pics.length===4&&r5.every((q,i)=>q.inCols&&Math.abs(q.asp-want[i])/want[i]<0.02&&Math.abs(q.lr)<=1), r5);
  /* ⑥ LibreOffice で PDF にして測る */
  let r6={};
  try{ execFileSync('soffice',['--headless','--convert-to','pdf','--outdir',DIR,file],{timeout:120000,stdio:'ignore'});
    const pdf=path.join(DIR,'out.pdf'); const info=execFileSync('pdfinfo',[pdf]).toString(); const pages=+(/Pages:\s+(\d+)/.exec(info)||[])[1]; const a4=/595\.\d+ x 841\.\d+/.test(info);
    execFileSync('pdftoppm',['-r','127','-f','1','-l','1','-png',pdf,path.join(DIR,'pg')]);
    const png=fs.readdirSync(DIR).find(f=>/^pg.*\.png$/.test(f));
    /* 127dpi＝5px/mm。各写真の色の左右の端と、その行の灰色（#f2f2f2）の枠の左右の端を測る */
    const M=String.raw`
import sys, json
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB'); W,H=im.size; px=im.load()
def near(c,t,d=40): return all(abs(c[i]-t[i])<=d for i in range(3))
out=[]
for col in [(224,112,32),(32,96,224)]:
    ys=[y for y in range(0,H,2) if any(near(px[x,y],col) for x in range(0,W,6))]
    if not ys: out.append(None); continue
    y=ys[len(ys)//2]
    xs=[x for x in range(W) if near(px[x,y],col)]
    gs=[x for x in range(W) if near(px[x,y],(242,242,242),6)]
    gl=min([g for g in gs if g<xs[0]],default=xs[0]); gr=max([g for g in gs if g>xs[-1]],default=xs[-1])
    out.append({'gapL':round((xs[0]-gl)/5,1),'gapR':round((gr-xs[-1])/5,1)})
print(json.dumps(out))`;
    const g=JSON.parse(execFileSync('python3',['-c',M,path.join(DIR,png)]).toString());
    r6={pages,a4,g};
  }catch(e){ r6={err:String(e).slice(0,160)}; }
  ok('⑥ 出来上がり（LibreOffice で PDF）：2ページ・A4・横長と縦長の写真が灰色の枠の真ん中（左右のすき間の差 1.5mm 以内）', r6.pages===2&&r6.a4&&Array.isArray(r6.g)&&r6.g.every(q=>q&&Math.abs(q.gapL-q.gapR)<=1.5), r6);
  ok('⑦ pageerror 0', errs.length===0, errs);
  await p.evaluate(async(SITE)=>{ const m=await nnPhotos.load('nn_daicho_v1'); await nnPhotos.del('nn_daicho_v1',Object.keys(m).filter(k=>m[k].site===SITE)); },SITE);
 }catch(e){ if(e!==0) ok('検査が途中で止まった', false, String(e).slice(0,240)); }
 await b.close(); try{ fs.rmSync(DIR,{recursive:true,force:true}); }catch(_){}
 console.log(NG?('★NG '+NG+'件'):'全部○'); })();
