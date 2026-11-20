import * as THREE from 'three';
import { buildCity,buildingBoxes,groundHeight } from './city.js';
import { Traffic } from './vehicles.js';
import { Player } from './player.js';
import { HUD } from './hud.js';
import { shot,configureShot,markShotReady } from './shots.js';
import { loadSave,writeSave,clearSave } from './save.js';
import { Pedestrians } from './pedestrians.js';
import { Police,station,hospital } from './police.js';
import { Combat } from './combat.js';
import { Missions } from './missions.js';
import { AudioSystem } from './audio.js';

const $=id=>document.getElementById(id),keys=new Set(),audio=new AudioSystem();
let mode='menu',cash=250,health=100,yaw=0,dragging=false,lastTime=0,worldTime=0,saveTimer=0,calmTime=0;
let recoveryTime=0,recoveryKind='busted';
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}
catch(error){$('error').hidden=false;$('error').textContent='Port Solana needs WebGL. Enable hardware acceleration and reload. '+error.message;throw error;}
renderer.domElement.className='webgl';renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
$('world').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9fd4dc);scene.fog=new THREE.Fog(0xa9d5d9,110,370);
scene.add(new THREE.HemisphereLight(0xc7eced,0xd4b38e,2.2));
const sun=new THREE.DirectionalLight(0xffd49b,3.2);sun.position.set(-70,110,65);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-150;sun.shadow.camera.right=150;sun.shadow.camera.top=150;sun.shadow.camera.bottom=-150;sun.shadow.camera.far=300;sun.shadow.normalBias=.04;sun.shadow.bias=-.0003;scene.add(sun);
const sunDisc=new THREE.Mesh(new THREE.SphereGeometry(14,16,12),new THREE.MeshBasicMaterial({color:0xffe5a2}));sunDisc.position.set(-170,110,-260);scene.add(sunDisc);
const cloudGeometry=new THREE.BoxGeometry(1,1,1),cloudMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
const clouds=[];
for(let i=0;i<7;i++){
  const group=new THREE.Group(),baseX=-180+i*60;
  for(let j=0;j<3;j++){
    const puff=new THREE.Mesh(cloudGeometry,cloudMaterial);puff.scale.set(18+j*5,2+j*.7,7+j*2);puff.position.set(j*10,j%2*1.5,j%2*4);group.add(puff);
  }
  group.position.set(baseX,66+(i%3)*12,-145+(i%2)*65);scene.add(group);clouds.push({group,baseX});
}
const city=buildCity(scene),traffic=new Traffic(scene),player=new Player(scene),hud=new HUD(),police=new Police(scene);
const pedestrians=new Pedestrians(scene),combat=new Combat(scene,audio);
const missions=new Missions(scene,traffic.cars,police,{
  notify:(title,text,duration)=>hud.notice(title,text,duration),
  pay:amount=>{cash+=amount;audio.cash();audio.complete();},
  save:()=>persist(),
});
const camera=new THREE.PerspectiveCamera(56,innerWidth/innerHeight,.15,900);
const cameraTarget=new THREE.Vector3(),desired=new THREE.Vector3(),focus=new THREE.Vector3();

