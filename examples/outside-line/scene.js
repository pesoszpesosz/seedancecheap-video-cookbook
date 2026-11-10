const scene = document.querySelector('#scene');
const ctx = scene.getContext('2d');
const width = scene.width;
const height = scene.height;
const radius = 210;
const curveStart = 1100;
const curveEnd = curveStart + Math.PI * radius;
const finish = 2440;
const halfLength = 60;
const halfWidth = 26;
const teal = [[0, 420], [1.5, 985], [2.5, 1265], [3.8, 1570], [4.7, 1820], [5.5, 2050], [6.45, 2325], [8, 2670]];
const amber = [[0, 280], [1.5, 876], [2.5, 1156], [3.8, 1510], [4.7, 1850], [5.5, 2140], [6.45, 2485], [8, 2860]];
const clamp = (value, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, value));
const mix = (a, b, amount) => a + (b - a) * amount;
function ease(time, start, end) {
  const p = clamp((time - start) / (end - start));
  return p * p * (3 - 2 * p);
}

// Cubic Hermite interpolation preserves a continuous speed at each story beat.
function progress(keys, time) {
  const i = keys.findIndex(([end]) => time < end) - 1;
  if (time <= 0) return keys[0][1];
  if (i < 0) return keys.at(-1)[1];
  const [start, from] = keys[i];
  const [end, to] = keys[i + 1];
  const before = keys[Math.max(0, i - 1)];
  const after = keys[Math.min(keys.length - 1, i + 2)];
  const span = end - start;
  const a = (to - before[1]) / (end - before[0]) * span;
  const b = (after[1] - from) / (after[0] - start) * span;
  const p = (time - start) / span;
  return (2 * p ** 3 - 3 * p ** 2 + 1) * from + (p ** 3 - 2 * p ** 2 + p) * a
    + (-2 * p ** 3 + 3 * p ** 2) * to + (p ** 3 - p ** 2) * b;
}

function position(s, lane = 0) {
  if (s <= curveStart) return { x: 360 + lane, y: 1800 - s, yaw: -Math.PI / 2 };
  if (s >= curveEnd) return { x: 780 - lane, y: 700 + s - curveEnd, yaw: Math.PI / 2 };
  const angle = Math.PI + (s - curveStart) / radius;
  return { x: 570 + (radius - lane) * Math.cos(angle), y: 700 + (radius - lane) * Math.sin(angle), yaw: angle + Math.PI / 2 };
}

function rounded(g, x, y, w, h, r, fill) {
  g.fillStyle = fill;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

function line(g, x1, y1, x2, y2, color, size) {
  g.strokeStyle = color;
  g.lineWidth = size;
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
}

const back = document.createElement('canvas');
back.width = 1840;
back.height = 3200;
const road = back.getContext('2d');
road.translate(390, 500);
const ground = road.createLinearGradient(-390, 0, 1450, 2000);
ground.addColorStop(0, '#172632');
ground.addColorStop(.55, '#23353a');
ground.addColorStop(1, '#0e1a26');
road.fillStyle = ground;
road.fillRect(-390, -500, 1840, 3200);

const texture = (i, seed) => {
  const n = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
for (let i = 0; i < 2800; i++) {
  road.fillStyle = i % 3 ? '#6e84781c' : '#000e1960';
  road.fillRect(texture(i, 0) * 1840 - 390, texture(i, 1) * 3200 - 500, 1 + texture(i, 2) * 7, 1 + texture(i, 3) * 4);
}

function centerPath(x = 0) {
  const shape = new Path2D();
  shape.moveTo(360 + x, 2510);
  shape.lineTo(360 + x, 700);
  shape.arc(570, 700, radius - x, Math.PI, 2 * Math.PI);
  shape.lineTo(780 - x, 2510);
  return shape;
}

function trackStroke(path, color, size, dash = []) {
  road.strokeStyle = color;
  road.lineWidth = size;
  road.setLineDash(dash);
  road.stroke(path);
  road.setLineDash([]);
}

const track = centerPath();
trackStroke(track, '#0b1723', 340);
trackStroke(track, '#718286', 314);
trackStroke(track, '#283440', 299);
trackStroke(track, '#313d49', 254);
trackStroke(centerPath(148), '#a9b9ad', 4);
trackStroke(centerPath(-148), '#a9b9ad', 4);
trackStroke(track, '#8899a05c', 3, [30, 36]);

for (const side of [-1, 1]) {
  const curb = new Path2D();
  curb.arc(570, 700, radius + side * 146, Math.PI, 2 * Math.PI);
  trackStroke(curb, '#c0c0aa', 15);
  trackStroke(curb, '#d06a51', 15, [21, 21]);
}

// Trackside details and fixed pools of light reveal the motion of the camera.
for (let i = 0; i < 11; i++) {
  const y = 335 + i * 198;
  for (const x of [181, 961]) {
    const pool = road.createRadialGradient(x, y, 0, x, y, 180);
    pool.addColorStop(0, '#ecc08434');
    pool.addColorStop(1, '#ecc08400');
    road.fillStyle = pool;
    road.fillRect(x - 180, y - 180, 360, 360);
    rounded(road, x - 13, y - 10, 26, 20, 4, '#091722');
    rounded(road, x - 7, y - 4, 14, 8, 3, '#ffd69a');
  }
}
for (let i = 0; i < 7; i++) {
  const y = 900 + 176 * i;
  rounded(road, 552, y, 38, 115, 10, '#122731');
  for (let j = 0; j < 4; j++) {
    line(road, 562, y + 15 + 23 * j, 580, y + 15 + 23 * j, '#576b6f', 4);
  }
}
for (let i = 0; i < 220; i++) {
  const p = position(texture(i, 7) * 2600, (texture(i, 8) - .5) * 255);
  line(road, p.x, p.y, p.x + 1 + texture(i, 9) * 4, p.y + 2, '#c7d3bd19', 2);
}
for (const y of [1330, 1240, 1150, 1060]) {
  line(road, 335, y - 13, 360, y - 35, '#c5cbbb75', 5);
  line(road, 360, y - 35, 385, y - 13, '#c5cbbb75', 5);
}
const finishY = position(finish).y;
for (let row = 0; row < 2; row++) {
  for (let col = 0; col < 12; col++) {
    road.fillStyle = (col + row) % 2 ? '#121e26' : '#e3dec9';
    road.fillRect(636 + col * 24, finishY - 12 + row * 12, 24, 12);
  }
}
road.font = '700 28px Segoe UI';
road.fillStyle = '#d4d4bb';
road.fillText('FINISH', 998, finishY + 8);

function car(p, colors, number, brake) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.yaw);
  rounded(ctx, -61, -25, 131, 59, 18, '#0208109f');
  for (const y of [-27, 17]) {
    rounded(ctx, -44, y, 24, 13, 5, '#0a1119');
    rounded(ctx, 21, y, 24, 13, 5, '#0a1119');
  }
  rounded(ctx, -60, -23, 120, 46, 13, colors.edge);
  rounded(ctx, -57, -20, 114, 40, 12, colors.body);
  const finish = ctx.createLinearGradient(0, -21, 0, 20);
  finish.addColorStop(0, '#ffffff56');
  finish.addColorStop(.5, '#ffffff00');
  finish.addColorStop(1, '#0000004d');
  rounded(ctx, -57, -20, 114, 40, 12, finish);
  rounded(ctx, -22, -16, 45, 32, 10, '#182831');
  rounded(ctx, -12, -13, 23, 26, 5, colors.edge);
  ctx.fillStyle = '#fff5dd';
  ctx.font = '750 16px Segoe UI';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number, -1, 0);
  rounded(ctx, 36, -3, 19, 6, 2, '#fbf5df9a');
  for (const y of [-15, 10]) {
    rounded(ctx, 51, y, 6, 6, 3, '#fef3ca');
    rounded(ctx, -57, y, 6, 6, 2, brake ? '#ffdd83' : '#be3c3c');
  }
  line(ctx, -44, -19, -44, 19, '#111c29', 3);
  ctx.restore();
}

