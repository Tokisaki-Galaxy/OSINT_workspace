function escapeHtml(input) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeHref(href) {
  try {
    const url = new URL(href, 'http://localhost');
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return href;
    }
  } catch {
    return '#';
  }
  return '#';
}

function svgPlaceholder() {
  return `<div class="md-image-placeholder" role="img" aria-label="图片已替换为占位图"><svg viewBox="0 0 420 180" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8f0ff"/><stop offset="100%" stop-color="#d9f6f2"/></linearGradient></defs><rect x="0" y="0" width="420" height="180" rx="16" fill="url(#g)"/><g fill="none" stroke="#6b7280" stroke-width="2.5"><rect x="38" y="38" width="344" height="104" rx="12"/><path d="M66 122l72-50 58 42 46-30 52 38"/><circle cx="123" cy="76" r="14"/></g><text x="210" y="156" text-anchor="middle" fill="#475569" font-size="14" font-family="Segoe UI, Arial">Image removed • 图片已移除</text></svg></div>`;
}

function replaceImageBlocks(markdown) {
  const marker = '__IMG_PLACEHOLDER__';
  const mdImage = /!\[[^\]]*\]\([^\)]+\)/g;
  const htmlImage = /<img\b[^>]*>/gi;
  return markdown.replace(mdImage, marker).replace(htmlImage, marker);
}

function renderInline(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_, label, href) => {
    const safe = escapeHtml(safeHref(href.trim()));
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  return html;
}

export function renderMarkdown(markdown) {
  const withMarkers = replaceImageBlocks(markdown);
  const blocks = withMarkers.replace(/\r\n/g, '\n').split(/\n{2,}/);
  const htmlBlocks = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    if (trimmed === '__IMG_PLACEHOLDER__') {
      htmlBlocks.push(svgPlaceholder());
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      htmlBlocks.push(`<h${level}>${renderInline(headingMatch[2].trim())}</h${level}>`);
      continue;
    }

    const lines = trimmed.split('\n');
    if (lines.every((line) => /^\s*[-*]\s+/.test(line) || line.trim() === '__IMG_PLACEHOLDER__')) {
      const items = lines
        .filter(Boolean)
        .map((line) => {
          if (line.trim() === '__IMG_PLACEHOLDER__') {
            return `<li>${svgPlaceholder()}</li>`;
          }
          return `<li>${renderInline(line.replace(/^\s*[-*]\s+/, ''))}</li>`;
        })
        .join('');
      htmlBlocks.push(`<ul>${items}</ul>`);
      continue;
    }

    const paragraph = lines
      .map((line) => (line.trim() === '__IMG_PLACEHOLDER__' ? svgPlaceholder() : renderInline(line)))
      .join('<br/>');
    htmlBlocks.push(`<p>${paragraph}</p>`);
  }

  return htmlBlocks.join('\n');
}
