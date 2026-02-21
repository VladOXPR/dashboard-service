(function () {
    const STORAGE_KEY = 'cuub_user';

    function getUser() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function redirectToLogin() {
        sessionStorage.removeItem(STORAGE_KEY);
        window.location.href = '/login';
    }

    function formatDateRange(start, end) {
        function pad(n) { return String(n).padStart(2, '0'); }
        const s = start.getFullYear() + '-' + pad(start.getMonth() + 1) + '-' + pad(start.getDate());
        const e = end.getFullYear() + '-' + pad(end.getMonth() + 1) + '-' + pad(end.getDate());
        return s + '_' + e;
    }

    function getMtdDateRange() {
        var end = new Date();
        var start = new Date(end.getFullYear(), end.getMonth(), 1);
        return { start: start, end: end };
    }

    function setDefaultDates() {
        var startEl = document.getElementById('startDate');
        var endEl = document.getElementById('endDate');
        if (!startEl || !endEl) return;
        var end = new Date();
        var start = new Date(end);
        start.setDate(1);
        startEl.value = start.toISOString().slice(0, 10);
        endEl.value = end.toISOString().slice(0, 10);
    }

    function getSelectedRange() {
        var startEl = document.getElementById('startDate');
        var endEl = document.getElementById('endDate');
        var end = new Date();
        var start = new Date(end);
        start.setDate(1);
        if (startEl && endEl) {
            start = new Date(startEl.value || start.toISOString().slice(0, 10));
            end = new Date(endEl.value || end.toISOString().slice(0, 10));
        }
        return { start: start, end: end };
    }

    async function api(path) {
        const res = await fetch(path);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Request failed');
        return json;
    }

    async function fetchStation(stationId) {
        return api('/api/stations/' + encodeURIComponent(stationId));
    }

    async function fetchRents(stationId, start, end) {
        const range = formatDateRange(start, end);
        return api('/api/rents/' + encodeURIComponent(stationId) + '/' + range);
    }

    async function fetchRentsMtd(stationIdOrIds) {
        var range = formatDateRange(getMtdDateRange().start, getMtdDateRange().end);
        var basePath = '/api/rents/' + range;
        if (stationIdOrIds == null) return api(basePath);
        var pathSegment;
        if (Array.isArray(stationIdOrIds)) {
            if (stationIdOrIds.length === 0) return api(basePath);
            pathSegment = stationIdOrIds.map(function (id) { return encodeURIComponent(id); }).join('.');
        } else {
            pathSegment = encodeURIComponent(stationIdOrIds);
        }
        return api(basePath + '/' + pathSegment);
    }

    async function fetchRentsMtdAll() {
        var range = formatDateRange(getMtdDateRange().start, getMtdDateRange().end);
        return api('/api/rents/' + range + '/all');
    }

    function parseRentData(data) {
        if (!data || !data.success) return null;
        const d = data.data;
        if (d === null || d === undefined || typeof d !== 'object') return null;
        const totalAmount = d.totalAmount != null ? Number(d.totalAmount) : null;
        const totalRents = d.totalRents != null ? Number(d.totalRents) : null;
        if (totalAmount == null && totalRents == null) return null;
        return { totalAmount: totalAmount ?? 0, totalRents: totalRents ?? 0 };
    }

    function renderStationCard(station, rentData) {
        const title = station.title || station.name || station.id || 'Station';
        const filled = station.filled_slots != null ? station.filled_slots : (station.filledSlots ?? '—');
        const open = station.open_slots != null ? station.open_slots : (station.openSlots ?? '—');
        const rent = parseRentData(rentData);

        const revenueHtml = rent
            ? '<div class="rent-row"><span class="rent-label">Total Revenue</span><strong class="rent-value">$' + escapeHtml(String(rent.totalAmount)) + '</strong></div>' +
              '<div class="rent-row"><span class="rent-label">Rents</span><strong class="rent-value">' + escapeHtml(String(rent.totalRents)) + '</strong></div>'
            : '<span class="rent-empty">No rent data for this period</span>';

        const div = document.createElement('div');
        div.className = 'station-card';
        div.innerHTML =
            '<div class="station-title">' + escapeHtml(title) + '</div>' +
            '<div class="slots">' +
            '<div class="slot"><span class="slot-dot filled"></span><strong>' + escapeHtml(String(filled)) + '</strong> <span>Filled</span></div>' +
            '<div class="slot"><span class="slot-dot open"></span><strong>' + escapeHtml(String(open)) + '</strong> <span>Open</span></div>' +
            '</div>' +
            '<div class="rent-section">' +
            '<div class="rent-data">' + revenueHtml + '</div></div>';
        return div;
    }

    function escapeHtml(s) {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function showLoading() {
        document.getElementById('loading').style.display = 'none';
        var skeletons = document.getElementById('performanceSkeletons');
        if (skeletons) skeletons.style.display = 'block';
        document.getElementById('error').style.display = 'none';
        var stationsEl = document.getElementById('stations');
        if (stationsEl) stationsEl.style.display = 'none';
        var card = document.getElementById('mtdChartCard');
        if (card) card.style.display = 'none';
        var statsRow = document.getElementById('mtdStatsRow');
        if (statsRow) statsRow.style.display = 'none';
        if (window.Charts && window.Charts.destroyMtdChart) window.Charts.destroyMtdChart();
        var bar = document.getElementById('summaryBar');
        if (bar) bar.style.display = 'none';
        var stationPerf = document.getElementById('stationPerformanceSection');
        var stationPerfSkeletons = document.getElementById('stationPerformanceSkeletons');
        if (isAdmin()) {
            if (stationPerf) stationPerf.style.display = 'block';
            if (stationPerfSkeletons) stationPerfSkeletons.style.display = 'block';
        } else {
            if (stationPerf) stationPerf.style.display = 'none';
            if (stationPerfSkeletons) stationPerfSkeletons.style.display = 'none';
        }
    }

    function showError(msg) {
        document.getElementById('loading').style.display = 'none';
        var skeletons = document.getElementById('performanceSkeletons');
        if (skeletons) skeletons.style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = msg;
        var stationsEl = document.getElementById('stations');
        if (stationsEl) stationsEl.style.display = 'none';
        var card = document.getElementById('mtdChartCard');
        if (card) card.style.display = 'none';
        var statsRow = document.getElementById('mtdStatsRow');
        if (statsRow) statsRow.style.display = 'none';
        if (window.Charts && window.Charts.destroyMtdChart) window.Charts.destroyMtdChart();
        var bar = document.getElementById('summaryBar');
        if (bar) bar.style.display = 'none';
        var stationPerf = document.getElementById('stationPerformanceSection');
        if (stationPerf) stationPerf.style.display = 'none';
    }

    function showPerformanceView() {
        document.getElementById('loading').style.display = 'none';
        var skeletons = document.getElementById('performanceSkeletons');
        if (skeletons) skeletons.style.display = 'none';
        document.getElementById('error').style.display = 'none';
        var stationsEl = document.getElementById('stations');
        if (stationsEl) stationsEl.style.display = 'none';
        var bar = document.getElementById('summaryBar');
        if (bar) bar.style.display = 'flex';
    }

    function renderStationPerformanceList(res) {
        var section = document.getElementById('stationPerformanceSection');
        var container = document.getElementById('stationPerformanceList');
        var skeletons = document.getElementById('stationPerformanceSkeletons');
        if (!section || !container) return;
        if (skeletons) skeletons.style.display = 'none';
        if (!res || !res.success || !Array.isArray(res.data) || res.data.length === 0) {
            section.style.display = 'none';
            return;
        }
        var html = '<table class="station-performance-table" aria-label="Station MTD revenue"><thead><tr><th>Station</th><th>MTD revenue</th></tr></thead><tbody>';
        res.data.forEach(function (row) {
            var title = escapeHtml(String(row.station_title || row.station_id || '—'));
            var money = row.money != null ? Number(row.money) : 0;
            html += '<tr><td>' + title + '</td><td class="station-performance-money">$' + money + '</td></tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        section.style.display = 'block';
    }

    function takeHomeRate(userType) {
        var t = (userType || '').toUpperCase();
        if (t === 'HOST') return 0.2;
        if (t === 'ADMIN' || t === 'DISTRIBUTER') return 0.8;
        return 0.2;
    }

    async function loadDashboard() {
        const user = getUser();
        if (!user || !user.id) {
            redirectToLogin();
            return;
        }

        showLoading();

        try {
            var stationIdOrIds = null;
            if (!isAdmin()) {
                var stations = (user.stations && Array.isArray(user.stations)) ? user.stations : [];
                if (stations.length > 0) stationIdOrIds = stations;
            }
            var mtdRes = await fetchRentsMtd(stationIdOrIds);
            if (window.Charts && window.Charts.renderMtdChart) window.Charts.renderMtdChart(mtdRes);
        } catch (mtdErr) {
            console.warn('MTD rent data failed to load', mtdErr);
            var mtdCard = document.getElementById('mtdChartCard');
                if (mtdCard) mtdCard.style.display = 'none';
                var mtdStatsRow = document.getElementById('mtdStatsRow');
                if (mtdStatsRow) mtdStatsRow.style.display = 'none';
            }

        showPerformanceView();

        if (isAdmin()) {
            var stationPerf = document.getElementById('stationPerformanceSection');
            var stationPerfSkeletons = document.getElementById('stationPerformanceSkeletons');
            if (stationPerf) stationPerf.style.display = 'block';
            if (stationPerfSkeletons) stationPerfSkeletons.style.display = 'block';
            try {
                var allRes = await fetchRentsMtdAll();
                renderStationPerformanceList(allRes);
            } catch (allErr) {
                console.warn('Station performance (mtd/all) failed to load', allErr);
                if (stationPerf) stationPerf.style.display = 'none';
                if (stationPerfSkeletons) stationPerfSkeletons.style.display = 'none';
            }
        }
    }

    function isAdmin() {
        var user = getUser();
        return user && (user.type || '').toUpperCase() === 'ADMIN';
    }

    function showView(name) {
        var perf = document.getElementById('viewPerformance');
        var stationMgmt = document.getElementById('viewStationMgmt');
        var hostMgmt = document.getElementById('viewHostMgmt');
        var scansView = document.getElementById('viewScans');
        var navPerf = document.getElementById('navPerformance');
        var navStationMgmt = document.getElementById('navStationMgmt');
        var navHostMgmt = document.getElementById('navHostMgmt');
        var navScans = document.getElementById('navScans');
        if (perf) perf.classList.toggle('hidden', name !== 'performance');
        if (stationMgmt) stationMgmt.classList.toggle('visible', name === 'station-management');
        if (hostMgmt) hostMgmt.classList.toggle('visible', name === 'host-management');
        if (scansView) scansView.classList.toggle('visible', name === 'scans');
        if (navPerf) navPerf.classList.toggle('active', name === 'performance');
        if (navStationMgmt) navStationMgmt.classList.toggle('active', name === 'station-management');
        if (navHostMgmt) navHostMgmt.classList.toggle('active', name === 'host-management');
        if (navScans) navScans.classList.toggle('active', name === 'scans');
        if (name === 'station-management') loadStationManagement();
        if (name === 'host-management') loadHostManagement();
        if (name === 'scans') loadScans();
    }

    async function fetchAllStations() {
        return api('/api/stations');
    }

    async function fetchAllUsers() {
        return api('/api/users');
    }

    async function fetchScans() {
        return api('/api/scans');
    }

    function formatDurationAfterRent(d) {
        if (!d || typeof d !== 'object') return '—';
        var h = d.hours != null ? d.hours : 0;
        var m = d.minutes != null ? d.minutes : 0;
        var s = d.seconds != null ? d.seconds : 0;
        var parts = [];
        if (h) parts.push(h + 'h');
        if (m) parts.push(m + 'm');
        parts.push(s + 's');
        return parts.join(' ');
    }

    var scansSummaryChartInstance = null;

    function destroyScansSummaryChart() {
        if (scansSummaryChartInstance) {
            scansSummaryChartInstance.destroy();
            scansSummaryChartInstance = null;
        }
    }

    var SCANS_BAR_GRADIENTS = [
        ['#EB641D', '#EB641D'],
        ['#23B3FA', '#1F65E0'],
        ['#DEA1EC', '#9118A7'],
        ['#FFD45B', '#D68909']
    ];
    var SCANS_TYPE_TO_GRADIENT_INDEX = {
        yellow: 3,
        blue: 1,
        purple: 2,
        orange: 0
    };
    function getScansGradientIndexForType(typeName) {
        if (typeName == null || typeName === '') return 0;
        var key = String(typeName).toLowerCase().trim();
        return SCANS_TYPE_TO_GRADIENT_INDEX[key] !== undefined ? SCANS_TYPE_TO_GRADIENT_INDEX[key] : 0;
    }

    function renderScansSummary(scans) {
        var el = document.getElementById('scansSummary');
        if (!el) return;
        if (!Array.isArray(scans) || scans.length === 0) {
            el.style.display = 'none';
            destroyScansSummaryChart();
            return;
        }
        var total = scans.length;
        var byType = {};
        scans.forEach(function (s) {
            var t = s.sticker_type || 'Unknown';
            byType[t] = (byType[t] || 0) + 1;
        });
        var typeCounts = Object.keys(byType).map(function (t) { return { type: t, count: byType[t] }; });
        typeCounts.sort(function (a, b) { return b.count - a.count; });

        var labels = typeCounts.map(function (x) { return x.type; });
        var counts = typeCounts.map(function (x) { return x.count; });
        window._scansTypeColor = {};
        labels.forEach(function (type) {
            var idx = getScansGradientIndexForType(type);
            var c = SCANS_BAR_GRADIENTS[idx];
            window._scansTypeColor[type] = c[0];
        });

        destroyScansSummaryChart();
        el.innerHTML = '<div class="scans-summary-total"><span class="label">Total Scans</span><span class="value">' + total + '</span></div><div class="scans-summary-chart-wrap"><canvas id="scansSummaryChart" aria-label="Scans by type"></canvas><div id="scansSummaryChartTooltip" class="chart-tooltip-custom" aria-hidden="true"></div></div>';
        el.style.display = 'flex';

        var canvas = document.getElementById('scansSummaryChart');
        if (!canvas || typeCounts.length === 0) return;

        scansSummaryChartInstance = new window.Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Scans',
                    data: counts,
                    backgroundColor: function (context) {
                        var chart = context.chart;
                        var ctx = chart.ctx;
                        var chartArea = chart.chartArea;
                        if (!chartArea) return '#262626';
                        var i = context.dataIndex;
                        var typeName = labels[i];
                        var idx = getScansGradientIndexForType(typeName);
                        var c = SCANS_BAR_GRADIENTS[idx];
                        var g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        g.addColorStop(0, c[0]);
                        g.addColorStop(1, c[1]);
                        return g;
                    },
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: false,
                        external: function (context) {
                            var el = document.getElementById('scansSummaryChartTooltip');
                            if (!el) return;
                            var tp = context.tooltip;
                            if (tp.opacity === 0) {
                                el.classList.remove('visible');
                                el.setAttribute('aria-hidden', 'true');
                                return;
                            }
                            var i = tp.dataPoints && tp.dataPoints[0] ? tp.dataPoints[0].dataIndex : 0;
                            var type = labels[i] || 'Unknown';
                            var count = counts[i] || 0;
                            var colorIdx = getScansGradientIndexForType(type);
                            var barColor = SCANS_BAR_GRADIENTS[colorIdx][0];
                            el.innerHTML =
                                '<div class="chart-tooltip-header">' +
                                '<span class="chart-tooltip-type-with-color"><span class="chart-tooltip-square" style="background:' + barColor + '"></span>' + escapeHtml(type) + '</span>' +
                                '</div>' +
                                '<div class="chart-tooltip-divider"></div>' +
                                '<div class="chart-tooltip-body">' +
                                '<div class="chart-tooltip-row">' +
                                '<span class="chart-tooltip-value">' + count + ' scans</span>' +
                                '</div>' +
                                '</div>';
                            el.classList.add('visible');
                            el.setAttribute('aria-hidden', 'false');
                            var wrap = el.parentElement;
                            var canvasEl = context.chart.canvas;
                            if (wrap && canvasEl) {
                                var rect = canvasEl.getBoundingClientRect();
                                var wrapRect = wrap.getBoundingClientRect();
                                var caretX = tp.caretX != null ? tp.caretX : tp.x;
                                var caretY = tp.caretY != null ? tp.caretY : tp.y;
                                var left = rect.left - wrapRect.left + caretX;
                                var top = rect.top - wrapRect.top + caretY;
                                var w = el.offsetWidth || 180;
                                var h = el.offsetHeight || 80;
                                var meta = context.chart.getDatasetMeta(0);
                                var bar = meta && meta.data[i];
                                var barCenterY = bar ? (bar.y + bar.base) / 2 : caretY;
                                var topPos = rect.top - wrapRect.top + barCenterY;
                                el.style.left = Math.max(8, Math.min(left - w / 2, wrap.offsetWidth - w - 8)) + 'px';
                                el.style.top = (topPos - h / 2) + 'px';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#737373',
                            maxRotation: 45,
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { display: false },
                        ticks: { color: '#737373' }
                    }
                }
            }
        });
    }

    function renderScansList(scans) {
        var container = document.getElementById('scansList');
        if (!container) return;
        if (!Array.isArray(scans) || scans.length === 0) {
            container.innerHTML = '<p style="color: #a3a3a3;">No scans found.</p>';
            return;
        }
        var typeColorMap = window._scansTypeColor || {};
        var html = '<table class="scans-table"><thead><tr><th>Scan ID</th><th>Sticker ID</th><th>Order ID</th><th>Scan time</th><th>Sticker type</th><th>Duration after rent</th><th>SIZL</th></tr></thead><tbody>';
        scans.forEach(function (s) {
            var scanId = escapeHtml(String(s.scan_id || ''));
            var stickerId = escapeHtml(String(s.sticker_id || ''));
            var orderId = escapeHtml(String(s.order_id || ''));
            var scanTime = escapeHtml(String(s.scan_time || ''));
            var stickerTypeRaw = String(s.sticker_type || '');
            var stickerType = escapeHtml(stickerTypeRaw);
            var typeColor = typeColorMap[stickerTypeRaw] || '#737373';
            var typeCell = '<span class="scans-table-type"><span class="scans-table-type-dot" style="background:' + typeColor + '"></span>' + stickerType + '</span>';
            var duration = escapeHtml(formatDurationAfterRent(s.duration_after_rent));
            var sizl = s.sizl === true ? 'Yes' : 'No';
            html += '<tr><td>' + scanId + '</td><td>' + stickerId + '</td><td>' + orderId + '</td><td>' + scanTime + '</td><td>' + typeCell + '</td><td>' + duration + '</td><td>' + sizl + '</td></tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    async function loadScans() {
        var summary = document.getElementById('scansSummary');
        var container = document.getElementById('scansList');
        var loading = document.getElementById('scansLoading');
        var errEl = document.getElementById('scansError');
        if (!container) return;
        if (summary) summary.style.display = 'none';
        container.innerHTML = '';
        loading.style.display = 'none';
        var summarySkeleton = document.getElementById('scansSummarySkeleton');
        if (summarySkeleton) summarySkeleton.style.display = 'flex';
        var skeletons = document.getElementById('scansSkeletons');
        if (skeletons) skeletons.style.display = 'block';
        errEl.style.display = 'none';
        try {
            var json = await fetchScans();
            var raw = Array.isArray(json) ? json : (json.data != null && Array.isArray(json.data) ? json.data : []);
            if (!Array.isArray(raw)) raw = [];
            var list = raw.filter(function (s) { return s.order_id != null && s.order_id !== ''; });
            renderScansSummary(list);
            renderScansList(list);
        } catch (e) {
            console.error(e);
            errEl.style.display = 'block';
            errEl.textContent = 'Failed to load scans. Please try again.';
            errEl.style.color = '#fca5a5';
        } finally {
            loading.style.display = 'none';
            if (summarySkeleton) summarySkeleton.style.display = 'none';
            if (skeletons) skeletons.style.display = 'none';
        }
    }

    async function createUser(payload) {
        var res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
        return json;
    }

    async function updateUser(id, payload) {
        var res = await fetch('/api/users/' + encodeURIComponent(id), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
        return json;
    }

    async function deleteUser(id) {
        var res = await fetch('/api/users/' + encodeURIComponent(id), { method: 'DELETE' });
        var json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
        return json;
    }

    async function createStation(payload) {
        var res = await fetch('/api/stations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
        return json;
    }

    async function updateStation(id, payload) {
        var res = await fetch('/api/stations/' + encodeURIComponent(id), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
        return json;
    }

    async function deleteStation(id) {
        var res = await fetch('/api/stations/' + encodeURIComponent(id), { method: 'DELETE' });
        var json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
        return json;
    }

    function renderStationManagementList(stations) {
        var container = document.getElementById('stationMgmtList');
        var loading = document.getElementById('mgmtLoading');
        var errEl = document.getElementById('mgmtError');
        var skeletons = document.getElementById('stationMgmtSkeletons');
        if (!container) return;
        loading.style.display = 'none';
        if (skeletons) skeletons.style.display = 'none';
        errEl.style.display = 'none';
        if (!Array.isArray(stations) || stations.length === 0) {
            container.innerHTML = '<p style="color: #a3a3a3;">No stations found.</p>';
            return;
        }
        var html = '<table class="station-mgmt-table"><thead><tr><th></th><th>Title</th><th>ID</th><th>Filled</th><th>Open</th><th></th></tr></thead><tbody>';
        stations.forEach(function (s) {
            var id = escapeHtml(String(s.id || ''));
            var title = escapeHtml(String(s.title || ''));
            var lat = s.latitude != null ? String(s.latitude) : '';
            var lng = s.longitude != null ? String(s.longitude) : '';
            var filled = s.filled_slots != null ? s.filled_slots : '—';
            var open = s.open_slots != null ? s.open_slots : '—';
            var isOnline = s.online === true;
            var statusClass = isOnline ? 'online' : 'offline';
            var statusDot = '<span class="station-status-dot ' + statusClass + '" aria-label="' + (isOnline ? 'Online' : 'Offline') + '"></span>';
            html += '<tr data-station-id="' + id + '" data-station-title="' + escapeHtml(String(s.title || '')) + '" data-station-lat="' + escapeHtml(lat) + '" data-station-lng="' + escapeHtml(lng) + '">' +
                '<td class="station-status-cell">' + statusDot + '</td><td>' + title + '</td><td>' + id + '</td><td>' + filled + '</td><td>' + open + '</td>' +
                '<td><div class="table-actions"><button type="button" class="btn-edit" data-action="edit">Edit</button><button type="button" class="btn-delete" data-action="delete">Delete</button></div></td></tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        container.querySelectorAll('.btn-edit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = btn.closest('tr');
                var sid = row && row.getAttribute('data-station-id');
                if (sid) openEditStationModal(sid, row);
            });
        });
        container.querySelectorAll('.btn-delete').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = btn.closest('tr');
                var sid = row && row.getAttribute('data-station-id');
                if (sid) openDeleteConfirmModal('station', sid, row);
            });
        });
    }

    function renderHostManagementList(users) {
        var container = document.getElementById('hostMgmtList');
        var loading = document.getElementById('hostMgmtLoading');
        var errEl = document.getElementById('hostMgmtError');
        var skeletons = document.getElementById('hostMgmtSkeletons');
        if (!container) return;
        loading.style.display = 'none';
        if (skeletons) skeletons.style.display = 'none';
        errEl.style.display = 'none';
        var list = Array.isArray(users) ? users : [];
        if (list.length === 0) {
            container.innerHTML = '<p style="color: #a3a3a3;">No users found.</p>';
            return;
        }
        var html = '<table class="station-mgmt-table"><thead><tr>' +
            '<th>ID</th><th>Username</th><th>Type</th><th>Created</th><th>Updated</th><th>Stations</th><th></th></tr></thead><tbody>';
        list.forEach(function (u) {
            var id = escapeHtml(String(u.id || ''));
            var username = escapeHtml(String(u.username || ''));
            var type = escapeHtml(String(u.type || ''));
            var created = escapeHtml(String(u.created_at || ''));
            var updated = escapeHtml(String(u.updated_at || ''));
            var stationList = Array.isArray(u.stations) ? u.stations : [];
            var stationsJson = JSON.stringify(stationList);
            var stationsHtml = '';
            if (stationList.length === 0) {
                stationsHtml = '—';
            } else if (stationList.length === 1) {
                stationsHtml = escapeHtml(stationList[0]);
            } else {
                var stationItemsHtml = stationList.map(function (sid) {
                    return '<div class="hover-card-station-item">' + escapeHtml(sid) + '</div>';
                }).join('');
                stationsHtml = '<span class="hover-card-trigger" style="position: relative; display: inline-block;">' +
                    stationList.length + ' stations' +
                    '<div class="hover-card-content">' +
                    '<div class="hover-card-title">Stations</div>' +
                    '<div class="hover-card-description">This user has access to ' + stationList.length + ' station' + (stationList.length !== 1 ? 's' : '') + ':</div>' +
                    '<div class="hover-card-stations">' + stationItemsHtml + '</div>' +
                    '</div>' +
                    '</span>';
            }
            html += '<tr data-user-id="' + id + '" data-user-username="' + escapeHtml(username) + '" data-user-type="' + escapeHtml(type) + '" data-user-stations="' + escapeHtml(stationsJson) + '">' +
                '<td>' + id + '</td><td>' + username + '</td><td>' + type + '</td><td>' + created + '</td><td>' + updated + '</td><td>' + stationsHtml + '</td>' +
                '<td><div class="table-actions"><button type="button" class="btn-edit">Edit</button><button type="button" class="btn-delete btn-destructive">Delete</button></div></td></tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        container.querySelectorAll('.btn-edit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = btn.closest('tr');
                var uid = row && row.getAttribute('data-user-id');
                if (uid) openEditUserModal(uid, row);
            });
        });
        container.querySelectorAll('.btn-delete').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = btn.closest('tr');
                var uid = row && row.getAttribute('data-user-id');
                if (uid) openDeleteConfirmModal('user', uid, row);
            });
        });
        container.querySelectorAll('.hover-card-trigger').forEach(function (trigger) {
            var content = trigger.querySelector('.hover-card-content');
            if (!content) return;
            trigger.addEventListener('mouseenter', function () {
                var rect = trigger.getBoundingClientRect();
                var contentRect = content.getBoundingClientRect();
                var viewportHeight = window.innerHeight;
                var spaceAbove = rect.top;
                var spaceBelow = viewportHeight - rect.bottom;
                var contentHeight = contentRect.height || 200;
                if (spaceAbove < contentHeight + 20 && spaceBelow > spaceAbove) {
                    content.style.bottom = 'auto';
                    content.style.top = '100%';
                    content.style.marginTop = '0.25rem';
                    content.style.marginBottom = '0';
                } else {
                    content.style.top = 'auto';
                    content.style.bottom = '100%';
                    content.style.marginBottom = '0.25rem';
                    content.style.marginTop = '0';
                }
            });
        });
    }

    function openAddStationModal() {
        document.getElementById('stationFormTitle').textContent = 'Add station';
        document.getElementById('stationFormDescription').textContent = 'Create a new station';
        document.getElementById('stationForm').reset();
        document.getElementById('stationId').disabled = false;
        document.getElementById('stationFormDrawer').classList.add('active');
    }

    function openEditStationModal(stationId, row) {
        var title = row.getAttribute('data-station-title');
        var lat = row.getAttribute('data-station-lat');
        var lng = row.getAttribute('data-station-lng');
        if (title == null || lat == null || lng == null) {
            var cells = row.querySelectorAll('td');
            title = (cells[1] && cells[1].textContent) || '';
            lat = (cells[2] && cells[2].textContent) || '';
            lng = (cells[3] && cells[3].textContent) || '';
        }
        document.getElementById('stationFormTitle').textContent = 'Edit station';
        document.getElementById('stationFormDescription').textContent = 'Update station information';
        document.getElementById('stationId').value = stationId;
        document.getElementById('stationId').disabled = true;
        document.getElementById('stationTitle').value = title || '';
        document.getElementById('stationLat').value = lat || '';
        document.getElementById('stationLng').value = lng || '';
        document.getElementById('stationFormDrawer').setAttribute('data-edit-id', stationId);
        document.getElementById('stationFormDrawer').classList.add('active');
    }

    function closeStationFormModal() {
        document.getElementById('stationFormDrawer').classList.remove('active');
        document.getElementById('stationFormDrawer').removeAttribute('data-edit-id');
        document.getElementById('stationId').disabled = false;
    }

    function openDeleteConfirmModal(type, id, row) {
        var msg = document.getElementById('deleteConfirmMessage');
        var name = (row && row.getAttribute('data-station-title')) || (row && row.querySelectorAll('td')[0] && row.querySelectorAll('td')[0].textContent) || (row && row.querySelectorAll('td')[1] && row.querySelectorAll('td')[1].textContent) || id;
        msg.textContent = type === 'user'
            ? 'Are you sure you want to delete user "' + name + '"?'
            : 'Are you sure you want to delete "' + name + '"?';
        var modal = document.getElementById('deleteConfirmModal');
        modal.setAttribute('data-delete-type', type);
        modal.setAttribute('data-delete-id', id);
        modal.classList.add('active');
    }

    function closeDeleteConfirmModal() {
        var modal = document.getElementById('deleteConfirmModal');
        modal.classList.remove('active');
        modal.removeAttribute('data-delete-id');
        modal.removeAttribute('data-delete-type');
    }

    function openAddUserModal() {
        document.getElementById('userFormTitle').textContent = 'Add user';
        document.getElementById('userFormDescription').textContent = 'Create a new user account';
        document.getElementById('userForm').reset();
        document.getElementById('userFormAddFields').style.display = 'flex';
        document.getElementById('userFormEditFields').style.display = 'none';
        document.getElementById('userFormDrawer').removeAttribute('data-edit-id');
        document.getElementById('userFormDrawer').classList.add('active');
    }

    function renderUserStationChips(container, stationIds, onRemove) {
        container.innerHTML = '';
        (stationIds || []).forEach(function (sid) {
            var chip = document.createElement('span');
            chip.className = 'station-id-chip';
            chip.innerHTML = escapeHtml(sid) + '<button type="button" class="btn-remove-chip" data-station-id="' + escapeHtml(sid) + '" aria-label="Remove">×</button>';
            chip.querySelector('.btn-remove-chip').addEventListener('click', function () {
                onRemove(sid);
            });
            container.appendChild(chip);
        });
    }

    async function openEditUserModal(userId, row) {
        var username = row.getAttribute('data-user-username') || (row.querySelectorAll('td')[1] && row.querySelectorAll('td')[1].textContent) || '';
        var type = row.getAttribute('data-user-type') || '';
        var stationsJson = row.getAttribute('data-user-stations') || '[]';
        var stationIds = [];
        try { stationIds = JSON.parse(stationsJson) || []; } catch (e) {}
        document.getElementById('userFormTitle').textContent = 'Edit user';
        document.getElementById('userUsername').value = username;
        document.getElementById('userTypeEdit').value = type || 'HOST';
        document.getElementById('userFormAddFields').style.display = 'none';
        document.getElementById('userFormEditFields').style.display = 'flex';
        document.getElementById('userFormDrawer').setAttribute('data-edit-id', userId);
        document.getElementById('userFormDrawer').classList.add('active');
        var listEl = document.getElementById('userStationIdsList');
        var addSelect = document.getElementById('userAddStationSelect');
        addSelect.innerHTML = '<option value="">— Add station —</option>';
        var currentIds = stationIds.slice();
        function refreshChips() {
            renderUserStationChips(listEl, currentIds, function (sid) {
                currentIds = currentIds.filter(function (id) { return id !== sid; });
                refreshChips();
                refreshAddSelect();
            });
        }
        function refreshAddSelect() {
            var opts = addSelect.querySelectorAll('option');
            for (var i = opts.length - 1; i > 0; i--) opts[i].remove();
            var stations = window._cachedStations || [];
            stations.forEach(function (s) {
                var sid = String(s.id || '');
                if (sid && currentIds.indexOf(sid) === -1) {
                    var opt = document.createElement('option');
                    opt.value = sid;
                    opt.textContent = sid + (s.title ? ' (' + s.title + ')' : '');
                    addSelect.appendChild(opt);
                }
            });
        }
        refreshChips();
        try {
            var json = await fetchAllStations();
            var list = (json.data != null && Array.isArray(json.data)) ? json.data : (json.Data && Array.isArray(json.Data) ? json.Data : []);
            window._cachedStations = list;
        } catch (e) { window._cachedStations = []; }
        refreshAddSelect();
        document.getElementById('userAddStationBtn').onclick = function () {
            var val = addSelect.value;
            if (val && currentIds.indexOf(val) === -1) {
                currentIds.push(val);
                refreshChips();
                refreshAddSelect();
            }
        };
        document.getElementById('userFormDrawer')._editStationIds = function () { return currentIds; };
    }

    function closeUserFormModal() {
        document.getElementById('userFormDrawer').classList.remove('active');
        document.getElementById('userFormDrawer').removeAttribute('data-edit-id');
        document.getElementById('userFormDrawer')._editStationIds = null;
        document.getElementById('userFormAddFields').style.display = 'flex';
        document.getElementById('userFormEditFields').style.display = 'none';
    }

    async function loadStationManagement() {
        var container = document.getElementById('stationMgmtList');
        var loading = document.getElementById('mgmtLoading');
        var errEl = document.getElementById('mgmtError');
        if (!container) return;
        container.innerHTML = '';
        loading.style.display = 'none';
        var skeletons = document.getElementById('stationMgmtSkeletons');
        if (skeletons) skeletons.style.display = 'block';
        errEl.style.display = 'none';
        try {
            var json = await fetchAllStations();
            var list = (json.data != null && Array.isArray(json.data)) ? json.data : (json.Data && Array.isArray(json.Data) ? json.Data : []);
            renderStationManagementList(list);
        } catch (e) {
            console.error(e);
            loading.style.display = 'none';
            if (skeletons) skeletons.style.display = 'none';
            errEl.style.display = 'block';
            errEl.textContent = 'Failed to load stations. Please try again.';
            errEl.style.color = '#fca5a5';
        }
    }

    async function loadHostManagement() {
        var container = document.getElementById('hostMgmtList');
        var loading = document.getElementById('hostMgmtLoading');
        var errEl = document.getElementById('hostMgmtError');
        if (!container) return;
        container.innerHTML = '';
        loading.style.display = 'none';
        var skeletons = document.getElementById('hostMgmtSkeletons');
        if (skeletons) skeletons.style.display = 'block';
        errEl.style.display = 'none';
        try {
            var json = await fetchAllUsers();
            var list = (json.data != null && Array.isArray(json.data)) ? json.data : (json.Data && Array.isArray(json.Data) ? json.Data : []);
            renderHostManagementList(list);
        } catch (e) {
            console.error(e);
            loading.style.display = 'none';
            if (skeletons) skeletons.style.display = 'none';
            errEl.style.display = 'block';
            errEl.textContent = 'Failed to load users. Please try again.';
            errEl.style.color = '#fca5a5';
        }
    }

    function init() {
        setDefaultDates();
        var applyBtn = document.getElementById('applyDates');
        if (applyBtn) applyBtn.addEventListener('click', loadDashboard);
        var hamburgerBtn = document.getElementById('hamburgerBtn');
        var hamburgerMenu = document.getElementById('hamburgerMenu');
        var hamburgerOverlay = document.getElementById('hamburgerOverlay');
        function closeHamburgerMenu() {
            if (hamburgerMenu) hamburgerMenu.classList.remove('open');
            if (hamburgerBtn) hamburgerBtn.classList.remove('open');
            document.body.classList.remove('hamburger-open');
            if (hamburgerOverlay) hamburgerOverlay.setAttribute('aria-hidden', 'true');
        }
        function openHamburgerMenu() {
            if (hamburgerMenu) hamburgerMenu.classList.add('open');
            if (hamburgerBtn) hamburgerBtn.classList.add('open');
            document.body.classList.add('hamburger-open');
            if (hamburgerOverlay) hamburgerOverlay.setAttribute('aria-hidden', 'false');
        }
        if (hamburgerBtn && hamburgerMenu) {
            hamburgerBtn.addEventListener('click', function () {
                if (hamburgerMenu.classList.contains('open')) {
                    closeHamburgerMenu();
                } else {
                    openHamburgerMenu();
                }
            });
        }
        if (hamburgerOverlay) {
            hamburgerOverlay.addEventListener('click', closeHamburgerMenu);
        }
        document.getElementById('logout').addEventListener('click', function (e) {
            e.preventDefault();
            closeHamburgerMenu();
            redirectToLogin();
        });

        var adminLinks = document.querySelectorAll('[data-admin-only]');
        adminLinks.forEach(function (el) {
            el.style.display = isAdmin() ? '' : 'none';
        });
        if (!isAdmin()) {
            document.body.classList.add('host-layout');
            var user = getUser();
            var hostUsernameEl = document.getElementById('hostHeaderUsername');
            if (hostUsernameEl) hostUsernameEl.textContent = user && user.username ? user.username : '';
            var headerLogout = document.getElementById('headerLogout');
            if (headerLogout) {
                headerLogout.style.display = 'block';
                headerLogout.addEventListener('click', function (e) {
                    e.preventDefault();
                    redirectToLogin();
                });
            }
            showView('performance');
        }
        document.getElementById('navPerformance').addEventListener('click', function (e) {
            e.preventDefault();
            closeHamburgerMenu();
            showView('performance');
        });
        document.getElementById('navStationMgmt').addEventListener('click', function (e) {
            e.preventDefault();
            closeHamburgerMenu();
            showView('station-management');
        });
        document.getElementById('navHostMgmt').addEventListener('click', function (e) {
            e.preventDefault();
            closeHamburgerMenu();
            showView('host-management');
        });
        document.getElementById('navScans').addEventListener('click', function (e) {
            e.preventDefault();
            closeHamburgerMenu();
            showView('scans');
        });

        document.getElementById('addUserBtn').addEventListener('click', openAddUserModal);
        document.getElementById('userFormCancel').addEventListener('click', closeUserFormModal);
        document.getElementById('userFormClose').addEventListener('click', closeUserFormModal);
        document.getElementById('userForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            var modal = document.getElementById('userFormDrawer');
            var editId = modal.getAttribute('data-edit-id');
            var username = document.getElementById('userUsername').value.trim();
            var submitBtn = document.getElementById('userFormSubmit');
            submitBtn.disabled = true;
            try {
                if (editId) {
                    var type = document.getElementById('userTypeEdit').value;
                    var stationIds = (typeof modal._editStationIds === 'function') ? modal._editStationIds() : [];
                    await updateUser(editId, { username: username, type: type, station_ids: stationIds });
                    closeUserFormModal();
                    loadHostManagement();
                } else {
                    var type = document.getElementById('userType').value;
                    var stationId = document.getElementById('userStationId').value.trim();
                    await createUser({ username: username, type: type, station_id: stationId });
                    closeUserFormModal();
                    loadHostManagement();
                }
            } catch (err) {
                alert(err.message || 'Request failed.');
            } finally {
                submitBtn.disabled = false;
            }
        });
        document.getElementById('userFormDrawer').addEventListener('click', function (e) {
            if (e.target === this) closeUserFormModal();
        });

        document.getElementById('addStationBtn').addEventListener('click', openAddStationModal);
        document.getElementById('stationFormCancel').addEventListener('click', closeStationFormModal);
        document.getElementById('stationFormClose').addEventListener('click', closeStationFormModal);
        document.getElementById('stationForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            var editId = document.getElementById('stationFormDrawer').getAttribute('data-edit-id');
            var id = document.getElementById('stationId').value.trim();
            var title = document.getElementById('stationTitle').value.trim();
            var lat = parseFloat(document.getElementById('stationLat').value, 10);
            var lng = parseFloat(document.getElementById('stationLng').value, 10);
            var submitBtn = document.getElementById('stationFormSubmit');
            submitBtn.disabled = true;
            try {
                if (editId) {
                    await updateStation(editId, { title: title, latitude: lat, longitude: lng });
                    closeStationFormModal();
                    loadStationManagement();
                } else {
                    await createStation({ id: id, title: title, latitude: lat, longitude: lng });
                    closeStationFormModal();
                    loadStationManagement();
                }
            } catch (err) {
                alert(err.message || 'Request failed.');
            } finally {
                submitBtn.disabled = false;
            }
        });
        document.getElementById('deleteConfirmCancel').addEventListener('click', closeDeleteConfirmModal);
        document.getElementById('deleteConfirmBtn').addEventListener('click', async function () {
            var modal = document.getElementById('deleteConfirmModal');
            var type = modal.getAttribute('data-delete-type');
            var id = modal.getAttribute('data-delete-id');
            if (!id) return;
            var btn = document.getElementById('deleteConfirmBtn');
            btn.disabled = true;
            try {
                if (type === 'user') {
                    await deleteUser(id);
                    closeDeleteConfirmModal();
                    loadHostManagement();
                } else {
                    await deleteStation(id);
                    closeDeleteConfirmModal();
                    loadStationManagement();
                }
            } catch (err) {
                alert(err.message || 'Delete failed.');
            } finally {
                btn.disabled = false;
            }
        });

        document.getElementById('stationFormDrawer').addEventListener('click', function (e) {
            if (e.target === this) closeStationFormModal();
        });
        document.getElementById('deleteConfirmModal').addEventListener('click', function (e) {
            if (e.target === this) closeDeleteConfirmModal();
        });

        loadDashboard();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
