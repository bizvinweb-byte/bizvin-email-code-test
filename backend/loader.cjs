// This file acts as a CommonJS wrapper for Phusion Passenger in cPanel
// since Phusion Passenger doesn't natively support ES Modules ("type": "module" in package.json)
// with standard import statements as the direct startup file.

(async () => {
    await import('./server.js');
})();
