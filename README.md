# CanvasShield: Canvas Fingerprinting Detector

CanvasShield is a browser extension that detects and blocks canvas fingerprinting attempts used to track you across websites. Canvas fingerprinting is a technique where websites extract unique identifiers from your browser's rendering of HTML5 canvas elements, allowing them to track you even with cookies disabled.

![CanvasShield Logo](path/to/logo.png)

## Features

- 🔍 Detects common canvas fingerprinting techniques in real-time
- 📊 Provides detailed statistics on fingerprinting attempts
- 🚫 Notifies you when fingerprinting is detected
- 📝 Maintains logs of detected fingerprinting attempts
- 🧠 Uses machine learning to classify sophisticated fingerprinting methods
- 💾 Works offline with local storage for detection history

## Installation

### Option 1: Install as a Browser Extension

1. Download this repository:

2. Load the extension in Chrome:

   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked"
   - Select the CanvasShield directory

3. Load the extension in Firefox:
   - Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select the manifest.json file in the CanvasShield directory

### Option 2: Run the Complete System (Extension + Backend)

1. Install Python requirements:

2. Start the Flask backend:

3. Load the extension as described in Option 1

4. Visit http://127.0.0.1:5001 to view the dashboard

### Option 3: Quick Installation to Desktop

Run the following commands to copy the extension files to your desktop:

```bash
# Create extension directory on desktop
mkdir -p ~/Desktop/CanvasShieldExt

# Copy required extension files
cp -r /path/to/CanvasShield/manifest.json ~/Desktop/CanvasShieldExt/
cp -r /path/to/CanvasShield/popup ~/Desktop/CanvasShieldExt/
cp -r /path/to/CanvasShield/scripts ~/Desktop/CanvasShieldExt/
cp -r /path/to/CanvasShield/assets ~/Desktop/CanvasShieldExt/
```

Then load the extension from `~/Desktop/CanvasShieldExt` using the browser instructions in Option 1.

## Usage

Once installed, CanvasShield works automatically in the background:

- The extension icon shows the number of fingerprinting attempts detected
- Click the icon to see recent detections and statistics
- Toggle detection on/off using the switch in the popup
- Export detection history to CSV for analysis

## Test Fingerprinting Detection

Visit the built-in test page at http://127.0.0.1:5001/tests.html to verify that detection is working properly.

## Technical Overview

CanvasShield consists of:

- **Browser Extension**: Monitors canvas operations in web pages
- **ML Detector**: Analyzes canvas usage patterns to detect fingerprinting
- **Flask Backend**: Stores and analyzes detected fingerprinting attempts
- **Dashboard**: Visualizes statistics and detection history

## How It Works

1. The extension injects a script that hooks into canvas methods (toDataURL, getImageData)
2. When these methods are called, the detector analyzes the context to determine if it's fingerprinting
3. Detections are saved locally and reported to the backend server
4. The dashboard and extension popup visualize this data

## Privacy

CanvasShield respects your privacy:

- All detection happens locally in your browser
- No data is sent to external servers
- The backend server runs locally on your machine
- You can export or clear your data at any time

## Requirements

- Chrome 90+ or Firefox 88+
- Python 3.9+ (for backend server)
- Flask and Flask-CORS (for backend server)

## License

CanvasShield is released under the MIT License. See the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
