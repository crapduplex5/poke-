// Poke∞ — menú de inicio
(() => {
  "use strict";

  // ---------- Ajustes (se guardan en el navegador) ----------
  const DEFAULTS = { music: 60, sfx: 70, fps: false };
  const settings = loadSettings();

  function loadSettings() {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("pokeinf.settings") || "{}") };
    } catch {
      return { ...DEFAULTS };
    }
  }
  function saveSettings() {
    try { localStorage.setItem("pokeinf.settings", JSON.stringify(settings)); } catch {}
  }

  // ---------- Sonido (sintetizado, sin archivos) ----------
  let audio = null;
  let musicGain = null;

  function initAudio() {
    if (audio) return;
    audio = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = audio.createGain();
    musicGain.connect(audio.destination);
    applyMusicVolume();
    startMusic();
  }

  function applyMusicVolume() {
    if (musicGain) musicGain.gain.value = (settings.music / 100) * 0.08;
  }

  function blip(freq, dur = 0.07, type = "square") {
    if (!audio || settings.sfx === 0) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime((settings.sfx / 100) * 0.15, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + dur);
  }
  const sfx = {
    move: () => blip(660),
    select: () => { blip(880); setTimeout(() => blip(1320, 0.1), 70); },
    back: () => blip(330, 0.1),
  };

  // Arpegio en bucle, misterioso, estilo grieta
  function startMusic() {
    const notes = [220, 261.6, 329.6, 392, 329.6, 261.6, 196, 246.9];
    let i = 0;
    setInterval(() => {
      if (settings.music === 0 || audio.state !== "running") return;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "triangle";
      osc.frequency.value = notes[i++ % notes.length];
      gain.gain.setValueAtTime(1, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.45);
      osc.connect(gain).connect(musicGain);
      osc.start();
      osc.stop(audio.currentTime + 0.5);
    }, 280);
  }

  // ---------- Pantallas y navegación ----------
  const screens = {
    title: document.getElementById("screen-title"),
    options: document.getElementById("screen-options"),
    credits: document.getElementById("screen-credits"),
    play: document.getElementById("screen-play"),
    upgrades: document.getElementById("screen-upgrades"),
    gacha: document.getElementById("screen-gacha"),
  };
  let current = "title";
  let selected = 0;

  function show(name) {
    screens[current].classList.remove("active");
    screens[name].classList.add("active");
    current = name;
    selected = 0;
    highlight();
  }

  function buttons() {
    return [...screens[current].querySelectorAll(".menu-btn")];
  }

  function highlight() {
    const list = buttons();
    list.forEach((b, i) => b.classList.toggle("selected", i === selected));
    // Mantener el foco en el botón resaltado para que no haya dos marcados
    const active = list[selected];
    if (active && document.activeElement !== active) active.focus({ preventScroll: true });
  }

  function act(action) {
    initAudio();
    if (action === "back") { sfx.back(); show("title"); return; }
    sfx.select();
    show(action);
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".menu-btn");
    if (btn) act(btn.dataset.action);
  });

  document.addEventListener("mouseover", (e) => {
    const btn = e.target.closest(".menu-btn");
    if (!btn) return;
    const i = buttons().indexOf(btn);
    if (i !== -1 && i !== selected) {
      selected = i;
      highlight();
      sfx.move();
    }
  });

  document.addEventListener("keydown", (e) => {
    // No robar las flechas a los sliders de opciones
    if (e.target.matches("input")) return;
    const list = buttons();
    if (e.key === "ArrowDown" || e.key === "s") {
      initAudio();
      selected = (selected + 1) % list.length;
      highlight(); sfx.move(); e.preventDefault();
    } else if (e.key === "ArrowUp" || e.key === "w") {
      initAudio();
      selected = (selected - 1 + list.length) % list.length;
      highlight(); sfx.move(); e.preventDefault();
    } else if (e.key === "Enter" || e.key === " ") {
      act(list[selected].dataset.action);
      e.preventDefault();
    } else if (e.key === "Escape" && current !== "title") {
      act("back");
    }
  });

  // ---------- Monedas y tickets (progreso entre partidas) ----------
  const SAVE_KEY = "pokeinf.save";
  const save = loadSave();

  function loadSave() {
    try {
      return { coins: 0, tickets: 0, ...JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") };
    } catch {
      return { coins: 0, tickets: 0 };
    }
  }
  function renderWallet() {
    document.getElementById("coins").textContent = save.coins;
    document.getElementById("tickets").textContent = save.tickets;
  }
  renderWallet();

  // ---------- Opciones ----------
  const $ = (id) => document.getElementById(id);
  function bindRange(key) {
    const input = $("opt-" + key);
    const out = $("out-" + key);
    input.value = settings[key];
    out.textContent = settings[key];
    input.addEventListener("input", () => {
      settings[key] = Number(input.value);
      out.textContent = input.value;
      if (key === "music") applyMusicVolume();
      if (key === "sfx") sfx.move();
      saveSettings();
    });
  }
  bindRange("music");
  bindRange("sfx");

  const fsBox = $("opt-fullscreen");
  fsBox.addEventListener("change", () => {
    if (fsBox.checked) document.documentElement.requestFullscreen?.().catch(() => (fsBox.checked = false));
    else if (document.fullscreenElement) document.exitFullscreen();
  });
  document.addEventListener("fullscreenchange", () => (fsBox.checked = !!document.fullscreenElement));

  const fpsBox = $("opt-fps");
  const fpsEl = $("fps");
  fpsBox.checked = settings.fps;
  fpsEl.hidden = !settings.fps;
  fpsBox.addEventListener("change", () => {
    settings.fps = fpsBox.checked;
    fpsEl.hidden = !settings.fps;
    saveSettings();
  });

  // ---------- Fondo animado ----------
  const canvas = $("bg");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0;
  const stars = [];
  const orbs = [];
  const rifts = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    stars.length = orbs.length = rifts.length = 0;
    const n = Math.floor((W * H) / 5000);
    for (let i = 0; i < n; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * 0.8 + 0.2 });
    }
    // Orbes de energía que flotan (sustituyen a los sprites por ahora)
    const colors = ["#b14cff", "#4cd9ff", "#ffd84c", "#ff5c8a", "#5cff9d"];
    for (let i = 0; i < 14; i++) {
      orbs.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 6 + 4,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        c: colors[i % colors.length], p: Math.random() * Math.PI * 2,
      });
    }
    // Grietas: líneas quebradas que laten
    for (let i = 0; i < 3; i++) rifts.push(makeRift());
  }

  function makeRift() {
    const cx = Math.random() * W;
    const cy = Math.random() * H;
    const len = 60 + Math.random() * 90;
    const pts = [];
    const segs = 7;
    const ang = Math.random() * Math.PI;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs - 0.5;
      pts.push({
        x: cx + Math.cos(ang) * len * t + (Math.random() - 0.5) * 18,
        y: cy + Math.sin(ang) * len * t + (Math.random() - 0.5) * 18,
      });
    }
    return { pts, life: 0, max: 400 + Math.random() * 300 };
  }

  let last = performance.now();
  let frames = 0, fpsTime = 0;

  function frame(now) {
    const dt = Math.min((now - last) / 16.67, 3);
    last = now;

    // Fondo con degradado
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, "#1d0f3a");
    g.addColorStop(1, "#0b0716");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Estrellas que caen lentamente (sensación de avance)
    for (const s of stars) {
      s.y += s.z * 0.5 * dt;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
      ctx.fillStyle = `rgba(244,236,255,${s.z})`;
      ctx.fillRect(s.x, s.y, s.z * 2, s.z * 2);
    }

    // Grietas
    for (let i = 0; i < rifts.length; i++) {
      const r = rifts[i];
      r.life += dt;
      const t = r.life / r.max;
      const alpha = Math.sin(t * Math.PI);
      ctx.save();
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowBlur = 24;
      ctx.shadowColor = "#b14cff";
      ctx.strokeStyle = `rgba(214,150,255,${alpha * 0.9})`;
      ctx.beginPath();
      r.pts.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      ctx.restore();
      if (r.life >= r.max) rifts[i] = makeRift();
    }

    // Orbes
    for (const o of orbs) {
      o.x += o.vx * dt; o.y += o.vy * dt; o.p += 0.03 * dt;
      if (o.x < -20) o.x = W + 20; if (o.x > W + 20) o.x = -20;
      if (o.y < -20) o.y = H + 20; if (o.y > H + 20) o.y = -20;
      const rr = o.r + Math.sin(o.p) * 1.5;
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = o.c;
      ctx.fillStyle = o.c;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(o.x, o.y, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // FPS
    frames++; fpsTime += now - (frame.prev || now); frame.prev = now;
    if (fpsTime >= 500) {
      fpsEl.textContent = Math.round((frames * 1000) / fpsTime) + " FPS";
      frames = 0; fpsTime = 0;
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", () => { resize(); seed(); });
  resize();
  seed();
  highlight();
  requestAnimationFrame(frame);
})();
