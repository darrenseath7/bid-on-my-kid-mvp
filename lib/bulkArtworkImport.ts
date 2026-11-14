// Browser-only parser. Files stay on the admin's device until the batch is approved.
export type BulkRow = {
  filename: string;
  firstName: string;
  surname: string;
  grade: string;
  school: string;
  className: string;
};

const MAX_ROWS = 500;
const MAX_ZIP_BYTES = 300 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGES = /\.(jpg|jpeg|png|webp)$/i;

function baseName(path: string) {
  return path.replaceAll('\\', '/').split('/').pop() || '';
}

export function imageKey(path: string) {
  return baseName(path).trim().toLocaleLowerCase('en');
}

function parseCsv(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const character = source[i];
    if (quoted && character === '"' && source[i + 1] === '"') { field += '"'; i++; }
    else if (character === '"') { quoted = !quoted; }
    else if (!quoted && character === ',') { row.push(field); field = ''; }
    else if (!quoted && (character === '\r' || character === '\n')) {
      if (character === '\r' && source[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(cell => cell.trim())) result.push(row);
      row = [];
    } else { field += character; }
  }
  if (quoted) throw new Error('Spreadsheet contains an unclosed quoted CSV value.');
  row.push(field);
  if (row.some(cell => cell.trim())) result.push(row);
  return result;
}

function readXml(xml: string) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('Invalid Excel spreadsheet.');
  return document;
}

function elements(node: Document | Element, name: string) {
  return Array.from(node.getElementsByTagName(name));
}

function textOf(node: Document | Element, name: string) {
  return elements(node, name)[0]?.textContent || '';
}

type ZipEntry = { name: string; method: number; size: number; bytes: Uint8Array };

async function unzip(blob: Blob, maxEntries = 520): Promise<ZipEntry[]> {
  if (blob.size > MAX_ZIP_BYTES) throw new Error('ZIP is larger than 300 MB. Split it into smaller batches.');
  const buffer = await blob.arrayBuffer();
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let end = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error('Invalid ZIP file.');
  const count = view.getUint16(end + 10, true);
  if (count > maxEntries || count === 65535) throw new Error(`ZIP must have no more than ${maxEntries} entries.`);
  let offset = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) throw new Error('Invalid ZIP directory.');
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressed = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const length = view.getUint16(offset + 28, true);
    const extra = view.getUint16(offset + 30, true);
    const comment = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + length));
    offset += 46 + length + extra + comment;
    if (flags & 1 || (method !== 0 && method !== 8) || size === 0xffffffff) throw new Error('Encrypted, ZIP64 or unsupported ZIP entry.');
    if (name.endsWith('/') || name.startsWith('__MACOSX/') || baseName(name).startsWith('.')) continue;
    if (name.startsWith('/') || name.includes('..') || name.includes('\\')) throw new Error('ZIP contains an unsafe filename.');
    if (!ALLOWED_IMAGES.test(name) && !name.endsWith('.xml')) continue;
    total += size;
    if (total > MAX_ZIP_BYTES || (ALLOWED_IMAGES.test(name) && size > MAX_IMAGE_BYTES)) throw new Error('ZIP contents are too large.');
    if (local + 30 > bytes.length || view.getUint32(local, true) !== 0x04034b50) throw new Error('Invalid ZIP entry.');
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    if (start + compressed > bytes.length) throw new Error('Truncated ZIP entry.');
    let output: Uint8Array;
    if (method === 0) output = bytes.slice(start, start + compressed);
    else {
      const stream = new Blob([bytes.slice(start, start + compressed).buffer]).stream()
        .pipeThrough(new DecompressionStream('deflate-raw' as CompressionFormat));
      const reader = stream.getReader();
      const pieces: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.byteLength;
        if (length > size || length > MAX_ZIP_BYTES) {
          await reader.cancel();
          throw new Error('ZIP entry expands beyond its stated size.');
        }
        pieces.push(part.value);
      }
      output = new Uint8Array(length);
      let position = 0;
      for (const piece of pieces) { output.set(piece, position); position += piece.byteLength; }
    }
    if (output.byteLength !== size) throw new Error('ZIP entry length mismatch.');
    entries.push({ name, method, size, bytes: output });
  }
  return entries;
}

