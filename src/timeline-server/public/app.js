const refs = {
  openDirBtn: document.querySelector('#open-dir-btn'),
  dirLabel: document.querySelector('#dir-label'),
  sort: document.querySelector('#sort'),
  start: document.querySelector('#start'),
  end: document.querySelector('#end'),
  search: document.querySelector('#search'),
  timelineList: document.querySelector('#timeline-list'),
  meta: document.querySelector('#meta'),
  article: document.querySelector('#article'),
};

const fsAccessSupported = typeof window.showDirectoryPicker === 'function';
let selectedRootHandle = null;
let extractedDirHandle = null;
let allItems = [];
let filteredItems = [];
let activeId = '';
let reloadTimer = null;

function escapeHtml(input) {
  return String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseFrontMatter(rawText) {
  const normalizedRaw = String(rawText ?? '');
  const text = normalizedRaw.charCodeAt(0) === 0xfeff ? normalizedRaw.slice(1) : normalizedRaw;
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return { meta: {}, body: text };
  const endLineIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (endLineIndex === -1) return { meta: {}, body: text };

  const headerLines = lines.slice(1, endLineIndex);
  const body = lines.slice(endLineIndex + 1).join('\n');
  const meta = {};
  for (const line of headerLines) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) meta[key] = value;
  }
  return { meta, body };
}

