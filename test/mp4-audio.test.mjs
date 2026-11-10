import assert from 'node:assert/strict';
import { openAsBlob } from 'node:fs';
import test from 'node:test';
import { inspectMp4Audio } from '../docs/mp4-audio.mjs';

function atom(type, ...contents) {
  const payload = Buffer.concat(contents);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(header.length + payload.length);
  header.write(type, 4, 'ascii');
  return Buffer.concat([header, payload]);
}

function track(id, type, sizes) {
  const header = Buffer.alloc(16);
  header.writeUInt32BE(id, 12);
  const handler = Buffer.alloc(24);
  handler.write(type, 8, 'ascii');
  const media = [atom('hdlr', handler)];
  if (sizes) media.push(atom('minf', atom('stbl', sizes)));
  return atom('trak', atom('tkhd', header), atom('mdia', ...media));
}

function sampleTable({ count, fixedSize = 0, compactWidth = 0, entries = Buffer.alloc(0) }) {
  const payload = Buffer.alloc(12);
  payload.writeUInt32BE(count, 8);
  if (compactWidth) payload.writeUInt8(compactWidth, 7);
  else payload.writeUInt32BE(fixedSize, 4);
  return atom(compactWidth ? 'stz2' : 'stsz', payload, entries);
}

function file(...tracks) {
  return new Blob([atom('ftyp', Buffer.from('isom\0\0\0\0')), atom('moov', ...tracks), atom('mdat', Buffer.alloc(8))]);
}

test('the published reference trim lists 24 audio samples', async () => {
  const reference = await openAsBlob(new URL('../docs/trim-audio-test-reference.mp4', import.meta.url));
  assert.deepEqual(await inspectMp4Audio(reference), [24]);
});

test('the published fragmented source lists 142 audio samples across its runs', async () => {
  const source = await openAsBlob(new URL('../docs/trim-audio-test-source.mp4', import.meta.url));
  assert.deepEqual(await inspectMp4Audio(source), [142]);
});

test('distinguishes a video-only export from an empty audio track', async () => {
  const video = track(1, 'vide');
  assert.deepEqual(await inspectMp4Audio(file(video)), []);
  assert.deepEqual(await inspectMp4Audio(file(video, track(2, 'soun', sampleTable({ count: 0 })))), [0]);
});

test('reports each audio track in order for fixed and compact sample-size tables', async () => {
  const fixed = sampleTable({ count: 8, fixedSize: 2 });
  const compact = sampleTable({ count: 3, compactWidth: 4, entries: Buffer.from([0x12, 0x30]) });
  const movie = file(track(1, 'soun', fixed), track(2, 'vide'), track(3, 'soun', compact));
  assert.deepEqual(await inspectMp4Audio(movie), [8, 3]);
});

test('rejects a truncated box, an incomplete sample table, and an audio track without a table', async () => {
  const incomplete = sampleTable({ count: 2, entries: Buffer.alloc(4) });
  const valid = file(track(1, 'vide'));
  for (const invalid of [valid.slice(0, -1), file(track(1, 'soun', incomplete)), file(track(1, 'soun'))]) {
    await assert.rejects(inspectMp4Audio(invalid), /Could not read the MP4 track table/);
  }
});
