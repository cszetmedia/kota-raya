// Kota Raya — keyboard input.
//
// Held keys steer and drive; one-shot presses (get in a car, punch, pause,
// mute, confirm) are latched as flags and collected once by the game loop,
// so a press that lands between two frames is never lost or counted twice.
export const ACTION_ENTER = 1;
export const ACTION_PUNCH = 2;
export const ACTION_PAUSE = 4;
export const ACTION_MUTE = 8;
export const ACTION_CONFIRM = 16;

// Which physical keys count as each direction. Both WASD and arrows work.
const KEY_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  brake: ['Space'],
};

// One-shot keys and the flag each one raises.
const PRESS_ACTIONS = {
  KeyE: ACTION_ENTER,
  KeyF: ACTION_PUNCH,
  Escape: ACTION_PAUSE,
  KeyP: ACTION_PAUSE,
  KeyM: ACTION_MUTE,
  Enter: ACTION_CONFIRM,
};

// Keys whose default browser behaviour (page scroll) must be stopped.
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
    // -1 for back, +1 for forward, 0 when neither (or both) are held.
    throttle() {
      return (anyHeld(KEY_BINDINGS.forward) ? 1 : 0) - (anyHeld(KEY_BINDINGS.back) ? 1 : 0);
    },
    // -1 for left, +1 for right, 0 when neither (or both) are held.
    steer() {
      return (anyHeld(KEY_BINDINGS.right) ? 1 : 0) - (anyHeld(KEY_BINDINGS.left) ? 1 : 0);
    },
    sprint() {
      return anyHeld(KEY_BINDINGS.sprint);
    },
    brake() {
      return anyHeld(KEY_BINDINGS.brake);
    },
    // The one-shot presses since the last call, as ACTION_* flags.
    takeActions() {
      const taken = queued;
      queued = 0;
      return taken;
    },
  };
}
