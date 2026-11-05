import { readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

const block = name => new RegExp(`<!-- campaign-availability:${name} -->[\\s\\S]*?<!-- /campaign-availability:${name} -->\\r?\\n?`, 'g');
const legacyNotice = /<aside\b(?=[^>]*\bdata-capacity-notice=)[^>]*>[\s\S]*?<\/aside>\s*/gi;

export function availabilityPage(html, snapshot, language = 'en') {
  if (!['maintenance', 'unknown', 'available', 'limited', 'review'].includes(snapshot.status)) throw new Error('Unrecognized availability state');
  if (['available', 'limited'].includes(snapshot.status) && snapshot.modelIdentityVerified !== true) throw new Error('Confirm model identity before restoring model-specific promotion');
  const observed = new Date(snapshot.observedAt);
  if (!Number.isFinite(observed.getTime())) throw new Error('A verified observation time is required');
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  let next = html.replace(block('style'), '').replace(block('notice'), '').replace(legacyNotice, '');
  if (snapshot.status === 'available') return next;
  const stamp = observed.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const german = language === 'de';
  const spanish = language === 'es';
  const heading = spanish ? `Disponibilidad comprobada: ${stamp}` : german ? `Verfügbarkeit geprüft: ${stamp}` : `Availability checked: ${stamp}`;
  const maintenance = german
    ? 'Bei dieser Prüfung waren die günstige Seedance-2.5-Videogenerierung und die entsprechende Genjutsu-Option wegen Wartung nicht verfügbar.'
    : 'At this check, budget Seedance 2.5 video generation and the matching Genjutsu option were under maintenance.';
  const unknown = german
    ? 'Die aktuelle Verfügbarkeit dieser Videooptionen wurde noch nicht erneut bestätigt.'
    : 'Current availability of these video options has not been reverified.';
  const review = german
    ? 'Die Modellzuordnung der neuen günstigen Videooption wird geprüft. Das zugehörige Seedance-2.5-Preisversprechen ist vorübergehend pausiert. Die fertigen Filmbeispiele stammen aus früheren Optionen.'
    : 'We are verifying the model identity of the new budget video option. Its Seedance 2.5 promotional price claim is temporarily paused. The completed film examples came from earlier options.';
  const limited = german
    ? 'Eine neue Seedance-2.5-Option bietet 720p für 5, 10 oder 15 Sekunden mit Text oder Bildreferenzen. 15 Sekunden kosten 0,5 Credits: anteilig $0.495 aus dem im Voraus bezahlten $99-Paket mit 100 Credits. Diese Option unterstützt weder Genjutsu mit Quellvideo noch 30-Sekunden-Clips.'
    : 'A new Seedance 2.5 backup offers 720p text-to-video and image-guided requests of 5, 10 or 15 seconds. 15 seconds uses 0.5 credit: an allocated $0.495 from the $99 upfront pack of 100 credits. This option does not support Genjutsu/source-video guidance or 30-second clips.';
  const close = german
    ? 'Die fertigen Beispiele und früher geprüften Preise bleiben sichtbar. Prüfe die aktuelle Verfügbarkeit, bevor du Guthaben kaufst.'
    : 'Completed examples and earlier checked prices remain viewable. Confirm live availability before buying credits.';
  const reviewClose = german
    ? 'Warte auf die Modellprüfung, bevor du für diese Option Guthaben kaufst. Die fertigen Beispiele und andere Werkzeuge bleiben verfügbar.'
    : 'Wait for this model review before buying credits for that option. The completed examples and other tools remain available.';
  const spanishMessages = {
    maintenance: 'En esta comprobación, la generación económica de vídeo Seedance 2.5 y la opción Genjutsu correspondiente estaban en mantenimiento.',
    unknown: 'La disponibilidad actual de estas opciones de vídeo aún no se ha vuelto a confirmar.',
    review: 'Estamos verificando la identidad del modelo de la nueva opción económica de vídeo. Su promoción de precio como Seedance 2.5 está pausada. Los ejemplos completos proceden de opciones anteriores.',
    limited: 'Una nueva opción Seedance 2.5 permite solicitudes de 5, 10 o 15 segundos en 720p, con texto o imágenes de referencia. Una solicitud de 15 segundos consume 0,5 créditos: US$0,495 del paquete de US$99 pagados por adelantado con 100 créditos. Esta opción no admite Genjutsu con vídeo de origen ni clips de 30 segundos.',
  };
  const message = spanish ? spanishMessages[snapshot.status] : snapshot.status === 'review' ? review : snapshot.status === 'maintenance' ? maintenance : snapshot.status === 'limited' ? limited : unknown;
  const limitedClose = german
    ? 'Die älteren Filmbeispiele unten stammen von anderen Optionen. Prüfe die gewählte Option, ihre Verfügbarkeit und den vollständigen Preis vor dem Kauf.'
    : 'The earlier films below came from other options. Review your selected option, availability and complete quote before buying.';
  const link = snapshot.status === 'limited'
      ? ` <a data-site-link href="https://seedancecheap.com/studio2/?utm_source=github&amp;utm_medium=availability&amp;utm_campaign=backup_720_nov4#generate">${spanish ? 'Consultar las opciones de vídeo actuales' : german ? 'Aktuelle Videooptionen prüfen' : 'Review live video formats'}</a>`
    : '';
  const style = `<!-- campaign-availability:style -->${eol}<style>aside[data-campaign-availability]{grid-column:1/-1;margin:20px 0 26px;padding:14px 18px;border-left:4px solid #aa6400;border-radius:8px;background:#fff1cb;color:#452d08;font:14px/1.5 "Segoe UI",Arial,sans-serif}aside[data-campaign-availability] strong{display:block;margin-bottom:4px;font-weight:700}aside[data-campaign-availability] p{margin:0;max-width:95ch;color:#452d08;font-size:14px}aside[data-campaign-availability] a{display:inline-flex;align-items:center;min-height:44px;color:#452d08;font-weight:700;text-underline-offset:3px}</style>${eol}<!-- /campaign-availability:style -->${eol}`;
  const closing = spanish
    ? snapshot.status === 'review'
      ? 'Espera a que termine esta revisión antes de comprar créditos para esa opción. Los ejemplos completos y otras herramientas siguen disponibles.'
      : snapshot.status === 'limited'
        ? 'Los ejemplos anteriores proceden de otras opciones. Revisa la opción seleccionada, la disponibilidad y el precio completo antes de comprar.'
        : 'Los ejemplos completos y los precios comprobados anteriormente siguen visibles. Confirma la disponibilidad actual antes de comprar créditos.'
    : snapshot.status === 'review' ? reviewClose : snapshot.status === 'limited' ? limitedClose : close;
  const notice = `<!-- campaign-availability:notice -->${eol}<aside data-campaign-availability="budget-seedance25" role="note"><strong>${heading}</strong><p>${message} ${closing}${link}</p></aside>${eol}<!-- /campaign-availability:notice -->${eol}`;
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
