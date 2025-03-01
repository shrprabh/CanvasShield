
// Canvas Fingerprinting Behavior Monitor

class BehaviorAnalyzer {
    constructor() {
        this.events = [];
        this.thresholds = {
            canvasCalls: { window: 5000, limit: 3 },
            fontMetrics: { window: 10000, limit: 5 },
            readWriteRatio: 0.8, // Ratio of reads to writes
            suspiciousOperations: 3 // Number of suspicious operations in time window
        };
        
        this.listeners = [];
    }
    
    // Log canvas operation events
    logEvent(type, data = {}) {
        const event = {
            type,
            timestamp: Date.now(),
            data
        };
        
        this.events.push(event);
        
        // Trigger threshold checks
        this.checkThresholds();
        
        // Clean up old events (older than 60 seconds)
        this.cleanupEvents();
        
        return event;
    }
    
    // Check if any thresholds are exceeded
    checkThresholds() {
        const results = {};
        
        // Check canvas call frequency
        results.canvasCalls = this.checkFrequencyThreshold('canvasCall', this.thresholds.canvasCalls);
        
        // Check font enumeration (common in fingerprinting)
        results.fontMetrics = this.checkFrequencyThreshold('fontMetrics', this.thresholds.fontMetrics);
        
        // Check read/write ratio
        results.readWriteRatio = this.checkReadWriteRatio(this.thresholds.readWriteRatio);
        
        // Check for suspicious operations
        results.suspiciousOps = this.checkSuspiciousOperations(this.thresholds.suspiciousOperations);
        
        // If any threshold was exceeded, notify listeners
        const thresholdExceeded = Object.values(results).some(result => result.exceeded);
        if (thresholdExceeded) {
            this.notifyListeners('threshold_exceeded', {
                results,
                timestamp: Date.now()
            });
        }
        
        return results;
    }
    
    // Check if frequency of an event type exceeds threshold in time window
    checkFrequencyThreshold(eventType, threshold) {
        const now = Date.now();
        const windowStart = now - threshold.window;
        
        const count = this.events.filter(e => 
            e.type === eventType && e.timestamp >= windowStart
        ).length;
        
        return {
            count,
            limit: threshold.limit,
            exceeded: count > threshold.limit
        };
    }
    
    // Check the ratio of read operations to write operations
    checkReadWriteRatio(threshold) {
        const reads = this.events.filter(e => e.type === 'canvasRead').length;
        const writes = this.events.filter(e => e.type === 'canvasWrite').length;
        
        if (writes === 0) return { exceeded: false, ratio: 0 };
        
        const ratio = reads / writes;
        
        return {
            ratio,
            threshold,
            exceeded: ratio > threshold
        };
    }
    
    // Check for suspicious operations (e.g., known fingerprinting patterns)
    checkSuspiciousOperations(threshold) {
        const suspiciousPatterns = [
            'fillText',
            'strokeText',
            'getImageData',
            'toDataURL'
        ];
        
        const now = Date.now();
        const windowStart = now - 10000; // Last 10 seconds
        
        const suspiciousOps = this.events.filter(e => 
            e.timestamp >= windowStart && 
            suspiciousPatterns.includes(e.data.operation)
        );
        
        return {
            count: suspiciousOps.length,
            threshold,
            exceeded: suspiciousOps.length > threshold
        };
    }
    
    // Register a listener for behavior events
    addListener(callback) {
        this.listeners.push(callback);
    }
    
    // Notify all listeners of an event
    notifyListeners(eventType, data) {
        this.listeners.forEach(listener => {
            try {
                listener(eventType, data);
            } catch (error) {
                console.error('Error in behavior monitor listener:', error);
            }
        });
    }
    
    // Clean up old events to prevent memory growth
    cleanupEvents() {
        const cutoff = Date.now() - 60000; // 1 minute
        this.events = this.events.filter(e => e.timestamp >= cutoff);
    }
    
    // Get summary statistics about recent behavior
    getStats() {
        return {
            totalEvents: this.events.length,
            readOperations: this.events.filter(e => e.type === 'canvasRead').length,
            writeOperations: this.events.filter(e => e.type === 'canvasWrite').length,
            suspiciousPatterns: this.checkSuspiciousOperations(0).count,
            thresholds: this.checkThresholds()
        };
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BehaviorAnalyzer };
}
