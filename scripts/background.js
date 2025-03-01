
// Background script for the Canvas Fingerprinting Detector

// Store detected fingerprinting attempts
let detectedFingerprinting = [];
const API_URL = 'http://0.0.0.0:5000';

// Initialize detection counter
chrome.storage.local.get('detectionCount', function(data) {
    if (!data.detectionCount) {
        chrome.storage.local.set({ detectionCount: 0 });
    }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type === 'contentScriptLoaded') {
        // Content script loaded
        console.log('Content script loaded on:', sender.tab?.url);
    }
    else if (message.type === 'fingerprint_detected') {
        // Process fingerprinting detection
        processDetection(message.data, sender.tab);
    }
    else if (message.type === 'getDetections') {
        // Return current detections
        sendResponse({ detections: detectedFingerprinting });
    }
    else if (message.type === 'clearDetections') {
        // Clear detection history
        clearDetections();
        sendResponse({ success: true });
    }
    
    // Return true to indicate async response
    return true;
});

// Process a new fingerprinting detection
function processDetection(data, tab) {
    // Add tab information
    const detection = {
        ...data,
        tabId: tab?.id,
        tabUrl: tab?.url,
        tabTitle: tab?.title,
        favicon: tab?.favIconUrl
    };
    
    // Add to local storage
    detectedFingerprinting.push(detection);
    
    // Update detection count
    chrome.storage.local.get('detectionCount', function(data) {
        const newCount = (data.detectionCount || 0) + 1;
        chrome.storage.local.set({ detectionCount: newCount });
    });
    
    // Update badge
    updateBadge();
    
    // Send to server API
    fetch(`${API_URL}/api/detections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(detection)
    }).catch(error => console.error('Error sending detection to API:', error));
}

// Update the browser action badge
function updateBadge() {
    chrome.storage.local.get('detectionCount', function(data) {
        const count = data.detectionCount || 0;
        chrome.action.setBadgeText({ text: count.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#E53935' });
    });
}

// Clear all detections
function clearDetections() {
    detectedFingerprinting = [];
    chrome.storage.local.set({ detectionCount: 0 });
    updateBadge();
    
    // Clear server API data
    fetch(`${API_URL}/api/detections`, {
        method: 'DELETE'
    }).catch(error => console.error('Error clearing detections from API:', error));
}

// Initialize badge on startup
updateBadge();
