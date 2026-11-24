// Kota Raya — input keyboard (WASD + E + Enter, plus panah).
// `pressed` hanya hidup satu frame; main loop memanggil endFrame() tiap putaran.
export function createInput() {
  const keys = new Set();
  const pressed = new Set();
  const watched = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

  window.addEventListener('keydown', (e) => {
    if (watched.includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  const input = {
    auto: { forward: false },
    forward() {
      return keys.has('KeyW') || keys.has('ArrowUp') || input.auto.forward;
    },
    back() {
      return keys.has('KeyS') || keys.has('ArrowDown');
    },
    left() {
      return keys.has('KeyA') || keys.has('ArrowLeft');
    },
    right() {
      return keys.has('KeyD') || keys.has('ArrowRight');
    },
    consume(code) {
      if (pressed.has(code)) {
        pressed.delete(code);
        return true;
      }
      return false;
    },
    endFrame() {
      pressed.clear();
    },
  };
  return input;
}
