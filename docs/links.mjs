const channels = new Set(['facebook', 'reddit', 'youtube', 'quora', 'producthunt', 'github', 'flipboard', 'stackblitz', 'itchio', 'postman', 'mastodon', 'blogger', 'wordpress', 'pinterest', 'linkedin', 'bluesky', 'libhunt', 'google', 'bing', 'huggingface']);
const referralOrigins = new Map([
  ['https://libhunt.com', 'libhunt'], ['https://www.libhunt.com', 'libhunt'],
  ['https://google.com', 'google'], ['https://www.google.com', 'google'],
  ['https://bing.com', 'bing'], ['https://www.bing.com', 'bing'],
]);

export function isWorksheetChannel(channel) {
  return channels.has(channel);
}

export function worksheetSource(search = '', referrer = '') {
  const requested = new URLSearchParams(search).get('from');
  if (requested !== null) return isWorksheetChannel(requested) ? requested : null;
  try {
    return referralOrigins.get(new URL(referrer).origin) || null;
  } catch {
    return null;
  }
}

export function worksheetLink(href, search = '', referrer = '') {
  const url = new URL(href);
  if (url.origin !== 'https://seedancecheap.com') throw new Error('Worksheet links must stay on SeedanceCheap.');
  url.searchParams.set('utm_source', worksheetSource(search, referrer) || 'github');
  return url.href;
}

export function applyWorksheetLinks(root, search = '', referrer = root.referrer || '') {
  const source = worksheetSource(search, referrer) || 'github';
  for (const link of root.querySelectorAll('[data-site-link]')) {
    link.href = worksheetLink(link.href, search, referrer);
  }
  for (const link of root.querySelectorAll('[data-companion-link]')) {
    const url = new URL(link.href);
    url.searchParams.set('from', source);
    link.href = url.href;
  }
}
