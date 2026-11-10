'use strict';

const ctx = document.querySelector('#frame').getContext('2d', {alpha: false});
const W = 1080;
const H = 1920;
const ACCENT = '#8cf4d1';
const ALERT = '#ff885d';
const INK = '#dcebf3';
const CONTACT = .46;
const GATE_Y = 1038;
const OPENING = 390;
const WIDE = {width: 640, height: 360};
const PORTRAIT = {width: 272, height: 484};
const clamp = (x, min = 0, max = 1) => Math.max(min, Math.min(max, x));
const phase = (time, start, end) => clamp((time - start) / (end - start));
const smooth = x => x * x * (3 - 2 * x);
const mix = (a, b, x) => a + (b - a) * x;
const ease = (time, start, end) => smooth(phase(time, start, end));

function box(x, y, w, h, radius, fill, stroke, width = 1) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function line(x1, y1, x2, y2, color, width = 1) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function label(text, x, y, size, color = INK, weight = 700, align = 'left', mono = false) {
  ctx.font = `${weight} ${size}px ${mono ? 'Consolas, monospace' : 'Segoe UI, sans-serif'}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function glow(x, y, radius, color) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, '#00000000');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function background() {
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, '#14192a');
  gradient.addColorStop(.65, '#080d15');
  gradient.addColorStop(1, '#111829');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  glow(370, 890, 700, '#334f6855');
  for (let y = 60; y < H; y += 36) {
    for (let x = 24; x < W; x += 36) {
      ctx.fillStyle = (x + y) % 5 === 0 ? '#566f854c' : '#50668025';
      ctx.fillRect(x, y, 2, 2);
    }
  }
  line(100, 282, 980, 282, '#8499b334');
  line(100, 1485, 980, 1485, '#8499b334');
}

function chassis(t) {
  box(158, 592, 764, 790, 56, '#060910');
  const metal = ctx.createLinearGradient(158, 0, 922, 0);
  metal.addColorStop(0, '#34435b');
  metal.addColorStop(.22, '#1f2c3e');
  metal.addColorStop(.55, '#0d1828');
  metal.addColorStop(1, '#303b50');
  box(164, 575, 752, 784, 48, metal, '#586a83', 2);
  box(189, 602, 702, 730, 34, '#0a111c', '#71839d44', 2);
  box(240, 609, 600, 707, 24, '#0e1825');
  for (let i = 0; i < 13; i++) {
    const y = 625 + ((i * 57 + t * 26) % 690);
    line(249, y, 830, y, '#6075912d', 2);
    line(249, y + 3, 830, y + 3, '#03071180', 3);
  }
  for (const x of [222, 858]) {
    line(x, 630, x, 1298, '#48586d', 4);
    line(x + 8, 630, x + 8, 1298, '#060b12', 5);
  }
  for (const [x, y] of [[197, 612], [883, 612], [197, 1316], [883, 1316]]) {
    box(x - 8, y - 8, 16, 16, 8, '#9baec06c');
    line(x - 4, y + 4, x + 4, y - 4, '#0b121d', 2);
  }
  label('IN', 213, 661, 23, '#8d9db3', 700, 'center', true);
  label('OUT', 858, 1283, 21, '#8d9db3', 700, 'center', true);
}

function card(y, w, h, dimensions, color, tilt) {
  ctx.save();
  ctx.translate(540, y);
  ctx.rotate(tilt);
  box(-w / 2 + 13, -h / 2 + 21, w, h, 20, '#00000080');
  const face = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  face.addColorStop(0, '#40526c');
  face.addColorStop(.22, '#202c42');
  face.addColorStop(.73, '#111d31');
  face.addColorStop(1, '#203c45');
  box(-w / 2, -h / 2, w, h, 18, face, color, 3);
  box(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 13, '#09141b26', '#bfdeed30');
  for (const [x, y] of [[-w/2+24,-h/2+24],[w/2-24,-h/2+24],[-w/2+24,h/2-24],[w/2-24,h/2-24]]) {
    box(x-5, y-5, 10, 10, 3, color);
  }
  label(dimensions, 0, -5, w > 400 ? 66 : 34, '#f0f6fb', 700, 'center', true);
  label(w > 400 ? 'LANDSCAPE SIZE' : 'PORTRAIT SIZE', 0, 49, w > 400 ? 29 : 20, '#c1d2df', 600, 'center', true);
  const trackY = h / 2 - 52;
  for (let i = 0; i < 11; i++) {
    const x = -55 + i * 11;
    line(x, trackY - (i % 3) * 3, x, trackY + 14, color, i % 2 ? 1 : 3);
  }
  ctx.restore();
}

function stopBlock(x, w, color) {
  box(x, 1050, w, 72, 12, '#080b11');
  box(x, 1038, w, 69, 12, '#29364b', '#8496a955', 2);
  box(x + 7, 1043, w - 14, 5, 2, color);
  for (let i = 0; i < 4; i++) {
    const left = x + 17 + i * 24;
    line(left, 1085, left + 14, 1067, '#9ab0c44e', 3);
  }
}

function gate(t, color) {
  stopBlock(181, 164, color);
  stopBlock(735, 164, color);
  line(345, 1038, 735, 1038, color + '60', 3);
  line(345, 1045, 735, 1045, '#98e8ce20', 2);
  const pass = ease(t, 4.84, 5.08);
  const lamp = t >= 5.05 ? ACCENT : t >= .46 && t < 2.80 ? ALERT : '#7794b2';
  glow(540, 1159, 102, t >= 5.05 ? '#74f6bb57' : t >= .46 && t < 2.80 ? '#fc533653' : '#5a8cc636');
  box(481, 1138, 118, 40, 20, '#101b29', '#9db8cb66', 2);
  box(491, 1148, mix(27, 98, pass), 20, 10, lamp);
}

function impact(t) {
  const p = phase(t, .46, .77);
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.globalAlpha = (1 - p) ** 2;
  for (const x of [310, 770]) {
    glow(x, 1038, 128 * p + 26, '#ff9a5677');
    for (const [dx, dy] of [[-71, -25], [-45, 33], [25, -44], [61, 22]]) {
      line(x + dx*p*.6, 1038 + dy*p*.6, x + dx*p, 1038 + dy*p, '#ffcc9d', 3);
    }
  }
  ctx.restore();
}

function overlay(t) {
  const accepted = t >= 5.05;
  const trying = t >= 2.72;
  const headline = t < .46 ? 'Will it fit?' : t < 2.72 ? 'Wrong pair.' : !accepted ? 'Try the exact pair.' : 'Check the pair.';
  const detail = trying ? '9:16 + 720 × 1280' : '9:16 + 1280 × 720';
  const color = accepted ? ACCENT : trying || t < .46 ? INK : ALERT;
  box(99, 177, 434, 64, 15, '#0d1726', '#7084a544', 2);
  box(118, 200, 17, 17, 5, ACCENT);
  label('SeedanceCheap.com', 153, 209, 38, INK, 650);
  label('THE FORMAT GATE', 104, 328, 25, '#a5b6cb', 700, 'left', true);
  label(headline, 100, 415, 85, INK, 750);
  label(detail, 104, 492, 44, color, 700, 'left', true);
  label(accepted ? 'Free portrait preflight' : 'Match ratio and size in one row', 104, 1447, 32, '#bacbdc', 600);
  if (accepted) label('NO KEY REQUIRED', 104, 1529, 24, ACCENT, 700, 'left', true);
}

window.__seek = time => {
  const t = clamp(time, 0, 8);
  background();
  const shake = t < .46 ? 0 : Math.sin((t - .46) * 54) * Math.exp(-(t - .46) * 16) * 15;
  const zoom = mix(1.14, 1, ease(t, .39, 1.58)) + .075 * ease(t, 3.35, 5.04) - .075 * ease(t, 5.10, 6.50);
  ctx.save();
  ctx.translate(540 + shake * .48, 961 + shake);
  ctx.rotate(mix(-.023, 0, ease(t, .40, 1.85)));
  ctx.scale(zoom, zoom);
  ctx.translate(-540, -961);
  chassis(t);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(189, 602, 702, 730, 34);
  ctx.clip();
  if (t < 3.12) {
    const entry = phase(t, 0, CONTACT);
    const recoil = 10 * Math.sin(phase(t, .46, .75) * Math.PI) ** 2;
    const y = mix(738, GATE_Y - WIDE.height / 2, entry ** 1.28) - recoil - 466 * ease(t, 2.63, 3.12);
    card(y, WIDE.width, WIDE.height, '1280 × 720', ALERT, 0);
  }
  if (t >= 3.12) {
    const y = mix(362, 814, ease(t, 3.12, 4.65)) + 514 * ease(t, 4.65, 6.17);
    card(y, PORTRAIT.width, PORTRAIT.height, '720 × 1280', ACCENT, 0);
  }
  ctx.restore();
  gate(t, t >= 5.05 ? ACCENT : t >= .46 && t < 2.75 ? ALERT : '#687e9a');
  impact(t);
  ctx.restore();
  overlay(t);
};

document.fonts.ready.then(() => {
  window.__seek(0);
  window.__formatGateGeometry = {contact: CONTACT, gateY: GATE_Y, opening: OPENING, wide: WIDE.width, portrait: PORTRAIT.width};
  window.__simReady = true;
});