export async function readImages(files: FileList | File[]) {
  const images = new Map<string, File>();
  for (const file of Array.from(files)) {
    if (file.name.toLowerCase().endsWith('.zip')) {
      for (const entry of await unzip(file)) {
        if (!ALLOWED_IMAGES.test(entry.name)) continue;
        const name = baseName(entry.name);
        const type = name.toLowerCase().endsWith('.png') ? 'image/png' :
          name.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';
        const key = imageKey(name);
        if (images.has(key)) throw new Error(`Duplicate image filename: ${name}`);
        images.set(key, new File([entry.bytes.slice().buffer], name, { type }));
      }
    } else {
      if (!ALLOWED_IMAGES.test(file.name)) throw new Error(`Unsupported image: ${file.name}`);
      if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} exceeds 20 MB.`);
      const key = imageKey(file.name);
      if (images.has(key)) throw new Error(`Duplicate image filename: ${file.name}`);
      images.set(key, file);
    }
    if (images.size > MAX_ROWS) throw new Error('Maximum 500 artworks per batch.');
  }
  return images;
}

async function readXlsx(file: File): Promise<string[][]> {
  const entries = await unzip(file, 160);
  const named = new Map(entries.map(entry => [entry.name, new TextDecoder().decode(entry.bytes)]));
  const sheet = named.get('xl/worksheets/sheet1.xml');
  if (!sheet) throw new Error('Excel file needs its artwork list on the first worksheet.');
  const strings = named.get('xl/sharedStrings.xml');
  const shared = strings ? elements(readXml(strings), 'si').map(si => elements(si, 't').map(t => t.textContent || '').join('')) : [];
  const doc = readXml(sheet);
  const rows: string[][] = [];
  for (const row of elements(doc, 'row')) {
    const cells: string[] = [];
    for (const cell of elements(row, 'c')) {
      const label = cell.getAttribute('r')?.match(/^[A-Z]+/)?.[0] || 'A';
      let column = 0;
      for (const letter of label) column = column * 26 + letter.charCodeAt(0) - 64;
      if (column > 30) throw new Error('Excel file has too many columns.');
      const raw = cell.getAttribute('t') === 'inlineStr' ? textOf(cell, 't') : textOf(cell, 'v');
      cells[column - 1] = cell.getAttribute('t') === 's' ? shared[Number(raw)] || '' : raw;
    }
    if (cells.some(value => value?.trim())) rows.push(cells);
    if (rows.length > MAX_ROWS + 1) throw new Error('Maximum 500 artworks per batch.');
  }
  return rows;
}

export async function readManifest(file: File): Promise<BulkRow[]> {
  const rows = file.name.toLowerCase().endsWith('.csv') ? parseCsv(await file.text()) :
    file.name.toLowerCase().endsWith('.xlsx') ? await readXlsx(file) : [];
  if (!rows.length) throw new Error('Upload a CSV or .xlsx spreadsheet with a header row.');
  const normalize = (header: string) => header.trim().toLowerCase().replace(/[^a-z]/g, '');
  const headers = rows[0].map(value => normalize(value || ''));
  const column = (...names: string[]) => headers.findIndex(header => names.includes(header));
  const indexes = {
    filename: column('filename', 'imagefilename', 'imagefile', 'photo'),
    firstName: column('firstname', 'childname', 'name'),
    surname: column('surname', 'childsurname', 'lastname'),
    grade: column('grade'), school: column('school', 'schoolname'),
    className: column('class', 'classname'),
  };
  if (Object.entries(indexes).some(([key, value]) => key !== 'className' && value < 0))
    throw new Error('Spreadsheet needs filename, first_name, surname, grade and school columns. Class is optional.');
  const records = rows.slice(1).filter(row => row.some(value => value?.trim())).map(row => ({
    filename: String(row[indexes.filename] || '').trim(),
    firstName: String(row[indexes.firstName] || '').trim(),
    surname: String(row[indexes.surname] || '').trim(),
    grade: String(row[indexes.grade] || '').trim(),
    school: String(row[indexes.school] || '').trim(),
    className: indexes.className < 0 ? '' : String(row[indexes.className] || '').trim(),
  }));
  if (!records.length || records.length > MAX_ROWS) throw new Error('Spreadsheet must contain 1–500 artworks.');
  return records;
}

export async function prepareBulkImage(file: File) {
  const source = URL.createObjectURL(file);
  let image: HTMLImageElement;
  try {
    image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(`${file.name} is not a readable image.`));
      element.src = source;
    });
  } finally { URL.revokeObjectURL(source); }
  if (Math.max(image.naturalWidth, image.naturalHeight) <= 1600 && file.size <= 1.8 * 1024 * 1024)
    return file;
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Cannot prepare artwork image in this browser.');
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const jpeg = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.78));
  if (!jpeg || jpeg.size > 2 * 1024 * 1024) throw new Error(`${file.name} could not be made small enough for upload.`);
  return new File([jpeg], `${file.name.replace(/\.[^.]+$/, '')}-bragwall.jpg`, { type: 'image/jpeg' });
}
