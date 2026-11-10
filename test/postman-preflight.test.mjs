import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {runInNewContext} from 'node:vm';

const file = new URL('../docs/seedancecheap-video-preflight.postman_collection.json', import.meta.url);
const collection = JSON.parse(readFileSync(file, 'utf8'));
const code = collection.event[0].script.exec.join('\n');
const now = 1794300000;
const valid = {
  checked_at: now,
  generation_status: 'available',
  available_formats: [{ratio: '9:16', size: '720x1280'}],
};

function runChecks(body, status = 200) {
  const results = [];
  const pm = {
    response: {code: status, json: () => JSON.parse(body)},
    expect: value => ({to: {equal: expected => assert.equal(value, expected)}}),
    test(_name, callback) {
      try {
        callback();
        results.push(true);
      } catch (error) {
        if (error.code !== 'ERR_ASSERTION') throw error;
        results.push(false);
      }
    },
  };
  runInNewContext(code, {pm, Date: {now: () => now * 1000}});
  return results;
}

test('portable collection has only the two public no-auth GETs', () => {
  assert.deepEqual(collection.auth, {type: 'noauth'});
  assert.equal(collection.event.length, 1);
  assert.equal(collection.event[0].listen, 'test');
  assert.equal(collection.variable, undefined);
  assert.equal(collection.item.length, 2);
  const recipes = ['veo31-text-8s-720', 'veo31-ingredients-8s-720'];
  for (const [index, item] of collection.item.entries()) {
    assert.deepEqual(Object.keys(item.request).sort(), ['description', 'method', 'url']);
    assert.equal(item.request.method, 'GET');
    assert.equal(item.request.url, `https://seedancecheap.com/api/availability?model=${recipes[index]}`);
    assert.match(item.request.description, new RegExp(`model=${recipes[index]}&ratio=9%3A16`));
  }
});

test('portable checks reject crossed, stale, unavailable and invalid responses', () => {
  assert.deepEqual(runChecks(JSON.stringify(valid)), [true, true, true]);
  const crossed = [{ratio: '9:16', size: '1280x720'}, {ratio: '16:9', size: '720x1280'}];
  assert.deepEqual(runChecks(JSON.stringify({...valid, available_formats: crossed})), [true, true, false]);
  assert.deepEqual(runChecks(JSON.stringify({...valid, checked_at: now - 121})), [true, false, false]);
  assert.deepEqual(runChecks(JSON.stringify({...valid, checked_at: now + 16})), [true, false, false]);
  assert.deepEqual(runChecks(JSON.stringify({...valid, generation_status: 'unavailable'})), [true, true, false]);
  assert.deepEqual(runChecks(JSON.stringify(valid), 503), [false, true, false]);
  assert.deepEqual(runChecks('invalid JSON'), [true, false, false]);
});
