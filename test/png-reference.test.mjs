import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectReferencePng } from '../docs/png-reference.mjs';

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// These fixtures exercise the structure check. The browser decodes actual pixels separately.
function chunk(type, payload = Buffer.alloc(0)) {
  const bytes = Buffer.alloc(12 + payload.length);
  bytes.writeUInt32BE(payload.length, 0);
  bytes.write(type, 4, 'ascii');
  payload.copy(bytes, 8);
  return bytes;
}

function png({ width = 400, height = 600, color = 2, interlace = 0, extra = [], imageData = true } = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = color;
  header[12] = interlace;
  return Buffer.concat([
    signature, chunk('IHDR', header), ...extra,
    ...(imageData ? [chunk('IDAT', Buffer.of(1))] : []), chunk('IEND')
  ]);
}

test('reads supported RGB and RGBA headers at the exact dimension boundaries', () => {
  assert.deepEqual(inspectReferencePng(png()), { width: 400, height: 600, color: 'RGB' });
  assert.deepEqual(inspectReferencePng(png({ width: 300, height: 2048, color: 6 })), {
    width: 300, height: 2048, color: 'RGBA'
  });
});

test('rejects a renamed JPEG and a file beyond the API size cap', () => {
  assert.throws(() => inspectReferencePng(Buffer.of(255, 216, 255, 224)), /not PNG/);
  assert.throws(() => inspectReferencePng(Buffer.alloc(2 * 1024 * 1024 + 1)), /2 MiB/);
});

test('explains dimensions and the export settings for unsupported PNGs', () => {
  assert.throws(() => inspectReferencePng(png({ width: 299 })), /299 × 600/);
  assert.throws(() => inspectReferencePng(png({ height: 2049 })), /2,048 px/);
  assert.throws(() => inspectReferencePng(png({ color: 3 })), /8-bit RGB or RGBA/);
  assert.throws(() => inspectReferencePng(png({ interlace: 1 })), /non-interlaced/);
});

test('rejects animation, missing image data, truncated chunks and trailing bytes', () => {
  assert.throws(() => inspectReferencePng(png({ extra: [chunk('acTL', Buffer.alloc(8))] })), /animated/);
  assert.throws(() => inspectReferencePng(png({ imageData: false })), /incomplete/);
  assert.throws(() => inspectReferencePng(signature), /header is incomplete/);
  assert.throws(() => inspectReferencePng(png().subarray(0, -1)), /incomplete/);
  assert.throws(() => inspectReferencePng(Buffer.concat([png(), chunk('IEND')])), /after its ending/);
});
