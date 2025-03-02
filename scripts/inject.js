// Canvas fingerprinting detector for injection
(function () {
  // Store original canvas methods
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  // Override toDataURL method
  HTMLCanvasElement.prototype.toDataURL = function () {
    // Detect fingerprinting
    const scriptUrl =
      new Error().stack.split("\n")[2]?.match(/https?:[^:]+/) || "unknown";
    window.postMessage(
      {
        type: "CANVAS_FINGERPRINT_DETECTED",
        method: "toDataURL",
        url: window.location.href,
        scriptUrl: scriptUrl,
      },
      "*"
    );

    return originalToDataURL.apply(this, arguments);
  };

  // Override getImageData method
  CanvasRenderingContext2D.prototype.getImageData = function () {
    // Detect fingerprinting
    const scriptUrl =
      new Error().stack.split("\n")[2]?.match(/https?:[^:]+/) || "unknown";
    window.postMessage(
      {
        type: "CANVAS_FINGERPRINT_DETECTED",
        method: "getImageData",
        url: window.location.href,
        scriptUrl: scriptUrl,
      },
      "*"
    );

    return originalGetImageData.apply(this, arguments);
  };

  console.log("Canvas Fingerprinting Detector: Initialized in page context");
})();
