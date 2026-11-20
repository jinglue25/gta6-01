import * as THREE from 'three';
import { random } from './shots.js';

export const bounds = { minX: -134, maxX: 134, minZ: -120, maxZ: 98 };
export const streets = [-108, -54, 0, 54, 108];
export const crossStreets = [-102, -50, 2, 54];
export const buildingBoxes = [];
export const roadNetwork = [];
export function groundHeight(x,z){
  return ((Math.abs(x-91)<=3.5&&z>=77&&z<=126.5)||(x>=71.5&&x<=110.5&&z>=121.5&&z<=126.5))?.75:0;
}
for (const coordinate of streets) for (const direction of [-1, 1]) roadNetwork.push({ axis: 'z', coordinate, direction, laneOffset: direction * -2.6, min: -120, max: 73 });
for (const coordinate of crossStreets) for (const direction of [-1, 1]) roadNetwork.push({ axis: 'x', coordinate, direction, laneOffset: direction * 2.6, min: -132, max: 132 });

export function blocked(x, z, radius = .65) {
  const onPier=(x-radius>=87.5&&x+radius<=94.5&&z>=94&&z+radius<=126.5)||(x-radius>=71.5&&x+radius<=110.5&&z-radius>=121.5&&z+radius<=126.5);
  if (x < bounds.minX + radius || x > bounds.maxX - radius || z < bounds.minZ + radius || (z > bounds.maxZ - radius&&!onPier)) return true;
  return buildingBoxes.some(b => x + radius > b.minX && x - radius < b.maxX && z + radius > b.minZ && z - radius < b.maxZ);
}

