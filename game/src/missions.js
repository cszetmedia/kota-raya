// Kota Raya — empat misi berurutan, hadiah kumulatif, dan suar penanda target.
// Enter mengaktifkan misi berikutnya; misi selesai otomatis saat sampai di tujuan.
import { CFG } from './config.js';
import { dist } from './world.js';
import { writeSave } from './save.js';

export function createMissions(world) {
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  beacon.visible = false;
  world.scene.add(beacon);
  world.beacon = beacon;
  world.missionTarget = null;
}

export function activateNext(world) {
  const m = world.missions;
  if (m.active) return;
  if (m.index >= 4) return;
  const id = m.index + 1;
  m.active = { id, stage: 0, title: CFG.missionNames[id - 1] };
}

function completeMission(world) {
  const m = world.missions;
  const id = m.active.id;
  world.cash = CFG.rewards[id - 1];
  m.done.push(id);
  m.index = id;
  m.active = null;
  writeSave(world);
  if (id === 3) {
    m.active = { id: 4, stage: 0, title: CFG.missionNames[3] };
  }
}

export function updateMissions(world, dt) {
  const m = world.missions;
  const p = world.player;
  let target = null;
  if (m.active) {
    const a = m.active;
    if (a.id === 1) {
      target = { x: CFG.warung.x, z: CFG.warung.z, label: 'Antar paket ke Warung Pantai' };
      if (dist(p.x, p.z, CFG.warung.x, CFG.warung.z) < CFG.missionRadius) completeMission(world);
    } else if (a.id === 2) {
      if (a.stage === 0) {
        target = { x: CFG.sariSpot.x, z: CFG.sariSpot.z, label: 'Jemput Sari di Kampung Melati' };
        if (dist(p.x, p.z, CFG.sariSpot.x, CFG.sariSpot.z) < CFG.pickupRadius) {
          a.stage = 1;
          if (world.sari) {
            world.sari.pickedUp = true;
            world.sari.mesh.visible = false;
          }
        }
      } else {
        target = { x: CFG.pasar.x, z: CFG.pasar.z, label: 'Antar Sari ke Pasar' };
        if (dist(p.x, p.z, CFG.pasar.x, CFG.pasar.z) < CFG.deliverRadius) completeMission(world);
      }
    } else if (a.id === 3) {
      if (a.stage === 0) {
        target = { x: world.targetCar.x, z: world.targetCar.z, label: 'Curi sedan merah pesanan Bang Darma' };
      } else {
        target = { x: CFG.bengkel.x, z: CFG.bengkel.z, label: 'Antar sedan ke Bengkel Darma' };
        if (p.inCar && p.car === world.targetCar && dist(p.x, p.z, CFG.bengkel.x, CFG.bengkel.z) < CFG.deliverRadius) {
          completeMission(world);
        }
      }
    }
  }
  world.missionTarget = target;
  if (world.beacon) {
    if (target) {
      world.beacon.visible = true;
      world.beacon.position.set(target.x, 15, target.z);
      world.beacon.rotation.y += dt;
    } else {
      world.beacon.visible = false;
    }
  }
}

export function objectiveText(world) {
  const m = world.missions;
  if (!world.started) return 'Tekan Enter untuk mulai';
  if (m.active) {
    const a = m.active;
    if (a.id === 1) return 'Misi 1: Paket Kilat — Antar paket ke Warung Pantai';
    if (a.id === 2) {
      return a.stage === 0
        ? 'Misi 2: Jemput Sari — Jemput Sari di Kampung Melati'
        : 'Misi 2: Jemput Sari — Antar Sari ke Pasar';
    }
    if (a.id === 3) {
      return a.stage === 0
        ? 'Misi 3: Mobil Pesanan — Curi sedan merah'
        : 'Misi 3: Mobil Pesanan — Antar sedan ke Bengkel Darma';
    }
    if (a.id === 4) return 'Misi 4: Pelarian Terakhir — Tekan Enter';
  }
  return 'Tekan Enter untuk misi berikutnya';
}
