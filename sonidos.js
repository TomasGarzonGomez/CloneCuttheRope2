const Sonidos = (function () {
  let ctx = null;
  let mutado = false;

  function obtenerContexto() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function desbloquear() {
    const ac = obtenerContexto();
    if (ac && ac.state === 'suspended') {
      ac.resume().catch(() => {});
    }
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach((evt) => {
      window.addEventListener(evt, desbloquear, { passive: true });
    });
  }

  function corte() {
    if (mutado) return;
    const ac = obtenerContexto();
    if (!ac || ac.state !== 'running') return;

    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  function estrella(numero = 1) {
    if (mutado) return;
    const ac = obtenerContexto();
    if (!ac || ac.state !== 'running') return;

    const baseFreqs = [523.25, 659.25, 783.99, 1046.50];
    const freq = baseFreqs[Math.min(numero - 1, baseFreqs.length - 1)] || 600;

    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.22);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  function burbujaEntrar() {
    if (mutado) return;
    const ac = obtenerContexto();
    if (!ac || ac.state !== 'running') return;

    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.14);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  function burbujaPop() {
    if (mutado) return;
    const ac = obtenerContexto();
    if (!ac || ac.state !== 'running') return;

    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.07);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  function soplido() {
    if (mutado) return;
    const ac = obtenerContexto();
    if (!ac || ac.state !== 'running') return;

    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.13);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  function bebeCome() {
    if (mutado) return;
    const ac = obtenerContexto();
    if (!ac || ac.state !== 'running') return;

    const t = ac.currentTime;
    [440, 550, 660, 880].forEach((f, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const st = t + i * 0.07;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, st);
      gain.gain.setValueAtTime(0.18, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.1);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(st);
      osc.stop(st + 0.1);
    });
  }

  function nivelGanado() {
    if (mutado) return;
    const ac = obtenerContexto();
    if (!ac || ac.state !== 'running') return;

    const t = ac.currentTime;
    const notas = [523.25, 659.25, 783.99, 1046.50];
    notas.forEach((freq, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const st = t + idx * 0.11;
      const dur = idx === notas.length - 1 ? 0.5 : 0.18;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.24, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + dur);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(st);
      osc.stop(st + dur);
    });
  }

  function perder() {
    if (mutado) return;
    const ac = obtenerContexto();
    if (!ac || ac.state !== 'running') return;

    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(360, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.35);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  function golpePeligro() {
    if (mutado) return;
    const ac = obtenerContexto();
    if (!ac || ac.state !== 'running') return;

    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.22);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  function boton() {
    if (mutado) return;
    const ac = obtenerContexto();
    if (!ac || ac.state !== 'running') return;

    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);

    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  function alternarMute() {
    mutado = !mutado;
    return mutado;
  }

  return {
    corte,
    estrella,
    burbujaEntrar,
    burbujaPop,
    soplido,
    bebeCome,
    nivelGanado,
    perder,
    golpePeligro,
    boton,
    alternarMute,
    desbloquear,
    estaMutado: () => mutado,
    iniciar: desbloquear,
  };
})();
