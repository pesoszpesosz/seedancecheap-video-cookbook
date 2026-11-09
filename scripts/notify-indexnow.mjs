import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, open, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = new URL('https://pesoszpesosz.github.io/seedancecheap-video-cookbook/');
const keyLocation = new URL('indexnow.txt', site);
const endpoint = 'https://api.indexnow.org/indexnow';
const timeout = 15_000;
const digest = value => createHash('sha256').update(value).digest('hex');

function pageUrl(name) {
  if (!/^[a-z0-9-]+\.html$/.test(name)) throw new Error('Use a public HTML filename from docs/.');
  return new URL(name === 'index.html' ? './' : name, site).href;
}

async function publicBytes(url, request) {
  const response = await request(url, {
    redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(timeout),
  });
  if (response.status !== 200) throw new Error('Public fetch failed for ' + url + ' (HTTP ' + response.status + ').');
  return Buffer.from(await response.arrayBuffer());
}

async function priorReceipt(file, identity) {
  let stored;
  try {
    stored = await readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  try {
    const record = JSON.parse(stored);
    if (record.url === identity.url && record.sha256 === identity.sha256
        && record.status !== 'submission_reserved') return record;
  } catch {
    // An interrupted write is uncertain. Keep the reservation and do not resubmit.
  }
  return { ...identity, status: 'submission_outcome_unknown', indexingVerified: false };
}

export async function notifyIndexNow(page, expected, directory, request = fetch) {
  const url = pageUrl(page);
  const identity = { url, sha256: digest(expected) };
  const recordFile = path.join(directory, page + '-' + identity.sha256 + '.json');
  const prior = await priorReceipt(recordFile, identity);
  if (prior) return { ...prior, submittedThisRun: false, receipt: recordFile };

  const [served, sitemap, keyBody] = await Promise.all([
    publicBytes(url, request),
    publicBytes(new URL('sitemap-pages.txt', site).href, request),
    publicBytes(keyLocation.href, request),
  ]);
  if (!served.equals(expected)) throw new Error('The deployed page bytes differ from the reviewed Git revision.');
  if (!served.toString().includes('<link rel="canonical" href="' + url + '">')
      || sitemap.toString().split(/\r?\n/).filter(line => line === url).length !== 1) {
    throw new Error('The public canonical URL and sitemap entry do not match.');
  }
  const key = keyBody.toString('ascii').trim();
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) throw new Error('The public IndexNow key file has an invalid format.');

  await mkdir(directory, { recursive: true });
  const reservation = {
    ...identity, status: 'submission_reserved', atUtc: new Date().toISOString(), indexingVerified: false,
  };
  let handle;
  try {
    handle = await open(recordFile, 'wx');
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    return { ...(await priorReceipt(recordFile, identity)), submittedThisRun: false, receipt: recordFile };
  }
  try {
    await handle.writeFile(JSON.stringify(reservation) + '\n');
    await handle.sync();
  } finally {
    await handle.close();
  }

  let httpStatus = null;
  try {
    const response = await request(endpoint, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeout),
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: site.host, key, keyLocation: keyLocation.href, urlList: [url] }),
    });
    httpStatus = response.status;
  } catch {
    // The server may have received the request before the connection failed.
  }
  const status = httpStatus === 200 ? 'accepted_for_processing'
    : httpStatus === 202 ? 'key_validation_pending'
    : httpStatus === null ? 'submission_outcome_unknown' : 'request_rejected';
  const receipt = { ...reservation, status, httpStatus, observedAtUtc: new Date().toISOString() };
  const temporary = recordFile + '.' + randomUUID() + '.tmp';
  await writeFile(temporary, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  await rename(temporary, recordFile);
  return { ...receipt, submittedThisRun: true, receipt: recordFile };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [commit, page, destination, extra] = process.argv.slice(2);
  if (!/^[0-9a-f]{40}$/.test(commit || '') || !page || extra) {
    throw new Error('Usage: npm run notify:index -- <deployed-commit-sha> <page.html> [receipt-directory]');
  }
  pageUrl(page);
  const repository = fileURLToPath(new URL('../', import.meta.url));
  const git = (args, encoding) => execFileSync('git', args, { cwd: repository, encoding });
  const expected = git(['show', commit + ':docs/' + page]);
  const receipts = destination ? path.resolve(destination)
    : path.join(git(['rev-parse', '--path-format=absolute', '--git-common-dir'], 'utf8').trim(), 'indexnow-receipts');
  const result = await notifyIndexNow(page, expected, receipts);
  console.log(JSON.stringify(result));
  if (!['accepted_for_processing', 'key_validation_pending'].includes(result.status)) process.exitCode = 1;
}
