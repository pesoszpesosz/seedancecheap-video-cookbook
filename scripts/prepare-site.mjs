import { versionModules } from './version-modules.mjs';
import { fileURLToPath } from 'node:url';

console.log(JSON.stringify(await versionModules(fileURLToPath(new URL('../docs/', import.meta.url)))));
await import('./update-discovery.mjs');
