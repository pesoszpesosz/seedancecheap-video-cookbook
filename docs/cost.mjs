export const packs = [
  { credits: 1, cents: 250 }, { credits: 2, cents: 500 },
  { credits: 5, cents: 1125 }, { credits: 10, cents: 2000 },
  { credits: 20, cents: 3000 },
];

export function calculate({ credits, cents, attempts, restored, seconds, duration }) {
  if (![credits, cents, attempts, restored, seconds, duration].every(Number.isFinite))
    throw new Error('Enter a number in every field.');
  if (!Number.isInteger(credits) || credits < 1 || credits > 100000)
    throw new Error('A pack must contain 1–100,000 whole credits.');
  if (!Number.isInteger(cents) || cents < 1 || cents > 100000000)
    throw new Error('Enter a positive pack price, with at most two decimal places.');
  if (![attempts, restored].every(n => Number.isInteger(n) && n >= 0 && n <= 100000))
    throw new Error('Attempts and restored credits must be whole numbers from 0 to 100,000.');
  if (restored > attempts) throw new Error('Restored credits cannot exceed charged paid attempts.');
  if (duration <= 0 || duration > 3600) throw new Error('Clip length must be greater than zero and at most 3,600 seconds.');
  const netCredits = attempts - restored;
  if (seconds < 0 || seconds > netCredits * duration)
    throw new Error('Approved seconds cannot exceed the unique footage from non-restored paid attempts. Exclude free trials and repeated loops.');
  const packCount = Math.ceil(netCredits / credits);
  const allocatedCents = netCredits * cents / credits;
  return {
    netCredits, packCount, allocatedCents,
    minimumCashCents: packCount * cents,
    unusedCredits: packCount * credits - netCredits,
    unitCents: cents / credits,
    perSecondCents: seconds > 0 ? allocatedCents / seconds : null,
    approvedShare: netCredits > 0 ? seconds / (netCredits * duration) : null,
  };
}
