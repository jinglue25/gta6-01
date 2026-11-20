import { streets, crossStreets, buildingBoxes } from './city.js';

export class HUD {
  constructor() {
    this.canvas=document.getElementById('minimap');this.ctx=this.canvas.getContext('2d');
    this.prompt=document.getElementById('prompt');this.speed=document.getElementById('speed');
    document.getElementById('wanted').textContent='☆ ☆ ☆ ☆ ☆';
  }
  banner(title,text) {
    const el=document.getElementById('mission');el.querySelector('small').textContent=title;el.querySelector('span').textContent=text;
  }
  notice(title,text,duration=5){
    this.noticeTime=duration;const el=document.getElementById('notice');el.hidden=false;el.querySelector('b').textContent=title;el.querySelector('span').textContent=text;
  }
  tick(dt){this.noticeTime=Math.max(0,(this.noticeTime??0)-dt);document.getElementById('notice').hidden=this.noticeTime===0;}
  update(player,cars,cash,health,police,missions,muted=false) {
    document.getElementById('cash').textContent='$'+Math.floor(cash).toLocaleString('en-US');
    document.getElementById('health').style.width=Math.max(0,Math.min(100,health))+'%';
    if(police){const stars=document.getElementById('wanted');stars.textContent='★ '.repeat(police.wanted)+'☆ '.repeat(5-police.wanted);stars.setAttribute('aria-label','Wanted level '+police.wanted);}
    document.getElementById('crosshair').hidden=!!player.car;
    document.getElementById('mute').textContent=muted?'M · MUTED':'M · SOUND ON';
    if(missions){
      const target=missions.target,distance=target?Math.round(player.position.distanceTo(target))+' m':'';
      const title=missions.index<5?['FIRST RUN','ACROSS THE BAY','BORROWED WHEELS','HEAT','LAST BOAT OUT'][missions.index]:'FREE ROAM';
      this.banner(title,missions.objective+(distance?' · '+distance:'')+(missions.timer>0?' · '+Math.ceil(missions.timer)+'s':''));
    }
    const near=player.car?null:player.nearest(cars);
    this.prompt.hidden=!player.car&&!near;
    this.prompt.textContent=player.car?'E — step outside':near?'E — take the wheel':'';
    this.speed.hidden=!player.car;
    if(player.car)this.speed.innerHTML=Math.round(Math.abs(player.car.speed)*3.6)+' <small>KM/H</small>';
    const c=this.ctx, W=240, scale=.79;
    const x=v=>W/2+v*scale,z=v=>104+(v+22)*scale;
    c.fillStyle='#407d73';c.fillRect(0,0,W,W);
    c.fillStyle='#edcc8d';c.fillRect(0,z(64),W,W-z(64));
    c.fillStyle='#368e9d';c.fillRect(0,z(100),W,W-z(100));
    c.fillStyle='#b0c9ac';
    for(const b of buildingBoxes)c.fillRect(x(b.minX),z(b.minZ),(b.maxX-b.minX)*scale,(b.maxZ-b.minZ)*scale);
    c.strokeStyle='#233f4b';c.lineWidth=10;
    for(const s of streets){c.beginPath();c.moveTo(x(s),z(-125));c.lineTo(x(s),z(76));c.stroke();}
    for(const s of crossStreets){c.beginPath();c.moveTo(x(-140),z(s));c.lineTo(x(140),z(s));c.stroke();}
    c.fillStyle='#baa779';c.fillRect(x(88),z(77),6*scale,48*scale);c.fillRect(x(72),z(122),39*scale,4*scale);
    for(const car of cars) {
      c.fillStyle=car===player.car?'#ffd18a':car.traffic?'#afd6ce':'#edcb91';
      c.beginPath();c.arc(x(car.mesh.position.x),z(car.mesh.position.z),car===player.car?3.5:1.7,0,Math.PI*2);c.fill();
    }
    if(police)police.units.forEach((u,i)=>{if(!u.alive)return;c.fillStyle=i%2?'#6e9dff':'#ff5669';c.fillRect(x(u.mesh.position.x)-2.5,z(u.mesh.position.z)-2.5,5,5);});
    if(missions?.target){const t=missions.target;c.save();c.translate(x(t.x),z(t.z));c.rotate(Math.PI/4);c.fillStyle='#ffe18c';c.strokeStyle='#173e49';c.lineWidth=2;c.fillRect(-4,-4,8,8);c.strokeRect(-4,-4,8,8);c.restore();}
    c.save();c.translate(x(player.position.x),z(player.position.z));c.rotate(-player.heading);
    c.fillStyle='#fff9e5';c.strokeStyle='#173e49';c.lineWidth=1.5;c.beginPath();c.moveTo(0,7);c.lineTo(-5,-5);c.lineTo(0,-2);c.lineTo(5,-5);c.closePath();c.fill();c.stroke();c.restore();
  }
}
