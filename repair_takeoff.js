/* 劣化・下地処理：平面図の線・面・点 → 写真 → 数量 → 見積（§686）。 */
(function(){
'use strict';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kinds={line:['線','m','ひび割れ補修'],area:['面','㎡','下地補修'],point:['点','箇所','部分補修']};
const round=n=>Math.round(n*10)/10;
let mode=null, pts=[], editing=null, down=null, pointers=new Set(), multi=false;
const validPt=p=>p&&typeof p.x==='number'&&typeof p.y==='number'&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<1e6&&Math.abs(p.y)<1e6;
function normal(a){
  if(!Array.isArray(a))return [];
  const ids=new Set();
  return a.filter(r=>r&&typeof r.id==='string'&&/^[a-zA-Z0-9]+$/.test(r.id)&&!ids.has(r.id)&&ids.add(r.id)&&Object.prototype.hasOwnProperty.call(kinds,r.kind)&&Array.isArray(r.pts)&&r.pts.length<10000&&r.pts.every(validPt)&&r.pts.length>=(r.kind==='area'?3:r.kind==='line'?2:1)).map(r=>({
    id:r.id,kind:r.kind,pts:r.pts.map(p=>({x:p.x,y:p.y})),name:String(r.name||kinds[r.kind][2]).slice(0,80),location:String(r.location||'').slice(0,80),memo:String(r.memo||'').slice(0,500),
    price:r.price!==null&&r.price!==''&&Number.isFinite(+r.price)&&+r.price>=0&&+r.price<=1e8?Math.round(+r.price):null,
    photos:Array.isArray(r.photos)?r.photos.filter(id=>typeof id==='string'&&/^[a-zA-Z0-9]+$/.test(id)):[]
  }));
}
window.nnRepairNormalize=normal;
function records(){if(!Array.isArray(state.repairs))state.repairs=[];return state.repairs;}
function quantity(r){
  const s=+state.scaleM;
  if(!Number.isFinite(s)||s<=0)return 0;
  if(r.kind==='point')return 1;
  if(r.kind==='line')return r.pts.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-r.pts[i].x,p.y-r.pts[i].y)*s,0);
  let a=0; r.pts.forEach((p,i)=>{const q=r.pts[(i+1)%r.pts.length];a+=p.x*q.y-q.x*p.y;});
  return Math.abs(a)*s*s/2;
}
function rows(){return records().map((r,i)=>({n:'補修'+(i+1)+' '+r.name+(r.location?'（'+r.location+'）':''),q:round(quantity(r)),u:kinds[r.kind][1],p:r.price==null?0:r.price,repairId:r.id,unpriced:r.price==null}));}
window.nnRepairRows=rows;
function save(){
  saveState();draw();
  try{localStorage.setItem(KEY,JSON.stringify(state));return true;}
  catch(e){toast('補修記録を端末に保存できません。容量を確認し、この画面を閉じる前にデータを書き出してください。');return false;}
}
function close(){const e=document.getElementById('nnRepairDialog');if(e)e.remove();editing=null;}
function shell(title){
  close();const el=document.createElement('div');el.id='nnRepairDialog';
  el.innerHTML='<section role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="rp-head"><b>'+esc(title)+'</b><button type="button" data-close>閉じる</button></div><div class="rp-body"></div></section>';
  document.body.appendChild(el);el.querySelector('[data-close]').onclick=close;return el.querySelector('.rp-body');
}
function list(){
  stop();if(window.nnCond)nnCond.close();const body=shell('劣化・下地処理');
  body.innerHTML='<p>平面図で場所を拾い、写真・補修数量・単価を見積りにつなげます。同じ場所に撤去と補修を別々に記録できます。</p>'
    +'<div class="rp-actions"><button data-new="line">線で拾う（m）</button><button data-new="area">面で拾う（㎡）</button><button data-new="point">点で拾う（箇所）</button></div>'
    +'<p class="rp-note">線・面は図面の縮尺による平面上の数量です。立面や実測値とは異なります。面の重なり・開口部は自動控除しないため、施工範囲ごとに分けて囲んでください。</p>'
    +(records().length?'<div class="rp-list">'+records().map((r,i)=>'<button class="rp-record" data-id="'+esc(r.id)+'"><b>補修'+(i+1)+' '+esc(r.name)+'</b><span>'+esc(r.location||'場所名なし')+' ｜ '+round(quantity(r)).toFixed(1)+' '+kinds[r.kind][1]+' ｜ '+(r.price==null?'単価未設定':r.price.toLocaleString()+'円/'+kinds[r.kind][1])+' ｜ 写真 '+photoPins(r).length+'件</span></button>').join('')+'</div>':'<p>まだ記録がありません。「線・面・点で拾う」から始めてください。</p>');
  body.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>start(b.dataset.new));
  body.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>edit(b.dataset.id));
}
window.nnRepairOpen=list;
function stop(){mode=null;pts=[];down=null;pointers.clear();multi=false;bar();draw();}
function start(kind,id){
  if(!state.polys.length){toast('先に屋根の平面図を描き、縮尺を確認してください。');return;}
  close();if(window.nnCond)nnCond.close();setTab('zu');setTool('none');
  mode={kind,id:id||null};pts=[];bar();draw();
}
function bar(){
  document.documentElement.classList.toggle('nn-repair-drawing',!!mode);
  let b=document.getElementById('nnRepairBar');
  if(!b){b=document.createElement('div');b.id='nnRepairBar';document.getElementById('canvaswrap').appendChild(b);}
  b.hidden=!mode;if(!mode)return;
  b.innerHTML='<b>'+kinds[mode.kind][0]+'で拾う：'+(mode.kind==='point'?'位置を1点タップ':pts.length+'点／順にタップ → 確定')+'</b><div><button data-undo>1点戻す</button><button data-finish>確定</button><button data-cancel>取消</button></div>';
  b.querySelector('[data-undo]').disabled=!pts.length;b.querySelector('[data-undo]').onclick=()=>{pts.pop();bar();draw();};
  b.querySelector('[data-finish]').disabled=pts.length<(mode.kind==='area'?3:mode.kind==='line'?2:1);
  b.querySelector('[data-finish]').onclick=finish;b.querySelector('[data-cancel]').onclick=()=>{stop();list();};
}
function crosses(a,b,c,d){
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const on=(a,b,c)=>Math.abs(cross(a,b,c))<1e-9&&c.x>=Math.min(a.x,b.x)-1e-9&&c.x<=Math.max(a.x,b.x)+1e-9&&c.y>=Math.min(a.y,b.y)-1e-9&&c.y<=Math.max(a.y,b.y)+1e-9;
  return cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);
}
function finish(){
  if(!mode)return;const k=mode.kind;
  if(pts.length<(k==='area'?3:k==='line'?2:1))return;
  if(k==='area')for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
    if(j===i+1||i===0&&j===pts.length-1)continue;
    if(crosses(pts[i],pts[(i+1)%pts.length],pts[j],pts[(j+1)%pts.length])){toast('線が交差・重複しています。「1点戻す」で直してから確定してください。');return;}
  }
  const item={id:mode.id||'rp'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),kind:k,pts:pts.map(p=>({...p})),name:kinds[k][2],location:'',memo:'',price:null,photos:[]};
  if(round(quantity(item))<=0){toast('数量が0.1'+kinds[k][1]+'未満です。縮尺と打点を確認してください。');return;}
  const old=records().find(r=>r.id===mode.id);
  if(old){old.pts=item.pts;}else records().push(item);
  const id=old?old.id:item.id;stop();save();edit(id);
}
function photoPins(r){return (state.photos||[]).filter(p=>r.photos.includes(p.id));}
function edit(id){
  const r=records().find(x=>x.id===id);if(!r)return;
  const body=shell('補修'+(records().indexOf(r)+1)+' の記録');editing=id;
  body.innerHTML='<p><b>'+round(quantity(r)).toFixed(1)+' '+kinds[r.kind][1]+'</b>（図面から算出・数量は小数1位）</p>'
    +'<label>補修・撤去の名称<input id="rpName" maxlength="80" value="'+esc(r.name)+'" required></label>'
    +'<label>場所名<input id="rpLocation" maxlength="80" placeholder="例：A棟・屋上・北側" value="'+esc(r.location)+'"></label>'
    +'<label>単価（円/'+kinds[r.kind][1]+'）<input id="rpPrice" type="number" inputmode="numeric" min="0" max="100000000" step="1" placeholder="未設定" value="'+(r.price==null?'':r.price)+'"></label>'
    +'<label>状態・補修方法のメモ<textarea id="rpMemo" maxlength="500" placeholder="例：既存防水が浮いているため撤去後に下地補修">'+esc(r.memo)+'</textarea></label>'
    +'<p class="rp-note">単価未設定でも数量は見積りに出ます。発行前に単価を設定してください。0円は入力して明示できます。</p>'
    +'<div class="rp-actions"><button data-save>記録を保存</button><button data-camera>写真を撮る</button><button data-album>写真を選ぶ</button></div>'
    +'<div class="rp-photos"></div><div class="rp-actions"><button data-redraw>範囲を描き直す</button><button data-delete>この補修を削除</button><button data-list>一覧へ</button></div>';
  const update=()=>{
    const name=body.querySelector('#rpName').value.trim(), raw=body.querySelector('#rpPrice').value;
    const inp=body.querySelector('#rpPrice');
    if(!name){toast('補修・撤去の名称を入力してください。');return false;}
    if(inp.validity.badInput||raw!==''&&(!Number.isFinite(+raw)||+raw<0||+raw>1e8||!Number.isInteger(+raw))){toast('単価は0〜100,000,000円の整数で入力してください。');return false;}
    Object.assign(r,{name,location:body.querySelector('#rpLocation').value.trim(),price:raw===''?null:+raw,memo:body.querySelector('#rpMemo').value});return save();
  };
  body.querySelector('[data-save]').onclick=()=>{if(update())toast('補修記録を保存し、見積りに反映しました');};
  body.closest('section').querySelector('[data-close]').onclick=()=>{if(update())close();};
  body.querySelector('[data-list]').onclick=()=>{if(update())list();};
  body.querySelector('[data-redraw]').onclick=()=>{if(update())start(r.kind,r.id);};
  body.querySelector('[data-delete]').onclick=()=>{
    if(!confirm('この補修記録と見積項目を削除しますか？写真ピンは図面に残ります。'))return;
    state.repairs=records().filter(x=>x.id!==id);save();list();
  };
  const addPhoto=cam=>{
    if(!update())return;
    const h=nnHistMark(), p=r.pts[0];
    const pid=nnSitePhotoPlace(p.x,p.y,true);r.photos.push(pid);save();nnHistCollapse(h);
    document.getElementById(cam?'nnSpCam':'nnSpPick').click();
  };
  body.querySelector('[data-camera]').onclick=()=>addPhoto(true);
  body.querySelector('[data-album]').onclick=()=>addPhoto(false);
  photoUI();
}
function photoUI(){
  if(!editing)return;const r=records().find(x=>x.id===editing),el=document.querySelector('#nnRepairDialog .rp-photos');if(!r||!el)return;
  const db=window.nnSitePhotoDbg?nnSitePhotoDbg().store:{};
  el.innerHTML=photoPins(r).map(p=>'<button data-photo="'+esc(p.id)+'">'+(db[p.id]?'<img alt="補修写真" src="'+esc(db[p.id].d)+'">':'写真未選択')+'<span>開く・撮り直す</span></button>').join('');
  el.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>nnSitePhotoOpen(state.photos.findIndex(p=>p.id===b.dataset.photo)));
}
function paint(){
  if(tab!=='zu')return;
  const c=document.getElementById('cv').getContext('2d');c.save();c.lineWidth=2.5;c.font='bold 12px sans-serif';c.textAlign='left';c.textBaseline='bottom';
  function shape(r,label){
    if(!r.pts.length)return;c.strokeStyle='#b64016';c.fillStyle='rgba(232,118,10,.22)';c.setLineDash(r===mode?[5,4]:[]);c.beginPath();
    r.pts.forEach((p,i)=>{if(i)c.lineTo(gx2px(p.x),gy2px(p.y));else c.moveTo(gx2px(p.x),gy2px(p.y));});
    if(r.kind==='area'&&r.pts.length>2){c.closePath();c.fill();}c.stroke();
    r.pts.forEach(p=>{c.beginPath();c.arc(gx2px(p.x),gy2px(p.y),r.kind==='point'?7:3,0,Math.PI*2);c.fillStyle='#e8760a';c.fill();c.stroke();});
    if(label){const p=r.pts[0],x=gx2px(p.x)+10,y=gy2px(p.y)-6;c.fillStyle='#fff';c.fillRect(x-2,y-14,c.measureText(label).width+4,17);c.fillStyle='#92320e';c.fillText(label,x,y);}
  }
  records().forEach((r,i)=>shape(r,'補修'+(i+1)+' '+round(quantity(r)).toFixed(1)+kinds[r.kind][1]));
  if(mode)shape({kind:mode.kind,pts},'');c.restore();
}
function table(){
  const host=document.getElementById('sekisan');if(!host)return;const prev=document.getElementById('nnRepairQt');if(prev)prev.remove();
  if(!records().length)return;
  const rs=rows(),sum=rs.reduce((n,r)=>n+r.q*r.p,0),d=document.createElement('div');d.id='nnRepairQt';
  d.innerHTML='<h5>劣化・下地処理</h5><table class="qt"><tr><th>補修</th><th>数量</th><th>単価</th><th>金額</th></tr>'+rs.map(r=>'<tr><td>'+esc(r.n)+'</td><td>'+r.q.toFixed(1)+' '+r.u+'</td><td>'+(r.unpriced?'未設定':r.p.toLocaleString())+'</td><td>'+(r.unpriced?'未計上':Math.round(r.q*r.p).toLocaleString())+'</td></tr>').join('')+'</table><p>補修小計：'+Math.round(sum).toLocaleString()+'円'+(rs.some(r=>r.unpriced)?'（単価未設定あり）':'')+'</p><button type="button">補修記録を開く</button>';
  d.querySelector('button').onclick=list;host.appendChild(d);
  const D=nnEstimateData(),total=D.rows.concat(D.parts).reduce((n,r)=>n+r.q*r.p,0);
  const totalEl=host.querySelector('.total .v');if(totalEl)totalEl.textContent='¥'+Math.round(total).toLocaleString();
}
window.nnRepairEvidenceHTML=function(){
  if(!records().length)return '';
  return '<h3>劣化・下地処理の数量根拠</h3><table><tr><th>記録</th><th>数量・単価</th><th>状態・補修方法／写真番号</th></tr>'+records().map((r,i)=>{
    const nums=photoPins(r).map(p=>(state.photos||[]).indexOf(p)+1);
    return '<tr><td>補修'+(i+1)+' '+esc(r.name)+'<br>'+esc(r.location)+'</td><td>'+round(quantity(r)).toFixed(1)+' '+kinds[r.kind][1]+'<br>'+(r.price==null?'単価未設定':r.price.toLocaleString()+'円/'+kinds[r.kind][1])+'</td><td>'+esc(r.memo)+(nums.length?'<br>図面の写真 '+nums.join('・'):'')+'</td></tr>';
  }).join('')+'</table><div class="note">線＝図面の各区間の長さの合計、面＝囲んだ平面の面積、点＝1箇所。数量は小数1位で計上。別記録どうしの重なり・開口部は自動控除していません。写真は図面の同番号のピンで確認できます。</div>';
};
function boot(){
  state.repairs=normal(state.repairs);
  const css=document.createElement('style');css.textContent=`
  #nnRepairDialog{position:fixed;inset:0;z-index:10020;background:#0007;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;}
  #nnRepairDialog section{width:560px;max-width:100%;max-height:90%;display:flex;flex-direction:column;background:var(--paper,#f3efdd);border:3px solid var(--green-deep);color:var(--ink);box-sizing:border-box;}
  #nnRepairDialog .rp-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px;background:var(--green-deep);color:white;flex:none;}
  #nnRepairDialog .rp-body{overflow:auto;padding:12px;font-size:14px;min-height:0;}
  #nnRepairDialog p{margin:6px 0 12px;line-height:1.6;} #nnRepairDialog label{display:block;margin:8px 0;font-weight:800;}
  #nnRepairDialog input,#nnRepairDialog textarea{display:block;box-sizing:border-box;width:100%;font:inherit;font-size:16px;padding:8px;border:1px solid var(--green-deep);background:white;color:var(--ink);}
  #nnRepairDialog textarea{min-height:70px;} #nnRepairDialog button,#nnRepairBar button,#nnRepairQt button{font:inherit;padding:8px;border:2px solid var(--green-deep);background:#fff;color:var(--ink);box-shadow:0 2px 0 #124a28;cursor:pointer;min-height:36px;}
  #nnRepairDialog .rp-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;} #nnRepairDialog .rp-note{font-size:12px;color:var(--ink-sub);}
  #nnRepairDialog .rp-record{display:block;width:100%;text-align:left;margin:8px 0;overflow-wrap:anywhere;} #nnRepairDialog .rp-record span{display:block;font-size:12px;margin-top:5px;}
  #nnRepairDialog .rp-photos{display:flex;flex-wrap:wrap;gap:8px;} #nnRepairDialog .rp-photos button{width:110px;font-size:11px;} #nnRepairDialog .rp-photos img{width:100%;height:70px;object-fit:cover;} #nnRepairDialog .rp-photos span{display:block;}
  #nnRepairBar{position:absolute;bottom:66px;left:50%;transform:translateX(-50%);max-width:92%;z-index:30;background:#ffe000;border:2px solid var(--green-deep);padding:8px;color:var(--ink);text-align:center;font-size:13px;}
  #nnRepairBar[hidden]{display:none;} #nnRepairBar div{display:flex;gap:6px;margin-top:6px;justify-content:center;} #nnRepairBar button{white-space:nowrap;} #nnRepairBar button:disabled{opacity:.45;}
  #nnRepairQt{margin-top:10px;} #nnRepairQt td{overflow-wrap:anywhere;}
  html.nn-repair-drawing #nnMatQty,html.nn-repair-drawing #nnRoofTbl{visibility:hidden;}
  html[data-nnphone="1"] #nnRepairDialog section{width:90%;} html[data-nnphone="1"] #nnRepairDialog .rp-body{font-size:16px;}
  `;document.head.appendChild(css);
  const d=window.draw;window.draw=function(){const out=d.apply(this,arguments);paint();return out;};
  const calc=window.recalc;window.recalc=function(){const out=calc.apply(this,arguments);table();photoUI();return out;};
  const est=window.nnEstimateData;window.nnEstimateData=function(){const out=est.apply(this,arguments);out.rows=out.rows.concat(rows());return out;};
  const toolFn=window.setTool;window.setTool=function(){if(mode)stop();return toolFn.apply(this,arguments);};
  const tabFn=window.setTab;window.setTab=function(){if(mode)stop();return tabFn.apply(this,arguments);};
  if(window.nnCond)nnCond.add({id:'repair',label:'劣化・下地処理',when:()=>tab==='zu',panel:el=>{
    el.innerHTML='<h5>劣化・下地処理</h5><p>線・面・点で拾い、写真と見積りにつなげます。</p><button type="button" class="spm">補修記録を開く（'+records().length+'件）</button>';el.querySelector('button').onclick=list;
  }});
  const canvas=document.getElementById('cv');
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])document.addEventListener(type,e=>{
    if(!mode||tab!=='zu'||e.target!==canvas&&!pointers.has(e.pointerId))return;
    e.preventDefault();e.stopImmediatePropagation();
    if(type==='pointerdown'){
      pointers.add(e.pointerId);if(pointers.size>1){multi=true;down=null;return;}
      down={id:e.pointerId,x:e.clientX,y:e.clientY};try{canvas.setPointerCapture(e.pointerId);}catch(_){}
    }
    if(type==='pointercancel'){pointers.delete(e.pointerId);down=null;if(!pointers.size)multi=false;return;}
    if(type!=='pointerup')return;
    pointers.delete(e.pointerId);const p=down;down=null;const skip=multi;if(!pointers.size)multi=false;
    if(skip||!p||p.id!==e.pointerId||Math.hypot(p.x-e.clientX,p.y-e.clientY)>12)return;
    const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*(canvas.width/devicePixelRatio)/r.width,y=(e.clientY-r.top)*(canvas.height/devicePixelRatio)/r.height;
    const g={x:(x-ox)/cellPx,y:(y-oy)/cellPx};if(!validPt(g))return;
    if(pts.length&&Math.hypot(g.x-pts[pts.length-1].x,g.y-pts[pts.length-1].y)<1e-6)return;
    pts.push(g);bar();draw();if(mode.kind==='point')finish();
  },{capture:true,passive:false});
  document.addEventListener('keydown',e=>{if(mode&&e.key==='Escape'){e.preventDefault();stop();}});
  if(window.nnCond)nnCond.render();recalc();draw();
}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot);else boot();
})();
