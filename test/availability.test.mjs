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
  const recovered = availabilityPage(current, { status: 'available', observedAt: '2026-11-02T08:00:00Z' });
  assert.ok(!recovered.includes('campaign-availability'));
  assert.ok(recovered.includes('<aside>Unrelated note</aside>'));
});

test('German notices are localized and invalid or undated states fail before a public claim', () => {
  assert.match(availabilityPage(page, snapshot, 'de'), /Verfügbarkeit geprüft/);
  assert.match(availabilityPage(page, snapshot, 'de'), /wegen Wartung nicht verfügbar/);
  assert.throws(() => availabilityPage(page, { status: 'ready' }), /Unrecognized/);
  assert.throws(() => availabilityPage(page, { status: 'maintenance', observedAt: 'invalid' }), /observation time/);
});
