// Storage for detections
let detections = [];
let isDetectionEnabled = true;

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

    // Check for duplicate detection within 200ms with same method and URL
    const isDuplicate = detections.some((existingDetection) => {
      return (
        existingDetection.url === detection.url &&
        existingDetection.method === detection.method &&
        Math.abs(existingDetection.timestamp - detection.timestamp) < 200
      );
    });

    if (!isDuplicate) {
      // Store locally
      detections.push(detection);
      chrome.storage.local.set({ detections: detections });
      updateBadge();
    }
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

  // Clear detections
  else if (message.action === "clearDetections") {
    detections = [];
    chrome.storage.local.set({ detections: [] });
    updateBadge(); // Make sure badge is updated
    sendResponse({ success: true });
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
