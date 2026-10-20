const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const evidence = process.argv.includes('--evidence');
const out = path.join(ROOT, 'evidence');
fs.mkdirSync(out, {recursive:true});
const source = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/before-click.js'), 'utf8');
const server = http.createServer((req,res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/favicon.ico') {res.writeHead(204);return res.end();}
  const name = path.basename(url.pathname) || 'index.html';
  if (!['index.html','app.js','style.css'].includes(name)) {res.writeHead(404);return res.end();}
  let body = fs.readFileSync(path.join(ROOT, name), 'utf8');
  if (name === 'app.js' && url.pathname.startsWith('/before/')) {
    body = source.replace('list.addEventListener(\'click\', handleListClick);',
      fixture + '\nlist.addEventListener(\'click\', buggyClick);');
  }
  res.setHeader('Content-Type', {'index.html':'text/html; charset=utf-8','app.js':'text/javascript; charset=utf-8','style.css':'text/css; charset=utf-8'}[name]);
  res.end(body);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:!evidence,
    executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:evidence ? ['--window-size=1280,1000'] : []});
  const context = await browser.newContext({viewport:{width:1200,height:900}});
  const page = await context.newPage();
  let logs = [], errors = [];
  page.on('console',msg => {if (/^\[(delete|toggle|edit)\]/.test(msg.text())) logs.push(msg.text());});
  page.on('pageerror',err => errors.push(err.message));
  // Count actual registrations, including on nodes later detached by render().
  await page.addInitScript(() => {
    window.__clickBindings = [];
    const original = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type,fn,options) {
      if (type === 'click' && this instanceof Element) window.__clickBindings.push({tag:this.tagName,id:this.id,cls:this.className});
      return original.call(this,type,fn,options);
    };
  });
  const seed = [
    {id:'w8-01',text:'复习事件委托',completed:false},
    {id:'w8-02',text:'记录边界测试',completed:false}
  ];
  async function reset(where='index.html', data=seed) {
    await page.goto(`${base}/${where}`);
    await page.evaluate(data=>localStorage.setItem('szu-todo-v2-2024150181',JSON.stringify(data)),data);
    await page.reload(); logs=[]; errors=[];
  }
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('szu-todo-v2-2024150181')));
  const firstText=()=>page.locator('.task-text').first();
  async function add(text) {await page.locator('#todo-input').fill(text);await page.locator('[type="submit"]').click();}
  const results={date:new Date().toISOString(),browser:await browser.version(),tests:[]};
  function record(name,detail) {results.tests.push({name,result:'PASS',...detail});}
  await reset('before/index.html');
  await page.locator('.delete-icon').first().click();
  assert.deepEqual(logs,['[delete] w8-01','[toggle] w8-01']);
  assert.equal((await state()).length,1);
  results.before={logs:[...logs],remaining:await state()};
  await reset(); await firstText().click();
  assert.deepEqual(logs,['[toggle] w8-01']); assert.equal((await state())[0].completed,true);
  record('点击任务文字，只切换',{logs:[...logs],remaining:2});
  await reset(); await page.locator('.delete').first().click({position:{x:2,y:2}});
  assert.deepEqual(logs,['[delete] w8-01']);assert.equal((await state()).length,1);
  record('点击删除按钮，只删除',{logs:[...logs],remaining:1});
  await reset(); await page.locator('.delete-icon').first().click();
  assert.deepEqual(logs,['[delete] w8-01']);assert.equal((await state()).length,1);
  record('点击删除按钮内部图标，正确删除',{logs:[...logs],remaining:1});
  await reset(); const box=await page.locator('#todo-list').boundingBox();
  await page.mouse.click(box.x+box.width/2,box.y+box.height-5);
  assert.deepEqual(logs,[]);assert.deepEqual(errors,[]);assert.deepEqual(await state(),seed);
  results.boundary={logs:[...logs],errors:[...errors],remaining:await state()};
  record('点击列表空白处，不报错',{logs:[],errors:[],remaining:2});
  await reset();await add('动态新增任务');
  await page.locator('.task-text').last().click();assert.equal((await state()).at(-1).completed,true);
  await page.locator('.delete-icon').last().click();assert.equal((await state()).length,2);
  const bindings=await page.evaluate(()=>window.__clickBindings);
  assert.equal(bindings.filter(x=>x.id==='todo-list').length,1);
  assert.equal(bindings.filter(x=>x.tag==='LI' || ['toggle','delete','edit'].includes(x.cls)).length,0);
  record('动态新增任务后，能正常交互',{logs:[...logs],listListeners:1,childListeners:0});
  await reset();await firstText().click();logs=[];
  page.once('dialog',d=>{assert.equal(d.defaultValue(),seed[0].text);d.accept('  已编辑任务  ');});
  await page.locator('.edit').first().click();
  assert.equal((await state())[0].text,'已编辑任务');assert.equal((await state())[0].completed,true);
  assert.deepEqual(logs,['[edit] w8-01']);await page.reload();assert.equal((await state())[0].text,'已编辑任务');
  record('编辑文本并刷新，保持完成状态',{text:'已编辑任务',completed:true,persisted:true});
  for (const value of ['', '   ', null]) {
    const before=await state();logs=[];
    page.once('dialog',d=>value===null ? d.dismiss() : d.accept(value));
    await page.locator('.edit').first().click();
    assert.deepEqual(await state(),before);assert.deepEqual(logs,[]);
  }
  record('空字符串、纯空格、取消编辑均不修改',{unchanged:true});
  await reset('index.html',[{id:17,text:'兼容数字 ID',completed:false}]);
  await firstText().click();assert.equal((await state())[0].completed,true);
  await page.locator('.delete-icon').click();assert.equal((await state()).length,0);
  record('W7 数字 ID 在 dataset 转字符串后仍能定位',{remaining:0});
  await reset();
  const immutable=await page.evaluate(()=>{const old=todos, item=todos[0];updateTodo(item.id,'新内容');return {array:old!==todos,object:item!==todos[0],oldText:item.text};});
  assert.deepEqual(immutable,{array:true,object:true,oldText:seed[0].text});
  record('编辑使用 map 和对象展开，不改原数组/对象',immutable);
  await page.evaluate(()=>{handleListClick({target:document.createTextNode('非元素')});const orphan=document.createElement('li');orphan.dataset.id='w8-01';handleListClick({target:orphan});const missing=document.createElement('li');list.append(missing);missing.click();missing.remove();const stale=document.createElement('li');stale.dataset.id='unknown';list.append(stale);stale.click();stale.remove();});
  assert.deepEqual(errors,[]);record('非元素、容器外元素、缺失或无效 ID 防御',{errors:[]});
  await page.setViewportSize({width:375,height:850});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),375);
  record('375px 移动布局无横向溢出',{});
  await page.setViewportSize({width:1200,height:900});await reset();
  await page.screenshot({path:path.join(out,'w8-page.png'),fullPage:true});
  fs.writeFileSync(path.join(out,'test-results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({base,...results},null,2));
  if (evidence) {
    await reset('before/index.html');
    await page.locator('.delete-icon').first().click();
    console.log('EVIDENCE_READY '+base+' /before/index.html');
    // Keep this isolated Chrome session alive for real DevTools screenshots.
    await new Promise(resolve => browser.on('disconnected',resolve));
  } else await browser.close();
  server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1);});
