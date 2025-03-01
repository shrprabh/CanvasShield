window.__canvasWatcher = {
    init: function(callback) {
        const suspicious_operations = [
            'toDataURL',
            'toBlob',
            'getImageData'
        ];

        const original_getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function() {
            const context = original_getContext.apply(this, arguments);
            if (context && arguments[0] === '2d') {
                return wrapContext(context);
            }
            return context;
        };

        function wrapContext(context) {
            const wrapper = {};
            const operations = new Set();

            // Proxy all properties and methods
            for (let prop in context) {
                if (typeof context[prop] === 'function') {
                    wrapper[prop] = function() {
                        operations.add(prop);
                        checkOperations();
                        return context[prop].apply(context, arguments);
                    };
                } else {
                    Object.defineProperty(wrapper, prop, {
                        get: function() { return context[prop]; },
                        set: function(value) { context[prop] = value; }
                    });
                }
            }

            function checkOperations() {
                const fingerprinting_score = calculateScore(operations);
                if (fingerprinting_score >= 0.7) {
                    callback(
                        Array.from(operations).join(', '),
                        new Error().stack
                    );
                }
            }

            return wrapper;
        }

        function calculateScore(operations) {
            let score = 0;
            let total_suspicious = suspicious_operations.length;

            suspicious_operations.forEach(op => {
                if (operations.has(op)) score++;
            });

            // Additional scoring for common drawing operations
            if (operations.has('fillRect') || operations.has('fillText')) score += 0.5;
            if (operations.has('measureText')) score += 0.5;

            return score / (total_suspicious + 1);
        }
    }
};
