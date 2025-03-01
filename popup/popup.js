
document.addEventListener('DOMContentLoaded', function() {
    const toggleDetection = document.getElementById('toggleDetection');
    const attemptCount = document.getElementById('attemptCount');
    const siteStatus = document.getElementById('siteStatus');
    const detectionsList = document.getElementById('detectionsList');
    const exportBtn = document.getElementById('exportBtn');
    const clearBtn = document.getElementById('clearBtn');
    
    // API endpoint
    const API_URL = 'http://0.0.0.0:5001';
    
    // Check detection toggle status
    chrome.storage.local.get('detectionEnabled', function(data) {
        toggleDetection.checked = data.detectionEnabled !== false;
    });
    
    // Toggle detection on change
    toggleDetection.addEventListener('change', function() {
        chrome.storage.local.set({ detectionEnabled: toggleDetection.checked });
    });
    
    // Fetch and update detections on popup open
    fetchAndUpdateDetections();
    
    // Get current site status
    getCurrentSiteStatus();
    
    // Export results
    exportBtn.addEventListener('click', function() {
        fetch(`${API_URL}/api/detections`)
            .then(response => response.json())
            .then(detections => {
                const exportData = {
                    generated: new Date().toISOString(),
                    detections: detections
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
            fetch(`${API_URL}/api/detections`, { method: 'DELETE' })
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
                <div class="detection-header">
                    <span class="detection-domain">${detection.domain}</span>
                    <span class="detection-time">${time}</span>
                </div>
                <div class="detection-method">Method: ${detection.method}</div>
                <div class="detection-url small text-truncate">${detection.url}</div>
            `;
            detectionsList.appendChild(item);
        });
        
        if (detections.length === 0) {
            detectionsList.innerHTML = '<div class="no-detections">No fingerprinting attempts detected yet.</div>';
        }
    }
    
    function fetchAndUpdateDetections() {
        fetch(`${API_URL}/api/detections`)
            .then(response => response.json())
            .then(detections => {
                attemptCount.textContent = detections.length;
                updateDetectionsList(detections);
            })
            .catch(error => {
                console.error('Error fetching detections:', error);
                detectionsList.innerHTML = '<div class="api-error">Could not connect to API service</div>';
            });
    }
    
    function getCurrentSiteStatus() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0]) {
                const currentUrl = tabs[0].url;
                const domain = new URL(currentUrl).hostname;
                
                fetch(`${API_URL}/api/detections`)
                    .then(response => response.json())
                    .then(detections => {
                        const siteDetections = detections.filter(d => d.domain === domain);
                        
                        if (siteDetections.length > 0) {
                            siteStatus.textContent = 'Fingerprinting Detected';
                            siteStatus.className = 'status-danger';
                        } else {
                            siteStatus.textContent = 'Safe';
                            siteStatus.className = 'status-safe';
                        }
                    });
            }
        });
    }
});