function persist(){return !shot&&writeSave(player,cash,health,missions,police,traffic.cars);}
function menuState(){
  const saved=loadSave();$('continue').disabled=!saved;
  $('save-note').textContent=saved?'Dario’s next call is waiting. Continue your saved day.':'A new day starts Dario’s five-run story.';
}
function setMode(next){
  mode=next;keys.clear();dragging=false;
  $('menu').hidden=mode!=='menu';$('hud').hidden=mode==='menu';$('pause').hidden=mode!=='paused';$('recovery').hidden=mode!=='recovering';
  if(mode==='menu')menuState();
}
function begin(saved=null){
  player.car=null;player.mesh.visible=true;traffic.reset();police.clear();combat.reset();
  player.mesh.position.set(saved?.x??-49,0,saved?.z??64);player.mesh.rotation.y=saved?.heading??Math.PI;
  player.mesh.position.y=groundHeight(player.mesh.position.x,player.mesh.position.z);
  cash=saved?.cash??250;health=saved?.health??100;yaw=0;saveTimer=0;calmTime=0;
  missions.reset(saved?.mission??null);
  if(saved){
    police.wanted=saved.wanted;
    if(saved.mode==='car'&&traffic.cars[saved.carId]){
      const car=traffic.cars[saved.carId];car.mesh.position.set(saved.x,groundHeight(saved.x,saved.z),saved.z);car.mesh.rotation.y=saved.heading;car.owned=true;player.enter(car);
      yaw=saved.heading+Math.PI;
    }
  }
  pedestrians.reset(player.position);setMode('playing');updateCamera(1,true);persist();
}
function recover(kind){
  if(mode!=='playing')return;recoveryKind=kind;recoveryTime=3.5;setMode('recovering');audio.tone(150,.6,'triangle');
  $('recovery-kind').textContent=kind==='busted'?'SOLANA CIVIC STATION':'COASTAL MEDICAL';
  $('recovery-title').textContent=kind==='busted'?'CITY LOCKUP':'SECOND SUNRISE';
  const fee=kind==='busted'?150:200;
  $('recovery-detail').textContent=(kind==='busted'?'The city collected its due.':'A second sunrise is waiting.')+' · $'+Math.min(fee,cash)+' '+(kind==='busted'?'fine':'care fee');
}
function respawn(){
  if(player.car)player.car.speed=0;
  player.car=null;player.mesh.visible=true;player.mesh.position.copy(recoveryKind==='busted'?station:hospital);player.mesh.rotation.y=Math.PI;
  cash=Math.max(0,cash-(recoveryKind==='busted'?150:200));health=100;police.clear();combat.reset();missions.onRespawn();pedestrians.reset(player.position);calmTime=0;yaw=0;
  setMode('playing');hud.notice('ANOTHER CHANCE','Dario: You’re still here. Pick up the trail when you’re ready.',5);persist();updateCamera(1,true);
}
function damage(amount){if(mode!=='playing')return;health=Math.max(0,health-amount);calmTime=0;if(health===0)recover('downed');}
function fire(){if(mode==='playing'&&!shot){calmTime=0;combat.fire(player,camera,pedestrians,traffic.cars,police);}}
function enterExit(){
  if(player.car){if(!player.exit())hud.notice('NO ROOM TO EXIT','Move the car away from the wall first.',3);return;}
  const car=player.nearest(traffic.cars);if(!car)return;
  if(!car.owned){police.crime('theft',pedestrians.witnesses(car.mesh.position)||police.witnessed(car.mesh.position));car.owned=true;}
  player.enter(car);missions.onEnter(car);hud.notice('A NEW SET OF WHEELS','WASD to drive · Space to brake · E to exit',3);
}
const newGame=()=>{audio.start();audio.click();if(!shot)clearSave();begin();};
$('start').addEventListener('click',newGame);$('replay').addEventListener('click',newGame);
$('continue').addEventListener('click',()=>{audio.start();audio.click();const saved=loadSave();if(saved)begin(saved);});
$('resume').addEventListener('click',()=>{audio.start();audio.click();setMode('playing');});
$('save').addEventListener('click',()=>{audio.click();const saved=persist();setMode('menu');if(!saved)$('save-note').textContent='Storage is unavailable. Keep this tab open to retain your session.';});
addEventListener('pointerdown',()=>audio.start(),{once:true});
addEventListener('keydown',event=>{
  audio.start();
  if(['KeyW','KeyA','KeyS','KeyD','KeyE','KeyF','Space','ArrowLeft','ArrowRight','Escape'].includes(event.code)&&event.target.tagName!=='BUTTON')event.preventDefault();
  if(event.code==='KeyM'&&!event.repeat){audio.toggle();return;}
  if(event.code==='Escape'&&!event.repeat){if(mode==='playing')setMode('paused');else if(mode==='paused')setMode('playing');return;}
  if(mode!=='playing'||shot)return;keys.add(event.code);
  if(event.code==='KeyE'&&!event.repeat)enterExit();
  if(event.code==='KeyF'&&!event.repeat)fire();
});
addEventListener('keyup',event=>keys.delete(event.code));
addEventListener('blur',()=>{keys.clear();if(mode==='playing'&&!shot)setMode('paused');});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('pointerdown',event=>{
  audio.start();if(mode!=='playing'||shot)return;
  if(event.button===0)fire();
  if(event.button===2){dragging=true;renderer.domElement.setPointerCapture(event.pointerId);}
});
renderer.domElement.addEventListener('pointermove',event=>{if(dragging)yaw-=event.movementX*.005;});
renderer.domElement.addEventListener('pointerup',()=>{dragging=false;});renderer.domElement.addEventListener('pointercancel',()=>{dragging=false;});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

