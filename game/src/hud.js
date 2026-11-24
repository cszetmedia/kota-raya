// Kota Raya — HUD: kecepatan, bintang wanted, uang, nyawa, objektif, minimap.
import { CFG } from './config.js';
import { objectiveText } from './missions.js';

export function createHud() {
  return {
    el: document.getElementById('hud'),
    speed: document.getElementById('speed'),
    stars: document.getElementById('stars'),
    cash: document.getElementById('cash'),
    health: document.getElementById('health'),
    objective: document.getElementById('objective'),
    minimap: document.getElementById('minimap'),
  };
}

export function updateHud(hud, world) {
  const p = world.player;
  const kmh = Math.round(Math.abs(p.inCar && p.car ? p.car.speed : p.speed) * 3.6);
  hud.speed.textContent = kmh + ' km/j';
  hud.stars.textContent = '★'.repeat(world.wanted.stars) + '☆'.repeat(5 - world.wanted.stars);
  hud.cash.textContent = 'Rp ' + world.cash;
  hud.health.textContent = 'Nyawa ' + Math.round(p.health);
  hud.objective.textContent = objectiveText(world);
  drawMinimap(hud.minimap, world);
}

// Peta kecil 180x180: jalan, laut, pemain, lalu lintas, polisi, dan target misi.
function drawMinimap(canvas, world) {
  const ctx = canvas.getContext('2d');
  const S = canvas.width;
  const px = (x) => ((x + CFG.half) / CFG.worldSize) * S;
  const pz = (z) => ((z + CFG.half) / CFG.worldSize) * S;
  ctx.fillStyle = '#0d1b2a';
  ctx.fillRect(0, 0, S, S);
  // Laut di selatan.
  ctx.fillStyle = '#2e7fb8';
  ctx.fillRect(0, pz(228), S, S - pz(228));
  // Jalan.
  ctx.strokeStyle = '#5a646e';
  ctx.lineWidth = 4;
  for (const a of CFG.avenues) {
    ctx.beginPath();
    ctx.moveTo(px(a), 0);
    ctx.lineTo(px(a), S);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pz(a));
    ctx.lineTo(S, pz(a));
    ctx.stroke();
  }
  const dot = (x, z, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px(x), pz(z), r, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const c of world.traffic) dot(c.x, c.z, '#e8b93c', 2);
  for (const c of world.parked) dot(c.x, c.z, '#7a7f85', 2);
  for (const p of world.wanted.police) dot(p.x, p.z, '#3d7dd9', 3);
  if (world.sari && !world.sari.pickedUp) dot(world.sari.x, world.sari.z, '#e84393', 3);
  if (world.targetCar) dot(world.targetCar.x, world.targetCar.z, '#ff5340', 3);
  if (world.missionTarget) {
    ctx.strokeStyle = '#ffd24a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px(world.missionTarget.x), pz(world.missionTarget.z), 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  dot(world.player.x, world.player.z, '#ffffff', 3.5);
}
