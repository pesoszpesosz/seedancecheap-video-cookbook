import { calculate } from './cost.mjs';

const fields = ['credits', 'cents', 'attempts', 'restored', 'seconds', 'duration'];

export function readSharedBudget(hash) {
  const parameters = new URLSearchParams(hash.replace(/^#/, ''));
  if (!parameters.has('budget')) return null;
  const version = parameters.get('budget');
  if (parameters.getAll('budget').length !== 1 || !['1', '2'].includes(version))
    throw new Error('This budget link uses an unsupported version.');
  const budget = {};
  for (const field of version === '2' ? [...fields, 'creditsPerClip'] : fields) {
    const values = parameters.getAll(field);
    if (values.length !== 1 || values[0].trim() === '')
      throw new Error('This budget link has missing or repeated numbers.');
    budget[field] = Number(values[0]);
  }
  if (version === '1' && parameters.has('creditsPerClip'))
    throw new Error('Legacy budget links assume one credit per clip.');
  calculate(budget);
  return budget;
}

export function sharedBudgetLink(pageUrl, budget) {
  calculate(budget);
  const url = new URL(pageUrl);
  const channel = url.searchParams.get('from');
  url.search = '';
  if (['facebook', 'reddit', 'youtube', 'github'].includes(channel)) url.searchParams.set('from', channel);
  const version = budget.creditsPerClip === undefined ? '1' : '2';
  const parameters = new URLSearchParams({ budget: version });
  for (const field of fields) parameters.set(field, String(budget[field]));
  if (version === '2') parameters.set('creditsPerClip', String(budget.creditsPerClip));
  url.hash = parameters.toString();
  return url.href;
}
