# Canvas Fingerprinting Detector Extension

This browser extension detects and reports canvas fingerprinting attempts on websites you visit. It provides detailed information about fingerprinting techniques and helps protect your privacy.

## Features
- Real-time detection of canvas fingerprinting attempts
- Pattern-based detection of known fingerprinting techniques
- Timing analysis of canvas operations
- Detailed reporting of detected attempts
- Export functionality for detected fingerprinting data

## Installation Instructions

### Chrome/Chromium-based browsers:
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right
3. Click "Load unpacked" and select this extension's directory
4. The extension icon should appear in your browser toolbar

### Firefox:
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this extension's directory
5. The extension icon should appear in your browser toolbar

## Testing the Extension

1. After installation, click the extension icon to open the popup interface
2. Visit websites known to use canvas fingerprinting (e.g., some analytics services)
3. The extension will automatically detect and report fingerprinting attempts
4. In the popup, you'll see:
   - Total number of detected attempts
   - Current site's fingerprinting status
   - Recent detections with detailed information
   - Options to export data or clear history

## Features Overview

### Detection Methods
- Monitors canvas operations (fillText, strokeText, toDataURL, getImageData)
- Analyzes patterns in canvas usage
- Checks for known fingerprinting techniques
- Evaluates timing between operations

### Reporting
- Detailed script information
- Operation timestamps
- Canvas operation types
- Source URLs

### Privacy Protection
- Real-time monitoring
- Automatic detection
- Detailed logging
- Export capabilities for further analysis

## Development

The extension consists of several key components:
- `manifest.json`: Extension configuration
- `popup/`: User interface files
- `scripts/`: Core detection and monitoring logic
- `assets/`: Extension icons and resources
