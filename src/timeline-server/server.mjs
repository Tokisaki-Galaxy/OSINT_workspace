import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';

import { AppError, getArticle, getRootOptions, getTimeline } from './modules/service.mjs';

const rawPort = process.env.PORT ?? '3986';
const PORT = Number(rawPort);
if (!Number.isInteger(PORT) || PORT <= 0 || PORT > 65535) {
  throw new Error(`PORT must be a valid number between 1 and 65535, got: ${rawPort}`);
}
const PUBLIC_DIR = path.resolve(process.cwd(), 'src/timeline-server/public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': MIME_TYPES['.json'],
    'cache-control': 'no-store',
  });
  res.end(body);
}

function getErrorStatus(error) {
  if (error instanceof AppError) return error.status;
  if (error && typeof error === 'object' && 'code' in error) {
    const code = error.code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return 404;
  }
  return 500;
}

async function sendStatic(res, pathname) {
  const filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname.slice(1));
  const normalized = path.resolve(filePath);
  const publicBase = `${PUBLIC_DIR}${path.sep}`;
  if (normalized !== PUBLIC_DIR && !normalized.startsWith(publicBase)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const content = await fs.readFile(normalized);
    const ext = path.extname(normalized);
    res.writeHead(200, {
      'content-type': MIME_TYPES[ext] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(content);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `localhost:${PORT}`}`);

    if (req.method === 'GET' && url.pathname === '/api/root-options') {
      const options = await getRootOptions();
      sendJson(res, 200, { options });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/timeline') {
      const rootPath = url.searchParams.get('rootPath') || '';
      const sort = url.searchParams.get('sort') || 'desc';
      const start = url.searchParams.get('start') || '';
      const end = url.searchParams.get('end') || '';

      const timeline = await getTimeline({ rootPath, sort, start, end });
      sendJson(res, 200, timeline);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/article') {
      const rootPath = url.searchParams.get('rootPath') || '';
      const id = url.searchParams.get('id') || '';

      const article = await getArticle({ rootPath, id });
      sendJson(res, 200, article);
      return;
    }

    await sendStatic(res, url.pathname);
  } catch (error) {
    sendJson(res, getErrorStatus(error), {
      error: error instanceof Error ? error.message : 'Unexpected error',
    });
  }
});

server.listen(PORT, () => {
  console.log(`Timeline viewer running: http://localhost:${PORT}`);
});
