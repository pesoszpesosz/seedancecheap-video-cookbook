import { applyWorksheetLinks } from './links.mjs?v=1e7c447d0146';

const stamp = String.raw`\d{2,}:\d{2}:\d{2}[,.]\d{3}`;
const interval = new RegExp(`^\\s*(${stamp})\\s*-->\\s*(${stamp})\\s*$`);

function milliseconds(value) {
  const [hours, minutes, seconds, fraction] = value.split(/[:,.]/).map(Number);
  const total = ((hours * 60 + minutes) * 60 + seconds) * 1000 + fraction;
  if (minutes >= 60 || seconds >= 60 || !Number.isSafeInteger(total)) throw new Error('Invalid timestamp.');
  return total;
}

function bounds(value, context) {
  const match = interval.exec(value);
  if (!match) throw new Error(`${context} needs two timestamps separated by -->.`);
  const start = milliseconds(match[1]);
  const end = milliseconds(match[2]);
  if (start >= end) throw new Error(`${context} must end after it starts.`);
  return [start, end];
}

function srtStamp(value) {
  const seconds = Math.floor(value / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(part => String(part).padStart(2, '0')).join(':') + ',' + String(value % 1000).padStart(3, '0');
}

export function retimeSrt(source, keptRanges) {
  if (!source.trim()) throw new Error('Open an SRT file or paste captions.');
  if (!keptRanges.trim()) throw new Error('Enter at least one kept source range.');
  let durationMs = 0;
  const timeline = keptRanges.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, i) => {
    const [start, end] = bounds(line, `Range ${i + 1}`);
    const offset = durationMs;
    durationMs += end - start;
    if (!Number.isSafeInteger(durationMs)) throw new Error('The joined duration is too long.');
    return {start, end, offset};
  });
  const cues = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/^\n+|\n+$/g, '').split(/\n[ \t]*\n+/);
  const result = [];
  for (const [i, cue] of cues.entries()) {
    const [number, timing, ...lines] = cue.split('\n');
    if (!/^\d+$/.test(number.trim()) || !timing || !lines.length) throw new Error(`Invalid SRT cue ${i + 1}.`);
    const [start, end] = bounds(timing, `Cue ${i + 1}`);
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
    clear('Inputs changed. Retime captions to refresh the result.');
  });
  ranges.addEventListener('input', () => clear('Inputs changed. Retime captions to refresh the result.'));
  file.addEventListener('change', async () => {
    const item = file.files[0];
    if (!item) return;
    const version = ++readVersion;
    source.value = '';
    clear('Reading captions locally…');
    try {
      const text = await item.text();
      if (version !== readVersion) return;
      source.value = text;
      clear('File opened. Enter the kept ranges and retime captions.');
    } catch {
      if (version !== readVersion) return;
      source.value = '';
      status.dataset.error = '';
      status.textContent = 'This file could not be read. Paste the captions instead.';
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    clear();
    try {
      const result = retimeSrt(source.value, ranges.value);
      output.value = result.srt;
      download.disabled = result.cueCount === 0;
      status.textContent = result.cueCount
        ? `${result.cueCount} ${result.cueCount === 1 ? 'cue' : 'cues'} on a ${srtStamp(result.durationMs)} timeline.`
        : 'None of the captions overlap the kept ranges.';
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
Before the cut

2
00:00:03,000 --> 00:00:05,000
Crosses the first edge

3
00:00:05,000 --> 00:00:06,000
Entirely removed

4
00:00:06,000 --> 00:00:08,000
Crosses the second edge

5
00:00:09,250 --> 00:00:10,750
Later cue
Second line
`, '00:00:00.000 --> 00:00:04.000\n00:00:07.000 --> 00:00:12.000');
  });
  fightExample.addEventListener('click', async () => {
    const version = readVersion;
    const currentRanges = ranges.value;
    fightExample.disabled = true;
    fightExampleStatus.textContent = 'Loading the demo captions…';
    try {
      const response = await fetch('./cut-the-fight-source.srt');
      if (!response.ok) throw new Error('Demo captions unavailable.');
      const captions = await response.text();
      if (version === readVersion && currentRanges === ranges.value) {
        runExample(captions, fightExample.dataset.keptRanges);
        fightExampleStatus.textContent = '';
        form.focus();
      } else {
        fightExampleStatus.textContent = 'Your current captions and ranges were kept.';
      }
    } catch {
      fightExampleStatus.textContent = 'The demo could not load. Try again or use the source SRT link.';
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
