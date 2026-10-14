/* node _check/repair_takeoff.js [before|ph]。実操作→数量→写真→保存→見積書を検査。 */
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),before=process.argv.includes('before'),phone=process.argv.includes('ph');
let ng=0;function ok(name,yes,detail=''){console.log((yes?'○ ':'★NG ')+name+' '+detail);if(!yes)ng++;}
const server=http.createServer((req,res)=>{
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  if(before&&file===path.join(root,'zumen_sekisan.html'))file=path.join(root,'_before_repair.html');
  try{res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8','css':'text/css','png':'image/png','woff2':'font/woff2'})[file.split('.').pop()]||'application/octet-stream');res.end(fs.readFileSync(file));}catch(e){res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(r=>server.listen(8899,'127.0.0.1',r));
 const b=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const p=await b.newPage(phone?{viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1440,height:1000}});
 p.setDefaultTimeout(8000);
 await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
 if(phone)await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto('http://127.0.0.1:8899/zumen_sekisan.html');
 await p.evaluate(()=>{try{nnZMenuClose();}catch(_){} });
 const has=await p.evaluate(()=>typeof nnRepairOpen==='function');ok('補修記録の入口がある',has);if(!has)return;
 await p.evaluate(()=>{state.scaleM=1;state.polys=[{name:'検査屋上',lv:0,pts:[{x:0,y:0},{x:12,y:0},{x:12,y:10},{x:0,y:10}],edges:Array.from({length:4},()=>({h:300,w:200,k:'para'})),holes:[]}];state.active=0;state.parts=[];state.repairs=[];state.photos=[];setTab('zu');setTool('none');cellPx=25;ox=60;oy=300;saveState();draw();});
 const base=await p.evaluate(()=>nnEstimateData().rows.concat(nnEstimateData().parts).reduce((n,r)=>n+r.q*r.p,0));
 async function tap(x,y){const pt=await p.evaluate(({x,y})=>{const c=document.getElementById('cv'),r=c.getBoundingClientRect();return {x:r.left+gx2px(x)*r.width/(c.width/devicePixelRatio),y:r.top+gy2px(y)*r.height/(c.height/devicePixelRatio)};},{x,y});if(phone)await p.touchscreen.tap(pt.x,pt.y);else await p.mouse.click(pt.x,pt.y);}
 async function make(kind,points,name,price){
   await p.evaluate(()=>nnRepairOpen());await p.locator('[data-new="'+kind+'"]').click();
   for(const [x,y]of points)await tap(x,y);
   if(kind!=='point')await p.locator('#nnRepairBar [data-finish]').click();
   await p.locator('#rpName').fill(name);await p.locator('#rpLocation').fill('A棟・屋上');await p.locator('#rpPrice').fill(price);await p.locator('#rpMemo').fill('検査用：写真を確認して補修');await p.locator('[data-save]').click();
 }
 await make('line',[[1,1],[4,5]],'ひび割れ補修','200');
 await make('area',[[5,1],[8,1],[8,3],[5,3]],'浮き撤去','1000');
 await make('point',[[10,4]],'部分補修','3000');
 let result=await p.evaluate(()=>nnRepairRows());ok('完成した線5m・面6㎡・点1箇所を独立した手計算と比較',result.length===3&&result[0].q===5&&result[1].q===6&&result[2].q===1,JSON.stringify(result));
 ok('既存の屋根・役物を増やさず記録',await p.evaluate(()=>state.polys.length===1&&state.parts.length===0));
 const fileWait=p.waitForEvent('filechooser');await p.locator('[data-album]').click();const chooser=await fileWait;
 const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=32;c.height=32;c.getContext('2d').fillRect(0,0,32,32);return c.toDataURL('image/png').split(',')[1];});
 await chooser.setFiles({name:'repair.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await p.waitForFunction(()=>document.querySelector('#nnRepairDialog .rp-photos img'));
 await p.waitForFunction(()=>nnSitePhotoIdb());
 await p.waitForFunction(()=>new Promise(resolve=>{const q=indexedDB.open('nn_photos_v1',1);q.onsuccess=()=>{const db=q.result,t=db.transaction('photos','readonly'),v=t.objectStore('photos').get('nn_zumen_photos_v1\u0001'+state.repairs[2].photos[0]);v.onsuccess=()=>{resolve(!!v.result);db.close();};v.onerror=()=>{resolve(false);db.close();};};q.onerror=()=>resolve(false);}));
 const saved=true;
 ok('補修に付けた写真が端末の写真保存に入る',saved);
 await p.locator('[data-list]').click();await p.locator('#nnRepairDialog [data-close]').click();
 await p.evaluate(()=>{nnSaveDwgDo('補修検査','','',false);saveState();});
 await p.reload();await p.evaluate(()=>{try{nnZMenuClose();}catch(_){} });
 await p.waitForFunction(()=>typeof nnRepairRows==='function'&&nnSitePhotoIdb());
 ok('再読み込みで数量・単価・写真の関連が戻る',await p.evaluate(()=>nnRepairRows().map(r=>r.q).join(',')==='5,6,1'&&state.repairs[2].price===3000&&!!nnSitePhotoDbg().store[state.repairs[2].photos[0]]));
 ok('名前を付けた保存にも補修が含まれる',await p.evaluate(()=>{const v=JSON.parse(localStorage.getItem('nn_zumen_saves_v1')||'[]');return v.some(x=>JSON.parse(x.data).repairs.length===3);}));
 const total=await p.evaluate(()=>{const d=nnEstimateData();return d.rows.concat(d.parts).reduce((n,r)=>n+r.q*r.p,0);});ok('見積データに補修合計10000円を1回だけ加算',total===base+10000,`${base} → ${total}`);
 const popWait=p.waitForEvent('popup');await p.evaluate(()=>nnMitsuPDF({title:'補修検査',toName:'検査'}));const pop=await popWait;await pop.waitForLoadState();const txt=await pop.locator('body').innerText();
 ok('提出用見積書と数量根拠書に補修名・数量・写真番号が出る',txt.includes('浮き撤去')&&txt.includes('劣化・下地処理の数量根拠')&&txt.includes('図面の写真 1'));await pop.close();
 await p.evaluate(()=>nnRepairOpen());await p.locator('[data-id]').last().click();await p.locator('#rpPrice').fill('');await p.locator('[data-save]').click();
 ok('空欄単価は0円と区別する',await p.evaluate(()=>nnRepairRows()[2].unpriced===true));
 await p.locator('[data-delete]').click();ok('削除で数量と見積りから外れる',await p.evaluate(()=>nnRepairRows().length===2));
 await p.evaluate(()=>undoStep());ok('戻るで補修と写真の関連を復元',await p.evaluate(()=>state.repairs.length===3&&state.repairs[2].photos.length===1));
 await p.evaluate(()=>redoStep());ok('進むで削除を再現',await p.evaluate(()=>state.repairs.length===2));
 await p.evaluate(()=>nnRepairOpen());await p.locator('[data-new="area"]').click();await p.evaluate(()=>{cellPx=25;ox=60;oy=300;draw();});
 for(const q of [[1,1],[4,4],[1,4],[4,1]])await tap(...q);await p.screenshot({path:path.join(root,'_work','repair-cross.png')});await p.locator('[data-finish]').click();
 ok('自己交差する範囲は数量を作らない',await p.evaluate(()=>state.repairs.length===2&&!document.getElementById('nnRepairDialog')));
 await p.locator('[data-cancel]').click();
 const layout=await p.evaluate(()=>{const d=document.querySelector('#nnRepairDialog section').getBoundingClientRect();return {left:d.left,right:d.right,width:document.documentElement.clientWidth,height:d.height,top:d.top,win:document.documentElement.clientHeight};});ok('記録画面が画面内に収まる',layout.left>=0&&layout.right<=layout.width+1&&layout.top>=0&&layout.top+layout.height<=layout.win+1,JSON.stringify(layout));
 ok('見出しと閉じるボタンが記録画面の内側にある',await p.evaluate(()=>{const s=document.querySelector('#nnRepairDialog section').getBoundingClientRect(),h=document.querySelector('#nnRepairDialog .rp-head').getBoundingClientRect();return h.top>=s.top&&h.bottom<=s.bottom&&h.width>0;}));
 fs.mkdirSync(path.join(root,'_work'),{recursive:true});await p.screenshot({path:path.join(root,'_work',phone?'repair-phone.png':'repair-pc.png')});
 ok('壊れた補修保存を正規化できる',await p.evaluate(()=>nnRepairNormalize([null,{id:'bad',kind:'area',pts:[{x:'x',y:0}]}]).length===0));
 ok('実行エラーなし',errors.length===0,errors.join(' / '));
 }finally{await b.close();}
})().catch(e=>{ok('検査を完了',false,e.stack);}).finally(()=>{server.close();process.exitCode=ng?1:0;});
