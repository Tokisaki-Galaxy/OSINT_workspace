const refs = {
  rootOptions: document.querySelector('#root-options'),
  useOption: document.querySelector('#use-option'),
  rootPath: document.querySelector('#root-path'),
  loadBtn: document.querySelector('#load-btn'),
  sort: document.querySelector('#sort'),
  start: document.querySelector('#start'),
  end: document.querySelector('#end'),
  timelineList: document.querySelector('#timeline-list'),
  meta: document.querySelector('#meta'),
  article: document.querySelector('#article'),
};

let currentItems = [];
let activeId = '';

function escapeHtml(input) {
  return String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildQuery(params) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      search.set(k, v);
    }
  }
  return search.toString();
}

async function fetchJson(url) {
  const resp = await fetch(url);
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

function renderMeta(meta, title) {
  const location = meta.location || '未提供';
  refs.meta.innerHTML = `
    <h2>${escapeHtml(title || '未命名文章')}</h2>
    <div class="meta-grid">
      <div class="meta-item"><small>作者</small><strong>${escapeHtml(meta.author || '未提供')}</strong></div>
      <div class="meta-item"><small>位置（location）</small><strong>${escapeHtml(location)}</strong></div>
      <div class="meta-item"><small>创建时间</small><strong>${escapeHtml(meta.created || '未提供')}</strong></div>
      <div class="meta-item"><small>更新时间</small><strong>${escapeHtml(meta.modified || '未提供')}</strong></div>
      <div class="meta-item"><small>点赞</small><strong>${escapeHtml(meta.upvote_num || '0')}</strong></div>
      <div class="meta-item"><small>评论</small><strong>${escapeHtml(meta.comment_num || '0')}</strong></div>
    </div>
    <p><small>原文链接：</small>${
      meta.url && meta.url !== '未提供'
        ? `<a href="${escapeHtml(meta.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(meta.url)}</a>`
        : '未提供'
    }</p>
  `;
}

function renderTimeline(items) {
  refs.timelineList.innerHTML = '';
  if (!items.length) {
    refs.timelineList.innerHTML = '<li>该时间段暂无数据</li>';
    refs.meta.textContent = '';
    refs.article.textContent = '没有可显示的文章';
    return;
  }

  for (const item of items) {
    const li = document.createElement('li');
    li.dataset.id = item.id;
    li.innerHTML = `
      <div class="item-time">${escapeHtml(item.created)} · ${escapeHtml(item.location || '未知')}</div>
      <div class="item-title">${escapeHtml(item.title)}</div>
    `;
    li.addEventListener('click', () => selectArticle(item.id));
    refs.timelineList.appendChild(li);
  }
}

function markActive(id) {
  activeId = id;
  for (const li of refs.timelineList.querySelectorAll('li')) {
    li.classList.toggle('active', li.dataset.id === id);
  }
}

async function loadTimeline() {
  const rootPath = refs.rootPath.value.trim();
  if (!rootPath) {
    alert('请先输入根目录绝对路径');
    return;
  }

  const query = buildQuery({
    rootPath,
    sort: refs.sort.value,
    start: refs.start.value,
    end: refs.end.value,
  });

  const data = await fetchJson(`/api/timeline?${query}`);
  currentItems = data.items || [];
  renderTimeline(currentItems);
  if (currentItems.length) {
    await selectArticle(currentItems[0].id);
  }
}

async function selectArticle(id) {
  const rootPath = refs.rootPath.value.trim();
  const query = buildQuery({ rootPath, id });
  const data = await fetchJson(`/api/article?${query}`);
  markActive(id);
  renderMeta(data.meta || {}, data.title);
  refs.article.innerHTML = data.html || '<p>正文为空</p>';
}

async function loadRootOptions() {
  const data = await fetchJson('/api/root-options');
  refs.rootOptions.innerHTML = '';

  const options = data.options || [];
  if (!options.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '未发现候选目录';
    refs.rootOptions.appendChild(option);
    return;
  }

  for (const pathValue of options) {
    const option = document.createElement('option');
    option.value = pathValue;
    option.textContent = pathValue;
    refs.rootOptions.appendChild(option);
  }
}

refs.useOption.addEventListener('click', () => {
  const selected = refs.rootOptions.value;
  if (selected) refs.rootPath.value = selected;
});

refs.loadBtn.addEventListener('click', async () => {
  refs.loadBtn.disabled = true;
  refs.loadBtn.textContent = '加载中...';
  try {
    await loadTimeline();
  } catch (error) {
    alert(error instanceof Error ? error.message : '加载失败');
  } finally {
    refs.loadBtn.disabled = false;
    refs.loadBtn.textContent = '加载时间线';
  }
});

for (const input of [refs.sort, refs.start, refs.end]) {
  input.addEventListener('change', async () => {
    if (!refs.rootPath.value.trim()) return;
    try {
      await loadTimeline();
    } catch (error) {
      console.error(error);
    }
  });
}

loadRootOptions().catch(() => {
  refs.rootOptions.innerHTML = '<option value="">读取候选目录失败</option>';
});
