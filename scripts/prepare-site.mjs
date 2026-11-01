import { versionModules } from './version-modules.mjs';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { reconcileAvailability } from './update-availability.mjs';

const availability = JSON.parse(await readFile(new URL('../campaign-availability.json', import.meta.url), 'utf8'));
console.log(JSON.stringify(await reconcileAvailability(fileURLToPath(new URL('../docs/', import.meta.url)), availability)));
console.log(JSON.stringify(await versionModules(fileURLToPath(new URL('../docs/', import.meta.url)))));
await import('./update-discovery.mjs');
