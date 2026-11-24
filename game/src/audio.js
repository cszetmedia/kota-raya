// Kota Raya — suara WebAudio: dengung mesin, lonceng misi, sirene polisi.
// Semua panggilan dibungkus try/catch: bila AudioContext tidak ada, game tetap jalan.
export function createAudio() {
  const a = { ctx: null, engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null, sirenHigh: false, sirenNext: 0 };

  a.ensure = () => {
    try {
      if (!a.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        a.ctx = new AC();
        a.engineOsc = a.ctx.createOscillator();
        a.engineOsc.type = 'sawtooth';
        a.engineOsc.frequency.value = 55;
        a.engineGain = a.ctx.createGain();
        a.engineGain.gain.value = 0;
        a.engineOsc.connect(a.engineGain);
        a.engineGain.connect(a.ctx.destination);
        a.engineOsc.start();
        a.sirenOsc = a.ctx.createOscillator();
        a.sirenOsc.type = 'square';
        a.sirenOsc.frequency.value = 720;
        a.sirenGain = a.ctx.createGain();
        a.sirenGain.gain.value = 0;
        a.sirenOsc.connect(a.sirenGain);
        a.sirenGain.connect(a.ctx.destination);
        a.sirenOsc.start();
      }
      if (a.ctx.state === 'suspended') a.ctx.resume().catch(() => {});
    } catch (e) {
      /* audio tidak tersedia */
    }
  };

  a.engine = (level) => {
    try {
      if (!a.ctx || !a.engineOsc) return;
      a.engineOsc.frequency.value = 55 + level * 95;
      a.engineGain.gain.value = level > 0.02 ? 0.015 + level * 0.02 : 0;
    } catch (e) {
      /* abaikan */
    }
  };

  a.chime = () => {
    try {
      if (!a.ctx) return;
      const t = a.ctx.currentTime;
      [660, 880].forEach((f, i) => {
        const o = a.ctx.createOscillator();
        const g = a.ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        o.connect(g);
        g.connect(a.ctx.destination);
        g.gain.setValueAtTime(0.08, t + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.25);
        o.start(t + i * 0.12);
        o.stop(t + i * 0.12 + 0.3);
      });
    } catch (e) {
      /* abaikan */
    }
  };

  // Sirene dua nada; pergantian nada berbasis waktu (0,45 detik), bukan frame.
  a.siren = (on) => {
    try {
      if (!a.ctx || !a.sirenOsc) return;
      a.sirenGain.gain.value = on ? 0.02 : 0;
      if (on) {
        const now = a.ctx.currentTime;
        if (!a.sirenNext || now >= a.sirenNext) {
          a.sirenHigh = !a.sirenHigh;
          a.sirenOsc.frequency.value = a.sirenHigh ? 950 : 700;
          a.sirenNext = now + 0.45;
        }
      }
    } catch (e) {
      /* abaikan */
    }
  };

  return a;
}
