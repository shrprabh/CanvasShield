// Initialize communication with background script
chrome.runtime.sendMessage({ type: "contentScriptLoaded" });

// Listen for messages from detector
// Listen for messages from the injected script
window.addEventListener("message", function (event) {
  // Only accept messages from the same frame
  if (event.source !== window) return;

  if (event.data.type === "CANVAS_FINGERPRINT_DETECTED") {
    // Forward to background script
    chrome.runtime.sendMessage({
      type: "fingerprint_detected",
      data: {
        url: event.data.url,
        timestamp: Date.now(),
        method: event.data.method,
        details: {
          scriptUrl: event.data.scriptUrl,
          detectionMethod: "pattern-matching",
        },
      },
    });
  }
});

// Inject the script file (not inline)
const script = document.createElement("script");
script.src = chrome.runtime.getURL("scripts/inject.js");
(document.head || document.documentElement).appendChild(script);
script.onload = function () {
  script.remove();
};

function injectDetector() {
  // Already defined in detector.js
  if (window.__canvasWatcher) return;

  // Notification function
  function notifyDetection(method, scriptUrl) {
    window.postMessage(
      {
        type: "canvasFingerprinting",
        method: method,
        stack: scriptUrl,
      },
      "*"
    );
  }

  // Initialize canvas watcher from detector.js
  window.__canvasWatcher.init(notifyDetection);
}
