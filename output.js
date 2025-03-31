document.addEventListener('DOMContentLoaded', () => {
  const transparencySlider = document.getElementById('transparencySlider');
  const bgColorPicker = document.getElementById('bgColorPicker');
  const textColorPicker = document.getElementById('textColorPicker');
  const closeButton = document.getElementById('closeButton');
  const conversationContainer = document.getElementById('conversationContainer');
  
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

  // Load saved preferences
  function loadSavedPreferences() {
    const savedOpacity = localStorage.getItem('windowOpacity') || 0.9;
    const savedBgColor = localStorage.getItem('bgColor') || '#333333';
    const savedTextColor = localStorage.getItem('textColor') || '#ffffff';
    
    // Apply saved values to controls
    transparencySlider.value = savedOpacity * 100;
    bgColorPicker.value = savedBgColor;
    textColorPicker.value = savedTextColor;
    
    // Apply settings
    window.electronAPI.setWindowOpacity(parseFloat(savedOpacity));
    
    // Store for use with new messages
    window.currentSettings = {
      bgColor: savedBgColor,
      textColor: savedTextColor,
      opacity: savedOpacity
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
  
  // Initialize with saved preferences
  window.currentSettings = {};
  loadSavedPreferences();
});