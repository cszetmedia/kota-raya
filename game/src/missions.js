// Kota Raya — story missions. Raka, a young driver from Kampung Melati, takes
// jobs from Bang Darma, a fixer with a garage in the beach district. Four
// missions teach driving, pickup, stealing and escaping; finishing all four
// completes the story and opens free roam.
import { MISSION_REWARDS } from './config.js';
import { raiseWanted } from './police.js';

export const STORY_COMPLETE_CASH_BONUS = 0;

// The yellow beacon: a light column and a pulsing ring on the ground.
function buildBeacon(scene) {
  const beacon = new THREE.Group();
  const columnMat = new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.35 });
  const column = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 40, 16, 1, true), columnMat);
  column.position.y = 20;
  beacon.add(column);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.2;
  ring.name = 'ring';
  beacon.add(ring);
  beacon.visible = false;
  scene.add(beacon);
  return beacon;
}

function within(player, target, radius) {
  return Math.hypot(player.x - target.x, player.z - target.z) < radius;
}

// The four missions, each a list of steps with a check that advances them.
export function createMissions(scene, world) {
  const beacon = buildBeacon(scene);
  const missions = [
    {
      id: 1,
      title: 'Paket Kilat',
      giver: 'Bang Darma',
      brief: 'Antar paket ke warung pantai sebelum dingin. Naik mobil biru di depanmu, lalu ikuti penanda kuning.',
      dialog: [
        'Darma: Raka! Paket buat warung pantai, buruan.',
        'Raka: Siap, Bang. Lima menit sampai.',
      ],
      reward: MISSION_REWARDS[0],
      timeLimit: 0,
      steps: [
        {
          text: 'Naik ke mobil biru di depanmu (tekan E)',
          target: null,
          check: (w) => w.player.inCar,
        },
        {
          text: 'Antar paket ke warung pantai',
          target: { x: 150, z: 215, label: 'Warung Pantai' },
          check: (w) => within(w.player, { x: 150, z: 215 }, 8),
        },
      ],
    },
    {
      id: 2,
      title: 'Jemput Sari',
      giver: 'Sari',
      brief: 'Sari menunggu di taman kota. Jemput dia, lalu antar ke pasar Kampung Melati sebelum 90 detik.',
      dialog: [
        'Sari: Raka, aku di taman kota. Antar aku ke pasar ya, keburu tutup!',
        'Raka: Otw! Pegangan yang kencang.',
      ],
      reward: MISSION_REWARDS[1],
      timeLimit: 90,
      steps: [
        {
          text: 'Jemput Sari di taman kota',
          target: { x: -196, z: -196, label: 'Taman Kota' },
          check: (w) => within(w.player, { x: -196, z: -196 }, 7),
          onEnter: (w) => {
            w.removeSariNpc();
            w.toast('Sari naik! Antar dia ke pasar Kampung Melati.');
          },
        },
        {
          text: 'Antar Sari ke pasar Kampung Melati',
          target: { x: -182, z: -140, label: 'Pasar Melati' },
          check: (w) => within(w.player, { x: -182, z: -140 }, 8),
        },
      ],
    },
    {
      id: 3,
      title: 'Mobil Pesanan',
      giver: 'Bang Darma',
      brief: 'Ada sedan merah parkir di pusat kota. Ambil dan bawa ke bengkel Darma. Polisi pasti tidak suka.',
      dialog: [
        'Darma: Sedan merah di pusat kota, Raka. Bawa ke bengkelku, cepat.',
        'Raka: Itu mobil orang, Bang...',
        'Darma: Sudah, jangan banyak tanya. Hati-hati polisi.',
      ],
      reward: MISSION_REWARDS[2],
      timeLimit: 0,
      steps: [
        {
          text: 'Curi sedan merah di pusat kota (tekan E di dekatnya)',
          target: { x: 70, z: -70, label: 'Sedan Merah' },
          check: (w) => w.player.inCar && w.player.car === w.targetCar,
          onEnter: (w) => {
            raiseWanted(w.wanted, 2, 'car-theft');
            w.toast('Mobil dicuri! Wanted naik — polisi mengejar!');
            w.audio.siren(true);
          },
        },
        {
          text: 'Bawa sedan merah ke bengkel Darma',
          target: { x: -203, z: 182, label: 'Bengkel Darma' },
          check: (w) => w.player.inCar && w.player.car === w.targetCar && within(w.player, { x: -203, z: 182 }, 9),
        },
      ],
    },
    {
      id: 4,
      title: 'Pelarian Terakhir',
      giver: 'Bang Darma',
      brief: 'Polisi sudah mengepung. Kabur ke tempat persembunyian di ujung utara sebelum 120 detik. Jangan ketangkap!',
      dialog: [
        'Darma: Mereka sudah di mana-mana, Raka. Kabur ke utara, sekarang!',
        'Raka: Kalau aku ketangkap, bilang ke Sari aku sayang dia.',
        'Darma: Jangan lebay. Gas!',
      ],
      reward: MISSION_REWARDS[3],
      timeLimit: 120,
      steps: [
        {
          text: 'Kabur ke tempat persembunyian di utara — jangan ketangkap!',
          target: { x: 0, z: -231, label: 'Tempat Persembunyian' },
          check: (w) => within(w.player, { x: 0, z: -231 }, 9),
        },
      ],
    },
  ];

  const manager = {
    missions,
    index: 0, // next mission to start
    active: null,
    stepIndex: 0,
    timeLeft: 0,
    failed: false,
    done: false,
    dialogQueue: [],
    dialogTimer: 0,
    beacon,
    currentTarget: null,

    startMission(i) {
      const m = missions[i];
      this.active = m;
      this.stepIndex = 0;
      this.failed = false;
      this.timeLeft = m.timeLimit;
      this.dialogQueue = [...m.dialog];
      this.dialogTimer = 0;
      world.onMissionStart(m);
      this.updateBeacon();
    },

    updateBeacon() {
      const step = this.active ? this.active.steps[this.stepIndex] : null;
      this.currentTarget = step ? step.target : null;
      if (this.currentTarget) {
        beacon.position.set(this.currentTarget.x, 0, this.currentTarget.z);
        beacon.visible = true;
      } else {
        beacon.visible = false;
      }
    },

    // Pulse the beacon ring and play the dialog lines one at a time.
    animateBeaconAndDialog(dt, w) {
      if (beacon.visible) {
        const t = performance.now() / 1000;
        beacon.children[0].material.opacity = 0.25 + Math.sin(t * 3) * 0.12;
        const ring = beacon.getObjectByName('ring');
        if (ring) {
          const s = 1 + Math.sin(t * 3) * 0.15;
          ring.scale.set(s, s, 1);
        }
      }
      if (this.dialogQueue.length > 0) {
        this.dialogTimer -= dt;
        if (this.dialogTimer <= 0) {
          const line = this.dialogQueue.shift();
          w.showDialog(line);
          this.dialogTimer = 3.6;
        }
      }
    },

    update(dt, w) {
      this.animateBeaconAndDialog(dt, w);
      if (!this.active || this.failed) return;
      if (this.timeLeft > 0) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.failed = true;
          w.onMissionFailed(this.active);
          return;
        }
      }
      const step = this.active.steps[this.stepIndex];
      if (step && step.check(w)) {
        if (step.onEnter) step.onEnter(w);
        this.stepIndex += 1;
        if (this.stepIndex >= this.active.steps.length) {
          this.completeMission(w);
        } else {
          this.updateBeacon();
        }
      }
    },

    completeMission(w) {
      const m = this.active;
      w.cash += m.reward;
      w.audio.jingle();
      w.toast(`Misi selesai: ${m.title}  +Rp ${m.reward}rb`);
      // Advance the index BEFORE saving, so the save resumes at the next mission.
      this.index = Math.min(this.index + 1, missions.length);
      this.active = null;
      this.currentTarget = null;
      beacon.visible = false;
      if (this.index >= missions.length) {
        this.done = true;
        w.toast('CERITA SELESAI! Kota Raya milikmu sekarang — free roam.');
        w.showDialog('Darma: Mulai sekarang kau bebas, Raka. Kota Raya milikmu.');
      }
      w.onMissionComplete(m);
    },

    retry() {
      if (this.active) this.startMission(this.index);
    },

    objectiveText() {
      if (this.failed) return 'MISI GAGAL — tekan Enter untuk coba lagi';
      if (!this.active) {
        if (this.done) return 'Cerita selesai — jelajahi Kota Raya sesukamu';
        return 'Tekan Enter untuk mulai misi berikutnya';
      }
      const step = this.active.steps[this.stepIndex];
      let text = `${this.active.title}: ${step.text}`;
      if (this.timeLeft > 0) text += `  ·  ${Math.ceil(this.timeLeft)} dtk`;
      if (this.currentTarget) {
        const d = Math.round(
          Math.hypot(world.player.x - this.currentTarget.x, world.player.z - this.currentTarget.z),
        );
        text += `  ·  ${d} m`;
      }
      return text;
    },
  };
  return manager;
}
