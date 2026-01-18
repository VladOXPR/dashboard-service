const express = require('express');
const app = express();

// Serve simple Hello World page
app.get('/', (req, res) => {
    res.send('<html><head><title>Hello World</title></head><body><h1>Hello World</h1></body></html>');
});

// Start server for localhost development
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
