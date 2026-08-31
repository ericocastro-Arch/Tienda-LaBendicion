import { sanitizeObject } from '../utils/sanitize.js';

export function sanitizeRequest(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    const sanitized = sanitizeObject(req.query);
    for (const key of Object.keys(req.query)) {
      req.query[key] = sanitized[key];
    }
  }
  if (req.params && typeof req.params === 'object') {
    const sanitized = sanitizeObject(req.params);
    for (const key of Object.keys(req.params)) {
      req.params[key] = sanitized[key];
    }
  }
  next();
}
