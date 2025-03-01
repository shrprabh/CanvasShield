
# Converting to a Browser Extension

## Steps to Create a Chrome Extension

1. **Modify the manifest.json**:
   This file already exists in your project, but you'll need to update it with the proper extension configuration.

2. **Organize Files**:
   - `/popup` - Contains the extension popup UI
   - `/scripts` - Contains the detection logic
   - `background.js` - Background script for the extension
   - `content.js` - Content script that runs on each page

3. **Build the Extension**:
   ```
   # Create a zip file with the necessary files
   zip -r canvas-fingerprint-detector.zip manifest.json popup/ scripts/ assets/
   ```

4. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the folder with your extension files

## Files to Include

- `manifest.json` (already exists)
- `popup/popup.html`, `popup/popup.css`, and `popup/popup.js`
- `scripts/detector.js`
- `assets/icon.svg`
- `background.js` (for persistence between browser sessions)
- `content.js` (for injecting the detector)

## Testing the Extension
Once loaded, you can visit websites and the extension will detect canvas fingerprinting attempts automatically.
