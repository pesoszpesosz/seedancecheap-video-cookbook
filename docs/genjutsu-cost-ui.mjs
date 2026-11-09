import { calculateMetered } from './metered-cost.mjs?v=56806da38d4b';
import { applyWorksheetLinks } from './links.mjs?v=56806da38d4b';

applyWorksheetLinks(document, location.search);

const form = document.querySelector('#metered-form');
const ids = ['rate', 'input-seconds', 'billed-output', 'output-seconds', 'attempts', 'restored-attempts', 'approved-seconds'];
const currency = amount => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: amount > 0 && amount < 0.01 ? 6 : 4,
}).format(amount);
function render() {
  const error = document.querySelector('#cost-error');
  const results = document.querySelector('#metered-results');
  try {
    const values = ids.map(id => {
      const raw = document.getElementById(id).value.trim();
      return raw === '' ? NaN : Number(raw);
    });
    const [rate, inputSeconds, billedOutputSeconds, outputSeconds, attempts, restoredAttempts, approvedSeconds] = values;
    const result = calculateMetered({ rate, inputSeconds, billedOutputSeconds, outputSeconds, attempts, restoredAttempts, approvedSeconds });
    document.querySelector('#usage').textContent = currency(result.netUsageUSD);
    document.querySelector('#per-approved').textContent = result.perApprovedSecondUSD === null ? 'No approved footage' : `${currency(result.perApprovedSecondUSD)} / s`;
    document.querySelector('#seconds-equation').textContent = `${inputSeconds} input + ${billedOutputSeconds} output = ${result.billedSecondsPerAttempt} billed seconds per attempt`;
    document.querySelector('#usage-explanation').textContent = `${attempts} charged attempt${attempts === 1 ? '' : 's'} − ${restoredAttempts} fully restored = ${result.netAttempts} net paid. ${result.netBilledSeconds} billed seconds × ${currency(rate)} = ${currency(result.netUsageUSD)} net usage.`;
    document.querySelector('#approved-explanation').textContent = `${approvedSeconds} approved unique seconds out of ${result.outputAvailable} output seconds from net paid attempts. This is generation usage only; reference creation, editing, fees and taxes are separate.`;
    error.hidden = true;
    results.hidden = false;
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
    results.hidden = true;
  }
}
form.addEventListener('input', render);
form.addEventListener('submit', event => event.preventDefault());
document.querySelector('#discard-example').addEventListener('click', () => {
  [0.10, 10, 10, 10, 3, 0, 10].forEach((value, i) => document.getElementById(ids[i]).value = value);
  render();
});
form.addEventListener('reset', event => {
  event.preventDefault();
  for (const id of ids) {
    const field = document.getElementById(id);
    field.value = field.defaultValue;
  }
  render();
});
render();
