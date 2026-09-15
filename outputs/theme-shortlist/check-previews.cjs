const { chromium } = require('C:/Rishabh/AlgoForge/app/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const root = __dirname;
const pages = [ ['studio','pattern-studio'], ['circuit','circuit-club'], ['questline','questline'], ['focus','focus-deck'] ];
const server = http.createServer((req,res)=>{
  const route = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file = path.resolve(root, '.' + (route === '/' ? '/index.html' : route));
  if (!file.startsWith(root + path.sep)) {res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.png')?'image/png':'application/octet-stream');res.end(data);});
});
(async()=>{
  let browser;
  const checks=[];
  try {
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1,reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',err=>errors.push(err.message));
    for(const [name,image] of pages){
      await page.setViewportSize({width:1440,height:960});
      await page.goto(base+'/'+name+'.html',{waitUntil:'load'});
      await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,6000))]));
      const stats=await page.evaluate(()=>({title:document.title,bodyWidth:document.body.scrollWidth,viewport:innerWidth,height:document.documentElement.scrollHeight,fonts:document.fonts.status,h1:document.querySelector('h1')?.textContent}));
      if(stats.bodyWidth>1440)throw Error(name+' desktop overflow');
      await page.screenshot({path:path.join(root,image+'.png')});
      const button=page.locator('button').first();await button.click();
      if(!await page.locator('dialog').evaluate(d=>d.open))throw Error(name+' dialog did not open');
      await page.keyboard.press('Escape');
      if(await page.locator('dialog').evaluate(d=>d.open))throw Error(name+' dialog did not close');
      for(const width of [900,390,320]){
        await page.setViewportSize({width,height:844});
        const overflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,items:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left < -2)&&getComputedStyle(e).position!=='absolute';}).slice(0,6).map(e=>({tag:e.tagName,class:e.className?.baseVal??e.className}))}));
        checks.push({page:name,viewport:width,...overflow});
        if(overflow.width>width+1)throw Error(name+' overflow at '+width+': '+JSON.stringify(overflow));
        if(width===390)await page.screenshot({path:path.join(root,image+'-mobile.png'),fullPage:true});
      }
      checks.push({page:name,desktop:stats,dialog:'pass'});
    }
    await page.setViewportSize({width:1440,height:1100});
    await page.goto(base+'/index.html',{waitUntil:'load'});
    const loaded=await page.locator('.preview-link img').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0));
    if(!loaded)throw Error('Gallery image missing');
    await page.screenshot({path:path.join(root,'four-directions.png'),fullPage:true});
    for(const [name] of pages){
      await page.locator('.tab[data-view="'+name+'"]').click();
      await page.locator('iframe').contentFrame().locator('h1').waitFor();
      if(await page.locator('#detail').isHidden())throw Error(name+' detail hidden');
      checks.push({gallery:name,state:'pass'});
    }
    await page.locator('.tab[data-view="compare"]').click();
    await page.setViewportSize({width:390,height:844});
    const mobile=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
    if(mobile.width>390)throw Error('Gallery mobile overflow');
    checks.push({gallery:'mobile',...mobile,images:'4 loaded',scriptErrors:errors});
    if(errors.length)throw Error(errors.join('; '));
    fs.writeFileSync(path.join(root,'preview-checks.json'),JSON.stringify(checks,null,2));
    console.log(JSON.stringify({result:'PASS',themes:4,responsiveWidths:[1440,900,390,320],dialogs:4,galleryViews:4,scriptErrors:errors,checks},null,2));
  } catch(err){ console.error(err); process.exitCode=1; }
  finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})();
