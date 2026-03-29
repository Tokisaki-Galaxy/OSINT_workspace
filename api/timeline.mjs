import { getTimeline } from '../src/timeline-server/modules/service.mjs';
import { getErrorStatus, requireGet, sendJson } from './_shared.mjs';

export default async function handler(req, res) {
  if (!requireGet(req, res)) return;

  try {
    const rootPath = String(req.query.rootPath || '');
    const sort = String(req.query.sort || 'desc');
    const start = String(req.query.start || '');
    const end = String(req.query.end || '');

    const timeline = await getTimeline({ rootPath, sort, start, end });
    sendJson(res, 200, timeline);
  } catch (error) {
    sendJson(res, getErrorStatus(error), {
      error: error instanceof Error ? error.message : 'Unexpected error',
    });
  }
}
