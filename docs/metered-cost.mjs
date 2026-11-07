// Inputs are provider-quoted billable seconds, after that provider's own trimming/rounding.
// All attempts in this worksheet use the same quoted settings and rate.
export function calculateMetered({ rate, inputSeconds, billedOutputSeconds, outputSeconds, attempts, restoredAttempts, approvedSeconds }) {
  if (![rate, inputSeconds, billedOutputSeconds, outputSeconds, attempts, restoredAttempts, approvedSeconds].every(Number.isFinite))
    throw new Error('Enter a number in every field.');
  if (rate <= 0 || rate > 10000) throw new Error('Enter a positive USD rate per billed second, at most $10,000.');
  if (inputSeconds < 0 || inputSeconds > 100000 || billedOutputSeconds <= 0 || billedOutputSeconds > 100000)
    throw new Error('Billed input seconds must be 0–100,000; billed output seconds must be greater than zero and at most 100,000.');
  if (outputSeconds <= 0 || outputSeconds > 3600) throw new Error('Output length must be greater than zero and at most 3,600 seconds.');
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 100000)
    throw new Error('Charged attempts must be whole numbers from 1 to 100,000.');
  if (!Number.isInteger(restoredAttempts) || restoredAttempts < 0 || restoredAttempts > attempts)
    throw new Error('Fully restored attempts must be whole numbers, without exceeding charged attempts.');
  const netAttempts = attempts - restoredAttempts;
  const outputAvailable = netAttempts * outputSeconds;
  if (approvedSeconds < 0 || approvedSeconds > outputAvailable)
    throw new Error('Approved seconds cannot exceed the unique output from non-restored paid attempts. Input footage and repeated loops do not count.');
  const billedSecondsPerAttempt = inputSeconds + billedOutputSeconds;
  const perAttemptUSD = rate * billedSecondsPerAttempt;
  const netUsageUSD = perAttemptUSD * netAttempts;
  return { netAttempts, outputAvailable, billedSecondsPerAttempt, perAttemptUSD, netUsageUSD,
    netBilledSeconds: billedSecondsPerAttempt * netAttempts,
    perApprovedSecondUSD: approvedSeconds > 0 ? netUsageUSD / approvedSeconds : null };
}
