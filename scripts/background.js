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
    chrome.storage.local.get(['enabled', 'detections'], function(result) {
        if (!result.enabled) return;

        const detections = result.detections || [];
        detections.push(detection);

        chrome.storage.local.set({ detections: detections }, function() {
            // Notify popup about new detection
            chrome.runtime.sendMessage({
                type: 'newDetection',
                detection: detection
            });
        });
    });
}

function handleToggleDetection(enabled) {
    chrome.storage.local.set({ enabled: enabled });
}
