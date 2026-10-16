import test from 'node:test';
import assert from 'node:assert/strict';
import { cookbookServer } from '../scripts/serve-cookbook.mjs';
import { spawn } from 'node:child_process';

test('the documented launch starts from the current checkout path', async () => {
  const child = spawn(process.execPath, ['scripts/serve-cookbook.mjs'], { cwd: process.cwd(), env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  assert.ok(Number.isInteger(child.pid) && child.pid > 0);
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Preview entry point did not start')), 3000);
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Preview exited with ${code}`)); });
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.stdout.on('data', data => {
        const match = String(data).match(/http:\/\/localhost:(\d+)/);
        if (match) { clearTimeout(timer); resolve(Number(match[1])); }
      });
    });
    assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status, 200);
  } finally {
    // Only the exact child created above; never a console-wide signal.
    if (child.exitCode === null) child.kill();
  }
});

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
