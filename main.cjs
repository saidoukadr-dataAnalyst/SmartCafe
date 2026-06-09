const { app, BrowserWindow, session, dialog } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "SmartCafe",
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the compiled React app
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  win.loadFile(indexPath);

  // Remove menu bar for a clean, app-like look
  win.removeMenu();

  // Handle file downloads (PDF exports from jsPDF, etc.)
  session.defaultSession.on('will-download', (event, item) => {
    const fileName = item.getFilename();

    // Show a "Save As" dialog so the user can choose where to save
    const defaultPath = path.join(app.getPath('downloads'), fileName);
    
    dialog.showSaveDialog(win, {
      title: 'Enregistrer le fichier',
      defaultPath: defaultPath,
      filters: [
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Tous les fichiers', extensions: ['*'] }
      ]
    }).then(result => {
      if (result.canceled) {
        item.cancel();
      } else {
        item.setSavePath(result.filePath);
      }
    });
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
