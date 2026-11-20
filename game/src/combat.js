import * as THREE from 'three';
import { buildingBoxes } from './city.js';

export class Combat {
  constructor(scene,audio){
    this.scene=scene;this.audio=audio;this.cooldown=0;this.effects=[];
    this.flash=new THREE.Mesh(new THREE.SphereGeometry(.16,6,4),new THREE.MeshBasicMaterial({color:0xffeb9a}));this.flash.visible=false;scene.add(this.flash);this.flashTime=0;
    this.gun=new THREE.Mesh(new THREE.BoxGeometry(.13,.16,.52),new THREE.MeshStandardMaterial({color:0x30434a}));scene.add(this.gun);
  }
  reset(){this.cooldown=0;this.flashTime=0;this.flash.visible=false;for(const e of this.effects){this.scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();}this.effects=[];}
  smoke(car){
    for(let i=0;i<5;i++){
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(.3+i*.08,5,4),new THREE.MeshBasicMaterial({color:0x6b7675,transparent:true,opacity:.55}));mesh.position.copy(car.mesh.position).add(new THREE.Vector3((i%2?1:-1)*.8,.5,-1));this.scene.add(mesh);this.effects.push({mesh,life:2,total:2,smoke:true});
    }
  }
  fire(player,camera,pedestrians,cars,police){
    if(player.car||this.cooldown>0)return false;this.cooldown=.28;this.audio.gunshot();police.crime('gunfire');pedestrians.panic(player.position);
    const direction=camera.getWorldDirection(new THREE.Vector3());direction.y=0;direction.normalize();
    player.mesh.rotation.y=Math.atan2(direction.x,direction.z);
    const origin=player.position.clone().add(new THREE.Vector3(0,1.35,0)).addScaledVector(direction,.65),ray=new THREE.Ray(origin,direction);
    let closest=90,hit=null;
    const consider=(point,radius,kind,target)=>{const impact=ray.intersectSphere(new THREE.Sphere(point,radius),new THREE.Vector3());if(impact){const d=origin.distanceTo(impact);if(d<closest){closest=d;hit={kind,target};}}};
    for(const b of buildingBoxes){const p=ray.intersectBox(new THREE.Box3(new THREE.Vector3(b.minX,0,b.minZ),new THREE.Vector3(b.maxX,80,b.maxZ)),new THREE.Vector3());if(p&&origin.distanceTo(p)<closest){closest=origin.distanceTo(p);hit=null;}}
    for(const p of pedestrians.people)if(p.alive)consider(p.mesh.position.clone().add(new THREE.Vector3(0,1.1,0)),.65,'pedestrian',p);
    for(const car of cars)consider(car.mesh.position.clone().add(new THREE.Vector3(0,.9,0)),1.8,'car',car);
    for(const u of police.units){
      if(u.officer.visible&&u.officerHealth>0)consider(u.officer.position.clone().add(new THREE.Vector3(0,1.1,0)),.65,'officer',u);
      if(u.alive)consider(u.mesh.position.clone().add(new THREE.Vector3(0,.9,0)),1.8,'police',u);
    }
    if(hit){
      const t=hit.target;
      if(hit.kind==='pedestrian'&&pedestrians.knockDown(t))police.crime('pedestrian');
      if(hit.kind==='car'){t.health=Math.max(0,(t.health??100)-40);this.smoke(t);if(t.health===0){t.disabled=true;t.traffic=false;t.speed=0;}}
      if(hit.kind==='police'){t.carHealth-=40;this.smoke(t);if(t.carHealth<=0){t.disabled=true;t.speed=0;}}
      if(hit.kind==='officer'){t.officerHealth-=60;t.officer.rotation.z=Math.PI/2;t.officer.position.y=.3;t.alive=false;t.speed=0;police.crime('officer');}
    }
    const end=origin.clone().addScaledVector(direction,closest);
    const tracer=new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin,end]),new THREE.LineBasicMaterial({color:0xffe4a1,transparent:true,opacity:.9}));this.scene.add(tracer);this.effects.push({mesh:tracer,life:.09,total:.09});
    this.flash.position.copy(origin);this.flashTime=.065;this.flash.visible=true;return true;
  }
  update(dt,player,camera){
    this.cooldown=Math.max(0,this.cooldown-dt);this.flashTime-=dt;this.flash.visible=this.flashTime>0;
    this.gun.visible=!player.car;const d=camera.getWorldDirection(new THREE.Vector3());d.y=0;d.normalize();
    this.gun.position.copy(player.position).add(new THREE.Vector3(d.z*.28,1.3,-d.x*.28)).addScaledVector(d,.48);this.gun.rotation.y=Math.atan2(d.x,d.z);
    for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;if(e.smoke){e.mesh.position.y+=dt*.9;e.mesh.scale.multiplyScalar(1+dt*.5);}e.mesh.material.opacity=Math.max(0,e.life/e.total)*.65;if(e.life<=0){this.scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();this.effects.splice(i,1);}}
  }
}
