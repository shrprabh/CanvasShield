// Initialize extension state
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.local.set({
        enabled: true,
        detections: []
    });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    switch(message.type) {
        case 'fingerprint_detected':
            handleDetection(message.data);
            break;
        case 'toggleDetection':
            handleToggleDetection(message.enabled);
            break;
    }
});

function handleDetection(detection) {
    chrome.storage.local.get(['enabled'], function(result) {
        if (!result.enabled) return;

        // Store detection in the database via API
        fetch('http://localhost:5000/api/detections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: detection.url,
                timestamp: detection.timestamp,
                method: detection.method,
                scriptUrl: detection.details.scriptUrl,
                detectionMethod: detection.details.detectionMethod
            })
        })
        .then(response => response.json())
        .then(data => {
            // Notify popup about new detection
            chrome.runtime.sendMessage({
                type: 'newDetection',
                detection: detection
            });
        })
        .catch(error => console.error('Error storing detection:', error));
    });
}

function handleToggleDetection(enabled) {
    chrome.storage.local.set({ enabled: enabled });
}