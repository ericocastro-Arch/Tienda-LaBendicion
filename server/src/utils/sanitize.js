const XSS_REPLACEMENTS = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

export function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[/&<>"']/g, (char) => XSS_REPLACEMENTS[char])
    .trim();
}

function sanitizeValue(value) {
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') return sanitizeObject(value);
  return value;
}

export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const key of Object.keys(obj)) {
    result[key] = sanitizeValue(obj[key]);
  }
  return result;
}

export function stripHtmlTags(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/javascript:/gi, '')
    .trim();
}

export function isValidUsername(input) {
  if (typeof input !== 'string') return false;
  return /^[a-zA-Z0-9_.-]{3,30}$/.test(input.trim());
}

export function isValidPassword(input) {
  if (typeof input !== 'string') return false;
  return input.length >= 6 && input.length <= 72;
}

export function isValidPaymentMethod(input) {
  return ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'].includes(String(input || '').toUpperCase());
}

export function isValidId(input) {
  return Number.isInteger(Number(input)) && Number(input) > 0;
}
