import { applyWorksheetLinks } from './links.mjs?v=f662e9692f7d';

const messages = {
  en: {
    missingSource: 'Open an SRT file or paste captions.',
    missingRanges: 'Enter at least one kept source range.',
    timestamp: 'Invalid timestamp.',
    duration: 'The joined duration is too long.',
    changed: 'Inputs changed. Retime captions to refresh the result.',
    reading: 'Reading captions locally…',
    opened: 'File opened. Enter the kept ranges and retime captions.',
    unreadable: 'This file could not be read. Paste the captions instead.',
    empty: 'None of the captions overlap the kept ranges.',
    loading: 'Loading the demo captions…',
    kept: 'Your current captions and ranges were kept.',
    demoFailed: 'The demo could not load. Try again or use the source SRT link.',
    range: n => `Range ${n}`,
    cue: n => `Cue ${n}`,
    invalidCue: n => `Invalid SRT cue ${n}.`,
    interval: name => `${name} needs two timestamps separated by -->.`,
    order: name => `${name} must end after it starts.`,
    result: (count, duration) => `${count} ${count === 1 ? 'cue' : 'cues'} on a ${duration} timeline.`,
    example: ['Before the cut', 'Crosses the first edge', 'Entirely removed',
      'Crosses the second edge', 'Later cue\nSecond line'],
  },
  es: {
    missingSource: 'Abre un archivo SRT o pega los subtítulos.',
    missingRanges: 'Introduce al menos un tramo conservado del vídeo original.',
    timestamp: 'Código de tiempo no válido.',
    duration: 'La duración total del montaje es demasiado larga.',
    changed: 'Los datos han cambiado. Ajusta los subtítulos para actualizar el resultado.',
    reading: 'Leyendo los subtítulos en tu dispositivo…',
    opened: 'Archivo abierto. Introduce los tramos conservados y ajusta los subtítulos.',
    unreadable: 'No se ha podido leer el archivo. Prueba a pegar los subtítulos.',
    empty: 'Ningún subtítulo coincide con los tramos conservados.',
    loading: 'Cargando los subtítulos del ejemplo…',
    kept: 'Se han conservado tus subtítulos y tramos.',
    demoFailed: 'No se ha podido cargar el ejemplo. Inténtalo de nuevo o descarga el SRT original.',
    range: n => `Tramo ${n}`,
    cue: n => `Subtítulo ${n}`,
    invalidCue: n => `El subtítulo ${n} no tiene un formato SRT válido.`,
    interval: name => `${name}: separa los dos códigos de tiempo con -->.`,
    order: name => `${name}: el final debe ser posterior al inicio.`,
    result: (count, duration) => `${count} ${count === 1 ? 'subtítulo' : 'subtítulos'} en un montaje de ${duration}.`,
    example: ['Antes del corte', 'Cruza el inicio del corte', 'Se elimina por completo',
      'Cruza el final del corte', 'Subtítulo posterior\nSegunda línea'],
  },
};

const stamp = String.raw`\d{2,}:\d{2}:\d{2}[,.]\d{3}`;
const interval = new RegExp(`^\\s*(${stamp})\\s*-->\\s*(${stamp})\\s*$`);

function milliseconds(value, copy) {
  const [hours, minutes, seconds, fraction] = value.split(/[:,.]/).map(Number);
  const total = ((hours * 60 + minutes) * 60 + seconds) * 1000 + fraction;
  if (minutes >= 60 || seconds >= 60 || !Number.isSafeInteger(total)) throw new Error(copy.timestamp);
  return total;
}

function bounds(value, context, copy) {
  const match = interval.exec(value);
  if (!match) throw new Error(copy.interval(context));
  const start = milliseconds(match[1], copy);
  const end = milliseconds(match[2], copy);
  if (start >= end) throw new Error(copy.order(context));
  return [start, end];
}

