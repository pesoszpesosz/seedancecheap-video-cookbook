import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const output = process.argv[2];
if (!output) throw new Error('Pass the destination index.html file.');
const base = 'https://pesoszpesosz.github.io/seedancecheap-video-cookbook/';
const docs = new URL('../docs/', import.meta.url);
let html = await readFile(new URL('index.html', docs), 'utf8');
const modules = [];
for (const name of ['cost.mjs', 'links.mjs', 'share.mjs', 'app.mjs']) {
  let source = await readFile(new URL(name, docs), 'utf8');
  source = source.replace(/^import [^\n]+\r?\n/gm, '').replace(/^export /gm, '');
  if (name === 'app.mjs') {
    source = source.replaceAll('location.search', "'?from=stackblitz'");
    source = source.replace('sharedBudgetLink(location.href,', 'sharedBudgetLink(' + JSON.stringify(base + '?from=stackblitz') + ',');
  }
  modules.push('// Inlined from ' + name + '\n' + source);
}
const entry = /<script type="module" src="\.\/app\.mjs(?:\?[^"<>]*)?"><\/script>/;
if (!entry.test(html)) throw new Error('Expected the canonical calculator entry point.');
html = html.replace(entry, () => '<script type="module">\n' + modules.join('\n') + '\n</script>');
const header = '<a class="brand" href="./">seedancecheap / cookbook</a>';
if (!html.includes(header)) throw new Error('Expected the canonical brand link.');
html = html.replace(header, '<a class="brand" data-site-link href="https://seedancecheap.com/studio2/?utm_source=stackblitz&amp;utm_medium=calculator&amp;utm_campaign=usable_footage_calculator&amp;utm_content=header#generate">SeedanceCheap.com</a>');
html = html.replace(/\b(href|src|poster)="([^"<>]+)"/g, (match, attribute, value) => {
  if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(value)) return match;
  return attribute + '="' + new URL(value, base).href + '"';
});
const destination = resolve(output);
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, html, 'utf8');
console.log(JSON.stringify({ destination, bytes: Buffer.byteLength(html), source: 'docs/index.html plus the four canonical calculator modules', publicShareBase: base + '?from=stackblitz' }));
