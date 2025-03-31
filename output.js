document.addEventListener('DOMContentLoaded', () => {
  const transparencySlider = document.getElementById('transparencySlider');
  const bgColorPicker = document.getElementById('bgColorPicker');
  const textColorPicker = document.getElementById('textColorPicker');
  const closeButton = document.getElementById('closeButton');
  const conversationContainer = document.getElementById('conversationContainer');
  const textTransparencySlider = document.getElementById('textTransparencySlider');
  
  // Apply background color to conversation container
  function applyBackgroundColor(color, opacity) {
    // Extract RGB values from hex color
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    // Set with transparency
    const alpha = opacity || 0.5;
    document.querySelectorAll('.message').forEach(msg => {
      msg.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    });
  }

  // Update message text color
  function updateTextColor(color) {
    document.querySelectorAll('.message').forEach(msg => {
      msg.style.color = color;
    });
  }

  // Update text transparency
  function updateTextTransparency(opacity) {
    document.querySelectorAll('.message').forEach(msg => {
      const currentColor = window.getComputedStyle(msg).color;
      const rgba = currentColor.replace(/rgba?\(([^)]+)\)/, (_, values) => {
        const [r, g, b] = values.split(',').map(v => v.trim());
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      });
      msg.style.color = rgba;
    });
  }

  // Load saved preferences
  function loadSavedPreferences() {
    const savedOpacity = localStorage.getItem('windowOpacity') || 0.9;
    const savedBgColor = localStorage.getItem('bgColor') || '#333333';
    const savedTextColor = localStorage.getItem('textColor') || '#ffffff';
    const savedTextTransparency = localStorage.getItem('textTransparency') || 1;
    
    // Apply saved values to controls
    transparencySlider.value = savedOpacity * 100;
    bgColorPicker.value = savedBgColor;
    textColorPicker.value = savedTextColor;
    textTransparencySlider.value = savedTextTransparency * 100;
    
    // Apply settings
    window.electronAPI.setWindowOpacity(parseFloat(savedOpacity));
    updateTextTransparency(savedTextTransparency);
    
    // Store for use with new messages
    window.currentSettings = {
      bgColor: savedBgColor,
      textColor: savedTextColor,
      opacity: savedOpacity,
      textTransparency: savedTextTransparency
    };
  }
  
  // Save preference to localStorage
  function savePreference(key, value) {
    localStorage.setItem(key, value);
    window.currentSettings[key] = value;
  }

  // Transparency slider
  transparencySlider.addEventListener('change', (event) => {
    const opacity = event.target.value / 100;
    window.electronAPI.setWindowOpacity(opacity);
    savePreference('windowOpacity', opacity);
    
    // Update background opacity for messages
    applyBackgroundColor(window.currentSettings.bgColor, opacity / 2);
  });

  // Background color picker
  bgColorPicker.addEventListener('change', (event) => {
    const color = event.target.value;
    savePreference('bgColor', color);
    applyBackgroundColor(color, window.currentSettings.opacity / 2);
  });
  
  // Text color picker
  textColorPicker.addEventListener('change', (event) => {
    const color = event.target.value;
    savePreference('textColor', color);
    updateTextColor(color);
  });

  // Text transparency slider
  textTransparencySlider.addEventListener('change', (event) => {
    const opacity = event.target.value / 100;
    savePreference('textTransparency', opacity);
    updateTextTransparency(opacity);
  });

  // Close button
  closeButton.addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });
  
  // Process incoming messages from main
  window.electronAPI.onUpdateAnalysis((analysisText) => {
    const messageElement = document.createElement('div');
    messageElement.className = 'message system';
    messageElement.textContent = analysisText;
    
    // Apply current styles
    if (window.currentSettings) {
      messageElement.style.color = window.currentSettings.textColor;
      
      const color = window.currentSettings.bgColor;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      const alpha = window.currentSettings.opacity / 2;
      messageElement.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    // Add to container
    conversationContainer.appendChild(messageElement);
    
    // Force scroll to bottom
    setTimeout(() => {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50);
  });
  
  // Handle background color updates from main process
  window.electronAPI.onUpdateBgColor((color) => {
    savePreference('bgColor', color);
    applyBackgroundColor(color, window.currentSettings.opacity / 2);
  });

  // Show or hide the loader at the bottom of the screen
  function toggleLoadingIndicator(isLoading) {
    const loadingMessage = document.getElementById('loadingMessage');
    if (isLoading) {
      loadingMessage.style.display = 'block';
    } else {
      loadingMessage.style.display = 'none';
    }
  }

  // Listen for loading events
  window.electronAPI.onLoading((isLoading) => {
    toggleLoadingIndicator(isLoading);
  });

  // Initialize with saved preferences
  window.currentSettings = {};
  loadSavedPreferences();
});