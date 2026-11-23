// Kota Raya — renderer three.js: langit tropis, matahari hangat dengan
// bayangan, kabut, dan kamera third-person yang diperhalus, mengikuti
// pemain saat berjalan kaki dan menarik ke belakang mobil saat menyetir.
import { TROPIC } from './config.js';

export function createRenderer3(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(TROPIC.skyBottom);
  scene.fog = new THREE.Fog(TROPIC.fogColor, TROPIC.fogNear, TROPIC.fogFar);

  // Kubah langit bergradien, biru tua di atas memudar ke kabut pucat.
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 4;
  skyCanvas.height = 256;
  const sg = skyCanvas.getContext('2d');
  const grad = sg.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#2f7fd0');
  grad.addColorStop(0.55, '#7cc0e8');
  grad.addColorStop(0.8, '#bfe6f2');
  grad.addColorStop(1, '#e8f4f8');
  sg.fillStyle = grad;
  sg.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(800, 16, 12),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);

  // Matahari sore, dengan kamera bayangan lebar menutupi seluruh kota.
  const sun = new THREE.DirectionalLight(TROPIC.sunColor, TROPIC.sunIntensity);
  sun.position.set(140, 220, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 700;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(TROPIC.hemiSky, TROPIC.hemiGround, 0.75));

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1600);
  camera.position.set(0, 40, -60);

  const camState = {
    yaw: 0,
    pitch: 0.32,
    dist: 11,
    pos: new THREE.Vector3(0, 40, -60),
    look: new THREE.Vector3(),
  };

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // Haluskan yaw kamera menuju arah target, lewat jalan terpendek.
  function easeYaw(target, dt, rate) {
    let dy = target - camState.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    camState.yaw += dy * Math.min(1, dt * rate);
  }

  // Kamera ikuti yang diperhalus. `target` adalah {x, z, heading, speed};
  // menyetir menarik kamera lebih jauh ke belakang dan sedikit lebih tinggi.
  function follow(target, inCar, dt) {
    easeYaw(target.heading, dt, inCar ? 2.2 : 3.5);
    const dist = inCar ? 14 : 10;
    const height = inCar ? 5.6 : 4.6;
    const tx = target.x - Math.sin(camState.yaw) * dist;
    const tz = target.z - Math.cos(camState.yaw) * dist;
    const k = 1 - Math.exp(-dt * 7);
    camState.pos.x += (tx - camState.pos.x) * k;
    camState.pos.y += (height - camState.pos.y) * k;
    camState.pos.z += (tz - camState.pos.z) * k;
    camState.look.x += (target.x + Math.sin(target.heading) * 4 - camState.look.x) * k;
    camState.look.y += (1.6 - camState.look.y) * k;
    camState.look.z += (target.z + Math.cos(target.heading) * 4 - camState.look.z) * k;
    camera.position.copy(camState.pos);
    camera.lookAt(camState.look);
  }

  // Jepret kamera langsung ke belakang target (dipakai menata screenshot).
  function snap(target, inCar) {
    camState.yaw = target.heading;
    const dist = inCar ? 14 : 10;
    const height = inCar ? 5.6 : 4.6;
    camState.pos.set(
      target.x - Math.sin(camState.yaw) * dist,
      height,
      target.z - Math.cos(camState.yaw) * dist,
    );
    camState.look.set(
      target.x + Math.sin(target.heading) * 4,
      1.6,
      target.z + Math.cos(target.heading) * 4,
    );
    camera.position.copy(camState.pos);
    camera.lookAt(camState.look);
  }

  // Kamera sinematik untuk layar judul: orbit pelan di atas pusat kota.
  function orbit(time) {
    const a = time * 0.05;
    camera.position.set(Math.sin(a) * 170, 90, Math.cos(a) * 170 - 20);
    camera.lookAt(0, 12, 0);
  }

  function render() {
    renderer.render(scene, camera);
  }

  return { scene, camera, follow, snap, orbit, render, resize, camState };
}
