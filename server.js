const express = require('express');
const path = require('path');
const https = require('https');
const app = express();

app.use(express.static(__dirname));

app.use(express.json());
app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});

function proxyToCuub(pathname, res, options) {
    const method = (options && options.method) || 'GET';
    const body = options && options.body;
    const reqOptions = {
        hostname: 'api.cuub.tech',
        path: pathname,
        method: method,
        headers: { 'Accept': 'application/json' }
    };
    if (body) {
        reqOptions.headers['Content-Type'] = 'application/json';
        reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const request = https.request(reqOptions, (apiRes) => {
        let data = '';
        apiRes.on('data', (chunk) => { data += chunk; });
        apiRes.on('end', () => {
            const code = apiRes.statusCode;
            const trimmed = (data || '').trim();
            if (trimmed === '') {
                res.status(code).end();
                return;
            }
            try {
                res.status(code).json(JSON.parse(trimmed));
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
    if (body) request.write(body);
    request.end();
}

/** Stream upstream body as-is (CSV, etc.). Used for /stations/export — must not JSON.parse. */
function proxyToCuubPassthrough(pathname, res) {
    const reqOptions = {
        hostname: 'api.cuub.tech',
        path: pathname,
        method: 'GET',
        headers: { 'Accept': 'text/csv, application/json, */*' }
    };
    const request = https.request(reqOptions, (apiRes) => {
        const ct = apiRes.headers['content-type'];
        if (ct) res.setHeader('Content-Type', ct);
        const cd = apiRes.headers['content-disposition'];
        if (cd) res.setHeader('Content-Disposition', cd);
        res.status(apiRes.statusCode);
        apiRes.pipe(res);
    });
    request.on('error', (e) => {
        console.error('API request error:', e);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Failed to fetch from API' });
        }
    });
    request.end();
}

app.get('/api/users', (req, res) => proxyToCuub('/users/', res));
app.get('/api/users/:id', (req, res) => proxyToCuub(`/users/${req.params.id}`, res));
app.post('/api/users', (req, res) => {
    proxyToCuub('/users/', res, { method: 'POST', body: JSON.stringify(req.body || {}) });
});
app.patch('/api/users/:id', (req, res) => {
    proxyToCuub(`/users/${req.params.id}`, res, { method: 'PATCH', body: JSON.stringify(req.body || {}) });
});
app.delete('/api/users/:id', (req, res) => proxyToCuub(`/users/${req.params.id}`, res, { method: 'DELETE' }));
app.get('/api/stations/export', (req, res) => proxyToCuubPassthrough('/stations/export', res));
app.get('/api/stations', (req, res) => proxyToCuub('/stations/', res));
app.get('/api/stations/:id', (req, res) => proxyToCuub(`/stations/${encodeURIComponent(req.params.id)}`, res));
app.post('/api/stations', (req, res) => {
    proxyToCuub('/stations', res, { method: 'POST', body: JSON.stringify(req.body || {}) });
});
app.patch('/api/stations/:id', (req, res) => {
    const id = encodeURIComponent(req.params.id);
    proxyToCuub(`/stations/${id}`, res, { method: 'PATCH', body: JSON.stringify(req.body || {}) });
});
app.delete('/api/stations/:id', (req, res) => proxyToCuub(`/stations/${encodeURIComponent(req.params.id)}`, res, { method: 'DELETE' }));
app.get('/api/rents/:dateRange/all', (req, res) => proxyToCuub(`/rents/${req.params.dateRange}/all`, res));
app.get('/api/rents/:dateRange/:stationIds', (req, res) => {
    proxyToCuub(`/rents/${req.params.dateRange}/${req.params.stationIds}`, res);
});
app.get('/api/rents/:dateRange', (req, res) => proxyToCuub(`/rents/${req.params.dateRange}`, res));
app.get('/api/scans', (req, res) => proxyToCuub('/scans/', res));
app.post('/api/pop/:stationId/all', (req, res) => {
    proxyToCuub(`/pop/${req.params.stationId}/all`, res, { method: 'POST' });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
const USER_TYPES = ['host', 'admin', 'distributer', 'distributor'];
USER_TYPES.forEach(function (type) {
    app.get('/' + type, (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
});

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

if (require.main === module) {
    app.listen(PORT, HOST, () => {
        console.log(`Server running on ${HOST}:${PORT}`);
    });
}

module.exports = app;
