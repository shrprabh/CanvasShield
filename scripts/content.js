// Initialize communication with background script
chrome.runtime.sendMessage({ type: 'contentScriptLoaded' });

// Listen for messages from detector
window.addEventListener('message', function(event) {
    if (event.source !== window) return;

    if (event.data.type === 'canvasFingerprinting') {
        chrome.runtime.sendMessage({
            type: 'fingerprint_detected',
            data: {
                url: window.location.href,
                timestamp: Date.now(),
                method: event.data.method,
                stack: event.data.stack,
                details: {
                    scriptUrl: event.data.stack,
                    detectionMethod: event.data.method
                }
            }
        });
    }
});

// Inject detector script
const script = document.createElement('script');
script.textContent = `(${injectDetector.toString()})();`;
document.documentElement.appendChild(script);
script.remove();

function injectDetector() {
    // Already defined in detector.js
    if (window.__canvasWatcher) return;

    // Notification function
    function notifyDetection(method, scriptUrl) {
        window.postMessage({
            type: 'canvasFingerprinting',
            method: method,
            stack: scriptUrl
        }, '*');
    }

    // Initialize canvas watcher from detector.js
    window.__canvasWatcher.init(notifyDetection);
}