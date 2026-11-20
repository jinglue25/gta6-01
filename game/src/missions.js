import * as THREE from 'three';
import { makeCarMesh,PlayerCar } from './vehicles.js';
import { blocked,groundHeight } from './city.js';

export const story=[
  {name:'First Run',dialogue:'Dario Venn: Welcome to Solana, Marina. Take a car to the pier. A sealed package is waiting.',objective:'Drive to the marina and collect the package',point:[91,84],pay:200},
  {name:'Across the Bay',dialogue:'Dario: Luz at the beachfront café needs that package. Keep it moving; her shutters close soon.',objective:'Deliver to Luz’s beachfront café',point:[-74,64],pay:350,time:100},
  {name:'Borrowed Wheels',dialogue:'Dario: Find the coral coupe downtown. Bring it to my garage. The owner will notice.',objective:'Take the marked coral sports car',point:[0,-28],pay:500},
  {name:'Heat',dialogue:'Dario: You brought company. Break their line of sight and stay out of view.',objective:'Lose the police — clear every wanted star',pay:400},
  {name:'Last Boat Out',dialogue:'Dario: They found us. The last skiff leaves the marina in two minutes. Get to the end of the pier!',objective:'Reach Dario’s getaway boat',point:[91,123],pay:1000,time:120},
];
export class Missions {
  constructor(scene,cars,police,callbacks){
    this.police=police;this.callbacks=callbacks;this.index=0;this.stage=0;this.timer=0;this.elapsed=0;
    const mesh=makeCarMesh(0xe97668);mesh.position.set(0,0,-28);this.markedCar=new PlayerCar(mesh);this.markedCar.storyCar=true;cars.push(this.markedCar);scene.add(mesh);
    const material=new THREE.MeshBasicMaterial({color:0xffdc87,transparent:true,opacity:.26,depthWrite:false});
    this.marker=new THREE.Group();
    this.pillar=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,10,16,1,true),material);this.pillar.position.y=5;this.marker.add(this.pillar);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(2.3,.14,6,32),new THREE.MeshBasicMaterial({color:0xffd17e}));ring.rotation.x=Math.PI/2;ring.position.y=.2;this.marker.add(ring);scene.add(this.marker);
  }
  reset(data=null){
    this.index=data?.index??0;this.stage=data?.stage??0;this.timer=data?.timer??story[this.index]?.time??0;this.elapsed=0;this.markedCar.reset();
    const car=data?.car;
    if(car&&Number.isFinite(car.x)&&Number.isFinite(car.z)&&Number.isFinite(car.heading)&&!blocked(car.x,car.z,.5)){
      this.markedCar.mesh.position.set(car.x,0,car.z);this.markedCar.mesh.rotation.y=car.heading;this.markedCar.owned=!!this.stage;
    }
    this.introduce();if(this.index===4)this.police.setFloor(3);if(this.index===3&&this.police.wanted===0&&!data)this.police.setFloor(2);
  }
  introduce(){const m=story[this.index];this.callbacks.notify(m?m.name.toUpperCase():'A CITY OF YOUR OWN',m?m.dialogue:'Dario: You made it, Marina. Keep the cash. Solana is yours now — explore, drive, or replay the story from the menu.',7);}
  get target(){
    if(this.index>=story.length||this.index===3)return null;
    if(this.index===2)return this.stage?new THREE.Vector3(-108,0,-26):this.markedCar.mesh.position.clone();
    const point=story[this.index].point;return new THREE.Vector3(point[0],groundHeight(point[0],point[1]),point[1]);
  }
  get objective(){
    if(this.index>=story.length)return 'Free roam — your next chapter is unwritten';
    if(this.index===2&&this.stage)return 'Deliver the coral coupe to Dario’s garage';
    return story[this.index].objective;
  }
  onEnter(car){if(this.index===2&&!this.stage&&car===this.markedCar){this.stage=1;this.police.setFloor(1);this.callbacks.notify('BORROWED WHEELS','Dario: That’s the one. Garage on the western avenue. Keep the paint on it.',5);this.callbacks.save();}}
  complete(){
    const mission=story[this.index];if(!mission)return;
    this.callbacks.pay(mission.pay);this.callbacks.notify('COMPLETE · '+mission.name.toUpperCase(),'+$'+mission.pay+' · '+(this.index===4?'Dario: You made it. The city is yours.':'Dario: Good work, Marina. Stay on the line.'),5);
    this.index++;this.stage=0;this.elapsed=0;this.timer=story[this.index]?.time??0;
    if(this.index===3)this.police.setFloor(2);
    if(this.index===4)this.police.setFloor(3);
    if(this.index===5){this.police.clear();this.callbacks.notify('LAST BOAT OUT · STORY COMPLETE','Dario: You made it. Keep the cash. Solana is yours now. Free roam is open; replay from the start screen.',12);}
    this.callbacks.save();
  }
  retry(){this.timer=story[this.index]?.time??0;this.elapsed=0;this.callbacks.notify('MISSED THE WINDOW','Dario: We’ll try another handoff. The timer has restarted — make it count.',5);}
  onRespawn(){if(this.index===2){this.stage=0;this.markedCar.reset();}this.timer=story[this.index]?.time??0;this.elapsed=0;}
  animate(time){
    const target=this.target;this.marker.visible=!!target;
    if(target){this.marker.position.copy(target);this.pillar.material.opacity=.2+Math.sin(time*2)*.07;this.marker.rotation.y=time*.3;}
  }
  update(dt,player){
    if(this.index>=story.length)return;this.elapsed+=dt;
    if(this.index===2&&this.markedCar.disabled){
      if(player.car===this.markedCar&&!player.exit()){player.car=null;player.mesh.visible=true;player.mesh.position.set(0,0,-22);}
      this.markedCar.reset();this.stage=0;this.callbacks.notify('BORROWED WHEELS · TRY AGAIN','Dario: That coupe is finished. I found another at the downtown pickup. Bring this one back intact.',6);this.callbacks.save();return;
    }
    if(this.elapsed-dt<5&&this.elapsed>=5)this.introduce();
    if(this.timer>0){this.timer=Math.max(0,this.timer-dt);if(this.timer===0){this.retry();return;}}
    if(this.index===3){if(!this.police.wanted)this.complete();return;}
    const target=this.target;if(!target||player.position.distanceTo(target)>4.5)return;
    if(this.index===0&&!player.car)return;
    if(this.index===2){if(!this.stage){if(player.car===this.markedCar)this.onEnter(player.car);return;}if(player.car!==this.markedCar)return;}
    this.complete();
  }
  snapshot(){const p=this.markedCar.mesh.position;return {index:this.index,stage:this.stage,timer:this.timer,car:{x:p.x,z:p.z,heading:this.markedCar.mesh.rotation.y}};}
}
