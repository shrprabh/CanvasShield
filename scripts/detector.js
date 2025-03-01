window.__canvasWatcher = {
    init: function(callback) {
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        const originalFillText = CanvasRenderingContext2D.prototype.fillText;
        const originalStrokeText = CanvasRenderingContext2D.prototype.strokeText;

        // Storage for tracking canvas operations
        const canvasOperations = new Map();

        // Known fingerprinting patterns
        const fingerprintingIndicators = [
            'Cwm fjordbank glyphs vext quiz',
            'http://valve.github.io',
            'Abcdefghi',
            'no-real-font-',
            '😃'
        ];

        function extractCallerInfo() {
            const stack = new Error().stack;
            const lines = stack.split('\n');
            for (let i = 2; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.includes('http') || line.includes('https')) {
                    const match = line.match(/(https?:\/\/[^:]+):(\d+):(\d+)/);
                    if (match) {
                        return {
                            url: match[1],
                            line: match[2],
                            column: match[3]
                        };
                    }
                }
            }
            return { url: window.location.href, line: 0, column: 0 };
        }

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
};