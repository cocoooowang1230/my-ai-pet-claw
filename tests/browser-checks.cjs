const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium, webkit } = require(path.resolve('work/qa/node_modules/playwright'));
const sizes = [[320,568],[360,640],[390,844],[414,736],[768,1024],[1360,900],[844,390],[667,375],[568,320]];
(async () => {
  const html = await fs.readFile('public/index.html');
  await fs.mkdir('work/screenshots', { recursive:true });
  const server = http.createServer((req,res) => {res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});res.end(html);});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch();
    for (const [width,height] of sizes) {
      const context = await browser.newContext({viewport:{width,height},hasTouch:width<900,deviceScaleFactor:1});
      const page = await context.newPage();
      const errors=[];page.on('pageerror', e => errors.push(e.message));
      await page.goto(url);await page.waitForTimeout(200);
      const layout = await page.evaluate(() => {
        const rect = id => {const r=document.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
        return {w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,scene:rect('#scene'),joy:rect('#joystick'),drop:rect('#drop'),cabinet:rect('.cabinet')};
      });
      assert.ok(layout.scrollW<=width+1,'Horizontal overflow '+width+' '+JSON.stringify(layout));
      assert.ok(layout.scene.height>=110,'Game viewport too short '+JSON.stringify(layout));
      for(const id of ['scene','joy','drop']) {
        const r=layout[id];assert.ok(r.x>=0&&r.y>=0&&r.right<=width+1&&r.bottom<=height+1,'Control outside viewport '+id+' '+JSON.stringify(layout));
      }
      assert.ok(layout.joy.y>=layout.scene.bottom||width>height,'Portrait controls overlap scene');
      assert.equal(await page.title(),'My AI Pet · Pocket Claw');
      assert.equal(await page.locator('body').innerText().then(t=>/MY AI PAD|My AI Pad/.test(t)),false);
      await page.locator('#options').click();
      assert.equal(await page.locator('#settingsDialog').evaluate(d=>d.open),true);
      await page.locator('#closeSettings').click();
      await page.locator('[data-mode="balls"]').click();
      await page.locator('[data-view="top"]').click();
      await page.locator('[data-mode="plush"]').click();
      await page.locator('[data-view="front"]').click();
      assert.deepEqual(errors,[],'Browser runtime errors');
      const file=width+'x'+height+'.jpg';
      const screenshot=await page.screenshot({path:'work/screenshots/'+file,type:'jpeg',quality:65});
      if(width===390||width===1360)console.log('QA_IMAGE_'+(width===390?'PHONE':'DESKTOP')+' '+screenshot.toString('base64'));
      console.log('LAYOUT_PASS '+width+'x'+height+' '+JSON.stringify(layout));
      await context.close();
    }
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
    const page=await context.newPage();await page.goto(url);
    await page.locator('[data-view="front"]').click();
    const joy=await page.locator('#joystick').boundingBox();
    const start=await page.evaluate(()=>({...pos}));
    const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:joy.x+joy.width/2,y:joy.y+joy.height/2,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:joy.x+joy.width*.85,y:joy.y+joy.height/2,id:1}]});
    await page.waitForTimeout(300);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const after=await page.evaluate(()=>({...pos}));
    assert.ok(after.x>start.x+.1,'Touch joystick does not move claw');
    const moved=await page.evaluate(()=>({...pos}));await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(()=>({...pos})),moved,'Joystick keeps moving after release');
    await page.locator('#options').click();await page.locator('#testStrong').click();
    assert.equal(await page.locator('#settingsDialog').evaluate(d=>d.open),false);
    await page.evaluate(()=>{pos={x:-1.35,z:1.07};});
    await page.locator('#drop').tap();await page.waitForFunction(()=>!busy,{},{timeout:8000});
    assert.equal(await page.evaluate(()=>state.roundSpend),150);
    const paidBalance=await page.evaluate(()=>state.credits);
    await page.evaluate(()=>{pos={x:-1.35,z:1.07};});
    await page.locator('#drop').tap();await page.waitForFunction(()=>!busy,{},{timeout:8000});
    assert.equal(await page.evaluate(()=>state.credits),paidBalance);
    await page.evaluate(()=>{const t=toys.find(t=>!t.gold);pos={x:t.x,z:t.z};});
    await page.locator('#drop').tap();await page.waitForFunction(()=>!busy,{},{timeout:8000});
    assert.equal(await page.evaluate(()=>state.roundSpend),0);
    assert.equal(await page.evaluate(()=>state.awards.length),1);
    assert.equal(await page.evaluate(()=>state.credits),paidBalance);
    await page.locator('#closeModal').click();
    await page.reload();assert.equal(await page.evaluate(()=>state.awards.length),1);
    console.log('GAMEPLAY_PASS touch movement, release, 150 threshold, free miss, strong win, reset, reload');
    await context.close();
    // Public, unauthenticated brand reference for visual review on redesign branches only.
    if((process.env.GITHUB_REF||'').includes('redesign/')) {
      const brand=await browser.newPage({viewport:{width:1280,height:850}});
      try {
        await brand.goto('https://myaipet.ai/',{waitUntil:'domcontentloaded',timeout:25000});
        await brand.waitForTimeout(2500);
        const shot=await brand.screenshot({path:'work/screenshots/brand-reference.jpg',type:'jpeg',quality:60});
        console.log('QA_IMAGE_BRAND '+shot.toString('base64'));
        console.log('BRAND_STYLES '+JSON.stringify(await brand.evaluate(()=>({background:getComputedStyle(document.body).backgroundColor,color:getComputedStyle(document.body).color,font:getComputedStyle(document.body).fontFamily,variables:Array.from(getComputedStyle(document.documentElement)).filter(k=>k.startsWith('--')).map(k=>[k,getComputedStyle(document.documentElement).getPropertyValue(k)]).slice(0,100)}))));
      }catch(e){console.log('BRAND_REFERENCE_UNAVAILABLE '+e.message);}
      await brand.close();
    }
    await browser.close();
    browser=await webkit.launch();
    const safari=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    const safariErrors=[];safari.on('pageerror',e=>safariErrors.push(e.message));await safari.goto(url);await safari.waitForTimeout(250);
    const safariLayout=await safari.evaluate(()=>({h:innerHeight,bottom:document.querySelector('#drop').getBoundingClientRect().bottom,scene:document.querySelector('#scene').getBoundingClientRect().height}));
    assert.ok(safariLayout.bottom<=safariLayout.h&&safariLayout.scene>200,'WebKit mobile layout');
    await safari.locator('#options').tap();await safari.locator('#testStrong').tap();
    assert.equal(await safari.evaluate(()=>state.roundSpend),140);
    assert.deepEqual(safariErrors,[]);
    await safari.screenshot({path:'work/screenshots/webkit-phone.jpg',type:'jpeg',quality:65});
    console.log('WEBKIT_PASS phone layout and settings controls');
    await browser.close();browser=null;
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
