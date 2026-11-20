import * as THREE from 'three';
import { roadNetwork, blocked,groundHeight } from './city.js';
import { random } from './shots.js';

export function makeCarMesh(color = 0xf4bd69, kind = 'coupe') {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness:.4, metalness:.15 });
  const glass = new THREE.MeshStandardMaterial({ color:0x234e62, roughness:.22, metalness:.3 });
  const dark = new THREE.MeshStandardMaterial({ color:0x24343d, roughness:.9 });
  const chrome = new THREE.MeshStandardMaterial({ color:0xd6d9cf, metalness:.65, roughness:.3 });
  function part(x,y,z,w,h,d,material) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  part(0,.75,0,1.9,.65,4.2,paint); part(0,.46,0,1.88,.15,4.3,dark);
  part(0,1.33,-.2,1.62,.72,kind==='van'?2.7:2.1,glass);
  part(0,1.75,-.2,1.7,.13,kind==='van'?2.8:2.2,paint);
  for(const x of [-.8,.8]) part(x,1.35,-.2,.09,.75,.12,paint);
  part(0,.65,2.14,1.8,.18,.12,chrome);part(0,.65,-2.14,1.8,.18,.12,chrome);
  const light=new THREE.MeshStandardMaterial({color:0xfff0b4,emissive:0xffd985,emissiveIntensity:.55});
  const tail=new THREE.MeshStandardMaterial({color:0xe25f49,emissive:0xc43a24,emissiveIntensity:.4});
  for(const x of [-.63,.63]) {part(x,.88,2.12,.48,.23,.08,light);part(x,.88,-2.12,.45,.21,.08,tail);}
  group.userData.wheels=[];
  for(const x of [-1,1]) for(const z of [-1.35,1.35]) {
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.23,10),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.43,z);group.add(wheel);group.userData.wheels.push(wheel);
    part(x*1.12,.43,z,.04,.29,.29,chrome);
  }
  return group;
}

export class PlayerCar {
  constructor(mesh, lane = null) { this.mesh=mesh; this.lane=lane; this.speed=0; this.traffic=!!lane; this.cruise=7+random()*5; this.initialPosition=mesh.position.clone();this.initialYaw=mesh.rotation.y; }
  update(dt,keys) {
    if(this.disabled){this.speed=0;return;}
    const throttle=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
    if(throttle) this.speed+=throttle*(this.speed*throttle<0?24:14)*dt;
    else this.speed*=Math.exp(-1.1*dt);
    if(keys.has('Space')) this.speed*=Math.exp(-8*dt);
    this.speed=THREE.MathUtils.clamp(this.speed,-11,32);
    const steering=Number(keys.has('KeyA'))-Number(keys.has('KeyD'));
    this.mesh.rotation.y+=steering*1.7*Math.min(Math.abs(this.speed)/8,1)*Math.sign(this.speed)*dt;
    const distance=this.speed*dt;
    const x=this.mesh.position.x+Math.sin(this.mesh.rotation.y)*distance;
    const z=this.mesh.position.z+Math.cos(this.mesh.rotation.y)*distance;
    // Conservative circle covers the entire car, including its corners.
    if(!blocked(x,z,2.35)) this.mesh.position.set(x,groundHeight(x,z),z);
    else this.speed*=-.2;
    for(const wheel of this.mesh.userData.wheels) wheel.rotation.x+=distance*2;
  }
  reset() {this.mesh.position.copy(this.initialPosition);this.mesh.rotation.y=this.initialYaw;this.speed=0;this.traffic=!!this.lane;this.health=100;this.disabled=false;this.owned=false;}
}

export class Traffic {
  constructor(scene) {
    this.cars=[];
    const colors=[0xf1b96e,0x67b8b2,0xda806b,0xf1e2b8,0x608d9b,0x937fa9];
    // Two cars per lane, spaced apart so the opening streets are active.
    for(const lane of roadNetwork) for(let j=0;j<2;j++) {
      const mesh=makeCarMesh(colors[Math.floor(random()*colors.length)],random()>.8?'van':'coupe');
      const along=lane.min+(lane.max-lane.min)*((j*.5+random()*.25)%1);
      if(lane.axis==='x') mesh.position.set(along,0,lane.coordinate+lane.laneOffset);
      else mesh.position.set(lane.coordinate+lane.laneOffset,0,along);
      mesh.rotation.y=lane.axis==='x'?lane.direction*Math.PI/2:(lane.direction===1?0:Math.PI);
      scene.add(mesh);const car=new PlayerCar(mesh,lane);car.speed=car.cruise;this.cars.push(car);
    }
    this.parked=[];
    for(let x=-116;x<128;x+=24) {
      if(Math.abs(x)<9 || Math.abs(x+54)<9 || Math.abs(x-54)<9 || Math.abs(x-108)<9 || Math.abs(x+108)<9) continue;
      const mesh=makeCarMesh(colors[Math.floor(random()*colors.length)]);
      mesh.position.set(x,0,60);mesh.rotation.y=Math.PI/2;scene.add(mesh);
      const car=new PlayerCar(mesh);this.cars.push(car);this.parked.push(car);
    }
    // A clearly visible first ride sits next to Marina's starting position.
    const mesh=makeCarMesh(0xe8a65c);mesh.position.set(-46,0,60);mesh.rotation.y=Math.PI/2;scene.add(mesh);
    const first=new PlayerCar(mesh);this.cars.unshift(first);this.parked.push(first);
  }
  update(dt) {
    for(const car of this.cars) if(car.traffic&&!car.disabled) {
      const lane=car.lane;car.speed=car.cruise;
      const axis=lane.axis;car.mesh.position[axis]+=lane.direction*car.speed*dt;
      if(car.mesh.position[axis]>lane.max)car.mesh.position[axis]=lane.min;
      if(car.mesh.position[axis]<lane.min)car.mesh.position[axis]=lane.max;
    }
  }
  reset() { for(const car of this.cars) car.reset(); }
}
