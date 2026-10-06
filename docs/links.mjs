const channels = new Set(['facebook', 'reddit', 'youtube', 'github']);

export function worksheetLink(href, search = '') {
  const url = new URL(href);
  if (url.origin !== 'https://seedancecheap.com') throw new Error('Worksheet links must stay on SeedanceCheap.');
  const requested = new URLSearchParams(search).get('from');
  url.searchParams.set('utm_source', channels.has(requested) ? requested : 'github');
  return url.href;
}
