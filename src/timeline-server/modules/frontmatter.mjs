export function parseFrontMatter(rawText) {
  if (!rawText.startsWith('---\n')) {
    return { meta: {}, body: rawText };
  }

  const endMarker = '\n---\n';
  const endIndex = rawText.indexOf(endMarker, 4);
  if (endIndex === -1) {
    return { meta: {}, body: rawText };
  }

  const header = rawText.slice(4, endIndex);
  const body = rawText.slice(endIndex + endMarker.length);
  const meta = {};

  for (const line of header.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    meta[key] = value;
  }

  return { meta, body };
}
