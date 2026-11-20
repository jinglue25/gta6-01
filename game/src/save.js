import { blocked } from './city.js';
const key='port-solana-round2';
const finite=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
export function loadSave(){
  try{
    const d=JSON.parse(localStorage.getItem(key));
    if(!d||d.version!==2||!finite(d.x,-134,134)||!finite(d.z,-120,130)||blocked(d.x,d.z,.5)||!finite(d.cash,0,1e9)||!finite(d.health,1,100)||!finite(d.heading,-1e6,1e6))return null;
    if(!['foot','car'].includes(d.mode)||!Number.isInteger(d.carId)||d.carId< -1||d.carId>100)return null;
    if(!d.mission||!Number.isInteger(d.mission.index)||d.mission.index<0||d.mission.index>5||![0,1].includes(d.mission.stage)||!finite(d.mission.timer,0,120))return null;
    if(!Number.isInteger(d.wanted)||d.wanted<0||d.wanted>5)return null;
    return d;
  }catch{return null;}
}
export function writeSave(player,cash,health,missions,police,cars){
  try{
    localStorage.setItem(key,JSON.stringify({version:2,x:player.position.x,z:player.position.z,heading:player.heading,mode:player.car?'car':'foot',carId:player.car?cars.indexOf(player.car):-1,cash,health:Math.max(1,health),mission:missions.snapshot(),wanted:police.wanted}));return true;
  }catch{return false;}
}
export function clearSave(){try{localStorage.removeItem(key);}catch{}}
