function escapeHtml(input) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeHref(href) {
  if (!/^https?:\/\//i.test(href)) {
    return '#';
  }

  try {
    const url = new URL(href);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return href;
    }
  } catch {
    return '#';
  }
  return '#';
}

function imagePlaceholder() {
  return `<div class="md-image-placeholder" aria-label="图片已省略">【🖼 图片已省略】</div>`;
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

function renderLineWithPlaceholders(line) {
  const marker = '__IMG_PLACEHOLDER__';
  if (!line.includes(marker)) {
    return renderInline(line);
  }

  return line
    .split(marker)
    .map((chunk) => renderInline(chunk))
    .join(imagePlaceholder());
}

export function renderMarkdown(markdown) {
  const withMarkers = replaceImageBlocks(markdown);
  const blocks = withMarkers.replace(/\r\n/g, '\n').split(/\n{2,}/);
  const htmlBlocks = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    if (trimmed === '__IMG_PLACEHOLDER__') {
      htmlBlocks.push(imagePlaceholder());
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
            return `<li>${imagePlaceholder()}</li>`;
          }
          return `<li>${renderInline(line.replace(/^\s*[-*]\s+/, ''))}</li>`;
        })
        .join('');
      htmlBlocks.push(`<ul>${items}</ul>`);
      continue;
    }

    const paragraph = lines.map((line) => renderLineWithPlaceholders(line)).join('<br/>');
    htmlBlocks.push(`<p>${paragraph}</p>`);
  }

  return htmlBlocks.join('\n');
}
