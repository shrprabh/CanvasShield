// Storage for detections when server is unavailable
let detections = [];
let isDetectionEnabled = true;
const API_URL = "http://127.0.0.1:5001";

// Initialize from storage
chrome.storage.local.get(
  ["detections", "isDetectionEnabled"],
  function (result) {
    if (result.detections) detections = result.detections;
    if (result.isDetectionEnabled !== undefined)
      isDetectionEnabled = result.isDetectionEnabled;

    // Update badge with detection count
    updateBadge();
  }
);

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle fingerprint detection
  if (
    (message.type === "fingerprint_detected" ||
      message.action === "fingerprint_detected") &&
    isDetectionEnabled
  ) {
    console.log("Fingerprinting detected:", message);

    // Prepare detection object
    const detection = message.data || {
      url: message.url || (sender.tab ? sender.tab.url : "unknown"),
      timestamp: Date.now(),
      method: message.method || "unknown",
      details: message.details || {},
    };

    // Add domain if not present
    if (!detection.domain && detection.url) {
      try {
        detection.domain = new URL(detection.url).hostname;
      } catch (e) {
        detection.domain = "unknown";
      }
    }

    // Store locally
    detections.push(detection);
    chrome.storage.local.set({ detections: detections });
    updateBadge();

    // Try to send to server
    fetch(`${API_URL}/api/detections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(detection),
    }).catch((err) =>
      console.log("Server unavailable, detection stored locally only")
    );
  }

  // Handle detection toggle
  else if (message.action === "enableDetection") {
    isDetectionEnabled = true;
    chrome.storage.local.set({ isDetectionEnabled: true });
    sendResponse({ success: true, isEnabled: true });
  } else if (message.action === "disableDetection") {
    isDetectionEnabled = false;
    chrome.storage.local.set({ isDetectionEnabled: false });
    sendResponse({ success: true, isEnabled: false });
  }

  // Return current state
  else if (message.action === "getDetectionState") {
    sendResponse({ isEnabled: isDetectionEnabled });
  }

  return true; // Keep message port open for async response
});

function updateBadge() {
  if (detections.length > 0) {
    chrome.action.setBadgeText({ text: detections.length.toString() });
    chrome.action.setBadgeBackgroundColor({ color: "#ff0000" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}
