const express = require('express');
const path = require('path');
const https = require('https');
const app = express();

app.use(express.static(__dirname));

app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});

function proxyToCuub(pathname, res, method, postData) {
    const options = {
        hostname: 'api.cuub.tech',
        path: pathname,
        method: method || 'GET',
        headers: { 'Accept': 'application/json' }
    };

    if (method === 'POST' && postData) {
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const request = https.request(options, (apiRes) => {
        let data = '';
        apiRes.on('data', (chunk) => { data += chunk; });
        apiRes.on('end', () => {
            try {
                res.status(apiRes.statusCode).json(JSON.parse(data));
            } catch (e) {
                console.error('Error parsing API response:', e);
                res.status(500).json({ success: false, error: 'Failed to parse API response' });
            }
        });
    });

    request.on('error', (e) => {
        console.error('API request error:', e);
        res.status(500).json({ success: false, error: 'Failed to fetch from API' });
    });

    if (method === 'POST' && postData) {
        request.write(postData);
    }
    request.end();
}

app.get('/api/users', (req, res) => proxyToCuub('/users/', res));
app.get('/api/users/:id', (req, res) => proxyToCuub(`/users/${req.params.id}`, res));
app.get('/api/stations/:id', (req, res) => proxyToCuub(`/stations/${req.params.id}`, res));
app.get('/api/rents/:stationId/:dateRange', (req, res) => {
    proxyToCuub(`/rents/${req.params.stationId}/${req.params.dateRange}`, res);
});
app.post('/api/stations/:id/pop', express.json(), (req, res) => {
    const postData = JSON.stringify(req.body || {});
    proxyToCuub(`/stations/${req.params.id}/pop`, res, 'POST', postData);
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

if (require.main === module) {
    app.listen(PORT, HOST, () => {
        console.log(`Server running on ${HOST}:${PORT}`);
    });
}

module.exports = app;
