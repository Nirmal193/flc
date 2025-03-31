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

// Add this to your existing main.js file where the IPC handlers are set up

// Add handler for text color (though this is handled client-side, we're adding the handler for future needs)
ipcMain.on('set-text-color', (_event, color) => {
  console.log("Text color updated to:", color);
  // This will be primarily handled client-side in the renderer process
  // But we can store it for future use if needed
  if (store) {
    const settings = store.get('settings') || {};
    settings.textColor = color;
    store.set('settings', settings);
  }
});

// Update the createOrUpdateOutputWindow function to handle text properly
// Replace the createOrUpdateOutputWindow function with this one in your main.js file

function createOrUpdateOutputWindow(analysisText) {
  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.webContents.send('loading', true); // Show loader
    outputWindow.show();
    outputWindow.focus();
    setTimeout(() => {
      outputWindow.webContents.send('update-analysis', analysisText);
      outputWindow.webContents.send('loading', false); // Hide loader
    }, 300);
  } else {
    // Create a new window with true transparency
    outputWindow = new BrowserWindow({
      width: 500,
      height: 400,
      alwaysOnTop: true, 
      transparent: true,  // Enable transparency at the window level
      backgroundColor: '#00000000',  // Fully transparent background color
      opacity: 0.9,  // Initial opacity
      frame: false,  // No window frame
      hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, 'output-preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
      title: "Gemini Analysis Result",
      icon: path.join(__dirname, 'assets/icon.png')
    });

    // Load the HTML file
    outputWindow.loadFile('output.html')
      .then(() => {
        outputWindow.webContents.send('loading', true); // Show loader
        setTimeout(() => {
          outputWindow.webContents.send('update-analysis', analysisText);
          outputWindow.webContents.send('loading', false); // Hide loader
        }, 300);
      })
      .catch(err => console.error('Error loading output window:', err));

    // Handle window close
    outputWindow.on('closed', () => {
      outputWindow = null;
    });
  }
}

// Update the opacity handler to directly set window opacity
ipcMain.on('set-opacity', (_event, opacity) => {
  if (outputWindow) {
    console.log("Updating window opacity to:", opacity);
    outputWindow.setOpacity(opacity);
  }
});

// Update background color handling
ipcMain.on('set-bg-color', (_event, color) => {
  if (outputWindow) {
    console.log("Background color selected:", color);
    // We'll handle the background in the renderer process
    // to maintain transparency
    outputWindow.webContents.send('update-bg-color', color);
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
    if (outputWindow) outputWindow.webContents.send('loading', true); // Show loader
    try {
      console.log(`Global shortcut ${shortcut} triggered.`);
      
      const settings = store.get('settings') || {};
      const { apiKey, model, prompt } = settings;
      console.log('Retrieved settings:', settings);

      if (!apiKey || !model) {
        dialog.showErrorBox('Settings Missing', 'Please set the API key and select a model in the settings.');
        return;
      }

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
    } finally {
      if (outputWindow) outputWindow.webContents.send('loading', false); // Hide loader
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
