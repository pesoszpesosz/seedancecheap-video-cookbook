const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
const maxBytes = 2 * 1024 * 1024;

export function inspectReferencePng(bytes) {
  if (bytes.length > maxBytes) throw new Error('Choose a PNG no larger than 2 MiB.');
  if (!pngSignature.every((byte, i) => bytes[i] === byte)) {
    throw new Error('These bytes are not PNG. Export the image as PNG before choosing it again.');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunkType = offset => String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
  if (bytes.length < 33 || view.getUint32(8) !== 13 || chunkType(8) !== 'IHDR') {
    throw new Error('The PNG header is incomplete. Export a new copy.');
  }

  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width < 300 || width > 2048 || height < 300 || height > 2048) {
    throw new Error(`This file is ${width} × ${height} px. Export with each side between 300 and 2,048 px.`);
  }
  const color = bytes[25];
  if (bytes[24] !== 8 || (color !== 2 && color !== 6) || bytes[26] || bytes[27] || bytes[28]) {
    throw new Error('Export a non-interlaced, 8-bit RGB or RGBA PNG.');
  }

  let hasImageData = false;
  for (let offset = 33; offset + 12 <= bytes.length;) {
    const length = view.getUint32(offset);
    const next = offset + 12 + length;
    if (next > bytes.length) break;
    const type = chunkType(offset);
    if (['acTL', 'fcTL', 'fdAT'].includes(type)) {
      throw new Error('This PNG is animated. Export a single still image.');
    }
    if (type === 'IDAT' && length > 0) hasImageData = true;
    if (type === 'IEND') {
      if (hasImageData && length === 0 && next === bytes.length) {
        return { width, height, color: color === 2 ? 'RGB' : 'RGBA' };
      }
      break;
    }
    offset = next;
  }
  throw new Error('The PNG data is incomplete or has bytes after its ending. Export a fresh copy.');
}

async function decodeImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('This browser could not open the PNG. Export a fresh copy.'));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

if (typeof document !== 'undefined') {
  const input = document.getElementById('reference-png-file');
  const status = document.getElementById('reference-png-result');
  let selection = 0;

  input.addEventListener('change', async () => {
    const current = ++selection;
    const file = input.files[0];
    status.classList.remove('error');
    status.textContent = file ? 'Checking locally…' : 'Choose a file to see its result.';
    if (!file) return;

    try {
      if (file.size > maxBytes) throw new Error('Choose a PNG no larger than 2 MiB.');
      const info = inspectReferencePng(new Uint8Array(await file.arrayBuffer()));
      await decodeImage(file);
      if (selection !== current) return;
      status.textContent = `Local checks passed. ${info.width} × ${info.height} px, ${info.color}, ${file.size.toLocaleString('en-US')} bytes. Your browser opened the image.`;
    } catch (error) {
      if (selection !== current) return;
      status.classList.add('error');
      status.textContent = error instanceof Error ? error.message : 'The file could not be read.';
    }
  });
}
