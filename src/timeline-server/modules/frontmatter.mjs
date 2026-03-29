export function parseFrontMatter(rawText) {
  const text = typeof rawText === 'string' && rawText.charCodeAt(0) === 0xfeff
    ? rawText.slice(1)
    : rawText;
  const lines = String(text).split(/\r?\n/);

  if (lines[0]?.trim() !== '---') {
    return { meta: {}, body: String(text) };
  }

  const endLineIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (endLineIndex === -1) {
    return { meta: {}, body: String(text) };
  }

  const headerLines = lines.slice(1, endLineIndex);
  const body = lines.slice(endLineIndex + 1).join('\n');
  const meta = {};

  for (const line of headerLines) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    meta[key] = value;
  }

  return { meta, body };
}
