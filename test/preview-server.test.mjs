import test from 'node:test';
import assert from 'node:assert/strict';
import { cookbookServer } from '../scripts/serve-cookbook.mjs';

test('preview serves the existing calculator, guide and module without serving repository files', async () => {
  const server = cookbookServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const calculator = await fetch(base + '/?from=github');
    assert.equal(calculator.status, 200);
    assert.match(await calculator.text(), /usable-footage calculator/i);
    const guide = await fetch(base + '/api-request.html');
    assert.equal(guide.status, 200);
    assert.match(await guide.text(), /request ID/i);
    const module = await fetch(base + '/api-request.mjs?v=example');
    assert.match(module.headers.get('content-type'), /^text\/javascript/);
    for (const path of ['/README.md', '/package.json', '/.git/config', '/%2e%2e%2fREADME.md', '/missing.html']) {
      assert.equal((await fetch(base + path)).status, 404, path);
    }
    assert.equal((await fetch(base + '/', { method: 'POST', body: 'do not submit' })).status, 405);
    assert.equal(await (await fetch(base + '/', { method: 'HEAD' })).text(), '');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
