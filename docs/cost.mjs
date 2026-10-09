export const packs = [
  { credits: 1, cents: 250 }, { credits: 2, cents: 500 },
  { credits: 5, cents: 1125 }, { credits: 10, cents: 2000 },
  { credits: 20, cents: 3000 },
];

export const clipTerms = {
  'seedance-2.5': { duration: 30, creditsPerClip: 1 },
  'seedance-2.0': { duration: 15, creditsPerClip: 0.5 },
};

export function calculate({ credits, cents, attempts, restored, seconds, duration, creditsPerClip = 1 }) {
  if (![credits, cents, attempts, restored, seconds, duration, creditsPerClip].every(Number.isFinite))
    throw new Error('Enter a number in every field.');
  if (!Number.isInteger(credits) || credits < 1 || credits > 100000)
    throw new Error('A pack must contain 1–100,000 whole credits.');
  if (!Number.isInteger(cents) || cents < 1 || cents > 100000000)
    throw new Error('Enter a positive pack price, with at most two decimal places.');
  if (!Number.isInteger(attempts) || attempts < 0 || attempts > 100000)
    throw new Error('Attempts must be whole numbers from 0 to 100,000.');
  if (creditsPerClip <= 0 || creditsPerClip > 100000)
    throw new Error('Credits per clip must be greater than zero and at most 100,000.');
  const restoredAttempts = restored / creditsPerClip;
  if (restored < 0 || restoredAttempts > attempts || Math.abs(restoredAttempts - Math.round(restoredAttempts)) > 0.00000001)
    throw new Error('Restored credits must match whole restored attempts at the selected clip rate, without exceeding the original charge.');
  if (duration <= 0 || duration > 3600) throw new Error('Clip length must be greater than zero and at most 3,600 seconds.');
  const netAttempts = attempts - Math.round(restoredAttempts);
  const netCredits = netAttempts * creditsPerClip;
  const generatedSeconds = netAttempts * duration;
  if (seconds < 0 || seconds > generatedSeconds)
    throw new Error('Approved seconds cannot exceed the unique footage from non-restored paid attempts. Exclude free trials and repeated loops.');
  const packCount = Math.ceil(netCredits / credits);
  const allocatedCents = netCredits * cents / credits;
  return {
    netCredits, netAttempts, generatedSeconds, packCount, allocatedCents,
    minimumCashCents: packCount * cents,
    unusedCredits: packCount * credits - netCredits,
    unitCents: cents / credits,
    perSecondCents: seconds > 0 ? allocatedCents / seconds : null,
    approvedShare: netAttempts > 0 ? seconds / generatedSeconds : null,
  };
}
