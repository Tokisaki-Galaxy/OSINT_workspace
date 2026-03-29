export function parseFrontMatter(rawText) {
  const normalizedRaw = String(rawText ?? '');
  const text = normalizedRaw.charCodeAt(0) === 0xfeff ? normalizedRaw.slice(1) : normalizedRaw;
  const lines = text.split(/\r?\n/);

  if (lines[0]?.trim() !== '---') {
    return { meta: {}, body: text };
  }

  const endLineIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (endLineIndex === -1) {
    return { meta: {}, body: text };
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
