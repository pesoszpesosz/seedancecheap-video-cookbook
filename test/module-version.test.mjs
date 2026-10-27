import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { versionModules } from '../scripts/version-modules.mjs';

test('a helper change updates cached entry and dependency URLs; a partial preparation reconciles without cleanup', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'cookbook-modules-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('cookbook-modules-'));
    await rm(directory, { recursive: true, force: true });
  });
  await writeFile(path.join(directory, 'index.html'), '<script type="module" src="./app.mjs?v=old"></script>');
  await writeFile(path.join(directory, 'guide.html'), "<script type=\"module\">import {channel} from './links.mjs';</script>");
  await writeFile(path.join(directory, 'app.mjs'), "import {channel} from './links.mjs?v=old';\nimport {budget} from './share.mjs?v=old';");
  await writeFile(path.join(directory, 'share.mjs'), "import {channel} from './links.mjs?v=old';\nexport const budget = 1;");
  await writeFile(path.join(directory, 'links.mjs'), "export const channel = 'github';");
  const first = await versionModules(directory);
  assert.equal((await versionModules(directory)).changedFiles.length, 0);
  await writeFile(path.join(directory, 'links.mjs'), "export const channel = 'quora';");
  const second = await versionModules(directory);
  assert.notEqual(second.version, first.version);
  for (const name of ['index.html', 'guide.html', 'app.mjs', 'share.mjs']) {
    const body = await readFile(path.join(directory, name), 'utf8');
    assert.ok(body.includes(`?v=${second.version}`), name);
    assert.equal(body.includes(first.version), false, name);
  }
  // Simulate an interruption between file replacements.
  await writeFile(path.join(directory, 'guide.html'), "<script type=\"module\">import {channel} from './links.mjs?v=old';</script>");
  const recovered = await versionModules(directory);
  assert.equal(recovered.version, second.version);
  assert.deepEqual(recovered.changedFiles, ['guide.html']);
  assert.equal((await versionModules(directory)).changedFiles.length, 0);
});
