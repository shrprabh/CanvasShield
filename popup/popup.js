document.addEventListener('DOMContentLoaded', function() {
    const toggleDetection = document.getElementById('toggleDetection');
    const attemptCount = document.getElementById('attemptCount');
    const siteStatus = document.getElementById('siteStatus');
    const detectionsList = document.getElementById('detectionsList');
    const exportBtn = document.getElementById('exportBtn');
    const clearBtn = document.getElementById('clearBtn');

    // Load initial state
    chrome.storage.local.get(['enabled'], function(result) {
        toggleDetection.checked = result.enabled !== false;
        fetchAndUpdateDetections();
    });

    // Toggle detection
    toggleDetection.addEventListener('change', function() {
        chrome.storage.local.set({ enabled: this.checked });
        chrome.runtime.sendMessage({ 
            type: 'toggleDetection', 
            enabled: this.checked 
        });
    });

    // Export results with enhanced data
    exportBtn.addEventListener('click', function() {
        fetch('http://localhost:5000/api/detections')
            .then(response => response.json())
            .then(data => {
                const exportData = {
                    summary: {
                        totalDetections: data.detections.length,
                        uniqueDomains: [...new Set(data.detections.map(d => d.domain))].length,
                        exportDate: new Date().toISOString()
                    },
                    detections: data.detections
                };

                const blob = new Blob(
                    [JSON.stringify(exportData, null, 2)], 
                    { type: 'application/json' }
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'canvas-fingerprinting-report.json';
                a.click();
                URL.revokeObjectURL(url);
            });
    });

    // Clear history
    clearBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all detection history?')) {
            fetch('http://localhost:5000/api/detections', { method: 'DELETE' })
                .then(() => fetchAndUpdateDetections());
        }
    });

    function updateDetectionsList(detections) {
        detectionsList.innerHTML = '';
        detections.slice(0, 10).forEach(detection => {
            const item = document.createElement('div');
            item.className = 'detection-item';
            const time = new Date(detection.timestamp).toLocaleString();

            item.innerHTML = `
                <div class="detection-domain">${detection.domain}</div>
                <div class="detection-details">
                    <span class="detection-method">${detection.method}</span>
                    <span class="detection-time">${time}</span>
                </div>
                <div class="detection-script">${detection.script_url}</div>
            `;
            detectionsList.appendChild(item);
        });
    }

    function updateStats(detections) {
        attemptCount.textContent = detections.length;

        // Check current site status
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                const currentUrl = new URL(tabs[0].url).hostname;
                const recentDetections = detections.filter(d => 
                    d.domain === currentUrl && 
                    new Date() - new Date(d.timestamp) < 24 * 60 * 60 * 1000 // Last 24 hours
                );

                if (recentDetections.length > 0) {
                    siteStatus.textContent = 'Fingerprinting Detected';
                    siteStatus.className = 'unsafe';
                } else {
                    siteStatus.textContent = 'Safe';
                    siteStatus.className = 'safe';
                }
            }
        });
    }

    function fetchAndUpdateDetections() {
        fetch('http://localhost:5000/api/detections')
            .then(response => response.json())
            .then(data => {
                updateDetectionsList(data.detections);
                updateStats(data.detections);
            });
    }

    // Listen for new detections
    chrome.runtime.onMessage.addListener(function(message) {
        if (message.type === 'newDetection') {
            fetchAndUpdateDetections();
        }
    });

    // Initial fetch
    fetchAndUpdateDetections();
});