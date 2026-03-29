import { getArticle } from '../src/timeline-server/modules/service.mjs';
import { getErrorStatus, requireGet, sendJson } from './_shared.mjs';

export default async function handler(req, res) {
  if (!requireGet(req, res)) return;

  try {
    const rootPath = String(req.query.rootPath || '');
    const id = String(req.query.id || '');

    const article = await getArticle({ rootPath, id });
    sendJson(res, 200, article);
  } catch (error) {
    sendJson(res, getErrorStatus(error), {
      error: error instanceof Error ? error.message : 'Unexpected error',
    });
  }
}
