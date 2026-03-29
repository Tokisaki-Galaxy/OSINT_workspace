const FILE_DATE_RE = /_(\d{4}-\d{2}-\d{2})_/;

function pad2(input) {
  return String(input).padStart(2, '0');
}

export function normalizeDateTime(text, fallbackFileName = '') {
  if (typeof text === 'string') {
    const trimmed = text.trim();
    const m = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
      const [, d, hh = '00', mm = '00', ss = '00'] = m;
      return `${d} ${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
    }
  }

  const fromFile = fallbackFileName.match(FILE_DATE_RE);
  if (fromFile) {
    return `${fromFile[1]} 00:00:00`;
  }

  return null;
}

export function toTimestamp(dateTimeText) {
  if (!dateTimeText) return null;
  const iso = dateTimeText.replace(' ', 'T');
  const ts = Date.parse(iso);
  return Number.isNaN(ts) ? null : ts;
}

export function fromDateTimeLocal(input) {
  if (!input) return null;
  const m = String(input).trim().match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, d, hh, mm, ss = '00'] = m;
  return `${d} ${hh}:${mm}:${ss}`;
}
