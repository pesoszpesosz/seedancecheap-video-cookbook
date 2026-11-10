const maxMetadata = 32 * 1024 * 1024;
const maxBoxes = 4096;
const unreadable = () => new Error('Could not read the MP4 track table. Check that the export finished, or use ffprobe below.');

function box(view, offset, end) {
  if (view.byteLength - offset < 8) throw unreadable();
  const shortSize = view.getUint32(offset);
  const headerSize = shortSize === 1 ? 16 : 8;
  if (view.byteLength - offset < headerSize) throw unreadable();
  const size = shortSize === 1 ? Number(view.getBigUint64(offset + 8)) : shortSize || end - offset;
  if (!Number.isSafeInteger(size) || size < headerSize || size > end - offset) throw unreadable();
  return { type: fourCC(view, offset + 4), start: offset + headerSize, end: offset + size };
}

function fourCC(view, offset) {
  return String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset, 4));
}

function children(view, parent) {
  const list = [];
  for (let offset = parent.start; offset < parent.end;) {
    if (list.length >= maxBoxes) throw unreadable();
    const child = box(view, offset, parent.end);
    list.push(child);
    offset = child.end;
  }
  return list;
}

function required(view, parent, ...types) {
  const matching = children(view, parent).filter(child => types.includes(child.type));
  if (matching.length !== 1) throw unreadable();
  return matching[0];
}

function audioSamples(view, media) {
  const info = required(view, media, 'minf');
  const table = required(view, info, 'stbl');
  const sizes = required(view, table, 'stsz', 'stz2');
  const length = sizes.end - sizes.start;
  if (length < 12 || view.getUint8(sizes.start) !== 0) throw unreadable();
  const count = view.getUint32(sizes.start + 8);
  let bitsPerEntry = view.getUint32(sizes.start + 4) ? 0 : 32;
  if (sizes.type === 'stz2') {
    bitsPerEntry = view.getUint8(sizes.start + 7);
    if (![4, 8, 16].includes(bitsPerEntry)) throw unreadable();
  }
  if (12 + Math.ceil(count * bitsPerEntry / 8) > length) throw unreadable();
  return count;
}

function trackId(view, track) {
  const header = required(view, track, 'tkhd');
  if (header.start === header.end) throw unreadable();
  const version = view.getUint8(header.start);
  const offset = header.start + (version === 1 ? 20 : 12);
  if (version > 1 || offset + 4 > header.end) throw unreadable();
  return view.getUint32(offset);
}

function addFragment(view, counts) {
  const tracks = children(view, { start: 0, end: view.byteLength }).filter(child => child.type === 'traf');
  if (!tracks.length) throw unreadable();
  for (const track of tracks) {
    const header = required(view, track, 'tfhd');
    if (header.end - header.start < 8 || view.getUint8(header.start) !== 0) throw unreadable();
    const id = view.getUint32(header.start + 4);
    if (!counts.has(id)) throw unreadable();
    if (counts.get(id) === null) continue;
    for (const run of children(view, track).filter(child => child.type === 'trun')) {
      if (run.end - run.start < 8 || view.getUint8(run.start) > 1) throw unreadable();
      const flags = view.getUint32(run.start) & 0xffffff;
      const count = view.getUint32(run.start + 4);
      const optionalHeader = (flags & 1 ? 4 : 0) + (flags & 4 ? 4 : 0);
      const sampleBytes = [0x100, 0x200, 0x400, 0x800].filter(flag => flags & flag).length * 4;
      const total = counts.get(id) + count;
      if (run.start + 8 + optionalHeader + count * sampleBytes > run.end || !Number.isSafeInteger(total)) throw unreadable();
      counts.set(id, total);
    }
  }
}

export async function inspectMp4Audio(file) {
  if (!file || !Number.isSafeInteger(file.size)) throw unreadable();
  let metadata;
  let hasType = false;
  let hasMediaData = false;
  let topLevelCount = 0;
  let metadataSize = 0;
  const fragments = [];
  for (let offset = 0; offset < file.size;) {
    if (++topLevelCount > maxBoxes) throw unreadable();
    const header = new DataView(await file.slice(offset, offset + 16).arrayBuffer());
    const current = box(header, 0, file.size - offset);
    if (current.type === 'ftyp') hasType = true;
    if (current.type === 'mdat') hasMediaData = true;
    if (current.type === 'moov' || current.type === 'moof') {
      const range = { start: offset + current.start, end: offset + current.end };
      metadataSize += range.end - range.start;
      if (metadataSize > maxMetadata) {
        throw new Error('The MP4 track tables are too large for this browser check. Use ffprobe below.');
      }
      if (current.type === 'moof') fragments.push(range);
      else {
        if (metadata) throw unreadable();
        metadata = range;
      }
    }
    offset += current.end;
  }
  if (!hasType || !metadata || !hasMediaData) throw unreadable();
  const read = async range => new DataView(await file.slice(range.start, range.end).arrayBuffer());
  const view = await read(metadata);
  const movie = children(view, { start: 0, end: view.byteLength });
  if (fragments.length && !movie.some(child => child.type === 'mvex')) throw unreadable();
  const tracks = movie.filter(child => child.type === 'trak');
  if (!tracks.length) throw unreadable();

  const counts = new Map();
  for (const track of tracks) {
    const id = trackId(view, track);
    if (!id || counts.has(id)) throw unreadable();
    const media = required(view, track, 'mdia');
    const handler = required(view, media, 'hdlr');
    if (handler.end - handler.start < 12 || view.getUint8(handler.start) !== 0) throw unreadable();
    counts.set(id, fourCC(view, handler.start + 8) === 'soun' ? audioSamples(view, media) : null);
  }
  for (const fragment of fragments) addFragment(await read(fragment), counts);
  return [...counts.values()].filter(count => count !== null);
}

export function setupMp4Audio(section) {
  const input = section.querySelector('input');
  const result = section.querySelector('output');
  const idle = result.textContent;
  let revision = 0;

  async function check(load) {
    const current = ++revision;
    result.textContent = 'Reading the MP4 track table…';
    try {
      const tracks = await inspectMp4Audio(await load());
      if (current !== revision) return;
      result.textContent = tracks.length ? tracks.map((count, index) =>
        `Audio track ${index + 1} lists ${count.toLocaleString()} ${count === 1 ? 'sample' : 'samples'}.`
      ).join('\n') : 'The MP4 track table lists no audio tracks.';
    } catch (error) {
      if (current === revision) result.textContent = error.message;
    }
  }

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) return check(() => file);
    revision++;
    result.textContent = idle;
  });
  section.querySelector('button').addEventListener('click', () => {
    input.value = '';
    return check(async () => {
      const response = await fetch('./trim-audio-test-reference.mp4');
      if (!response.ok) throw new Error('The example could not load. You can still check your own file.');
      return response.blob();
    });
  });
}
