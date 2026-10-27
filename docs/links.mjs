const channels = new Set(['facebook', 'reddit', 'youtube', 'quora', 'producthunt', 'github', 'flipboard', 'stackblitz', 'itchio', 'postman', 'mastodon', 'blogger', 'wordpress', 'pinterest']);

export function isWorksheetChannel(channel) {
  return channels.has(channel);
}

export function worksheetLink(href, search = '') {
  const url = new URL(href);
  if (url.origin !== 'https://seedancecheap.com') throw new Error('Worksheet links must stay on SeedanceCheap.');
  const requested = new URLSearchParams(search).get('from');
  url.searchParams.set('utm_source', isWorksheetChannel(requested) ? requested : 'github');
  return url.href;
}

export function applyWorksheetLinks(root, search = '') {
  const source = new URL(worksheetLink('https://seedancecheap.com/', search)).searchParams.get('utm_source');
  for (const link of root.querySelectorAll('[data-site-link]')) {
    link.href = worksheetLink(link.href, search);
  }
  for (const link of root.querySelectorAll('[data-companion-link]')) {
    const url = new URL(link.href);
    url.searchParams.set('from', source);
    link.href = url.href;
  }
}
