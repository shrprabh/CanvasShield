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
  const domainChartCanvas = document.getElementById("domainChart"); // Add domain chart canvas

  // Chart variables
  let detectionChart = null;
  let domainChart = null; // Add domain chart variable

  // Event listeners
  toggleDetection.addEventListener("change", toggleDetectionStatus);
  exportBtn.addEventListener("click", exportDetections);
  clearBtn.addEventListener("click", clearDetections);

  // Load data immediately
  statusIndicator.textContent = "Local Mode";
  statusIndicator.className = "status-safe";
  loadDetectionsFromStorage();

  function loadDetectionsFromStorage() {
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

      // Display detections
      displayDetections(detections);

      // Initialize both charts
      initChart(detections);
      initDomainChart(detections); // Add domain chart initialization

      // Check current site status
      checkCurrentSite();
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
      console.log("Chart.js not available - disabling chart visualization");

      // Hide chart containers
      const chartContainers = document.querySelectorAll(".chart-container");
      chartContainers.forEach((container) => {
        container.style.display = "none";
      });

      return;
    }

    // Rest of your chart initialization code
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

  // Initialize domain chart visualization
  function initDomainChart(data) {
    // Check if Chart is defined (already checked in initChart)
    if (typeof Chart === "undefined") {
      return; // Will be handled by initChart
    }

    if (!domainChartCanvas) {
      console.warn("Domain chart canvas element not found");
      return;
    }

    // Count detections by domain
    const domainCounts = {};

    if (data && Array.isArray(data)) {
      data.forEach((detection) => {
        try {
          let domain = "unknown";
          if (detection.domain) {
            domain = detection.domain;
          } else if (detection.url) {
            domain = new URL(detection.url).hostname;
          }

          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        } catch (e) {
          console.warn("Could not parse domain:", e);
        }
      });
    }

    // Sort domains by count and take top 5
    const topDomains = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const labels = topDomains.map((item) => item[0]);
    const counts = topDomains.map((item) => item[1]);

    // Create or update chart
    if (domainChart) {
      domainChart.data.labels = labels;
      domainChart.data.datasets[0].data = counts;
      domainChart.update();
    } else {
      try {
        const ctx = domainChartCanvas.getContext("2d");
        domainChart = new Chart(ctx, {
          type: "pie",
          data: {
            labels: labels,
            datasets: [
              {
                data: counts,
                backgroundColor: [
                  "rgba(67, 97, 238, 0.7)",
                  "rgba(255, 99, 132, 0.7)",
                  "rgba(255, 206, 86, 0.7)",
                  "rgba(75, 192, 192, 0.7)",
                  "rgba(153, 102, 255, 0.7)",
                ],
                borderColor: [
                  "rgba(67, 97, 238, 1)",
                  "rgba(255, 99, 132, 1)",
                  "rgba(255, 206, 86, 1)",
                  "rgba(75, 192, 192, 1)",
                  "rgba(153, 102, 255, 1)",
                ],
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "right",
                align: "center",
                labels: {
                  boxWidth: 10,
                  font: {
                    size: 9,
                  },
                  padding: 10,
                },
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    return context.label + ": " + context.raw + " detections";
                  },
                },
              },
            },
            layout: {
              padding: {
                right: 10,
              },
            },
          },
        });
      } catch (e) {
        console.error("Error creating domain chart:", e);
      }
    }
  }

  function checkCurrentSite() {
    try {
      // Get current tab info
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].url) {
          const currentUrl = new URL(tabs[0].url).hostname;

          // Check local storage for detections on this site
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
      });
    } catch (e) {
      console.log("Not running in extension context");
      siteStatus.textContent = "Testing Mode";
      siteStatus.className = "status-warning";
    }
  }

  function toggleDetectionStatus() {
    const isActive = toggleDetection.checked;

    // Send message to background script
    chrome.runtime.sendMessage(
      {
        action: isActive ? "enableDetection" : "disableDetection",
      },
      (response) => {
        console.log("Detection status updated:", isActive);
      }
    );
  }

  function exportDetections() {
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
      // Clear local storage and badge
      chrome.runtime.sendMessage({ action: "clearDetections" }, (response) => {
        console.log("Detections cleared", response);
      });

      // Update UI
      attemptCount.textContent = "0";
      domainCount.textContent = "0";
      detectionsList.innerHTML =
        '<div class="no-detections">No fingerprinting attempts detected yet</div>';

      // Reset charts if they exist
      if (detectionChart) {
        detectionChart.data.datasets[0].data = [0, 0, 0, 0, 0, 0, 0];
        detectionChart.update();
      }

      if (domainChart) {
        domainChart.data.labels = [];
        domainChart.data.datasets[0].data = [];
        domainChart.update();
      }

      alert("Detection history cleared");
    }
  }

  // Check detection state
  chrome.runtime.sendMessage({ action: "getDetectionState" }, (response) => {
    toggleDetection.checked = response.isEnabled !== false;
  });

  // Refresh data periodically
  setInterval(loadDetectionsFromStorage, 5000);
});
