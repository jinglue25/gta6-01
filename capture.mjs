import { chromium } from '../../tools/pw/node_modules/playwright-core/index.mjs';
import { createServer } from 'node:http';
import { createReadStream,readFileSync,readdirSync,statSync } from 'node:fs';
import { mkdir,writeFile } from 'node:fs/promises';
import { extname,join,relative,resolve,sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo=fileURLToPath(new URL('.',import.meta.url));
const gameRoot=resolve(repo,'game'),output=join(repo,'screenshots');
const toolkit=fileURLToPath(new URL('../../tools/pw/',import.meta.url));
const shots=JSON.parse(readFileSync(join(repo,'shots.json'),'utf8'));
const maximumBytes=256*1024;
const allowedScenes=new Set(['start','play','drive','chase','mission']);
if(!Array.isArray(shots)||shots.length!==4)throw new Error('shots.json must list four gallery views.');
const names=new Set();
for(const shot of shots){
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]*\.jpg$/.test(shot.name)||names.has(shot.name))throw new Error('Invalid or duplicate screenshot filename.');
  if(typeof shot.query!=='string'||!/^\?shot=[a-z]+&seed=\d+$/.test(shot.query)||!allowedScenes.has(new URLSearchParams(shot.query).get('shot')))throw new Error('Invalid local screenshot query.');
  names.add(shot.name);
}

function findShell(directory){
  for(const entry of readdirSync(directory,{withFileTypes:true}).sort((a,b)=>b.name.localeCompare(a.name))){
    const path=join(directory,entry.name);
    if(entry.isFile()&&entry.name==='chrome-headless-shell')return path;
    if(entry.isDirectory()){const found=findShell(path);if(found)return found;}
  }
  return null;
}
const executable=findShell(join(toolkit,'browsers','chrome-headless-shell'));
if(!executable)throw new Error('Chrome Headless Shell is missing from the local toolkit. No download will be attempted.');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=createServer((request,response)=>{
  if(request.method!=='GET'&&request.method!=='HEAD'){response.writeHead(405).end();return;}
  let file;
  try{
    const pathname=decodeURIComponent(new URL(request.url??'/','http://127.0.0.1').pathname);
    file=resolve(gameRoot,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
    const inside=relative(gameRoot,file);
    if(inside==='..'||inside.startsWith('..'+sep)){response.writeHead(403).end();return;}
    const stat=statSync(file);
    if(!stat.isFile())throw new Error('Not a file');
    response.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream','content-length':stat.size,'cache-control':'no-store'});
  }catch{response.writeHead(404).end();return;}
  if(request.method==='HEAD'){response.end();return;}
  createReadStream(file).on('error',()=>response.destroy()).pipe(response);
});
await new Promise((ready,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',ready);});
const address=server.address();
const origin='http://127.0.0.1:'+address.port;
let browser;
try{
  await mkdir(output,{recursive:true});
  browser=await chromium.launch({
    executablePath:executable,headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-networking','--disable-component-update','--disable-default-apps','--disable-sync','--no-first-run'],
  });
  const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,serviceWorkers:'block'});
  const blocked=[];
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin===origin||url.protocol==='data:')return route.continue();
    blocked.push(route.request().url());return route.abort('blockedbyclient');
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')console.error('Browser: '+message.text());});
  for(const shot of shots){
    errors.length=0;blocked.length=0;
    await page.goto(origin+'/'+shot.query,{waitUntil:'load',timeout:60000});
    await page.waitForFunction(()=>window.__shotReady===true,{},{timeout:60000});
    await page.evaluate(()=>document.fonts.ready);
    // Allow a subsequent paint to reach the screenshot compositor.
    await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
    if(errors.length)throw new Error(shot.name+': '+errors.join('; '));
    if(blocked.length)throw new Error(shot.name+': a page attempted to leave the local server.');
    const visibility=await page.evaluate(()=>({menu:document.getElementById('menu').hidden,hud:document.getElementById('hud').hidden,error:document.getElementById('error').hidden}));
    const start=new URLSearchParams(shot.query).get('shot')==='start';
    if(!visibility.error||visibility.menu===start||visibility.hud!==start)throw new Error(shot.name+': unexpected menu, HUD, or renderer state.');
    let captured=false;
    for(let quality=82;quality>=70;quality-=2){
      const jpeg=await page.screenshot({type:'jpeg',quality,fullPage:false,animations:'disabled',timeout:60000});
      if(jpeg.byteLength>maximumBytes)continue;
      const file=join(output,shot.name);await writeFile(file,jpeg);
      console.log(shot.name+': '+statSync(file).size+' bytes (JPEG quality '+quality+')');captured=true;break;
    }
    if(!captured)throw new Error(shot.name+' exceeds 256 KiB even at JPEG quality 70.');
  }
  await context.close();
  console.log('Captured all four Port Solana gallery views.');
}finally{
  try{await browser?.close();}
  finally{server.closeAllConnections();await new Promise(done=>server.close(done));}
}
