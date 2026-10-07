import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../docs/cost.mjs';
import { readSharedBudget, sharedBudgetLink } from '../docs/share.mjs';
import { worksheetLink } from '../docs/links.mjs';

const example = { credits: 5, cents: 1125, attempts: 6, restored: 2, seconds: 18, duration: 30 };
const page = 'https://pesoszpesosz.github.io/seedancecheap-video-cookbook/';

test('the shared worked example opens the same costs', () => {
  const opened = readSharedBudget(new URL(sharedBudgetLink(page, example)).hash);
  assert.deepEqual(opened, example);
  const result = calculate(opened);
  assert.equal(result.allocatedCents, 900);
  assert.equal(result.minimumCashCents, 1125);
  assert.equal(result.perSecondCents, 50);
  assert.equal(result.unusedCredits, 1);
});

test('custom rates, fractional seconds and clip length survive sharing', () => {
  const custom = { credits: 8, cents: 999, attempts: 9, restored: 1, seconds: 12.75, duration: 2.5 };
  const opened = readSharedBudget(new URL(sharedBudgetLink(page, custom)).hash);
  assert.deepEqual(opened, custom);
  assert.equal(calculate(opened).allocatedCents, 999);
});

test('no approved footage has no invented cost per approved second', () => {
  const opened = readSharedBudget(new URL(sharedBudgetLink(page, { ...example, seconds: 0 })).hash);
  assert.equal(calculate(opened).perSecondCents, null);
});

test('only the known channel is retained, not arbitrary URL data', () => {
  const shared = new URL(sharedBudgetLink(page + '?from=facebook&private_note=do-not-share&token=secret#other', example));
  assert.equal(shared.search, '?from=facebook');
  assert.equal(shared.href.includes('private_note'), false);
  assert.equal(shared.href.includes('secret'), false);
  const site = new URL(worksheetLink('https://seedancecheap.com/?utm_source=github', shared.search));
  assert.equal(site.searchParams.get('utm_source'), 'facebook');
  assert.equal(new URL(sharedBudgetLink(page + '?from=unknown', example)).search, '');
});

test('incomplete, repeated, impossible and unsupported budgets are rejected', () => {
  const valid = new URL(sharedBudgetLink(page, example)).hash;
  for (const invalid of [
    valid.replace('&cents=1125', ''),
    valid + '&attempts=3',
    valid.replace('restored=2', 'restored=7'),
    valid.replace('seconds=18', 'seconds=121'),
    valid.replace('cents=1125', 'cents='),
    valid.replace('duration=30', 'duration=Infinity'),
    valid.replace('budget=1', 'budget=2'),
    valid + '&budget=1',
  ]) assert.throws(() => readSharedBudget(invalid));
  assert.throws(() => sharedBudgetLink(page, { ...example, seconds: 121 }));
});

test('ordinary links keep the default worksheet behavior', () => {
  assert.equal(readSharedBudget(''), null);
  assert.equal(readSharedBudget('#example'), null);
});
