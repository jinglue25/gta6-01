import * as THREE from 'three';
import { random } from './shots.js';
import { streets,crossStreets,blocked } from './city.js';

export function makeFigure(color=0x71ada3){
  const g=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:0xc28d65}),cloth=new THREE.MeshStandardMaterial({color}),dark=new THREE.MeshStandardMaterial({color:0x344859});
  const box=(x,y,z,w,h,d,m)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;g.add(mesh);return mesh;};
  box(0,1.2,0,.62,.65,.36,cloth);box(0,1.78,0,.4,.43,.4,skin);box(0,2,0,.43,.12,.43,dark);
  for(const x of [-.18,.18])box(x,.5,0,.25,.9,.29,dark);
  for(const x of [-.43,.43])box(x,1.12,0,.19,.66,.22,skin);
  return g;
}
export class Pedestrians {
  constructor(scene,count=22){this.people=[];this.scene=scene;for(let i=0;i<count;i++){const mesh=makeFigure([0xeaa574,0x80b9af,0xc7a5bb,0xead7a1,0x7197bd][i%5]);scene.add(mesh);this.people.push({mesh,alive:true,panic:0,down:0,path:null,phase:random()*6});}}
  recycle(p,position){
    let best;
    for(let i=0;i<40;i++){
      const axis=random()<.5?'x':'z',list=axis==='x'?crossStreets:streets;
      const coordinate=list[Math.floor(random()*list.length)]+(random()<.5?-9:9);
      const along=(axis==='x'?position.x:position.z)+(random()-.5)*120;
      const x=axis==='x'?along:coordinate,z=axis==='z'?along:coordinate;
      if(blocked(x,z,.5))continue;
      const distance=Math.hypot(x-position.x,z-position.z);best={axis,coordinate,along,x,z};if(distance<85&&distance>13)break;
    }
    if(!best)best={axis:'x',coordinate:63,x:-49,z:63,along:-49};
    p.path=best;p.mesh.position.set(best.x,0,best.z);p.direction=random()<.5?-1:1;p.alive=true;p.down=0;p.panic=0;p.mesh.rotation.set(0,0,0);p.mesh.visible=true;
  }
  reset(position){for(const p of this.people)this.recycle(p,position);}
  witnesses(position,radius=30){return this.people.some(p=>p.alive&&p.mesh.position.distanceTo(position)<radius);}
  panic(position,radius=45){for(const p of this.people)if(p.alive&&p.mesh.position.distanceTo(position)<radius)p.panic=7;}
  knockDown(p){if(!p.alive)return false;p.alive=false;p.down=0;p.mesh.rotation.z=Math.PI/2;p.mesh.position.y=.3;return true;}
  update(dt,player,cars,onCrime){
    for(const p of this.people){
      if(!p.path||p.mesh.position.distanceTo(player.position)>115||(!p.alive&&(p.down+=dt)>15)){this.recycle(p,player.position);continue;}
      if(!p.alive)continue;
      for(const car of cars){
        const d=car.mesh.position.distanceTo(p.mesh.position);
        if(Math.abs(car.speed)>7&&d<13)p.panic=5;
        if(Math.abs(car.speed)>4&&d<2.2&&this.knockDown(p)){if(car===player.car)onCrime('pedestrian');break;}
      }
      if(!p.alive)continue;
      p.panic=Math.max(0,p.panic-dt);const speed=p.panic?4.5:1.15,path=p.path;
      const next=p.mesh.position.clone();next[path.axis]+=p.direction*speed*dt;
      if(blocked(next.x,next.z,.45))p.direction*=-1;else p.mesh.position.copy(next);
      p.mesh.rotation.y=path.axis==='x'?p.direction*Math.PI/2:(p.direction>0?0:Math.PI);
      p.phase+=dt*(p.panic?13:5);p.mesh.position.y=Math.sin(p.phase)*.035;
    }
  }
}
