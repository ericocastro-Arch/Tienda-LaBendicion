export function notImplemented(req, res) {
  res.status(501).json({
    modulo: req.baseUrl.replace('/api', ''),
    estado: 'en-construccion',
    mensaje: 'Módulo pendiente de implementación',
  });
}