function text(text, y, size, color, weight) {
  ctx.fillStyle = color;
  ctx.font = weight + ' ' + size + 'px Segoe UI';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, y);
}

function seek(t) {
  const first = progress(teal, t);
  const second = progress(amber, t);
  const focus = position((first + second) / 2 + 74);
  const bank = .077 * Math.sin(Math.PI * ease(t, 1.50, 5.1));
  const zoom = 1.09 - .07 * ease(t, 1.60, 3.20) + .16 * ease(t, 4.1, 6.4);
  ctx.fillStyle = '#172632';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(540, 1010);
  ctx.rotate(bank);
  ctx.scale(zoom, zoom);
  ctx.translate(-mix(570, focus.x, .81), -focus.y);
  ctx.drawImage(back, -390, -500);
  car(position(first, 53), {edge:'#125c65',body:'#59c5bc'}, '04', t > 1.39 && t < 2.52);
  car(position(second, -53), {edge:'#b64724',body:'#f08b45'}, '07', t > 1.74 && t < 2.16);
  ctx.restore();

  const shade = ctx.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, '#101622d8');
  shade.addColorStop(.30, '#131b2620');
  shade.addColorStop(.68, '#131b2600');
  shade.addColorStop(1, '#08121ba5');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
  const won = second + halfLength >= finish;
  rounded(ctx, 337, 357, 406, 70, 28, '#091722ed');
  text('SeedanceCheap.com', 393, 39, '#fcf1d5', '700');
  text(won ? '07 TAKES IT' : 'THE OUTSIDE LINE', 495, won ? 72 : 64, '#fff3dd', '800');
  text(won ? 'WIDE ENTRY. FAST EXIT.' : 'FINAL TURN', 551, 24, '#fbbd75', '700');
}

function geometry() {
  let minDistance = Infinity;
  let overlap = false;
  let leadTime = null;
  let winTime = null;
  for (let i = 0; i <= 960; i++) {
    const t = i / 120;
    const a = position(progress(teal, t), 53);
    const b = position(progress(amber, t), -53);
    const dx = b.x - a.x, dy = b.y - a.y;
    minDistance = Math.min(minDistance, Math.hypot(dx, dy));
    const axes = [a.yaw, b.yaw, a.yaw + Math.PI / 2, b.yaw + Math.PI / 2];
    overlap ||= axes.every(angle => {
      const projected = Math.abs(dx * Math.cos(angle) + dy * Math.sin(angle));
      const extent = yaw => halfLength * Math.abs(Math.cos(yaw - angle)) + halfWidth * Math.abs(Math.sin(yaw - angle));
      return projected <= extent(a.yaw) + extent(b.yaw);
    });
    if (leadTime === null && progress(amber, t) >= progress(teal, t)) leadTime = t;
    if (winTime === null && progress(amber, t) + halfLength >= finish) winTime = t;
  }
  return { overlap, minDistance, leadTime, winTime, samples: 961 };
}

window.__seek = seek;
window.__raceGeometry = geometry();
document.fonts.ready.then(() => {
  seek(0);
  window.__simReady = true;
});