function formatTs(ts) {
  if (ts === null || ts === undefined || Number.isNaN(ts)) return '未知时间';
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function toInputDateTs(inputValue) {
  if (!inputValue) return null;
  const d = new Date(inputValue);
  if (Number.isNaN(d.getTime())) return null;
  return d.getTime();
}

function parseDateTime(text, filename = '') {
  if (typeof text === 'string') {
    const t = text.trim();
    if (t) {
      const normalized = t
        .replace(/\//g, '-')
        .replace('T', ' ')
        .replace(/年|\./g, '-')
        .replace(/月/g, '-')
        .replace(/日/g, '');

      const m = normalized.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/,
      );
      if (m) {
        const [
          ,
          y,
          mo,
          da,
          hh = '0',
          mm = '0',
          ss = '0',
        ] = m;
        const date = new Date(
          Number(y),
          Number(mo) - 1,
          Number(da),
          Number(hh),
          Number(mm),
          Number(ss),
        );
        const ts = date.getTime();
        if (!Number.isNaN(ts)) return ts;
      }
    }
  }

  const fileMatch = String(filename).match(/_(\d{4}-\d{2}-\d{2})_/);
  if (fileMatch) {
    const date = new Date(`${fileMatch[1]}T00:00:00`);
    const ts = date.getTime();
    return Number.isNaN(ts) ? null : ts;
  }
  return null;
}

function safeHref(href) {
  if (!/^https?:\/\//i.test(href)) return '#';
  try {
    const u = new URL(href);
    return u.protocol === 'http:' || u.protocol === 'https:' ? href : '#';
  } catch {
    return '#';
  }
}

function imagePlaceholder() {
  return '<div class="md-image-placeholder" aria-label="图片已省略">【🖼 图片已省略】</div>';
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
  if (!line.includes(marker)) return renderInline(line);
  return line
    .split(marker)
    .map((chunk) => renderInline(chunk))
    .join(imagePlaceholder());
}

function renderMarkdown(markdown) {
  const isCodeFence = (input) => /^```/.test(input.trim());
  const withMarkers = replaceImageBlocks(markdown);
  const lines = withMarkers.replace(/\r\n/g, '\n').split('\n');
  const htmlBlocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (isCodeFence(trimmed)) {
      const lang = trimmed.slice(3).trim();
      const codeLines = [];
      i += 1;
      while (i < lines.length && !isCodeFence(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      const codeHtml = escapeHtml(codeLines.join('\n'));
      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      htmlBlocks.push(`<pre><code${langClass}>${codeHtml}</code></pre>`);
      continue;
    }

    if (trimmed === '__IMG_PLACEHOLDER__') {
      htmlBlocks.push(imagePlaceholder());
      i += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      htmlBlocks.push(`<h${level}>${renderInline(headingMatch[2].trim())}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      htmlBlocks.push(`<blockquote>${quote.map((l) => renderLineWithPlaceholders(l)).join('<br/>')}</blockquote>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i += 1;
      }
      htmlBlocks.push(`<ul>${items.map((it) => `<li>${renderLineWithPlaceholders(it)}</li>`).join('')}</ul>`);
      continue;
    }

    const para = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !isCodeFence(lines[i])) {
      if (/^(#{1,6})\s+/.test(lines[i].trim()) || /^\s*[-*]\s+/.test(lines[i]) || /^>\s?/.test(lines[i].trim())) {
        break;
      }
      para.push(lines[i]);
      i += 1;
    }
    htmlBlocks.push(`<p>${para.map((l) => renderLineWithPlaceholders(l)).join('<br/>')}</p>`);
  }

  return htmlBlocks.join('\n');
}

async function iterateMdFiles(dirHandle) {
  const files = [];
  // eslint-disable-next-line no-restricted-syntax
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.md')) {
      files.push(entry);
    }
  }
  return files;
}

function renderMeta(meta, title) {
  refs.meta.innerHTML = `
    <h2>${escapeHtml(title || '未命名文章')}</h2>
    <div class="meta-grid">
      <div class="meta-cell">
        <p class="label">作者</p>
        <p class="value">${escapeHtml(meta.author || '未提供')}</p>
      </div>
      <div class="meta-cell">
        <p class="label">日期</p>
        <p class="value">${escapeHtml(meta.created || '未提供')}</p>
      </div>
      <div class="meta-cell">
        <p class="label">点赞</p>
        <p class="value">${escapeHtml(String(meta.upvote_num || '0'))}</p>
      </div>
      <div class="meta-cell">
        <p class="label">评论</p>
        <p class="value">${escapeHtml(String(meta.comment_num || '0'))}</p>
      </div>
    </div>
    <div class="meta-link">
      原文链接：
      ${
        meta.url && meta.url !== '未提供'
          ? `<a href="${escapeHtml(meta.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(meta.url)}</a>`
          : '未提供'
      }
    </div>
  `;
}

function markActive(id) {
  activeId = id;
  for (const el of refs.timelineList.querySelectorAll('.timeline-item')) {
    el.classList.toggle('active', el.dataset.id === id);
  }
}

function renderTimeline(items) {
  refs.timelineList.innerHTML = '';
  if (!items.length) {
    refs.timelineList.innerHTML = '<li class="timeline-item">当前筛选条件下暂无数据</li>';
    refs.meta.innerHTML = '';
    refs.article.innerHTML = '<p class="empty-hint">没有可显示的文章</p>';
    activeId = '';
    return;
  }

  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'timeline-item';
    li.dataset.id = item.id;
    li.innerHTML = `
      <p class="item-title">${escapeHtml(item.title || item.id)}</p>
      <div class="item-sub">${escapeHtml(item.createdText)} · ${escapeHtml(item.author || '未知作者')}</div>
    `;
    li.addEventListener('click', () => selectArticle(item.id));
    refs.timelineList.appendChild(li);
  }

  const selected = items.find((item) => item.id === activeId) || items[0];
  void selectArticle(selected.id);
}

function applyFilters() {
  const startTs = toInputDateTs(refs.start.value);
  const endTs = toInputDateTs(refs.end.value);
  const query = refs.search.value.trim().toLowerCase();

  filteredItems = allItems
    .filter((item) => {
      if (startTs !== null && (item.timestamp === null || item.timestamp < startTs)) return false;
      if (endTs !== null && (item.timestamp === null || item.timestamp > endTs)) return false;
      if (!query) return true;
      if (!item.searchBody) {
        item.searchBody = (item.body || '').replace(/\s+/g, ' ').toLowerCase();
      }
      return (
        item.title.toLowerCase().includes(query)
        || item.author.toLowerCase().includes(query)
        || item.searchBody.includes(query)
      );
    })
    .sort((a, b) => {
      if (a.timestamp === null && b.timestamp === null) return 0;
      if (a.timestamp === null) return 1;
      if (b.timestamp === null) return -1;
      return refs.sort.value === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
    });

  renderTimeline(filteredItems);
}

async function readTimelineFromDirectory() {
  if (!extractedDirHandle) return;

  const fileHandles = await iterateMdFiles(extractedDirHandle);
  const rows = [];

  await Promise.all(
    fileHandles.map(async (entry) => {
      const file = await entry.getFile();
      const raw = await file.text();
      const { meta, body } = parseFrontMatter(raw);
      const ts = parseDateTime(meta.created || meta.modified || '', entry.name);
      rows.push({
        id: entry.name,
        title: meta.title || entry.name.replace(/\.md$/i, ''),
        author: meta.author || '未知作者',
        createdText: formatTs(ts),
        timestamp: ts,
        body,
        searchBody: '',
        meta: {
          ...meta,
          created: formatTs(ts),
          url: meta.url || '未提供',
          upvote_num: meta.upvote_num || '0',
          comment_num: meta.comment_num || '0',
        },
      });
    }),
  );

  allItems = rows;
  applyFilters();
}

async function selectArticle(id) {
  const item = filteredItems.find((v) => v.id === id) || allItems.find((v) => v.id === id);
  if (!item) return;
  markActive(item.id);
  renderMeta(item.meta, item.title);
  refs.article.innerHTML = renderMarkdown(item.body || '');
}

function setLoading(isLoading) {
  refs.openDirBtn.disabled = isLoading;
  refs.openDirBtn.textContent = isLoading ? '读取中...' : '打开目录';
}

async function openDirectory() {
  if (!fsAccessSupported) {
    alert('当前浏览器不支持 File System Access API，请使用支持该能力的浏览器（如 Chrome、Edge）。');
    return;
  }

  try {
    setLoading(true);
    selectedRootHandle = await window.showDirectoryPicker({ mode: 'read' });
    let target = null;

    if (selectedRootHandle.name === 'extracted_mds') {
      target = selectedRootHandle;
    } else {
      target = await selectedRootHandle.getDirectoryHandle('extracted_mds');
    }

    extractedDirHandle = target;
    refs.dirLabel.textContent = `已选择：${selectedRootHandle.name}${target !== selectedRootHandle ? '/extracted_mds' : ''}`;
    await readTimelineFromDirectory();
  } catch (error) {
    if (error?.name === 'AbortError') return;
    if (error?.name === 'NotFoundError') {
      alert('目录读取失败：所选目录中未找到 extracted_mds 子目录。');
      return;
    }
    alert('目录读取失败：请确认你已授予目录读取权限并重试。');
    console.error(error);
  } finally {
    setLoading(false);
  }
}

function debounceReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    if (!allItems.length) return;
    applyFilters();
  }, 120);
}

refs.openDirBtn.addEventListener('click', () => {
  void openDirectory();
});

for (const el of [refs.sort, refs.start, refs.end]) {
  el.addEventListener('change', debounceReload);
}
refs.search.addEventListener('input', debounceReload);

if (!fsAccessSupported) {
  refs.openDirBtn.disabled = true;
  refs.openDirBtn.textContent = '当前浏览器不支持';
  refs.dirLabel.textContent = '请使用支持 File System Access API 的浏览器（如 Chrome、Edge）';
}
