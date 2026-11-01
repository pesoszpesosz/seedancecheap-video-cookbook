import { readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

const block = name => new RegExp(`<!-- campaign-availability:${name} -->[\\s\\S]*?<!-- /campaign-availability:${name} -->\\r?\\n?`, 'g');
const legacyNotice = /<aside\b(?=[^>]*\bdata-capacity-notice=)[^>]*>[\s\S]*?<\/aside>\s*/gi;

export function availabilityPage(html, snapshot, language = 'en') {
  if (!['maintenance', 'unknown', 'available'].includes(snapshot.status)) throw new Error('Unrecognized availability state');
  const observed = new Date(snapshot.observedAt);
  if (!Number.isFinite(observed.getTime())) throw new Error('A verified observation time is required');
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  let next = html.replace(block('style'), '').replace(block('notice'), '').replace(legacyNotice, '');
  if (snapshot.status === 'available') return next;
  const stamp = observed.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const german = language === 'de';
  const heading = german ? `Verfügbarkeit geprüft: ${stamp}` : `Availability checked: ${stamp}`;
  const maintenance = german
    ? 'Bei dieser Prüfung waren die günstige Seedance-2.5-Videogenerierung und die entsprechende Genjutsu-Option wegen Wartung nicht verfügbar.'
    : 'At this check, budget Seedance 2.5 video generation and the matching Genjutsu option were under maintenance.';
  const unknown = german
    ? 'Die aktuelle Verfügbarkeit dieser Videooptionen wurde noch nicht erneut bestätigt.'
    : 'Current availability of these video options has not been reverified.';
  const close = german
    ? 'Die fertigen Beispiele und früher geprüften Preise bleiben sichtbar. Prüfe die aktuelle Verfügbarkeit, bevor du Guthaben kaufst.'
    : 'Completed examples and earlier checked prices remain viewable. Confirm live availability before buying credits.';
  const message = snapshot.status === 'maintenance' ? maintenance : unknown;
  const style = `<!-- campaign-availability:style -->${eol}<style>aside[data-campaign-availability]{grid-column:1/-1;margin:20px 0 26px;padding:14px 18px;border-left:4px solid #aa6400;border-radius:8px;background:#fff1cb;color:#452d08;font:14px/1.5 "Segoe UI",Arial,sans-serif}aside[data-campaign-availability] strong{display:block;margin-bottom:4px;font-weight:700}aside[data-campaign-availability] p{margin:0;max-width:95ch;color:#452d08;font-size:14px}</style>${eol}<!-- /campaign-availability:style -->${eol}`;
  const notice = `<!-- campaign-availability:notice -->${eol}<aside data-campaign-availability="budget-seedance25" role="note"><strong>${heading}</strong><p>${message} ${close}</p></aside>${eol}<!-- /campaign-availability:notice -->${eol}`;
  if (!next.includes('</head>') || !/<main\b[^>]*>/.test(next)) throw new Error('Expected a complete watch or guide page');
  next = next.replace('</head>', style + '</head>');
  return next.replace(/<main\b[^>]*>/, match => match + notice);
}

export async function reconcileAvailability(docsDirectory, snapshot) {
  const changedFiles = [];
  for (const target of snapshot.targets) {
    if (!/^[a-z0-9-]+\.html$/.test(target.file)) throw new Error('Availability target must stay inside the flat docs directory');
    const pagePath = join(docsDirectory, target.file);
    const before = await readFile(pagePath, 'utf8');
    const after = availabilityPage(before, snapshot, target.language);
    if (before === after) continue;
    await writeFile(pagePath + '.tmp', after, 'utf8');
    await rename(pagePath + '.tmp', pagePath);
    changedFiles.push(target.file);
  }
  return { availability: snapshot.status, observedAt: snapshot.observedAt, changedFiles };
}
