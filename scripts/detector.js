(function () {
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
    "Cwm fjordbank",
    "vext quiz",
    "AaBbCcDd",
    "mmmmmmmmlli",
    "!@#$%^&*()",
  ];

  // Extract caller information from stack trace
  function extractCallerInfo() {
    const error = new Error();
    const stack = error.stack || "";
    const stackLines = stack.split("\n").slice(2);

    // Find the first non-extension URL in the stack trace
    for (const line of stackLines) {
      const match = line.match(/at\s+(.+)\s+\((.+)\)/);
      if (match && match[2] && !match[2].includes("detector.js")) {
        return {
          function: match[1],
          url: match[2],
        };
      }
    }

    return { function: "unknown", url: "unknown" };
  }

  // Detect fingerprinting based on canvas operations
  function detectFingerprinting(canvas, operations) {
    // Skip if no operations recorded
    if (!operations.writes.length || !operations.reads.length) return false;

    // Check canvas size (>16x16 pixels)
    if (canvas.width * canvas.height < 256) return false;

    // Check for known fingerprinting text patterns
    const hasKnownPattern = operations.writes.some((op) =>
      fingerprintingIndicators.some((pattern) => op.text?.includes(pattern))
    );

    // Check if there are multiple operations in a short time
    const hasMultipleOps =
      operations.writes.length >= 3 || operations.reads.length >= 2;

    // Check time between write and read operations
    const timeBetweenOps = Math.min(
      ...operations.reads.map((read) =>
        Math.min(
          ...operations.writes.map((write) => read.timestamp - write.timestamp)
        )
      )
    );

    // For Test 1 detection, any canvas read after write is suspicious
    const hasReadAfterWrite =
      operations.reads.length > 0 && operations.writes.length > 0;

    return (
      hasKnownPattern ||
      (timeBetweenOps >= 0 && timeBetweenOps < 100) ||
      hasMultipleOps ||
      hasReadAfterWrite
    );
  }

  // Function to initialize canvas watcher
  function init(callback) {
    // Store the callback for use in various methods
    window.__canvasWatcher.__callback = callback;

    // Wrap text operations
    CanvasRenderingContext2D.prototype.fillText = function (
      text,
      x,
      y,
      maxWidth
    ) {
      try {
        const caller = extractCallerInfo();

        if (!canvasOperations.has(this.canvas)) {
          canvasOperations.set(this.canvas, { writes: [], reads: [] });
        }

        canvasOperations.get(this.canvas).writes.push({
          type: "fillText",
          text: text,
          caller: caller,
          timestamp: Date.now(),
        });

        return originalFillText.apply(this, arguments);
      } catch (error) {
        console.error("Error in fillText interceptor:", error);
        // Still call original even if our instrumentation fails
        return originalFillText.apply(this, arguments);
      }
    };

    CanvasRenderingContext2D.prototype.strokeText = function (
      text,
      x,
      y,
      maxWidth
    ) {
      const caller = extractCallerInfo();

      if (!canvasOperations.has(this.canvas)) {
        canvasOperations.set(this.canvas, { writes: [], reads: [] });
      }

      canvasOperations.get(this.canvas).writes.push({
        type: "strokeText",
        text: text,
        caller: caller,
        timestamp: Date.now(),
      });

      return originalStrokeText.apply(this, arguments);
    };

    // Wrap canvas read operations
    HTMLCanvasElement.prototype.toDataURL = function () {
      try {
        const caller = extractCallerInfo();

        if (!canvasOperations.has(this)) {
          canvasOperations.set(this, { writes: [], reads: [] });
        }

        canvasOperations.get(this).reads.push({
          type: "toDataURL",
          caller: caller,
          timestamp: Date.now(),
        });

        let result;
        try {
          result = originalToDataURL.apply(this, arguments);
        } catch (canvasError) {
          console.error("Error calling original toDataURL:", canvasError);
          throw canvasError; // Re-throw the original error
        }

        try {
          if (detectFingerprinting(this, canvasOperations.get(this))) {
            callback("toDataURL", caller.url);
          }
        } catch (detectionError) {
          console.error("Error in fingerprinting detection:", detectionError);
          // Don't throw here to ensure the canvas operation succeeds
        }

        return result;
      } catch (error) {
        console.error("Unexpected error in toDataURL interceptor:", error);
        // In case of catastrophic failure, try to call the original
        return originalToDataURL.apply(this, arguments);
      }
    };

    HTMLCanvasElement.prototype.toBlob = function (callback) {
      const caller = extractCallerInfo();

      if (!canvasOperations.has(this)) {
        canvasOperations.set(this, { writes: [], reads: [] });
      }

      canvasOperations.get(this).reads.push({
        type: "toBlob",
        caller: caller,
        timestamp: Date.now(),
      });

      const originalCallback = callback;
      const wrappedCallback = function (blob) {
        // First check for fingerprinting and notify via the external callback
        if (detectFingerprinting(this, canvasOperations.get(this))) {
          // Call the detection notification callback
          window.__canvasWatcher.__callback("toBlob", caller.url);
        }

        // Then call the original callback with the blob
        if (originalCallback) {
          originalCallback(blob);
        }
      }.bind(this);

      return originalToBlob.apply(this, [
        wrappedCallback,
        ...Array.from(arguments).slice(1),
      ]);
    };

    CanvasRenderingContext2D.prototype.getImageData = function () {
      const caller = extractCallerInfo();

      if (!canvasOperations.has(this.canvas)) {
        canvasOperations.set(this.canvas, { writes: [], reads: [] });
      }

      canvasOperations.get(this.canvas).reads.push({
        type: "getImageData",
        caller: caller,
        timestamp: Date.now(),
      });

      const result = originalGetImageData.apply(this, arguments);

      if (
        detectFingerprinting(this.canvas, canvasOperations.get(this.canvas))
      ) {
        callback("getImageData", caller.url);
      }

      return result;
    };
  }

  // Expose canvas watcher to window
  window.__canvasWatcher = {
    init,
    detectFingerprinting,
  };
})();
