import test from 'node:test';
import assert from 'node:assert/strict';
import { availabilityPage } from '../scripts/update-availability.mjs';

const snapshot = { status: 'maintenance', observedAt: '2026-11-01T03:50:00Z', source: 'private-supplier-name' };
const page = '<html><head><title>Example</title></head><body><main><p>15s/720p: $0.99; $99 upfront.</p><aside>Unrelated note</aside></main></body></html>';

test('dated availability preserves prices and unrelated content without publishing private source fields', () => {
  const result = availabilityPage(page, snapshot);
  assert.match(result, /2026-11-01 03:50 UTC/);
  assert.match(result, /At this check[\s\S]*were under maintenance/);
  assert.ok(result.includes('<p>15s/720p: $0.99; $99 upfront.</p><aside>Unrelated note</aside>'));
  assert.ok(!result.includes(snapshot.source));
});

test('rerunning preparation reconciles the same notice without stacking or changing CRLF pages', () => {
  const input = page.replace('</head>', '\r\n</head>');
  const once = availabilityPage(input, snapshot);
  assert.equal(availabilityPage(once, snapshot), once);
  assert.equal((once.match(/data-campaign-availability="budget-seedance25"/g) || []).length, 1);
});

test('replaces the legacy present-tense notice and only clears maintenance for an explicit new available state', () => {
  const legacy = page.replace('<main>', '<main><aside data-capacity-notice="old">Offers remain unavailable.</aside>');
  const current = availabilityPage(legacy, { ...snapshot, announcedEnd: '2026-10-31T23:59:00Z' });
  assert.ok(!current.includes('remain unavailable'));
  assert.match(current, /were under maintenance/);
  const recovered = availabilityPage(current, { status: 'available', modelIdentityVerified: true, observedAt: '2026-11-02T08:00:00Z' });
  assert.ok(!recovered.includes('campaign-availability'));
  assert.ok(recovered.includes('<aside>Unrelated note</aside>'));
});

test('German notices are localized and invalid or undated states fail before a public claim', () => {
  assert.match(availabilityPage(page, snapshot, 'de'), /Verfügbarkeit geprüft/);
  assert.match(availabilityPage(page, snapshot, 'de'), /wegen Wartung nicht verfügbar/);
  assert.throws(() => availabilityPage(page, { status: 'ready' }), /Unrecognized/);
  assert.throws(() => availabilityPage(page, { status: 'maintenance', observedAt: 'invalid' }), /observation time/);
});

test('limited recovery offers the qualified HD backup without promising Genjutsu, 30 seconds or matching old demo provenance', () => {
  const limited = { status: 'limited', modelIdentityVerified: true, observedAt: '2026-11-03T22:30:00Z', source: 'private-provider-evidence' };
  const result = availabilityPage(availabilityPage(page, snapshot), limited);
  assert.match(result, /720p text-to-video and image-guided requests of 5, 10 or 15 seconds/);
  assert.ok(result.includes('0.5 credit: an allocated $0.495 from the $99 upfront pack of 100 credits'));
  assert.match(result, /does not support Genjutsu\/source-video guidance or 30-second clips/);
  assert.match(result, /earlier films below came from other options/);
  assert.match(result, /data-site-link href="https:\/\/seedancecheap.com\/studio2\//);
  assert.ok(!result.includes(limited.source));
  assert.ok(result.includes('<p>15s/720p: $0.99; $99 upfront.</p>'));
  assert.equal(availabilityPage(result, limited), result);
  assert.match(availabilityPage(page, limited, 'de'), /720p für 5, 10 oder 15 Sekunden/);
});

test('model review replaces the active offer notice without disclosing private evidence or keeping its purchase CTA', () => {
  const live = availabilityPage(page, { status: 'limited', modelIdentityVerified: true, observedAt: '2026-11-03T22:30:00Z' });
  const review = { status: 'review', observedAt: '2026-11-04T11:55:00Z', source: 'private-model-evidence' };
  const result = availabilityPage(live, review);
  assert.match(result, /verifying the model identity/);
  assert.match(result, /promotional price claim is temporarily paused/);
  assert.ok(!result.includes('backup_720_nov4'));
  assert.ok(!result.includes('A new Seedance 2.5 backup offers'));
  assert.ok(!result.includes(review.source));
  assert.equal(availabilityPage(result, review), result);
  assert.match(availabilityPage(page, review, 'de'), /Modellzuordnung/);
});

test('catalogue recovery alone cannot restore a model claim after an identity conflict', () => {
  for (const status of ['available', 'limited']) {
    assert.throws(() => availabilityPage(page, { status, observedAt: '2026-11-04T11:55:00Z' }), /Confirm model identity/);
    assert.throws(() => availabilityPage(page, { status, modelIdentityVerified: false, observedAt: '2026-11-04T11:55:00Z' }), /Confirm model identity/);
  }
});
