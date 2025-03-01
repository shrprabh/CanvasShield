document.addEventListener('DOMContentLoaded', function() {
    const toggleDetection = document.getElementById('toggleDetection');
    const attemptCount = document.getElementById('attemptCount');
    const siteStatus = document.getElementById('siteStatus');
    const detectionsList = document.getElementById('detectionsList');
    const exportBtn = document.getElementById('exportBtn');
    const clearBtn = document.getElementById('clearBtn');

    // Load initial state
    chrome.storage.local.get(['enabled', 'detections'], function(result) {
        toggleDetection.checked = result.enabled !== false;
        updateDetectionsList(result.detections || []);
        updateStats(result.detections || []);
    });

    // Toggle detection
    toggleDetection.addEventListener('change', function() {
        chrome.storage.local.set({ enabled: this.checked });
        chrome.runtime.sendMessage({ 
            type: 'toggleDetection', 
            enabled: this.checked 
        });
    });

    // Export results
    exportBtn.addEventListener('click', function() {
        chrome.storage.local.get(['detections'], function(result) {
            const detections = result.detections || [];
            const blob = new Blob(
                [JSON.stringify(detections, null, 2)], 
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
        chrome.storage.local.set({ detections: [] }, function() {
            updateDetectionsList([]);
            updateStats([]);
        });
    });

    function updateDetectionsList(detections) {
        detectionsList.innerHTML = '';
        detections.slice(-10).reverse().forEach(detection => {
            const item = document.createElement('div');
            item.className = 'detection-item';
            item.innerHTML = `
                <div>${detection.url}</div>
                <small>${new Date(detection.timestamp).toLocaleString()}</small>
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
                    d.url.includes(currentUrl) && 
                    Date.now() - d.timestamp < 24 * 60 * 60 * 1000
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

    // Listen for new detections
    chrome.runtime.onMessage.addListener(function(message) {
        if (message.type === 'newDetection') {
            chrome.storage.local.get(['detections'], function(result) {
                const detections = result.detections || [];
                updateDetectionsList(detections);
                updateStats(detections);
            });
        }
    });
});
