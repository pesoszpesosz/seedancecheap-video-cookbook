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

test('video discovery lists visible public media and refuses stale player metadata', async () => {
  const parent = path.resolve(tmpdir());
  const root = await mkdtemp(path.join(parent, 'seedancecheap-video-discovery-'));
  try {
    await mkdir(path.join(root, 'scripts'));
    await mkdir(path.join(root, 'docs'));
    const script = path.join(root, 'scripts', 'update-discovery.mjs');
    await copyFile(new URL('../scripts/update-discovery.mjs', import.meta.url), script);
    for (const name of ['brand-icon.png', 'take.jpg', 'take.mp4', 'other.mp4']) await writeFile(path.join(root, 'docs', name), 'fixture asset');
    const base = 'https://pesoszpesosz.github.io/seedancecheap-video-cookbook/';
    const video = {'@context':'https://schema.org','@type':'VideoObject',name:'A take & its result',description:'Complete test <with> limitations.',thumbnailUrl:base+'take.jpg',contentUrl:base+'take.mp4',uploadDate:'2026-10-25'};
    const fixture = v => `<!doctype html>\n<html><head>\n  <title>Watch the take</title>\n  <meta name="description" content="A complete example.">\n  <script type="application/ld+json">${JSON.stringify(v)}</script>\n</head><body><video controls poster="take.jpg"><source src="take.mp4" type="video/mp4"></video></body></html>\n`;
    const page = path.join(root, 'docs', 'watch.html');
    await writeFile(page, fixture(video));
    await run(process.execPath, [script]);
    const sitemap = await readFile(path.join(root, 'docs', 'sitemap.xml'), 'utf8');
    assert.ok(sitemap.includes('<video:title>A take &amp; its result</video:title>'));
    assert.ok(sitemap.includes('<video:description>Complete test &lt;with&gt; limitations.</video:description>'));
    assert.ok(sitemap.includes(`<video:content_loc>${base}take.mp4</video:content_loc>`));
    await run(process.execPath, [script]);
    assert.equal(await readFile(path.join(root, 'docs', 'sitemap.xml'), 'utf8'), sitemap);
    await writeFile(page, fixture({...video, contentUrl:base+'other.mp4'}));
    await assert.rejects(run(process.execPath, [script]), /absent from the player/);
    assert.equal(await readFile(path.join(root, 'docs', 'sitemap.xml'), 'utf8'), sitemap);
    await writeFile(page, fixture({...video, contentUrl:'https://unrelated.example/take.mp4'}));
    await assert.rejects(run(process.execPath, [script]), /must reference a local public asset/);
  } finally {
    assert.equal(path.dirname(path.resolve(root)), parent);
    assert.ok(path.basename(root).startsWith('seedancecheap-video-discovery-'));
    await rm(root, {recursive:true, force:true});
  }
});
