// Kota Raya — procedural sound through WebAudio. There are no audio files:
// the engine hum, the two-tone siren, the punch thud, pickup blips and
// jingles are all synthesised, so the game ships zero audio assets and makes
// zero network requests.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenHigh = false;
  let sirenClock = 0;
  let muted = false;
  let ambienceOn = false;

  // Lazily build the audio graph on the first user gesture.
  function ensureContext() {
    if (ctx) return true;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return false;
      ctx = new AudioCtor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  // A quiet looped low-passed noise bed: city ambience.
  function startAmbience() {
    if (ambienceOn || !ctx) return;
    ambienceOn = true;
    const frames = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) samples[i] = (Math.random() * 2 - 1) * 0.25;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 320;
    const level = ctx.createGain();
    level.gain.value = 0.05;
    source.connect(lowpass);
    lowpass.connect(level);
    level.connect(master);
    source.start();
  }

  // One short oscillator note, optionally sliding to another pitch.
  function blip(freq, dur, type, vol, delay = 0, slideTo = 0) {
    if (!ctx) return;
    const startAt = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, startAt + dur);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0, startAt);
    envelope.gain.linearRampToValueAtTime(vol, startAt + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
    osc.connect(envelope);
    envelope.connect(master);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.05);
  }

  // A short burst of filtered noise (impacts, thuds).
  function burst(dur, vol, cutoff) {
    if (!ctx) return;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) samples[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = cutoff;
    const level = ctx.createGain();
    level.gain.value = vol;
    source.connect(lowpass);
    lowpass.connect(level);
    level.connect(master);
    source.start();
  }

  return {
    unlock() {
      if (!ensureContext()) return;
      if (ctx.state === 'suspended') ctx.resume();
      startAmbience();
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    engineStart() {
      if (!ensureContext() || engineOsc) return;
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      engineOsc.connect(lowpass);
      lowpass.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    },
    engineSet(speed01, on) {
      if (!engineOsc || !engineGain) return;
      const now = ctx.currentTime;
      engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, now, 0.08);
      engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.06 : 0, now, 0.1);
    },
    siren(on) {
      if (!ensureContext()) return;
      if (on && !sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'square';
        sirenOsc.frequency.value = 660;
        const level = ctx.createGain();
        level.gain.value = 0.035;
        sirenOsc.connect(level);
        level.connect(master);
        sirenOsc.start();
      } else if (!on && sirenOsc) {
        try {
          sirenOsc.stop();
        } catch {
          // Already stopped.
        }
        sirenOsc = null;
      }
    },
    sirenTick(dt) {
      if (!sirenOsc) return;
      sirenClock += dt;
      if (sirenClock <= 0.45) return;
      sirenClock = 0;
      sirenHigh = !sirenHigh;
      sirenOsc.frequency.setTargetAtTime(sirenHigh ? 880 : 660, ctx.currentTime, 0.02);
    },
    punch() {
      burst(0.12, 0.5, 900);
    },
    thud() {
      burst(0.18, 0.4, 300);
      blip(70, 0.18, 'sine', 0.4);
    },
    pickup() {
      blip(660, 0.09, 'sine', 0.3);
      blip(880, 0.12, 'sine', 0.3, 0.09);
    },
    denied() {
      blip(160, 0.16, 'square', 0.2, 0, 110);
    },
    jingle() {
      blip(523, 0.14, 'triangle', 0.35);
      blip(659, 0.14, 'triangle', 0.35, 0.13);
      blip(784, 0.22, 'triangle', 0.35, 0.26);
      blip(1047, 0.3, 'triangle', 0.3, 0.4);
    },
    busted() {
      blip(392, 0.2, 'square', 0.25);
      blip(311, 0.2, 'square', 0.25, 0.2);
      blip(233, 0.4, 'square', 0.25, 0.4);
    },
  };
}
