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
const videos = [];

for (const name of names) {
  const file = path.join(docs, name);
  const original = await readFile(file, 'utf8');
  const title = original.match(/<title>([^<]+)<\/title>/i)?.[1];
  const description = original.match(/<meta name="description" content="([^"]+)"\s*\/?>/i)?.[1];
  if (!title || !description) throw new Error(`Missing actual title/description: ${name}`);
  for (const match of original.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const video = JSON.parse(match[1]);
    if (video['@type'] !== 'VideoObject') continue;
    for (const field of ['name', 'description', 'thumbnailUrl', 'contentUrl', 'uploadDate']) {
      if (typeof video[field] !== 'string' || !video[field].trim()) throw new Error(`Missing video ${field}: ${name}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(video.uploadDate)
        || !Number.isFinite(Date.parse(video.uploadDate))) throw new Error(`Video uploadDate needs a full datetime with timezone: ${name}`);
    for (const field of ['thumbnailUrl', 'contentUrl']) {
      const asset = video[field].startsWith(base) ? video[field].slice(base.length) : '';
      if (!/^[a-z0-9][a-z0-9._-]*\.(jpg|png|webp|mp4)$/i.test(asset)) throw new Error(`Video ${field} must reference a local public asset: ${name}`);
      await readFile(path.join(docs, asset));
      const attribute = field === 'contentUrl' ? 'src' : 'poster';
      if (!original.includes(`${attribute}="${asset}"`)) throw new Error(`Video ${field} is absent from the player: ${name}`);
    }
    videos.push({ file: name, video });
  }
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
  // A callback keeps prices such as $1.25 literal instead of expanding $1 as a capture.
  next = next.replace(/(<meta name="description" content="[^"]+"\s*\/?>)\r?\n/i, (_, descriptionTag) => `${descriptionTag}\n${block}\n`);
  if (next.slice(next.indexOf('</head>')) !== original.slice(original.indexOf('</head>'))) {
    throw new Error(`Unexpected body change: ${name}`);
  }
  // Git can check out CRLF on Windows. Do not rewrite otherwise unchanged pages.
  if (next.replaceAll('\r\n', '\n') !== original.replaceAll('\r\n', '\n')) await writeFile(file, next);
  pages.push({ file: name, canonical, videos: videos.filter(v => v.file === name).map(v => v.video) });
}

pages.sort((a, b) => a.canonical.localeCompare(b.canonical));
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n'
  + pages.map(p => {
    const entries = p.videos.map(v => `\n    <video:video>\n      <video:thumbnail_loc>${escape(v.thumbnailUrl)}</video:thumbnail_loc>\n      <video:title>${escape(v.name)}</video:title>\n      <video:description>${escape(v.description)}</video:description>\n      <video:content_loc>${escape(v.contentUrl)}</video:content_loc>\n      <video:publication_date>${escape(v.uploadDate)}</video:publication_date>\n      <video:requires_subscription>no</video:requires_subscription>\n    </video:video>`).join('');
    return `  <url><loc>${escape(p.canonical)}</loc>${entries}</url>`;
  }).join('\n')
  + '\n</urlset>\n';
const sitemapPath = path.join(docs, 'sitemap.xml');
const previousSitemap = await readFile(sitemapPath, 'utf8').catch(e => {
  if (e.code === 'ENOENT') return '';
  throw e;
});
if (previousSitemap !== sitemap) await writeFile(sitemapPath, sitemap);
console.log(JSON.stringify({ pages: pages.length, videos: videos.length, sitemap: base + 'sitemap.xml', bodyChanges: 0 }));
