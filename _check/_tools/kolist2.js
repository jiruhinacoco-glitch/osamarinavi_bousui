const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1600);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const m={};
    props.forEach(x=>{ m[x.kouhou]=m[x.kouhou]||{n:0,mk:new Set(),sz:new Set(),un:new Set(),spec:x.spec};
      m[x.kouhou].n++; m[x.kouhou].mk.add(x.makerFull||x.maker); m[x.kouhou].sz.add(x.sozai); m[x.kouhou].un.add(x.un); });
    const out={};
    Object.keys(m).forEach(k=>out[k]={n:m[k].n, spec:m[k].spec, mk:[...m[k].mk], sz:[...m[k].sz], un:[...m[k].un],
      inMaster:!!KO_MASTER[k]});
    return {byKouhou:out, master:Object.keys(KO_MASTER),
      hasDefEditor:typeof window.nnDefEdit, kizonSample:[...new Set(props.map(x=>x.kizon))].slice(0,5),
      kindSample:[...new Set(props.map(x=>x.kind))], kouzouSample:[...new Set(props.map(x=>x.kouzou))]};
  }),null,1));
  await b.close();
})();
