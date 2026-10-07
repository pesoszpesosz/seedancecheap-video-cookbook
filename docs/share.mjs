import { calculate } from './cost.mjs';

const fields = ['credits', 'cents', 'attempts', 'restored', 'seconds', 'duration'];

export function readSharedBudget(hash) {
  const parameters = new URLSearchParams(hash.replace(/^#/, ''));
  if (!parameters.has('budget')) return null;
  if (parameters.getAll('budget').length !== 1 || parameters.get('budget') !== '1')
    throw new Error('This budget link uses an unsupported version.');
  const budget = {};
  for (const field of fields) {
    const values = parameters.getAll(field);
    if (values.length !== 1 || values[0].trim() === '')
      throw new Error('This budget link has missing or repeated numbers.');
    budget[field] = Number(values[0]);
  }
  calculate(budget);
  return budget;
}

export function sharedBudgetLink(pageUrl, budget) {
  calculate(budget);
  const url = new URL(pageUrl);
  const channel = url.searchParams.get('from');
  url.search = '';
  if (['facebook', 'reddit', 'youtube', 'github'].includes(channel)) url.searchParams.set('from', channel);
  const parameters = new URLSearchParams({ budget: '1' });
  for (const field of fields) parameters.set(field, String(budget[field]));
  url.hash = parameters.toString();
  return url.href;
}
