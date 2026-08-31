import {
  ESC,
  GS,
  LF,
  init,
  feed,
  alignLeft,
  alignCenter,
  alignRight,
  boldOn,
  boldOff,
  doubleSizeOn,
  doubleSizeOff,
  cut,
  cutPartial,
  openDrawer,
  buildTicket,
  normalizarAscii,
  formatMoney,
  formatDate,
  padLeft,
  padRight,
  padTicketRow,
  padAmountRow,
} from '../src/utils/escpos.js';

describe('escpos.js - generador ESC/POS', () => {
  test('comandos de control generan los bytes esperados', () => {
    expect(init()).toEqual(Buffer.from([ESC, 0x40]));
    expect(alignLeft()).toEqual(Buffer.from([ESC, 0x61, 0x00]));
    expect(alignCenter()).toEqual(Buffer.from([ESC, 0x61, 0x01]));
    expect(alignRight()).toEqual(Buffer.from([ESC, 0x61, 0x02]));
    expect(boldOn()).toEqual(Buffer.from([ESC, 0x45, 0x01]));
    expect(boldOff()).toEqual(Buffer.from([ESC, 0x45, 0x00]));
    expect(doubleSizeOn()).toEqual(Buffer.from([GS, 0x21, 0x11]));
    expect(doubleSizeOff()).toEqual(Buffer.from([GS, 0x21, 0x00]));
    expect(cut()).toEqual(Buffer.from([GS, 0x56, 0x00]));
    expect(cutPartial()).toEqual(Buffer.from([GS, 0x56, 0x01]));
    expect(openDrawer()).toEqual(Buffer.from([ESC, 0x70, 0x00, 0x19, 0xfa]));
    expect(feed(2)).toEqual(Buffer.from([LF, LF]));
  });

  test('normalizarAscii quita acentos y caracteres no imprimibles', () => {
    expect(normalizarAscii('BENDICIÓN')).toBe('BENDICION');
    expect(normalizarAscii('100% café')).toBe('100% cafe');
  });

  test('formatMoney formatea con signo de dolar y 2 decimales', () => {
    expect(formatMoney(12.5)).toBe('$12.50');
    expect(formatMoney('8')).toBe('$8.00');
    expect(formatMoney(undefined)).toBe('$0.00');
  });

  test('formatDate formatea fecha a dd/mm/yyyy hh:mm', () => {
    expect(formatDate(new Date(2025, 0, 5, 9, 7))).toBe('05/01/2025 09:07');
    expect(formatDate()).toBe('');
    expect(formatDate('no-fecha')).toBe('no-fecha');
  });

  test('padLeft y padRight rellenan correctamente', () => {
    expect(padLeft('7', 4)).toBe('   7');
    expect(padRight('PAN', 6)).toBe('PAN   ');
    expect(padLeft('123456', 4)).toBe('123456');
    expect(padRight('123456', 4)).toBe('123456');
  });

  test('padTicketRow alinea columnas de detalle', () => {
    const row = padTicketRow('COCA COLA', '2', '1.50');
    expect(row).toContain('COCA COLA');
    expect(row.length).toBeGreaterThan(24);
    expect(row).toMatch(/\s+2\s+1.50$/);
  });

  test('padAmountRow alinea importes a la derecha', () => {
    const row = padAmountRow('TOTAL', 25);
    expect(row).toContain('TOTAL:');
    expect(row).toMatch(/\$25\.00$/);
  });

  test('buildTicket construye un buffer binario encadenando comandos', () => {
    const ticket = buildTicket({
      store: { nombre: 'Tienda La Bendición', direccion: 'Barrio Centro', telefono: '7000-0000' },
      sale: {
        id: 10,
        numero_comprobante: 'A-001',
        subtotal: 20,
        descuento: 2,
        total: 18,
        metodo_pago: 'EFECTIVO',
        monto_recibido: 50,
        cambio: 32,
        cajero_nombre: 'Juan Perez',
        user: { nombre: 'Juan' },
        created_at: new Date(2025, 0, 5, 9, 7),
        items: [{ nombre: 'COCA COLA', cantidad: 2, precio_venta_unit: 1.5, subtotal: 3 }],
      },
    });

    expect(ticket).toBeInstanceOf(Buffer);
    expect(ticket.length).toBeGreaterThan(10);
    expect(ticket[0]).toBe(ESC);
    expect(ticket.subarray(0, 2)).toEqual(Buffer.from([ESC, 0x40]));
    expect(ticket.toString('latin1')).toContain('TICKET: A-001');
    expect(ticket.toString('latin1')).toContain('COCA COLA');
    expect(ticket.toString('latin1')).toContain('CAMBIO');
    expect(ticket.subarray(ticket.length - 3)).toEqual(Buffer.from([GS, 0x56, 0x00]));
  });

  test('buildTicket sin descuento ni efectivo no incluye esas lineas', () => {
    const ticket = buildTicket({
      store: { nombre: 'Tienda' },
      sale: {
        id: 1,
        subtotal: 10,
        descuento: 0,
        total: 10,
        metodo_pago: 'TARJETA',
        user: { nombre: 'Ana' },
        items: [],
      },
    });
    const text = ticket.toString('latin1');
    expect(text).toContain('TARJETA');
    expect(text).not.toContain('DESCUENTO');
    expect(text).not.toContain('CAMBIO');
  });
});