export function buildCity(scene) {
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .86, ...extra });
  const asphalt = mat(0x3c535b), curb = mat(0xced2bd), marking = mat(0xf9e4b0);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function box(x, y, z, w, h, d, material, parent = scene) {
    const mesh = new THREE.Mesh(cube, material);
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function sign(text, x, y, z, width, color = '#164751') {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const c = canvas.getContext('2d'); c.fillStyle = color; c.fillRect(0, 0, 512, 128);
    c.fillStyle = '#fff0c3'; c.font = 'bold 48px Arial'; c.textAlign = 'center'; c.fillText(text, 256, 82);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    mesh.position.set(x, y, z); scene.add(mesh);
  }
  box(0, -.65, -24, 280, 1, 210, mat(0x8fbb9b));
  box(0, -.25, 82, 290, .5, 42, mat(0xf4d59a));
  const waterMaterial = mat(0x279eac, { metalness: .35, roughness: .32, transparent: true, opacity: .92 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1100, 650, 64, 32), waterMaterial);
  water.rotation.x = -Math.PI / 2; water.position.set(0, -.48, 422); scene.add(water);
  const waterBase = water.geometry.attributes.position.array.slice();
  for (const x of streets) box(x, -.06, -24, 14, .16, 210, asphalt);
  for (const z of crossStreets) box(0, -.04, z, 280, .16, 14, asphalt);
  for (const x of streets) for (let z = -119; z < 77; z += 7) if (!crossStreets.some(s => Math.abs(s-z) < 9)) box(x, .055, z, .16, .025, 3.2, marking);
  for (const z of crossStreets) for (let x = -131; x < 135; x += 7) if (!streets.some(s => Math.abs(s-x) < 9)) box(x, .065, z, 3.2, .025, .16, marking);
  for (const x of streets) for (const z of crossStreets) for (let k = -5; k <= 5; k += 2) {
    box(x + k, .07, z + 9, 1, .025, 2.5, marking);
    box(x + 9, .07, z + k, 2.5, .025, 1, marking);
  }
  const windowCanvas = document.createElement('canvas'); windowCanvas.width = 64; windowCanvas.height = 128;
  const wc = windowCanvas.getContext('2d'); wc.fillStyle = '#eee1c9'; wc.fillRect(0, 0, 64, 128);
  for (let y = 9; y < 128; y += 26) for (let x = 8; x < 64; x += 25) {
    wc.fillStyle = random() > .7 ? '#f8d699' : '#416879'; wc.fillRect(x, y, 14, 17);
    wc.fillStyle = '#ffffff60'; wc.fillRect(x, y, 3, 16);
  }
  const windows = new THREE.CanvasTexture(windowCanvas); windows.colorSpace = THREE.SRGBColorSpace;
  const palette = [0xf0bba2, 0xd1e6c6, 0xf1d490, 0x98cacc, 0xdfa5a6, 0xe4e1c5];
  for (let ix = 0; ix < streets.length - 1; ix++) for (let iz = 0; iz < crossStreets.length - 1; iz++) {
    const cx = (streets[ix]+streets[ix+1])/2, cz = (crossStreets[iz]+crossStreets[iz+1])/2;
    box(cx, .03, cz, 39, .3, 37, curb);
    for (let a = -1; a <= 1; a += 2) for (let b = -1; b <= 1; b += 2) {
      const x = cx + a*9.8, z = cz + b*9.5;
      const w = 14 + random()*3, d = 13 + random()*3;
      const h = iz === 2 ? 7 + random()*15 : 10 + random()*31;
      const wall = mat(palette[Math.floor(random()*palette.length)], { map: windows, emissive: 0xf9cb8c, emissiveMap: windows, emissiveIntensity: .11 });
      const building = box(x, h/2+.2, z, w, h, d, wall); building.castShadow = true;
      box(x, h+.5, z, w+.5, .6, d+.5, mat(0xf2e6cd));
      box(x+2, h+1.2, z, 4, 1, 4, mat(0x6c9192));
      buildingBoxes.push({ minX:x-w/2-.4, maxX:x+w/2+.4, minZ:z-d/2-.4, maxZ:z+d/2+.4 });
      if (iz === 2 && b === 1) box(x, 2.8, z+d/2+.7, w, .3, 2, mat(ix%2 ? 0xe48b65 : 0x328d88));
    }
  }
  const trunk = mat(0xa67b50), frond = mat(0x317b58), lampMat = mat(0x355d66);
  function palm(x,z,scale=1) {
    const group = new THREE.Group(); group.position.set(x,0,z); group.scale.setScalar(scale); scene.add(group);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.23,.42,8,6),trunk); stem.position.y=4; stem.rotation.z=.07; group.add(stem);
    for(let i=0;i<7;i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(.85,5.4,3),frond);
      const angle=i*Math.PI*2/7;
      leaf.position.set(Math.sin(angle)*2.1,7.6,Math.cos(angle)*2.1);
      leaf.rotation.set(Math.cos(angle)*1.2,angle,Math.sin(angle)*-1.2); group.add(leaf);
    }
  }
  for(let x=-126;x<135;x+=15) { palm(x,68, .85+random()*.25); if(x%3===0) palm(x,91,.8); }
  for(const x of streets) for(let z=-90;z<65;z+=30) {
    box(x+8.8,3.5,z,.16,7,.16,lampMat); box(x+7.6,6.9,z,2.5,.16,.2,lampMat);
    box(x+6.6,6.8,z,.9,.15,.65,mat(0xffe8a0,{emissive:0xffcd77,emissiveIntensity:.8}));
  }
  box(0,.08,76,280,.3,4,mat(0xd4b482));
  const timber=mat(0xa77d56);
  box(91,.45,103,7,.6,53,timber); box(91,.45,124,39,.6,5,timber);
  for(let z=82;z<129;z+=8) for(const x of [88,94]) box(x,-.3,z,.4,2.4,.4,timber);
  for(let x=76;x<109;x+=11) {
    const hull = new THREE.Mesh(new THREE.ConeGeometry(2,7,4),mat(0xf3e8c7));
    hull.rotation.set(Math.PI/2,0,Math.PI/4); hull.position.set(x,.1,132); scene.add(hull);
    box(x,1,132,1.8,1.3,3,mat(0x55b2b5)); box(x,3.6,132,.1,6,.1,timber);
  }
  for(let x=-116;x<65;x+=24) {
    box(x,.4,85,3,.6,1,mat(0xf5e4b6));
    const umbrella=new THREE.Mesh(new THREE.ConeGeometry(2.5,1,8),mat(x%48===0?0xf1a16d:0x64b8b3));
    umbrella.position.set(x,3.1,86);scene.add(umbrella);box(x,1.5,86,.1,3,.1,timber);
  }
  sign('SOLANA MARINA',91,5,77,16);
  sign('VALE EXPRESS',-80,4.5,45,12,'#b56850');
  sign('BAHÍA SOCIAL CLUB',-26,5,45,14);
  sign('SOLANA CIVIC STATION',-120,4,-96,15);
  sign('COASTAL MEDICAL',120,4,-45,13,'#357f79');
  return { buildingBoxes, roadNetwork, water, update(time) {
    const positions=water.geometry.attributes.position;
    for(let i=0;i<positions.count;i++) positions.array[i*3+2]=waterBase[i*3+2]+Math.sin(waterBase[i*3]*.1+time*.8)*.19+Math.cos(waterBase[i*3+1]*.12+time)*.13;
    positions.needsUpdate=true; water.geometry.computeVertexNormals();
  } };
}
