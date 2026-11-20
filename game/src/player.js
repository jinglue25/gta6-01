import * as THREE from 'three';
import { blocked,groundHeight } from './city.js';

export class Player {
  constructor(scene) {
    this.mesh=new THREE.Group();scene.add(this.mesh);this.car=null;this.walkTime=0;
    const skin=new THREE.MeshStandardMaterial({color:0xb77b56});
    const shirt=new THREE.MeshStandardMaterial({color:0xf5d39a});
    const trousers=new THREE.MeshStandardMaterial({color:0x315663});
    const hair=new THREE.MeshStandardMaterial({color:0x332e33});
    const shoe=new THREE.MeshStandardMaterial({color:0xf0e3c8});
    const bag=new THREE.MeshStandardMaterial({color:0xc97850});
    const part=(x,y,z,w,h,d,mat,parent=this.mesh)=>{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;
    };
    part(0,1.22,0,.62,.66,.35,shirt);part(0,1.84,0,.39,.43,.39,skin);
    part(0,2.04,-.04,.44,.18,.44,hair);part(0,1.85,-.23,.38,.37,.14,hair);
    part(.29,1.73,-.29,.2,.44,.2,hair);
    part(0,1.2,-.29,.55,.55,.22,bag);part(.13,1.36,.2,.1,.6,.06,bag);
    this.legs=[];this.arms=[];
    for(const side of [-1,1]) {
      const leg=new THREE.Group();leg.position.set(side*.17,.93,0);this.mesh.add(leg);
      part(0,-.34,0,.25,.7,.28,trousers,leg);part(0,-.78,.07,.27,.18,.42,shoe,leg);this.legs.push(leg);
      const arm=new THREE.Group();arm.position.set(side*.43,1.48,0);this.mesh.add(arm);
      part(0,-.26,0,.18,.56,.21,skin,arm);part(0,-.07,0,.23,.25,.25,shirt,arm);this.arms.push(arm);
    }
    this.mesh.position.set(-49,0,64);
  }
  update(dt,keys,yaw) {
    const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
    const right=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
    const v=new THREE.Vector3(-Math.sin(yaw)*forward+Math.cos(yaw)*right,0,-Math.cos(yaw)*forward-Math.sin(yaw)*right);
    const moving=v.lengthSq()>0;
    if(moving) {
      v.normalize().multiplyScalar((keys.has('ShiftLeft')||keys.has('ShiftRight')?8:4.4)*dt);
      const p=this.mesh.position;
      if(!blocked(p.x+v.x,p.z,.48))p.x+=v.x;
      if(!blocked(p.x,p.z+v.z,.48))p.z+=v.z;
      this.mesh.rotation.y=Math.atan2(v.x,v.z);
      this.walkTime+=dt*(keys.has('ShiftLeft')||keys.has('ShiftRight')?14:9);
    }
    for(let i=0;i<2;i++) {
      const swing=moving?Math.sin(this.walkTime+i*Math.PI)*.6:0;
      this.legs[i].rotation.x=swing;this.arms[i].rotation.x=-swing;
    }
    this.mesh.position.y=groundHeight(this.mesh.position.x,this.mesh.position.z);
  }
  nearest(cars) {
    let nearest=null, distance=5.6;
    for(const car of cars) if(!car.traffic || Math.abs(car.speed)<1) {
      const d=car.mesh.position.distanceTo(this.mesh.position);
      if(d<distance) {nearest=car;distance=d;}
    }
    return nearest;
  }
  enter(car) {car.traffic=false;car.speed=0;this.car=car;this.mesh.visible=false;}
  exit() {
    if(!this.car)return false;
    const car=this.car,p=car.mesh.position,a=car.mesh.rotation.y;
    // Search both sides, then the front and rear, without placing Marina in a wall.
    for(const [side,forward] of [[3,0],[-3,0],[0,-4],[0,4],[4,2],[-4,2]]) {
      const x=p.x+Math.cos(a)*side+Math.sin(a)*forward;
      const z=p.z-Math.sin(a)*side+Math.cos(a)*forward;
      if(!blocked(x,z,.55)) {
        this.mesh.position.set(x,groundHeight(x,z),z);this.mesh.rotation.y=a;this.mesh.visible=true;this.car=null;car.speed=0;return true;
      }
    }
    return false;
  }
  get position() {return this.car?this.car.mesh.position:this.mesh.position;}
  get heading() {return this.car?this.car.mesh.rotation.y:this.mesh.rotation.y;}
}
