// Kota Raya — renderer WebGL dan kamera kejar.
// Mode shot "start" memakai sudut pandang sinematik dari atas kota.
export function createRenderer(world) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  document.getElementById('game-canvas').appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(0, 7.5, 21);
  world.scene = new THREE.Scene();
  world.scene.background = new THREE.Color(0x87b5d6);
  world.scene.fog = new THREE.Fog(0x9fc3dd, 120, 420);
  const hemi = new THREE.HemisphereLight(0xdfefff, 0x4a6b3a, 0.95);
  const sun = new THREE.DirectionalLight(0xfff2cf, 1.1);
  sun.position.set(120, 180, 60);
  world.scene.add(hemi, sun);
  world.camera = camera;
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  return renderer;
}

export function updateCamera(world, dt) {
  const cam = world.camera;
  const p = world.player;
  if (world.shotMode === 'start') {
    cam.position.set(70, 90, 130);
    cam.lookAt(0, 0, 0);
    return;
  }
  const back = 13;
  const height = 7.5;
  const tx = p.x - Math.sin(p.heading) * back;
  const tz = p.z - Math.cos(p.heading) * back;
  const k = 1 - Math.pow(0.001, dt);
  cam.position.x += (tx - cam.position.x) * k;
  cam.position.y += (height - cam.position.y) * k;
  cam.position.z += (tz - cam.position.z) * k;
  cam.lookAt(p.x + Math.sin(p.heading) * 6, 1.5, p.z + Math.cos(p.heading) * 6);
}
