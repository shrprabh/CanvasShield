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
  const chartCanvas = document.getElementById("detectionChart");

  // Chart variables
  let detectionChart = null;

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
      // Initialize chart with local storage data
      initChart(detections);
    });
  }

  function loadDetections() {
    fetch(`${API_URL}/api/detections`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        // Debug logging
        console.log("Detections loaded:", data);

        // Ensure data is an array
        const detections = Array.isArray(data) ? data : [];

        displayDetections(detections);
        // Initialize chart with server data
        initChart(detections);
      })
      .catch((err) => {
        console.error("Error loading detections:", err);
        // Check if the detections list element exists
        const detectionsListEl = document.getElementById("detectionsList");
        if (detectionsListEl) {
          detectionsListEl.innerHTML = `<div class="no-detections">Error loading detections: ${err.message}</div>`;
        }
      });
  }
  function displayDetections(data) {
    // Get the detections list element
    const detectionsListEl = document.getElementById("detectionsList");
    if (!detectionsListEl) {
      console.error("Detections list element not found!");
      return;
    }

    // Check if we have data and it's an array
    if (!data || !Array.isArray(data) || data.length === 0) {
      detectionsListEl.innerHTML =
        '<div class="no-detections">No fingerprinting attempts detected yet</div>';
      return;
    }

    // Clear the list
    detectionsListEl.innerHTML = "";

    // Sort by timestamp (newest first) and take the top 5
    const recentDetections = [...data]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);

    // Add recent detections
    recentDetections.forEach((detection) => {
      try {
        const item = document.createElement("div");
        item.className = "detection-item";

        // Get domain safely
        let domain = "unknown";
        try {
          if (detection.domain) {
            domain = detection.domain;
          } else if (detection.url) {
            domain = new URL(detection.url).hostname;
          }
        } catch (e) {
          console.warn("Could not parse URL:", detection.url);
        }

        // Format timestamp safely
        let timeString = "unknown time";
        try {
          if (detection.timestamp) {
            const date = new Date(detection.timestamp);
            timeString = date.toLocaleString();
          }
        } catch (e) {
          console.warn("Could not format timestamp:", detection.timestamp);
        }

        // Create the HTML for this item
        item.innerHTML = `
          <div class="detection-site">
            ${domain}
          </div>
          <div class="detection-info">
            <div class="detection-method">Method: ${
              detection.method || "unknown"
            }</div>
            <div class="detection-time">${timeString}</div>
          </div>
        `;

        detectionsListEl.appendChild(item);
      } catch (err) {
        console.error("Error creating detection item:", err, detection);
      }
    });
  }

  // Initialize chart visualization
  function initChart(data) {
    // First check if Chart is defined
    if (typeof Chart === "undefined") {
      console.error("Chart.js is not loaded!");
      return;
    }

    if (!chartCanvas) {
      console.warn("Chart canvas element not found");
      return;
    }

    // Process data for the chart
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toLocaleDateString();
    }).reverse();

    // Count detections per day
    const countsByDay = {};
    last7Days.forEach((day) => (countsByDay[day] = 0));

    // Count detections for each day
    if (data && Array.isArray(data)) {
      data.forEach((detection) => {
        if (detection.timestamp) {
          const date = new Date(detection.timestamp).toLocaleDateString();
          if (countsByDay[date] !== undefined) {
            countsByDay[date]++;
          }
        }
      });
    }

    // Create or update chart
    if (detectionChart) {
      detectionChart.data.datasets[0].data = Object.values(countsByDay);
      detectionChart.update();
    } else {
      try {
        const ctx = chartCanvas.getContext("2d");
        detectionChart = new Chart(ctx, {
          type: "bar",
          data: {
            labels: Object.keys(countsByDay),
            datasets: [
              {
                label: "Fingerprinting Attempts",
                data: Object.values(countsByDay),
                backgroundColor: "rgba(67, 97, 238, 0.7)",
                borderColor: "rgba(67, 97, 238, 1)",
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: "top",
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  precision: 0,
                },
              },
            },
          },
        });
      } catch (e) {
        console.error("Error creating chart:", e);
      }
    }
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

  function clearDetections() {
    if (confirm("Are you sure you want to clear all detection history?")) {
      // Clear server data if connected
      if (isServerConnected) {
        fetch(`${API_URL}/api/detections`, { method: "DELETE" })
          .then((response) => response.json())
          .catch((err) => console.error("Error clearing server data:", err));
      }

      // Clear local storage and badge
      chrome.runtime.sendMessage({ action: "clearDetections" }, (response) => {
        console.log("Detections cleared", response);
      });

      // Update UI
      attemptCount.textContent = "0";
      domainCount.textContent = "0";
      detectionsList.innerHTML =
        '<div class="no-detections">No fingerprinting attempts detected yet</div>';

      // Reset chart if it exists
      if (detectionChart) {
        detectionChart.data.datasets[0].data = [0, 0, 0, 0, 0, 0, 0];
        detectionChart.update();
      }

      alert("Detection history cleared");
    }
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
