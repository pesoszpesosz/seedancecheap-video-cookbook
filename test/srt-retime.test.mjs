import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { retimeSrt } from '../docs/srt-retime.mjs';

const source = '1\n00:00:03,000 --> 00:00:05,000\nLeft\n\n2\n00:00:05,000 --> 00:00:06,000\nGone\n\n3\n00:00:06,000 --> 00:00:08,000\nRight\n\n4\n00:00:09,250 --> 00:00:10,750\n<i>Later</i>\nSecond line';
const ranges = '00:00:00.000 --> 00:00:04.000\n00:00:07.000 --> 00:00:12.000';

test('the runnable fight demo reproduces the published caption file', () => {
  const read = file => readFileSync(new URL(`../docs/${file}`, import.meta.url), 'utf8');
  const demoRanges = read('srt-retime.html').match(/data-kept-ranges="([^"]+)"/)[1];
  const result = retimeSrt(read('cut-the-fight-source.srt'), demoRanges);
  assert.equal(result.srt, read('cut-the-fight-retimed.srt').replaceAll('\r\n', '\n'));
  assert.equal(result.cueCount, 2);
  assert.equal(result.durationMs, 3800);
  assert.match(result.srt, /00:00:02,200 --> 00:00:03,300\nCake in the bag\./);
});

test('clips both boundaries, drops the removed cue, and shifts later cues', () => {
  const result = retimeSrt('\ufeff' + source.replaceAll('\n','\r\n'), ranges);
  assert.deepEqual(result, {
    srt: '1\n00:00:03,000 --> 00:00:04,000\nLeft\n\n2\n00:00:04,000 --> 00:00:05,000\nRight\n\n3\n00:00:06,250 --> 00:00:07,750\n<i>Later</i>\nSecond line\n\n',
    cueCount: 3, durationMs: 9000,
  });
});

test('joins contiguous pieces of one spanning cue', () => {
  const result = retimeSrt('1\n00:00:00,000 --> 00:00:11,000\nSame cue', ranges);
  assert.equal(result.srt, '1\n00:00:00,000 --> 00:00:08,000\nSame cue\n\n');
});

test('honors kept ranges in playback order and allows no overlap', () => {
  const result = retimeSrt(source, '00:00:07.000 --> 00:00:12.000\n00:00:00.000 --> 00:00:04.000');
  assert.match(result.srt, /^1\n00:00:00,000 --> 00:00:01,000\nRight/);
  assert.match(result.srt, /00:00:08,000 --> 00:00:09,000\nLeft/);
  assert.deepEqual(retimeSrt(source, '00:00:20.000 --> 00:00:21.000'), {srt:'',cueCount:0,durationMs:1000});
});

test('rejects malformed inputs and backwards ranges', () => {
  assert.throws(() => retimeSrt('', ranges), /paste captions/);
  assert.throws(() => retimeSrt(source, ''), /kept source range/);
  assert.throws(() => retimeSrt(source,'00:00:04.000 --> 00:00:00.000'), /must end after/);
  assert.throws(() => retimeSrt(source,'00:00:00.000 --> 00:00:60.000'), /Invalid timestamp/);
  assert.throws(() => retimeSrt('WEBVTT',ranges), /Invalid SRT cue/);
});

test('Spanish labels preserve caption bytes and localize malformed input', () => {
  assert.deepEqual(retimeSrt(source, ranges, 'es'), retimeSrt(source, ranges));
  assert.throws(() => retimeSrt(source, 'bad range', 'es'), /Tramo 1.*códigos de tiempo/);
  assert.throws(() => retimeSrt('WEBVTT', ranges, 'es'), /subtítulo 1.*SRT válido/);
});
