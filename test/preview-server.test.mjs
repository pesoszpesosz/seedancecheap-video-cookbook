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
    const starter = await fetch(base + '/genjutsu-courier-starter.zip');
    assert.equal(starter.status, 200);
    assert.equal(starter.headers.get('content-type'), 'application/zip');
    assert.deepEqual(Buffer.from(await starter.arrayBuffer()), await readFile(new URL('../docs/genjutsu-courier-starter.zip', import.meta.url)));
    const project = await fetch(base + '/casting-brand-kit.brand.json');
    assert.equal(project.status, 200);
    assert.match(project.headers.get('content-type'), /^application\/json/);
    const originalProject = await readFile(new URL('../docs/casting-brand-kit.brand.json', import.meta.url));
    assert.deepEqual(Buffer.from(await project.arrayBuffer()), originalProject);
    assert.equal(JSON.parse(originalProject).pages.length, 3);
    assert.equal((await fetch(base + '/brand-canvas-stunt-department.brand.json')).status, 200);
    for (const file of ['cut-the-fight-source.srt', 'cut-the-fight-retimed.srt']) {
      const captions = await fetch(`${base}/${file}`);
      assert.equal(captions.status, 200);
      assert.match(captions.headers.get('content-type'), /^text\/plain/);
      assert.deepEqual(Buffer.from(await captions.arrayBuffer()), await readFile(new URL(`../docs/${file}`, import.meta.url)));
    }
    for (const path of ['/README.md', '/package.json', '/.git/config', '/%2e%2e%2fREADME.md', '/missing.html']) {
      assert.equal((await fetch(base + path)).status, 404, path);
    }
    assert.equal((await fetch(base + '/', { method: 'POST', body: 'do not submit' })).status, 405);
    assert.equal(await (await fetch(base + '/', { method: 'HEAD' })).text(), '');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('music examples load and seek as audio in the local preview', async () => {
  const server = cookbookServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [file, type] of [['cobalt-gold-two-minute-score.mp3', 'audio/mpeg'], ['cobalt-gold-two-minute-score.wav', 'audio/wav']]) {
      const original = await readFile(new URL(`../docs/${file}`, import.meta.url));
      const head = await fetch(`${base}/${file}`, { method: 'HEAD' });
      assert.equal(head.status, 200);
      assert.equal(head.headers.get('content-type'), type);
      assert.equal(head.headers.get('content-length'), String(original.length));
      const range = await fetch(`${base}/${file}`, { headers: { Range: 'bytes=1000-1063' } });
      assert.equal(range.status, 206);
      assert.equal(range.headers.get('content-range'), `bytes 1000-1063/${original.length}`);
      assert.deepEqual(Buffer.from(await range.arrayBuffer()), original.subarray(1000, 1064));
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
