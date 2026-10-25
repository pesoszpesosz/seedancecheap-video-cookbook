import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, copyFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const run = promisify(execFile);

test('discovery update preserves literal prices, page body and repeat-run output', async () => {
  const parent = path.resolve(tmpdir());
  const root = await mkdtemp(path.join(parent, 'seedancecheap-discovery-'));
  try {
    await mkdir(path.join(root, 'scripts'));
    await mkdir(path.join(root, 'docs'));
    const script = path.join(root, 'scripts', 'update-discovery.mjs');
    await copyFile(new URL('../scripts/update-discovery.mjs', import.meta.url), script);
    const description = 'A $1.25 request, $2.50 starter and $99 pack. Literal $&amp; stays literal.';
    const fixture = `<!doctype html>\n<html><head>\n  <title>Videos for $1.25</title>\n  <meta name="description" content="${description}">\n</head><body><p>Original body and $1.25 price.</p></body></html>\n`;
    const page = path.join(root, 'docs', 'index.html');
    await writeFile(page, fixture);
    await writeFile(path.join(root, 'docs', 'brand-icon.png'), 'fixture image');
    await run(process.execPath, [script]);
    const once = await readFile(page, 'utf8');
    assert.ok(once.includes(`<meta property="og:description" content="${description}">`));
    assert.ok(once.includes(`<meta name="twitter:description" content="${description}">`));
    assert.ok(once.includes('<meta property="og:title" content="Videos for $1.25">'));
    assert.equal(once.match(/<meta name="description"/g)?.length, 1);
    assert.equal(once.slice(once.indexOf('</head>')), fixture.slice(fixture.indexOf('</head>')));
    await run(process.execPath, [script]);
    assert.equal(await readFile(page, 'utf8'), once);
  } finally {
    assert.equal(path.dirname(path.resolve(root)), parent);
    assert.ok(path.basename(root).startsWith('seedancecheap-discovery-'));
    await rm(root, {recursive:true, force:true});
  }
});
