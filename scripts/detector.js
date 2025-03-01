
(function() {
    // Store original canvas methods
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    const originalStrokeText = CanvasRenderingContext2D.prototype.strokeText;
    
    // Track canvas operations
    const canvasOperations = new Map();
    
    // Known fingerprinting indicators
    const fingerprintingIndicators = [
        'Cwm fjordbank', 
        'vext quiz', 
        'AaBbCcDd', 
        'mmmmmmmmlli',
        '!@#$%^&*()'
    ];
    
    // Extract caller information from stack trace
    function extractCallerInfo() {
        const error = new Error();
        const stack = error.stack || '';
        const stackLines = stack.split('\n').slice(2);
        
        // Find the first non-extension URL in the stack trace
        for (const line of stackLines) {
            const match = line.match(/at\s+(.+)\s+\((.+)\)/);
            if (match && match[2] && !match[2].includes('detector.js')) {
                return {
                    function: match[1],
                    url: match[2]
                };
            }
        }
        
        return { function: 'unknown', url: 'unknown' };
    }
    
    // Detect fingerprinting based on canvas operations
    function detectFingerprinting(canvas, operations) {
        // Skip if no operations recorded
        if (!operations.writes.length || !operations.reads.length) return false;

        // Check canvas size (>16x16 pixels)
        if (canvas.width * canvas.height < 256) return false;

        // Check for known fingerprinting text patterns
        const hasKnownPattern = operations.writes.some(op =>
            fingerprintingIndicators.some(pattern => op.text?.includes(pattern))
        );

        // Check time between write and read operations
        const timeBetweenOps = Math.min(
            ...operations.reads.map(read =>
                Math.min(...operations.writes.map(write =>
                    read.timestamp - write.timestamp
                ))
            )
        );

        return hasKnownPattern || (timeBetweenOps >= 0 && timeBetweenOps < 100);
    }
    
    // Function to initialize canvas watcher
    function init(callback) {
        // Wrap text operations
        CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
            const caller = extractCallerInfo();

            if (!canvasOperations.has(this.canvas)) {
                canvasOperations.set(this.canvas, { writes: [], reads: [] });
            }

            canvasOperations.get(this.canvas).writes.push({
                type: 'fillText',
                text: text,
                caller: caller,
                timestamp: Date.now()
            });

            return originalFillText.apply(this, arguments);
        };

        CanvasRenderingContext2D.prototype.strokeText = function(text, x, y, maxWidth) {
            const caller = extractCallerInfo();

            if (!canvasOperations.has(this.canvas)) {
                canvasOperations.set(this.canvas, { writes: [], reads: [] });
            }

            canvasOperations.get(this.canvas).writes.push({
                type: 'strokeText',
                text: text,
                caller: caller,
                timestamp: Date.now()
            });

            return originalStrokeText.apply(this, arguments);
        };

        // Wrap canvas read operations
        HTMLCanvasElement.prototype.toDataURL = function() {
            const caller = extractCallerInfo();

            if (!canvasOperations.has(this)) {
                canvasOperations.set(this, { writes: [], reads: [] });
            }

            canvasOperations.get(this).reads.push({
                type: 'toDataURL',
                caller: caller,
                timestamp: Date.now()
            });

            const result = originalToDataURL.apply(this, arguments);

            if (detectFingerprinting(this, canvasOperations.get(this))) {
                callback('toDataURL', caller.url);
            }

            return result;
        };

        HTMLCanvasElement.prototype.toBlob = function(callback) {
            const caller = extractCallerInfo();

            if (!canvasOperations.has(this)) {
                canvasOperations.set(this, { writes: [], reads: [] });
            }

            canvasOperations.get(this).reads.push({
                type: 'toBlob',
                caller: caller,
                timestamp: Date.now()
            });

            const originalCallback = callback;
            const wrappedCallback = function(blob) {
                if (detectFingerprinting(this, canvasOperations.get(this))) {
                    callback('toBlob', caller.url);
                }
                if (originalCallback) {
                    originalCallback(blob);
                }
            }.bind(this);

            return originalToBlob.apply(this, [wrappedCallback, ...Array.from(arguments).slice(1)]);
        };

        CanvasRenderingContext2D.prototype.getImageData = function() {
            const caller = extractCallerInfo();

            if (!canvasOperations.has(this.canvas)) {
                canvasOperations.set(this.canvas, { writes: [], reads: [] });
            }

            canvasOperations.get(this.canvas).reads.push({
                type: 'getImageData',
                caller: caller,
                timestamp: Date.now()
            });

            const result = originalGetImageData.apply(this, arguments);

            if (detectFingerprinting(this.canvas, canvasOperations.get(this.canvas))) {
                callback('getImageData', caller.url);
            }

            return result;
        };
    }
    
    // Expose canvas watcher to window
    window.__canvasWatcher = {
        init,
        detectFingerprinting
    };
})();
