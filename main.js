const { app, BrowserWindow, ipcMain, screen, desktopCapturer, globalShortcut, dialog } = require('electron');
const path = require('path');
const axios = require('axios');
const Store = require('electron-store');
const store = new Store();

let mainWindow;
let outputWindow; // Global reference to output window

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadFile('index.html');
}

// ✅ Function to Create or Update Output Window
function createOrUpdateOutputWindow(analysisText) {
  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.webContents.send('update-analysis', analysisText);
    outputWindow.show();
  } else {
    outputWindow = new BrowserWindow({
      width: 500,
      height: 400,
      alwaysOnTop: true, 
      transparent: true,
      frame: false, 
      hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, 'output-preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
      title: "Gemini Analysis Result",
      icon: path.join(__dirname, 'assets/icon.png')
    });

    outputWindow.loadFile('output.html')
      .then(() => {
        outputWindow.webContents.send('update-analysis', analysisText);
      })
      .catch(err => console.error('Error loading output window:', err));

    outputWindow.on('closed', () => {
      outputWindow = null;
    });
  }
}


ipcMain.on('set-opacity', (_event, opacity) => {
  if (outputWindow) {
    console.log("Updating window opacity to:", opacity);
    outputWindow.setOpacity(opacity);
  }
});

ipcMain.on('set-bg-color', (_event, color) => {
  if (outputWindow) {
    console.log("Updating window background color to:", color);
    outputWindow.setBackgroundColor(color);
  }
});

ipcMain.on('close-output-window', () => {
  if (outputWindow) {
    console.log("Closing output window");
    outputWindow.close();
    outputWindow = null;
  }
});


// ✅ Main App Ready
app.whenReady().then(() => {
  createWindow();

  // Register global shortcut
  const shortcut = 'Control+M';
  const shortcutRegistered = globalShortcut.register(shortcut, async () => {
    console.log(`Global shortcut ${shortcut} triggered.`);
    
    const settings = store.get('settings') || {};
    const { apiKey, model, prompt } = settings;
    console.log('Retrieved settings:', settings);

    if (!apiKey || !model) {
      dialog.showErrorBox('Settings Missing', 'Please set the API key and select a model in the settings.');
      return;
    }

    try {
      console.log('Attempting to capture screenshot...');
      const base64Image = await captureScreenshot();
      console.log('Screenshot captured.');

      const userPrompt = prompt || 'What is in this image?';

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      console.log('API URL:', apiUrl);
      
      const payload = {
        contents: [
          {
            parts: [
              { text: userPrompt },
              { inlineData: { mimeType: "image/jpeg", data: base64Image } }
            ]
          }
        ]
      };

      console.log('Sending request to Gemini API...');
      const response = await axios.post(apiUrl, payload, { headers: { 'Content-Type': 'application/json' } });
      console.log('API Response received:', response.data);

      let analysisText = "No valid text found in response.";
      if (response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
        analysisText = response.data.candidates[0].content.parts[0].text;
      } else {
        console.log('Full Gemini API response:', response.data);
      }

      createOrUpdateOutputWindow(analysisText);

    } catch (error) {
      console.error('Error during capture and analysis:', error);
      dialog.showErrorBox('Error', `Failed to analyze screenshot: ${error.message}`);
    }
  });

  if (!shortcutRegistered) {
    console.error('Global shortcut registration failed');
  } else {
    console.log(`Global shortcut registered: ${shortcut}`);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ✅ Capture Screenshot Function
async function captureScreenshot() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height }
  });
  
  const primarySource = sources.find(source => source.display_id === primaryDisplay.id.toString()) || sources[0];
  
  if (!primarySource) {
    throw new Error('No screen source found');
  }
  
  const thumbnail = primarySource.thumbnail.toDataURL();
  return thumbnail.split(',')[1];
}

// ✅ IPC Handlers for Settings
ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
  console.log('Settings saved:', settings);
  return true;
});

ipcMain.handle('get-settings', () => {
  const settings = store.get('settings') || {};
  console.log('Settings retrieved:', settings);
  return settings;
});
