// Kota Raya — input keyboard.
//
// Tombol yang ditahan mengemudikan dan menyetir; tekanan sekali (masuk
// mobil, pukul, jeda, bisu, konfirmasi) dikunci sebagai flag dan diambil
// sekali oleh loop game, sehingga tekanan yang jatuh di antara dua frame
// tidak pernah hilang atau terhitung dua kali.
export const ACTION_ENTER = 1;
export const ACTION_PUNCH = 2;
export const ACTION_PAUSE = 4;
export const ACTION_MUTE = 8;
export const ACTION_CONFIRM = 16;

// Tombol fisik untuk tiap arah. WASD dan tombol panah sama-sama bisa.
const KEY_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  brake: ['Space'],
};

// Tombol sekali-tekan dan flag yang dinaikkan masing-masing.
const PRESS_ACTIONS = {
  KeyE: ACTION_ENTER,
  KeyF: ACTION_PUNCH,
  Escape: ACTION_PAUSE,
  KeyP: ACTION_PAUSE,
  KeyM: ACTION_MUTE,
  Enter: ACTION_CONFIRM,
};

// Tombol yang perilaku default browser-nya (scroll halaman) harus dicegah.
const SCROLL_KEYS = new Set([...KEY_BINDINGS.forward, ...KEY_BINDINGS.back, ...KEY_BINDINGS.brake]);

export function createInput() {
  const held = new Set();
  let queued = 0;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    const flag = PRESS_ACTIONS[event.code];
    if (flag !== undefined) queued |= flag;
    if (SCROLL_KEYS.has(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
  });

  const anyHeld = (codes) => codes.some((code) => held.has(code));

  return {
    // -1 untuk mundur, +1 untuk maju, 0 bila tidak ada (atau keduanya) ditekan.
    throttle() {
      return (anyHeld(KEY_BINDINGS.forward) ? 1 : 0) - (anyHeld(KEY_BINDINGS.back) ? 1 : 0);
    },
    // -1 untuk kiri, +1 untuk kanan, 0 bila tidak ada (atau keduanya) ditekan.
    steer() {
      return (anyHeld(KEY_BINDINGS.right) ? 1 : 0) - (anyHeld(KEY_BINDINGS.left) ? 1 : 0);
    },
    sprint() {
      return anyHeld(KEY_BINDINGS.sprint);
    },
    brake() {
      return anyHeld(KEY_BINDINGS.brake);
    },
    // Tekanan sekali yang terkumpul sejak pemanggilan terakhir, sebagai flag ACTION_*.
    takeActions() {
      const taken = queued;
      queued = 0;
      return taken;
    },
  };
}
