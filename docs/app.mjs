import { packs, clipTerms, calculate } from './cost.mjs';
import { applyWorksheetLinks, worksheetLink } from './links.mjs';
import { readSharedBudget, sharedBudgetLink } from './share.mjs';

applyWorksheetLinks(document, location.search);

const $ = id => document.getElementById(id);
const money = cents => cents > 0 && cents < 0.01 ? '<$0.0001' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(cents / 100);
const form = $('calculator');
const number = id => $(id).value.trim() === '' ? NaN : Number($(id).value);
let currentBudget = null;

function render() {
  const custom = $('pack').value === 'custom';
  $('custom-fields').hidden = !custom;
  const pack = custom ? { credits: number('pack-credits'), cents: Math.round(number('pack-price') * 100) } : packs[Number($('pack').value)];
  const terms = clipTerms[$('model').value];
  $('duration').readOnly = Boolean(terms);
  $('credits-per-clip').readOnly = Boolean(terms);
  if (terms) {
    $('duration').value = terms.duration;
    $('credits-per-clip').value = terms.creditsPerClip;
  }
  $('restored').step = terms ? String(terms.creditsPerClip) : 'any';
  $('model-availability').hidden = !terms;
  if (terms) $('model-availability').href = worksheetLink(`https://seedancecheap.com/app.html?model=${$('model').value}&utm_medium=calculator&utm_campaign=usable_footage_calculator&utm_content=model_availability`, location.search);
  $('shared-budget').hidden = true;
  currentBudget = null;
  $('share-budget').disabled = true;
  try {
    if (custom && Math.abs(number('pack-price') * 100 - pack.cents) > 0.000001)
      throw new Error('Enter the pack total with at most two decimal places.');
    const budget = { ...pack, attempts: number('attempts'), restored: number('restored'), seconds: number('seconds'), duration: number('duration'), creditsPerClip: number('credits-per-clip') };
    const result = calculate(budget);
    currentBudget = budget;
    $('share-budget').disabled = false;
    $('error').hidden = true;
    $('results').hidden = false;
    $('allocated').textContent = money(result.allocatedCents);
    $('effective').textContent = result.perSecondCents === null ? '—' : money(result.perSecondCents);
    $('cash').textContent = money(result.minimumCashCents);
    $('leftover').textContent = `${result.unusedCredits} unused credit${result.unusedCredits === 1 ? '' : 's'}`;
    $('breakdown').textContent = `${budget.attempts} attempts × ${budget.creditsPerClip} credits − ${budget.restored} restored credits = ${result.netCredits} net credits × ${money(result.unitCents)} per credit.`;
    $('cash-detail').textContent = `${result.packCount} whole pack${result.packCount === 1 ? '' : 's'} of the selected size, assuming no starting balance and all restorations completed. Other pack combinations may cost less; this can be below what you actually paid.`;
    $('approved-detail').textContent = result.approvedShare === null ? 'No paid footage recorded yet.' : `${budget.seconds} approved seconds from ${result.generatedSeconds} non-restored generated seconds (${Math.round(result.approvedShare * 100)}%).`;
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
  $('model').value = 'seedance-2.5'; $('pack').value = '2'; $('attempts').value = '6'; $('restored').value = '2'; $('seconds').value = '18';
  render();
});
$('restore-defaults').addEventListener('click', () => { form.reset(); render(); });
$('share-budget').addEventListener('click', () => {
  if (!currentBudget) return;
  $('budget-link').value = sharedBudgetLink(location.href, currentBudget);
  $('shared-budget').hidden = false;
  $('budget-link').focus();
  $('budget-link').select();
});

function loadSharedBudget() {
  form.reset();
  $('shared-notice').hidden = true;
  try {
    const shared = readSharedBudget(location.hash);
    if (shared) {
      const preset = packs.findIndex(pack => pack.credits === shared.credits && pack.cents === shared.cents);
      $('pack').value = preset < 0 ? 'custom' : String(preset);
      $('model').value = Object.keys(clipTerms).find(model => clipTerms[model].duration === shared.duration && clipTerms[model].creditsPerClip === (shared.creditsPerClip ?? 1)) ?? 'custom';
      $('pack-credits').value = shared.credits;
      $('pack-price').value = (shared.cents / 100).toFixed(2);
      $('attempts').value = shared.attempts;
      $('restored').value = shared.restored;
      $('seconds').value = shared.seconds;
      $('duration').value = shared.duration;
      $('credits-per-clip').value = shared.creditsPerClip ?? 1;
      $('shared-notice').textContent = 'Shared budget loaded. The link preserves the selected rate and numbers; check the current offer before purchasing.';
      $('shared-notice').hidden = false;
    }
  } catch {
    $('shared-notice').textContent = 'This shared budget could not be loaded. The worksheet is using its defaults; enter your numbers below.';
    $('shared-notice').hidden = false;
  }
}
form.addEventListener('input', () => { $('shared-notice').hidden = true; });
form.addEventListener('change', () => { $('shared-notice').hidden = true; });
for (const id of ['example', 'restore-defaults']) $(id).addEventListener('click', () => { $('shared-notice').hidden = true; });
window.addEventListener('hashchange', () => { loadSharedBudget(); render(); });
loadSharedBudget();
render();
