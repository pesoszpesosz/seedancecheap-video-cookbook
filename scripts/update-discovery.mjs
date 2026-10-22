import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Reuse each page's actual title/description; no generated claims or dates.
const docs = fileURLToPath(new URL('../docs/', import.meta.url));
const base = 'https://pesoszpesosz.github.io/seedancecheap-video-cookbook/';
const decode = s => s.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
const escape = s => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const names = (await readdir(docs)).filter(name => name.endsWith('.html')).sort();
const pages = [];

for (const name of names) {
  const file = path.join(docs, name);
  const original = await readFile(file, 'utf8');
  const title = original.match(/<title>([^<]+)<\/title>/i)?.[1];
  const description = original.match(/<meta name="description" content="([^"]+)"\s*\/?>/i)?.[1];
  if (!title || !description) throw new Error(`Missing actual title/description: ${name}`);
  const shareImage = original.match(/<meta name="share-image" content="([^"]+)"\s*\/?>/i)?.[1] ?? 'brand-icon.png';
  const shareImageAlt = original.match(/<meta name="share-image-alt" content="([^"]+)"\s*\/?>/i)?.[1] ?? 'SeedanceCheap studio logo';
  if (path.basename(shareImage) !== shareImage || !/^[a-z0-9][a-z0-9._-]*\.(png|jpg|webp)$/i.test(shareImage)) throw new Error(`Share image must be a local filename: ${name}`);
  await readFile(path.join(docs, shareImage));
  const card = shareImage === 'brand-icon.png' ? 'summary' : 'summary_large_image';
  const canonical = new URL(name === 'index.html' ? './' : name, base).href;
  const block = [
    '  <!-- Discovery metadata: maintained by scripts/update-discovery.mjs -->',
    `  <link rel="canonical" href="${canonical}">`,
    '  <link rel="icon" type="image/png" href="brand-icon.png">',
    `  <meta property="og:type" content="website">`,
    `  <meta property="og:site_name" content="SeedanceCheap Creator Cookbook">`,
    `  <meta property="og:title" content="${escape(decode(title))}">`,
    `  <meta property="og:description" content="${escape(decode(description))}">`,
    `  <meta property="og:url" content="${canonical}">`,
    `  <meta property="og:image" content="${base}${escape(shareImage)}">`,
    `  <meta property="og:image:alt" content="${escape(decode(shareImageAlt))}">`,
    `  <meta name="twitter:card" content="${card}">`,
    `  <meta name="twitter:title" content="${escape(decode(title))}">`,
    `  <meta name="twitter:description" content="${escape(decode(description))}">`,
    `  <meta name="twitter:image" content="${base}${escape(shareImage)}">`,
    '  <!-- /Discovery metadata -->',
  ].join('\n');
  let next = original.replace(/^  <!-- Discovery metadata:[\s\S]*?^  <!-- \/Discovery metadata -->\r?\n/gm, '');
  next = next.replace(/^\s*<link rel="canonical"[^>]+>\r?\n/gm, '');
  next = next.replace(/(<meta name="description" content="[^"]+"\s*\/?>)\r?\n/i, `$1\n${block}\n`);
  if (next.slice(next.indexOf('</head>')) !== original.slice(original.indexOf('</head>'))) {
    throw new Error(`Unexpected body change: ${name}`);
  }
  if (next !== original) await writeFile(file, next);
  pages.push({ file: name, canonical });
}

pages.sort((a, b) => a.canonical.localeCompare(b.canonical));
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + pages.map(p => `  <url><loc>${escape(p.canonical)}</loc></url>`).join('\n')
  + '\n</urlset>\n';
const sitemapPath = path.join(docs, 'sitemap.xml');
const previousSitemap = await readFile(sitemapPath, 'utf8').catch(e => {
  if (e.code === 'ENOENT') return '';
  throw e;
});
if (previousSitemap !== sitemap) await writeFile(sitemapPath, sitemap);
console.log(JSON.stringify({ pages: pages.length, sitemap: base + 'sitemap.xml', bodyChanges: 0 }));
