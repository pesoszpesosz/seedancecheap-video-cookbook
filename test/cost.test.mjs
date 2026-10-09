import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../docs/cost.mjs';
import { readSharedBudget, sharedBudgetLink } from '../docs/share.mjs';

const halfCredit = { credits:5, cents:1125, attempts:6, restored:1, seconds:18, duration:15, creditsPerClip:0.5 };

test('half-credit attempts separate net usage, generated seconds and whole-pack cash', () => {
  const result = calculate(halfCredit);
  assert.equal(result.netCredits, 2);
  assert.equal(result.netAttempts, 4);
  assert.equal(result.generatedSeconds, 60);
  assert.equal(result.allocatedCents, 450);
  assert.equal(result.perSecondCents, 25);
  assert.equal(result.minimumCashCents, 1125);
  assert.equal(result.unusedCredits, 3);
  assert.equal(result.approvedShare, 0.3);
});

test('one half-credit attempt leaves fractional balance and never invents approved footage', () => {
  const result = calculate({...halfCredit, credits:1, cents:250, attempts:1, restored:0, seconds:15});
  assert.equal(result.netCredits, 0.5);
  assert.equal(result.allocatedCents, 125);
  assert.equal(result.minimumCashCents, 250);
  assert.equal(result.unusedCredits, 0.5);
  assert.throws(() => calculate({...halfCredit, seconds:60.01}));
  assert.throws(() => calculate({...halfCredit, restored:0.25}));
  assert.throws(() => calculate({...halfCredit, restored:3.5}));
  for (const creditsPerClip of [0, -1, Infinity, NaN]) assert.throws(() => calculate({...halfCredit, creditsPerClip}));
});

test('all confirmed charges restored means zero usage, zero approved seconds and no effective cost', () => {
  const result = calculate({...halfCredit, restored:3, seconds:0});
  assert.equal(result.netCredits, 0);
  assert.equal(result.minimumCashCents, 0);
  assert.equal(result.perSecondCents, null);
  assert.throws(() => calculate({...halfCredit, restored:3, seconds:1}));
});

test('new links preserve half-credit terms and reject missing or conflicting rate fields', () => {
  const hash = new URL(sharedBudgetLink('https://example.com/', halfCredit)).hash;
  assert.deepEqual(readSharedBudget(hash), halfCredit);
  for (const broken of [hash.replace('&creditsPerClip=0.5',''), hash+'&creditsPerClip=1', hash.replace('budget=2','budget=3'), hash.replace('budget=2','budget=1')]) {
    assert.throws(() => readSharedBudget(broken));
  }
});

test('legacy custom 15-second links still charge one credit, not the new model rate', () => {
  const legacy = readSharedBudget('#budget=1&credits=5&cents=1125&attempts=6&restored=2&seconds=18&duration=15');
  assert.equal(legacy.creditsPerClip, undefined);
  assert.equal(calculate(legacy).allocatedCents, 900);
  assert.equal(calculate(legacy).generatedSeconds, 60);
});
