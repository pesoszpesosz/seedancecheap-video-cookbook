import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { compareAudioPackets } from '../docs/audio-packet-match.mjs';

const example = JSON.parse(await readFile(new URL('../docs/two-tone-audio-reports.json', import.meta.url), 'utf8'));

test('identifies the second source track even when both have 47 packets', () => {
  assert.deepEqual(compareAudioPackets(example.source, example.exported), [{
    index: 0, packetCount: 47, matches: [{ index: 2, title: '880 Hz (selected)' }],
  }]);
});

test('does not match reordered or incomplete packets', () => {
  const reversed = { ...example.exported, packets: [...example.exported.packets].reverse() };
  const incomplete = { ...example.exported, packets: example.exported.packets.slice(0, -1) };
  for (const report of [reversed, incomplete]) {
    assert.deepEqual(compareAudioPackets(example.source, report)[0].matches, []);
  }
});

test('reports ambiguity when multiple source streams have identical payloads', () => {
  const source = {
    streams: [...example.source.streams, { index: 3, codec_type: 'audio' }],
    packets: [...example.source.packets, ...example.exported.packets.map(packet => ({ ...packet, stream_index: 3 }))],
  };
  assert.deepEqual(compareAudioPackets(source, example.exported)[0].matches.map(track => track.index), [2, 3]);
});

test('distinguishes an absent stream from a declared stream with zero packets', () => {
  assert.deepEqual(compareAudioPackets(example.source, { streams: [], packets: [] }), []);
  assert.deepEqual(compareAudioPackets(example.source, { ...example.exported, packets: [] }), [{
    index: 0, packetCount: 0, matches: [],
  }]);
});

test('rejects packets with invalid hashes or unknown stream IDs', () => {
  const packets = example.exported.packets;
  for (const packet of [
    { ...packets[0], data_hash: 'SHA256:bad' },
    { ...packets[0], stream_index: 77 },
  ]) {
    assert.throws(() => compareAudioPackets(example.source, { ...example.exported, packets: [packet] }), /valid SHA-256 hash/);
  }
});
