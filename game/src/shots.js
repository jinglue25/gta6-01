const params = new URLSearchParams(location.search);
export const shot = ['start', 'play', 'drive', 'chase', 'mission'].includes(params.get('shot')) ? params.get('shot') : null;
if(typeof window!=='undefined')window.__shotReady=false;
// Called after the first composed scene has actually been rendered by main.js.
export function markShotReady(){
  if(!shot||typeof window==='undefined')return;
  document.getElementById('menu').hidden=shot!=='start';
  document.getElementById('hud').hidden=shot==='start';
  window.__shotReady=true;
}
export const seed = Number(params.get('seed') ?? 9261) >>> 0;
let state = seed;
export function random() {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 4294967296;
}
export function configureShot(name, player, cars, police=null, missions=null) {
  if (name !== 'start') {
    const nearby = cars.filter(car => car.traffic).slice(0, 4);
    nearby.forEach((car, i) => {
      car.mesh.position.set([-74, -32, 9, 42][i], 0, i % 2 ? 51.4 : 56.6);
      car.mesh.rotation.y = i % 2 ? -Math.PI / 2 : Math.PI / 2;
    });
  }
  if (name === 'play') {
    player.mesh.position.set(-49, 0, 64);
    player.mesh.rotation.y = Math.PI * .78;
  }
  if (name === 'drive' || name === 'chase') {
    const car = cars[0];
    car.mesh.position.set(-20, 0, 56.6);
    car.mesh.rotation.y = Math.PI / 2;
    player.enter(car);
  }
  if(name==='chase'&&police&&missions){
    police.clear();police.setFloor(3);
    const a=police.spawn(),b=police.spawn();a.mesh.position.set(-17,0,56.6);b.mesh.position.set(-24.5,0,51.4);a.mesh.rotation.y=b.mesh.rotation.y=Math.PI/2;
    player.car.mesh.position.set(-8,0,56.6);player.car.speed=22;missions.index=4;missions.stage=0;missions.timer=98;police.flash(0);
  }
  if(name==='mission'&&missions){
    player.car=null;player.mesh.visible=true;player.mesh.position.set(88.5,.75,119);player.mesh.rotation.y=-Math.PI*.8;
    missions.index=4;missions.timer=75;missions.stage=0;
  }
}
