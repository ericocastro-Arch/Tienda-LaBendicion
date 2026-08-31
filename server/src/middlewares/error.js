export function notFound(_req, res) {
  res.status(404).json({ error: 'Recurso no encontrado' });
}

export function errorHandler(err, _req, res, _next) {
  console.error('[server] error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
}