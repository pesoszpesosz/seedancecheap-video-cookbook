import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { notifyIndexNow } from '../scripts/notify-indexnow.mjs';

const base = 'https://pesoszpesosz.github.io/seedancecheap-video-cookbook/';
const url = base + 'watch.html';
const bytes = Buffer.from('<link rel="canonical" href="' + url + '">');
const key = 'fixture-validation-key';

async function scenario(work) {
  const parent = path.resolve(os.tmpdir());
  const directory = await mkdtemp(path.join(parent, 'cookbook-indexnow-'));
  try {
    await work(directory);
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), parent);
    assert.ok(path.basename(directory).startsWith('cookbook-indexnow-'));
    await rm(directory, { recursive: true, force: true });
  }
}

function routes(submit, page = bytes) {
  return async (address, options) => {
    if (address === url) return new Response(page);
    if (address === base + 'sitemap-pages.txt') return new Response(url + '\n');
    if (address === base + 'indexnow.txt') return new Response(key + '\n');
    assert.equal(address, 'https://api.indexnow.org/indexnow');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), {
      host: 'pesoszpesosz.github.io', key, keyLocation: base + 'indexnow.txt', urlList: [url],
    });
    return submit();
  };
}

test('two concurrent calls and a rerun submit the exact revision once', () => scenario(async directory => {
  let posts = 0;
  const request = routes(() => { posts++; return new Response(null, { status: 200 }); });
  const results = await Promise.all([
    notifyIndexNow('watch.html', bytes, directory, request),
    notifyIndexNow('watch.html', bytes, directory, request),
  ]);
  assert.equal(posts, 1);
  const sent = results.find(result => result.submittedThisRun);
  assert.equal(sent.status, 'accepted_for_processing');
  const rerun = await notifyIndexNow('watch.html', bytes, directory, () => assert.fail('Unexpected network request'));
  assert.equal(rerun.submittedThisRun, false);
  assert.equal(rerun.indexingVerified, false);
  assert.equal(rerun.status, 'accepted_for_processing');
  assert.ok(!(await readFile(sent.receipt, 'utf8')).includes(key));
}));

test('an older deployed page blocks submission before a reservation', () => scenario(async directory => {
  const request = routes(() => assert.fail('Unexpected POST'), Buffer.from('old bytes'));
  await assert.rejects(notifyIndexNow('watch.html', bytes, directory, request), /deployed page bytes differ/);
  const result = await notifyIndexNow('watch.html', bytes, directory, routes(() => new Response(null, { status: 202 })));
  assert.equal(result.status, 'key_validation_pending');
}));

test('an ambiguous POST outcome survives a rerun without another request', () => scenario(async directory => {
  const request = routes(() => { throw new Error('Socket timed out'); });
  const first = await notifyIndexNow('watch.html', bytes, directory, request);
  assert.equal(first.status, 'submission_outcome_unknown');
  const second = await notifyIndexNow('watch.html', bytes, directory, () => assert.fail('Unexpected network request'));
  assert.equal(second.status, first.status);
  assert.equal(second.submittedThisRun, false);
}));
