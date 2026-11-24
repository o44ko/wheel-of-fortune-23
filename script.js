const N = QUESTIONS.length, SEC = 360 / N;
const COLORS = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#8e44ad','#e84393'];
const $ = id => document.getElementById(id);
const cv = $('wheel'), ctx = cv.getContext('2d');
let used = new Set(), score = 0, rot = 0, spinning = false, soundOn = true, current = -1, ac;
$('score').textContent = `0 из ${N}`;

// --- колесо ---
function draw() {
  const R = 400; ctx.clearRect(0, 0, 800, 800);
  for (let i = 0; i < N; i++) {
    const a0 = (i * SEC - 90) * Math.PI / 180, a1 = a0 + SEC * Math.PI / 180, u = used.has(i);
    ctx.beginPath(); ctx.moveTo(R, R); ctx.arc(R, R, R, a0, a1); ctx.closePath();
    ctx.fillStyle = u ? '#5d5d6b' : COLORS[i]; ctx.fill(); ctx.strokeStyle = '#f5c542'; ctx.lineWidth = 5; ctx.stroke();
    ctx.save(); ctx.translate(R, R); ctx.rotate((a0 + a1) / 2); ctx.translate(R * .68, 0); ctx.rotate(Math.PI / 2);
    ctx.fillStyle = u ? '#a0a0ad' : '#fff'; ctx.font = '900 110px Rubik,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = '#0008'; ctx.shadowBlur = 8;
    ctx.fillText(i + 1, 0, 0); ctx.restore();
  }
}
draw(); document.fonts.ready.then(draw);
for (let i = 0; i < 24; i++) { // лампочки
  const b = document.createElement('i'), a = i / 24 * 2 * Math.PI;
  b.style.left = 50 + 47.2 * Math.sin(a) + '%'; b.style.top = 50 - 47.2 * Math.cos(a) + '%';
  $('bulbs').appendChild(b);
}

// --- звук (Web Audio) ---
function getAc() { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); return ac; }
function tick(f = 900) {
  if (!soundOn) return;
  const a = getAc(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f / 2, t + .05);
  g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.001, t + .06);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + .07);
}
const chord = ok => (ok ? [523, 659, 784] : [220, 175]).forEach((f, i) => setTimeout(() => tick(f * 2), i * 110));
$('sound').onclick = () => { soundOn = !soundOn; $('sound').textContent = soundOn ? '🔊' : '🔇'; };

// --- вращение ---
function spin() {
  if (spinning) return;
  const free = [...Array(N).keys()].filter(i => !used.has(i));
  if (!free.length) return;
  spinning = true; $('spin').disabled = true; document.body.classList.add('spinning');
  current = free[Math.random() * free.length | 0];                  // только неиспользованные
  const off = SEC * (.1 + Math.random() * .8);                      // точка внутри сектора
  const cur = ((rot % 360) + 360) % 360, want = (((-(current * SEC + off)) % 360) + 360) % 360;
  const total = (6 + Math.random() * 4 | 0) * 360 + ((want - cur + 360) % 360); // 6–9 оборотов + доводка
  const start = rot, dur = 5500 + Math.random() * 1200, t0 = performance.now();
  const sector = r => Math.floor((((-r) % 360) + 360) % 360 / SEC);
  let last = sector(start);
  (function frame(now) {
    const p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);   // быстрый старт, плавное торможение
    rot = start + total * e; cv.style.transform = `rotate(${rot}deg)`;
    const idx = sector(rot);
    if (idx !== last) { last = idx; tick(); flick(); }
    if (p < 1) requestAnimationFrame(frame);
    else { spinning = false; document.body.classList.remove('spinning'); setTimeout(() => openQ(current), 500); }
  })(t0);
}
function flick() {
  $('pointer').animate([{ transform: 'translateX(-50%) rotate(0)' }, { transform: 'translateX(-50%) rotate(-28deg)', offset: .3 },
    { transform: 'translateX(-50%) rotate(0)' }], { duration: 120 });
}
$('spin').onclick = spin;

// --- вопрос ---
function openQ(i) {
  const q = QUESTIONS[i]; $('qnum').textContent = `ВОПРОС ${i + 1}`; $('qtext').textContent = q.q;
  $('result').hidden = true; $('answers').innerHTML = '';
  q.a.forEach((t, k) => { const b = document.createElement('button'); b.textContent = t; b.onclick = () => answer(k); $('answers').appendChild(b); });
  $('modal').classList.add('show');
}
function answer(k) {
  const q = QUESTIONS[current], ok = k === q.c;
  [...$('answers').children].forEach((b, j) => { b.disabled = true; if (j === q.c) b.classList.add('ok'); else if (j === k) b.classList.add('bad'); });
  used.add(current); if (ok) { score++; confetti(); }
  chord(ok); $('score').textContent = `${score} из ${N}`;
  $('verdict').textContent = ok ? '✅ Верно!' : '❌ Неверно. Правильный ответ: ' + q.a[q.c];
  $('expl').textContent = q.e; $('result').hidden = false;
  $('next').textContent = used.size === N ? 'Результат' : 'Дальше';
}
$('next').onclick = () => {
  $('modal').classList.remove('show'); draw();
  if (used.size === N) {
    const m = score >= 7 ? 'Отлично!' : score >= 5 ? 'Хорошо!' : 'Стоит повторить параграф.';
    $('finalText').textContent = `Ваш результат: ${score} из ${N}. ${m}`;
    setTimeout(() => $('final').classList.add('show'), 400); if (score >= 5) confetti(2);
  } else $('spin').disabled = false;
};
$('restart').onclick = () => {
  used.clear(); score = 0; $('score').textContent = `0 из ${N}`; $('final').classList.remove('show');
  draw(); $('spin').disabled = false;
};

// --- конфетти ---
function confetti(k = 1) {
  const c = $('confetti'), g = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const ps = Array.from({ length: 70 * k }, () => ({ x: innerWidth / 2, y: innerHeight * .4, vx: (Math.random() - .5) * 14, vy: -Math.random() * 12 - 3,
    s: 5 + Math.random() * 6, col: COLORS[Math.random() * N | 0], r: Math.random() * 6 }));
  let f = 0;
  (function loop() {
    g.clearRect(0, 0, c.width, c.height);
    ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .35; p.r += .2; g.fillStyle = p.col;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); });
    if (++f < 110) requestAnimationFrame(loop); else g.clearRect(0, 0, c.width, c.height);
  })();
}
