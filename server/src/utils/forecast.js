export function calcularDemandaDiaria(unidadesVendidas, dias) {
  if (!dias || dias <= 0) return 0;
  const total = Number(unidadesVendidas) || 0;
  return Number((total / dias).toFixed(3));
}

export function estimarDiasRestantes(stockActual, demandaDiaria) {
  const stock = Number(stockActual) || 0;
  if (demandaDiaria <= 0) return null; // sin demanda no se puede estimar
  return Math.floor(stock / demandaDiaria);
}

export function sugerirReposicion(stockActual, stockMinimo, demandaDiaria, diasObj = 7) {
  const stock = Number(stockActual) || 0;
  const minimo = Number(stockMinimo) || 0;
  if (demandaDiaria <= 0) return 0; // sin demanda, no hay sugerencia
  // Stock objetivo = stock mínimo + demanda esperada para los próximos días
  const objetivo = minimo + demandaDiaria * diasObj;
  const sugerido = objetivo - stock;
  return sugerido > 0 ? Math.ceil(sugerido) : 0;
}

// Genera el pronóstico consolidado a partir de filas de demanda y stock
export function generarPronostico(rows, dias) {
  const ventana = Number(dias) > 0 ? Number(dias) : 30;
  return rows.map((r) => {
    const demandaDiaria = calcularDemandaDiaria(r.unidades_vendidas, ventana);
    const diasRestantes = estimarDiasRestantes(r.stock_actual, demandaDiaria);
    const sugerido = sugerirReposicion(r.stock_actual, r.stock_minimo, demandaDiaria);

    const fechaEstimada = diasRestantes === null || diasRestantes === undefined
      ? null
      : new Date(Date.now() + diasRestantes * 24 * 60 * 60 * 1000).toISOString();

    const estado = diasRestantes === null
      ? 'SIN_DEMANDA'
      : diasRestantes <= 0
        ? 'AGOTADO'
        : diasRestantes <= 3
          ? 'URGENTE'
          : diasRestantes <= 7
            ? 'PRONTO'
            : 'OK';

    return {
      productId: r.id,
      nombre: r.nombre,
      codigoBarras: r.codigo_barras,
      categoria: r.categoria_nombre,
      unidadesVendidas: Number(r.unidades_vendidas) || 0,
      demandaDiaria,
      stockActual: Number(r.stock_actual) || 0,
      stockMinimo: Number(r.stock_minimo) || 0,
      diasRestantes,
      fechaEstimadaAgotamiento: fechaEstimada,
      cantidadSugeridaReposicion: sugerido,
      estado,
    };
  });
}
