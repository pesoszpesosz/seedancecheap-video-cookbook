export const packs = [
  { credits: 1, cents: 250 }, { credits: 2, cents: 500 },
  { credits: 5, cents: 1125 }, { credits: 10, cents: 2000 },
  { credits: 20, cents: 3000 }, { credits: 100, cents: 9900 },
];

export function planCreditPacks({ creditsPerRequest, attempts, balance }) {
  const scale = 1_000_000;
  const quote = Math.round(creditsPerRequest * scale);
  const owned = Math.round(balance * scale);
  if (!Number.isFinite(creditsPerRequest) || quote < 1 || quote > 10_000 * scale || Math.abs(creditsPerRequest * scale - quote) > 0.00001)
    throw new Error('Enter a positive quote up to 10,000 credits, with at most six decimal places.');
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 1_000)
    throw new Error('Enter 1 to 1,000 planned requests.');
  if (!Number.isFinite(balance) || balance < 0 || owned > 100_000 * scale || Math.abs(balance * scale - owned) > 0.0001)
    throw new Error('Enter an existing balance from 0 to 100,000 credits, with at most six decimal places.');

  const total = quote * attempts;
  if (total > 10_000 * scale) throw new Error('Plan a batch totaling 10,000 credits or fewer.');
  const missing = Math.max(0, total - owned);
  const needed = Math.ceil(missing / scale);
  const counts = packs.map(() => 0);
  if (needed === 0) {
    return { requiredCredits: total / scale, boughtCredits: 0, remainingCredits: (owned - total) / scale, cashCents: 0, counts };
  }

  // A cheapest combination cannot overshoot by a full largest pack. Removing
  // any pack in that case would still meet the quote and reduce the cost.
  const limit = needed + packs.at(-1).credits - 1;
  const cost = new Float64Array(limit + 1).fill(Infinity);
  const count = new Uint32Array(limit + 1);
  const last = new Int8Array(limit + 1);
  cost[0] = 0;
  for (let credits = 1; credits <= limit; credits++) {
    for (const [index, pack] of packs.entries()) {
      const previous = credits - pack.credits;
      if (previous < 0) continue;
      const candidateCost = cost[previous] + pack.cents;
      const candidateCount = count[previous] + 1;
      if (candidateCost < cost[credits] || (candidateCost === cost[credits] && candidateCount < count[credits])) {
        cost[credits] = candidateCost;
        count[credits] = candidateCount;
        last[credits] = index;
      }
    }
  }
  let best = needed;
  for (let credits = needed + 1; credits <= limit; credits++) {
    if (cost[credits] < cost[best]) best = credits;
  }
  for (let credits = best; credits > 0;) {
    const index = last[credits];
    counts[index]++;
    credits -= packs[index].credits;
  }
  return { requiredCredits: total / scale, boughtCredits: best, remainingCredits: (owned + best * scale - total) / scale, cashCents: cost[best], counts };
}

// Archived numeric terms preserve earlier calculations, not current model identity or availability.
export const clipTerms = {
  'seedance-2.5-720p-15s-nov4': { duration: 15, creditsPerClip: 0.5 },
  'seedance-2.5-720p-10s-nov4': { duration: 10, creditsPerClip: 0.5 },
  'seedance-2.5-720p-5s-nov4': { duration: 5, creditsPerClip: 0.25 },
  'seedance-2.5': { duration: 30, creditsPerClip: 0.5 },
  'seedance-2.5-15s-720p': { duration: 15, creditsPerClip: 1 },
  'seedance-2.0': { duration: 15, creditsPerClip: 0.5 },
  'veo31-text-8s-720': { duration: 8, creditsPerClip: 0.25 },
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
