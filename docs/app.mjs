import { packs, calculate } from './cost.mjs';
import { worksheetLink } from './links.mjs';

for (const link of document.querySelectorAll('[data-site-link]')) {
  link.href = worksheetLink(link.href, location.search);
}

const $ = id => document.getElementById(id);
const money = cents => cents > 0 && cents < 0.01 ? '<$0.0001' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(cents / 100);
const form = $('calculator');
const number = id => $(id).value.trim() === '' ? NaN : Number($(id).value);

function render() {
  const custom = $('pack').value === 'custom';
  $('custom-fields').hidden = !custom;
  const pack = custom ? { credits: number('pack-credits'), cents: Math.round(number('pack-price') * 100) } : packs[Number($('pack').value)];
  $('duration').readOnly = !custom;
  if (!custom) $('duration').value = '30';
  try {
    if (custom && Math.abs(number('pack-price') * 100 - pack.cents) > 0.000001)
      throw new Error('Enter the pack total with at most two decimal places.');
    const result = calculate({ ...pack, attempts: number('attempts'), restored: number('restored'), seconds: number('seconds'), duration: number('duration') });
    $('error').hidden = true;
    $('results').hidden = false;
    $('allocated').textContent = money(result.allocatedCents);
    $('effective').textContent = result.perSecondCents === null ? '—' : money(result.perSecondCents);
    $('cash').textContent = money(result.minimumCashCents);
    $('leftover').textContent = `${result.unusedCredits} unused credit${result.unusedCredits === 1 ? '' : 's'}`;
    $('breakdown').textContent = `${number('attempts')} charged − ${number('restored')} restored = ${result.netCredits} net credits × ${money(result.unitCents)} per credit.`;
    $('cash-detail').textContent = `${result.packCount} whole pack${result.packCount === 1 ? '' : 's'} of the selected size, assuming no starting balance and all restorations completed. Other pack combinations may cost less; this can be below what you actually paid.`;
    $('approved-detail').textContent = result.approvedShare === null ? 'No paid footage recorded yet.' : `${number('seconds')} approved seconds from ${result.netCredits * number('duration')} non-restored generated seconds (${Math.round(result.approvedShare * 100)}%).`;
    $('empty-footage').hidden = number('seconds') > 0;
    $('kept-bar').style.width = `${(result.approvedShare ?? 0) * 100}%`;
  } catch (error) {
    $('results').hidden = true;
    $('error').hidden = false;
    $('error').textContent = error.message;
  }
}

form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('input', render);
form.addEventListener('change', render);
$('example').addEventListener('click', () => {
  $('pack').value = '2'; $('attempts').value = '6'; $('restored').value = '2'; $('seconds').value = '18';
  render();
});
$('restore-defaults').addEventListener('click', () => { form.reset(); render(); });
render();