function updateCamera(dt,snap=false){
  if(mode==='menu'){
    const t=shot?Math.min(worldTime,2)*.015:worldTime*.025;
    desired.set(152+Math.sin(t)*13,98,157+Math.cos(t)*9);focus.set(-12,3,-7);
  }else if(shot==='play'){
    desired.set(-38,8.4,78);focus.copy(player.position).add(new THREE.Vector3(-5,2,-5));
  }else if(shot==='drive'){
    desired.set(-34,7.5,69);focus.set(-10,1.2,52);
  }else if(shot==='chase'){
    desired.set(-43,7.5,65);focus.set(-10,1.3,55);
  }else if(shot==='mission'){
    desired.set(102,6.5,135);focus.set(89,3,118);
  }else{
    const p=player.position;
    if(player.car){const a=player.car.mesh.rotation.y+Math.PI;yaw+=Math.atan2(Math.sin(a-yaw),Math.cos(a-yaw))*(1-Math.exp(-2*dt));}
    const distance=player.car?12:8.7;
    focus.copy(p).add(new THREE.Vector3(0,player.car?1.3:1.4,0));desired.set(p.x+Math.sin(yaw)*distance,p.y+(player.car?6:5),p.z+Math.cos(yaw)*distance);
    const delta=desired.clone().sub(focus),ray=new THREE.Ray(focus,delta.clone().normalize());let nearest=delta.length();
    for(const b of buildingBoxes){const hit=ray.intersectBox(new THREE.Box3(new THREE.Vector3(b.minX,0,b.minZ),new THREE.Vector3(b.maxX,70,b.maxZ)),new THREE.Vector3());if(hit)nearest=Math.min(nearest,Math.max(1.3,hit.distanceTo(focus)-.6));}
    desired.copy(focus).addScaledVector(delta.normalize(),nearest);
  }
  const blend=snap?1:1-Math.exp(-6*dt);camera.position.lerp(desired,blend);cameraTarget.lerp(focus,blend);camera.lookAt(cameraTarget);
}
missions.reset();pedestrians.reset(player.position);menuState();
if(shot&&shot!=='start'){begin();configureShot(shot,player,traffic.cars,police,missions);if(shot==='chase'||shot==='mission')missions.introduce();}
missions.animate(0);updateCamera(1,true);combat.update(0,player,camera);hud.update(player,traffic.cars,cash,health,police,missions,audio.muted);
function frame(time){
  const dt=Math.min((time-lastTime)/1000||0,.04);lastTime=time;
  if(mode!=='paused'){
    worldTime+=dt;
    if(!shot){
      if(mode==='menu')traffic.update(dt);
      if(mode==='recovering'){recoveryTime-=dt;if(recoveryTime<=0)respawn();}
      else if(mode==='playing'){
        traffic.update(dt);yaw+=(Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight')))*dt*1.8;
        if(player.car)player.car.update(dt,keys);else player.update(dt,keys,yaw);
        if(keys.has('KeyF'))fire();
        police.update(dt,player,()=>recover('busted'),damage,worldTime);
        if(mode==='playing'){
          pedestrians.update(dt,player,[...traffic.cars,...police.units],kind=>police.crime(kind));
          missions.update(dt,player);calmTime=police.wanted||police.exposed?0:calmTime+dt;
          if(calmTime>7)health=Math.min(100,health+dt*3);
          saveTimer+=dt;if(saveTimer>12){persist();saveTimer=0;}
        }
      }
      combat.update(dt,player,camera);hud.tick(dt);
    }else police.flash(worldTime);
    const sceneryTime=shot?0:worldTime;
    for(const cloud of clouds)cloud.group.position.x=((cloud.baseX+260+sceneryTime*.65)%520)-260;
    city.update(sceneryTime);missions.animate(sceneryTime);updateCamera(dt);
  }
  const distance=police.units.reduce((d,u)=>u.alive?Math.min(d,u.mesh.position.distanceTo(player.position)):d,Infinity);
  audio.update(player.car?player.car.speed:null,distance,police.wanted,mode==='playing',worldTime);
  if(mode!=='menu')hud.update(player,traffic.cars,cash,health,police,missions,audio.muted);
  renderer.render(scene,camera);
  if(shot&&(shot!=='start'||worldTime>=2))markShotReady();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
