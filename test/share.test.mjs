import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../docs/cost.mjs';
import { readSharedBudget, sharedBudgetLink } from '../docs/share.mjs';
import { worksheetLink, applyWorksheetLinks } from '../docs/links.mjs';

test('campaign readers keep a coarse channel through sharing without forwarding private query data', () => {
  for (const channel of ['mastodon', 'blogger', 'wordpress', 'pinterest']) {
    const destination = new URL(worksheetLink('https://seedancecheap.com/?utm_campaign=one_idea_oct22#draft', `?from=${channel}&email=private@example.test&token=secret`));
    assert.equal(destination.searchParams.get('utm_source'), channel);
    assert.equal(destination.searchParams.get('utm_campaign'), 'one_idea_oct22');
    assert.equal(destination.hash, '#draft');
    assert.equal(destination.searchParams.has('email'), false);
    assert.equal(destination.searchParams.has('token'), false);
  }
  assert.equal(new URL(worksheetLink('https://seedancecheap.com/', '?from=wordpress.evil.test')).searchParams.get('utm_source'), 'github');
});

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
  const pinterest = new URL(sharedBudgetLink(page + '?from=pinterest&private_note=do-not-share&token=secret', example));
  assert.equal(pinterest.search, '?from=pinterest');
  assert.deepEqual(readSharedBudget(pinterest.hash), example);
});

test('Flipboard readers keep their source through a shared budget and the website route', () => {
  const shared = new URL(sharedBudgetLink(page + '?from=flipboard&private_note=do-not-share&token=secret', example));
  assert.equal(shared.search, '?from=flipboard');
  const site = new URL(worksheetLink('https://seedancecheap.com/api?model=seedance-2.5#availability', shared.search));
  assert.equal(site.searchParams.get('utm_source'), 'flipboard');
  assert.equal(site.searchParams.get('model'), 'seedance-2.5');
  assert.equal(site.hash, '#availability');
  assert.equal(shared.href.includes('secret'), false);
});

test('StackBlitz readers retain only their reviewed source in a stable public budget link', () => {
  const shared = new URL(sharedBudgetLink(page + '?from=stackblitz&private_note=do-not-share&token=secret', example));
  assert.equal(shared.origin, 'https://pesoszpesosz.github.io');
  assert.equal(shared.search, '?from=stackblitz');
  assert.deepEqual(readSharedBudget(shared.hash), example);
  const site = new URL(worksheetLink('https://seedancecheap.com/api?model=seedance-2.5#availability', shared.search));
  assert.equal(site.searchParams.get('utm_source'), 'stackblitz');
  assert.equal(site.searchParams.get('model'), 'seedance-2.5');
  assert.equal(site.hash, '#availability');
  assert.equal(shared.href.includes('secret'), false);
});

test('itch.io budgets retain their numbers and source through sharing and website navigation', () => {
  const shared = new URL(sharedBudgetLink(page + '?from=itchio&private_note=do-not-share&token=secret', example));
  assert.equal(shared.search, '?from=itchio');
  assert.deepEqual(readSharedBudget(shared.hash), example);
  const site = new URL(worksheetLink('https://seedancecheap.com/api?model=seedance-2.5#availability', shared.search));
  assert.equal(site.searchParams.get('utm_source'), 'itchio');
  assert.equal(site.searchParams.get('model'), 'seedance-2.5');
  assert.equal(site.hash, '#availability');
  assert.equal(shared.href.includes('secret'), false);
});

test('Postman readers retain their source through a shared budget without private query data', () => {
  const shared = new URL(sharedBudgetLink(page + '?from=postman&private_note=do-not-share&token=secret', example));
  assert.equal(shared.search, '?from=postman');
  assert.deepEqual(readSharedBudget(shared.hash), example);
  const site = new URL(worksheetLink('https://seedancecheap.com/api?model=seedance-2.5#availability', shared.search));
  assert.equal(site.searchParams.get('utm_source'), 'postman');
  assert.equal(site.searchParams.get('model'), 'seedance-2.5');
  assert.equal(site.hash, '#availability');
  assert.equal(shared.href.includes('secret'), false);
});

test('a Postman request-planner visit keeps its source through another guide and the website', () => {
  const siteLinks = [{ href: 'https://seedancecheap.com/?utm_source=github&utm_medium=cookbook' }];
  const companions = [{ href: page + 'first-scene.html' }];
  const root = { querySelectorAll: selector => selector === '[data-site-link]' ? siteLinks : companions };
  applyWorksheetLinks(root, '?from=postman&private_note=do-not-share&token=secret');
  assert.equal(new URL(siteLinks[0].href).searchParams.get('utm_source'), 'postman');
  assert.equal(new URL(siteLinks[0].href).searchParams.get('utm_medium'), 'cookbook');
  assert.equal(new URL(companions[0].href).search, '?from=postman');
  assert.equal(new URL(worksheetLink('https://seedancecheap.com/characters', new URL(companions[0].href).search)).searchParams.get('utm_source'), 'postman');
  assert.equal(JSON.stringify([siteLinks, companions]).includes('secret'), false);
});

test('reviewed campaign sources keep attribution through a guide, shared budget and Studio without private query data', () => {
  for (const channel of ['quora', 'producthunt', 'bluesky']) {
  const siteLinks = [{ href: 'https://seedancecheap.com/studio2/?utm_medium=guide&utm_campaign=hd_workflows_oct27#genjutsu' }];
  const companions = [{ href: page + 'native-1080p.html' }, { href: page }];
  const root = { querySelectorAll: selector => selector === '[data-site-link]' ? siteLinks : companions };
  applyWorksheetLinks(root, `?from=${channel}&private_note=do-not-forward&token=secret`);
  const studio = new URL(siteLinks[0].href);
  assert.equal(studio.searchParams.get('utm_source'), channel);
  assert.equal(studio.searchParams.get('utm_campaign'), 'hd_workflows_oct27');
  assert.equal(studio.hash, '#genjutsu');
  for (const companion of companions) assert.equal(new URL(companion.href).search, `?from=${channel}`);
  const shared = new URL(sharedBudgetLink(companions[1].href, example));
  assert.equal(shared.search, `?from=${channel}`);
  assert.deepEqual(readSharedBudget(shared.hash), example);
  const onward = new URL(worksheetLink('https://seedancecheap.com/studio2/#generate', shared.search));
  assert.equal(onward.searchParams.get('utm_source'), channel);
  assert.equal(onward.hash, '#generate');
  assert.equal(JSON.stringify([siteLinks, companions, shared.href, onward.href]).includes('secret'), false);
  assert.equal(new URL(worksheetLink('https://seedancecheap.com/', `?from=${channel}.evil.test`)).searchParams.get('utm_source'), 'github');
  }
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
