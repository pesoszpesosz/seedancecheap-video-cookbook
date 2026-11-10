const ctx = document.querySelector('#scene').getContext('2d');
const width = 1080;
const height = 1920;
const caseHalfWidth = 81;
const stopX = 826;
const deckY = 1010;
const trayY = 1340;
const hitTime = .58;
const fallStart = 2.68;
const landTime = 3.42;
const leftOpening = 467;
const rightOpening = 701;

function clamp(x) { return Math.max(0, Math.min(1, x)); }
function phase(t, start, end) { return clamp((t - start) / (end - start)); }
function ease(t, start, end) {
  const x = phase(t, start, end);
  return x * x * (3 - 2 * x);
}
function mix(a, b, x) { return a + (b - a) * x; }

function box(x, y, w, h, fill, radius = 0) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function polygon(points, fill) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function line(x1, y1, x2, y2, color, weight = 2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.stroke();
}

function text(value, x, y, size, color, weight = 700, font = 'Segoe UI') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "${font}", sans-serif`;
  ctx.fillText(value, x, y);
}

function glow(x, y, radius, inner, outer) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  box(x - radius, y - radius, radius * 2, radius * 2, gradient);
}

function pose(t) {
  const atImpact = stopX - caseHalfWidth;
  const x = t < hitTime
    ? mix(292, atImpact, phase(t, 0, hitTime))
    : mix(atImpact, 585, 1 - (1 - phase(t, hitTime, 1.43)) ** 2) + 122 * ease(t, 5.05, 7.35);
  const drop = phase(t, fallStart, landTime);
  const sinceLanding = Math.max(0, t - landTime);
  const bounce = t > landTime ? Math.max(0, Math.sin(sinceLanding * 15)) * 24 * Math.exp(-sinceLanding * 6) : 0;
  return {x, bottom: mix(deckY, trayY, drop * drop) - bounce};
}

function room(t) {
  const wall = ctx.createLinearGradient(80, 470, 940, 1450);
  wall.addColorStop(0, '#673e47');
  wall.addColorStop(.48, '#3d2635');
  wall.addColorStop(1, '#201823');
  box(90, 510, 900, 1006, wall, 38);
  box(118, 535, 843, 954, '#32232e', 22);
  glow(775, 675, 365, '#cf786157', '#cf786100');
  box(149, 567, 778, 899, '#4b30353d', 10);
  for (const x of [161, 288, 415, 542, 669, 796, 923]) {
    line(x, 570, x, 1450, '#b7807917');
    line(x + 3, 570, x + 3, 1450, '#2019246e');
  }
  for (const y of [611, 744, 877, 1143, 1276, 1409]) line(150, y, 928, y, '#a26e7023');
  polygon([[168, 577], [398, 577], [746, 1043], [528, 1043]], '#e2b68d11');
  box(173, 587, 246, 24, '#d8a980', 10);
  box(181, 595, 230, 7, '#ffe1b6', 3);
  text('NIGHT SORT', 194, 694, 27, '#d4a9a6', 750, 'Consolas');
  text('CHUTE 04', 197, 730, 20, '#b38d95', 700, 'Consolas');
  const open = ease(t, 2.37, 2.72);
  const rail = '#6a4654';
  box(171, deckY, leftOpening - 171, 28, rail, 4);
  box(rightOpening, deckY, 210, 28, rail, 4);
  box(leftOpening - 116 * open, deckY, 117, 25, '#ca8e78', 4);
  box(584 + 116 * open, deckY, 117, 25, '#ca8e78', 4);
  line(174, deckY, leftOpening, deckY, '#e8af8a', 5);
  line(rightOpening, deckY, 909, deckY, '#e8af8a', 5);
  box(stopX, 860, 31, 149, '#c36e60', 5);
  box(stopX + 31, 869, 12, 140, '#7e505c', 4);
  for (let y = 879; y < 992; y += 24) line(stopX + 4, y, stopX + 24, y - 13, '#f3ad81', 5);
  box(866, 886, 23, 116, '#332831', 6);
  const flash = Math.max(0, 1 - Math.abs(t - hitTime) * 5);
  if (flash > 0) glow(stopX, 941, 132 * flash + 20, '#ff9b5fb8', '#ff935400');
}

function tray(t) {
  const appear = ease(t, 2.4, 3.33);
  const advance = 122 * ease(t, 5.05, 7.35);
  ctx.save();
  ctx.globalAlpha = appear;
  box(404, trayY + 18, 448, 90, '#2a2431', 15);
  box(435, trayY + 61, 385, 16, '#916577', 6);
  for (const x of [454, 522, 590, 658, 726, 794]) box(x, trayY + 54, 15, 30, '#bf8c94', 5);
  const after = Math.max(0, t - landTime);
  const compress = after > 0 ? 12 * Math.exp(-after * 7) * Math.abs(Math.sin(after * 16)) : 0;
  box(472 + advance, trayY + compress, 227, 36, '#477f70', 8);
  box(483 + advance, trayY - 5 + compress, 206, 13, '#96cb9e', 5);
  line(492 + advance, trayY + 24, 675 + advance, trayY + 24, '#204f49', 3);
  ctx.restore();
}

function parcel(p, t) {
  const airborne = phase(t, fallStart, landTime);
  const spin = Math.sin(airborne * Math.PI) * .10;
  ctx.save();
  ctx.translate(p.x, p.bottom - 59);
  ctx.rotate(spin);
  polygon([[-81, -39], [-54, -61], [72, -61], [81, -39]], '#ffcf8c');
  box(-81, -40, 162, 98, '#c66e47', 11);
  box(-73, -33, 146, 82, '#e99b5d', 6);
  box(-67, -28, 133, 64, '#efaf70', 6);
  box(-52, -25, 67, 46, '#fff0ca', 5);
  text('04', -44, 6, 28, '#562d30', 800, 'Consolas');
  for (const x of [2, 5, 9]) box(x, -15, 1.5, 24, '#804b48');
  box(-63, 34, 22, 8, '#773d3f', 3);
  box(45, 34, 22, 8, '#773d3f', 3);
  box(42, -17, 18, 23, '#995d49', 4);
  line(-74, 52, 74, 52, '#5d3339', 5);
  ctx.restore();
}

function statusPanel(t) {
  const delivered = t >= 4.38;
  const checking = t >= .68;
  box(667, 718, 224, 80, '#1c1820', 10);
  box(677, 728, 204, 60, delivered ? '#274b41' : '#42252f', 6);
  const light = delivered ? '#b5efb8' : checking ? '#ff9770' : '#eac799';
  glow(697, 758, 33, delivered ? '#a0eab07c' : '#ff97706c', '#ff977000');
  box(692, 752, 13, 13, light, 6);
  text(delivered ? 'ACCEPTED' : checking ? 'MISROUTE' : 'INBOUND', 719, 767, 25, light, 800, 'Consolas');
}

function overlay(t) {
  box(116, 294, 395, 55, '#1b1625e6', 8);
  box(134, 312, 15, 15, '#e6a875', 4);
  text('SeedanceCheap.com', 163, 332, 34, '#fff0e0', 750);
  if (t >= .82 && t < 2.48) {
    text('Wrong route?', 116, 443, 67, '#fff3db', 800);
  } else if (t >= 4.38) {
    text('Delivery accepted.', 116, 443, 63, '#fff3db', 800);
  }
}

function draw(t) {
  const backdrop = ctx.createLinearGradient(0, 180, 1080, 1700);
  backdrop.addColorStop(0, '#291b27');
  backdrop.addColorStop(.7, '#201624');
  backdrop.addColorStop(1, '#120f1d');
  box(0, 0, width, height, backdrop);
  glow(565, 1010, 640, '#70445846', '#70445800');

  const p = pose(t);
  const moveDown = ease(t, 2.32, 3.55);
  const drift = ease(t, 0, .68);
  const zoom = 1.08 + .12 * drift - .32 * moveDown + .055 * ease(t, 4.46, 7.9);
  const cameraX = 526 + 37 * drift + 15 * ease(t, 5.14, 7.40);
  const cameraY = 879 + 176 * moveDown;
  const shake = t >= hitTime ? Math.sin((t - hitTime) * 86) * Math.exp(-(t - hitTime) * 17) * 11 : 0;
  ctx.save();
  ctx.translate(540 + shake, 934);
  ctx.scale(zoom, zoom);
  ctx.translate(-cameraX, -cameraY);
  room(t);
  tray(t);
  parcel(p, t);
  statusPanel(t);
  box(97, 516, 15, 999, '#261b29', 6);
  box(954, 522, 18, 983, '#241b26', 6);
  ctx.restore();

  const vignette = ctx.createRadialGradient(560, 990, 390, 560, 990, 1030);
  vignette.addColorStop(0, '#170f1d00');
  vignette.addColorStop(1, '#170f1dbf');
  box(0, 0, width, height, vignette);
  overlay(t);
}

window.__seek = draw;
window.__dropGeometry = {
  hitTime, fallStart, landTime,
  stopGap: stopX - pose(hitTime).x - caseHalfWidth,
  clearance: rightOpening - leftOpening - caseHalfWidth * 2,
  heightDifference: trayY - deckY,
  landingGap: pose(landTime).bottom - trayY
};
draw(0);
window.__simReady = true;
