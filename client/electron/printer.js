import { printer as Printer, types as PrinterTypes } from 'node-thermal-printer';

export function resolvePrinterName(env = process.env) {
  return env.LA_BENDICION_PRINTER || 'POS-58';
}

export function createPrinter(interfaceName = resolvePrinterName()) {
  return new Printer({
    type: PrinterTypes.EPSON,
    interface: `printer:${interfaceName}`,
    characterSet: 'SLOVENIA',
    removeSpecialCharacters: false,
  });
}

export async function printRawBuffer(buffer, interfaceName = resolvePrinterName()) {
  const p = createPrinter(interfaceName);
  const connected = await p.isPrinterConnected();
  if (!connected) {
    throw new Error(`No se pudo conectar a la impresora termica '${interfaceName}'`);
  }
  p.raw(buffer);
  await p.execute();
  return { ok: true, printer: interfaceName };
}
