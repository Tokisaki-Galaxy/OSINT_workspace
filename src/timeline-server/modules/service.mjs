import { promises as fs } from 'node:fs';
import path from 'node:path';

import { parseFrontMatter } from './frontmatter.mjs';
import { renderMarkdown } from './markdown.mjs';
import { fromDateTimeLocal, normalizeDateTime, toTimestamp } from './time.mjs';

const ROOT_SCAN_DEPTH = 3;

function ensureAbsoluteRoot(rootPath) {
  if (!rootPath || !path.isAbsolute(rootPath)) {
    throw new Error('rootPath 必须是绝对路径');
  }
  return path.resolve(rootPath);
}

async function listMdFiles(targetDir) {
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name);
}

export async function getRootOptions(baseDir = process.cwd()) {
  const found = new Set();

  async function walk(current, depth) {
    if (depth > ROOT_SCAN_DEPTH) return;

    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    const hasExtracted = entries.some((entry) => entry.isDirectory() && entry.name === 'extracted_mds');
    if (hasExtracted) {
      found.add(current);
      return;
    }

    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => walk(path.join(current, entry.name), depth + 1)),
    );
  }

  await walk(baseDir, 0);
  return [...found].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

export async function getTimeline({ rootPath, sort = 'desc', start, end }) {
  const root = ensureAbsoluteRoot(rootPath);
  const extractedDir = path.join(root, 'extracted_mds');
  const mdFiles = await listMdFiles(extractedDir);

  const startTs = start ? toTimestamp(fromDateTimeLocal(start) ?? '') : null;
  const endTs = end ? toTimestamp(fromDateTimeLocal(end) ?? '') : null;

  const rows = await Promise.all(
    mdFiles.map(async (fileName) => {
      const fullPath = path.join(extractedDir, fileName);
      const raw = await fs.readFile(fullPath, 'utf8');
      const { meta } = parseFrontMatter(raw);
      const created = normalizeDateTime(meta.created, fileName) ?? '时间未知';
      const ts = toTimestamp(created);
      return {
        id: fileName,
        fileName,
        title: meta.title || fileName.replace(/\.md$/, ''),
        created,
        timestamp: ts ?? -Infinity,
        location: meta.location || '未知',
      };
    }),
  );

  const filtered = rows.filter((row) => {
    if (startTs !== null && row.timestamp < startTs) return false;
    if (endTs !== null && row.timestamp > endTs) return false;
    return true;
  });

  filtered.sort((a, b) => (sort === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp));

  return {
    total: filtered.length,
    items: filtered,
  };
}

export async function getArticle({ rootPath, id }) {
  const root = ensureAbsoluteRoot(rootPath);
  const rawId = String(id || '');
  const normalizedId = path.posix.normalize(rawId.replaceAll('\\', '/'));
  const safeName = path.basename(normalizedId);
  const hasUnsafeSegments =
    normalizedId.includes('..') || normalizedId.startsWith('/') || normalizedId.includes('\0');
  if (!safeName.endsWith('.md') || safeName !== normalizedId || hasUnsafeSegments) {
    throw new Error('文章 ID 非法');
  }

  const fullPath = path.join(root, 'extracted_mds', safeName);
  const raw = await fs.readFile(fullPath, 'utf8');
  const { meta, body } = parseFrontMatter(raw);

  return {
    id: safeName,
    title: meta.title || safeName.replace(/\.md$/, ''),
    meta: {
      title: meta.title || '未提供',
      author: meta.author || '未提供',
      author_badge: meta.author_badge || '未提供',
      location: meta.location || '未提供',
      created: normalizeDateTime(meta.created, safeName) || '未提供',
      modified: normalizeDateTime(meta.modified, safeName) || '未提供',
      url: meta.url || '未提供',
      upvote_num: meta.upvote_num || '0',
      comment_num: meta.comment_num || '0',
    },
    html: renderMarkdown(body),
  };
}
