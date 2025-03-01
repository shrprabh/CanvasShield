// Configuration
const API_URL = "http://127.0.0.1:5001"; // Match your Flask server port

document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  const attemptCount = document.getElementById("attemptCount");
  const siteStatus = document.getElementById("siteStatus");
  const detectionsList = document.getElementById("detectionsList");
  const toggleDetection = document.getElementById("toggleDetection");
  const exportBtn = document.getElementById("exportBtn");
  const clearBtn = document.getElementById("clearBtn");

  // Event listeners
  toggleDetection.addEventListener("change", toggleDetectionStatus);
  exportBtn.addEventListener("click", exportDetections);
  clearBtn.addEventListener("click", clearDetections);

  // Functions
  function loadStats() {
    // Get stats from the API
    fetch(`${API_URL}/api/stats`)
      .then((response) => response.json())
      .then((data) => {
        // Update attempt count
        // Change this line
        attemptCount.textContent = data.total_detections || 0;
        // Load recent detections
        loadDetections();
      })
      .catch((err) => {
        console.error("Error loading stats:", err);
        attemptCount.textContent = "?";
      });
  }

  function loadDetections() {
    // Get recent detections from the API
    fetch(`${API_URL}/api/detections`)
      .then((response) => response.json())
      .then((data) => {
        if (!data || data.length === 0) {
          detectionsList.innerHTML =
            '<div class="no-detections">No fingerprinting attempts detected yet</div>';
          return;
        }

        // Clear the list
        detectionsList.innerHTML = "";

        // Add recent detections (limit to 5)
        const recentDetections = data.slice(0, 5);
        recentDetections.forEach((detection) => {
          const item = document.createElement("div");
          item.className = "detection-item";

          // Create domain with icon
          const domain = new URL(detection.url).hostname;

          // Format timestamp
          const date = new Date(detection.timestamp);
          const timeString = date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          item.innerHTML = `
            <div class="detection-site">
              <i class="fas fa-globe me-1"></i> ${domain}
            </div>
            <div class="detection-info">
              <div class="detection-method">${detection.method}</div>
              <div class="detection-time">${timeString}</div>
            </div>
          `;

          detectionsList.appendChild(item);
        });
      })
      .catch((err) => {
        console.error("Error loading detections:", err);
        detectionsList.innerHTML =
          '<div class="no-detections">Error loading detections</div>';
      });
  }

  function checkCurrentSite() {
    // Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        const currentUrl = new URL(tabs[0].url).hostname;

        // Check if current site has fingerprinting attempts
        fetch(`${API_URL}/api/detections?domain=${currentUrl}`)
          .then((response) => response.json())
          .then((data) => {
            if (data && data.length > 0) {
              siteStatus.textContent = "Fingerprinting Detected";
              siteStatus.className = "status-danger";
            } else {
              siteStatus.textContent = "Safe";
              siteStatus.className = "status-safe";
            }
          })
          .catch((err) => {
            console.error("Error checking site status:", err);
          });
      }
    });
  }

  function toggleDetectionStatus() {
    const isActive = toggleDetection.checked;

    // Check if we're in extension context
    if (typeof chrome !== "undefined" && chrome.runtime) {
      // Send message to background script to enable/disable detection
      chrome.runtime.sendMessage({
        action: isActive ? "enableDetection" : "disableDetection",
      });
    } else {
      console.log("Toggle state changed to:", isActive);
      // Optional: Add testing mode behavior here
    }
  }

  function exportDetections() {
    fetch(`${API_URL}/api/detections`)
      .then((response) => response.json())
      .then((data) => {
        // Convert to CSV
        const csv = convertToCSV(data);

        // Create download link
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "canvas_fingerprinting_detections.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      })
      .catch((err) => {
        console.error("Error exporting detections:", err);
        alert("Error exporting detections");
      });
  }

  function clearDetections() {
    if (confirm("Are you sure you want to clear all detection history?")) {
      fetch(`${API_URL}/api/detections`, { method: "DELETE" })
        .then((response) => response.json())
        .then((data) => {
          loadStats();
          alert("Detection history cleared");
        })
        .catch((err) => {
          console.error("Error clearing detections:", err);
          alert("Error clearing detections");
        });
    }
  }

  function convertToCSV(data) {
    if (!data || data.length === 0) return "";

    const header = Object.keys(data[0]).join(",");
    const rows = data.map((obj) =>
      Object.values(obj)
        .map((val) =>
          typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val
        )
        .join(",")
    );

    return [header, ...rows].join("\n");
  }
});
