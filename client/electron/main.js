import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { printRawBuffer, resolvePrinterName } from './printer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function registerPrinters() {
  ipcMain.handle('printer:print-buffer', async (_event, data) => {
    if (!(data instanceof Uint8Array) && !ArrayBuffer.isView(data)) {
      throw new Error('Carga de impresión inválida');
    }
    const buffer = Buffer.from(data);
    return printRawBuffer(buffer);
  });

  ipcMain.handle('printer:name', () => resolvePrinterName());
}

function createWindow() {
  registerPrinters();
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    title: 'La Bendición - POS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});