function srtStamp(value) {
  const seconds = Math.floor(value / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(part => String(part).padStart(2, '0')).join(':') + ',' + String(value % 1000).padStart(3, '0');
}

export function retimeSrt(source, keptRanges, language = 'en') {
  const copy = language === 'es' ? messages.es : messages.en;
  if (!source.trim()) throw new Error(copy.missingSource);
  if (!keptRanges.trim()) throw new Error(copy.missingRanges);
  let durationMs = 0;
  const timeline = keptRanges.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, i) => {
    const [start, end] = bounds(line, copy.range(i + 1), copy);
    const offset = durationMs;
    durationMs += end - start;
    if (!Number.isSafeInteger(durationMs)) throw new Error(copy.duration);
    return {start, end, offset};
  });
  const cues = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/^\n+|\n+$/g, '').split(/\n[ \t]*\n+/);
  const result = [];
  for (const [i, cue] of cues.entries()) {
    const [number, timing, ...lines] = cue.split('\n');
    if (!/^\d+$/.test(number.trim()) || !timing || !lines.length) throw new Error(copy.invalidCue(i + 1));
    const [start, end] = bounds(timing, copy.cue(i + 1), copy);
    const pieces = [];
    for (const clip of timeline) {
      const left = Math.max(start, clip.start);
      const right = Math.min(end, clip.end);
      if (left >= right) continue;
      const from = clip.offset + (left - clip.start);
      const to = clip.offset + (right - clip.start);
      const previous = pieces.at(-1);
      if (previous?.end === from) previous.end = to;
      else pieces.push({start: from, end: to, text: lines.join('\n')});
    }
    result.push(...pieces);
  }
  result.sort((a, b) => a.start - b.start || a.end - b.end);
  return {
    srt: result.map((cue, i) => `${i + 1}\n${srtStamp(cue.start)} --> ${srtStamp(cue.end)}\n${cue.text}\n\n`).join(''),
    cueCount: result.length, durationMs,
  };
}

if (typeof document !== 'undefined') {
  const language = document.documentElement.lang;
  const copy = language === 'es' ? messages.es : messages.en;
  applyWorksheetLinks(document, location.search);
  const byId = id => document.getElementById(id);
  const form = byId('retime');
  const source = byId('source');
  const ranges = byId('ranges');
  const output = byId('output');
  const status = byId('status');
  const file = byId('source-file');
  const download = byId('download');
  const fightExample = byId('fight-example');
  const fightExampleStatus = byId('fight-example-status');
  let readVersion = 0;
  const clear = (message = '') => {
    output.value = '';
    download.disabled = true;
    delete status.dataset.error;
    status.textContent = message;
  };
  source.addEventListener('input', () => {
    readVersion++;
    file.value = '';
    clear(copy.changed);
  });
  ranges.addEventListener('input', () => clear(copy.changed));
  file.addEventListener('change', async () => {
    const item = file.files[0];
    if (!item) return;
    const version = ++readVersion;
    source.value = '';
    clear(copy.reading);
    try {
      const text = await item.text();
      if (version !== readVersion) return;
      source.value = text;
      clear(copy.opened);
    } catch {
      if (version !== readVersion) return;
      source.value = '';
      status.dataset.error = '';
      status.textContent = copy.unreadable;
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    clear();
    try {
      const result = retimeSrt(source.value, ranges.value, language);
      output.value = result.srt;
      download.disabled = result.cueCount === 0;
      status.textContent = result.cueCount
        ? copy.result(result.cueCount, srtStamp(result.durationMs))
        : copy.empty;
    } catch (error) {
      status.dataset.error = '';
      status.textContent = error.message;
    }
  });
  const runExample = (captions, keptRanges) => {
    readVersion++;
    file.value = '';
    source.value = captions;
    ranges.value = keptRanges;
    form.requestSubmit();
  };
  byId('example').addEventListener('click', () => {
    runExample(`1
00:00:01,000 --> 00:00:02,000
${copy.example[0]}

2
00:00:03,000 --> 00:00:05,000
${copy.example[1]}

3
00:00:05,000 --> 00:00:06,000
${copy.example[2]}

4
00:00:06,000 --> 00:00:08,000
${copy.example[3]}

5
00:00:09,250 --> 00:00:10,750
${copy.example[4]}
`, '00:00:00.000 --> 00:00:04.000\n00:00:07.000 --> 00:00:12.000');
  });
  fightExample.addEventListener('click', async () => {
    const version = readVersion;
    const currentRanges = ranges.value;
    fightExample.disabled = true;
    fightExampleStatus.textContent = copy.loading;
    try {
      const response = await fetch('./cut-the-fight-source.srt');
      if (!response.ok) throw new Error('Demo captions unavailable.');
      const captions = await response.text();
      if (version === readVersion && currentRanges === ranges.value) {
        runExample(captions, fightExample.dataset.keptRanges);
        fightExampleStatus.textContent = '';
        form.focus();
      } else {
        fightExampleStatus.textContent = copy.kept;
      }
    } catch {
      fightExampleStatus.textContent = copy.demoFailed;
    } finally {
      fightExample.disabled = false;
    }
  });
  download.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([output.value], {type: 'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'retimed.srt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
