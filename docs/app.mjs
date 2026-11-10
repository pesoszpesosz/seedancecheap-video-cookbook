import { packs, clipTerms, calculate, planCreditPacks } from './cost.mjs?v=a5c7cabbaa89';
import { applyWorksheetLinks, worksheetLink } from './links.mjs?v=a5c7cabbaa89';
import { readSharedBudget, sharedBudgetLink } from './share.mjs?v=a5c7cabbaa89';

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
  const model = $('model').value;
  const terms = clipTerms[model];
  $('duration').readOnly = Boolean(terms);
  $('credits-per-clip').readOnly = Boolean(terms);
  if (terms) {
    $('duration').value = terms.duration;
    $('credits-per-clip').value = terms.creditsPerClip;
  }
  $('restored').step = terms ? String(terms.creditsPerClip) : 'any';
  const destination = !terms || model.startsWith('seedance-2.5')
    ? 'https://seedancecheap.com/studio2/?utm_medium=calculator&utm_campaign=usable_footage_calculator&utm_content=model_availability#generate'
    : `https://seedancecheap.com/app.html?model=${model}&utm_medium=calculator&utm_campaign=usable_footage_calculator&utm_content=model_availability`;
  $('model-availability').href = worksheetLink(destination, location.search, document.referrer);
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
  $('model').value = 'custom'; $('duration').value = '15'; $('credits-per-clip').value = '1'; $('attempts').value = '3'; $('restored').value = '0'; $('seconds').value = '15';
  render();
});
$('restore-defaults').addEventListener('click', () => { form.reset(); render(); });
$('share-budget').addEventListener('click', () => {
  if (!currentBudget) return;
  $('budget-link').value = sharedBudgetLink(location.href, currentBudget, document.referrer);
  $('shared-budget').hidden = false;
  $('budget-link').focus();
  $('budget-link').select();
});

function loadSharedBudget(moveToWorksheet = true) {
  form.reset();
  $('shared-notice').hidden = true;
  try {
    const shared = readSharedBudget(location.hash);
    if (shared) {
      const preset = packs.findIndex(pack => pack.credits === shared.credits && pack.cents === shared.cents);
      $('pack').value = preset < 0 ? 'custom' : String(preset);
      // A numeric shared budget does not establish the model that produced it.
      $('model').value = 'custom';
      $('pack-credits').value = shared.credits;
      $('pack-price').value = (shared.cents / 100).toFixed(2);
      $('attempts').value = shared.attempts;
      $('restored').value = shared.restored;
      $('seconds').value = shared.seconds;
      $('duration').value = shared.duration;
      $('credits-per-clip').value = shared.creditsPerClip ?? 1;
      $('shared-notice').textContent = 'Shared numeric budget loaded. Its numbers do not establish model identity or current availability; review a live quote before purchasing.';
      $('shared-notice').hidden = false;
      if (moveToWorksheet) {
        const heading = $('input-heading');
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({ block: 'start' });
      }
    }
  } catch {
    $('shared-notice').textContent = 'This shared budget could not be loaded. The worksheet is using its defaults; enter your numbers below.';
    $('shared-notice').hidden = false;
  }
}
form.addEventListener('input', () => { $('shared-notice').hidden = true; });
form.addEventListener('change', () => { $('shared-notice').hidden = true; });
for (const id of ['example', 'restore-defaults']) $(id).addEventListener('click', () => { $('shared-notice').hidden = true; });
window.addEventListener('hashchange', () => {
  if (location.hash === '#budget' || !new URLSearchParams(location.hash.slice(1)).has('budget')) return;
  loadSharedBudget(); render();
});
const navigationType = performance.getEntriesByType('navigation')[0]?.type;
// Preserve the browser's saved reading position on reload and history traversal.
loadSharedBudget(navigationType !== 'reload' && navigationType !== 'back_forward');
render();

const packForm = $('pack-planner-form');
const formatCredits = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format;
function renderPackPlan() {
  try {
    const result = planCreditPacks({ creditsPerRequest: number('planner-quote'), attempts: number('planner-attempts'), balance: number('planner-balance') });
    $('pack-plan-error').hidden = true;
    $('pack-plan-result').hidden = false;
    $('pack-plan-cash').textContent = money(result.cashCents);
    $('pack-plan-requirement').textContent = `Your batch uses ${formatCredits(result.requiredCredits)} credits.`;
    const mix = result.counts.flatMap((count, index) => count ? [`${count} × ${packs[index].credits}-credit pack`] : []);
    $('pack-plan-mix').textContent = mix.length
      ? `This combination uses ${mix.join(' + ')}.`
      : 'Your current balance covers this batch.';
    $('pack-plan-remaining').textContent = `${formatCredits(result.remainingCredits)} credits left after the planned requests.`;
  } catch (error) {
    $('pack-plan-result').hidden = true;
    $('pack-plan-error').hidden = false;
    $('pack-plan-error').textContent = error.message;
  }
}
packForm.addEventListener('submit', event => event.preventDefault());
packForm.addEventListener('input', renderPackPlan);
renderPackPlan();
