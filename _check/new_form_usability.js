/* 新規物件登録：PC/スマホの余白・画像寸法と入力操作を実寸で検査 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let ng=0;
const ok=(c,m)=>{ console.log((c?'○ ':'★NG ')+m); if(!c)ng++; };
const near=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<=1;

(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  try{
    for(const mode of [
      {name:'PC', viewport:{width:1440,height:900}, mobile:false, rg:7, image:[50,36]},
      {name:'スマホ', viewport:{width:393,height:852}, mobile:true, rg:4, image:[54,38]}
    ]){
      const ctx=await b.newContext({viewport:mode.viewport,isMobile:mode.mobile,hasTouch:mode.mobile,
        userAgent:mode.mobile?'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148':undefined});
      try{
        const p=await ctx.newPage(), errs=[];
        p.on('pageerror',e=>errs.push(String(e)));
        await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
        await p.waitForFunction(()=>typeof openModal==='function');
        await p.evaluate(()=>openModal());
        await p.waitForSelector('#f_kouji .rf .rfk');
        const m=await p.evaluate(()=>{
          const modal=document.querySelector('#modalbg .modal');
          const box=s=>modal.querySelector(s)?.getBoundingClientRect();
          const gap=(a,z)=>{const x=box(a),y=box(z); return x&&y?y.top-x.bottom:NaN;};
          const fields=[...modal.querySelectorAll('.mgrid input,.mgrid select')].filter(el=>el.getClientRects().length);
          const outside=fields.filter(el=>{
            const r=el.getBoundingClientRect(),c=el.parentElement.getBoundingClientRect();
            return r.left<c.left-1 || r.right>c.right+1;
          }).map(el=>el.id);
          const overlap=[];
          for(let i=0;i<fields.length;i++) for(let j=i+1;j<fields.length;j++){
            const a=fields[i].getBoundingClientRect(),z=fields[j].getBoundingClientRect();
            if(Math.min(a.right,z.right)-Math.max(a.left,z.left)>2 &&
               Math.min(a.bottom,z.bottom)-Math.max(a.top,z.top)>2) overlap.push(fields[i].id+'×'+fields[j].id);
          }
          const img=modal.querySelector('#f_kouji .rf .kowrap:not(.kz) img');
          const ir=img?.getBoundingClientRect();
          const labels=[...modal.querySelectorAll('.mgrid label')].filter(el=>el.getClientRects().length);
          const rf=modal.querySelector('#f_kouji .rf');
          const spec=rf?.querySelector('.rfspec');
          const title=modal.querySelector('#modalTitle');
          const sec=modal.querySelector('.mcol>.msec');
          const secLabel=sec?.nextElementSibling?.querySelector('label');
          const name=modal.querySelector('#f_name'),addrLabel=modal.querySelector('#f_addr')?.parentElement?.querySelector('label');
          const rectGap=(a,z)=>a&&z?z.getBoundingClientRect().top-a.getBoundingClientRect().bottom:NaN;
          return {outside,overlap,labelsLinked:labels.every(l=>l.htmlFor && document.getElementById(l.htmlFor)),
            closePos:getComputedStyle(modal.querySelector('.mclose')).position,
            btnPos:getComputedStyle(modal.querySelector('.btns')).position,
            buttonHeights:[...modal.querySelectorAll('.btns button')].filter(x=>x.offsetParent).map(x=>x.getBoundingClientRect().height),
            rg:parseFloat(getComputedStyle(modal).getPropertyValue('--rg')),
            phone:document.documentElement.getAttribute('data-nnphone'),
            image:ir?[ir.width,ir.height]:null,
            gaps:{titleSection:rectGap(title,sec),sectionLabel:rectGap(sec,secLabel),nameAddress:rectGap(name,addrLabel)},
            roof:{headerMargin:rf?parseFloat(getComputedStyle(rf.querySelector('.rfh')).marginBottom):NaN,
              rowGap:spec?parseFloat(getComputedStyle(spec).rowGap):NaN,
              bottomMargin:spec?parseFloat(getComputedStyle(spec).marginBottom):NaN,
              sectionMargin:rf?parseFloat(getComputedStyle(rf.querySelector('.kseg')).marginBottom):NaN}};
        });
        const n=mode.name+'：';
        ok(m.rg===mode.rg,n+'--rg = '+mode.rg+'px（実測 '+m.rg+'px）');
        ok(mode.mobile?m.phone==='1':m.phone!=='1',n+'端末別CSSが適用される');
        ok(m.image?.every((v,i)=>near(v,mode.image[i])),n+'工法画像 '+mode.image.join('×')+'px（実測 '+(m.image?.join('×')||'なし')+'）');
        for(const [key,label] of [['titleSection','見出し帯→基本情報'],['sectionLabel','基本情報→最初の項目名'],['nameAddress','工事名の枠→現場住所']])
          ok(near(m.gaps[key],mode.rg),n+label+' = '+mode.rg+'px（実測 '+m.gaps[key]+'px）');
        for(const [key,label] of [['headerMargin','屋根名→構造体'],['rowGap','構造体・既存防水・新規防水の行間'],['bottomMargin','新規防水→次の部位'],['sectionMargin','工事区分→ボタン']])
          ok(near(m.roof[key],mode.rg),n+label+'の余白 = '+mode.rg+'px（実測 '+m.roof[key]+'px）');
        ok(m.outside.length===0,n+'全入力枠が自分の列内に収まる（'+m.outside.join(', ')+'）');
        ok(m.overlap.length===0,n+'入力枠どうしが重ならない（'+m.overlap.join(', ')+'）');
        ok(m.labelsLinked,n+'項目名と入力欄の接続');
        ok(m.closePos===(mode.mobile?'sticky':'absolute'),n+'閉じるボタンの配置（'+m.closePos+'）');
        if(mode.mobile) ok(m.btnPos==='sticky',n+'保存ボタンがsticky（'+m.btnPos+'）');
        ok(m.buttonHeights.every(h=>h>=22),n+'下部ボタンの文字が収まる高さ（'+m.buttonHeights.map(Math.round).join(', ')+'）');
        await p.locator('#modalbg .modal').evaluate(el=>el.scrollTop=el.scrollHeight);
        await p.locator('#f_name').click();
        ok(await p.evaluate(()=>document.activeElement?.id==='f_name'),n+'スクロール後も入力欄を操作できる');
        ok(errs.length===0,n+'JSエラーなし（'+errs.join(' / ')+'）');
      }finally{await ctx.close();}
    }
  }finally{await b.close();}
  console.log(ng?'★NG 合計 '+ng:'○ 全項目OK');
  process.exitCode=ng?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
