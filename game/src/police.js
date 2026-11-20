import * as THREE from 'three';
import { makeCarMesh } from './vehicles.js';
import { makeFigure } from './pedestrians.js';
import { buildingBoxes,blocked,streets,crossStreets,groundHeight } from './city.js';

export const station=new THREE.Vector3(-119,0,-91);
export const hospital=new THREE.Vector3(119,0,-40);
export function lineOfSight(a,b){
  const delta=b.clone().sub(a),distance=delta.length();if(distance<.01)return true;
  const ray=new THREE.Ray(a,delta.normalize());
  return !buildingBoxes.some(box=>{
    const hit=ray.intersectBox(new THREE.Box3(new THREE.Vector3(box.minX,-1,box.minZ),new THREE.Vector3(box.maxX,80,box.maxZ)),new THREE.Vector3());
    return hit&&hit.distanceTo(a)<distance;
  });
}
const nearest=(value,list)=>list.reduce((best,n)=>Math.abs(n-value)<Math.abs(best-value)?n:best,list[0]);
export class Police {
  constructor(scene){this.scene=scene;this.units=[];this.wanted=0;this.hiddenTime=0;this.spawnTimer=0;this.exposed=false;this.contactCooldown=0;}
  crime(kind,witnessed=true){if(kind==='theft'&&!witnessed)return;this.wanted=Math.min(5,this.wanted+1);this.hiddenTime=0;this.spawnTimer=0;}
  setFloor(level){this.wanted=Math.max(this.wanted,level);this.hiddenTime=0;this.spawnTimer=0;}
  witnessed(position){return this.units.some(u=>u.alive&&u.mesh.position.distanceTo(position)<45&&lineOfSight(u.mesh.position,position));}
  disposeUnit(u){this.scene.remove(u.mesh,u.officer);for(const root of [u.mesh,u.officer])root.traverse(o=>{if(o.isMesh){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});}
  clear(){for(const u of this.units)this.disposeUnit(u);this.units=[];this.wanted=0;this.hiddenTime=0;this.exposed=false;this.spawnTimer=0;}
  spawn(position=null){
    const index=this.units.length,mesh=makeCarMesh(0xf1efdf);
    const black=new THREE.MeshStandardMaterial({color:0x172d39});
    for(const side of [-1,1]){const door=new THREE.Mesh(new THREE.BoxGeometry(.05,.5,1.8),black);door.position.set(side*.97,.85,-.1);mesh.add(door);}
    const lamps=[0xff334e,0x3d77ff].map((color,i)=>{const m=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2});const lamp=new THREE.Mesh(new THREE.BoxGeometry(.65,.22,.35),m);lamp.position.set(i?.4:-.4,1.96,-.2);mesh.add(lamp);return m;});
    const edges=[[-130,54],[108,-116],[130,2],[-108,-116]];
    if(position)mesh.position.copy(position);else mesh.position.set(edges[index%4][0],0,edges[index%4][1]);
    const officer=makeFigure(0x294964);officer.visible=false;this.scene.add(mesh,officer);
    const unit={mesh,officer,lamps,alive:true,carHealth:100,officerHealth:60,disabled:false,speed:0,route:[],routeTime:0,capture:0,hitCooldown:0};this.units.push(unit);return unit;
  }
  route(unit,target){
    const p=unit.mesh.position,sx=nearest(p.x,streets),sz=nearest(p.z,crossStreets),tx=nearest(target.x,streets),tz=nearest(target.z,crossStreets);
    const path=[];const push=(x,z)=>path.push(new THREE.Vector3(x,0,z));
    // Join the nearest street first, then use the orthogonal road grid.
    if(Math.abs(p.x-sx)<Math.abs(p.z-sz)){push(sx,p.z);push(sx,sz);}else{push(p.x,sz);push(sx,sz);}
    push(tx,sz);push(tx,tz);
    if(Math.abs(target.x-tx)<Math.abs(target.z-tz))push(tx,target.z);else push(target.x,tz);
    unit.route=path;unit.routeTime=4;
  }
  flash(time){for(const u of this.units)u.lamps.forEach((m,i)=>m.emissiveIntensity=(Math.floor(time*7)%2===i)?4:.1);}
  update(dt,player,onBusted,onDamage,time){
    this.contactCooldown=Math.max(0,this.contactCooldown-dt);this.exposed=false;
    if(!this.wanted){if(this.units.length)this.clear();return;}
    this.spawnTimer-=dt;
    const active=this.units.filter(u=>u.alive&&!u.disabled).length;
    if(active<Math.min(5,this.wanted+1)&&this.spawnTimer<=0){
      if(this.units.length>=8){const old=this.units.find(u=>!u.alive||u.disabled);if(old){this.disposeUnit(old);this.units.splice(this.units.indexOf(old),1);}}
      this.spawn();this.spawnTimer=4;
    }
    for(const u of this.units){
      if(!u.alive)continue;
      const p=u.mesh.position,dist=p.distanceTo(player.position),visible=dist<80&&lineOfSight(p,player.position);
      if(visible&&(!u.disabled||u.officerHealth>0&&!player.car))this.exposed=true;
      u.routeTime-=dt;u.hitCooldown=Math.max(0,u.hitCooldown-dt);
      if(!u.disabled){
        if(visible&&dist<32)u.route=[player.position.clone()];
        else if(!u.route.length||u.routeTime<=0)this.route(u,player.position);
        while(u.route.length&&p.distanceTo(u.route[0])<2)u.route.shift();
        const target=u.route[0];u.speed=0;
        if(target&&dist>(player.car?2.8:3)){
          const v=target.clone().sub(p);v.y=0;const step=Math.min(v.length(),(player.car?17+this.wanted*1.6:12)*dt);v.normalize();u.mesh.rotation.y=Math.atan2(v.x,v.z);
          const x=p.x+v.x*step,z=p.z+v.z*step;
          if(!blocked(x,z,2.1)){p.set(x,groundHeight(x,z),z);u.speed=step/dt;}
          else {u.route=[];u.routeTime=0;}
        }
      }
      u.officer.visible=!player.car&&dist<24&&u.officerHealth>0;
      if(u.officer.visible){u.officer.position.copy(p).add(new THREE.Vector3(2.2,0,0));u.officer.lookAt(player.position);}
      if(player.car&&dist<4.6){
        const impactSpeed=Math.abs(player.car.speed);
        player.car.speed*=Math.exp(-4*dt);
        const away=player.position.clone().sub(p);away.y=0;if(away.lengthSq()<.01)away.set(1,0,0);away.normalize().multiplyScalar(2*dt);
        if(!blocked(player.position.x+away.x,player.position.z+away.z,2.35))player.position.add(away);
        if(u.hitCooldown<=0){if(impactSpeed>.8)this.crime('police-car');onDamage(5);u.hitCooldown=1.5;}
      }
      if(!player.car&&dist<5&&visible&&u.officerHealth>0){u.capture+=dt;if(u.capture>=3){onBusted();return;}}else u.capture=0;
      if(this.wanted>=3&&visible&&dist<34&&u.officerHealth>0)onDamage(dt*(player.car?2.5:5));
    }
    if(this.exposed)this.hiddenTime=0;else this.hiddenTime+=dt;
    if(this.hiddenTime>14){this.wanted=Math.max(0,this.wanted-1);this.hiddenTime=0;}
    this.flash(time);
  }
}
