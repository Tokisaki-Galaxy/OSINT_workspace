import { getRootOptions } from '../src/timeline-server/modules/service.mjs';
import { getErrorStatus, requireGet, sendJson } from './_shared.mjs';

export default async function handler(req, res) {
  if (!requireGet(req, res)) return;

  try {
    const options = await getRootOptions();
    sendJson(res, 200, { options });
  } catch (error) {
    sendJson(res, getErrorStatus(error), {
      error: error instanceof Error ? error.message : 'Unexpected error',
    });
  }
}
