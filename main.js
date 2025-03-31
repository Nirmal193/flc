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
  
  // Uncomment for debugging:
  // mainWindow.webContents.openDevTools();
}

function createOrUpdateOutputWindow(analysisText) {
  if (outputWindow && !outputWindow.isDestroyed()) {
    // If window already exists, update its content via IPC
    outputWindow.webContents.send('update-analysis', analysisText);
    outputWindow.show();
  } else {
    // Create a new window if it doesn't exist
    outputWindow = new BrowserWindow({
      width: 500,
      height: 400,
      alwaysOnTop: true, // keeps the window on top
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
        // Once loaded, send the analysis text to update the UI
        outputWindow.webContents.send('update-analysis', analysisText);
      })
      .catch(err => console.error('Error loading output window:', err));

    outputWindow.on('closed', () => {
      outputWindow = null;
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  // Register global keyboard shortcut: Control + PrintScreen
  const shortcut = 'Control+M';
  const shortcutRegistered = globalShortcut.register(shortcut, async () => {
  console.log(`Global shortcut ${shortcut} triggered.`);
    
    // Retrieve stored settings (expecting at least apiKey and model)
    const settings = store.get('settings') || {};
    const { apiKey, model, prompt } = settings;
    console.log('Retrieved settings:', settings);

    if (!apiKey || !model) {
      dialog.showErrorBox('Settings Missing', 'Please set the API key and select a model in the settings.');
      return;
    }

    try {
      // Capture screenshot
      console.log('Attempting to capture screenshot...');
      const base64Image = await captureScreenshot();
      console.log('Screenshot captured.');

      // Use provided prompt or default one
      const userPrompt = prompt || 'What is in this image?';

      // Construct the API URL with the selected model and API key
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      console.log('API URL:', apiUrl);
      
      const payload = {
        contents: [
          {
            parts: [
              {
                text: userPrompt
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ]
      };

      console.log('Sending request to Gemini API...');
      // Call the Gemini API
      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('API Response received:', response.data);

      // Extract analysis text from the API response
      let analysisText = "No valid text found in response.";
      if (response.data.candidates &&
          response.data.candidates[0] &&
          response.data.candidates[0].content &&
          response.data.candidates[0].content.parts &&
          response.data.candidates[0].content.parts[0] &&
          response.data.candidates[0].content.parts[0].text) {
        analysisText = response.data.candidates[0].content.parts[0].text;
      } else {
        console.log('Full Gemini API response:', response.data);
      }

      // Create or update the output window with the new analysis text
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

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Function to capture the primary screen and return the image as a base64 string
async function captureScreenshot() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height }
  });
  
  // Get the primary screen source (fallback to the first source)
  const primarySource = sources.find(source => source.display_id === primaryDisplay.id.toString()) || sources[0];
  
  if (!primarySource) {
    throw new Error('No screen source found');
  }
  
  const thumbnail = primarySource.thumbnail.toDataURL();
  const base64Image = thumbnail.split(',')[1];
  return base64Image;
}

// IPC Handlers for settings (used by your renderer process)

// Save settings (API key, model, and optional prompt)
ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
  console.log('Settings saved:', settings);
  return true;
});

// Get settings
ipcMain.handle('get-settings', () => {
  const settings = store.get('settings') || {};
  console.log('Settings retrieved:', settings);
  return settings;
});
