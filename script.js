// ══════════════════════════════════════════
//  AUDIO ENGINE (Web Audio API — no files)
// ══════════════════════════════════════════
let selfieMode = false;
const AC = new (window.AudioContext || window.webkitAudioContext)();

function playSlice() {
  const g = AC.createGain();
  g.gain.setValueAtTime(0.4, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.18);
  const o = AC.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(800, AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(200, AC.currentTime + 0.18);
  o.connect(g);
  g.connect(AC.destination);
  o.start();
  o.stop(AC.currentTime + 0.18);

  // whoosh noise layer
  const buf = AC.createBuffer(1, AC.sampleRate * 0.15, AC.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++)
    d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = AC.createBufferSource();
  src.buffer = buf;
  const f = AC.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 2000;
  f.Q.value = 0.5;
  const g2 = AC.createGain();
  g2.gain.setValueAtTime(0.3, AC.currentTime);
  src.connect(f);
  f.connect(g2);
  g2.connect(AC.destination);
  src.start();
}

function playMiss() {
  const g = AC.createGain();
  g.gain.setValueAtTime(0.5, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.4);
  const o = AC.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(300, AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(80, AC.currentTime + 0.4);
  o.connect(g);
  g.connect(AC.destination);
  o.start();
  o.stop(AC.currentTime + 0.4);
}

function playBomb() {
  // low thud + noise burst
  for (let i = 0; i < 3; i++) {
    const t = AC.currentTime + i * 0.04;
    const g = AC.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    const o = AC.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(120 - i * 20, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    o.connect(g);
    g.connect(AC.destination);
    o.start(t);
    o.stop(t + 0.3);
  }
  const buf = AC.createBuffer(1, AC.sampleRate * 0.25, AC.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++)
    d[i] = (Math.random() * 2 - 1) * Math.exp((-i / d.length) * 8);
  const src = AC.createBufferSource();
  src.buffer = buf;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.7, AC.currentTime);
  src.connect(g);
  g.connect(AC.destination);
  src.start();
}

function playCombo(n) {
  const notes = [523, 659, 784, 1047, 1319];
  notes.slice(0, Math.min(n, 5)).forEach((freq, i) => {
    const t = AC.currentTime + i * 0.08;
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.frequency.value = freq;
    o.type = "triangle";
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g);
    g.connect(AC.destination);
    o.start(t);
    o.stop(t + 0.25);
  });
}

// ══════════════════════════════════════════
//  CANVAS + GAME SETUP
// ══════════════════════════════════════════
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const W = (canvas.width = 1280);
const H = (canvas.height = 720);

// Fruit configs
const FRUITS = [
  { label: "🍉", color: "#1a7a1a", inner: "#ff4757", r: 45 },
  { label: "🍊", color: "#e67e22", inner: "#f39c12", r: 38 },
  { label: "🍎", color: "#c0392b", inner: "#e74c3c", r: 35 },
  { label: "🍋", color: "#f1c40f", inner: "#f9e04b", r: 30 },
  { label: "🍇", color: "#8e44ad", inner: "#9b59b6", r: 28 },
  { label: "🥝", color: "#27ae60", inner: "#2ecc71", r: 33 },
];

// ── Trail ──
const TRAIL_MAX = 22;
let trail = [];

// ── Particles ──
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    const a = Math.random() * Math.PI * 2;
    const s = 3 + Math.random() * 8;
    this.vx = Math.cos(a) * s;
    this.vy = Math.sin(a) * s - 2;
    this.r = 3 + Math.random() * 4;
    this.color = color;
    this.life = 1;
    this.alive = true;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.35;
    this.life -= 0.055;
    if (this.life <= 0) this.alive = false;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Popup text ──
class Popup {
  constructor(x, y, text, color, size = 28) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = 1;
    this.alive = true;
  }
  update() {
    this.y -= 1.8;
    this.life -= 0.025;
    if (this.life <= 0) this.alive = false;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.font = `900 ${this.size}px Nunito`;
    ctx.fillStyle = this.color;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,.6)";
    ctx.shadowBlur = 8;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// ── Fruit ──
class Fruit {
  constructor() {
    const cfg = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    this.cfg = cfg;
    this.r = cfg.r;
    this.x = this.r + 80 + Math.random() * (W - this.r * 2 - 160);
    this.y = H + this.r + 10;
    const spd = 14 + Math.random() * 8;
    const ang = (Math.random() - 0.5) * 0.8;
    this.vx = spd * Math.sin(ang);
    this.vy = -spd;
    this.g = 0.45;
    this.rot = Math.random() * 360;
    this.rotS = (Math.random() - 0.5) * 6;
    this.alive = true;
    this.sliced = false;
    // halves
    this.h = [
      { x: this.x, y: this.y, vx: this.vx - 5, vy: this.vy - 2 },
      { x: this.x, y: this.y, vx: this.vx + 5, vy: this.vy - 2 },
    ];
  }
  update() {
    if (this.sliced) {
      this.h.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += this.g;
      });
      if (this.h[0].y > H + 80 && this.h[1].y > H + 80) this.alive = false;
    } else {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.g;
      this.rot += this.rotS;
      if (this.y > H + this.r + 20) this.alive = false;
    }
  }
  doSlice() {
    this.sliced = true;
    this.h[0].x = this.h[1].x = this.x;
    this.h[0].y = this.h[1].y = this.y;
  }
  draw() {
    if (this.sliced) {
      this.h.forEach((p, i) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((i === 0 ? -1 : 1) * 0.4);
        this._drawHalf(i);
        ctx.restore();
      });
    } else {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rot * Math.PI) / 180);
      this._drawFull();
      ctx.restore();
    }
  }
  _drawFull() {
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.cfg.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
    // shine
    ctx.beginPath();
    ctx.arc(-this.r * 0.3, -this.r * 0.3, this.r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.fill();
    // emoji label
    ctx.font = `${this.r * 1.1}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.cfg.label, 0, 2);
  }
  _drawHalf(i) {
    ctx.beginPath();
    ctx.arc(
      0,
      0,
      this.r,
      i === 0 ? Math.PI : 0,
      i === 0 ? Math.PI * 2 : Math.PI
    );
    ctx.fillStyle = this.cfg.inner;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // juice line
    ctx.beginPath();
    ctx.moveTo(i === 0 ? this.r : -this.r, 0);
    ctx.lineTo(i === 0 ? -this.r : this.r, 0);
    ctx.strokeStyle = this.cfg.color;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

// ── Bomb ──
class Bomb {
  constructor() {
    this.x = 80 + Math.random() * (W - 160);
    this.y = H + 50;
    const spd = 12 + Math.random() * 6;
    const ang = (Math.random() - 0.5) * 0.6;
    this.vx = spd * Math.sin(ang);
    this.vy = -spd;
    this.g = 0.45;
    this.r = 38;
    this.alive = true;
    this.rot = 0;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.g;
    this.rot += 2;
    if (this.y > H + 60) this.alive = false;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    // body
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a2e";
    ctx.fill();
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
    ctx.stroke();
    // shine
    ctx.beginPath();
    ctx.arc(-this.r * 0.3, -this.r * 0.3, this.r * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.fill();
    // fuse
    ctx.beginPath();
    ctx.moveTo(0, -this.r);
    ctx.bezierCurveTo(12, -this.r - 10, 8, -this.r - 22, 4, -this.r - 26);
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 3;
    ctx.stroke();
    // spark
    const t = Date.now() / 100;
    ctx.beginPath();
    ctx.arc(
      4 + Math.sin(t) * 2,
      -this.r - 27 + Math.cos(t) * 2,
      5,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = `hsl(${40 + Math.sin(t) * 20},100%,60%)`;
    ctx.fill();
    // label
    ctx.font = "bold 14px Nunito";
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("BOMB", 0, 2);
    ctx.restore();
  }
}

// ══════════════════════════════════════════
//  GAME STATE
// ══════════════════════════════════════════
let score = 0,
  lives = 5,
  level = 1;
let fruits = [],
  bombs = [],
  particles = [],
  popups = [];
let gameRunning = false,
  gameOver = false;
let spawnTimer = 0,
  frameCount = 0;
let combo = 0,
  comboTimer = 0;
let bestScore = parseInt(localStorage.getItem("fnBest") || "0");

function resetGame() {
  score = 0;
  lives = 5;
  level = 1;
  fruits = [];
  bombs = [];
  particles = [];
  popups = [];
  trail = [];
  spawnTimer = 0;
  frameCount = 0;
  combo = 0;
  comboTimer = 0;
  gameOver = false;
  gameRunning = true;
  updateHUD();
}

function updateHUD() {
  document.getElementById("scoreVal").textContent = score;
  document.getElementById("levelVal").textContent = `LEVEL ${level}`;
  const h = document.getElementById("hearts");
  h.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const el = document.createElement("div");
    el.className = "heart" + (i >= lives ? " lost" : "");
    el.textContent = "❤️";
    h.appendChild(el);
  }
}

// ── Slice detection ──
function checkSlice(obj) {
  if (trail.length < 2) return false;
  for (let i = 1; i < trail.length; i++) {
    const p1 = trail[i - 1],
      p2 = trail[i];
    const dx = p2.x - p1.x,
      dy = p2.y - p1.y;
    if (dx === 0 && dy === 0) continue;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((obj.x - p1.x) * dx + (obj.y - p1.y) * dy) / (dx * dx + dy * dy)
      )
    );
    const cx = p1.x + t * dx,
      cy = p1.y + t * dy;
    if (Math.hypot(obj.x - cx, obj.y - cy) < obj.r + 8) return true;
  }
  return false;
}

// ── Trail velocity ──
function trailSpeed() {
  if (trail.length < 3) return 0;
  const p1 = trail[trail.length - 3],
    p2 = trail[trail.length - 1];
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

// ── Draw trail ──
function drawTrail() {
  if (trail.length < 2) return;
  for (let i = 1; i < trail.length; i++) {
    const a = i / trail.length;
    ctx.save();
    ctx.globalAlpha = a * 0.85;
    ctx.strokeStyle = `hsl(${200 + a * 60},100%,${60 + a * 30}%)`;
    ctx.lineWidth = a * 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
    ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Draw bg ──
function drawBG() {
  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, W, H);
  // subtle grid
  ctx.strokeStyle = "rgba(255,255,255,.03)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

// ── MAIN LOOP ──
let lastTime = 0;
function gameLoop(ts) {
  if (!gameRunning) return;
  requestAnimationFrame(gameLoop);

  ctx.clearRect(0, 0, W, H);
  drawBG();

  frameCount++;
  comboTimer = Math.max(0, comboTimer - 1);
  if (comboTimer === 0) combo = 0;

  // Spawn
  const spawnRate = Math.max(25, 90 - level * 8);
  spawnTimer++;
  if (spawnTimer >= spawnRate) {
    spawnTimer = 0;
    const count = Math.min(3, 1 + Math.floor(level / 2));
    for (let i = 0; i < count; i++) fruits.push(new Fruit());
    if (Math.random() < 0.12 + level * 0.03) bombs.push(new Bomb());
  }

  level = 1 + Math.floor(score / 10);

  // Miss check
  fruits.forEach((f) => {
    if (!f.sliced && f.y > H + f.r + 10 && f.alive) {
      f.alive = false;
      lives--;
      playMiss();
      popups.push(new Popup(f.x, H - 50, "MISS!", "#ff2d55", 32));
      updateHUD();
      if (lives <= 0) triggerGameOver();
    }
  });

  // Update + draw
  fruits = fruits.filter((f) => f.alive);
  bombs = bombs.filter((b) => b.alive);

  fruits.forEach((f) => {
    f.update();
    f.draw();
  });
  bombs.forEach((b) => {
    b.update();
    b.draw();
  });
  particles.forEach((p) => {
    p.update();
    p.draw();
  });
  particles = particles.filter((p) => p.alive);
  popups.forEach((p) => {
    p.update();
    p.draw();
  });
  popups = popups.filter((p) => p.alive);

  drawTrail();

  // HUD score on canvas
  ctx.font = "900 48px Bangers";
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,.8)";
  ctx.shadowBlur = 12;
  ctx.fillText(`SCORE  ${score}`, 20, 16);
  ctx.font = "700 20px Bangers";
  ctx.fillStyle = "rgba(255,255,255,.4)";
  ctx.fillText(`LEVEL ${level}`, 22, 72);
  ctx.shadowBlur = 0;
}

// ── Finger input ──
let fingerX = null,
  fingerY = null;
const fingerDot = document.getElementById("finger-dot");

function setFinger(nx, ny) {
  // nx,ny = 0..1 normalized (already mirrored)
  // Map to canvas coords
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / W;
  const scaleY = rect.height / H;

  const cx = nx * W;
  const cy = ny * H;

  // screen position for dot
  fingerDot.style.left = rect.left + cx * scaleX + "px";
  fingerDot.style.top = rect.top + cy * scaleY + "px";
  fingerDot.style.display = "block";

  fingerX = cx;
  fingerY = cy;

  if (!gameRunning || gameOver) return;

  trail.push({ x: cx, y: cy });
  if (trail.length > TRAIL_MAX) trail.shift();

  const speed = trailSpeed();

  // Fruit slice
  fruits.forEach((f) => {
    if (!f.sliced && checkSlice(f) && speed > 12) {
      f.doSlice();
      score++;
      combo++;
      comboTimer = 55;
      playSlice();
      for (let i = 0; i < 14; i++)
        particles.push(new Particle(f.x, f.y, f.cfg.inner));
      popups.push(new Popup(f.x, f.y - 20, "+1", "#30d158", 30));

      if (combo >= 3) {
        const bonus = combo - 2;
        score += bonus;
        popups.push(
          new Popup(f.x, f.y - 60, `COMBO x${combo}! +${bonus}`, "#ffd60a", 36)
        );
        showComboFlash(combo);
        playCombo(combo);
      }
      updateHUD();
    }
  });

  // Bomb slice
  bombs.forEach((b) => {
    if (checkSlice(b) && speed > 12) {
      b.alive = false;
      lives--;
      combo = 0;
      comboTimer = 0;
      playBomb();
      for (let i = 0; i < 20; i++)
        particles.push(new Particle(b.x, b.y, "#ff2d55"));
      popups.push(new Popup(b.x, b.y, "💥 -1 LIFE", "#ff2d55", 34));
      document.getElementById("bomb-flash").classList.add("flash");
      setTimeout(
        () => document.getElementById("bomb-flash").classList.remove("flash"),
        120
      );
      updateHUD();
      if (lives <= 0) triggerGameOver();
    }
  });
}

function clearFinger() {
  fingerX = null;
  fingerY = null;
  fingerDot.style.display = "none";
  trail = [];
}

// ── Combo flash ──
function showComboFlash(n) {
  const el = document.getElementById("comboFlash");
  el.textContent = `COMBO x${n}!`;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
}

// ── Game over ──
function triggerGameOver() {
  gameRunning = false;
  gameOver = true;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("fnBest", score);
  }
  document.getElementById("goScore").textContent = `SCORE: ${score}`;
  document.getElementById("goBest").textContent = bestScore;
  document.getElementById("gameover").classList.remove("hidden");
}

// ══════════════════════════════════════════
//  MEDIAPIPE HANDS
// ══════════════════════════════════════════
const videoEl = document.getElementById("webcam");
let mpReady = false;

async function initMediaPipe() {
  try {
    const handsModel = new Hands({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
    });
    handsModel.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.8,
      minTrackingConfidence: 0.7,
    });
    handsModel.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const tip = results.multiHandLandmarks[0][8];
        // mirror x (already mirrored by Camera util)
        const x = selfieMode ? tip.x : 1 - tip.x;
        setFinger(x, tip.y);
      } else {
        clearFinger();
      }
    });

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
    });
    videoEl.srcObject = stream;
    await videoEl.play();

    const camera = new Camera(videoEl, {
      onFrame: async () => {
        await handsModel.send({ image: videoEl });
      },
      width: 640,
      height: 480,
    });
    camera.start();
    mpReady = true;
  } catch (e) {
    console.warn("MediaPipe/camera failed:", e);
    document.getElementById("cam-msg").style.display = "block";
    // fallback: mouse control
    canvas.addEventListener("mousemove", (e) => {
      const r = canvas.getBoundingClientRect();
      setFinger((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    });
    canvas.addEventListener("mouseleave", clearFinger);
  }
}

// ══════════════════════════════════════════
//  UI WIRING
// ══════════════════════════════════════════
document.getElementById("startBtn").addEventListener("click", async () => {
  AC.resume();
  document.getElementById("splash").classList.add("hidden");
  document.getElementById("game-wrap").style.display = "flex";
  document.getElementById("hud").style.display = "flex";

  if (!mpReady) await initMediaPipe();
  resetGame();
  requestAnimationFrame(gameLoop);
});

document.getElementById("restartBtn").addEventListener("click", () => {
  AC.resume();
  document.getElementById("gameover").classList.add("hidden");
  resetGame();
  requestAnimationFrame(gameLoop);
});

document.getElementById("menuBtn").addEventListener("click", () => {
  document.getElementById("gameover").classList.add("hidden");
  document.getElementById("game-wrap").style.display = "none";
  document.getElementById("hud").style.display = "none";
  document.getElementById("splash").classList.remove("hidden");
  gameRunning = false;
});

// Keyboard restart
window.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") {
    if (gameOver) {
      document.getElementById("gameover").classList.add("hidden");
      resetGame();
      requestAnimationFrame(gameLoop);
    }
  }
  if (e.key === "Escape" && gameOver) {
    document.getElementById("menuBtn").click();
  }
});

document.getElementById("camToggle").addEventListener("change", (e) => {
  selfieMode = e.target.checked;
});
