// Configuration
const API_URL = "http://127.0.0.1:5001";

document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  const attemptCount = document.getElementById("attemptCount");
  const domainCount = document.getElementById("domainCount");
  const siteStatus = document.getElementById("siteStatus");
  const detectionsList = document.getElementById("detectionsList");
  const toggleDetection = document.getElementById("toggleDetection");
  const exportBtn = document.getElementById("exportBtn");
  const clearBtn = document.getElementById("clearBtn");
  const statusIndicator = document.getElementById("statusIndicator");

  // Event listeners
  toggleDetection.addEventListener("change", toggleDetectionStatus);
  exportBtn.addEventListener("click", exportDetections);
  clearBtn.addEventListener("click", clearDetections);

  // Check server connectivity
  let isServerConnected = false;
  function checkServer() {
    fetch(`${API_URL}/api/stats`)
      .then((response) => {
        isServerConnected = true;
        statusIndicator.textContent = "Connected";
        statusIndicator.className = "status-safe";
        return response.json();
      })
      .then((data) => {
        // Update stats from server data
        attemptCount.textContent = data.total_detections || 0;
        domainCount.textContent = data.unique_domains || 0;
        // Load detections from server
        loadDetections();
      })
      .catch((err) => {
        console.error("Cannot connect to server:", err);
        isServerConnected = false;
        statusIndicator.textContent = "Offline";
        statusIndicator.className = "status-warning";
        // Use local storage as fallback
        loadFromLocalStorage();
      });
  }

  function loadFromLocalStorage() {
    chrome.storage.local.get(["detections"], function (result) {
      const detections = result.detections || [];
      attemptCount.textContent = detections.length;

      const domains = new Set();
      detections.forEach((d) => {
        try {
          const domain = new URL(d.url).hostname;
          domains.add(domain);
        } catch (e) {}
      });
      domainCount.textContent = domains.size;

      // Display detections from local storage
      displayDetections(detections);
    });
  }

  function loadDetections() {
    fetch(`${API_URL}/api/detections`)
      .then((response) => response.json())
      .then((data) => {
        displayDetections(data);
      })
      .catch((err) => {
        console.error("Error loading detections:", err);
        detectionsList.innerHTML =
          '<div class="no-detections">Error loading detections</div>';
      });
  }

  function displayDetections(data) {
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
      let domain;
      try {
        domain = new URL(detection.url).hostname;
      } catch (e) {
        domain = detection.domain || "unknown";
      }

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
  }

  function checkCurrentSite() {
    try {
      // Get current tab info - wrapped in try/catch for testing outside extension
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].url) {
          const currentUrl = new URL(tabs[0].url).hostname;

          // Check if current site has fingerprinting attempts
          if (isServerConnected) {
            // Check server for detections
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
                checkLocalStorageForCurrentSite(currentUrl);
              });
          } else {
            // Use local storage
            checkLocalStorageForCurrentSite(currentUrl);
          }
        }
      });
    } catch (e) {
      console.log("Not running in extension context");
      siteStatus.textContent = "Testing Mode";
      siteStatus.className = "status-warning";
    }
  }

  function checkLocalStorageForCurrentSite(currentUrl) {
    chrome.storage.local.get(["detections"], function (result) {
      const detections = result.detections || [];
      const siteDetections = detections.filter((d) => {
        try {
          return new URL(d.url).hostname === currentUrl;
        } catch (e) {
          return false;
        }
      });

      if (siteDetections.length > 0) {
        siteStatus.textContent = "Fingerprinting Detected";
        siteStatus.className = "status-danger";
      } else {
        siteStatus.textContent = "Safe";
        siteStatus.className = "status-safe";
      }
    });
  }

  function toggleDetectionStatus() {
    const isActive = toggleDetection.checked;

    // Check if we're in extension context
    try {
      // Send message to background script
      chrome.runtime.sendMessage(
        {
          action: isActive ? "enableDetection" : "disableDetection",
        },
        (response) => {
          console.log("Detection status updated:", isActive);
        }
      );
    } catch (e) {
      console.log("Testing mode - detection toggle:", isActive);
    }
  }

  function exportDetections() {
    if (isServerConnected) {
      fetch(`${API_URL}/api/detections`)
        .then((response) => response.json())
        .then((data) => {
          downloadDetections(data);
        })
        .catch((err) => {
          console.error("Error exporting from server:", err);
          exportFromLocalStorage();
        });
    } else {
      exportFromLocalStorage();
    }
  }

  function exportFromLocalStorage() {
    chrome.storage.local.get(["detections"], function (result) {
      downloadDetections(result.detections || []);
    });
  }

  function downloadDetections(data) {
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
  }

  function clearDetections() {
    if (confirm("Are you sure you want to clear all detection history?")) {
      // Clear server data if connected
      if (isServerConnected) {
        fetch(`${API_URL}/api/detections`, { method: "DELETE" })
          .then((response) => response.json())
          .then((data) => {
            console.log("Server data cleared");
          })
          .catch((err) => {
            console.error("Error clearing server data:", err);
          });
      }

      // Also clear local storage
      chrome.storage.local.set({ detections: [] }, function () {
        console.log("Local storage cleared");
      });

      // Update UI
      attemptCount.textContent = "0";
      domainCount.textContent = "0";
      detectionsList.innerHTML =
        '<div class="no-detections">No fingerprinting attempts detected yet</div>';
      alert("Detection history cleared");
    }
  }

  function convertToCSV(data) {
    if (!data || data.length === 0) return "No data";

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

  // Initialize
  checkServer();
  checkCurrentSite();

  // Check detection state
  try {
    chrome.runtime.sendMessage({ action: "getDetectionState" }, (response) => {
      toggleDetection.checked = response.isEnabled !== false;
    });
  } catch (e) {
    // Default to enabled in test mode
    toggleDetection.checked = true;
  }

  // Refresh data every 5 seconds
  setInterval(checkServer, 5000);
});
