document.addEventListener('DOMContentLoaded', () => {
  const transparencySlider = document.getElementById('transparencySlider');
  const bgColorPicker = document.getElementById('bgColorPicker');
  const closeButton = document.getElementById('closeButton');

  // Transparency Slider: Sends the opacity value to the main process
  transparencySlider.addEventListener('input', (event) => {
    const opacity = event.target.value / 100;
    console.log("Setting opacity:", opacity);
    window.electronAPI.setWindowOpacity(opacity);
  });

  // Background Color Picker: Sends selected color to the main process
  bgColorPicker.addEventListener('input', (event) => {
    const color = event.target.value;
    console.log("Setting background color:", color);
    window.electronAPI.setWindowBackgroundColor(color);
  });

  // Close Button: Closes the output window
  closeButton.addEventListener('click', () => {
    console.log("Closing window");
    window.electronAPI.closeWindow();
  });
});
