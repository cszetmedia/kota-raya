// Kota Raya — HUD: objektif misi, uang, bintang wanted, nyawa, kecepatan,
// subtitle dialog, toast, dan minimap 2D yang hidup (jalan, pemain, lalu
// lintas, polisi, penanda misi). Semua DOM tinggal di index.html; modul
// ini yang memperbaruinya.
import { WORLD } from './config.js';

const MAP_SIZE = 180; // kanvas minimap 180x180, menampilkan seluruh peta

export function createHud() {
  const el = (id) => document.getElementById(id);
  const objective = el('objective');
  const cash = el('cash');
  const stars = el('stars');
  const health = el('health');
  const speed = el('speed');
  const dialog = el('dialog');
  const toast = el('toast');
  const banner = el('banner');
  const minimap = el('minimap');
  const mapCtx = minimap.getContext('2d');
  let dialogTimer = 0;
  let toastTimer = 0;
  let bannerTimer = 0;

  const toMap = (v) => (v + 280) * (MAP_SIZE / 560);

  function paintMinimap(state) {
    mapCtx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
    // Laut, pasir, dan daratan.
    mapCtx.fillStyle = '#2fa8c8';
    mapCtx.fillRect(0, toMap(WORLD.seaZ), MAP_SIZE, MAP_SIZE - toMap(WORLD.seaZ));
    mapCtx.fillStyle = '#e8d8a0';
    mapCtx.fillRect(0, toMap(WORLD.beachZ), MAP_SIZE, toMap(WORLD.seaZ) - toMap(WORLD.beachZ));
    mapCtx.fillStyle = '#b8a888';
    mapCtx.fillRect(0, 0, MAP_SIZE, toMap(WORLD.beachZ));
    // Jalan-jalan.
    mapCtx.fillStyle = '#3a3f46';
    const scale = MAP_SIZE / 560;
    for (const r of WORLD.roads) {
      mapCtx.fillRect(toMap(r - WORLD.roadWidth / 2), 0, WORLD.roadWidth * scale, toMap(WORLD.beachZ));
      mapCtx.fillRect(0, toMap(r - WORLD.roadWidth / 2), MAP_SIZE, WORLD.roadWidth * scale);
    }
    // Penanda misi, berdenyut.
    if (state.missionTarget) {
      const mx = toMap(state.missionTarget.x);
      const my = toMap(state.missionTarget.z);
      const pulse = 5 + Math.sin(performance.now() / 300) * 2;
      mapCtx.fillStyle = '#ffd400';
      mapCtx.beginPath();
      mapCtx.arc(mx, my, pulse, 0, Math.PI * 2);
      mapCtx.fill();
      mapCtx.strokeStyle = '#7a5c00';
      mapCtx.lineWidth = 2;
      mapCtx.stroke();
    }
    // Lalu lintas sebagai titik putih, polisi sebagai titik biru/merah berkedip.
    const flash = Math.floor(performance.now() / 300) % 2 === 0;
    for (const car of state.traffic) {
      mapCtx.fillStyle = '#ffffff';
      mapCtx.fillRect(toMap(car.mesh.position.x) - 2, toMap(car.mesh.position.z) - 2, 4, 4);
    }
    for (const car of state.police) {
      mapCtx.fillStyle = flash ? '#2040ff' : '#ff2020';
      mapCtx.beginPath();
      mapCtx.arc(toMap(car.x), toMap(car.z), 4, 0, Math.PI * 2);
      mapCtx.fill();
    }
    // Panah pemain, diputar mengikuti arah hadap.
    const px = toMap(state.playerX);
    const py = toMap(state.playerZ);
    mapCtx.save();
    mapCtx.translate(px, py);
    mapCtx.rotate(Math.PI - state.heading);
    mapCtx.fillStyle = '#2c6fd8';
    mapCtx.strokeStyle = '#ffffff';
    mapCtx.lineWidth = 1.5;
    mapCtx.beginPath();
    mapCtx.moveTo(0, -7);
    mapCtx.lineTo(5, 6);
    mapCtx.lineTo(0, 3);
    mapCtx.lineTo(-5, 6);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.stroke();
    mapCtx.restore();
    // Tanda utara.
    mapCtx.fillStyle = 'rgba(255,255,255,0.9)';
    mapCtx.font = 'bold 11px system-ui, sans-serif';
    mapCtx.fillText('U', 6, 14);
  }

  return {
    showDialog(line) {
      dialog.textContent = line;
      dialog.style.opacity = '1';
      dialogTimer = 3.6;
    },
    showToast(text) {
      toast.textContent = text;
      toast.style.opacity = '1';
      toastTimer = 3.2;
    },
    showBanner(text) {
      banner.textContent = text;
      banner.style.opacity = '1';
      bannerTimer = 2.6;
    },
    update(dt, state) {
      if (dialogTimer > 0) {
        dialogTimer -= dt;
        if (dialogTimer <= 0) dialog.style.opacity = '0';
      }
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) toast.style.opacity = '0';
      }
      if (bannerTimer > 0) {
        bannerTimer -= dt;
        if (bannerTimer <= 0) banner.style.opacity = '0';
      }
      objective.textContent = state.objective;
      cash.textContent = `Rp ${state.cash}rb`;
      let starText = '';
      for (let i = 0; i < 5; i += 1) starText += i < state.stars ? '★' : '☆';
      stars.textContent = starText;
      stars.style.color = state.stars > 0 ? '#ffd400' : 'rgba(255,255,255,0.55)';
      health.textContent = `❤ ${Math.ceil(state.health)}`;
      health.style.color = state.health < 30 ? '#ff5a5a' : '#ffffff';
      speed.textContent = state.inCar ? `${Math.round(state.speedKmh)} km/j` : '';
      paintMinimap(state);
    },
  };
}
