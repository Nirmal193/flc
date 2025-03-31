// output.js
// This file runs in the renderer process of the output window.
// It listens for the 'update-analysis' event from the main process via the preload script
// and appends a new message bubble to the conversation container.

window.electronAPI.onUpdateAnalysis((analysisText) => {
    console.log('Received analysis update:', analysisText);
    const container = document.getElementById('conversationContainer');
    if (container) {
      // Create a new message bubble element
      const messageElem = document.createElement('div');
      messageElem.className = 'message system';
      messageElem.textContent = analysisText;
      container.appendChild(messageElem);
      // Scroll to the bottom so the latest message is visible
      container.scrollTop = container.scrollHeight;
    }
  });
  