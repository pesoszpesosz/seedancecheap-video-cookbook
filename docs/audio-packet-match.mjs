const packetHash = /^SHA256:[a-f0-9]{64}$/i;

function readTracks(report, label) {
  if (!Array.isArray(report?.streams) || !Array.isArray(report?.packets)) {
    throw new Error(`${label} needs the audio streams and packet hashes from the ffprobe command below.`);
  }
  const tracks = new Map();
  for (const stream of report.streams) {
    if (!Number.isSafeInteger(stream?.index) || stream.index < 0 ||
        stream.codec_type !== 'audio' || tracks.has(stream.index)) {
      throw new Error(`${label} has invalid audio stream entries. Run the exact ffprobe command below.`);
    }
    const title = typeof stream.tags?.title === 'string' ? stream.tags.title.trim() : '';
    tracks.set(stream.index, { index: stream.index, title, hashes: [] });
  }
  for (const packet of report.packets) {
    const track = tracks.get(packet?.stream_index);
    if (!track || typeof packet.data_hash !== 'string' || !packetHash.test(packet.data_hash)) {
      throw new Error(`${label} has a packet without a declared audio stream and a valid SHA-256 hash.`);
    }
    track.hashes.push(packet.data_hash.toLowerCase());
  }
  return [...tracks.values()];
}

export function compareAudioPackets(sourceReport, exportReport) {
  const source = readTracks(sourceReport, 'Source report');
  const exported = readTracks(exportReport, 'Export report');
  return exported.map(track => {
    const matches = track.hashes.length
      ? source.filter(candidate => candidate.hashes.length === track.hashes.length &&
          track.hashes.every((hash, i) => candidate.hashes[i] === hash))
      : [];
    return {
      index: track.index,
      packetCount: track.hashes.length,
      matches: matches.map(({ index, title }) => ({ index, title })),
    };
  });
}

function describe(tracks) {
  if (!tracks.length) return 'The export report contains no audio streams.';
  return tracks.map(({ index, packetCount, matches }) => {
    const prefix = `Export stream ${index}`;
    if (!packetCount) return `${prefix} has no packet hashes to compare.`;
    if (!matches.length) return `${prefix} has no exact source match (${packetCount} packets).`;
    const names = matches.map(({ index, title }) => `stream ${index}${title ? ` (${title})` : ''}`);
    const match = matches.length === 1 ? 'exact match with source' : 'ambiguous match with source';
    return `${prefix}: ${match} ${names.join(', ')} (${packetCount} packets).`;
  }).join('\n');
}

async function readReport(file) {
  if (!file) throw new Error('Choose both the source and export JSON reports.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Each JSON report must be 10 MiB or smaller.');
  try {
    return JSON.parse((await file.text()).trimStart());
  } catch {
    throw new Error('Could not read the report as JSON. Use the ffprobe command below.');
  }
}

export function setupAudioPacketMatch(form) {
  const output = form.querySelector('output');
  const sample = form.querySelector('#audio-match-sample');
  const controls = [...form.querySelectorAll('button')];
  async function run(load) {
    controls.forEach(button => { button.disabled = true; });
    output.textContent = 'Comparing reports…';
    try {
      const { source, exported } = await load();
      output.textContent = describe(compareAudioPackets(source, exported));
    } catch (error) {
      output.textContent = error.message;
    } finally {
      controls.forEach(button => { button.disabled = false; });
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const sourceFile = form.querySelector('#audio-match-source').files[0];
    const exportFile = form.querySelector('#audio-match-export').files[0];
    return run(async () => ({ source: await readReport(sourceFile), exported: await readReport(exportFile) }));
  });
  sample.addEventListener('click', () => run(async () => {
    const response = await fetch('./two-tone-audio-reports.json');
    if (!response.ok) throw new Error('The example could not load. You can still compare your own reports.');
    return response.json();
  }));
}
