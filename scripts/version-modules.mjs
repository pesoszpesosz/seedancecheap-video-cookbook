import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// One version for the complete module graph. Ignore prior generated versions
// when hashing so an interrupted run can be repeated without cleanup.
const references = /((?:\bfrom\s*|\bimport\s*|\bsrc\s*=\s*)["'])((?:\.\/)?[a-z0-9-]+\.mjs)(?:\?v=[a-zA-Z0-9_-]+)?(["'])/g;

export async function versionModules(directory) {
  const names = (await readdir(directory)).filter(n => /\.(mjs|html)$/.test(n)).sort();
  const originals = new Map(await Promise.all(names.map(async name => [name, await readFile(path.join(directory, name), 'utf8')])));
  const normalized = value => value.replaceAll('\r\n', '\n').replace(references, '$1$2$3');
  const hash = createHash('sha256');
  for (const name of names.filter(n => n.endsWith('.mjs'))) hash.update(name + '\0' + normalized(originals.get(name)) + '\0');
  const version = hash.digest('hex').slice(0, 12);
  const prepared = [];
  for (const [name, original] of originals) {
    const next = original.replace(references, (_, prefix, target, quote) => {
      if (!originals.has(path.basename(target))) throw new Error(`Missing local module in ${name}: ${target}`);
      return `${prefix}${target}?v=${version}${quote}`;
    });
    if (next !== original) prepared.push([path.join(directory, name), next]);
  }
  // Validate every reference before replacing any file. Same-directory temporary
  // files keep activation atomic per file; a repeat reconciles a partial run.
  for (const [file, next] of prepared) {
    await writeFile(file + '.tmp', next);
    await rename(file + '.tmp', file);
  }
  return { version, changedFiles: prepared.map(([file]) => path.basename(file)) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await versionModules(fileURLToPath(new URL('../docs/', import.meta.url)))));
}
