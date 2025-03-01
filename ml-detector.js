
// Machine Learning based Canvas Fingerprinting Detector
class CanvasFingerprintClassifier {
    constructor() {
        this.features = {
            // Canvas operation patterns
            textPatterns: [
                'Cwm fjordbank', 'vext quiz', 'AaBbCcDd', 'mmmmmmmmlli',
                'Sphinx of black quartz', 'The quick brown fox'
            ],
            // Suspicious sizes
            suspiciousSizes: [16, 256, 300, 500],
            // Timing thresholds
            readWriteTiming: 100, // ms
            // Number of operations
            maxOpsCount: 10
        };
        
        // Default weights (would be trained in a real ML system)
        this.weights = {
            textPatternMatch: 0.7,
            sizeMatch: 0.3,
            timingUnderThreshold: 0.6,
            operationCountOverThreshold: 0.5
        };
    }
    
    // Extract features from canvas operations
    extractFeatures(canvas, operations) {
        // Initialize feature vector
        const features = {
            hasKnownTextPattern: false,
            hasSuspiciousSize: false,
            hasSmallTimeBetweenReadWrite: false,
            hasHighOperationCount: false
        };
        
        // Check text patterns
        features.hasKnownTextPattern = operations.writes.some(op => 
            this.features.textPatterns.some(pattern => 
                op.text && op.text.includes(pattern)
            )
        );
        
        // Check canvas size
        features.hasSuspiciousSize = this.features.suspiciousSizes.includes(canvas.width) ||
                                     this.features.suspiciousSizes.includes(canvas.height);
        
        // Check timing between operations
        if (operations.reads.length && operations.writes.length) {
            const timeBetweenOps = Math.min(
                ...operations.reads.map(read =>
                    Math.min(...operations.writes.map(write => 
                        read.timestamp - write.timestamp
                    ))
                )
            );
            features.hasSmallTimeBetweenReadWrite = timeBetweenOps < this.features.readWriteTiming;
        }
        
        // Check operation count
        const totalOps = operations.reads.length + operations.writes.length;
        features.hasHighOperationCount = totalOps > this.features.maxOpsCount;
        
        return features;
    }
    
    // Predict if an operation is fingerprinting
    predict(canvas, operations) {
        // Skip if no operations
        if (!operations || !operations.writes.length || !operations.reads.length) {
            return { score: 0, isFingerprinting: false };
        }
        
        // Extract features
        const features = this.extractFeatures(canvas, operations);
        
        // Calculate score (weighted sum of features)
        let score = 0;
        if (features.hasKnownTextPattern) score += this.weights.textPatternMatch;
        if (features.hasSuspiciousSize) score += this.weights.sizeMatch;
        if (features.hasSmallTimeBetweenReadWrite) score += this.weights.timingUnderThreshold;
        if (features.hasHighOperationCount) score += this.weights.operationCountOverThreshold;
        
        // Normalize score to [0,1]
        const maxPossibleScore = Object.values(this.weights).reduce((a, b) => a + b, 0);
        score = score / maxPossibleScore;
        
        return {
            score,
            isFingerprinting: score > 0.5, // Threshold for classification
            features
        };
    }
    
    // Method to update weights (would be used in training)
    updateWeights(newWeights) {
        this.weights = { ...this.weights, ...newWeights };
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CanvasFingerprintClassifier };
}
