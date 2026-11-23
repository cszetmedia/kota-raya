// Kota Raya — boot dan satu loop. Game bergerak di antara empat layar:
// judul, bermain, jeda, dan tertangkap. Input dibaca setiap frame, dunia
// maju dalam langkah tetap 1/60 detik, dan renderer menggambar apa yang ada.
//
// ?seed=N mengunci tata letak kota dan lalu lintas. ?shot=start|drive|chase|mission
// (dengan &seed=N) menggelar adegan itu sebagai ganti menjalankan loop,
// menggambarnya, dan menyetel window.__shotReady untuk screenshot.
import { STEP_SECONDS, createWorld } from './world.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE } from './input.js';
import { CONTROLS_TEXT } from './config.js';
import { stageShot } from './shots.js';

// Frame terpanjang yang dikejar loop; jeda yang lebih panjang dibuang.
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

// DOM yang dimiliki kode boot: canvas, layar, tombol, baris status.
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const hudEl = document.getElementById('hud');
const titleScreen = document.getElementById('title-screen');
const pauseScreen = document.getElementById('pause-screen');
const bustedScreen = document.getElementById('busted-screen');
const bustedText = document.getElementById('busted-text');
const startButton = document.getElementById('start-button');
const resumeButton = document.getElementById('resume-button');
const continueButton = document.getElementById('continue-button');
const controlsEl = document.getElementById('controls-line');
const saveLine = document.getElementById('save-line');

const game = createWorld(canvas, seed);
const { world } = game;
// Pegangan debug: play-test bisa membaca posisi dan status dari konsol.
window.__kotaRaya = game;

// Tampilkan tepat satu layar; HUD hanya hidup di layar bermain.
function showOnly(screen) {
  titleScreen.style.display = screen === 'title' ? 'flex' : 'none';
  pauseScreen.style.display = screen === 'paused' ? 'flex' : 'none';
  bustedScreen.style.display = screen === 'busted' ? 'flex' : 'none';
  hudEl.style.display = screen === 'play' ? 'block' : 'none';
}

function announce(message) {
  status.textContent = message;
}

// Gelar satu adegan screenshot, gambar, lalu beri sinyal siap.
function runShot(name) {
  const screen = stageShot(name, game);
  showOnly(screen);
  announce(`Kota Raya, screenshot scene ${name}.`);
  // Gambar sekali lagi supaya HUD dan frame menetap, lalu beri sinyal siap.
  requestAnimationFrame(() => {
    game.renderFrame(STEP_SECONDS);
    window.__shotReady = true;
  });
}

function runGame() {
  const input = createInput();
  let screen = 'title';
  let accumulator = 0;
  let last = performance.now();
  let orbitTime = 0;

  // Teks layar judul, termasuk baris save saat ada progres.
  controlsEl.textContent = CONTROLS_TEXT;
  const savedCash = world.cash;
  const hasProgress = savedCash > 0 || world.missions.index > 0 || world.storyDone;
  const savedMission = world.missions.index + 1;
  saveLine.textContent = hasProgress
    ? `Save ditemukan: Rp ${savedCash}rb · misi ${world.storyDone ? 'selesai' : savedMission} dari 4`
    : 'Tidak ada save — cerita baru dimulai.';
  startButton.textContent = hasProgress ? 'LANJUTKAN' : 'MULAI';
  showOnly('title');
  announce('Kota Raya. Tekan Enter atau klik Mulai.');

  function startGame() {
    game.audio.unlock();
    screen = 'play';
    showOnly('play');
    announce('Bermain. Ikuti objektif di kiri atas.');
  }

  function pauseGame() {
    screen = 'paused';
    showOnly('paused');
    announce('Jeda.');
  }

  function resumeGame() {
    screen = 'play';
    showOnly('play');
    announce('Lanjut bermain.');
  }

  function bustGame() {
    screen = 'busted';
    bustedText.textContent = `Polisi menangkapmu! Kamu kehilangan sebagian uangmu. Uang sekarang: Rp ${world.cash}rb.`;
    showOnly('busted');
    announce('Ketangkap! Tekan Enter untuk lanjut.');
  }

  // Arti Enter bergantung pada layar tempat ia ditekan.
  function confirmPressed() {
    if (screen === 'title') {
      startGame();
    } else if (screen === 'paused') {
      resumeGame();
    } else if (screen === 'busted') {
      world.busted = false;
      screen = 'play';
      showOnly('play');
      announce('Lanjut bermain.');
    } else if (screen === 'play') {
      const missions = world.missions;
      if (missions.failed) {
        missions.retry();
        world.toast('Misi diulang dari awal.');
      } else if (!missions.active && !missions.done) {
        missions.startMission(missions.index);
      }
    }
  }

  function handleActions(actions) {
    if (actions & ACTION_PAUSE) {
      if (screen === 'play') pauseGame();
      else if (screen === 'paused') resumeGame();
    }
    if (actions & ACTION_CONFIRM) confirmPressed();
    return actions;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === 'title') {
      orbitTime += dt;
      game.stepAmbient(dt);
      game.renderer3.orbit(orbitTime);
      game.renderer3.render();
      accumulator = 0;
    } else if (screen === 'play') {
      accumulator += dt;
      let first = true;
      while (accumulator >= STEP_SECONDS) {
        const result = game.step(STEP_SECONDS, input, first ? actions : 0);
        accumulator -= STEP_SECONDS;
        first = false;
        if (result === 'busted') {
          bustGame();
          break;
        }
      }
      if (screen === 'play') game.renderFrame(dt);
    } else {
      accumulator = 0;
      game.renderFrame(dt);
    }
  }

  startButton.addEventListener('click', () => {
    if (screen === 'title') startGame();
  });
  resumeButton.addEventListener('click', resumeGame);
  continueButton.addEventListener('click', () => {
    world.busted = false;
    screen = 'play';
    showOnly('play');
  });
  canvas.addEventListener('click', () => {
    game.audio.unlock();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') pauseGame();
  });

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
