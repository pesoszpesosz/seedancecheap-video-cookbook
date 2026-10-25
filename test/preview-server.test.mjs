import test from 'node:test';
import assert from 'node:assert/strict';
import { cookbookServer } from '../scripts/serve-cookbook.mjs';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

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

test('preview video ranges let a browser seek without restarting at zero', async () => {
  const server = cookbookServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/motion-courier-clay.mp4`;
  const original = await readFile(new URL('../docs/motion-courier-clay.mp4', import.meta.url));
  try {
    const range = await fetch(url, { headers: { Range: 'bytes=32-63' } });
    assert.equal(range.status, 206);
    assert.equal(range.headers.get('content-range'), `bytes 32-63/${original.length}`);
    assert.equal(range.headers.get('content-length'), '32');
    assert.deepEqual(Buffer.from(await range.arrayBuffer()), original.subarray(32, 64));
    const suffix = await fetch(url, { headers: { Range: 'bytes=-8' } });
    assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), original.subarray(-8));
    const head = await fetch(url, { method: 'HEAD', headers: { Range: 'bytes=32-' } });
    assert.equal(head.status, 206);
    assert.equal(head.headers.get('content-length'), String(original.length - 32));
    assert.equal(await head.text(), '');
    for (const requested of [`bytes=${original.length}-`, 'bytes=-0', 'bytes=-', 'bytes=0-1,4-5', 'bytes=9-2']) {
      const invalid = await fetch(url, { headers: { Range: requested } });
      assert.equal(invalid.status, 416, requested);
      assert.equal(invalid.headers.get('content-range'), `bytes */${original.length}`);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
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
