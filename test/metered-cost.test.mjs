import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMetered } from '../docs/metered-cost.mjs';

const quote = { rate: 0.1, inputSeconds: 10, billedOutputSeconds: 10, outputSeconds: 10, attempts: 1, restoredAttempts: 0, approvedSeconds: 10 };
test('input and output billing stay separate from approved output', () => {
  const r = calculateMetered(quote);
  assert.equal(r.perAttemptUSD, 2);
  assert.equal(r.netBilledSeconds, 20);
  assert.equal(r.outputAvailable, 10);
  assert.equal(r.perApprovedSecondUSD, 0.2);
  assert.throws(() => calculateMetered({ ...quote, approvedSeconds: 20 }), /unique output/);
});
test('creative rejects remain paid; confirmed full restorations remove charge and footage', () => {
  const discarded = calculateMetered({ ...quote, attempts: 3 });
  assert.equal(discarded.netUsageUSD, 6);
  assert.equal(discarded.perApprovedSecondUSD, 0.6);
  const restored = calculateMetered({ ...quote, attempts: 3, restoredAttempts: 1 });
  assert.equal(restored.netUsageUSD, 4);
  assert.equal(restored.outputAvailable, 20);
  assert.throws(() => calculateMetered({ ...quote, attempts: 3, restoredAttempts: 1, approvedSeconds: 30 }), /unique output/);
});
test('zero accepted footage has no usable-second price, even after all charges are restored', () => {
  assert.equal(calculateMetered({ ...quote, approvedSeconds: 0 }).perApprovedSecondUSD, null);
  const r = calculateMetered({ ...quote, restoredAttempts: 1, approvedSeconds: 0 });
  assert.equal(r.netUsageUSD, 0);
  assert.equal(r.perApprovedSecondUSD, null);
});
test('billable seconds are already quoted: no extra rounding or invented input trimming', () => {
  const r = calculateMetered({ ...quote, inputSeconds: 9.25, billedOutputSeconds: 10, outputSeconds: 9.1, approvedSeconds: 9.1 });
  assert.equal(r.billedSecondsPerAttempt, 19.25);
  assert.equal(r.netUsageUSD, 1.925);
});
test('invalid money, seconds and attempt accounting cannot produce a displayed price', () => {
  for (const change of [
    { rate: NaN }, { rate: Infinity }, { rate: 0 }, { rate: -1 }, { inputSeconds: -1 },
    { billedOutputSeconds: 0 }, { outputSeconds: 0 }, { attempts: 0 }, { attempts: 1.5 },
    { restoredAttempts: 0.5 }, { restoredAttempts: 2 }, { approvedSeconds: -1 }, { approvedSeconds: Infinity },
  ]) assert.throws(() => calculateMetered({ ...quote, ...change }));
});
