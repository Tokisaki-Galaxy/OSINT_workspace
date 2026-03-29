export function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

export function getErrorStatus(error) {
  if (error && typeof error === 'object' && 'status' in error && Number.isInteger(error.status)) {
    return error.status;
  }
  if (error && typeof error === 'object' && 'code' in error) {
    const code = error.code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return 404;
  }
  return 500;
}

export function requireGet(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return false;
  }
  return true;
}
